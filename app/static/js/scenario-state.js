function toBase64Url(value) {
    const bytes = new TextEncoder().encode(value);
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}
function fromBase64Url(value) {
    const padding = (4 - (value.length % 4 || 4)) % 4;
    const padded = `${value}${"=".repeat(padding)}`
        .replace(/-/g, "+")
        .replace(/_/g, "/");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}
function isSafeScenarioKey(key) {
    return key !== "__proto__" && key !== "constructor" && key !== "prototype";
}
function sortNumericRecord(record) {
    if (!record || Object.keys(record).length === 0) {
        return undefined;
    }
    return Object.fromEntries(Object.entries(record)
        .filter(([key, value]) => isSafeScenarioKey(key) && Number.isFinite(value))
        .sort(([left], [right]) => left.localeCompare(right)));
}
export function normalizeSavedScenarioState(state) {
    const normalized = {};
    const constants = sortNumericRecord(state.constants);
    const controls = sortNumericRecord(state.controls);
    if (state.preset) {
        normalized.preset = state.preset;
    }
    if (state.view) {
        normalized.view = state.view;
    }
    if (constants) {
        normalized.constants = constants;
    }
    if (controls) {
        normalized.controls = controls;
    }
    return normalized;
}
export function encodeSavedScenarioState(state) {
    return toBase64Url(JSON.stringify(normalizeSavedScenarioState(state)));
}
export function decodeSavedScenarioState(value) {
    if (!value) {
        return null;
    }
    try {
        const parsed = JSON.parse(fromBase64Url(value));
        return normalizeSavedScenarioState(parsed);
    }
    catch {
        return null;
    }
}
export function buildAdvancedScenarioHash(state) {
    const normalized = normalizeSavedScenarioState(state);
    const params = new URLSearchParams();
    if (normalized.preset) {
        params.set("preset", normalized.preset);
    }
    if (normalized.view) {
        params.set("view", normalized.view);
    }
    if (normalized.constants || normalized.controls) {
        params.set("state", encodeSavedScenarioState(normalized));
    }
    const query = params.toString();
    return query ? `#advanced?${query}` : "#advanced";
}
export function savedScenarioStateToRequest(state) {
    const request = {};
    const controls = state.controls ?? {};
    if (controls.year_min !== undefined) {
        request.year_min = controls.year_min;
    }
    if (controls.year_max !== undefined) {
        request.year_max = controls.year_max;
    }
    if (controls.dt !== undefined) {
        request.dt = controls.dt;
    }
    if (controls.pyear !== undefined) {
        request.pyear = controls.pyear;
    }
    if (controls.iphst !== undefined) {
        request.iphst = controls.iphst;
    }
    if (state.constants && Object.keys(state.constants).length > 0) {
        request.constants = { ...state.constants };
    }
    return request;
}
export function buildCompareScenarioHash(params) {
    const query = new URLSearchParams();
    query.set("a", params.leftPreset || "standard-run");
    if (params.rightState) {
        query.set("bpreset", params.rightPreset || params.rightState.preset || "standard-run");
        query.set("bscenario", encodeSavedScenarioState(params.rightState));
    }
    else {
        query.set("b", params.rightPreset || "standard-run");
    }
    return `#compare?${query.toString()}`;
}
window.ScenarioState = {
    encodeSavedScenarioState,
    decodeSavedScenarioState,
    buildAdvancedScenarioHash,
    buildCompareScenarioHash,
    normalizeSavedScenarioState,
    savedScenarioStateToRequest,
};
