/**
 * Shared browser-side simulation contracts and preset resolution helpers.
 *
 * These types mirror the API shapes the UI already consumes, while keeping the
 * browser-native migration honest about request/response boundaries.
 */

export type ConstantMap = Record<string, number>;

export type SimulationRequest = {
  year_min?: number;
  year_max?: number;
  dt?: number;
  pyear?: number;
  iphst?: number;
  constants?: ConstantMap;
  output_variables?: string[];
};

export type ScenarioSpec = {
  preset?: string;
  request?: SimulationRequest;
};

export type TimeSeriesResult = {
  name: string;
  values: number[];
};

export type SimulationResult = {
  year_min: number;
  year_max: number;
  dt: number;
  time: number[];
  constants_used: ConstantMap;
  series: Record<string, TimeSeriesResult>;
};

export type CompareMetric = {
  label: string;
  variable: string;
  value_a: number;
  value_b: number;
  delta_pct: number | null;
};

export type CompareResult = {
  scenario_a: string;
  scenario_b: string;
  results_a: SimulationResult;
  results_b: SimulationResult;
  metrics: CompareMetric[];
};

export type PresetInfo = {
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

export type ModelDataPayload = {
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

function getPresetByName(modelData: ModelDataPayload, name: string): PresetInfo {
  const preset = modelData.presets.find((candidate) => candidate.name === name);
  if (!preset) {
    throw new Error(`Unknown preset '${name}'`);
  }
  return preset;
}

export function buildSimulationRequestFromPreset(
  modelData: ModelDataPayload,
  name: string,
  overrides: SimulationRequest = {},
): SimulationRequest {
  const preset = getPresetByName(modelData, name);
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

export function resolveScenarioRequest(
  modelData: ModelDataPayload,
  spec: ScenarioSpec,
): SimulationRequest {
  if (spec.preset) {
    return buildSimulationRequestFromPreset(modelData, spec.preset, spec.request);
  }
  return spec.request || {};
}
