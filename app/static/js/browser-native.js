import { ModelData, } from "./model-data.js";
import { buildSimulationRequestFromPreset, resolveScenarioRequest, } from "./simulation-contracts.js";
import { createSimulationProvider, } from "./simulation-provider.js";
import { createOwidDataProvider, createValidationCore, createCalibrationCore, } from "./core/index.js";
const LOCAL_OWID_DATA_URL = "/data/owid-world-data.json";
let localOwidDatasetPromise = null;
async function loadLocalOwidDataset() {
    if (!localOwidDatasetPromise) {
        localOwidDatasetPromise = fetch(LOCAL_OWID_DATA_URL)
            .then(async (response) => {
            if (!response.ok) {
                throw new Error(`Failed to load local OWID data (${response.status})`);
            }
            return response.json();
        })
            .catch((error) => {
            localOwidDatasetPromise = null;
            throw error;
        });
    }
    return localOwidDatasetPromise;
}
const LocalOwidData = createOwidDataProvider(loadLocalOwidDataset);
window.ModelData = ModelData;
window.buildSimulationRequestFromPreset = (name, overrides) => buildSimulationRequestFromPreset(ModelData, name, overrides);
window.resolveScenarioRequest = (spec) => resolveScenarioRequest(ModelData, spec);
window.CalibrationCore = createCalibrationCore(ModelData);
window.LocalOwidData = LocalOwidData;
window.ValidationCore = createValidationCore((options) => LocalOwidData.getValidationData(options));
window.SimulationProvider = createSimulationProvider(ModelData);
