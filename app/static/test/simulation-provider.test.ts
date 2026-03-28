import { beforeEach, describe, expect, test, vi } from "vitest";

type MockSimulationResult = {
  year_min: number;
  year_max: number;
  dt: number;
  time: number[];
  constants_used: Record<string, number>;
  series: Record<string, { name: string; values: number[] }>;
};

declare global {
  type ApiMock = {
    simulatePreset: ReturnType<typeof vi.fn>;
    simulate: ReturnType<typeof vi.fn>;
    compare: ReturnType<typeof vi.fn>;
  };

  var API: ApiMock;
}

const fixture: MockSimulationResult = {
  year_min: 1900,
  year_max: 2100,
  dt: 0.5,
  time: [1900, 1900.5],
  constants_used: {},
  series: {
    pop: { name: "pop", values: [1, 2] },
  },
};

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
    delete window.__PYWORLD3_PROVIDER_MODE__;
    delete window.SimulationProvider;
    delete window.resolveScenarioRequest;
    (globalThis as typeof globalThis & { API: ApiMock }).API = {
      simulatePreset: vi.fn(),
      simulate: vi.fn(),
      compare: vi.fn(),
    };
    globalThis.fetch = vi.fn();
  });

  test("defaults to the HTTP provider and delegates API calls", async () => {
    const api = (globalThis as typeof globalThis & { API: ApiMock }).API;
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

  test("delegates generic simulate and compare calls in HTTP mode", async () => {
    const api = (globalThis as typeof globalThis & { API: ApiMock }).API;
    api.simulate.mockResolvedValue(fixture);
    api.compare.mockResolvedValue({ metrics: [] });
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
    ).resolves.toEqual({ metrics: [] });

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
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: async () => fixture,
    } as Response);

    const { ModelData, createSimulationProvider } = await loadProviderSuite();
    const simulationProvider = createSimulationProvider(ModelData);

    const first = await simulationProvider.simulatePreset("standard-run");
    const second = await simulationProvider.simulate();

    expect(simulationProvider.mode).toBe("local");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(first).toEqual(fixture);
    expect(second).toEqual(fixture);
  });

  test("passes through an abort signal for the local fixture fetch", async () => {
    window.__PYWORLD3_PROVIDER_MODE__ = "local";
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: async () => fixture,
    } as Response);
    const signal = new AbortController().signal;

    const { ModelData, createSimulationProvider } = await loadProviderSuite();
    const simulationProvider = createSimulationProvider(ModelData);

    await expect(
      simulationProvider.simulate(undefined, { signal }),
    ).resolves.toEqual(fixture);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/data/standard-run-explore.json",
      { signal },
    );
  });

  test("rejects unsupported local presets with a clear error", async () => {
    window.__PYWORLD3_PROVIDER_MODE__ = "local";
    const { ModelData, createSimulationProvider } = await loadProviderSuite();
    const simulationProvider = createSimulationProvider(ModelData);

    await expect(
      simulationProvider.simulatePreset("doubled-resources"),
    ).rejects.toThrow("supports only the standard-run preset without overrides");
  });

  test("rejects local simulate requests with explicit overrides", async () => {
    window.__PYWORLD3_PROVIDER_MODE__ = "local";
    const { ModelData, createSimulationProvider } = await loadProviderSuite();
    const simulationProvider = createSimulationProvider(ModelData);

    await expect(
      simulationProvider.simulate({ output_variables: ["pop"] }),
    ).rejects.toThrow("supports only the standard-run preset without overrides");
  });

  test("treats populated constant overrides as explicit local overrides", async () => {
    window.__PYWORLD3_PROVIDER_MODE__ = "local";
    const { ModelData, createSimulationProvider } = await loadProviderSuite();
    const simulationProvider = createSimulationProvider(ModelData);

    await expect(
      simulationProvider.simulatePreset("standard-run", {
        constants: { nri: 2_000_000_000_000 },
      }),
    ).rejects.toThrow("supports only the standard-run preset without overrides");
  });

  test("rejects local compare requests after resolving their shapes", async () => {
    window.__PYWORLD3_PROVIDER_MODE__ = "local";
    const { ModelData, createSimulationProvider, resolveScenarioRequest } =
      await loadProviderSuite();
    const simulationProvider = createSimulationProvider(ModelData);

    expect(() =>
      resolveScenarioRequest(ModelData, { preset: "standard-run" }),
    ).not.toThrow();
    await expect(
      simulationProvider.compare(
        { preset: "standard-run" },
        { request: { year_max: 2050 } },
      ),
    ).rejects.toThrow("supports only the standard-run preset without overrides");
  });

  test("retries the local fixture fetch after a failed response", async () => {
    window.__PYWORLD3_PROVIDER_MODE__ = "local";
    vi.mocked(globalThis.fetch)
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
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  test("browser-native bridge populates window globals", async () => {
    window.__PYWORLD3_PROVIDER_MODE__ = "local";
    vi.mocked(globalThis.fetch).mockResolvedValue({
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
