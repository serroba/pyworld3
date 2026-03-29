import { ModelData, } from "./model-data.js";
import { buildSimulationRequestFromPreset, resolveScenarioRequest, } from "./simulation-contracts.js";
import { createSimulationProvider, } from "./simulation-provider.js";
import { createCalibrationCore, } from "./core/index.js";
window.ModelData = ModelData;
window.buildSimulationRequestFromPreset = (name, overrides) => buildSimulationRequestFromPreset(ModelData, name, overrides);
window.resolveScenarioRequest = (spec) => resolveScenarioRequest(ModelData, spec);
window.CalibrationCore = createCalibrationCore(ModelData);
window.SimulationProvider = createSimulationProvider(ModelData);
