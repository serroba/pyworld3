/**
 * Simulation provider seam for browser-native execution.
 */

import {
  type CompareResult,
  type ModelDataPayload,
  type ScenarioSpec,
  type SimulationRequest,
  type SimulationResult,
} from "./simulation-contracts.js";
import {
  createWorld3Core,
} from "./core/index.js";
import type { RawLookupTable } from "./core/index.js";

export type ProviderMode = "local";

export type SimulationProviderApi = {
  mode: ProviderMode;
  simulatePreset: (
    name: string,
    overrides?: SimulationRequest,
  ) => Promise<SimulationResult>;
  simulate: (
    request?: SimulationRequest,
    options?: { signal?: AbortSignal },
  ) => Promise<SimulationResult>;
  compare: (
    scenarioA: ScenarioSpec,
    scenarioB?: ScenarioSpec,
  ) => Promise<CompareResult>;
};

declare global {
  interface Window {
    SimulationProvider: SimulationProviderApi;
  }
}

const WORLD3_TABLES_URL = new URL(
  "../data/functions-table-world3.json",
  import.meta.url,
).toString();
let world3TablesPromise: Promise<RawLookupTable[]> | null = null;

async function loadWorld3Tables(signal?: AbortSignal): Promise<RawLookupTable[]> {
  if (!world3TablesPromise) {
    const init: RequestInit = {};
    if (signal !== undefined) {
      init.signal = signal;
    }

    world3TablesPromise = fetch(WORLD3_TABLES_URL, init)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load World3 tables (${response.status})`);
        }
        return response.json() as Promise<RawLookupTable[]>;
      })
      .catch((error: unknown) => {
        world3TablesPromise = null;
        throw error;
      });
  }

  return world3TablesPromise;
}

function createBrowserTablesLoader(): () => Promise<RawLookupTable[]> {
  return async () => loadWorld3Tables();
}

function createLocalSimulationProvider(
  modelData: ModelDataPayload,
): SimulationProviderApi {
  const core = createWorld3Core(
    modelData,
    createBrowserTablesLoader(),
  );
  const localCore = core.createLocalSimulationCore();
  return {
    mode: "local",
    simulatePreset: localCore.simulatePreset,
    simulate: localCore.simulate,
    compare: localCore.compare,
  };
}

export function createSimulationProvider(
  modelData: ModelDataPayload,
): SimulationProviderApi {
  return createLocalSimulationProvider(modelData);
}

export const SimulationProvider = null;
