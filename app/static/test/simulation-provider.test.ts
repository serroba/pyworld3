import { beforeEach, describe, expect, test, vi } from "vitest";
import type { SimulationProviderApi } from "../ts/simulation-provider.ts";

type MockSimulationResult = {
  year_min: number;
  year_max: number;
  dt: number;
  time: number[];
  constants_used: Record<string, number>;
  series: Record<string, { name: string; values: number[] }>;
};

function createApiMock() {
  return {
    simulatePreset: vi.fn<SimulationProviderApi["simulatePreset"]>(),
    simulate: vi.fn<SimulationProviderApi["simulate"]>(),
    compare: vi.fn<SimulationProviderApi["compare"]>(),
  };
}

type ApiMock = ReturnType<typeof createApiMock>;

type TestWindow = Window &
  typeof globalThis & {
    API?: ApiMock;
    SimulationProvider?: SimulationProviderApi;
  };

const world3TablesFixture = [
  {
    sector: "Population",
    "x.name": "LE",
    "x.values": [20, 40],
    "y.name": "M1",
    "y.values": [0.05, 0.03],
  },
];

const fixture: MockSimulationResult = {
  year_min: 1900,
  year_max: 2100,
  dt: 0.5,
  time: [1900, 1900.5],
  constants_used: {},
  series: {
    pop: { name: "pop", values: [1, 2] },
    nr: { name: "nr", values: [20, 19] },
    iopc: { name: "iopc", values: [3, 4] },
    fpc: { name: "fpc", values: [5, 6] },
    ppolx: { name: "ppolx", values: [7, 8] },
    nrfr: { name: "nrfr", values: [9, 10] },
    le: { name: "le", values: [11, 12] },
  },
};

function mockLocalFetch() {
  vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
    if (input === "/data/functions-table-world3.json") {
      return {
        ok: true,
        json: async () => world3TablesFixture,
      } as Response;
    }

    if (input === "/data/standard-run-explore.json") {
      return {
        ok: true,
        json: async () => fixture,
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
    Reflect.deleteProperty(window, "__PYWORLD3_PROVIDER_MODE__");
    Reflect.deleteProperty(window, "SimulationProvider");
    Reflect.deleteProperty(window, "resolveScenarioRequest");
    (window as TestWindow).API = createApiMock();
    globalThis.fetch = vi.fn();
  });

  test("defaults to the local provider and loads browser assets", async () => {
    mockLocalFetch();
    const { ModelData, createSimulationProvider } = await loadProviderSuite();
    const simulationProvider = createSimulationProvider(ModelData);

    const result = await simulationProvider.simulatePreset("standard-run");

    expect(simulationProvider.mode).toBe("local");
    expect(result).toEqual(fixture);
  });

  test("delegates API calls in explicit HTTP mode", async () => {
    window.__PYWORLD3_PROVIDER_MODE__ = "http";
    const api = (window as TestWindow).API!;
    api.simulatePreset.mockResolvedValue(fixture);
    const { ModelData, createSimulationProvider } = await loadProviderSuite();
    const simulationProvider = createSimulationProvider(ModelData);

    const result = await simulationProvider.simulatePreset("standard-run");

    expect(simulationProvider.mode).toBe("http");
    expect(api.simulatePreset).toHaveBeenCalledWith(
      "standard-run",
      undefined,
    );
    expect(result).toEqual(fixture);
  });

  test("delegates generic simulate and compare calls in explicit HTTP mode", async () => {
    window.__PYWORLD3_PROVIDER_MODE__ = "http";
    const api = (window as TestWindow).API!;
    api.simulate.mockResolvedValue(fixture);
    api.compare.mockResolvedValue({
      scenario_a: "standard-run",
      scenario_b: "custom",
      results_a: fixture,
      results_b: fixture,
      metrics: [],
    });
    const signal = new AbortController().signal;

    const { ModelData, createSimulationProvider } = await loadProviderSuite();
    const simulationProvider = createSimulationProvider(ModelData);

    await expect(
      simulationProvider.simulate({ output_variables: ["pop"] }, { signal }),
    ).resolves.toEqual(fixture);
    await expect(
      simulationProvider.compare(
        { preset: "standard-run" },
        { request: { year_max: 2050 } },
      ),
    ).resolves.toEqual({
      scenario_a: "standard-run",
      scenario_b: "custom",
      results_a: fixture,
      results_b: fixture,
      metrics: [],
    });

    expect(api.simulate).toHaveBeenCalledWith(
      { output_variables: ["pop"] },
      { signal },
    );
    expect(api.compare).toHaveBeenCalledWith(
      { preset: "standard-run" },
      { request: { year_max: 2050 } },
    );
  });

  test("serves the local standard-run fixture and caches the fetch", async () => {
    window.__PYWORLD3_PROVIDER_MODE__ = "local";
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => world3TablesFixture,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => fixture,
      } as Response);

    const { ModelData, createSimulationProvider } = await loadProviderSuite();
    const simulationProvider = createSimulationProvider(ModelData);

    const first = await simulationProvider.simulatePreset("standard-run");
    const second = await simulationProvider.simulate();

    expect(simulationProvider.mode).toBe("local");
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(first).toEqual(fixture);
    expect(second).toEqual(fixture);
  });

  test("passes through an abort signal for the local fixture fetch", async () => {
    window.__PYWORLD3_PROVIDER_MODE__ = "local";
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => world3TablesFixture,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => fixture,
      } as Response);
    const signal = new AbortController().signal;

    const { ModelData, createSimulationProvider } = await loadProviderSuite();
    const simulationProvider = createSimulationProvider(ModelData);

    await expect(
      simulationProvider.simulate(undefined, { signal }),
    ).resolves.toEqual(fixture);
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      "/data/functions-table-world3.json",
      {},
    );
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      "/data/standard-run-explore.json",
      { signal },
    );
  });

  test("supports local preset execution beyond the standard run", async () => {
    window.__PYWORLD3_PROVIDER_MODE__ = "local";
    mockLocalFetch();
    const { ModelData, createSimulationProvider } = await loadProviderSuite();
    const simulationProvider = createSimulationProvider(ModelData);

    await expect(
      simulationProvider.simulatePreset("doubled-resources", {
        year_min: 1900,
        year_max: 1900.5,
        dt: 0.5,
        output_variables: ["pop"],
      }),
    ).resolves.toMatchObject({
      series: {
        pop: { name: "pop", values: [1, 2] },
      },
    });
  });

  test("supports local simulate requests with explicit overrides", async () => {
    window.__PYWORLD3_PROVIDER_MODE__ = "local";
    mockLocalFetch();
    const { ModelData, createSimulationProvider } = await loadProviderSuite();
    const simulationProvider = createSimulationProvider(ModelData);

    await expect(
      simulationProvider.simulate({
        year_min: 1900,
        year_max: 1900.5,
        dt: 0.5,
        output_variables: ["pop"],
      }),
    ).resolves.toMatchObject({
      series: {
        pop: { name: "pop", values: [1, 2] },
      },
    });
  });

  test("supports local preset constant overrides", async () => {
    window.__PYWORLD3_PROVIDER_MODE__ = "local";
    mockLocalFetch();
    const { ModelData, createSimulationProvider } = await loadProviderSuite();
    const simulationProvider = createSimulationProvider(ModelData);

    await expect(
      simulationProvider.simulatePreset("standard-run", {
        year_min: 1900,
        year_max: 1900.5,
        dt: 0.5,
        constants: { nri: 2_000_000_000_000 },
        output_variables: ["pop"],
      }),
    ).resolves.toMatchObject({
      series: {
        pop: { name: "pop", values: [1, 2] },
      },
    });
  });

  test("supports local compare requests after resolving their shapes", async () => {
    window.__PYWORLD3_PROVIDER_MODE__ = "local";
    mockLocalFetch();
    const { ModelData, createSimulationProvider, resolveScenarioRequest } =
      await loadProviderSuite();
    const simulationProvider = createSimulationProvider(ModelData);

    expect(() =>
      resolveScenarioRequest(ModelData, { preset: "standard-run" }),
    ).not.toThrow();
    await expect(
      simulationProvider.compare(
        {
          preset: "standard-run",
          request: {
            year_min: 1900,
            year_max: 1900.5,
            dt: 0.5,
            output_variables: ["pop", "iopc", "fpc", "ppolx"],
          },
        },
        {
          request: {
            year_min: 1900,
            year_max: 1900.5,
            dt: 0.5,
            output_variables: ["pop", "iopc", "fpc", "ppolx"],
          },
        },
      ),
    ).resolves.toMatchObject({
      scenario_a: "standard-run",
      scenario_b: "Custom",
      results_a: {
        series: {
          pop: { values: [1, 2] },
        },
      },
      results_b: {
        series: {
          pop: { values: [1, 2] },
        },
      },
    });
  });

  test("retries the local fixture fetch after a failed response", async () => {
    window.__PYWORLD3_PROVIDER_MODE__ = "local";
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => world3TablesFixture,
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => fixture,
      } as Response);

    const { ModelData, createSimulationProvider } = await loadProviderSuite();
    const simulationProvider = createSimulationProvider(ModelData);

    await expect(
      simulationProvider.simulatePreset("standard-run"),
    ).rejects.toThrow("Failed to load local simulation fixture (503)");
    await expect(
      simulationProvider.simulatePreset("standard-run"),
    ).resolves.toEqual(fixture);
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  test("browser-native bridge populates window globals", async () => {
    window.__PYWORLD3_PROVIDER_MODE__ = "local";
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => world3TablesFixture,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => fixture,
      } as Response);

    const { ModelData } = await loadProviderSuite();

    expect(window.ModelData).toBe(ModelData);
    expect(window.buildSimulationRequestFromPreset("standard-run")).toEqual({});
    await expect(
      window.SimulationProvider.simulatePreset("standard-run"),
    ).resolves.toEqual(fixture);
  });
});
