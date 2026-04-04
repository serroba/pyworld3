import { describe, expect, test, vi } from "vitest";

import { ModelData } from "../ts/model-data.ts";
import {
  createRuntimeBackedLocalSimulationCore,
  hasExplicitOverrides,
} from "../ts/core/local-simulation-core.ts";
import type { SimulationResult } from "../ts/simulation-contracts.ts";

const fixture: SimulationResult = {
  year_min: 1900,
  year_max: 2100,
  dt: 0.5,
  time: [1900, 1900.5],
  constants_used: {},
  series: {
    pop: { name: "pop", values: [1, 2] },
  },
};

describe("local simulation core", () => {
  test("detects explicit overrides consistently", () => {
    expect(hasExplicitOverrides()).toBe(false);
    expect(hasExplicitOverrides({})).toBe(false);
    expect(hasExplicitOverrides({ constants: {} })).toBe(false);
    expect(hasExplicitOverrides({ output_variables: [] })).toBe(false);
    expect(hasExplicitOverrides({ year_max: 2050 })).toBe(true);
    expect(hasExplicitOverrides({ constants: { nri: 2 } })).toBe(true);
  });

  test("can run through the runtime-backed seam for standard-run", async () => {
    const runtime = {
      simulate: vi.fn(async () => fixture),
      simulateStandardRun: vi.fn(async () => fixture),
    };
    const core = createRuntimeBackedLocalSimulationCore(ModelData, runtime);

    await expect(core.simulatePreset("standard-run")).resolves.toEqual(fixture);
    expect(runtime.simulate).toHaveBeenCalledTimes(1);
  });

  test("supports runtime-backed local presets, overrides, and compare", async () => {
    const compareFixture: SimulationResult = {
      ...fixture,
      series: {
        pop: { name: "pop", values: [1, 2] },
        iopc: { name: "iopc", values: [3, 4] },
        fpc: { name: "fpc", values: [5, 6] },
        ppolx: { name: "ppolx", values: [7, 8] },
        nrfr: { name: "nrfr", values: [9, 10] },
        le: { name: "le", values: [11, 12] },
      },
    };
    const runtime = {
      simulate: vi
        .fn()
        .mockResolvedValueOnce(compareFixture)
        .mockResolvedValueOnce(compareFixture)
        .mockResolvedValueOnce(compareFixture)
        .mockResolvedValueOnce({
          ...compareFixture,
          series: {
            ...compareFixture.series,
            pop: { name: "pop", values: [2, 4] },
          },
        }),
      simulateStandardRun: vi.fn(),
    };
    const core = createRuntimeBackedLocalSimulationCore(ModelData, runtime);

    await expect(
      core.simulatePreset("doubled-resources", { output_variables: ["pop"] }),
    ).resolves.toEqual(compareFixture);
    await expect(
      core.simulate({ output_variables: ["pop"], year_max: 2050 }),
    ).resolves.toEqual(compareFixture);
    await expect(
      core.compare(
        { preset: "standard-run" },
        { request: { output_variables: ["pop"], year_max: 2050 } },
      ),
    ).resolves.toEqual({
      scenario_a: "standard-run",
      scenario_b: "Custom",
      results_a: compareFixture,
      results_b: {
        ...compareFixture,
        series: {
          ...compareFixture.series,
          pop: { name: "pop", values: [2, 4] },
        },
      },
      metrics: [
        {
          label: "Population",
          variable: "pop",
          value_a: 2,
          value_b: 4,
          delta_pct: 100,
        },
        {
          label: "Industrial output/cap",
          variable: "iopc",
          value_a: 4,
          value_b: 4,
          delta_pct: 0,
        },
        {
          label: "Food/capita",
          variable: "fpc",
          value_a: 6,
          value_b: 6,
          delta_pct: 0,
        },
        {
          label: "Pollution index",
          variable: "ppolx",
          value_a: 8,
          value_b: 8,
          delta_pct: 0,
        },
        {
          label: "Resources remaining",
          variable: "nrfr",
          value_a: 10,
          value_b: 10,
          delta_pct: 0,
        },
        {
          label: "Life expectancy",
          variable: "le",
          value_a: 12,
          value_b: 12,
          delta_pct: 0,
        },
      ],
    });

    expect(runtime.simulate).toHaveBeenCalledTimes(4);
  });

  test("compare with divergeYear passes base_constants to scenario B", async () => {
    const compareFixture: SimulationResult = {
      ...fixture,
      series: {
        pop: { name: "pop", values: [1, 2] },
        iopc: { name: "iopc", values: [3, 4] },
        fpc: { name: "fpc", values: [5, 6] },
        ppolx: { name: "ppolx", values: [7, 8] },
        nrfr: { name: "nrfr", values: [9, 10] },
        le: { name: "le", values: [11, 12] },
      },
    };
    const runtime = {
      simulate: vi.fn(async () => compareFixture),
      simulateStandardRun: vi.fn(),
    };
    const core = createRuntimeBackedLocalSimulationCore(ModelData, runtime);

    await core.compare(
      { preset: "standard-run" },
      { preset: "comprehensive-policy" },
      2024,
    );

    expect(runtime.simulate).toHaveBeenCalledTimes(2);
    const calls = runtime.simulate.mock.calls as unknown[][];
    const requestB = calls[1]![0] as Record<string, unknown>;
    expect(requestB.diverge_year).toBe(2024);
    expect(requestB.base_constants).toBeDefined();
  });
});
