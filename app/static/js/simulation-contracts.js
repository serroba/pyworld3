"use strict";
/**
 * Shared browser-side simulation contracts and preset resolution helpers.
 *
 * These types mirror the API shapes the UI already consumes, while keeping the
 * browser-native migration honest about request/response boundaries.
 */
function getPresetByName(name) {
    const preset = window.ModelData.presets.find((candidate) => candidate.name === name);
    if (!preset) {
        throw new Error(`Unknown preset '${name}'`);
    }
    return preset;
}
function buildSimulationRequestFromPreset(name, overrides = {}) {
    const preset = getPresetByName(name);
    const mergedConstants = {
        ...preset.constants,
        ...(overrides.constants || {}),
    };
    const request = {};
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
function resolveScenarioRequest(spec) {
    if (spec.preset) {
        return buildSimulationRequestFromPreset(spec.preset, spec.request);
    }
    return spec.request || {};
}
window.buildSimulationRequestFromPreset = buildSimulationRequestFromPreset;
window.resolveScenarioRequest = resolveScenarioRequest;
