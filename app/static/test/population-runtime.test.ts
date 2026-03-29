import { describe, expect, test } from "vitest";

import {
  POPULATION_HIDDEN_SERIES,
  populatePopulationBirthNativeSupportSeries,
  populatePopulationNativeSupportSeries,
  prepareRuntime,
} from "../ts/core/index.ts";
import { ModelData } from "../ts/model-data.ts";
import type { RawLookupTable, RuntimeStateFrame } from "../ts/core/index.ts";

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

describe("population runtime core", () => {
  test("populates native life, death, and birth support through the runtime module", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["p1", "b", "cbr", "tf", "pop"],
      },
      tables,
    );
    const sourceSeries = new Map<string, Float64Array>([
      ["pop", Float64Array.from([10, 12, 14])],
      ["p1", Float64Array.from([1, 2, 3])],
      ["p2", Float64Array.from([2, 3, 4])],
      ["p3", Float64Array.from([3, 4, 5])],
      ["p4", Float64Array.from([4, 5, 6])],
      ["fpc", Float64Array.from([230, 276, 322])],
      ["iopc", Float64Array.from([10, 10, 10])],
      ["sopc", Float64Array.from([10, 10, 10])],
      ["ppolx", Float64Array.from([1, 1, 1])],
    ]);
    const constantsUsed = {
      dcfsn: 3.8,
      fcest: 4000,
      hsid: 20,
      ieat: 3,
      iphst: 1940,
      len: 28,
      lpd: 20,
      mtfn: 12,
      pet: 4000,
      rlt: 30,
      sad: 20,
      sfpc: 230,
      zpgt: 4000,
    };
    const sourceFrame: RuntimeStateFrame = {
      request: prepared.request,
      time: Float64Array.from(prepared.time),
      constantsUsed,
      series: sourceSeries,
    };

    populatePopulationNativeSupportSeries(
      sourceFrame,
      sourceSeries,
      prepared,
      constantsUsed,
      true,
      true,
      true,
      false,
      true,
    );
    populatePopulationBirthNativeSupportSeries(
      sourceFrame,
      sourceSeries,
      prepared,
      constantsUsed,
      true,
    );

    expect(Array.from(sourceSeries.get("le") ?? [])).toEqual(
      expect.arrayContaining([expect.any(Number)]),
    );
    expect(Array.from(sourceSeries.get("d") ?? [])).toEqual(
      expect.arrayContaining([expect.any(Number)]),
    );
    expect(Array.from(sourceSeries.get("b") ?? [])).toEqual(
      expect.arrayContaining([expect.any(Number)]),
    );
    expect(Array.from(sourceSeries.get("cbr") ?? [])).toEqual(
      expect.arrayContaining([expect.any(Number)]),
    );
    expect(Array.from(sourceSeries.get("tf") ?? [])).toEqual(
      expect.arrayContaining([expect.any(Number)]),
    );
    expect(sourceSeries.get(POPULATION_HIDDEN_SERIES.aiopc)?.length).toBe(3);
    expect(sourceSeries.get(POPULATION_HIDDEN_SERIES.ple)?.length).toBe(3);
    expect(sourceSeries.get(POPULATION_HIDDEN_SERIES.fcfpc)?.length).toBe(3);
  });
});
