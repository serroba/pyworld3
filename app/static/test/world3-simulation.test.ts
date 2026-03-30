import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { simulateWorld3 } from "../ts/core/world3-simulation.ts";
import type { RawLookupTable } from "../ts/core/world3-tables.ts";
import { ModelData } from "../ts/model-data.ts";

function loadTables(): RawLookupTable[] {
  const raw = readFileSync(
    resolve(__dirname, "../data/functions-table-world3.json"),
    "utf-8",
  );
  return JSON.parse(raw) as RawLookupTable[];
}

describe("World3 coupled simulation", () => {
  const tables = loadTables();

  const result = simulateWorld3({
    yearMin: 1900,
    yearMax: 2100,
    dt: 0.5,
    constants: { ...ModelData.constantDefaults },
    rawTables: tables,
  });

  test("time array covers the expected range", () => {
    expect(result.time[0]).toBe(1900);
    expect(result.time[result.time.length - 1]).toBe(2100);
    expect(result.time.length).toBe(401);
  });

  test("population starts at sum of p1i-p4i", () => {
    const expected =
      ModelData.constantDefaults.p1i! +
      ModelData.constantDefaults.p2i! +
      ModelData.constantDefaults.p3i! +
      ModelData.constantDefaults.p4i!;
    expect(result.series.pop!.values[0]).toBeCloseTo(expected, 0);
  });

  test("nrfr starts at 1.0", () => {
    expect(result.series.nrfr!.values[0]).toBeCloseTo(1.0, 5);
  });

  test("population peaks and declines (standard run dynamics)", () => {
    const popValues = result.series.pop!.values;
    const maxPop = Math.max(...popValues);
    const finalPop = popValues[popValues.length - 1]!;
    // Population should peak then decline in the standard run
    expect(maxPop).toBeGreaterThan(finalPop);
    // Peak should be in the billions
    expect(maxPop).toBeGreaterThan(1e9);
  });

  test("nrfr declines over the simulation", () => {
    const nrfrValues = result.series.nrfr!.values;
    expect(nrfrValues[0]).toBeGreaterThan(nrfrValues[nrfrValues.length - 1]!);
  });

  test("ppolx rises from initial low value", () => {
    const ppolxValues = result.series.ppolx!.values;
    const maxPpolx = Math.max(...ppolxValues);
    expect(maxPpolx).toBeGreaterThan(ppolxValues[0]!);
  });

  test("key output series are present", () => {
    const expectedSeries = ["pop", "le", "iopc", "fpc", "ppolx", "nrfr"];
    for (const name of expectedSeries) {
      expect(result.series[name]).toBeDefined();
      expect(result.series[name]!.values.length).toBe(result.time.length);
    }
  });

  test("throws when a required lookup table is missing", () => {
    expect(() =>
      simulateWorld3({
        yearMin: 1900,
        yearMax: 1901,
        dt: 1,
        constants: { ...ModelData.constantDefaults },
        rawTables: [],
      }),
    ).toThrow("Missing lookup table");
  });

  test("throws when a required constant is missing", () => {
    const incompleteConstants = { ...ModelData.constantDefaults };
    delete (incompleteConstants as Record<string, unknown>).nri;
    expect(() =>
      simulateWorld3({
        yearMin: 1900,
        yearMax: 1901,
        dt: 1,
        constants: incompleteConstants,
        rawTables: tables,
      }),
    ).toThrow("Missing constant");
  });

  test("overriding constants produces different results", () => {
    const modified = simulateWorld3({
      yearMin: 1900,
      yearMax: 2100,
      dt: 0.5,
      constants: { ...ModelData.constantDefaults, len: 40 },
      rawTables: tables,
    });
    const baseLE = result.series.le!.values;
    const modLE = modified.series.le!.values;
    expect(modLE[200]).not.toBeCloseTo(baseLE[200]!, 1);
  });
});
