import { describe, expect, test } from "vitest";

import { createValidationCore, validateSimulationResult } from "../ts/core/validation-core.ts";
import type { SimulationResult } from "../ts/simulation-contracts.ts";

const simulationResult: SimulationResult = {
  year_min: 1960,
  year_max: 2020,
  dt: 10,
  time: [1960, 1970, 1980, 1990, 2000, 2010, 2020],
  constants_used: {},
  series: {
    pop: {
      name: "pop",
      values: [3.0e9, 3.7e9, 4.4e9, 5.3e9, 6.1e9, 6.9e9, 7.8e9],
    },
    le: {
      name: "le",
      values: [52.6, 58.8, 63.0, 65.4, 67.7, 70.6, 72.7],
    },
    cbr: {
      name: "cbr",
      values: [34.9, 32.5, 28.3, 26.0, 21.5, 19.4, 17.9],
    },
    cdr: {
      name: "cdr",
      values: [17.7, 12.4, 10.7, 9.4, 8.7, 7.9, 7.6],
    },
  },
};

const validationData = {
  entity: "World",
  indicators: {
    pop_total: {
      years: [1960, 1970, 1980, 1990, 2000, 2010, 2020],
      values: [3.0e9, 3.7e9, 4.4e9, 5.3e9, 6.1e9, 6.9e9, 7.8e9],
    },
    life_expectancy: {
      years: [1960, 1970, 1980, 1990, 2000, 2010, 2020],
      values: [52.6, 58.8, 63.0, 65.4, 67.7, 70.6, 72.7],
    },
    crude_birth_rate: {
      years: [1960, 1970, 1980, 1990, 2000, 2010, 2020],
      values: [34.9, 32.5, 28.3, 26.0, 21.5, 19.4, 17.9],
    },
    crude_death_rate: {
      years: [1960, 1970, 1980, 1990, 2000, 2010, 2020],
      values: [17.7, 12.4, 10.7, 9.4, 8.7, 7.9, 7.6],
    },
  },
  warnings: [],
};

describe("validation core", () => {
  test("validates local simulation results against local data", () => {
    const result = validateSimulationResult(simulationResult, validationData, {
      entity: "World",
      variables: ["pop", "le", "cbr", "cdr"],
    });

    const popMetric = result.metrics.pop;
    const leMetric = result.metrics.le;
    const cbrMetric = result.metrics.cbr;
    const cdrMetric = result.metrics.cdr;

    expect(popMetric).toBeDefined();
    expect(leMetric).toBeDefined();
    expect(cbrMetric).toBeDefined();
    expect(cdrMetric).toBeDefined();
    expect(result.entity).toBe("World");
    expect(Object.keys(result.metrics)).toEqual(["pop", "le", "cbr", "cdr"]);
    expect(popMetric?.rmse).toBe(0);
    expect(leMetric?.mape).toBe(0);
    expect(cbrMetric?.correlation).toBeCloseTo(1);
    expect(cdrMetric?.n_points).toBe(7);
  });

  test("validation core loader facade works", async () => {
    const core = createValidationCore(async () => validationData);
    const result = await core.validate(simulationResult, {
      entity: "World",
      variables: ["pop"],
    });

    expect(Object.keys(result.metrics)).toEqual(["pop"]);
    expect(result.metrics.pop).toBeDefined();
    expect(result.metrics.pop?.owid_indicator).toBe("pop_total");
  });

  test("warns when the simulation result does not include a requested variable", () => {
    const result = validateSimulationResult(simulationResult, validationData, {
      entity: "World",
      variables: ["iopc"],
    });

    expect(result.metrics).toEqual({});
    expect(result.warnings).toContain("Skipping iopc: not in simulation output");
    expect(result.overlap_start).toBe(simulationResult.year_min);
    expect(result.overlap_end).toBe(simulationResult.year_max);
  });

  test("aligns observed points to the actual overlapping simulation range", () => {
    const narrowSimulation: SimulationResult = {
      ...simulationResult,
      year_min: 1980,
      year_max: 2000,
      time: [1980, 1990, 2000],
      series: {
        pop: {
          name: "pop",
          values: [4.4e9, 5.3e9, 6.1e9],
        },
      },
    };

    const result = validateSimulationResult(narrowSimulation, validationData, {
      entity: "World",
      variables: ["pop"],
    });

    expect(result.metrics.pop).toBeDefined();
    expect(result.metrics.pop?.n_points).toBe(3);
    expect(result.metrics.pop?.overlap_years).toEqual([1980, 2000]);
    expect(result.overlap_start).toBe(1980);
    expect(result.overlap_end).toBe(2000);
    expect(result.metrics.pop?.rmse).toBe(0);
  });
});
