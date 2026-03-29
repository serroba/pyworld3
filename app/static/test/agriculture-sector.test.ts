import { describe, expect, test } from "vitest";

import { ModelData } from "../ts/model-data.ts";
import {
  AGRICULTURE_HIDDEN_SERIES,
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
];

describe("agriculture-sector", () => {
  test("populates native food and allocation support", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1901,
        dt: 1,
        output_variables: ["fpc", "fioaa", "tai"],
      },
      tables,
    );

    const sourceSeries = new Map<string, Float64Array>([
      ["al", Float64Array.from([10, 12])],
      ["ly", Float64Array.from([200, 220])],
      ["pop", Float64Array.from([10, 12])],
      ["io", Float64Array.from([1000, 1100])],
      ["iopc", Float64Array.from([100, 110])],
    ]);

    const frame: RuntimeStateFrame = {
      request: prepared.request,
      time: prepared.time,
      constantsUsed: { lfh: 0.7, pl: 0.1 },
      series: sourceSeries,
    };

    populateAgricultureNativeSupportSeries(
      frame,
      sourceSeries,
      prepared,
      frame.constantsUsed,
      true,
      true,
    );

    expect(Array.from(sourceSeries.get("f") ?? [])).toEqual(
      expect.arrayContaining([1260, expect.closeTo(1663.2, 10)]),
    );
    expect(Array.from(sourceSeries.get("fpc") ?? [])).toEqual(
      expect.arrayContaining([126, expect.closeTo(138.6, 10)]),
    );
    expect(Array.from(sourceSeries.get(AGRICULTURE_HIDDEN_SERIES.ifpc) ?? [])).toEqual([200, 210]);
    expect(Array.from(sourceSeries.get("fioaa") ?? [])).toEqual(
      expect.arrayContaining([expect.closeTo(0.163, 10), expect.closeTo(0.166, 10)]),
    );
    expect(Array.from(sourceSeries.get("tai") ?? [])).toEqual(
      expect.arrayContaining([163, expect.closeTo(182.6, 10)]),
    );
  });
});
