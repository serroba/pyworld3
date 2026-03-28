/**
 * Simulation provider seam.
 *
 * HTTP remains the default implementation for now. This lets us move the UI
 * onto a stable abstraction before introducing a browser-native engine.
 */

type ProviderMode = "http" | "local";

type SimulationProviderApi = {
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

declare const API: {
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

interface Window {
  SimulationProvider: SimulationProviderApi;
  __PYWORLD3_PROVIDER_MODE__?: ProviderMode;
}

const HttpSimulationProvider: SimulationProviderApi = {
  mode: "http",

  async simulatePreset(name, overrides) {
    return API.simulatePreset(name, overrides);
  },

  async simulate(request, options) {
    return API.simulate(request, options);
  },

  async compare(scenarioA, scenarioB) {
    return API.compare(scenarioA, scenarioB);
  },
};

const LOCAL_PROVIDER_ERROR =
  "Local simulation provider is not implemented yet. Switch back to HTTP mode.";

const LocalSimulationProvider: SimulationProviderApi = {
  mode: "local",

  async simulatePreset(name, overrides) {
    return this.simulate(buildSimulationRequestFromPreset(name, overrides));
  },

  async simulate() {
    throw new Error(LOCAL_PROVIDER_ERROR);
  },

  async compare(scenarioA, scenarioB) {
    resolveScenarioRequest(scenarioA);
    if (scenarioB) {
      resolveScenarioRequest(scenarioB);
    }
    throw new Error(LOCAL_PROVIDER_ERROR);
  },
};

function resolveProviderMode(): ProviderMode {
  return window.__PYWORLD3_PROVIDER_MODE__ === "local" ? "local" : "http";
}

const SimulationProvider =
  resolveProviderMode() === "local"
    ? LocalSimulationProvider
    : HttpSimulationProvider;

window.SimulationProvider = SimulationProvider;
