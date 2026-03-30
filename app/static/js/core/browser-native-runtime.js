import { buildSimulationRequestFromPreset, } from "../simulation-contracts.js";
import { simulateWorld3 } from "./world3-simulation.js";
export function createSimulationRuntime(modelData, loadTables) {
    let tablesPromise = null;
    async function getTables() {
        if (!tablesPromise) {
            tablesPromise = loadTables();
        }
        return tablesPromise;
    }
    async function runSimulation(request) {
        const tables = await getTables();
        const mergedConstants = {
            ...modelData.constantDefaults,
            ...(request.constants ?? {}),
        };
        return simulateWorld3({
            yearMin: request.year_min ?? 1900,
            yearMax: request.year_max ?? 2100,
            dt: request.dt ?? 0.5,
            pyear: request.pyear ?? 1975,
            iphst: request.iphst ?? 1940,
            constants: mergedConstants,
            rawTables: tables,
        });
    }
    return {
        async simulate(request = {}) {
            return runSimulation(request);
        },
        async simulateStandardRun(overrides = {}) {
            const request = buildSimulationRequestFromPreset(modelData, "standard-run", overrides);
            return runSimulation(request);
        },
    };
}
