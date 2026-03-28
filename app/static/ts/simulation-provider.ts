/**
 * Simulation provider seam.
 *
 * HTTP remains the default implementation for now. This lets us move the UI
 * onto a stable abstraction before introducing a browser-native engine.
 */

type ScenarioSpec = {
  preset?: string;
  request?: Record<string, unknown>;
};

type SimulationRequest = Record<string, unknown>;
type SimulationResult = Record<string, unknown>;
type CompareResult = Record<string, unknown>;

type SimulationProviderApi = {
  mode: "http";
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
}

const SimulationProvider: SimulationProviderApi = {
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

window.SimulationProvider = SimulationProvider;
