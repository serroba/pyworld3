import { describe, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ModelData } from "../ts/model-data.ts";
import { createWorld3Core } from "../ts/core/world3-core.ts";
import type { RawLookupTable } from "../ts/core/world3-tables.ts";

function loadTables(): RawLookupTable[] {
  const raw = readFileSync(
    resolve(__dirname, "../data/functions-table-world3.json"),
    "utf-8",
  );
  return JSON.parse(raw) as RawLookupTable[];
}

const tables = loadTables();

describe("world3 core facade", () => {
  test("creates a local simulation core that can run standard-run", async () => {
    const core = createWorld3Core(
      ModelData,
      async () => tables,
    );

    const result = await core.createLocalSimulationCore().simulatePreset("standard-run");
    expect(result.series.pop).toBeDefined();
    expect(result.series.pop!.values[0]).toBeGreaterThan(1e9);
  });

  test("reuses cached runtime resources across summary and svg helpers", async () => {
    const loadTablesFn = vi.fn(async () => tables);
    const core = createWorld3Core(ModelData, loadTablesFn);

    await expect(core.summarizeStandardRun()).resolves.toContain(
      "World3 Simulation Summary",
    );
    await expect(core.renderStandardRunSvg()).resolves.toContain("<svg");

    expect(loadTablesFn).toHaveBeenCalledTimes(1);
  });

  test("simulateStandardRun returns result with key series", async () => {
    const core = createWorld3Core(
      ModelData,
      async () => tables,
    );

    const result = await core.simulateStandardRun();
    expect(result.year_min).toBe(1900);
    expect(result.year_max).toBe(2100);
    expect(result.series.pop).toBeDefined();
    expect(result.series.nrfr).toBeDefined();
  });

  test("simulateStandardRun with overrides changes the output", async () => {
    const core = createWorld3Core(
      ModelData,
      async () => tables,
    );

    const base = await core.simulateStandardRun();
    const modified = await core.simulateStandardRun({
      constants: { len: 40 },
    });

    expect(modified.series.le!.values[200]).not.toBeCloseTo(
      base.series.le!.values[200]!,
      1,
    );
  });
});
