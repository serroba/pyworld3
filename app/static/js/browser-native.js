import { ModelData, } from "./model-data.js";
import { buildSimulationRequestFromPreset, resolveScenarioRequest, } from "./simulation-contracts.js";
import { createSimulationProvider, } from "./simulation-provider.js";
window.ModelData = ModelData;
window.buildSimulationRequestFromPreset = (name, overrides) => buildSimulationRequestFromPreset(ModelData, name, overrides);
window.resolveScenarioRequest = (spec) => resolveScenarioRequest(ModelData, spec);
window.SimulationProvider = createSimulationProvider(ModelData);
