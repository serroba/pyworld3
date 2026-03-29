import { describe, expect, test } from "vitest";

import { ModelData } from "../ts/model-data.ts";
import {
  AGRICULTURE_HIDDEN_SERIES,
  computePollutionOrderedSeries,
  prepareRuntime,
  RESOURCE_HIDDEN_SERIES,
} from "../ts/core/index.ts";
import type { RawLookupTable, RuntimeStateFrame } from "../ts/core/index.ts";

const tables: RawLookupTable[] = [
  {
    sector: "Pollution",
    "x.name": "PPOLX",
    "x.values": [0, 1],
    "y.name": "AHLM",
    "y.values": [1, 1],
  },
];

describe("pollution-sector", () => {
  test("computes the ordered pollution loop from seed constants and support inputs", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["ppolx", "ppgr"],
      },
      tables,
    );

    const frame: RuntimeStateFrame = {
      request: prepared.request,
      time: prepared.time,
      constantsUsed: {
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
      series: new Map<string, Float64Array>([
        ["pop", Float64Array.from([10, 12, 14])],
        ["al", Float64Array.from([100, 100, 100])],
        [AGRICULTURE_HIDDEN_SERIES.aiph, Float64Array.from([10, 10, 10])],
        [RESOURCE_HIDDEN_SERIES.pcrum, Float64Array.from([2, 2, 2])],
      ]),
    };

    const result = computePollutionOrderedSeries(
      frame,
      prepared,
      frame.constantsUsed,
    );

    expect(Array.from(result.ppgio)).toEqual([
      expect.closeTo(0.4, 8),
      expect.closeTo(0.48, 8),
      expect.closeTo(0.56, 8),
    ]);
    expect(Array.from(result.ppgao)).toEqual([
      expect.closeTo(1, 8),
      expect.closeTo(1, 8),
      expect.closeTo(1, 8),
    ]);
    expect(Array.from(result.ppgr)).toEqual([
      expect.closeTo(1.4, 8),
      expect.closeTo(1.48, 8),
      expect.closeTo(1.56, 8),
    ]);
    expect(Array.from(result.ppapr)).toEqual([
      expect.closeTo(0.21, 8),
      expect.closeTo(0.21, 8),
      expect.closeTo(0.21, 8),
    ]);
    expect(Array.from(result.ppol)).toEqual([
      expect.closeTo(25, 8),
      expect.closeTo(25.03142857142857, 8),
      expect.closeTo(25.062632653061222, 8),
    ]);
    expect(Array.from(result.ppolx)).toEqual([
      expect.closeTo(0.25, 8),
      expect.closeTo(0.2503142857142857, 8),
      expect.closeTo(0.25062632653061223, 8),
    ]);
    expect(Array.from(result.ahl)).toEqual([
      expect.closeTo(100, 8),
      expect.closeTo(100, 8),
      expect.closeTo(100, 8),
    ]);
  });
});
