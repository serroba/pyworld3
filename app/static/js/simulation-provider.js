/**
 * Simulation provider seam.
 *
 * HTTP remains the default implementation for now. This lets us move the UI
 * onto a stable abstraction before introducing a browser-native engine.
 */
import { createWorld3Core, } from "./core/index.js";
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
const WORLD3_TABLES_URL = "/data/functions-table-world3.json";
let localStandardRunFixturePromise = null;
let world3TablesPromise = null;
function getApi() {
    if (!window.API) {
        throw new Error("HTTP API client is not available on window.");
    }
    return window.API;
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
function createBrowserFixtureLoader() {
    return async (options) => loadLocalStandardRunFixture(options?.signal);
}
async function loadWorld3Tables(signal) {
    if (!world3TablesPromise) {
        const init = {};
        if (signal !== undefined) {
            init.signal = signal;
        }
        world3TablesPromise = fetch(WORLD3_TABLES_URL, init)
            .then(async (response) => {
            if (!response.ok) {
                throw new Error(`Failed to load World3 tables (${response.status})`);
            }
            return response.json();
        })
            .catch((error) => {
            world3TablesPromise = null;
            throw error;
        });
    }
    return world3TablesPromise;
}
function createBrowserTablesLoader() {
    return async () => loadWorld3Tables();
}
function createLocalSimulationProvider(modelData) {
    const core = createWorld3Core(modelData, createBrowserTablesLoader(), createBrowserFixtureLoader());
    const localCore = core.createLocalSimulationCore();
    return {
        mode: "local",
        simulatePreset: localCore.simulatePreset,
        simulate: localCore.simulate,
        compare: localCore.compare,
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
