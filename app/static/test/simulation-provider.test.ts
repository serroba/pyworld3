import { beforeEach, describe, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { SimulationProviderApi } from "../ts/simulation-provider.ts";
import type { RawLookupTable } from "../ts/core/world3-tables.ts";

function loadTablesFixture(): RawLookupTable[] {
  const raw = readFileSync(
    resolve(__dirname, "../data/functions-table-world3.json"),
    "utf-8",
  );
  return JSON.parse(raw) as RawLookupTable[];
}

const world3TablesFixture = loadTablesFixture();

type TestWindow = Window &
  typeof globalThis & {
    SimulationProvider?: SimulationProviderApi;
  };

function mockLocalFetch() {
  vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
    if (input === "http://localhost:3000/data/functions-table-world3.json") {
      return {
        ok: true,
        json: async () => world3TablesFixture,
      } as Response;
    }

    if (input === "http://localhost:3000/data/owid-world-data.json") {
      return {
        ok: true,
        json: async () => ({
          entities: {
            World: {
              indicators: {
                pop_total: {
                  years: [1970],
                  values: [3.7e9],
                },
              },
            },
          },
        }),
      } as Response;
    }

    throw new Error(`Unexpected fetch input: ${String(input)}`);
  });
}

async function loadProviderSuite() {
  vi.resetModules();
  const modelData = await import("../ts/model-data.ts");
  const contracts = await import("../ts/simulation-contracts.ts");
  const provider = await import("../ts/simulation-provider.ts");
  const bridge = await import("../ts/browser-native.ts");
  return { ...modelData, ...contracts, ...provider, ...bridge };
}

describe("simulation provider", () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, "SimulationProvider");
    Reflect.deleteProperty(window, "resolveScenarioRequest");
    globalThis.fetch = vi.fn();
  });

  test("always creates the local provider", async () => {
    mockLocalFetch();
    const { ModelData, createSimulationProvider } = await loadProviderSuite();
    const simulationProvider = createSimulationProvider(ModelData);

    const result = await simulationProvider.simulatePreset("standard-run");

    expect(simulationProvider.mode).toBe("local");
    expect(result.series.pop).toBeDefined();
    expect(result.series.pop!.values[0]).toBeGreaterThan(1e9);
  });

  test("caches the tables fetch across multiple calls", async () => {
    mockLocalFetch();
    const { ModelData, createSimulationProvider } = await loadProviderSuite();
    const simulationProvider = createSimulationProvider(ModelData);

    await simulationProvider.simulatePreset("standard-run");
    await simulationProvider.simulate();

    // Only one fetch for tables
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  test("supports local preset execution beyond the standard run", async () => {
    mockLocalFetch();
    const { ModelData, createSimulationProvider } = await loadProviderSuite();
    const simulationProvider = createSimulationProvider(ModelData);

    const result = await simulationProvider.simulatePreset("doubled-resources");
    expect(result.series.pop).toBeDefined();
    expect(result.series.pop!.values[0]).toBeGreaterThan(1e9);
  });

  test("supports local simulate requests with explicit overrides", async () => {
    mockLocalFetch();
    const { ModelData, createSimulationProvider } = await loadProviderSuite();
    const simulationProvider = createSimulationProvider(ModelData);

    const result = await simulationProvider.simulate({
      constants: { len: 40 },
    });
    expect(result.series.pop).toBeDefined();
  });

  test("supports local compare requests", async () => {
    mockLocalFetch();
    const { ModelData, createSimulationProvider } =
      await loadProviderSuite();
    const simulationProvider = createSimulationProvider(ModelData);

    const compareResult = await simulationProvider.compare(
      { preset: "standard-run" },
      { preset: "doubled-resources" },
    );

    expect(compareResult.scenario_a).toBe("standard-run");
    expect(compareResult.scenario_b).toBe("doubled-resources");
    expect(compareResult.results_a.series.pop).toBeDefined();
    expect(compareResult.results_b.series.pop).toBeDefined();
    expect(compareResult.metrics.length).toBeGreaterThan(0);
  });

  test("browser-native bridge populates window globals", async () => {
    mockLocalFetch();
    const { ModelData } = await loadProviderSuite();

    expect(window.ModelData).toBe(ModelData);
    expect(window.buildSimulationRequestFromPreset("standard-run")).toEqual({});
    const result = await (window as TestWindow).SimulationProvider?.simulatePreset("standard-run");
    expect(result?.series.pop).toBeDefined();
  });
});
