import { describe, expect, test } from "vitest";

import {
  CAPITAL_HIDDEN_SERIES,
  createAlicDerivedDefinition,
  createAlscDerivedDefinition,
  createFioacDerivedDefinition,
  createFioaiDerivedDefinition,
  createFioasDerivedDefinition,
  createIcdrDerivedDefinition,
  createIcirDerivedDefinition,
  createIoDerivedDefinition,
  createIopcDerivedDefinition,
  createIsopcDerivedDefinition,
  createScdrDerivedDefinition,
  createScirDerivedDefinition,
  createSoDerivedDefinition,
  createSopcDerivedDefinition,
  extendCapitalSourceVariables,
  maybePopulateCapitalOutputSeries,
  populateCapitalNativeSupportSeries,
  prepareRuntime,
} from "../ts/core/index.ts";
import { ModelData } from "../ts/model-data.ts";
import type { RawLookupTable, RuntimeStateFrame } from "../ts/core/index.ts";
import type { SimulationResult } from "../ts/simulation-contracts.ts";

const tables: RawLookupTable[] = [
  {
    sector: "Capital",
    "x.name": "IOPCR",
    "x.values": [0, 1, 2],
    "y.name": "FIOACV",
    "y.values": [0.2, 0.4, 0.6],
  },
  {
    sector: "Capital",
    "x.name": "IOPC",
    "x.values": [0, 100, 200],
    "y.name": "ISOPC1",
    "y.values": [10, 20, 30],
  },
  {
    sector: "Capital",
    "x.name": "IOPC",
    "x.values": [0, 100, 200],
    "y.name": "ISOPC2",
    "y.values": [15, 25, 35],
  },
  {
    sector: "Capital",
    "x.name": "SOR",
    "x.values": [0, 2, 4],
    "y.name": "FIOAS1",
    "y.values": [0.2, 0.4, 0.6],
  },
  {
    sector: "Capital",
    "x.name": "SOR",
    "x.values": [0, 2, 4],
    "y.name": "FIOAS2",
    "y.values": [0.25, 0.45, 0.65],
  },
];

const fixture: SimulationResult = {
  year_min: 1900,
  year_max: 1902,
  dt: 0.5,
  time: [1900, 1900.5, 1901, 1901.5, 1902],
  constants_used: {
    fioac1: 0.43,
    fioac2: 0.5,
    iopcd: 100,
    iet: 1950,
    ici: 210,
    sci: 144,
    alic1: 14,
    alic2: 14,
    alsc1: 20,
    alsc2: 20,
  },
  series: {
    fioaa: { name: "fioaa", values: [0.1, 0.1, 0.1, 0.1, 0.1] },
    pop: { name: "pop", values: [10, 12, 14, 16, 18] },
    iopc: { name: "iopc", values: [1, 1.5, 2, 2.5, 3] },
    io: { name: "io", values: [10, 18, 28, 40, 54] },
    sopc: { name: "sopc", values: [4, 5, 6, 7, 8] },
    so: { name: "so", values: [40, 60, 84, 112, 144] },
  },
};

describe("capital sector core", () => {
  test("extends runtime source requirements for io derivation", () => {
    const sourceVariables = new Set<string>();

    const result = extendCapitalSourceVariables(
      sourceVariables,
      ["io"],
      fixture,
      new Map(),
    );

    expect(result).toEqual({
      canDeriveIo: true,
      canDeriveIopc: false,
      canDeriveSo: false,
      canDeriveSopc: false,
      canUseNativeCapitalAllocation: false,
      canUseNativeCapitalInvestment: false,
      canUseNativeCapitalStocks: false,
    });
    expect(Array.from(sourceVariables).sort()).toEqual(["iopc", "pop"]);
  });

  test("extends runtime source requirements for capital investment support", () => {
    const sourceVariables = new Set<string>(["iopc", "sopc"]);
    const prepared = prepareRuntime(
      ModelData,
      { output_variables: ["so"] },
      tables,
    );

    const result = extendCapitalSourceVariables(
      sourceVariables,
      prepared.outputVariables,
      fixture,
      prepared.lookupLibrary,
    );

    expect(result.canUseNativeCapitalAllocation).toBe(true);
    expect(result.canUseNativeCapitalInvestment).toBe(true);
    expect(result.canUseNativeCapitalStocks).toBe(true);
    expect(Array.from(sourceVariables).sort()).toEqual([
      "fioaa",
      "io",
      "iopc",
      "pop",
      "sopc",
    ]);
  });

  test("derives io from pop and iopc", () => {
    const definition = createIoDerivedDefinition();

    expect(
      definition.derive({
        index: 0,
        time: 1900,
        values: { pop: 10, iopc: 1.5 },
      }),
    ).toBe(15);
  });

  test("derives iopc from io and pop", () => {
    const definition = createIopcDerivedDefinition();

    expect(
      definition.derive({
        index: 0,
        time: 1900,
        values: { io: 30, pop: 10 },
      }),
    ).toBe(3);
  });

  test("derives so from pop and sopc", () => {
    const definition = createSoDerivedDefinition();

    expect(
      definition.derive({
        index: 0,
        time: 1900,
        values: { pop: 10, sopc: 4 },
      }),
    ).toBe(40);
  });

  test("derives sopc from so and pop", () => {
    const definition = createSopcDerivedDefinition();

    expect(
      definition.derive({
        index: 0,
        time: 1900,
        values: { so: 40, pop: 10 },
      }),
    ).toBe(4);
  });

  test("derives fioac with policy and equilibrium switches", () => {
    const prepared = prepareRuntime(
      ModelData,
      { year_min: 1900, year_max: 2000, dt: 50, output_variables: ["io"] },
      tables,
    );
    const fioacvLookup = prepared.lookupLibrary.get("FIOACV");
    expect(fioacvLookup).toBeDefined();

    const definition = createFioacDerivedDefinition(
      {
        fioac1: 0.43,
        fioac2: 0.5,
        iopcd: 100,
        iet: 1950,
      },
      fioacvLookup!,
      1975,
    );

    expect(
      definition.derive({
        index: 0,
        time: 1900,
        values: { iopc: 100 },
      }),
    ).toBeCloseTo(0.43, 8);
    expect(
      definition.derive({
        index: 1,
        time: 2000,
        values: { iopc: 100 },
      }),
    ).toBeCloseTo(0.4, 8);
  });

  test("derives isopc with a policy-year switch", () => {
    const prepared = prepareRuntime(
      ModelData,
      { year_min: 1900, year_max: 2000, dt: 50, output_variables: ["io"] },
      tables,
    );
    const isopc1Lookup = prepared.lookupLibrary.get("ISOPC1");
    const isopc2Lookup = prepared.lookupLibrary.get("ISOPC2");
    expect(isopc1Lookup).toBeDefined();
    expect(isopc2Lookup).toBeDefined();

    const definition = createIsopcDerivedDefinition(
      isopc1Lookup!,
      isopc2Lookup!,
      1975,
    );

    expect(
      definition.derive({
        index: 0,
        time: 1900,
        values: { iopc: 100 },
      }),
    ).toBeCloseTo(20, 8);
    expect(
      definition.derive({
        index: 1,
        time: 2000,
        values: { iopc: 100 },
      }),
    ).toBeCloseTo(25, 8);
  });

  test("derives fioas with isopc support and a policy-year switch", () => {
    const prepared = prepareRuntime(
      ModelData,
      { year_min: 1900, year_max: 2000, dt: 50, output_variables: ["so"] },
      tables,
    );
    const fioas1Lookup = prepared.lookupLibrary.get("FIOAS1");
    const fioas2Lookup = prepared.lookupLibrary.get("FIOAS2");
    expect(fioas1Lookup).toBeDefined();
    expect(fioas2Lookup).toBeDefined();

    const definition = createFioasDerivedDefinition(
      fioas1Lookup!,
      fioas2Lookup!,
      1975,
    );

    expect(
      definition.derive({
        index: 0,
        time: 1900,
        values: {
          sopc: 40,
          [CAPITAL_HIDDEN_SERIES.isopc]: 20,
        },
      }),
    ).toBeCloseTo(0.4, 8);
    expect(
      definition.derive({
        index: 1,
        time: 2000,
        values: {
          sopc: 40,
          [CAPITAL_HIDDEN_SERIES.isopc]: 20,
        },
      }),
    ).toBeCloseTo(0.45, 8);
  });

  test("derives alic and alsc from lifetime constants", () => {
    expect(
      createAlicDerivedDefinition(fixture.constants_used).derive({
        index: 0,
        time: 1900,
        values: {},
      }),
    ).toBe(14);
    expect(
      createAlscDerivedDefinition(fixture.constants_used).derive({
        index: 0,
        time: 1900,
        values: {},
      }),
    ).toBe(20);
  });

  test("derives fioai from fioaa, fioas, and fioac", () => {
    const definition = createFioaiDerivedDefinition();

    expect(
      definition.derive({
        index: 0,
        time: 1900,
        values: {
          fioaa: 0.1,
          [CAPITAL_HIDDEN_SERIES.fioas]: 0.4,
          [CAPITAL_HIDDEN_SERIES.fioac]: 0.43,
        },
      }),
    ).toBeCloseTo(0.07, 8);
  });

  test("derives scir from io and fioas", () => {
    const definition = createScirDerivedDefinition();

    expect(
      definition.derive({
        index: 0,
        time: 1900,
        values: {
          io: 40,
          [CAPITAL_HIDDEN_SERIES.fioas]: 0.4,
        },
      }),
    ).toBeCloseTo(16, 8);
  });

  test("derives icir from io and fioai", () => {
    const definition = createIcirDerivedDefinition();

    expect(
      definition.derive({
        index: 0,
        time: 1900,
        values: {
          io: 40,
          [CAPITAL_HIDDEN_SERIES.fioai]: 0.07,
        },
      }),
    ).toBeCloseTo(2.8, 8);
  });

  test("derives icdr from ic and alic", () => {
    const definition = createIcdrDerivedDefinition();

    expect(
      definition.derive({
        index: 0,
        time: 1900,
        values: {
          [CAPITAL_HIDDEN_SERIES.ic]: 210,
          [CAPITAL_HIDDEN_SERIES.alic]: 14,
        },
      }),
    ).toBeCloseTo(15, 8);
  });

  test("derives scdr from sc and alsc", () => {
    const definition = createScdrDerivedDefinition();

    expect(
      definition.derive({
        index: 0,
        time: 1900,
        values: {
          [CAPITAL_HIDDEN_SERIES.sc]: 144,
          [CAPITAL_HIDDEN_SERIES.alsc]: 20,
        },
      }),
    ).toBeCloseTo(7.2, 8);
  });

  test("populates hidden capital allocation support series when lookups are available", () => {
    const prepared = prepareRuntime(
      ModelData,
      { year_min: 1900, year_max: 2000, dt: 50, output_variables: ["so", "iopc"] },
      tables,
    );
    const sourceSeries = new Map<string, Float64Array>([
      ["fioaa", Float64Array.from([0.1, 0.1, 0.1])],
      ["iopc", Float64Array.from([100, 100, 100])],
      ["sopc", Float64Array.from([40, 40, 40])],
      ["pop", Float64Array.from([10, 10, 10])],
    ]);
    const sourceFrame: RuntimeStateFrame = {
      request: prepared.request,
      time: Float64Array.from(prepared.time),
      constantsUsed: fixture.constants_used,
      series: sourceSeries,
    };

    populateCapitalNativeSupportSeries(
      sourceFrame,
      sourceSeries,
      prepared,
      fixture.constants_used,
      true,
      true,
      false,
    );

    expect(Array.from(sourceSeries.get(CAPITAL_HIDDEN_SERIES.fioac) ?? [])).toEqual([
      0.43,
      0.43,
      0.4,
    ]);
    expect(Array.from(sourceSeries.get(CAPITAL_HIDDEN_SERIES.isopc) ?? [])).toEqual([
      20,
      20,
      25,
    ]);
    const fioas = Array.from(sourceSeries.get(CAPITAL_HIDDEN_SERIES.fioas) ?? []);
    expect(fioas[0]).toBeCloseTo(0.4, 8);
    expect(fioas[1]).toBeCloseTo(0.4, 8);
    expect(fioas[2]).toBeCloseTo(0.41, 8);
    const fioai = Array.from(sourceSeries.get(CAPITAL_HIDDEN_SERIES.fioai) ?? []);
    expect(fioai[0]).toBeCloseTo(0.07, 8);
    expect(fioai[1]).toBeCloseTo(0.07, 8);
    expect(fioai[2]).toBeCloseTo(0.09, 8);
    const scir = Array.from(sourceSeries.get(CAPITAL_HIDDEN_SERIES.scir) ?? []);
    expect(scir[0]).toBeCloseTo(400, 8);
    expect(scir[1]).toBeCloseTo(400, 8);
    expect(scir[2]).toBeCloseTo(410, 8);
    const icir = Array.from(sourceSeries.get(CAPITAL_HIDDEN_SERIES.icir) ?? []);
    expect(icir[0]).toBeCloseTo(70, 8);
    expect(icir[1]).toBeCloseTo(70, 8);
    expect(icir[2]).toBeCloseTo(90, 8);
  });

  test("populates hidden capital stock support series when investment support is available", () => {
    const prepared = prepareRuntime(
      ModelData,
      { year_min: 1900, year_max: 1902, dt: 1, output_variables: ["so", "iopc"] },
      tables,
    );
    const sourceSeries = new Map<string, Float64Array>([
      ["fioaa", Float64Array.from([0.1, 0.1, 0.1])],
      ["iopc", Float64Array.from([100, 100, 100])],
      ["sopc", Float64Array.from([40, 40, 40])],
      ["pop", Float64Array.from([10, 10, 10])],
    ]);
    const sourceFrame: RuntimeStateFrame = {
      request: prepared.request,
      time: Float64Array.from(prepared.time),
      constantsUsed: fixture.constants_used,
      series: sourceSeries,
    };

    populateCapitalNativeSupportSeries(
      sourceFrame,
      sourceSeries,
      prepared,
      fixture.constants_used,
      true,
      true,
      true,
    );

    expect(Array.from(sourceSeries.get(CAPITAL_HIDDEN_SERIES.alic) ?? [])).toEqual([
      14,
      14,
      14,
    ]);
    expect(Array.from(sourceSeries.get(CAPITAL_HIDDEN_SERIES.alsc) ?? [])).toEqual([
      20,
      20,
      20,
    ]);
    const ic = Array.from(sourceSeries.get(CAPITAL_HIDDEN_SERIES.ic) ?? []);
    expect(ic[0]).toBeCloseTo(210, 8);
    expect(ic[1]).toBeCloseTo(265, 8);
    expect(ic[2]).toBeCloseTo(316.07142857, 8);
    const sc = Array.from(sourceSeries.get(CAPITAL_HIDDEN_SERIES.sc) ?? []);
    expect(sc[0]).toBeCloseTo(144, 8);
    expect(sc[1]).toBeCloseTo(536.8, 8);
    expect(sc[2]).toBeCloseTo(909.96, 8);
    const icdr = Array.from(sourceSeries.get(CAPITAL_HIDDEN_SERIES.icdr) ?? []);
    expect(icdr[0]).toBeCloseTo(15, 8);
    expect(icdr[1]).toBeCloseTo(18.92857143, 8);
    expect(icdr[2]).toBeCloseTo(22.57653061, 8);
    const scdr = Array.from(sourceSeries.get(CAPITAL_HIDDEN_SERIES.scdr) ?? []);
    expect(scdr[0]).toBeCloseTo(7.2, 8);
    expect(scdr[1]).toBeCloseTo(26.84, 8);
    expect(scdr[2]).toBeCloseTo(45.498, 8);
  });

  test("populates io natively when source variables are present", () => {
    const prepared = prepareRuntime(
      ModelData,
      { year_min: 1900, year_max: 1902, dt: 1, output_variables: ["io"] },
      [],
    );
    const sourceFrame: RuntimeStateFrame = {
      request: prepared.request,
      time: Float64Array.from(prepared.time),
      constantsUsed: fixture.constants_used,
      series: new Map([
        ["pop", Float64Array.from([10, 14, 18])],
        ["iopc", Float64Array.from([1, 2, 3])],
      ]),
    };
    const series = new Map<string, Float64Array>();

    const handled = maybePopulateCapitalOutputSeries(
      "io",
      sourceFrame,
      series,
      fixture,
      [0, 2, 4],
      prepared,
      {
        canDeriveIo: true,
        canDeriveIopc: false,
        canDeriveSo: false,
        canDeriveSopc: false,
      },
    );

    expect(handled).toBe(true);
    expect(Array.from(series.get("io") ?? [])).toEqual([10, 28, 54]);
  });

  test("populates iopc natively when source variables are present", () => {
    const prepared = prepareRuntime(
      ModelData,
      { year_min: 1900, year_max: 1902, dt: 1, output_variables: ["iopc"] },
      [],
    );
    const sourceFrame: RuntimeStateFrame = {
      request: prepared.request,
      time: Float64Array.from(prepared.time),
      constantsUsed: fixture.constants_used,
      series: new Map([
        ["pop", Float64Array.from([10, 14, 18])],
        ["io", Float64Array.from([10, 28, 54])],
      ]),
    };
    const series = new Map<string, Float64Array>();

    const handled = maybePopulateCapitalOutputSeries(
      "iopc",
      sourceFrame,
      series,
      fixture,
      [0, 2, 4],
      prepared,
      {
        canDeriveIo: false,
        canDeriveIopc: true,
        canDeriveSo: false,
        canDeriveSopc: false,
      },
    );

    expect(handled).toBe(true);
    expect(Array.from(series.get("iopc") ?? [])).toEqual([1, 2, 3]);
  });

  test("populates so natively when source variables are present", () => {
    const prepared = prepareRuntime(
      ModelData,
      { year_min: 1900, year_max: 1902, dt: 1, output_variables: ["so"] },
      [],
    );
    const sourceFrame: RuntimeStateFrame = {
      request: prepared.request,
      time: Float64Array.from(prepared.time),
      constantsUsed: fixture.constants_used,
      series: new Map([
        ["pop", Float64Array.from([10, 14, 18])],
        ["sopc", Float64Array.from([4, 6, 8])],
      ]),
    };
    const series = new Map<string, Float64Array>();

    const handled = maybePopulateCapitalOutputSeries(
      "so",
      sourceFrame,
      series,
      fixture,
      [0, 2, 4],
      prepared,
      {
        canDeriveIo: false,
        canDeriveIopc: false,
        canDeriveSo: true,
        canDeriveSopc: false,
      },
    );

    expect(handled).toBe(true);
    expect(Array.from(series.get("so") ?? [])).toEqual([40, 84, 144]);
  });

  test("populates sopc natively when source variables are present", () => {
    const prepared = prepareRuntime(
      ModelData,
      { year_min: 1900, year_max: 1902, dt: 1, output_variables: ["sopc"] },
      [],
    );
    const sourceFrame: RuntimeStateFrame = {
      request: prepared.request,
      time: Float64Array.from(prepared.time),
      constantsUsed: fixture.constants_used,
      series: new Map([
        ["pop", Float64Array.from([10, 14, 18])],
        ["so", Float64Array.from([40, 84, 144])],
      ]),
    };
    const series = new Map<string, Float64Array>();

    const handled = maybePopulateCapitalOutputSeries(
      "sopc",
      sourceFrame,
      series,
      fixture,
      [0, 2, 4],
      prepared,
      {
        canDeriveIo: false,
        canDeriveIopc: false,
        canDeriveSo: false,
        canDeriveSopc: true,
      },
    );

    expect(handled).toBe(true);
    expect(Array.from(series.get("sopc") ?? [])).toEqual([4, 6, 8]);
  });
});
