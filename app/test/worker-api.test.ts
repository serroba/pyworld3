import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ModelData } from "../ts/model-data.ts";
import type { SimulationResult } from "../ts/simulation-contracts.ts";
import { createWorld3Core } from "../ts/core/world3-core.ts";
import type { RawLookupTable } from "../ts/core/world3-tables.ts";
import { resolveApiRequest, getBaseRoute, injectRouteMeta } from "../ts/worker.ts";

/**
 * Tests for the Worker API handler logic.
 *
 * Imports resolveApiRequest directly from the Worker module to
 * ensure tests exercise the actual request resolution, not a duplicate.
 */

function loadTables(): RawLookupTable[] {
  const raw = readFileSync(
    resolve(__dirname, "../data/functions-table-world3.json"),
    "utf-8",
  );
  return JSON.parse(raw) as RawLookupTable[];
}

const tables = loadTables();
const core = createWorld3Core(ModelData, async () => tables);

/** Mirrors the Worker's handleSimulate logic using the core runtime. */
async function runApiSimulation(body: Record<string, unknown>): Promise<SimulationResult> {
  const simRequest = resolveApiRequest(body);

  const result = await core.runtime.simulate(simRequest);

  // Filter series to requested output_variables (mirrors Worker logic)
  const requested = simRequest.output_variables ?? ModelData.defaultVariables;
  const filtered: typeof result.series = {};
  for (const key of requested) {
    if (result.series[key]) {
      filtered[key] = result.series[key];
    }
  }

  return { ...result, series: filtered };
}

describe("Worker API: /api/simulate", () => {
  test("empty body returns standard-run result", async () => {
    const result = await runApiSimulation({});
    expect(result.year_min).toBe(1900);
    expect(result.year_max).toBe(2100);
    expect(result.dt).toBe(0.5);
    expect(result.time.length).toBeGreaterThan(0);
    expect(result.series.pop).toBeDefined();
    expect(result.series.pop!.values[0]).toBeGreaterThan(1e9);
  });

  test("preset field resolves named scenario", async () => {
    const result = await runApiSimulation({ preset: "doubled-resources" });
    expect(result.constants_used.nri).toBe(2000000000000);
  });

  test("preset with constant overrides merges correctly", async () => {
    const result = await runApiSimulation({
      preset: "standard-run",
      constants: { nri: 5e12 },
    });
    expect(result.constants_used.nri).toBe(5e12);
  });

  test("custom time range is respected", async () => {
    const result = await runApiSimulation({ year_max: 2200 });
    expect(result.year_max).toBe(2200);
    const lastTime = result.time[result.time.length - 1];
    expect(lastTime).toBeCloseTo(2200, 0);
  });

  test("custom dt is respected", async () => {
    const result = await runApiSimulation({ dt: 0.25 });
    expect(result.dt).toBe(0.25);
    const defaultResult = await runApiSimulation({});
    expect(result.time.length).toBeGreaterThan(defaultResult.time.length);
  });

  test("all five presets produce valid results", async () => {
    const presetNames = [
      "standard-run",
      "doubled-resources",
      "optimistic-technology",
      "population-stability",
      "comprehensive-policy",
    ];

    for (const name of presetNames) {
      const result = await runApiSimulation({ preset: name });
      expect(result.series.pop, `${name}: pop series`).toBeDefined();
      expect(result.series.nrfr, `${name}: nrfr series`).toBeDefined();
      expect(result.series.ppolx, `${name}: ppolx series`).toBeDefined();
      expect(result.time.length, `${name}: time array`).toBeGreaterThan(0);
    }
  });

  test("invalid preset throws", async () => {
    await expect(runApiSimulation({ preset: "nonexistent" })).rejects.toThrow(
      "Unknown preset",
    );
  });

  test("non-numeric fields are ignored in request parsing", async () => {
    const result = await runApiSimulation({
      year_min: "not a number" as unknown,
      year_max: null as unknown,
      dt: undefined,
    });
    expect(result.year_min).toBe(1900);
    expect(result.year_max).toBe(2100);
    expect(result.dt).toBe(0.5);
  });

  test("pyear and iphst overrides are applied", async () => {
    const result = await runApiSimulation({ pyear: 2000, iphst: 1960 });
    expect(result.series.pop).toBeDefined();
    expect(result.time.length).toBeGreaterThan(0);
  });

  test("output_variables restricts returned series", async () => {
    const result = await runApiSimulation({
      output_variables: ["pop", "le"],
    });
    expect(result.series.pop).toBeDefined();
    expect(result.series.le).toBeDefined();
    const keys = Object.keys(result.series);
    expect(keys).toHaveLength(2);
    expect(keys).toContain("pop");
    expect(keys).toContain("le");
  });

  test("default output_variables returns ModelData.defaultVariables", async () => {
    const result = await runApiSimulation({});
    const keys = Object.keys(result.series);
    expect(keys.length).toBe(ModelData.defaultVariables.length);
    for (const v of ModelData.defaultVariables) {
      expect(result.series[v], `default variable ${v}`).toBeDefined();
    }
  });

  test("preset + diverge_year works together", async () => {
    const standard = await runApiSimulation({
      preset: "standard-run",
      output_variables: ["pop"],
    });
    const diverged = await runApiSimulation({
      preset: "standard-run",
      constants: { dcfsn: 1.9 },
      diverge_year: 2024,
      output_variables: ["pop"],
    });

    // Before diverge year, population should match
    const idx2000 = standard.time.indexOf(2000);
    expect(diverged.series.pop!.values[idx2000]).toBeCloseTo(
      standard.series.pop!.values[idx2000]!,
      0,
    );

    // After diverge year, population should differ
    const idxEnd = standard.time.length - 1;
    expect(diverged.series.pop!.values[idxEnd]).not.toBeCloseTo(
      standard.series.pop!.values[idxEnd]!,
      0,
    );
  });

  test("diverge_year switches constants mid-run", async () => {
    const standard = await runApiSimulation({
      output_variables: ["pop"],
    });
    // No base_constants — runtime should default to model defaults before diverge_year
    const diverged = await runApiSimulation({
      constants: { dcfsn: 1.9 },
      diverge_year: 2024,
      output_variables: ["pop"],
    });

    // Before diverge year, population should match
    const idx1970 = standard.time.indexOf(1970);
    expect(diverged.series.pop!.values[idx1970]).toBeCloseTo(
      standard.series.pop!.values[idx1970]!,
      0,
    );

    // After diverge year, population should differ
    const idxEnd = standard.time.length - 1;
    expect(diverged.series.pop!.values[idxEnd]).not.toBeCloseTo(
      standard.series.pop!.values[idxEnd]!,
      0,
    );
  });

  test("result series values are JSON-serializable numbers", async () => {
    const result = await runApiSimulation({});
    const json = JSON.stringify(result);
    const parsed = JSON.parse(json) as SimulationResult;
    expect(parsed.time.length).toBe(result.time.length);
    expect(parsed.series.pop!.values.length).toBe(result.series.pop!.values.length);
    for (const val of parsed.series.pop!.values) {
      expect(Number.isFinite(val)).toBe(true);
    }
  });
});

describe("getBaseRoute", () => {
  test("returns path unchanged for English routes", () => {
    expect(getBaseRoute("/")).toBe("/");
    expect(getBaseRoute("/model")).toBe("/model");
    expect(getBaseRoute("/explore")).toBe("/explore");
    expect(getBaseRoute("/compare")).toBe("/compare");
  });

  test("strips known locale prefix", () => {
    expect(getBaseRoute("/fr/model")).toBe("/model");
    expect(getBaseRoute("/ja/compare")).toBe("/compare");
    expect(getBaseRoute("/zh-CN/explore")).toBe("/explore");
    expect(getBaseRoute("/pt-BR/advanced")).toBe("/advanced");
    expect(getBaseRoute("/ar/faq")).toBe("/faq");
  });

  test("returns root for locale-only path", () => {
    expect(getBaseRoute("/fr")).toBe("/");
    expect(getBaseRoute("/ja/")).toBe("/");
  });

  test("does not strip unknown path segments", () => {
    expect(getBaseRoute("/unknown/model")).toBe("/unknown/model");
    expect(getBaseRoute("/en/model")).toBe("/en/model"); // 'en' is not a prefix
  });
});

const SAMPLE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>World3 Simulator — Will civilization collapse by 2100?</title>
  <meta name="description" content="Original description.">
  <meta property="og:title" content="Original OG title">
  <meta property="og:description" content="Original OG description">
  <meta property="og:url" content="https://limits.world/">
  <meta name="twitter:title" content="Original Twitter title">
  <meta name="twitter:description" content="Original Twitter description">
  <link rel="canonical" href="https://limits.world/">
</head>
<body></body>
</html>`;

describe("injectRouteMeta", () => {
  const meta = {
    title: "How World3 Works | World3 Simulator",
    description: "Deep dive into the model.",
    ogDescription: "Explore the World3 model in depth.",
  };
  const canonicalUrl = "https://limits.world/model";

  test("replaces title", () => {
    const result = injectRouteMeta(SAMPLE_HTML, meta, canonicalUrl);
    expect(result).toContain("<title>How World3 Works | World3 Simulator</title>");
    expect(result).not.toContain("Will civilization collapse");
  });

  test("replaces meta description", () => {
    const result = injectRouteMeta(SAMPLE_HTML, meta, canonicalUrl);
    expect(result).toContain('name="description" content="Deep dive into the model."');
    expect(result).not.toContain("Original description");
  });

  test("replaces og:title and og:description", () => {
    const result = injectRouteMeta(SAMPLE_HTML, meta, canonicalUrl);
    expect(result).toContain('og:title" content="How World3 Works | World3 Simulator"');
    expect(result).toContain('og:description" content="Explore the World3 model in depth."');
  });

  test("replaces og:url and canonical with the provided URL", () => {
    const result = injectRouteMeta(SAMPLE_HTML, meta, canonicalUrl);
    expect(result).toContain('og:url" content="https://limits.world/model"');
    expect(result).toContain('rel="canonical" href="https://limits.world/model"');
    expect(result).not.toContain('content="https://limits.world/"');
    expect(result).not.toContain('href="https://limits.world/"');
  });

  test("replaces twitter:title and twitter:description", () => {
    const result = injectRouteMeta(SAMPLE_HTML, meta, canonicalUrl);
    expect(result).toContain('twitter:title" content="How World3 Works | World3 Simulator"');
    expect(result).toContain('twitter:description" content="Deep dive into the model."');
  });

  test("leaves unrelated HTML untouched", () => {
    const result = injectRouteMeta(SAMPLE_HTML, meta, canonicalUrl);
    expect(result).toContain('<html lang="en">');
    expect(result).toContain("<body></body>");
  });
});

describe("Worker API: /api/presets", () => {
  test("ModelData exposes expected preset list", () => {
    expect(ModelData.presets.length).toBe(7);
    const names = ModelData.presets.map((p) => p.name);
    expect(names).toContain("standard-run");
    expect(names).toContain("comprehensive-policy");
  });

  test("ModelData exposes constant defaults and metadata", () => {
    expect(Object.keys(ModelData.constantDefaults).length).toBeGreaterThan(50);
    expect(ModelData.constantMeta.nri).toBeDefined();
    expect(ModelData.constantMeta.nri.full_name).toBe("Initial nonrenewable resources");
  });

  test("ModelData exposes variable metadata", () => {
    expect(ModelData.variableMeta.pop).toBeDefined();
    expect(ModelData.variableMeta.pop.full_name).toBe("Total population");
  });

  test("default variables list is non-empty", () => {
    expect(ModelData.defaultVariables.length).toBeGreaterThan(0);
    expect(ModelData.defaultVariables).toContain("pop");
  });

  test("presets response is JSON-serializable", () => {
    const response = {
      presets: ModelData.presets,
      constant_defaults: ModelData.constantDefaults,
      constant_meta: ModelData.constantMeta,
      variable_meta: ModelData.variableMeta,
      default_variables: ModelData.defaultVariables,
    };
    const json = JSON.stringify(response);
    const parsed = JSON.parse(json);
    expect(parsed.presets.length).toBe(7);
  });
});
