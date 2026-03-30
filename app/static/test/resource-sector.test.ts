import { describe, expect, test } from "vitest";

import {
  createOracleRateSeries,
  extendResourceSourceVariables,
  maybePopulateResourceOutputSeries,
  populateResourceNativeSupportSeries,
  RESOURCE_HIDDEN_SERIES,
} from "../ts/core/resource-sector.ts";
import { prepareRuntime } from "../ts/core/browser-native-runtime.ts";
import { ModelData } from "../ts/model-data.ts";
import type { RawLookupTable } from "../ts/core/world3-tables.ts";
import type { RuntimeStateFrame } from "../ts/core/runtime-state-frame.ts";
import type { SimulationResult } from "../ts/simulation-contracts.ts";

const tables: RawLookupTable[] = [
  {
    sector: "Resources",
    "x.name": "IOPC",
    "x.values": [1, 2, 3],
    "y.name": "PCRUM",
    "y.values": [2, 3, 4],
  },
  {
    sector: "Resources",
    "x.name": "NRFR",
    "x.values": [0, 1],
    "y.name": "FCAOR1",
    "y.values": [1, 0],
  },
  {
    sector: "Resources",
    "x.name": "NRFR",
    "x.values": [0, 1],
    "y.name": "FCAOR2",
    "y.values": [0.5, 0.2],
  },
];

const fixture: SimulationResult = {
  year_min: 1900,
  year_max: 1902,
  dt: 0.5,
  time: [1900, 1900.5, 1901, 1901.5, 1902],
  constants_used: { nri: 100, nruf1: 1, nruf2: 0.5 },
  series: {
    nr: { name: "nr", values: [100, 95, 90, 85, 80] },
    pop: { name: "pop", values: [10, 12, 14, 16, 18] },
    iopc: { name: "iopc", values: [1, 1.5, 2, 2.5, 3] },
    fcaor: { name: "fcaor", values: [0.1, 0.2, 0.3, 0.4, 0.5] },
  },
};

describe("resource sector core", () => {
  test("canUseNativeNrFlow is true when fixture has nrfr+nri but not nr", () => {
    const sourceVariables = new Set<string>();
    const prepared = prepareRuntime(
      ModelData,
      { output_variables: ["nrfr"] },
      tables,
    );

    const nrfrOnlyFixture: SimulationResult = {
      ...fixture,
      series: {
        pop: { name: "pop", values: [10, 12, 14, 16, 18] },
        iopc: { name: "iopc", values: [1, 1.5, 2, 2.5, 3] },
        nrfr: { name: "nrfr", values: [1, 0.95, 0.9, 0.85, 0.8] },
      },
    };

    const result = extendResourceSourceVariables(
      sourceVariables,
      prepared.outputVariables,
      nrfrOnlyFixture,
      prepared.lookupLibrary,
      false,
    );

    expect(result.canUseNativeNrFlow).toBe(true);
    expect(sourceVariables.has("nr")).toBe(true);
    expect(sourceVariables.has("pop")).toBe(true);
  });

  test("extends runtime source requirements for resource outputs", () => {
    const sourceVariables = new Set<string>();
    const prepared = prepareRuntime(
      ModelData,
      { output_variables: ["fcaor"] },
      tables,
    );

    const result = extendResourceSourceVariables(
      sourceVariables,
      prepared.outputVariables,
      fixture,
      prepared.lookupLibrary,
      false,
    );

    expect(result).toEqual({ canUseNativeNrFlow: true });
    expect(Array.from(sourceVariables).sort()).toEqual(["iopc", "nr", "pop"]);
  });

  test("falls back to oracle nr rate when native resource inputs are unavailable", () => {
    const prepared = prepareRuntime(
      ModelData,
      { year_min: 1900, year_max: 1902, dt: 1, output_variables: ["nr"] },
      [],
    );
    const sourceSeries = new Map<string, Float64Array>([
      ["nr", Float64Array.from([100, 90, 80])],
    ]);
    const frame: RuntimeStateFrame = {
      request: prepared.request,
      time: Float64Array.from(prepared.time),
      constantsUsed: fixture.constants_used,
      series: sourceSeries,
    };

    populateResourceNativeSupportSeries(
      frame,
      sourceSeries,
      prepared,
      fixture.constants_used,
      false,
    );

    expect(Array.from(sourceSeries.get(RESOURCE_HIDDEN_SERIES.nrRate) ?? [])).toEqual(
      Array.from(createOracleRateSeries(Float64Array.from([100, 90, 80]), frame.time)),
    );
  });

  test("derives fcaor natively when lookup tables are available", () => {
    const prepared = prepareRuntime(
      ModelData,
      { year_min: 1900, year_max: 1902, dt: 1, output_variables: ["fcaor"] },
      tables,
    );
    const sourceFrame: RuntimeStateFrame = {
      request: prepared.request,
      time: Float64Array.from(prepared.time),
      constantsUsed: fixture.constants_used,
      series: new Map([
        ["nr", Float64Array.from([100, 80, 38])],
      ]),
    };
    const series = new Map<string, Float64Array>();

    const handled = maybePopulateResourceOutputSeries(
      "fcaor",
      sourceFrame,
      series,
      prepared,
      fixture,
      [0, 2, 4],
      fixture.constants_used,
    );

    expect(handled).toBe(true);
    const values = Array.from(series.get("fcaor") ?? []);
    expect(values[0]).toBeCloseTo(0, 8);
    expect(values[1]).toBeCloseTo(0.2, 8);
    expect(values[2]).toBeCloseTo(0.62, 8);
  });
});
