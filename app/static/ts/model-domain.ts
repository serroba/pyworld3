import { ModelData } from "./model-data.js";
import type { SimulationRequest } from "./simulation-contracts.js";
import {
  WORLD3_SCENARIO_CONTROL_REGISTRY,
  type ScenarioControlKey,
} from "./scenario-controls.js";

type VariableMeta = (typeof ModelData.variableMeta)[string];
type ConstantMeta = (typeof ModelData.constantMeta)[string];
type RequestFieldKey = ScenarioControlKey;

export type ModelVariableReference = {
  key: string;
  meta: VariableMeta;
};

export type ModelControlReference = {
  key: string;
  label: string;
  unit: string;
  defaultValue: number | undefined;
  source: "constant" | "request";
};

export type RawModelSection = {
  id: string;
  chartVars?: string[];
  constantKeys?: string[];
  requestKeys?: RequestFieldKey[];
  constants?: Array<string | { key: string }>;
};

export type HydratedModelSection = Omit<
  RawModelSection,
  "chartVars" | "constants" | "constantKeys" | "requestKeys"
> & {
  chartVars: string[];
  variables: ModelVariableReference[];
  constants: ModelControlReference[];
};

export type RawMathExplainer = {
  variables?: string[];
};

export type HydratedMathExplainer = Omit<RawMathExplainer, "variables"> & {
  variables: ModelVariableReference[];
};

function resolveVariable(key: string): ModelVariableReference {
  const meta = ModelData.variableMeta[key];
  if (!meta) {
    throw new Error(`Unknown World3 variable: ${key}`);
  }
  return { key, meta };
}

function resolveConstant(key: string): ModelControlReference {
  const meta = ModelData.constantMeta[key];
  if (!meta) {
    throw new Error(`Unknown World3 constant: ${key}`);
  }
  return {
    key,
    label: meta.full_name,
    unit: meta.unit,
    defaultValue: ModelData.constantDefaults[key],
    source: "constant",
  };
}

const REQUEST_FIELD_DEFINITIONS = new Map(
  WORLD3_SCENARIO_CONTROL_REGISTRY.map((definition) => [
    definition.key,
    definition,
  ] as const),
);

function resolveRequestField(key: RequestFieldKey): ModelControlReference {
  const definition = REQUEST_FIELD_DEFINITIONS.get(key);
  if (!definition) {
    throw new Error(`Unknown World3 request field: ${key}`);
  }
  return {
    key,
    label: definition.fullName,
    unit: definition.unit,
    defaultValue: definition.defaultValue,
    source: "request",
  };
}

function normalizeConstantKeys(
  constantKeys?: string[],
  legacyConstants?: Array<string | { key: string }>,
): string[] {
  if (Array.isArray(constantKeys)) {
    return constantKeys;
  }
  return (legacyConstants ?? []).map((item) =>
    typeof item === "string" ? item : item.key,
  );
}

export const ModelDomain = {
  resolveVariable,
  resolveConstant,
  resolveRequestField,

  hydrateSection(section: RawModelSection): HydratedModelSection {
    const {
      chartVars: rawChartVars,
      constantKeys,
      requestKeys,
      constants: legacyConstants,
      ...rest
    } = section;
    const chartVars = [...(rawChartVars ?? [])];
    return {
      ...rest,
      chartVars,
      variables: chartVars.map(resolveVariable),
      constants: [
        ...normalizeConstantKeys(constantKeys, legacyConstants).map(resolveConstant),
        ...(requestKeys ?? []).map(resolveRequestField),
      ],
    };
  },

  hydrateExplainer(explainer: RawMathExplainer): HydratedMathExplainer {
    const variableKeys = [...(explainer.variables ?? [])];
    return {
      ...explainer,
      variables: variableKeys.map(resolveVariable),
    };
  },
};

declare global {
  interface Window {
    ModelDomain: typeof ModelDomain;
  }
}

window.ModelDomain = ModelDomain;
