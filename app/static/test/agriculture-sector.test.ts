import { describe, expect, test } from "vitest";

import { ModelData } from "../ts/model-data.ts";
import {
  AGRICULTURE_HIDDEN_SERIES,
  computeAgricultureOrderedSeries,
  populateAgricultureNativeSupportSeries,
  prepareRuntime,
} from "../ts/core/index.ts";
import type { RuntimeStateFrame, RawLookupTable } from "../ts/core/index.ts";

const tables: RawLookupTable[] = [
  {
    sector: "Agriculture",
    "x.name": "IOPC",
    "x.values": [0, 100, 200],
    "y.name": "IFPC1",
    "y.values": [100, 200, 300],
  },
  {
    sector: "Agriculture",
    "x.name": "IOPC",
    "x.values": [0, 100, 200],
    "y.name": "IFPC2",
    "y.values": [100, 200, 300],
  },
  {
    sector: "Agriculture",
    "x.name": "FPCR",
    "x.values": [0, 1, 2],
    "y.name": "FIOAA1",
    "y.values": [0.1, 0.2, 0.3],
  },
  {
    sector: "Agriculture",
    "x.name": "FPCR",
    "x.values": [0, 1, 2],
    "y.name": "FIOAA2",
    "y.values": [0.1, 0.2, 0.3],
  },
  {
    sector: "Agriculture",
    "x.name": "AIPH",
    "x.values": [0, 20, 40],
    "y.name": "LYMC",
    "y.values": [1, 1.5, 2],
  },
  {
    sector: "Agriculture",
    "x.name": "IOR",
    "x.values": [0, 1, 2],
    "y.name": "LYMAP1",
    "y.values": [1, 1.2, 1.4],
  },
  {
    sector: "Agriculture",
    "x.name": "IOR",
    "x.values": [0, 1, 2],
    "y.name": "LYMAP2",
    "y.values": [1, 1.2, 1.4],
  },
  {
    sector: "Agriculture",
    "x.name": "PALR",
    "x.values": [0, 1],
    "y.name": "DCPH",
    "y.values": [100, 100],
  },
  {
    sector: "Agriculture",
    "x.name": "MPLD/MPAI",
    "x.values": [0, 2],
    "y.name": "FIALD",
    "y.values": [0.5, 0.5],
  },
  {
    sector: "Agriculture",
    "x.name": "AIPH",
    "x.values": [0, 20, 40],
    "y.name": "MLYMC",
    "y.values": [1, 1.5, 2],
  },
  {
    sector: "Agriculture",
    "x.name": "LY/ILF",
    "x.values": [0, 2],
    "y.name": "LLMY1",
    "y.values": [1, 1],
  },
  {
    sector: "Agriculture",
    "x.name": "LY/ILF",
    "x.values": [0, 2],
    "y.name": "LLMY2",
    "y.values": [1, 1],
  },
  {
    sector: "Agriculture",
    "x.name": "IOPC",
    "x.values": [0, 100, 200],
    "y.name": "UILPC",
    "y.values": [0.1, 0.1, 0.1],
  },
  {
    sector: "Agriculture",
    "x.name": "PPOLX",
    "x.values": [0, 1],
    "y.name": "LFDR",
    "y.values": [0.1, 0.1],
  },
  {
    sector: "Agriculture",
    "x.name": "FALM",
    "x.values": [0, 1],
    "y.name": "LFRT",
    "y.values": [2, 2],
  },
  {
    sector: "Agriculture",
    "x.name": "PFR",
    "x.values": [0, 2],
    "y.name": "FALM",
    "y.values": [0.2, 0.2],
  },
];

describe("agriculture-sector", () => {
  test("populates native productivity, food, and allocation support", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1901,
        dt: 1,
        output_variables: ["ly", "fpc", "fioaa", "tai"],
      },
      tables,
    );

    const sourceSeries = new Map<string, Float64Array>([
      ["al", Float64Array.from([10, 12])],
      ["pop", Float64Array.from([10, 12])],
      ["io", Float64Array.from([1000, 1100])],
      ["iopc", Float64Array.from([100, 110])],
      ["ai", Float64Array.from([200, 240])],
      ["falm", Float64Array.from([0.2, 0.25])],
      ["lfert", Float64Array.from([600, 620])],
    ]);

    const frame: RuntimeStateFrame = {
      request: prepared.request,
      time: prepared.time,
      constantsUsed: { lfh: 0.7, pl: 0.1, io70: 1000, lyf1: 1, lyf2: 1 },
      series: sourceSeries,
    };

    populateAgricultureNativeSupportSeries(
      frame,
      sourceSeries,
      prepared,
      frame.constantsUsed,
      true,
      true,
      true,
    );

    expect(Array.from(sourceSeries.get(AGRICULTURE_HIDDEN_SERIES.aiph) ?? [])).toEqual(
      expect.arrayContaining([16, expect.closeTo(15, 10)]),
    );
    expect(Array.from(sourceSeries.get(AGRICULTURE_HIDDEN_SERIES.lymc) ?? [])).toEqual(
      expect.arrayContaining([1.4, expect.closeTo(1.375, 10)]),
    );
    expect(Array.from(sourceSeries.get(AGRICULTURE_HIDDEN_SERIES.lymap) ?? [])).toEqual(
      expect.arrayContaining([1.2, expect.closeTo(1.22, 10)]),
    );
    expect(Array.from(sourceSeries.get(AGRICULTURE_HIDDEN_SERIES.lyf) ?? [])).toEqual([1, 1]);
    expect(Array.from(sourceSeries.get("ly") ?? [])).toEqual(
      expect.arrayContaining([1008, expect.closeTo(1040.05, 10)]),
    );
    expect(Array.from(sourceSeries.get("f") ?? [])).toEqual(
      expect.arrayContaining([expect.closeTo(6350.4, 10), expect.closeTo(7862.778, 10)]),
    );
    expect(Array.from(sourceSeries.get("fpc") ?? [])).toEqual(
      expect.arrayContaining([expect.closeTo(635.04, 10), expect.closeTo(655.2315, 10)]),
    );
    expect(Array.from(sourceSeries.get(AGRICULTURE_HIDDEN_SERIES.ifpc) ?? [])).toEqual([200, 210]);
    expect(Array.from(sourceSeries.get("fioaa") ?? [])).toEqual(
      expect.arrayContaining([expect.closeTo(0.3, 10), expect.closeTo(0.3, 10)]),
    );
    expect(Array.from(sourceSeries.get("tai") ?? [])).toEqual(
      expect.arrayContaining([300, expect.closeTo(330, 10)]),
    );
  });

  test("computes the ordered agriculture loop from state seeds and exogenous inputs", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["al", "fpc", "ly"],
      },
      tables,
    );

    const frame: RuntimeStateFrame = {
      request: prepared.request,
      time: prepared.time,
      constantsUsed: {
        ali: 100,
        pali: 200,
        uili: 10,
        lferti: 50,
        palt: 200,
        uildt: 10,
        alln: 100,
        ilf: 100,
        lfh: 0.7,
        pl: 0.1,
        sfpc: 100,
        fspd: 2,
        sd: 1,
        alai1: 2,
        alai2: 2,
        io70: 1000,
        lyf1: 1,
        lyf2: 1,
      },
      series: new Map<string, Float64Array>([
        ["pop", Float64Array.from([10, 12, 14])],
        ["iopc", Float64Array.from([100, 110, 120])],
        ["ppolx", Float64Array.from([0.5, 0.5, 0.5])],
      ]),
    };

    const result = computeAgricultureOrderedSeries(
      frame,
      prepared,
      frame.constantsUsed,
    );

    expect(Array.from(result.al)).toEqual([
      expect.closeTo(100, 8),
      expect.closeTo(100.47283661196613, 8),
      expect.closeTo(101.44810824584647, 8),
    ]);
    expect(Array.from(result.ly)).toEqual([
      expect.closeTo(61.76740393435786, 8),
      expect.closeTo(89.77703298743377, 8),
      expect.closeTo(106.99831835807024, 8),
    ]);
    expect(Array.from(result.fpc)).toEqual([
      expect.closeTo(389.1346447864545, 8),
      expect.closeTo(473.5580412598101, 8),
      expect.closeTo(488.46496423108727, 8),
    ]);
    expect(Array.from(result[AGRICULTURE_HIDDEN_SERIES.lfert])).toEqual([
      expect.closeTo(50, 8),
      expect.closeTo(70, 8),
      expect.closeTo(78, 8),
    ]);
    expect(Array.from(result[AGRICULTURE_HIDDEN_SERIES.pal])).toEqual([
      expect.closeTo(200, 8),
      expect.closeTo(198.52716338803387, 8),
      expect.closeTo(196.54716338803388, 8),
    ]);
  });
});
