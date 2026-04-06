/**
 * Cloudflare Worker entry point.
 *
 * Handles /api/* routes for the World3 simulation API, and falls through
 * to static assets for everything else (the SPA).
 */
import { ModelData } from "./model-data.js";
import { buildSimulationRequestFromPreset } from "./simulation-contracts.js";
import { createWorld3Core } from "./core/world3-core.js";
const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};
const LINK_HEADER = '</openapi.json>; rel="service-desc"; type="application/json", ' +
    '</agent.json>; rel="alternate"; type="application/json", ' +
    '</llm.txt>; rel="help"; title="LLM agent instructions"';
let coreInstance = null;
function getCore(env) {
    if (!coreInstance) {
        coreInstance = createWorld3Core(ModelData, async () => {
            const res = await env.ASSETS.fetch(new Request("https://placeholder/data/functions-table-world3.json"));
            if (!res.ok) {
                throw new Error(`Failed to load lookup tables: ${res.status}`);
            }
            return (await res.json());
        });
    }
    return coreInstance;
}
function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Link": LINK_HEADER,
            ...CORS_HEADERS,
        },
    });
}
function errorResponse(message, status = 400) {
    return jsonResponse({ error: message }, status);
}
/**
 * Validate that a value is a plain object with all-numeric values.
 * Throws a descriptive Error if the shape is invalid.
 */
export function validateConstantMap(value, fieldName) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error(`"${fieldName}" must be an object`);
    }
    for (const [k, v] of Object.entries(value)) {
        if (typeof v !== "number") {
            throw new Error(`"${fieldName}.${k}" must be a number`);
        }
    }
    return value;
}
/** Parse a JSON body into a SimulationRequest, omitting undefined keys. */
export function parseSimulationRequest(body) {
    const req = {};
    if (typeof body.year_min === "number")
        req.year_min = body.year_min;
    if (typeof body.year_max === "number")
        req.year_max = body.year_max;
    if (typeof body.dt === "number")
        req.dt = body.dt;
    if (typeof body.pyear === "number")
        req.pyear = body.pyear;
    if (typeof body.iphst === "number")
        req.iphst = body.iphst;
    if (body.constants !== undefined)
        req.constants = validateConstantMap(body.constants, "constants");
    if (body.output_variables)
        req.output_variables = body.output_variables;
    if (typeof body.diverge_year === "number")
        req.diverge_year = body.diverge_year;
    if (body.base_constants !== undefined) {
        req.base_constants = validateConstantMap(body.base_constants, "base_constants");
    }
    else if (req.diverge_year !== undefined) {
        // Default to empty map so the engine enables divergence (base = model defaults).
        req.base_constants = {};
    }
    return req;
}
/**
 * Resolve a raw API body into a SimulationRequest, handling presets and diverge_year.
 * Exported for testing — this is the single source of truth for request resolution.
 */
export function resolveApiRequest(body) {
    const req = parseSimulationRequest(body);
    if (typeof body.preset === "string") {
        if (req.diverge_year !== undefined) {
            // When diverging with a preset: the preset runs until diverge_year,
            // then user's constant overrides kick in.
            const presetOnly = { ...req };
            delete presetOnly.constants;
            delete presetOnly.diverge_year;
            delete presetOnly.base_constants;
            const simRequest = buildSimulationRequestFromPreset(ModelData, body.preset, presetOnly);
            const presetInfo = ModelData.presets.find((p) => p.name === body.preset);
            // "after" constants = preset constants + user overrides
            simRequest.constants = { ...presetInfo?.constants, ...req.constants };
            // "before" constants = preset constants (or explicit base_constants)
            if (req.base_constants !== undefined) {
                simRequest.base_constants = req.base_constants;
            }
            else {
                simRequest.base_constants = presetInfo?.constants ?? {};
            }
            simRequest.diverge_year = req.diverge_year;
            return simRequest;
        }
        return buildSimulationRequestFromPreset(ModelData, body.preset, req);
    }
    return req;
}
async function handleSimulate(request, env) {
    let body = {};
    if (request.body) {
        try {
            body = (await request.json());
        }
        catch {
            return errorResponse("Invalid JSON body");
        }
    }
    let simRequest;
    try {
        simRequest = resolveApiRequest(body);
    }
    catch (err) {
        return errorResponse(err instanceof Error ? err.message : String(err));
    }
    const core = getCore(env);
    const result = await core.runtime.simulate(simRequest);
    // Filter series to requested output_variables (or defaults)
    const requested = simRequest.output_variables ?? ModelData.defaultVariables;
    const filtered = {};
    for (const key of requested) {
        if (result.series[key]) {
            filtered[key] = result.series[key];
        }
    }
    return jsonResponse({ ...result, series: filtered });
}
function handlePresets() {
    return jsonResponse({
        presets: ModelData.presets,
        constant_defaults: ModelData.constantDefaults,
        constant_constraints: ModelData.constantConstraints,
        constant_meta: ModelData.constantMeta,
        variable_meta: ModelData.variableMeta,
        default_variables: ModelData.defaultVariables,
        scenario_control_defaults: ModelData.scenarioControlDefaults,
        scenario_control_constraints: ModelData.scenarioControlConstraints,
    });
}
export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        // CORS preflight
        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }
        if (url.pathname === "/api/simulate" && request.method === "POST") {
            return handleSimulate(request, env);
        }
        if (url.pathname === "/api/presets" && request.method === "GET") {
            return handlePresets();
        }
        // Fall through to static assets — add discovery headers for agents
        const response = await env.ASSETS.fetch(request);
        const headers = new Headers(response.headers);
        headers.set("Link", LINK_HEADER);
        return new Response(response.body, { status: response.status, headers });
    },
};
