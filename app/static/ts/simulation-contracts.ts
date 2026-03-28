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

  return {
    year_min: overrides.year_min ?? preset.year_min,
    year_max: overrides.year_max ?? preset.year_max,
    dt: overrides.dt ?? preset.dt,
    pyear: overrides.pyear ?? preset.pyear,
    iphst: overrides.iphst ?? preset.iphst,
    constants: Object.keys(mergedConstants).length > 0 ? mergedConstants : undefined,
    output_variables: overrides.output_variables ?? preset.output_variables,
  };
}

function resolveScenarioRequest(spec: ScenarioSpec): SimulationRequest {
  if (spec.preset) {
    return buildSimulationRequestFromPreset(spec.preset, spec.request);
  }
  return spec.request || {};
}
