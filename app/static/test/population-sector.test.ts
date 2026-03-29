import { describe, expect, test } from "vitest";

import {
  POPULATION_HIDDEN_SERIES,
  createLeDerivedDefinition,
  createMortalityDerivedDefinition,
  extendPopulationSourceVariables,
  maybePopulatePopulationOutputSeries,
  populatePopulationNativeSupportSeries,
  prepareRuntime,
} from "../ts/core/index.ts";
import { ModelData } from "../ts/model-data.ts";
import type { RawLookupTable, RuntimeStateFrame } from "../ts/core/index.ts";
import type { SimulationResult } from "../ts/simulation-contracts.ts";

const tables: RawLookupTable[] = [
  {
    sector: "Population",
    "x.name": "POP",
    "x.values": [0, 100, 200],
    "y.name": "FPU",
    "y.values": [0, 0.1, 0.2],
  },
  {
    sector: "Population",
    "x.name": "FPC/SFPC",
    "x.values": [0, 1, 2],
    "y.name": "LMF",
    "y.values": [0.8, 1, 1.2],
  },
  {
    sector: "Population",
    "x.name": "SOPC",
    "x.values": [0, 10, 20],
    "y.name": "HSAPC",
    "y.values": [0, 10, 20],
  },
  {
    sector: "Population",
    "x.name": "EHSPC",
    "x.values": [0, 10, 20],
    "y.name": "LMHS1",
    "y.values": [0.5, 1, 1.5],
  },
  {
    sector: "Population",
    "x.name": "EHSPC",
    "x.values": [0, 10, 20],
    "y.name": "LMHS2",
    "y.values": [0.4, 0.9, 1.4],
  },
  {
    sector: "Population",
    "x.name": "IOPC",
    "x.values": [0, 10, 20],
    "y.name": "CMI",
    "y.values": [0, 0.1, 0.2],
  },
  {
    sector: "Population",
    "x.name": "PPOLX",
    "x.values": [0, 1, 2],
    "y.name": "LMP",
    "y.values": [1.2, 1, 0.8],
  },
  {
    sector: "Population",
    "x.name": "LE",
    "x.values": [20, 30, 40],
    "y.name": "M1",
    "y.values": [0.05, 0.03, 0.01],
  },
  {
    sector: "Population",
    "x.name": "LE",
    "x.values": [20, 30, 40],
    "y.name": "M2",
    "y.values": [0.03, 0.02, 0.01],
  },
  {
    sector: "Population",
    "x.name": "LE",
    "x.values": [20, 30, 40],
    "y.name": "M3",
    "y.values": [0.06, 0.04, 0.02],
  },
  {
    sector: "Population",
    "x.name": "LE",
    "x.values": [20, 30, 40],
    "y.name": "M4",
    "y.values": [0.12, 0.1, 0.08],
  },
];

const fixture: SimulationResult = {
  year_min: 1900,
  year_max: 1902,
  dt: 0.5,
  time: [1900, 1900.5, 1901, 1901.5, 1902],
  constants_used: {
    len: 28,
    sfpc: 230,
    hsid: 20,
    iphst: 1940,
  },
  series: {
    pop: { name: "pop", values: [10, 12, 14, 16, 18] },
    fpc: { name: "fpc", values: [230, 253, 276, 299, 322] },
    iopc: { name: "iopc", values: [10, 10, 10, 10, 10] },
    sopc: { name: "sopc", values: [10, 10, 10, 10, 10] },
    ppolx: { name: "ppolx", values: [1, 1, 1, 1, 1] },
    le: { name: "le", values: [0, 0, 0, 0, 0] },
  },
};

describe("population sector core", () => {
  test("extends runtime source requirements for native life expectancy", () => {
    const sourceVariables = new Set<string>();
    const prepared = prepareRuntime(
      ModelData,
      { output_variables: ["le"] },
      tables,
    );

    const result = extendPopulationSourceVariables(
      sourceVariables,
      prepared.outputVariables,
      fixture,
      prepared.lookupLibrary,
    );

    expect(result).toEqual({
      canUseNativeLifeExpectancy: true,
      canUseNativeMortality: false,
    });
    expect(Array.from(sourceVariables).sort()).toEqual([
      "fpc",
      "iopc",
      "pop",
      "ppolx",
      "sopc",
    ]);
  });

  test("derives life expectancy from the native multiplier chain", () => {
    const definition = createLeDerivedDefinition(fixture.constants_used);

    expect(
      definition.derive({
        index: 0,
        time: 1900,
        values: {
          [POPULATION_HIDDEN_SERIES.lmf]: 1.1,
          [POPULATION_HIDDEN_SERIES.lmhs]: 1,
          [POPULATION_HIDDEN_SERIES.lmp]: 0.9,
          [POPULATION_HIDDEN_SERIES.lmc]: 0.8,
        },
      }),
    ).toBeCloseTo(22.176, 8);
  });

  test("derives mortality from native life expectancy", () => {
    const prepared = prepareRuntime(ModelData, { output_variables: ["m1"] }, tables);
    const m1Lookup = prepared.lookupLibrary.get("M1");
    expect(m1Lookup).toBeDefined();

    const definition = createMortalityDerivedDefinition("m1", m1Lookup!);
    expect(
      definition.derive({
        index: 0,
        time: 1900,
        values: { le: 30 },
      }),
    ).toBeCloseTo(0.03, 8);
  });

  test("extends runtime source requirements for native mortality outputs", () => {
    const sourceVariables = new Set<string>();
    const prepared = prepareRuntime(
      ModelData,
      { output_variables: ["m1"] },
      tables,
    );

    const result = extendPopulationSourceVariables(
      sourceVariables,
      prepared.outputVariables,
      fixture,
      prepared.lookupLibrary,
    );

    expect(result).toEqual({
      canUseNativeLifeExpectancy: true,
      canUseNativeMortality: true,
    });
    expect(Array.from(sourceVariables).sort()).toEqual([
      "fpc",
      "iopc",
      "pop",
      "ppolx",
      "sopc",
    ]);
  });

  test("populates life expectancy support and output natively", () => {
    const prepared = prepareRuntime(
      ModelData,
      { year_min: 1900, year_max: 1902, dt: 1, output_variables: ["le"] },
      tables,
    );
    const sourceSeries = new Map<string, Float64Array>([
      ["pop", Float64Array.from([10, 14, 18])],
      ["fpc", Float64Array.from([230, 276, 322])],
      ["iopc", Float64Array.from([10, 10, 10])],
      ["sopc", Float64Array.from([10, 10, 10])],
      ["ppolx", Float64Array.from([1, 1, 1])],
    ]);
    const sourceFrame: RuntimeStateFrame = {
      request: prepared.request,
      time: Float64Array.from(prepared.time),
      constantsUsed: fixture.constants_used,
      series: sourceSeries,
    };

    populatePopulationNativeSupportSeries(
      sourceFrame,
      sourceSeries,
      prepared,
      fixture.constants_used,
      true,
      true,
    );

    expect(Array.from(sourceSeries.get(POPULATION_HIDDEN_SERIES.ehspc) ?? [])).toEqual([
      10,
      10,
      10,
    ]);
    const leValues = Array.from(sourceSeries.get("le") ?? []);
    expect(leValues[0]).toBeCloseTo(27.972, 6);
    expect(leValues[1]).toBeCloseTo(29.079232, 6);
    expect(leValues[2]).toBeCloseTo(30.185568, 6);
    const m1Values = Array.from(sourceSeries.get("m1") ?? []);
    expect(m1Values[0]).toBeCloseTo(0.034056, 6);
    expect(m1Values[1]).toBeCloseTo(0.031841536, 6);
    expect(m1Values[2]).toBeCloseTo(0.029628864, 6);
  });

  test("publishes native le from the runtime frame", () => {
    const sourceFrame: RuntimeStateFrame = {
      request: { year_min: 1900, year_max: 1902, dt: 1 },
      time: Float64Array.from([1900, 1901, 1902]),
      constantsUsed: fixture.constants_used,
      series: new Map([
        ["le", Float64Array.from([27.972, 30.699872, 33.416928])],
      ]),
    };
    const series = new Map<string, Float64Array>();

    const handled = maybePopulatePopulationOutputSeries("le", sourceFrame, series);

    expect(handled).toBe(true);
    expect(Array.from(series.get("le") ?? [])).toEqual([
      27.972,
      30.699872,
      33.416928,
    ]);
  });

  test("publishes native mortality outputs from the runtime frame", () => {
    const sourceFrame: RuntimeStateFrame = {
      request: { year_min: 1900, year_max: 1902, dt: 1 },
      time: Float64Array.from([1900, 1901, 1902]),
      constantsUsed: fixture.constants_used,
      series: new Map([
        ["m1", Float64Array.from([0.034056, 0.031841536, 0.029628864])],
      ]),
    };
    const series = new Map<string, Float64Array>();

    const handled = maybePopulatePopulationOutputSeries("m1", sourceFrame, series);

    expect(handled).toBe(true);
    expect(Array.from(series.get("m1") ?? [])).toEqual([
      0.034056,
      0.031841536,
      0.029628864,
    ]);
  });
});
