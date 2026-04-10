/**
 * Cloudflare Worker entry point.
 *
 * Handles /api/* routes for the World3 simulation API, and falls through
 * to static assets for everything else (the SPA).
 */

import { ModelData } from "./model-data.js";
import { buildSimulationRequestFromPreset } from "./simulation-contracts.js";
import type { ConstantMap, SimulationRequest } from "./simulation-contracts.js";
import { createWorld3Core } from "./core/world3-core.js";
import type { World3VariableKey } from "./core/world3-keys.js";
import type { RawLookupTable } from "./core/world3-tables.js";

type Env = {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
};

// ─── Per-route meta injection ─────────────────────────────────────────────────

const BASE_URL = "https://limits.world";

type RouteMeta = {
  title: string;
  description: string;
  ogDescription: string;
};

const ROUTE_META: Record<string, RouteMeta> = {
  "/": {
    title: "World3 Simulator — Will civilization collapse by 2100?",
    description:
      "Run the 1972 MIT model that predicted overshoot. Change policy years, compare collapse vs. stabilisation scenarios, and watch how population, resources, and pollution interact through 2100. Free, no login.",
    ogDescription:
      "The 1972 MIT model that predicted overshoot. Run it yourself — compare collapse vs. stabilisation scenarios and see how population, resources, and pollution interact through 2100.",
  },
  "/model": {
    title: "How World3 Works — Model Explained | World3 Simulator",
    description:
      "Deep dive into the World3 model: population, resources, pollution, food, technology, and AI scaling. Equations, assumptions, and policy scenarios explained.",
    ogDescription:
      "Explore how the World3 model simulates population, resources, pollution, food, technology, and AI's environmental impact — with equations and interactive charts.",
  },
  "/explore": {
    title: "Explore World3 Scenarios | World3 Simulator",
    description:
      "Explore World3 scenarios interactively. See how population, industrial output, resources, pollution, and food per capita evolve through 2100 under different assumptions.",
    ogDescription:
      "Run World3 scenarios and watch population, resources, pollution, and food interact through 2100.",
  },
  "/compare": {
    title: "Compare World3 Scenarios | World3 Simulator",
    description:
      "Compare two World3 scenarios side by side — standard run vs optimistic technology, AI scaling, comprehensive policy, or custom parameters.",
    ogDescription:
      "Compare any two World3 scenarios side by side and see how different assumptions change the trajectory to 2100.",
  },
  "/advanced": {
    title: "Advanced Parameters | World3 Simulator",
    description:
      "Fine-tune every World3 model parameter — from resource endowment to pollution half-life — and run fully custom simulations.",
    ogDescription:
      "Adjust every World3 parameter and run fully custom simulations.",
  },
  "/faq": {
    title: "FAQ | World3 Simulator",
    description:
      "Frequently asked questions about the World3 simulator, The Limits to Growth model, and how to interpret the results.",
    ogDescription:
      "Common questions about World3, The Limits to Growth, and how to read the simulation results.",
  },
  "/history": {
    title: "History of World3 | World3 Simulator",
    description:
      "The history of the World3 model — from the 1972 Club of Rome report to the 30-year update, modern recalibration, and AI extensions.",
    ogDescription:
      "From the 1972 Club of Rome report to modern recalibration and AI extensions — the history of World3.",
  },
  "/calibrate": {
    title: "Calibrate World3 | World3 Simulator",
    description:
      "Compare World3 simulation output against historical empirical data from 1900 to 2023. See how well the model tracks real-world population, CO₂, and more.",
    ogDescription:
      "See how the World3 model tracks real-world data for population, CO₂, and other indicators from 1900 to 2023.",
  },
  "/developers": {
    title: "Developer API | World3 Simulator",
    description:
      "World3 simulation API for developers — run simulations, fetch presets, and retrieve time series data via a simple JSON API.",
    ogDescription:
      "Run World3 simulations programmatically via a simple JSON API. Free, no auth required.",
  },
  "/what-is-world3": {
    title: "What is World3? | World3 Simulator",
    description:
      "World3 is the 1972 MIT system dynamics model from The Limits to Growth. Learn how it works, what it predicts, and why its findings remain relevant today.",
    ogDescription:
      "The 1972 MIT model that simulated civilisation's trajectory. What World3 is, how it works, and what it found.",
  },
  "/limits-to-growth-model": {
    title: "The Limits to Growth Model | World3 Simulator",
    description:
      "The Limits to Growth (1972) used World3 to simulate civilisation's trajectory. Explore the model's findings, methodology, and 50-year legacy.",
    ogDescription:
      "How The Limits to Growth (1972) used World3 to model civilisation's trajectory — findings, methodology, and legacy.",
  },
  "/world3-scenarios": {
    title: "World3 Scenarios | World3 Simulator",
    description:
      "Run and compare World3 scenarios: standard run, optimistic technology, comprehensive policy, AI scaling, and more.",
    ogDescription:
      "Standard run, optimistic technology, comprehensive policy, AI scaling — explore all World3 scenarios.",
  },
};

/** Locale prefixes that appear in the URL path (English is the default, no prefix). */
const LOCALE_PREFIXES = new Set([
  "es", "pt-BR", "pt-PT", "fr", "de", "it", "nl", "hu", "pl", "tr",
  "ru", "uk", "ar", "hi", "bn", "id", "vi", "th", "ja", "zh-CN", "zh-TW",
]);

/** Strip locale prefix from a pathname and return the canonical base route. */
export function getBaseRoute(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  const first = parts[0];
  if (first !== undefined && LOCALE_PREFIXES.has(first)) {
    const rest = parts.slice(1).join("/");
    return rest ? `/${rest}` : "/";
  }
  return pathname || "/";
}

/** Replace per-page meta in the index.html HTML string. */
export function injectRouteMeta(html: string, meta: RouteMeta, canonicalUrl: string): string {
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/,  `$1${meta.description}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/,  `$1${meta.title}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/,  `$1${meta.ogDescription}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/,  `$1${canonicalUrl}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/,  `$1${meta.title}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/,  `$1${meta.description}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/,  `$1${canonicalUrl}$2`);
}

// ─────────────────────────────────────────────────────────────────────────────

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
export function validateConstantMap(value: unknown, fieldName: string): ConstantMap {
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
export function parseSimulationRequest(body: Record<string, unknown>): SimulationRequest {
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

/**
 * Resolve a raw API body into a SimulationRequest, handling presets and diverge_year.
 * Exported for testing — this is the single source of truth for request resolution.
 */
export function resolveApiRequest(body: Record<string, unknown>): SimulationRequest {
  const req = parseSimulationRequest(body);

  if (typeof body.preset === "string") {
    if (req.diverge_year !== undefined) {
      // When diverging with a preset: the preset runs until diverge_year,
      // then user's constant overrides kick in.
      const presetOnly: SimulationRequest = { ...req };
      delete presetOnly.constants;
      delete (presetOnly as Record<string, unknown>).diverge_year;
      delete (presetOnly as Record<string, unknown>).base_constants;
      const simRequest = buildSimulationRequestFromPreset(ModelData, body.preset, presetOnly);
      const presetInfo = ModelData.presets.find((p) => p.name === body.preset);
      // "after" constants = preset constants + user overrides
      simRequest.constants = { ...presetInfo?.constants, ...req.constants };
      // "before" constants = preset constants (or explicit base_constants)
      if (req.base_constants !== undefined) {
        simRequest.base_constants = req.base_constants;
      } else {
        simRequest.base_constants = presetInfo?.constants ?? {};
      }
      simRequest.diverge_year = req.diverge_year;
      return simRequest;
    }
    return buildSimulationRequestFromPreset(ModelData, body.preset, req);
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

  let simRequest: SimulationRequest;
  try {
    simRequest = resolveApiRequest(body);
  } catch (err) {
    console.error("Failed to resolve API request", err);
    return errorResponse("Invalid simulation request");
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

    // Inject per-route meta tags into HTML responses
    const contentType = response.headers.get("Content-Type") ?? "";
    if (contentType.includes("text/html")) {
      const baseRoute = getBaseRoute(url.pathname);
      const meta = ROUTE_META[baseRoute];
      if (meta) {
        const canonicalUrl = `${BASE_URL}${url.pathname === "/" ? "" : url.pathname}` || BASE_URL;
        const html = await response.text();
        const transformed = injectRouteMeta(html, meta, canonicalUrl);
        headers.set("Content-Type", "text/html; charset=utf-8");
        return new Response(transformed, { status: response.status, headers });
      }
    }

    return new Response(response.body, { status: response.status, headers });
  },
};
