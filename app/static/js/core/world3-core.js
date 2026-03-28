import { createFixtureBackedRuntime } from "./browser-native-runtime.js";
import { createRuntimeBackedLocalSimulationCore, } from "./local-simulation-core.js";
import { formatSimulationSummary, renderSimulationSvg, } from "./simulation-artifacts.js";
export function createWorld3Core(modelData, loadTables, loadStandardRunFixture) {
    const runtime = createFixtureBackedRuntime(modelData, loadTables, loadStandardRunFixture);
    return {
        modelData,
        runtime,
        createLocalSimulationCore() {
            return createRuntimeBackedLocalSimulationCore(modelData, runtime);
        },
        async simulateStandardRun(overrides, options) {
            await runtime.prepareStandardRun(overrides);
            return runtime.simulateStandardRun(overrides, options);
        },
        async summarizeStandardRun(overrides) {
            const result = await this.simulateStandardRun(overrides);
            return formatSimulationSummary(result, modelData);
        },
        async renderStandardRunSvg(overrides) {
            const result = await this.simulateStandardRun(overrides);
            return renderSimulationSvg(result);
        },
    };
}
