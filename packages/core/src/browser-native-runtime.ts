import {
  type ModelDataPayload,
  type SimulationRequest,
  type SimulationResult,
  buildSimulationRequestFromPreset,
} from "./simulation-contracts.js";
import {
  type RawLookupTable,
} from "./world3-tables.js";
import { simulateWorld3 } from "./world3-simulation.js";

export type RuntimeTablesLoader = () => Promise<RawLookupTable[]>;

export type BrowserNativeRuntime = {
  simulate: (
    request?: SimulationRequest,
    options?: { signal?: AbortSignal },
  ) => Promise<SimulationResult>;
  simulateStandardRun: (
    overrides?: SimulationRequest,
    options?: { signal?: AbortSignal },
  ) => Promise<SimulationResult>;
};

export function createSimulationRuntime(
  modelData: ModelDataPayload,
  loadTables: RuntimeTablesLoader,
): BrowserNativeRuntime {
  let tablesPromise: Promise<RawLookupTable[]> | null = null;

  async function getTables(): Promise<RawLookupTable[]> {
    if (!tablesPromise) {
      tablesPromise = loadTables();
    }
    return tablesPromise;
  }

  async function runSimulation(request: SimulationRequest): Promise<SimulationResult> {
    const tables = await getTables();
    const mergedConstants = {
      ...modelData.constantDefaults,
      ...(request.constants ?? {}),
    };

    const simOptions: Parameters<typeof simulateWorld3>[0] = {
      yearMin: request.year_min ?? 1900,
      yearMax: request.year_max ?? 2100,
      dt: request.dt ?? 0.5,
      pyear: request.pyear ?? 1975,
      iphst: request.iphst ?? 1940,
      constants: mergedConstants,
      rawTables: tables,
    };
    if (request.diverge_year !== undefined) {
      simOptions.divergeYear = request.diverge_year;
      simOptions.baseConstants = {
        ...modelData.constantDefaults,
        ...request.base_constants,
      };
    }
    return simulateWorld3(simOptions);
  }

  return {
    async simulate(request = {}) {
      return runSimulation(request);
    },

    async simulateStandardRun(overrides = {}) {
      const request = buildSimulationRequestFromPreset(
        modelData,
        "standard-run",
        overrides,
      );
      return runSimulation(request);
    },
  };
}
