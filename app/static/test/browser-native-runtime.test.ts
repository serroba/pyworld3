import { describe, expect, test, vi } from "vitest";

import { ModelData } from "../ts/model-data.ts";
import {
  createFixtureBackedRuntime,
  prepareRuntime,
} from "../ts/core/index.ts";
import type { RawLookupTable } from "../ts/core/index.ts";
import type { SimulationResult } from "../ts/simulation-contracts.ts";

const fixture: SimulationResult = {
  year_min: 1900,
  year_max: 1901,
  dt: 0.5,
  time: [1900, 1900.5, 1901],
  constants_used: {},
  series: {
    pop: { name: "pop", values: [1, 2, 3] },
  },
};

const tables: RawLookupTable[] = [
  {
    sector: "Population",
    "x.name": "LE",
    "x.values": [20, 40],
    "y.name": "M1",
    "y.values": [0.05, 0.03],
  },
];

describe("browser-native runtime", () => {
  test("prepares a runtime context with time grid and lookup library", () => {
    const prepared = prepareRuntime(
      ModelData,
      { year_min: 1900, year_max: 1901, dt: 0.5, output_variables: ["pop"] },
      tables,
    );

    expect(Array.from(prepared.time)).toEqual([1900, 1900.5, 1901]);
    expect(prepared.outputVariables).toEqual(["pop"]);
    expect(prepared.lookupLibrary.get("M1")?.evaluate(30)).toBeCloseTo(0.04, 8);
  });

  test("uses model defaults when request fields are omitted", () => {
    const prepared = prepareRuntime(ModelData, {}, tables);

    expect(prepared.outputVariables).toEqual(ModelData.defaultVariables);
    expect(prepared.time[0]).toBe(1900);
    expect(prepared.time[prepared.time.length - 1]).toBe(2100);
  });

  test("caches tables and fixture loads in the fixture-backed runtime", async () => {
    const loadTables = vi.fn(async () => tables);
    const loadFixture = vi.fn(async () => fixture);
    const runtime = createFixtureBackedRuntime(ModelData, loadTables, loadFixture);

    await runtime.prepareStandardRun();
    await runtime.prepareStandardRun();
    await runtime.simulateStandardRun();
    await runtime.simulateStandardRun();

    expect(loadTables).toHaveBeenCalledTimes(1);
    expect(loadFixture).toHaveBeenCalledTimes(1);
  });
});
