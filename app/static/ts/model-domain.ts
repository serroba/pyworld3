import { ModelData } from "./model-data.js";
import type { SimulationRequest } from "./simulation-contracts.js";
import type { World3ConstantKey, World3VariableKey } from "./core/world3-keys.js";
import {
  WORLD3_SCENARIO_CONTROL_REGISTRY,
  type ScenarioControlKey,
} from "./scenario-controls.js";

type VariableMeta = (typeof ModelData.variableMeta)[World3VariableKey];
type ConstantMeta = (typeof ModelData.constantMeta)[World3ConstantKey];
type RequestFieldKey = ScenarioControlKey;

export type ModelVariableReference = {
  key: World3VariableKey;
  meta: VariableMeta;
};

export type ModelControlReference = {
  key: World3ConstantKey | RequestFieldKey;
  label: string;
  unit: string;
  defaultValue: number | undefined;
  source: "constant" | "request";
};

export type RawModelSection = {
  id: string;
  chartVars?: World3VariableKey[];
  constantKeys?: World3ConstantKey[];
  requestKeys?: RequestFieldKey[];
  constants?: Array<World3ConstantKey | { key: World3ConstantKey }>;
};

export type HydratedModelSection = Omit<
  RawModelSection,
  "chartVars" | "constants" | "constantKeys" | "requestKeys"
> & {
  chartVars: World3VariableKey[];
  variables: ModelVariableReference[];
  constants: ModelControlReference[];
};

export type RawMathExplainer = {
  variables?: World3VariableKey[];
};

export type HydratedMathExplainer = Omit<RawMathExplainer, "variables"> & {
  variables: ModelVariableReference[];
};

function resolveVariable(key: World3VariableKey): ModelVariableReference {
  const meta = ModelData.variableMeta[key];
  if (!meta) {
    throw new Error(`Unknown World3 variable: ${key}`);
  }
  return { key, meta };
}

function resolveConstant(key: World3ConstantKey): ModelControlReference {
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
  constantKeys?: World3ConstantKey[],
  legacyConstants?: Array<World3ConstantKey | { key: World3ConstantKey }>,
): World3ConstantKey[] {
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
