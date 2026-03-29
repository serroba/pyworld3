import { describe, expect, test, vi } from "vitest";

import {
  applyRuntimeExecutionPlan,
  createRuntimeExecutionPlan,
  prepareRuntime,
  RESOURCE_HIDDEN_SERIES,
  CAPITAL_HIDDEN_SERIES,
} from "../ts/core/index.ts";
import { ModelData } from "../ts/model-data.ts";
import type {
  RawLookupTable,
  RuntimeStateDefinition,
  RuntimeStateFrame,
} from "../ts/core/index.ts";
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
  {
    sector: "Capital",
    "x.name": "LUFD",
    "x.values": [0, 1, 2],
    "y.name": "CUF",
    "y.values": [0, 0.5, 1],
  },
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
  constants_used: {
    nri: 100,
    nruf1: 0.1,
    nruf2: 0.1,
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
    icor1: 3,
    icor2: 3,
    scor1: 1,
    scor2: 1,
  },
  series: {
    nr: { name: "nr", values: [100, 100, 100, 100, 100] },
    fioaa: { name: "fioaa", values: [0.1, 0.1, 0.1, 0.1, 0.1] },
    fcaor: { name: "fcaor", values: [0.2, 0.2, 0.2, 0.2, 0.2] },
    luf: { name: "luf", values: [2, 2, 2, 2, 2] },
    pop: { name: "pop", values: [10, 12, 14, 16, 18] },
  },
};

describe("runtime execution plan", () => {
  test("plans the coupled capital-resource path when both sector capabilities are present", () => {
    const prepared = prepareRuntime(
      ModelData,
      { year_min: 1900, year_max: 1902, dt: 1, output_variables: ["iopc", "nrfr"] },
      tables,
    );

    const plan = createRuntimeExecutionPlan(prepared, fixture);

    expect(plan.canUseNativeNrFlow).toBe(true);
    expect(plan.capitalCapabilities.canUseNativeCapitalOrdering).toBe(true);
    expect(plan.canUseCoupledCapitalResource).toBe(true);
    expect(Array.from(plan.sourceVariables).sort()).toEqual([
      "fcaor",
      "fioaa",
      "luf",
      "nr",
      "pop",
    ]);
  });

  test("applies the coupled execution path without falling back to standalone nr stepping", () => {
    const prepared = prepareRuntime(
      ModelData,
      { year_min: 1900, year_max: 1902, dt: 1, output_variables: ["iopc", "nrfr"] },
      tables,
    );
    const plan = createRuntimeExecutionPlan(prepared, fixture);
    const sourceSeries = new Map<string, Float64Array>([
      ["nr", Float64Array.from([100, 100, 100])],
      ["fioaa", Float64Array.from([0.1, 0.1, 0.1])],
      ["fcaor", Float64Array.from([0.2, 0.2, 0.2])],
      ["luf", Float64Array.from([2, 2, 2])],
      ["pop", Float64Array.from([10, 14, 18])],
    ]);
    const frame: RuntimeStateFrame = {
      request: prepared.request,
      time: Float64Array.from(prepared.time),
      constantsUsed: fixture.constants_used,
      series: sourceSeries,
    };
    const stepNr = vi.fn<(definition: RuntimeStateDefinition) => void>();

    applyRuntimeExecutionPlan(
      frame,
      sourceSeries,
      prepared,
      fixture.constants_used,
      plan,
      stepNr,
      {
        variable: "nr",
        advance: () => 0,
      },
    );

    expect(stepNr).not.toHaveBeenCalled();
    expect(Array.from(sourceSeries.get("nr") ?? [])).toEqual([100, 96, 90.4]);
    expect(Array.from(sourceSeries.get("iopc") ?? [])).toEqual([
      5.6,
      3.8568311688311696,
      2.9158462736956245,
    ]);
    expect(sourceSeries.has(CAPITAL_HIDDEN_SERIES.fioac)).toBe(true);
    expect(sourceSeries.has(RESOURCE_HIDDEN_SERIES.nrRate)).toBe(true);
  });
});
