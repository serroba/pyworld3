/**
 * Cloudflare Worker entry point.
 *
 * Handles /api/* routes for the World3 simulation API, and falls through
 * to static assets for everything else (the SPA).
 */

import { ModelData } from "../app/static/ts/model-data.js";
import { buildSimulationRequestFromPreset } from "../app/static/ts/simulation-contracts.js";
import type { SimulationRequest } from "../app/static/ts/simulation-contracts.js";
import { simulateWorld3 } from "../app/static/ts/core/world3-simulation.js";
import type { RawLookupTable } from "../app/static/ts/core/world3-tables.js";

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

let tablesCache: RawLookupTable[] | null = null;

async function loadTables(env: Env): Promise<RawLookupTable[]> {
  if (tablesCache) return tablesCache;
  const res = await env.ASSETS.fetch(
    new Request("https://placeholder/data/functions-table-world3.json"),
  );
  if (!res.ok) {
    throw new Error(`Failed to load lookup tables: ${res.status}`);
  }
  tablesCache = (await res.json()) as RawLookupTable[];
  return tablesCache;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
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

  // Build request, omitting undefined keys (exactOptionalPropertyTypes)
  const req: SimulationRequest = {};
  if (typeof body.year_min === "number") req.year_min = body.year_min;
  if (typeof body.year_max === "number") req.year_max = body.year_max;
  if (typeof body.dt === "number") req.dt = body.dt;
  if (typeof body.pyear === "number") req.pyear = body.pyear;
  if (typeof body.iphst === "number") req.iphst = body.iphst;
  if (body.constants) req.constants = body.constants as SimulationRequest["constants"];
  if (body.output_variables) req.output_variables = body.output_variables as SimulationRequest["output_variables"];

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

  const tables = await loadTables(env);

  const mergedConstants = {
    ...ModelData.constantDefaults,
    ...(simRequest.constants ?? {}),
  };

  const result = simulateWorld3({
    yearMin: simRequest.year_min ?? 1900,
    yearMax: simRequest.year_max ?? 2100,
    dt: simRequest.dt ?? 0.5,
    pyear: simRequest.pyear ?? 1975,
    iphst: simRequest.iphst ?? 1940,
    constants: mergedConstants,
    rawTables: tables,
  });

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

    // Fall through to static assets
    return env.ASSETS.fetch(request);
  },
};
