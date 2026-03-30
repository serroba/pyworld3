import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { simulateWorld3 } from "../ts/core/world3-simulation.ts";
import type { RawLookupTable } from "../ts/core/world3-tables.ts";
import type { SimulationResult } from "../ts/simulation-contracts.ts";
import { ModelData } from "../ts/model-data.ts";

function loadFixture(): SimulationResult {
  const raw = readFileSync(
    resolve(__dirname, "../data/standard-run-explore.json"),
    "utf-8",
  );
  return JSON.parse(raw) as SimulationResult;
}

function loadTables(): RawLookupTable[] {
  const raw = readFileSync(
    resolve(__dirname, "../data/functions-table-world3.json"),
    "utf-8",
  );
  return JSON.parse(raw) as RawLookupTable[];
}

function maxRelativeError(
  actual: number[],
  expected: number[],
  label: string,
): number {
  let maxErr = 0;
  for (let i = 0; i < expected.length; i++) {
    const exp = expected[i]!;
    const act = actual[i]!;
    if (Math.abs(exp) < 1e-10) {
      // Skip near-zero reference values to avoid division issues
      continue;
    }
    const relErr = Math.abs((act - exp) / exp);
    if (relErr > maxErr) {
      maxErr = relErr;
    }
  }
  return maxErr;
}

describe("World3 coupled simulation", () => {
  const tables = loadTables();
  const fixture = loadFixture();

  const result = simulateWorld3({
    yearMin: 1900,
    yearMax: 2100,
    dt: 0.5,
    constants: { ...ModelData.constantDefaults },
    rawTables: tables,
  });

  const variables = ["pop", "le", "iopc", "fpc", "ppolx", "nrfr"] as const;

  for (const varName of variables) {
    test(`${varName} matches fixture within 10% relative error`, () => {
      const fixtureSeries = fixture.series[varName];
      const resultSeries = result.series[varName];

      expect(fixtureSeries).toBeDefined();
      expect(resultSeries).toBeDefined();
      expect(resultSeries!.values.length).toBe(fixtureSeries!.values.length);

      const err = maxRelativeError(
        resultSeries!.values,
        fixtureSeries!.values,
        varName,
      );
      expect(err).toBeLessThan(0.10);
    });
  }

  test("time array matches fixture", () => {
    expect(result.time.length).toBe(fixture.time.length);
    expect(result.time[0]).toBe(fixture.time[0]);
    expect(result.time[result.time.length - 1]).toBe(
      fixture.time[fixture.time.length - 1],
    );
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
