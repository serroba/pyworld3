"use strict";
/**
 * Simulation provider seam.
 *
 * HTTP remains the default implementation for now. This lets us move the UI
 * onto a stable abstraction before introducing a browser-native engine.
 */
const HttpSimulationProvider = {
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
const LOCAL_STANDARD_RUN_FIXTURE_URL = "/data/standard-run-explore.json";
const LOCAL_PROVIDER_ERROR = "Local simulation currently supports only the standard-run preset without overrides. Switch back to HTTP mode for other scenarios.";
let localStandardRunFixturePromise = null;
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
        localStandardRunFixturePromise = fetch(LOCAL_STANDARD_RUN_FIXTURE_URL, { signal })
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
const LocalSimulationProvider = {
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
        resolveScenarioRequest(scenarioA);
        if (scenarioB) {
            resolveScenarioRequest(scenarioB);
        }
        throw new Error(LOCAL_PROVIDER_ERROR);
    },
};
function resolveProviderMode() {
    return window.__PYWORLD3_PROVIDER_MODE__ === "local" ? "local" : "http";
}
const SimulationProvider = resolveProviderMode() === "local"
    ? LocalSimulationProvider
    : HttpSimulationProvider;
window.SimulationProvider = SimulationProvider;
