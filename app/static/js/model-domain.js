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
        label: meta.full_name,
        unit: meta.unit,
        defaultValue: ModelData.constantDefaults[key],
        source: "constant",
    };
}
const REQUEST_FIELD_DEFINITIONS = {
    pyear: {
        label: "Policy implementation year",
        unit: "year",
        defaultValue: 1975,
    },
    iphst: {
        label: "Health services impact delay start",
        unit: "year",
        defaultValue: 1940,
    },
};
function resolveRequestField(key) {
    const definition = REQUEST_FIELD_DEFINITIONS[key];
    if (!definition) {
        throw new Error(`Unknown World3 request field: ${key}`);
    }
    return {
        key,
        label: definition.label,
        unit: definition.unit,
        defaultValue: definition.defaultValue,
        source: "request",
    };
}
function normalizeConstantKeys(constantKeys, legacyConstants) {
    if (Array.isArray(constantKeys)) {
        return constantKeys;
    }
    return (legacyConstants ?? []).map((item) => typeof item === "string" ? item : item.key);
}
export const ModelDomain = {
    resolveVariable,
    resolveConstant,
    resolveRequestField,
    hydrateSection(section) {
        const { chartVars: rawChartVars, constantKeys, requestKeys, constants: legacyConstants, ...rest } = section;
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
    hydrateExplainer(explainer) {
        const variableKeys = [...(explainer.variables ?? [])];
        return {
            ...explainer,
            variables: variableKeys.map(resolveVariable),
        };
    },
};
window.ModelDomain = ModelDomain;
