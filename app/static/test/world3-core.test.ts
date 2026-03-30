import { describe, expect, test, vi } from "vitest";

import { ModelData } from "../ts/model-data.ts";
import { createWorld3Core } from "../ts/core/index.ts";
import type { RawLookupTable } from "../ts/core/index.ts";
import type { SimulationResult } from "../ts/simulation-contracts.ts";

const fixture: SimulationResult = {
  year_min: 1900,
  year_max: 1901,
  dt: 0.5,
  time: [1900, 1900.5, 1901],
  constants_used: {},
  series: {
    pop: { name: "pop", values: [100, 110, 120] },
    nr: { name: "nr", values: [10, 9, 8] },
    iopc: { name: "iopc", values: [1, 1.5, 2] },
    fpc: { name: "fpc", values: [3, 3.2, 3.4] },
    ppolx: { name: "ppolx", values: [0.1, 0.2, 0.3] },
  },
};

const tables: RawLookupTable[] = [
  {
    sector: "Population",
    "x.name": "LE",
    "x.values": [20, 40],
    "y.name": "M1",
    "y.values": [0.05, 0.03],
  },
];

describe("world3 core facade", () => {
  test("creates a local simulation core from the shared facade", async () => {
    const core = createWorld3Core(
      ModelData,
      async () => tables,
      async () => fixture,
    );

    await expect(
      core.createLocalSimulationCore().simulatePreset("standard-run"),
    ).resolves.toEqual(fixture);
  });

  test("reuses cached runtime resources across summary and svg helpers", async () => {
    const loadTables = vi.fn(async () => tables);
    const loadFixture = vi.fn(async () => fixture);
    const core = createWorld3Core(ModelData, loadTables, loadFixture);

    await expect(core.summarizeStandardRun()).resolves.toContain(
      "World3 Simulation Summary",
    );
    await expect(core.renderStandardRunSvg()).resolves.toContain("<svg");

    expect(loadTables).toHaveBeenCalledTimes(1);
    expect(loadFixture).toHaveBeenCalledTimes(1);
  });

  test("renders the resources curve from nrfr when nr is unavailable", async () => {
    const nrfrFixture = {
      ...fixture,
      series: {
        pop: { name: "pop", values: [100, 110, 120] },
        nrfr: { name: "nrfr", values: [1, 0.9, 0.8] },
        iopc: { name: "iopc", values: [1, 1.5, 2] },
        fpc: { name: "fpc", values: [3, 3.2, 3.4] },
        ppolx: { name: "ppolx", values: [0.1, 0.2, 0.3] },
      },
    } satisfies SimulationResult;
    const core = createWorld3Core(
      ModelData,
      async () => tables,
      async () => nrfrFixture,
    );

    await expect(core.renderStandardRunSvg()).resolves.toContain("Resources");
  });

  test("allows the shared core facade to project aligned standard-run overrides", async () => {
    const alignedFixture = {
      ...fixture,
      year_max: 1902,
      time: [1900, 1900.5, 1901, 1901.5, 1902],
      series: {
        pop: { name: "pop", values: [100, 110, 120, 130, 140] },
        nr: { name: "nr", values: [10, 9, 8, 7, 6] },
      },
    } satisfies SimulationResult;
    const core = createWorld3Core(
      ModelData,
      async () => tables,
      async () => alignedFixture,
    );

    await expect(
      core.simulateStandardRun({
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["pop"],
      }),
    ).resolves.toEqual({
      year_min: 1900,
      year_max: 1902,
      dt: 1,
      time: [1900, 1901, 1902],
      constants_used: {},
      series: {
        pop: { name: "pop", values: [100, 120, 140] },
      },
    });
  });
});
