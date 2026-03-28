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
function resolveScenarioRequest(spec) {
    if (spec.preset) {
        return buildSimulationRequestFromPreset(spec.preset, spec.request);
    }
    return spec.request || {};
}
