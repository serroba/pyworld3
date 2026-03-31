import { ModelData } from "./model-data.js";
function resolveVariable(key) {
    const meta = ModelData.variableMeta[key];
    if (!meta) {
        throw new Error(`Unknown World3 variable: ${key}`);
    }
    return { key, meta };
}
function resolveConstant(key) {
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
function normalizeConstantKeys(section) {
    if (Array.isArray(section.constantKeys)) {
        return section.constantKeys;
    }
    return (section.constants ?? []).map((item) => typeof item === "string" ? item : item.key);
}
export const ModelDomain = {
    resolveVariable,
    resolveConstant,
    hydrateSection(section) {
        const chartVars = [...(section.chartVars ?? [])];
        return {
            ...section,
            chartVars,
            variables: chartVars.map(resolveVariable),
            constants: normalizeConstantKeys(section).map(resolveConstant),
        };
    },
    hydrateExplainer(explainer) {
        const variableKeys = [...(explainer.variables ?? [])];
        return {
            ...explainer,
            variables: variableKeys.map(resolveVariable),
        };
    },
};
window.ModelDomain = ModelDomain;
