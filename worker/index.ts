/**
 * Cloudflare Worker entry point.
 *
 * Handles /api/* routes for the World3 simulation API, and falls through
 * to static assets for everything else (the SPA).
 */

import { ModelData } from "../app/ts/model-data.js";
import { buildSimulationRequestFromPreset } from "../app/ts/simulation-contracts.js";
import type { ConstantMap, SimulationRequest } from "../app/ts/simulation-contracts.js";
import { createWorld3Core } from "../app/ts/core/world3-core.js";
import type { World3VariableKey } from "../app/ts/core/world3-keys.js";
import type { RawLookupTable } from "../app/ts/core/world3-tables.js";

type Env = {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const LINK_HEADER =
  '</openapi.json>; rel="service-desc"; type="application/json", ' +
  '</agent.json>; rel="alternate"; type="application/json", ' +
  '</llm.txt>; rel="help"; title="LLM agent instructions"';

let coreInstance: ReturnType<typeof createWorld3Core> | null = null;

function getCore(env: Env): ReturnType<typeof createWorld3Core> {
  if (!coreInstance) {
    coreInstance = createWorld3Core(ModelData, async () => {
      const res = await env.ASSETS.fetch(
        new Request("https://placeholder/data/functions-table-world3.json"),
      );
      if (!res.ok) {
        throw new Error(`Failed to load lookup tables: ${res.status}`);
      }
      return (await res.json()) as RawLookupTable[];
    });
  }
  return coreInstance;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Link": LINK_HEADER,
      ...CORS_HEADERS,
    },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

/**
 * Validate that a value is a plain object with all-numeric values.
 * Throws a descriptive Error if the shape is invalid.
 */
function validateConstantMap(value: unknown, fieldName: string): ConstantMap {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`"${fieldName}" must be an object`);
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v !== "number") {
      throw new Error(`"${fieldName}.${k}" must be a number`);
    }
  }
  return value as ConstantMap;
}

/** Parse a JSON body into a SimulationRequest, omitting undefined keys. */
function parseSimulationRequest(body: Record<string, unknown>): SimulationRequest {
  const req: SimulationRequest = {};
  if (typeof body.year_min === "number") req.year_min = body.year_min;
  if (typeof body.year_max === "number") req.year_max = body.year_max;
  if (typeof body.dt === "number") req.dt = body.dt;
  if (typeof body.pyear === "number") req.pyear = body.pyear;
  if (typeof body.iphst === "number") req.iphst = body.iphst;
  if (body.constants !== undefined) req.constants = validateConstantMap(body.constants, "constants");
  if (body.output_variables) req.output_variables = body.output_variables as World3VariableKey[];
  if (typeof body.diverge_year === "number") req.diverge_year = body.diverge_year;
  if (body.base_constants !== undefined) {
    req.base_constants = validateConstantMap(body.base_constants, "base_constants");
  } else if (req.diverge_year !== undefined) {
    // Default to empty map so the engine enables divergence (base = model defaults).
    req.base_constants = {};
  }
  return req;
}

async function handleSimulate(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown> = {};
  if (request.body) {
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return errorResponse("Invalid JSON body");
    }
  }

  let req: SimulationRequest;
  try {
    req = parseSimulationRequest(body);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : String(err));
  }

  let simRequest: SimulationRequest;
  if (typeof body.preset === "string") {
    try {
      simRequest = buildSimulationRequestFromPreset(ModelData, body.preset, req);
    } catch (err) {
      return errorResponse(
        err instanceof Error ? err.message : "Invalid preset",
      );
    }
  } else {
    simRequest = req;
  }

  const core = getCore(env);
  const result = await core.runtime.simulate(simRequest);

  // Filter series to requested output_variables (or defaults)
  const requested = simRequest.output_variables ?? ModelData.defaultVariables;
  const filtered: typeof result.series = {};
  for (const key of requested) {
    if (result.series[key]) {
      filtered[key] = result.series[key];
    }
  }

  return jsonResponse({ ...result, series: filtered });
}

function handlePresets(): Response {
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
  async fetch(request: Request, env: Env): Promise<Response> {
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
