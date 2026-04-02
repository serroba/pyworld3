import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ModelData } from "../ts/model-data.ts";
import { simulateWorld3 } from "../ts/core/world3-simulation.ts";
import type { ConstantMap, SimulationRequest, SimulationResult } from "../ts/simulation-contracts.ts";
import { buildSimulationRequestFromPreset } from "../ts/simulation-contracts.ts";
import type { World3VariableKey } from "../ts/core/world3-keys.ts";
import type { RawLookupTable } from "../ts/core/world3-tables.ts";

/**
 * Tests for the Worker API handler logic.
 *
 * Rather than importing the Worker module (which depends on Cloudflare's
 * Env type), we test the same code paths the Worker uses: preset resolution,
 * simulation execution, and response shape validation.
 */

function loadTables(): RawLookupTable[] {
  const raw = readFileSync(
    resolve(__dirname, "../data/functions-table-world3.json"),
    "utf-8",
  );
  return JSON.parse(raw) as RawLookupTable[];
}

const tables = loadTables();

/** Build a SimulationRequest from a raw JSON body, omitting undefined keys. */
function requestFromBody(body: Record<string, unknown>): SimulationRequest {
  const req: SimulationRequest = {};
  if (typeof body.year_min === "number") req.year_min = body.year_min;
  if (typeof body.year_max === "number") req.year_max = body.year_max;
  if (typeof body.dt === "number") req.dt = body.dt;
  if (typeof body.pyear === "number") req.pyear = body.pyear;
  if (typeof body.iphst === "number") req.iphst = body.iphst;
  if (body.constants) req.constants = body.constants as ConstantMap;
  if (body.output_variables) req.output_variables = body.output_variables as World3VariableKey[];
  return req;
}

/** Mirrors the Worker's handleSimulate logic. */
function runApiSimulation(body: Record<string, unknown>): SimulationResult {
  let simRequest: SimulationRequest;
  if (typeof body.preset === "string") {
    simRequest = buildSimulationRequestFromPreset(ModelData, body.preset, requestFromBody(body));
  } else {
    simRequest = requestFromBody(body);
  }

  const mergedConstants = {
    ...ModelData.constantDefaults,
    ...(simRequest.constants ?? {}),
  };

  const result = simulateWorld3({
    yearMin: simRequest.year_min ?? 1900,
    yearMax: simRequest.year_max ?? 2100,
    dt: simRequest.dt ?? 0.5,
    pyear: simRequest.pyear ?? 1975,
    iphst: simRequest.iphst ?? 1940,
    constants: mergedConstants,
    rawTables: tables,
  });

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
  test("empty body returns standard-run result", () => {
    const result = runApiSimulation({});
    expect(result.year_min).toBe(1900);
    expect(result.year_max).toBe(2100);
    expect(result.dt).toBe(0.5);
    expect(result.time.length).toBeGreaterThan(0);
    expect(result.series.pop).toBeDefined();
    expect(result.series.pop!.values[0]).toBeGreaterThan(1e9);
  });

  test("preset field resolves named scenario", () => {
    const result = runApiSimulation({ preset: "doubled-resources" });
    expect(result.constants_used.nri).toBe(2000000000000);
  });

  test("preset with constant overrides merges correctly", () => {
    const result = runApiSimulation({
      preset: "standard-run",
      constants: { nri: 5e12 },
    });
    expect(result.constants_used.nri).toBe(5e12);
  });

  test("custom time range is respected", () => {
    const result = runApiSimulation({ year_max: 2200 });
    expect(result.year_max).toBe(2200);
    const lastTime = result.time[result.time.length - 1];
    expect(lastTime).toBeCloseTo(2200, 0);
  });

  test("custom dt is respected", () => {
    const result = runApiSimulation({ dt: 0.25 });
    expect(result.dt).toBe(0.25);
    // More time steps with smaller dt
    const defaultResult = runApiSimulation({});
    expect(result.time.length).toBeGreaterThan(defaultResult.time.length);
  });

  test("all five presets produce valid results", () => {
    const presetNames = [
      "standard-run",
      "doubled-resources",
      "optimistic-technology",
      "population-stability",
      "comprehensive-policy",
    ];

    for (const name of presetNames) {
      const result = runApiSimulation({ preset: name });
      expect(result.series.pop, `${name}: pop series`).toBeDefined();
      expect(result.series.nrfr, `${name}: nrfr series`).toBeDefined();
      expect(result.series.ppolx, `${name}: ppolx series`).toBeDefined();
      expect(result.time.length, `${name}: time array`).toBeGreaterThan(0);
    }
  });

  test("invalid preset throws", () => {
    expect(() => runApiSimulation({ preset: "nonexistent" })).toThrow(
      "Unknown preset",
    );
  });

  test("non-numeric fields are ignored in request parsing", () => {
    // Simulates a body with string values where numbers are expected
    const result = runApiSimulation({
      year_min: "not a number" as unknown,
      year_max: null as unknown,
      dt: undefined,
    });
    // Should fall back to defaults since non-numbers are skipped
    expect(result.year_min).toBe(1900);
    expect(result.year_max).toBe(2100);
    expect(result.dt).toBe(0.5);
  });

  test("pyear and iphst overrides are applied", () => {
    const result = runApiSimulation({ pyear: 2000, iphst: 1960 });
    // The simulation runs — pyear/iphst affect when policy constants switch
    expect(result.series.pop).toBeDefined();
    expect(result.time.length).toBeGreaterThan(0);
  });

  test("output_variables restricts returned series", () => {
    const result = runApiSimulation({
      output_variables: ["pop", "le"],
    });
    expect(result.series.pop).toBeDefined();
    expect(result.series.le).toBeDefined();
    // Should only contain the 2 requested series, not the full set
    const keys = Object.keys(result.series);
    expect(keys).toHaveLength(2);
    expect(keys).toContain("pop");
    expect(keys).toContain("le");
  });

  test("default output_variables returns ModelData.defaultVariables", () => {
    const result = runApiSimulation({});
    const keys = Object.keys(result.series);
    expect(keys.length).toBe(ModelData.defaultVariables.length);
    for (const v of ModelData.defaultVariables) {
      expect(result.series[v], `default variable ${v}`).toBeDefined();
    }
  });

  test("result series values are JSON-serializable numbers", () => {
    const result = runApiSimulation({});
    const json = JSON.stringify(result);
    const parsed = JSON.parse(json) as SimulationResult;
    expect(parsed.time.length).toBe(result.time.length);
    expect(parsed.series.pop!.values.length).toBe(result.series.pop!.values.length);
    // Ensure no NaN/Infinity leaked into serialization
    for (const val of parsed.series.pop!.values) {
      expect(Number.isFinite(val)).toBe(true);
    }
  });
});

describe("Worker API: /api/presets", () => {
  test("ModelData exposes expected preset list", () => {
    expect(ModelData.presets.length).toBe(5);
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
    expect(parsed.presets.length).toBe(5);
  });
});
