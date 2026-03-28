import {
  ModelData,
} from "./model-data.js";
import {
  buildSimulationRequestFromPreset,
  resolveScenarioRequest,
} from "./simulation-contracts.js";
import {
  createSimulationProvider,
} from "./simulation-provider.js";

declare global {
  interface Window {
    ModelData: typeof ModelData;
    buildSimulationRequestFromPreset: (
      name: string,
      overrides?: Parameters<typeof buildSimulationRequestFromPreset>[2],
    ) => ReturnType<typeof buildSimulationRequestFromPreset>;
    resolveScenarioRequest: (
      spec: Parameters<typeof resolveScenarioRequest>[1],
    ) => ReturnType<typeof resolveScenarioRequest>;
  }
}

window.ModelData = ModelData;
window.buildSimulationRequestFromPreset = (name, overrides) =>
  buildSimulationRequestFromPreset(ModelData, name, overrides);
window.resolveScenarioRequest = (spec) => resolveScenarioRequest(ModelData, spec);
window.SimulationProvider = createSimulationProvider(ModelData);
