/**
 * Shared browser-side simulation contracts and preset resolution helpers.
 *
 * These types mirror the API shapes the UI already consumes, while keeping the
 * browser-native migration honest about request/response boundaries.
 */

type ConstantMap = Record<string, number>;

type SimulationRequest = {
  year_min?: number;
  year_max?: number;
  dt?: number;
  pyear?: number;
  iphst?: number;
  constants?: ConstantMap;
  output_variables?: string[];
};

type ScenarioSpec = {
  preset?: string;
  request?: SimulationRequest;
};

type TimeSeriesResult = {
  name: string;
  values: number[];
};

type SimulationResult = {
  year_min: number;
  year_max: number;
  dt: number;
  time: number[];
  constants_used: ConstantMap;
  series: Record<string, TimeSeriesResult>;
};

type CompareMetric = {
  label: string;
  variable: string;
  value_a: number;
  value_b: number;
  delta_pct: number | null;
};

type CompareResult = {
  scenario_a: string;
  scenario_b: string;
  results_a: SimulationResult;
  results_b: SimulationResult;
  metrics: CompareMetric[];
};

type PresetInfo = {
  name: string;
  description: string;
  constants: ConstantMap;
  year_min?: number;
  year_max?: number;
  dt?: number;
  pyear?: number;
  iphst?: number;
  output_variables?: string[];
};

type ModelDataPayload = {
  constantDefaults: ConstantMap;
  constantMeta: Record<
    string,
    {
      full_name: string;
      sector: string;
      unit: string;
    }
  >;
  variableMeta: Record<
    string,
    {
      full_name: string;
      sector: string;
      unit: string;
    }
  >;
  defaultVariables: string[];
  presets: PresetInfo[];
};

interface Window {
  ModelData: ModelDataPayload;
  buildSimulationRequestFromPreset: (
    name: string,
    overrides?: SimulationRequest,
  ) => SimulationRequest;
  resolveScenarioRequest: (spec: ScenarioSpec) => SimulationRequest;
}

function getPresetByName(name: string): PresetInfo {
  const preset = window.ModelData.presets.find((candidate) => candidate.name === name);
  if (!preset) {
    throw new Error(`Unknown preset '${name}'`);
  }
  return preset;
}

function buildSimulationRequestFromPreset(
  name: string,
  overrides: SimulationRequest = {},
): SimulationRequest {
  const preset = getPresetByName(name);
  const mergedConstants: ConstantMap = {
    ...preset.constants,
    ...(overrides.constants || {}),
  };
  const request: SimulationRequest = {};
  const yearMin = overrides.year_min ?? preset.year_min;
  const yearMax = overrides.year_max ?? preset.year_max;
  const dt = overrides.dt ?? preset.dt;
  const pyear = overrides.pyear ?? preset.pyear;
  const iphst = overrides.iphst ?? preset.iphst;
  const outputVariables = overrides.output_variables ?? preset.output_variables;

  if (yearMin !== undefined) {
    request.year_min = yearMin;
  }
  if (yearMax !== undefined) {
    request.year_max = yearMax;
  }
  if (dt !== undefined) {
    request.dt = dt;
  }
  if (pyear !== undefined) {
    request.pyear = pyear;
  }
  if (iphst !== undefined) {
    request.iphst = iphst;
  }
  if (Object.keys(mergedConstants).length > 0) {
    request.constants = mergedConstants;
  }
  if (outputVariables !== undefined) {
    request.output_variables = outputVariables;
  }

  return request;
}

function resolveScenarioRequest(spec: ScenarioSpec): SimulationRequest {
  if (spec.preset) {
    return buildSimulationRequestFromPreset(spec.preset, spec.request);
  }
  return spec.request || {};
}

window.buildSimulationRequestFromPreset = buildSimulationRequestFromPreset;
window.resolveScenarioRequest = resolveScenarioRequest;
