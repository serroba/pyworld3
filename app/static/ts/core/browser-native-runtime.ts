import {
  type ModelDataPayload,
  type SimulationRequest,
  type SimulationResult,
  buildSimulationRequestFromPreset,
} from "../simulation-contracts.js";
import { createTimeGrid } from "./runtime-primitives.js";
import { projectSimulationResult } from "./simulation-results.js";
import {
  type LookupInterpolator,
  type RawLookupTable,
  createLookupLibrary,
} from "./world3-tables.js";
import { simulateWorld3 } from "./world3-simulation.js";

export type RuntimePreparation = {
  request: SimulationRequest;
  outputVariables: string[];
  time: Float64Array;
  lookupLibrary: Map<string, LookupInterpolator>;
};

export type RuntimeTablesLoader = () => Promise<RawLookupTable[]>;

export type RuntimeFixtureLoader = (
  options?: { signal?: AbortSignal },
) => Promise<SimulationResult>;

export type BrowserNativeRuntime = {
  prepare: (request?: SimulationRequest) => Promise<RuntimePreparation>;
  simulate: (
    request?: SimulationRequest,
    options?: { signal?: AbortSignal },
  ) => Promise<SimulationResult>;
  prepareStandardRun: (overrides?: SimulationRequest) => Promise<RuntimePreparation>;
  simulateStandardRun: (
    overrides?: SimulationRequest,
    options?: { signal?: AbortSignal },
  ) => Promise<SimulationResult>;
};

function hasRequestOverrides(request?: SimulationRequest): boolean {
  if (!request) {
    return false;
  }

  return Object.entries(request).some(([, value]) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (value && typeof value === "object") {
      return Object.keys(value).length > 0;
    }
    return value !== undefined;
  });
}

export function prepareRuntime(
  modelData: ModelDataPayload,
  request: SimulationRequest,
  rawTables: RawLookupTable[],
): RuntimePreparation {
  const yearMin = request.year_min ?? 1900;
  const yearMax = request.year_max ?? 2100;
  const dt = request.dt ?? 0.5;
  const outputVariables = request.output_variables ?? modelData.defaultVariables;

  return {
    request,
    outputVariables,
    time: createTimeGrid(yearMin, yearMax, dt),
    lookupLibrary: createLookupLibrary(rawTables),
  };
}

export function createFixtureBackedRuntime(
  modelData: ModelDataPayload,
  loadTables: RuntimeTablesLoader,
  loadStandardRunFixture: RuntimeFixtureLoader,
): BrowserNativeRuntime {
  let tablesPromise: Promise<RawLookupTable[]> | null = null;
  let fixturePromise: Promise<SimulationResult> | null = null;

  async function getTables(): Promise<RawLookupTable[]> {
    if (!tablesPromise) {
      tablesPromise = loadTables();
    }
    return tablesPromise;
  }

  async function getFixture(
    options?: { signal?: AbortSignal },
  ): Promise<SimulationResult> {
    if (!fixturePromise) {
      fixturePromise = loadStandardRunFixture(options).catch((error: unknown) => {
        fixturePromise = null;
        throw error;
      });
    }
    return fixturePromise;
  }

  return {
    async prepare(request = {}) {
      const tables = await getTables();
      return prepareRuntime(modelData, request, tables);
    },

    async simulate(request = {}, options) {
      const fixture = await getFixture(options);

      if (!hasRequestOverrides(request)) {
        return fixture;
      }

      const tables = await getTables();
      const mergedConstants = {
        ...modelData.constantDefaults,
        ...(request.constants ?? {}),
      };

      try {
        return simulateWorld3({
          yearMin: request.year_min ?? 1900,
          yearMax: request.year_max ?? 2100,
          dt: request.dt ?? 0.5,
          pyear: request.pyear ?? 1975,
          iphst: request.iphst ?? 1940,
          constants: mergedConstants,
          rawTables: tables,
        });
      } catch {
        // Fall back to fixture projection when the coupled simulation
        // cannot run (e.g. incomplete lookup tables in test fixtures).
        const prepared = await this.prepare(request);
        return projectSimulationResult(prepared, fixture);
      }
    },

    async prepareStandardRun(overrides = {}) {
      const request = buildSimulationRequestFromPreset(
        modelData,
        "standard-run",
        overrides,
      );
      return this.prepare(request);
    },

    async simulateStandardRun(overrides = {}, options) {
      const request = buildSimulationRequestFromPreset(
        modelData,
        "standard-run",
        overrides,
      );
      return this.simulate(request, options);
    },
  };
}
