/**
 * Simulation provider seam for browser-native execution.
 */
import { createWorld3Core, } from "./core/index.js";
const WORLD3_TABLES_URL = new URL("../data/functions-table-world3.json", import.meta.url).toString();
let world3TablesPromise = null;
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
    const core = createWorld3Core(modelData, createBrowserTablesLoader());
    const localCore = core.createLocalSimulationCore();
    return {
        mode: "local",
        simulatePreset: localCore.simulatePreset,
        simulate: localCore.simulate,
        compare: localCore.compare,
    };
}
export function createSimulationProvider(modelData) {
    return createLocalSimulationProvider(modelData);
}
export const SimulationProvider = null;
