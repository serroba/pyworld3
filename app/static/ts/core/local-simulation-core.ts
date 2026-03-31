import {
  type CompareResult,
  type CompareMetric,
  type ModelDataPayload,
  type ScenarioSpec,
  type SimulationRequest,
  type SimulationResult,
  buildSimulationRequestFromPreset,
  resolveScenarioRequest,
} from "../simulation-contracts.js";
import type { BrowserNativeRuntime } from "./browser-native-runtime.js";
import { WORLD3_COMPARE_METRICS } from "./world3-registry.js";

export type LocalSimulationCore = {
  simulatePreset: (
    name: string,
    overrides?: SimulationRequest,
  ) => Promise<SimulationResult>;
  simulate: (
    request?: SimulationRequest,
    options?: { signal?: AbortSignal },
  ) => Promise<SimulationResult>;
  compare: (
    scenarioA: ScenarioSpec,
    scenarioB?: ScenarioSpec,
  ) => Promise<CompareResult>;
};

const COMPARE_METRICS = WORLD3_COMPARE_METRICS;

const LOCAL_DEFAULT_OUTPUT_VARIABLES = COMPARE_METRICS.map(
  (metric) => metric.variable,
);

function resolveScenarioLabel(spec: ScenarioSpec): string {
  return spec.preset ?? "Custom";
}

function buildCompareMetrics(
  resultsA: SimulationResult,
  resultsB: SimulationResult,
): CompareMetric[] {
  const metrics: CompareMetric[] = [];

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

function withLocalDefaultOutputs(
  request: SimulationRequest,
): SimulationRequest {
  if (
    request.output_variables !== undefined ||
    !hasExplicitOverrides(request)
  ) {
    return request;
  }

  return {
    ...request,
    output_variables: [...LOCAL_DEFAULT_OUTPUT_VARIABLES],
  };
}

export function hasExplicitOverrides(request?: SimulationRequest): boolean {
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

export function createRuntimeBackedLocalSimulationCore(
  modelData: ModelDataPayload,
  runtime: BrowserNativeRuntime,
): LocalSimulationCore {
  return {
    async simulatePreset(name, overrides) {
      const request = withLocalDefaultOutputs(
        buildSimulationRequestFromPreset(modelData, name, overrides),
      );
      return runtime.simulate(request);
    },

    async simulate(request, options) {
      const normalizedRequest = withLocalDefaultOutputs(request ?? {});
      return runtime.simulate(normalizedRequest, options);
    },

    async compare(scenarioA, scenarioB) {
      const requestA = withLocalDefaultOutputs(
        resolveScenarioRequest(modelData, scenarioA),
      );
      const resolvedScenarioB = scenarioB ?? { preset: "standard-run" };
      const requestB = withLocalDefaultOutputs(
        resolveScenarioRequest(modelData, resolvedScenarioB),
      );
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
