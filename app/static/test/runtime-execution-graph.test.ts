import { describe, expect, test } from "vitest";

import {
  createRuntimeExecutionGraph,
  createRuntimeExecutionPlan,
  prepareRuntime,
} from "../ts/core/index.ts";
import { ModelData } from "../ts/model-data.ts";
import type { RawLookupTable } from "../ts/core/index.ts";
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

const coupledFixture: SimulationResult = {
  year_min: 1900,
  year_max: 1902,
  dt: 1,
  time: [1900, 1901, 1902],
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
    nr: { name: "nr", values: [100, 100, 100] },
    fioaa: { name: "fioaa", values: [0.1, 0.1, 0.1] },
    fcaor: { name: "fcaor", values: [0.2, 0.2, 0.2] },
    luf: { name: "luf", values: [2, 2, 2] },
    pop: { name: "pop", values: [10, 14, 18] },
  },
};

describe("runtime execution graph", () => {
  test("builds the coupled multi-sector graph when coupled capital-resource execution is available", () => {
    const prepared = prepareRuntime(
      ModelData,
      { year_min: 1900, year_max: 1902, dt: 1, output_variables: ["iopc", "nrfr"] },
      tables,
    );
    const plan = createRuntimeExecutionPlan(prepared, coupledFixture);

    expect(createRuntimeExecutionGraph(plan).map((stage) => stage.id)).toEqual([
      "coupled-capital-resource",
      "agriculture",
      "pollution",
      "population-support",
      "population-birth-support",
    ]);
  });

  test("builds the standalone graph when the coupled path is unavailable", () => {
    const prepared = prepareRuntime(
      ModelData,
      { year_min: 1900, year_max: 1902, dt: 1, output_variables: ["ppolx"] },
      [
        {
          sector: "Pollution",
          "x.name": "PPOLX",
          "x.values": [0, 1],
          "y.name": "AHLM",
          "y.values": [1, 1],
        },
      ],
    );
    const plan = createRuntimeExecutionPlan(prepared, {
      year_min: 1900,
      year_max: 1902,
      dt: 1,
      time: [1900, 1901, 1902],
      constants_used: {
        ppoli: 25,
        ppol70: 100,
        ahl70: 100,
        amti: 1,
        imti: 10,
        imef: 0.1,
        fipm: 0.001,
        frpm: 0.02,
        ppgf1: 1,
        ppgf2: 1,
        pptd1: 20,
        pptd2: 20,
      },
      series: {
        pop: { name: "pop", values: [10, 12, 14] },
        al: { name: "al", values: [100, 100, 100] },
        aiph: { name: "aiph", values: [10, 10, 10] },
        pcrum: { name: "pcrum", values: [2, 2, 2] },
        ppolx: { name: "ppolx", values: [9, 9, 9] },
      },
    });

    expect(createRuntimeExecutionGraph(plan).map((stage) => stage.id)).toEqual([
      "capital",
      "resource",
      "agriculture",
      "pollution",
      "population-support",
      "population-birth-support",
      "resource-stock",
    ]);
  });
});
