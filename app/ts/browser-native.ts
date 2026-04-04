import {
  ModelData,
} from "./model-data.js";
import {
  WORLD3_EQUATION_REFERENCE,
} from "./core/world3-equation-reference.js";
import {
  buildSimulationRequestFromPreset,
  resolveScenarioRequest,
} from "./simulation-contracts.js";
import {
  createSimulationProvider,
} from "./simulation-provider.js";
import {
  createOwidDataProvider,
  createValidationCore,
  createCalibrationCore,
} from "./core/index.js";
import {
  createI18n,
  type I18nApi,
} from "./i18n.js";

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
    CalibrationCore: ReturnType<typeof createCalibrationCore>;
    ValidationCore: ReturnType<typeof createValidationCore>;
    LocalOwidData: ReturnType<typeof createOwidDataProvider>;
    EquationReference: typeof WORLD3_EQUATION_REFERENCE;
    I18n: I18nApi;
  }
}

const LOCAL_OWID_DATA_URL = new URL("../data/owid-world-data.json", import.meta.url)
  .toString();
let localOwidDatasetPromise: Promise<import("./core/index.js").OwidDataset> | null = null;

async function loadLocalOwidDataset() {
  if (!localOwidDatasetPromise) {
    localOwidDatasetPromise = fetch(LOCAL_OWID_DATA_URL)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load local OWID data (${response.status})`);
        }
        return response.json() as Promise<import("./core/index.js").OwidDataset>;
      })
      .catch((error: unknown) => {
        localOwidDatasetPromise = null;
        throw error;
      });
  }
  return localOwidDatasetPromise;
}

const LocalOwidData = createOwidDataProvider(loadLocalOwidDataset);
const I18n = createI18n();

window.ModelData = ModelData;
window.EquationReference = WORLD3_EQUATION_REFERENCE;
window.buildSimulationRequestFromPreset = (name, overrides) =>
  buildSimulationRequestFromPreset(ModelData, name, overrides);
window.resolveScenarioRequest = (spec) => resolveScenarioRequest(ModelData, spec);
window.CalibrationCore = createCalibrationCore(ModelData);
window.LocalOwidData = LocalOwidData;
window.ValidationCore = createValidationCore((options) =>
  LocalOwidData.getValidationData(options),
);
window.SimulationProvider = createSimulationProvider(ModelData);
window.I18n = I18n;
