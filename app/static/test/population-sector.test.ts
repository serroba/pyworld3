import { describe, expect, test } from "vitest";

import {
  POPULATION_HIDDEN_SERIES,
  createBirthRateDerivedDefinition,
  createBirthsDerivedDefinition,
  createCdrDerivedDefinition,
  createCmpleDerivedDefinition,
  createDcfsDerivedDefinition,
  createDeathDerivedDefinition,
  createDtfDerivedDefinition,
  createFcapcDerivedDefinition,
  createFceDerivedDefinition,
  createFieDerivedDefinition,
  createFmDerivedDefinition,
  createFrsnDerivedDefinition,
  createFsafcDerivedDefinition,
  createLeDerivedDefinition,
  createMaturationDerivedDefinition,
  createMtfDerivedDefinition,
  createMortalityDerivedDefinition,
  createNfcDerivedDefinition,
  createP1StockStateDefinition,
  createPopulationStockStateDefinition,
  createPopulationStockStateDefinitions,
  createPopulationSumDerivedDefinition,
  createSfsnDerivedDefinition,
  createTfDerivedDefinition,
  createTotalDeathsDerivedDefinition,
  extendPopulationSourceVariables,
  maybePopulatePopulationOutputSeries,
  populatePopulationBirthNativeSupportSeries,
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
  {
    sector: "Population",
    "x.name": "LE",
    "x.values": [20, 30, 40],
    "y.name": "FM",
    "y.values": [0.4, 0.8, 1.0],
  },
  {
    sector: "Population",
    "x.name": "PLE",
    "x.values": [20, 30, 40],
    "y.name": "CMPLE",
    "y.values": [1.6, 1.4, 1.2],
  },
  {
    sector: "Population",
    "x.name": "DIOPC",
    "x.values": [0, 5, 10],
    "y.name": "SFSN",
    "y.values": [1.1, 0.8, 0.6],
  },
  {
    sector: "Population",
    "x.name": "FIE",
    "x.values": [-0.2, 0, 0.2],
    "y.name": "FRSN",
    "y.values": [0.6, 0.8, 1.0],
  },
  {
    sector: "Population",
    "x.name": "FCFPC",
    "x.values": [0, 1, 2],
    "y.name": "FCE_TOCLIP",
    "y.values": [0.8, 0.9, 1.0],
  },
  {
    sector: "Population",
    "x.name": "NFC",
    "x.values": [0, 2, 4],
    "y.name": "FSAFC",
    "y.values": [0, 0.01, 0.02],
  },
];

const fixture: SimulationResult = {
  year_min: 1900,
  year_max: 1902,
  dt: 0.5,
  time: [1900, 1900.5, 1901, 1901.5, 1902],
  constants_used: {
    dcfsn: 3.8,
    fcest: 4000,
    ieat: 3,
    len: 28,
    lpd: 20,
    mtfn: 12,
    pet: 4000,
    rlt: 30,
    sad: 20,
    sfpc: 230,
    hsid: 20,
    iphst: 1940,
    zpgt: 4000,
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

const deathFixture: SimulationResult = {
  year_min: 1900,
  year_max: 1902,
  dt: 0.5,
  time: [1900, 1900.5, 1901, 1901.5, 1902],
  constants_used: fixture.constants_used,
  series: {
    pop: { name: "pop", values: [10, 12, 14, 16, 18] },
    p1: { name: "p1", values: [1, 1.5, 2, 2.5, 3] },
    p2: { name: "p2", values: [2, 2.5, 3, 3.5, 4] },
    p3: { name: "p3", values: [3, 3.5, 4, 4.5, 5] },
    p4: { name: "p4", values: [4, 4.5, 5, 5.5, 6] },
    fpc: { name: "fpc", values: [230, 253, 276, 299, 322] },
    iopc: { name: "iopc", values: [10, 10, 10, 10, 10] },
    sopc: { name: "sopc", values: [10, 10, 10, 10, 10] },
    ppolx: { name: "ppolx", values: [1, 1, 1, 1, 1] },
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
      canUseNativeCohortSupport: false,
      canUseNativeDeathPath: false,
      canUseNativePopulationStocks: false,
      canUseNativeBirthSupport: false,
      canUseNativeP1Stock: false,
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

  test("derives the full mortality family from native life expectancy", () => {
    const prepared = prepareRuntime(
      ModelData,
      { output_variables: ["m1", "m2", "m3", "m4"] },
      tables,
    );

    const mortalityExpectations = {
      m1: 0.03,
      m2: 0.02,
      m3: 0.04,
      m4: 0.1,
    } as const;

    for (const [variable, expected] of Object.entries(mortalityExpectations)) {
      const lookup = prepared.lookupLibrary.get(variable.toUpperCase());
      expect(lookup).toBeDefined();

      const definition = createMortalityDerivedDefinition(
        variable as "m1" | "m2" | "m3" | "m4",
        lookup!,
      );
      expect(
        definition.derive({
          index: 0,
          time: 1900,
          values: { le: 30 },
        }),
      ).toBeCloseTo(expected, 8);
    }
  });

  test("derives age-band deaths, total deaths, and cdr", () => {
    expect(
      createDeathDerivedDefinition("d1", "p1", "m1").derive({
        index: 0,
        time: 1900,
        values: { p1: 2, m1: 0.03 },
      }),
    ).toBeCloseTo(0.06, 8);
    expect(
      createTotalDeathsDerivedDefinition().derive({
        index: 0,
        time: 1900,
        values: { d1: 1, d2: 2, d3: 3, d4: 4 },
      }),
    ).toBeCloseTo(10, 8);
    expect(
      createCdrDerivedDefinition().derive({
        index: 0,
        time: 1900,
        values: { d: 0.5, pop: 10 },
      }),
    ).toBeCloseTo(50, 8);
  });

  test("derives cohort support and population stock stepping", () => {
    expect(
      createMaturationDerivedDefinition("mat1", "p1", "m1", 15).derive({
        index: 0,
        time: 1900,
        values: { p1: 15, m1: 0.2 },
      }),
    ).toBeCloseTo(0.8, 8);
    expect(
      createPopulationSumDerivedDefinition().derive({
        index: 0,
        time: 1900,
        values: { p1: 1, p2: 2, p3: 3, p4: 4 },
      }),
    ).toBeCloseTo(10, 8);
    const definitions = createPopulationStockStateDefinitions();
    expect(definitions.map((definition) => definition.variable)).toEqual([
      "p2",
      "p3",
      "p4",
    ]);
    expect(
      createPopulationStockStateDefinition("p2", "mat1", ["d2", "mat2"]).advance(
        2,
        {
          index: 0,
          time: 1900,
          values: { mat1: 0.5, d2: 0.2, mat2: 0.1 },
        },
        {
          index: 1,
          time: 1901,
          values: { mat1: 0.5, d2: 0.2, mat2: 0.1 },
        },
      ),
    ).toBeCloseTo(2.2, 8);
  });

  test("derives the native fertility and birth chain", () => {
    expect(
      createFieDerivedDefinition().derive({
        index: 0,
        time: 1900,
        values: {
          iopc: 12,
          [POPULATION_HIDDEN_SERIES.aiopc]: 10,
        },
      }),
    ).toBeCloseTo(0.2, 8);
    expect(
      createSfsnDerivedDefinition(
        prepareRuntime(ModelData, { output_variables: ["tf"] }, tables).lookupLibrary.get("SFSN")!,
      ).derive({
        index: 0,
        time: 1900,
        values: {
          [POPULATION_HIDDEN_SERIES.diopc]: 5,
        },
      }),
    ).toBeCloseTo(0.8, 8);
    expect(
      createBirthsDerivedDefinition(deathFixture.constants_used).derive({
        index: 0,
        time: 1900,
        values: { d: 0.5, p2: 2, tf: 6 },
      }),
    ).toBeCloseTo(0.2, 8);
    expect(
      createBirthRateDerivedDefinition().derive({
        index: 0,
        time: 1900,
        values: { b: 0.2, pop: 10 },
      }),
    ).toBeCloseTo(20, 8);
    expect(
      createP1StockStateDefinition().advance(
        1,
        {
          index: 0,
          time: 1900,
          values: { b: 0.2, d1: 0.03, mat1: 0.05 },
        },
        {
          index: 1,
          time: 1901,
          values: { b: 0.2, d1: 0.03, mat1: 0.05 },
        },
      ),
    ).toBeCloseTo(1.12, 8);
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
      canUseNativeCohortSupport: false,
      canUseNativeDeathPath: false,
      canUseNativePopulationStocks: false,
      canUseNativeBirthSupport: false,
      canUseNativeP1Stock: false,
    });
    expect(Array.from(sourceVariables).sort()).toEqual([
      "fpc",
      "iopc",
      "pop",
      "ppolx",
      "sopc",
    ]);
  });

  test("extends runtime source requirements for the native death path", () => {
    const sourceVariables = new Set<string>();
    const prepared = prepareRuntime(
      ModelData,
      { output_variables: ["cdr"] },
      tables,
    );

    const result = extendPopulationSourceVariables(
      sourceVariables,
      prepared.outputVariables,
      deathFixture,
      prepared.lookupLibrary,
    );

    expect(result).toEqual({
      canUseNativeLifeExpectancy: true,
      canUseNativeMortality: true,
      canUseNativeCohortSupport: true,
      canUseNativeDeathPath: true,
      canUseNativePopulationStocks: false,
      canUseNativeBirthSupport: false,
      canUseNativeP1Stock: false,
    });
    expect(Array.from(sourceVariables).sort()).toEqual([
      "fpc",
      "iopc",
      "p1",
      "p2",
      "p3",
      "p4",
      "pop",
      "ppolx",
      "sopc",
    ]);
  });

  test("extends runtime source requirements for native population stock outputs", () => {
    const sourceVariables = new Set<string>();
    const prepared = prepareRuntime(
      ModelData,
      { output_variables: ["p2", "p3", "p4", "pop"] },
      tables,
    );

    const result = extendPopulationSourceVariables(
      sourceVariables,
      prepared.outputVariables,
      deathFixture,
      prepared.lookupLibrary,
    );

    expect(result).toEqual({
      canUseNativeLifeExpectancy: true,
      canUseNativeMortality: true,
      canUseNativeCohortSupport: true,
      canUseNativeDeathPath: false,
      canUseNativePopulationStocks: true,
      canUseNativeBirthSupport: false,
      canUseNativeP1Stock: false,
    });
    expect(Array.from(sourceVariables).sort()).toEqual([
      "fpc",
      "iopc",
      "p1",
      "p2",
      "p3",
      "p4",
      "pop",
      "ppolx",
      "sopc",
    ]);
  });

  test("extends runtime source requirements for native cohort support", () => {
    const sourceVariables = new Set<string>();
    const prepared = prepareRuntime(
      ModelData,
      { output_variables: ["mat1", "mat2", "mat3", "pop"] },
      tables,
    );

    const result = extendPopulationSourceVariables(
      sourceVariables,
      prepared.outputVariables,
      deathFixture,
      prepared.lookupLibrary,
    );

    expect(result).toEqual({
      canUseNativeLifeExpectancy: true,
      canUseNativeMortality: true,
      canUseNativeCohortSupport: true,
      canUseNativeDeathPath: false,
      canUseNativePopulationStocks: false,
      canUseNativeBirthSupport: false,
      canUseNativeP1Stock: false,
    });
    expect(Array.from(sourceVariables).sort()).toEqual([
      "fpc",
      "iopc",
      "p1",
      "p2",
      "p3",
      "p4",
      "pop",
      "ppolx",
      "sopc",
    ]);
  });

  test("extends runtime source requirements for the native birth path", () => {
    const sourceVariables = new Set<string>();
    const prepared = prepareRuntime(
      ModelData,
      { output_variables: ["p1", "b", "cbr", "tf"] },
      tables,
    );

    const result = extendPopulationSourceVariables(
      sourceVariables,
      prepared.outputVariables,
      deathFixture,
      prepared.lookupLibrary,
    );

    expect(result).toEqual({
      canUseNativeLifeExpectancy: true,
      canUseNativeMortality: true,
      canUseNativeCohortSupport: true,
      canUseNativeDeathPath: false,
      canUseNativePopulationStocks: true,
      canUseNativeBirthSupport: true,
      canUseNativeP1Stock: true,
    });
    expect(Array.from(sourceVariables).sort()).toEqual([
      "fpc",
      "iopc",
      "p1",
      "p2",
      "p3",
      "p4",
      "pop",
      "ppolx",
      "sopc",
    ]);
  });

  test("populates life expectancy and the mortality family natively", () => {
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
      false,
      false,
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
    const mortalityExpectations = {
      m1: [0.034056, 0.031841536, 0.029628864],
      m2: [0.022028, 0.020920768, 0.019814432],
      m3: [0.044056, 0.041841536, 0.039628864],
      m4: [0.104056, 0.101841536, 0.099628864],
    } as const;

    for (const [variable, expected] of Object.entries(mortalityExpectations)) {
      const values = Array.from(sourceSeries.get(variable) ?? []);
      expect(values[0]).toBeCloseTo(expected[0], 6);
      expect(values[1]).toBeCloseTo(expected[1], 6);
      expect(values[2]).toBeCloseTo(expected[2], 6);
    }
  });

  test("populates the native death path from cohorts and mortality", () => {
    const prepared = prepareRuntime(
      ModelData,
      { year_min: 1900, year_max: 1902, dt: 1, output_variables: ["cdr"] },
      tables,
    );
    const sourceSeries = new Map<string, Float64Array>([
      ["pop", Float64Array.from([10, 14, 18])],
      ["p1", Float64Array.from([1, 2, 3])],
      ["p2", Float64Array.from([2, 3, 4])],
      ["p3", Float64Array.from([3, 4, 5])],
      ["p4", Float64Array.from([4, 5, 6])],
      ["fpc", Float64Array.from([230, 276, 322])],
      ["iopc", Float64Array.from([10, 10, 10])],
      ["sopc", Float64Array.from([10, 10, 10])],
      ["ppolx", Float64Array.from([1, 1, 1])],
    ]);
    const sourceFrame: RuntimeStateFrame = {
      request: prepared.request,
      time: Float64Array.from(prepared.time),
      constantsUsed: deathFixture.constants_used,
      series: sourceSeries,
    };

    populatePopulationNativeSupportSeries(
      sourceFrame,
      sourceSeries,
      prepared,
      deathFixture.constants_used,
      true,
      true,
      true,
      true,
    );

    const deathExpectations = {
      d1: [0.034056, 0.063683072, 0.088886592],
      d2: [0.044056, 0.062762304, 0.079257728],
      d3: [0.132168, 0.167366144, 0.19814432],
      d4: [0.416224, 0.50920768, 0.597773184],
      d: [0.626504, 0.8030192, 0.964061824],
      cdr: [62.6504, 57.35851428571429, 53.55899022222223],
    } as const;

    for (const [variable, expected] of Object.entries(deathExpectations)) {
      const values = Array.from(sourceSeries.get(variable) ?? []);
      expect(values[0]).toBeCloseTo(expected[0], 6);
      expect(values[1]).toBeCloseTo(expected[1], 6);
      expect(values[2]).toBeCloseTo(expected[2], 6);
    }
  });

  test("populates native cohort support from mortality and cohorts", () => {
    const prepared = prepareRuntime(
      ModelData,
      { year_min: 1900, year_max: 1902, dt: 1, output_variables: ["mat1", "mat2", "mat3", "pop"] },
      tables,
    );
    const sourceSeries = new Map<string, Float64Array>([
      ["pop", Float64Array.from([999, 999, 999])],
      ["p1", Float64Array.from([1, 2, 3])],
      ["p2", Float64Array.from([2, 3, 4])],
      ["p3", Float64Array.from([3, 4, 5])],
      ["p4", Float64Array.from([4, 5, 6])],
      ["fpc", Float64Array.from([230, 276, 322])],
      ["iopc", Float64Array.from([10, 10, 10])],
      ["sopc", Float64Array.from([10, 10, 10])],
      ["ppolx", Float64Array.from([1, 1, 1])],
    ]);
    const sourceFrame: RuntimeStateFrame = {
      request: prepared.request,
      time: Float64Array.from(prepared.time),
      constantsUsed: deathFixture.constants_used,
      series: sourceSeries,
    };

    populatePopulationNativeSupportSeries(
      sourceFrame,
      sourceSeries,
      prepared,
      deathFixture.constants_used,
      true,
      true,
      true,
      false,
      false,
    );

    expect(Array.from(sourceSeries.get("pop") ?? [])).toEqual([10, 14, 18]);
    const cohortExpectations = {
      mat1: [0.06439626666666667, 0.1290877952, 0.1940746816],
      mat2: [0.06519813333333333, 0.0979079232, 0.13069140906666667],
      mat3: [0.1433916, 0.1916316928, 0.240092736],
    } as const;

    for (const [variable, expected] of Object.entries(cohortExpectations)) {
      const values = Array.from(sourceSeries.get(variable) ?? []);
      expect(values[0]).toBeCloseTo(expected[0], 6);
      expect(values[1]).toBeCloseTo(expected[1], 6);
      expect(values[2]).toBeCloseTo(expected[2], 6);
    }
  });

  test("publishes native population stock outputs from the runtime frame", () => {
    const sourceFrame: RuntimeStateFrame = {
      request: { year_min: 1900, year_max: 1902, dt: 1 },
      time: Float64Array.from([1900, 1901, 1902]),
      constantsUsed: deathFixture.constants_used,
      series: new Map([
        ["p2", Float64Array.from([2, 1.9551421333333334, 1.9235597013333333])],
        ["p3", Float64Array.from([3, 2.7896385333333334, 2.5285486197333336])],
        ["p4", Float64Array.from([4, 3.7271676, 3.4095916128])],
        ["pop", Float64Array.from([10, 10.471948266666666, 10.861699933866667])],
      ]),
    };
    const series = new Map<string, Float64Array>();
    const expectations = {
      p2: [2, 1.9551421333333334, 1.9235597013333333],
      p3: [3, 2.7896385333333334, 2.5285486197333336],
      p4: [4, 3.7271676, 3.4095916128],
      pop: [10, 10.471948266666666, 10.861699933866667],
    } as const;

    for (const [variable, expected] of Object.entries(expectations)) {
      const handled = maybePopulatePopulationOutputSeries(variable, sourceFrame, series);
      expect(handled).toBe(true);
      const values = Array.from(series.get(variable) ?? []);
      expect(values[0]).toBeCloseTo(expected[0], 6);
      expect(values[1]).toBeCloseTo(expected[1], 6);
      expect(values[2]).toBeCloseTo(expected[2], 6);
    }
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
        ["m2", Float64Array.from([0.022028, 0.020920768, 0.019814432])],
        ["m3", Float64Array.from([0.044056, 0.041841536, 0.039628864])],
        ["m4", Float64Array.from([0.104056, 0.101841536, 0.099628864])],
      ]),
    };
    const series = new Map<string, Float64Array>();

    const mortalityExpectations = {
      m1: [0.034056, 0.031841536, 0.029628864],
      m2: [0.022028, 0.020920768, 0.019814432],
      m3: [0.044056, 0.041841536, 0.039628864],
      m4: [0.104056, 0.101841536, 0.099628864],
    } as const;

    for (const [variable, expected] of Object.entries(mortalityExpectations)) {
      const handled = maybePopulatePopulationOutputSeries(variable, sourceFrame, series);

      expect(handled).toBe(true);
      expect(Array.from(series.get(variable) ?? [])).toEqual(expected);
    }
  });

  test("publishes native death outputs from the runtime frame", () => {
    const sourceFrame: RuntimeStateFrame = {
      request: { year_min: 1900, year_max: 1902, dt: 1 },
      time: Float64Array.from([1900, 1901, 1902]),
      constantsUsed: deathFixture.constants_used,
      series: new Map([
        ["d1", Float64Array.from([0.034056, 0.063683072, 0.088886592])],
        ["d2", Float64Array.from([0.044056, 0.062762304, 0.079257728])],
        ["d3", Float64Array.from([0.132168, 0.167366144, 0.19814432])],
        ["d4", Float64Array.from([0.416224, 0.50920768, 0.597773184])],
        ["d", Float64Array.from([0.626504, 0.8030192, 0.964061824])],
        ["cdr", Float64Array.from([62.6504, 57.35851428571429, 53.55899022222223])],
      ]),
    };
    const series = new Map<string, Float64Array>();

    const deathExpectations = {
      d1: [0.034056, 0.063683072, 0.088886592],
      d2: [0.044056, 0.062762304, 0.079257728],
      d3: [0.132168, 0.167366144, 0.19814432],
      d4: [0.416224, 0.50920768, 0.597773184],
      d: [0.626504, 0.8030192, 0.964061824],
      cdr: [62.6504, 57.35851428571429, 53.55899022222223],
    } as const;

    for (const [variable, expected] of Object.entries(deathExpectations)) {
      const handled = maybePopulatePopulationOutputSeries(variable, sourceFrame, series);
      expect(handled).toBe(true);
      expect(Array.from(series.get(variable) ?? [])).toEqual(expected);
    }
  });

  test("publishes native cohort outputs and pop from the runtime frame", () => {
    const sourceFrame: RuntimeStateFrame = {
      request: { year_min: 1900, year_max: 1902, dt: 1 },
      time: Float64Array.from([1900, 1901, 1902]),
      constantsUsed: deathFixture.constants_used,
      series: new Map([
        ["pop", Float64Array.from([10, 14, 18])],
        ["mat1", Float64Array.from([0.06439626666666667, 0.1290877952, 0.1940746816])],
        ["mat2", Float64Array.from([0.06519813333333333, 0.0979079232, 0.13069140906666667])],
        ["mat3", Float64Array.from([0.1433916, 0.1916316928, 0.240092736])],
      ]),
    };
    const series = new Map<string, Float64Array>();
    const expectations = {
      pop: [10, 14, 18],
      mat1: [0.06439626666666667, 0.1290877952, 0.1940746816],
      mat2: [0.06519813333333333, 0.0979079232, 0.13069140906666667],
      mat3: [0.1433916, 0.1916316928, 0.240092736],
    } as const;

    for (const [variable, expected] of Object.entries(expectations)) {
      const handled = maybePopulatePopulationOutputSeries(variable, sourceFrame, series);
      expect(handled).toBe(true);
      const values = Array.from(series.get(variable) ?? []);
      expect(values[0]).toBeCloseTo(expected[0], 6);
      expect(values[1]).toBeCloseTo(expected[1], 6);
      expect(values[2]).toBeCloseTo(expected[2], 6);
    }
  });
});
