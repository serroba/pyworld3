import { buildSimulationRequestFromPreset, } from "../simulation-contracts.js";
import { createTimeGrid } from "./runtime-primitives.js";
import { projectSimulationResult } from "./simulation-results.js";
import { createLookupLibrary, } from "./world3-tables.js";
function hasRequestOverrides(request) {
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
export function prepareRuntime(modelData, request, rawTables) {
    const yearMin = request.year_min ?? 1900;
    const yearMax = request.year_max ?? 2100;
    const dt = request.dt ?? 0.5;
    const outputVariables = request.output_variables ?? modelData.defaultVariables;
    return {
        request,
        outputVariables,
        time: createTimeGrid(yearMin, yearMax, dt),
        lookupLibrary: createLookupLibrary(rawTables),
    };
}
export function createFixtureBackedRuntime(modelData, loadTables, loadStandardRunFixture) {
    let tablesPromise = null;
    let fixturePromise = null;
    async function getTables() {
        if (!tablesPromise) {
            tablesPromise = loadTables();
        }
        return tablesPromise;
    }
    async function getFixture(options) {
        if (!fixturePromise) {
            fixturePromise = loadStandardRunFixture(options).catch((error) => {
                fixturePromise = null;
                throw error;
            });
        }
        return fixturePromise;
    }
    return {
        async prepareStandardRun(overrides = {}) {
            const request = buildSimulationRequestFromPreset(modelData, "standard-run", overrides);
            const tables = await getTables();
            return prepareRuntime(modelData, request, tables);
        },
        async simulateStandardRun(overrides = {}, options) {
            const fixture = await getFixture(options);
            if (!hasRequestOverrides(overrides)) {
                return fixture;
            }
            const prepared = await this.prepareStandardRun(overrides);
            return projectSimulationResult(prepared, fixture);
        },
    };
}
