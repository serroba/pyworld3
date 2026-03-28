/**
 * Simulation provider seam.
 *
 * HTTP remains the default implementation for now. This lets us move the UI
 * onto a stable abstraction before introducing a browser-native engine.
 */

import {
  type CompareResult,
  type ModelDataPayload,
  type ScenarioSpec,
  type SimulationRequest,
  type SimulationResult,
  buildSimulationRequestFromPreset,
  resolveScenarioRequest,
} from "./simulation-contracts.js";

export type ProviderMode = "http" | "local";

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

type HttpApi = {
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
    __PYWORLD3_PROVIDER_MODE__?: ProviderMode;
    API?: HttpApi;
  }
}

const HttpSimulationProvider: SimulationProviderApi = {
  mode: "http",

  async simulatePreset(name, overrides) {
    return getApi().simulatePreset(name, overrides);
  },

  async simulate(request, options) {
    return getApi().simulate(request, options);
  },

  async compare(scenarioA, scenarioB) {
    return getApi().compare(scenarioA, scenarioB);
  },
};

const LOCAL_STANDARD_RUN_FIXTURE_URL = "/data/standard-run-explore.json";
const LOCAL_PROVIDER_ERROR =
  "Local simulation currently supports only the standard-run preset without overrides. Switch back to HTTP mode for other scenarios.";

let localStandardRunFixturePromise: Promise<SimulationResult> | null = null;

function getApi(): HttpApi {
  if (!window.API) {
    throw new Error("HTTP API client is not available on window.");
  }
  return window.API;
}

function hasExplicitOverrides(request?: SimulationRequest): boolean {
  if (!request) {
    return false;
  }

  return Object.entries(request).some(([, value]) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (value && typeof value === "object") {
      return Object.keys(value).length > 0;
    }
    return value !== undefined;
  });
}

async function loadLocalStandardRunFixture(
  signal?: AbortSignal,
): Promise<SimulationResult> {
  if (!localStandardRunFixturePromise) {
    const init: RequestInit = {};
    if (signal !== undefined) {
      init.signal = signal;
    }

    localStandardRunFixturePromise = fetch(LOCAL_STANDARD_RUN_FIXTURE_URL, init)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load local simulation fixture (${response.status})`,
          );
        }
        return response.json() as Promise<SimulationResult>;
      })
      .catch((error: unknown) => {
        localStandardRunFixturePromise = null;
        throw error;
      });
  }

  return localStandardRunFixturePromise;
}

function createLocalSimulationProvider(
  modelData: ModelDataPayload,
): SimulationProviderApi {
  return {
  mode: "local",

  async simulatePreset(name, overrides) {
    if (name === "standard-run" && !hasExplicitOverrides(overrides)) {
      return loadLocalStandardRunFixture();
    }
    throw new Error(`${LOCAL_PROVIDER_ERROR} Requested preset: ${name}.`);
  },

  async simulate(request, options) {
    if (!hasExplicitOverrides(request)) {
      return loadLocalStandardRunFixture(options?.signal);
    }
    throw new Error(LOCAL_PROVIDER_ERROR);
  },

  async compare(scenarioA, scenarioB) {
    resolveScenarioRequest(modelData, scenarioA);
    if (scenarioB) {
      resolveScenarioRequest(modelData, scenarioB);
    }
    throw new Error(LOCAL_PROVIDER_ERROR);
  },
  };
}

function resolveProviderMode(): ProviderMode {
  return window.__PYWORLD3_PROVIDER_MODE__ === "local" ? "local" : "http";
}

export function createSimulationProvider(
  modelData: ModelDataPayload,
): SimulationProviderApi {
  return resolveProviderMode() === "local"
    ? createLocalSimulationProvider(modelData)
    : HttpSimulationProvider;
}

export const SimulationProvider =
  resolveProviderMode() === "local"
    ? null
    : HttpSimulationProvider;
