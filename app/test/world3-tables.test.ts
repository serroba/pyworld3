import { describe, expect, test } from "vitest";

import {
  createLookupInterpolator,
  createLookupLibrary,
  evaluateLookupTable,
  normalizeLookupTable,
  type RawLookupTable,
} from "../ts/core/world3-tables.ts";

const sampleTable: RawLookupTable = {
  sector: "Population",
  "x.name": "LE",
  "x.values": [20, 40, 60],
  "y.name": "M1",
  "y.values": [0.05, 0.03, 0.01],
};

describe("world3 tables", () => {
  test("normalizes raw lookup table rows", () => {
    expect(normalizeLookupTable(sampleTable)).toEqual({
      sector: "Population",
      xName: "LE",
      xValues: [20, 40, 60],
      yName: "M1",
      yValues: [0.05, 0.03, 0.01],
    });
  });

  test("rejects malformed lookup tables", () => {
    expect(() =>
      normalizeLookupTable({
        ...sampleTable,
        "y.values": [0.05],
      }),
    ).toThrow("must have matching x/y lengths");
    expect(() =>
      normalizeLookupTable({
        ...sampleTable,
        "x.values": [],
        "y.values": [],
      }),
    ).toThrow("cannot be empty");
  });

  test("clamps and linearly interpolates table values", () => {
    const table = normalizeLookupTable(sampleTable);

    expect(evaluateLookupTable(table, 10)).toBe(0.05);
    expect(evaluateLookupTable(table, 20)).toBe(0.05);
    expect(evaluateLookupTable(table, 30)).toBeCloseTo(0.04, 8);
    expect(evaluateLookupTable(table, 50)).toBeCloseTo(0.02, 8);
    expect(evaluateLookupTable(table, 80)).toBe(0.01);
  });

  test("creates reusable lookup interpolators and libraries", () => {
    const table = normalizeLookupTable(sampleTable);
    const interpolator = createLookupInterpolator(table);
    const library = createLookupLibrary([
      sampleTable,
      {
        sector: "Resources",
        "x.name": "NRFR",
        "x.values": [0, 1],
        "y.name": "FCAOR1",
        "y.values": [1, 0],
      },
    ]);

    expect(interpolator.evaluate(30)).toBeCloseTo(0.04, 8);
    expect(library.get("M1")?.evaluate(30)).toBeCloseTo(0.04, 8);
    expect(library.get("FCAOR1")?.evaluate(0.25)).toBeCloseTo(0.75, 8);
  });

  test("evaluates clamped values exactly at boundary points", () => {
    const table = normalizeLookupTable(sampleTable);

    expect(evaluateLookupTable(table, 20)).toBe(0.05);
    expect(evaluateLookupTable(table, 60)).toBe(0.01);
  });

  test("creates a lookup library from an empty array", () => {
    const library = createLookupLibrary([]);
    expect(library.size).toBe(0);
  });

  test("uses the last entry when duplicate yNames are registered in a library", () => {
    const duplicate: RawLookupTable = {
      sector: "Other",
      "x.name": "LE",
      "x.values": [0, 1],
      "y.name": "M1",
      "y.values": [100, 200],
    };
    const library = createLookupLibrary([sampleTable, duplicate]);

    // duplicate was inserted last, so M1 should resolve to the duplicate table
    expect(library.get("M1")?.evaluate(0.5)).toBeCloseTo(150, 5);
  });
});
