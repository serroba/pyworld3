import type {
  ModelDataPayload,
  SimulationRequest,
  SimulationResult,
} from "../simulation-contracts.js";
import { createFixtureBackedRuntime } from "./browser-native-runtime.js";
import {
  createRuntimeBackedLocalSimulationCore,
  type LocalSimulationCore,
} from "./local-simulation-core.js";
import {
  formatSimulationSummary,
  renderSimulationSvg,
} from "./simulation-artifacts.js";
import type { RawLookupTable } from "./world3-tables.js";

export type World3Core = {
  readonly modelData: ModelDataPayload;
  readonly runtime: ReturnType<typeof createFixtureBackedRuntime>;
  createLocalSimulationCore: () => LocalSimulationCore;
  simulateStandardRun: (
    overrides?: SimulationRequest,
    options?: { signal?: AbortSignal },
  ) => Promise<SimulationResult>;
  summarizeStandardRun: (overrides?: SimulationRequest) => Promise<string>;
  renderStandardRunSvg: (overrides?: SimulationRequest) => Promise<string>;
};

export function createWorld3Core(
  modelData: ModelDataPayload,
  loadTables: () => Promise<RawLookupTable[]>,
  loadStandardRunFixture: (
    options?: { signal?: AbortSignal },
  ) => Promise<SimulationResult>,
): World3Core {
  const runtime = createFixtureBackedRuntime(
    modelData,
    loadTables,
    loadStandardRunFixture,
  );

  return {
    modelData,
    runtime,

    createLocalSimulationCore() {
      return createRuntimeBackedLocalSimulationCore(modelData, runtime);
    },

    async simulateStandardRun(overrides, options) {
      await runtime.prepareStandardRun(overrides);
      return runtime.simulateStandardRun(overrides, options);
    },

    async summarizeStandardRun(overrides) {
      const result = await this.simulateStandardRun(overrides);
      return formatSimulationSummary(result, modelData);
    },

    async renderStandardRunSvg(overrides) {
      const result = await this.simulateStandardRun(overrides);
      return renderSimulationSvg(result);
    },
  };
}
