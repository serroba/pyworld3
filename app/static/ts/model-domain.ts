import { ModelData } from "./model-data.js";

type VariableMeta = (typeof ModelData.variableMeta)[string];
type ConstantMeta = (typeof ModelData.constantMeta)[string];

export type ModelVariableReference = {
  key: string;
  meta: VariableMeta;
};

export type ModelConstantReference = {
  key: string;
  meta: ConstantMeta;
  defaultValue: number | undefined;
};

export type RawModelSection = {
  id: string;
  chartVars?: string[];
  constantKeys?: string[];
  constants?: Array<string | { key: string }>;
};

export type HydratedModelSection = Omit<RawModelSection, "chartVars" | "constants" | "constantKeys"> & {
  chartVars: string[];
  variables: ModelVariableReference[];
  constants: ModelConstantReference[];
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

function resolveConstant(key: string): ModelConstantReference {
  const meta = ModelData.constantMeta[key];
  if (!meta) {
    throw new Error(`Unknown World3 constant: ${key}`);
  }
  return {
    key,
    meta,
    defaultValue: ModelData.constantDefaults[key],
  };
}

function normalizeConstantKeys(section: RawModelSection): string[] {
  if (Array.isArray(section.constantKeys)) {
    return section.constantKeys;
  }
  return (section.constants ?? []).map((item) =>
    typeof item === "string" ? item : item.key,
  );
}

export const ModelDomain = {
  resolveVariable,
  resolveConstant,

  hydrateSection(section: RawModelSection): HydratedModelSection {
    const chartVars = [...(section.chartVars ?? [])];
    return {
      ...section,
      chartVars,
      variables: chartVars.map(resolveVariable),
      constants: normalizeConstantKeys(section).map(resolveConstant),
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
