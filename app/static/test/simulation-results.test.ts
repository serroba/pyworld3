import { describe, expect, test } from "vitest";

import { projectSimulationResult, prepareRuntime } from "../ts/core/index.ts";
import { ModelData } from "../ts/model-data.ts";
import type { RawLookupTable } from "../ts/core/index.ts";
import type { SimulationResult } from "../ts/simulation-contracts.ts";

const tables: RawLookupTable[] = [
  {
    sector: "Population",
    "x.name": "LE",
    "x.values": [20, 40],
    "y.name": "M1",
    "y.values": [0.05, 0.03],
  },
];

const fixture: SimulationResult = {
  year_min: 1900,
  year_max: 1902,
  dt: 0.5,
  time: [1900, 1900.5, 1901, 1901.5, 1902],
  constants_used: { nri: 2_000_000_000_000 },
  series: {
    pop: { name: "pop", values: [10, 12, 14, 16, 18] },
    nr: { name: "nr", values: [100, 95, 90, 85, 80] },
    nrfr: { name: "nrfr", values: [9, 9, 9, 9, 9] },
  },
};

describe("simulation result projection", () => {
  test("projects a fixture onto the prepared time grid and output set", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["pop"],
        constants: { nri: 123, fioaa: 7 },
      },
      tables,
    );

    expect(projectSimulationResult(prepared, fixture)).toEqual({
      year_min: 1900,
      year_max: 1902,
      dt: 1,
      time: [1900, 1901, 1902],
      constants_used: { nri: 123, fioaa: 7 },
      series: {
        pop: { name: "pop", values: [10, 14, 18] },
      },
    });
  });

  test("fails clearly when a requested variable is not present in the fixture", () => {
    const prepared = prepareRuntime(
      ModelData,
      { year_min: 1900, year_max: 1902, dt: 0.5, output_variables: ["fpc"] },
      tables,
    );

    expect(() => projectSimulationResult(prepared, fixture)).toThrow(
      "missing the requested output variable 'fpc'",
    );
  });

  test("fails clearly when the requested grid cannot be projected from the fixture", () => {
    const prepared = prepareRuntime(
      ModelData,
      { year_min: 1900, year_max: 1901, dt: 0.3, output_variables: ["pop"] },
      tables,
    );

    expect(() => projectSimulationResult(prepared, fixture)).toThrow(
      "cannot project year 1900.3",
    );
  });

  test("derives nrfr natively from nr and resolved nri", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["nrfr"],
        constants: { nri: 100 },
      },
      tables,
    );

    expect(projectSimulationResult(prepared, fixture)).toEqual({
      year_min: 1900,
      year_max: 1902,
      dt: 1,
      time: [1900, 1901, 1902],
      constants_used: { nri: 100 },
      series: {
        nrfr: { name: "nrfr", values: [1, 0.9, 0.8] },
      },
    });
  });

  test("fails clearly when nrfr is requested but nr is unavailable", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["nrfr"],
      },
      tables,
    );
    const fixtureWithoutNr = {
      ...fixture,
      series: {
        pop: fixture.series.pop!,
      },
    } satisfies SimulationResult;

    expect(() => projectSimulationResult(prepared, fixtureWithoutNr)).toThrow(
      "cannot derive 'nrfr' because the source variable 'nr' is missing",
    );
  });
});
