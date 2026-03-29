import { buildSimulationRequestFromPreset, resolveScenarioRequest, } from "../simulation-contracts.js";
export const LOCAL_PROVIDER_ERROR = "Local simulation currently supports only the standard-run preset without overrides. Switch back to HTTP mode for other scenarios.";
const COMPARE_METRICS = [
    { label: "Population", variable: "pop" },
    { label: "Industrial output/cap", variable: "iopc" },
    { label: "Food/capita", variable: "fpc" },
    { label: "Pollution index", variable: "ppolx" },
    { label: "Resources remaining", variable: "nrfr" },
    { label: "Life expectancy", variable: "le" },
];
const LOCAL_DEFAULT_OUTPUT_VARIABLES = COMPARE_METRICS.map((metric) => metric.variable);
function resolveScenarioLabel(spec) {
    return spec.preset ?? "Custom";
}
function buildCompareMetrics(resultsA, resultsB) {
    const metrics = [];
    for (const metric of COMPARE_METRICS) {
        const seriesA = resultsA.series[metric.variable];
        const seriesB = resultsB.series[metric.variable];
        if (!seriesA || !seriesB) {
            continue;
        }
        const valueA = seriesA.values.at(-1);
        const valueB = seriesB.values.at(-1);
        if (valueA === undefined || valueB === undefined) {
            continue;
        }
        metrics.push({
            label: metric.label,
            variable: metric.variable,
            value_a: valueA,
            value_b: valueB,
            delta_pct: valueA !== 0 ? ((valueB - valueA) / Math.abs(valueA)) * 100 : null,
        });
    }
    return metrics;
}
function withLocalDefaultOutputs(request) {
    if (request.output_variables !== undefined ||
        !hasExplicitOverrides(request)) {
        return request;
    }
    return {
        ...request,
        output_variables: [...LOCAL_DEFAULT_OUTPUT_VARIABLES],
    };
}
export function hasExplicitOverrides(request) {
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
export function createLocalSimulationCore(modelData, loadStandardRunFixture) {
    return {
        async simulatePreset(name, overrides) {
            if (name === "standard-run" && !hasExplicitOverrides(overrides)) {
                return loadStandardRunFixture();
            }
            throw new Error(`${LOCAL_PROVIDER_ERROR} Requested preset: ${name}.`);
        },
        async simulate(request, options) {
            if (!hasExplicitOverrides(request)) {
                return loadStandardRunFixture(options);
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
export function createRuntimeBackedLocalSimulationCore(modelData, runtime) {
    return {
        async simulatePreset(name, overrides) {
            const request = withLocalDefaultOutputs(buildSimulationRequestFromPreset(modelData, name, overrides));
            await runtime.prepare(request);
            return runtime.simulate(request);
        },
        async simulate(request, options) {
            const normalizedRequest = withLocalDefaultOutputs(request ?? {});
            await runtime.prepare(normalizedRequest);
            return runtime.simulate(normalizedRequest, options);
        },
        async compare(scenarioA, scenarioB) {
            const requestA = withLocalDefaultOutputs(resolveScenarioRequest(modelData, scenarioA));
            const resolvedScenarioB = scenarioB ?? { preset: "standard-run" };
            const requestB = withLocalDefaultOutputs(resolveScenarioRequest(modelData, resolvedScenarioB));
            const [resultsA, resultsB] = await Promise.all([
                runtime.simulate(requestA),
                runtime.simulate(requestB),
            ]);
            return {
                scenario_a: resolveScenarioLabel(scenarioA),
                scenario_b: scenarioB ? resolveScenarioLabel(scenarioB) : "Standard Run",
                results_a: resultsA,
                results_b: resultsB,
                metrics: buildCompareMetrics(resultsA, resultsB),
            };
        },
    };
}
