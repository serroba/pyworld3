import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { World3StockKey, World3VariableKey } from "../ts/core/world3-keys.ts";
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

  test("uses default simulation bounds and policy years when omitted", () => {
    const defaulted = simulateWorld3({
      constants: { ...ModelData.constantDefaults },
      rawTables: tables,
    });

    expect(defaulted.year_min).toBe(1900);
    expect(defaulted.year_max).toBe(2100);
    expect(defaulted.dt).toBe(0.5);
    expect(defaulted.time[0]).toBe(1900);
    expect(defaulted.time[defaulted.time.length - 1]).toBe(2100);
    expect(defaulted.constants_used).toEqual(ModelData.constantDefaults);
  });

  test("time array is strictly monotonic with the configured dt", () => {
    for (let index = 1; index < result.time.length; index += 1) {
      expect(result.time[index]! - result.time[index - 1]!).toBeCloseTo(0.5, 10);
    }
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

  test("population equals the sum of its cohort stocks for every timestep", () => {
    const popValues = result.series.pop!.values;
    const p1Values = result.series.p1!.values;
    const p2Values = result.series.p2!.values;
    const p3Values = result.series.p3!.values;
    const p4Values = result.series.p4!.values;

    for (let index = 0; index < result.time.length; index += 1) {
      const cohortSum =
        p1Values[index]! +
        p2Values[index]! +
        p3Values[index]! +
        p4Values[index]!;
      expect(popValues[index]).toBeCloseTo(cohortSum, 6);
    }
  });

  test("resource fraction equals remaining resources divided by initial resources", () => {
    const nrValues = result.series.nr!.values;
    const nrfrValues = result.series.nrfr!.values;
    const nri = ModelData.constantDefaults.nri!;

    for (let index = 0; index < result.time.length; index += 1) {
      expect(nrfrValues[index]).toBeCloseTo(nrValues[index]! / nri, 6);
    }
  });

  test("all exported series are finite and aligned to the time grid", () => {
    for (const series of Object.values(result.series)) {
      expect(series.values.length).toBe(result.time.length);
      for (const value of series.values) {
        expect(Number.isFinite(value)).toBe(true);
      }
    }
  });

  test("core stock series stay non-negative in the standard run", () => {
    const stockNames: World3StockKey[] = [
      "p1",
      "p2",
      "p3",
      "p4",
      "pop",
      "ic",
      "sc",
      "al",
      "uil",
      "lfert",
      "ppol",
      "nr",
    ];
    for (const stockName of stockNames) {
      const values = result.series[stockName]!.values;
      for (const value of values) {
        expect(value).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("ppolx rises from initial low value", () => {
    const ppolxValues = result.series.ppolx!.values;
    const maxPpolx = Math.max(...ppolxValues);
    expect(maxPpolx).toBeGreaterThan(ppolxValues[0]!);
  });

  test("key output series are present", () => {
    const expectedSeries: World3VariableKey[] = [
      "pop",
      "le",
      "iopc",
      "fpc",
      "ppolx",
      "nrfr",
    ];
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

  test("throws when constants are omitted entirely", () => {
    expect(() =>
      simulateWorld3({
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

  test("clamps extreme dt to safe range", () => {
    const r = simulateWorld3({
      dt: 50,
      constants: { ...ModelData.constantDefaults },
      rawTables: tables,
    });
    expect(r.dt).toBe(2);
    expect(r.time.length).toBeGreaterThan(50);
  });

  test("clamps yearMin to at most yearMax - dt", () => {
    const r = simulateWorld3({
      yearMin: 2200,
      yearMax: 2200,
      constants: { ...ModelData.constantDefaults },
      rawTables: tables,
    });
    // yearMin should be clamped below yearMax
    expect(r.year_min).toBeLessThan(r.year_max);
    expect(r.time.length).toBeGreaterThan(0);
  });

  test("clamps yearMax to at least 1950", () => {
    const r = simulateWorld3({
      yearMax: 1800,
      constants: { ...ModelData.constantDefaults },
      rawTables: tables,
    });
    expect(r.year_max).toBe(1950);
    expect(r.time.length).toBeGreaterThan(0);
  });

  test("extreme inputs produce valid series with no NaN", () => {
    const r = simulateWorld3({
      yearMin: 2100,
      yearMax: 2200,
      dt: 0.001,
      constants: { ...ModelData.constantDefaults },
      rawTables: tables,
    });
    // dt=0.001 should be clamped to 0.1
    expect(r.dt).toBe(0.1);
    const pop = r.series.pop!.values;
    expect(pop.some((v) => isNaN(v) || !isFinite(v))).toBe(false);
  });
});
