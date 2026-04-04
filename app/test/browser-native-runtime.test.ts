import { describe, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ModelData } from "../ts/model-data.ts";
import {
  createSimulationRuntime,
} from "../ts/core/browser-native-runtime.ts";
import type { RawLookupTable } from "../ts/core/world3-tables.ts";

function loadTables(): RawLookupTable[] {
  const raw = readFileSync(
    resolve(__dirname, "../data/functions-table-world3.json"),
    "utf-8",
  );
  return JSON.parse(raw) as RawLookupTable[];
}

const tables = loadTables();

describe("browser-native runtime", () => {
  test("caches tables loads across multiple simulate calls", async () => {
    const loadTables = vi.fn(async () => tables);
    const runtime = createSimulationRuntime(ModelData, loadTables);

    await runtime.simulateStandardRun();
    await runtime.simulateStandardRun();

    expect(loadTables).toHaveBeenCalledTimes(1);
  });

  test("simulateStandardRun produces key output series", async () => {
    const runtime = createSimulationRuntime(ModelData, async () => tables);

    const result = await runtime.simulateStandardRun();

    expect(result.year_min).toBe(1900);
    expect(result.year_max).toBe(2100);
    expect(result.series.pop).toBeDefined();
    expect(result.series.le).toBeDefined();
    expect(result.series.iopc).toBeDefined();
    expect(result.series.fpc).toBeDefined();
    expect(result.series.ppolx).toBeDefined();
    expect(result.series.nrfr).toBeDefined();
    expect(result.series.pop!.values[0]).toBeGreaterThan(1e9);
  });

  test("simulate with overrides produces different results", async () => {
    const runtime = createSimulationRuntime(ModelData, async () => tables);

    const base = await runtime.simulateStandardRun();
    const modified = await runtime.simulate({
      constants: { ...ModelData.constantDefaults, len: 40 },
    });

    expect(modified.series.le!.values[200]).not.toBeCloseTo(
      base.series.le!.values[200]!,
      1,
    );
  });

  test("simulate with custom time range", async () => {
    const runtime = createSimulationRuntime(ModelData, async () => tables);

    const result = await runtime.simulate({
      year_min: 1900,
      year_max: 1950,
      dt: 1,
      constants: { ...ModelData.constantDefaults },
    });

    expect(result.year_min).toBe(1900);
    expect(result.year_max).toBe(1950);
    expect(result.time[0]).toBe(1900);
    expect(result.time[result.time.length - 1]).toBe(1950);
    expect(result.time.length).toBe(51);
  });
});
