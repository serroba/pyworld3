import { describe, expect, test } from "vitest";

import {
  createFioacDerivedDefinition,
  createIoDerivedDefinition,
  createIopcDerivedDefinition,
  createIsopcDerivedDefinition,
  extendCapitalSourceVariables,
  maybePopulateCapitalOutputSeries,
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
];

const fixture: SimulationResult = {
  year_min: 1900,
  year_max: 1902,
  dt: 0.5,
  time: [1900, 1900.5, 1901, 1901.5, 1902],
  constants_used: { fioac1: 0.43, fioac2: 0.5, iopcd: 100, iet: 1950 },
  series: {
    pop: { name: "pop", values: [10, 12, 14, 16, 18] },
    iopc: { name: "iopc", values: [1, 1.5, 2, 2.5, 3] },
    io: { name: "io", values: [10, 18, 28, 40, 54] },
  },
};

describe("capital sector core", () => {
  test("extends runtime source requirements for io derivation", () => {
    const sourceVariables = new Set<string>();

    const result = extendCapitalSourceVariables(
      sourceVariables,
      ["io"],
      fixture,
    );

    expect(result).toEqual({ canDeriveIo: true, canDeriveIopc: false });
    expect(Array.from(sourceVariables).sort()).toEqual(["iopc", "pop"]);
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
      { canDeriveIo: true, canDeriveIopc: false },
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
      { canDeriveIo: false, canDeriveIopc: true },
    );

    expect(handled).toBe(true);
    expect(Array.from(series.get("iopc") ?? [])).toEqual([1, 2, 3]);
  });
});
