import { describe, expect, test, vi } from "vitest";

import { ModelData } from "../ts/model-data.ts";
import {
  LOCAL_PROVIDER_ERROR,
  createLocalSimulationCore,
  createRuntimeBackedLocalSimulationCore,
  hasExplicitOverrides,
} from "../ts/core/index.ts";
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

  test("serves the standard-run fixture without overrides", async () => {
    const loader = vi.fn(async () => fixture);
    const core = createLocalSimulationCore(ModelData, loader);

    await expect(core.simulatePreset("standard-run")).resolves.toEqual(fixture);
    await expect(core.simulate()).resolves.toEqual(fixture);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  test("passes options through to the fixture loader", async () => {
    const loader = vi.fn(async () => fixture);
    const core = createLocalSimulationCore(ModelData, loader);
    const signal = new AbortController().signal;

    await expect(core.simulate(undefined, { signal })).resolves.toEqual(fixture);
    expect(loader).toHaveBeenCalledWith({ signal });
  });

  test("rejects unsupported scenarios with a clear message", async () => {
    const core = createLocalSimulationCore(ModelData, async () => fixture);

    await expect(
      core.simulatePreset("doubled-resources"),
    ).rejects.toThrow("Requested preset: doubled-resources");
    await expect(
      core.simulate({ output_variables: ["pop"] }),
    ).rejects.toThrow(LOCAL_PROVIDER_ERROR);
    await expect(
      core.compare(
        { preset: "standard-run" },
        { request: { year_max: 2050 } },
      ),
    ).rejects.toThrow(LOCAL_PROVIDER_ERROR);
  });

  test("rejects local compare requests without a second scenario too", async () => {
    const core = createLocalSimulationCore(ModelData, async () => fixture);

    await expect(
      core.compare({ preset: "standard-run" }),
    ).rejects.toThrow(LOCAL_PROVIDER_ERROR);
  });

  test("can run through the runtime-backed seam for standard-run", async () => {
    const runtime = {
      prepareStandardRun: vi.fn(async () => ({
        request: {},
        outputVariables: ["pop"],
        time: new Float64Array([1900, 1900.5]),
        lookupLibrary: new Map(),
      })),
      simulateStandardRun: vi.fn(async () => fixture),
    };
    const core = createRuntimeBackedLocalSimulationCore(ModelData, runtime);

    await expect(core.simulatePreset("standard-run")).resolves.toEqual(fixture);
    expect(runtime.prepareStandardRun).toHaveBeenCalledTimes(1);
    expect(runtime.simulateStandardRun).toHaveBeenCalledTimes(1);
  });
});
