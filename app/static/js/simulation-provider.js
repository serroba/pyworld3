/**
 * Simulation provider seam.
 *
 * HTTP remains the default implementation for now. This lets us move the UI
 * onto a stable abstraction before introducing a browser-native engine.
 */
import { resolveScenarioRequest, } from "./simulation-contracts.js";
const HttpSimulationProvider = {
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
const LOCAL_PROVIDER_ERROR = "Local simulation currently supports only the standard-run preset without overrides. Switch back to HTTP mode for other scenarios.";
let localStandardRunFixturePromise = null;
function getApi() {
    if (!window.API) {
        throw new Error("HTTP API client is not available on window.");
    }
    return window.API;
}
function hasExplicitOverrides(request) {
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
async function loadLocalStandardRunFixture(signal) {
    if (!localStandardRunFixturePromise) {
        const init = {};
        if (signal !== undefined) {
            init.signal = signal;
        }
        localStandardRunFixturePromise = fetch(LOCAL_STANDARD_RUN_FIXTURE_URL, init)
            .then(async (response) => {
            if (!response.ok) {
                throw new Error(`Failed to load local simulation fixture (${response.status})`);
            }
            return response.json();
        })
            .catch((error) => {
            localStandardRunFixturePromise = null;
            throw error;
        });
    }
    return localStandardRunFixturePromise;
}
function createLocalSimulationProvider(modelData) {
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
function resolveProviderMode() {
    return window.__PYWORLD3_PROVIDER_MODE__ === "local" ? "local" : "http";
}
export function createSimulationProvider(modelData) {
    return resolveProviderMode() === "local"
        ? createLocalSimulationProvider(modelData)
        : HttpSimulationProvider;
}
export const SimulationProvider = resolveProviderMode() === "local"
    ? null
    : HttpSimulationProvider;
