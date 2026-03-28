import { beforeEach, describe, expect, test, vi } from "vitest";

declare global {
  interface Window {
    ModelData?: {
      presets: Array<{
        name: string;
        description: string;
        constants: Record<string, number>;
        year_min?: number;
        year_max?: number;
        dt?: number;
        pyear?: number;
        iphst?: number;
        output_variables?: string[];
      }>;
    };
    buildSimulationRequestFromPreset?: (
      name: string,
      overrides?: {
        year_min?: number;
        constants?: Record<string, number>;
        output_variables?: string[];
      },
    ) => Record<string, unknown>;
    resolveScenarioRequest?: (spec: {
      preset?: string;
      request?: Record<string, unknown>;
    }) => Record<string, unknown>;
  }
}

async function loadContractsSuite() {
  vi.resetModules();
  const { ModelData } = await import("../ts/model-data.ts");
  const contracts = await import("../ts/simulation-contracts.ts");
  return { ModelData, ...contracts };
}

describe("simulation contracts", () => {
  beforeEach(() => {
    delete window.ModelData;
    delete window.buildSimulationRequestFromPreset;
    delete window.resolveScenarioRequest;
  });

  test("builds a preset request with merged constant overrides", async () => {
    const { ModelData, buildSimulationRequestFromPreset } = await loadContractsSuite();

    const request = buildSimulationRequestFromPreset(
      ModelData,
      "doubled-resources",
      {
        year_min: 1950,
        constants: { nruf2: 0.5 },
        output_variables: ["pop"],
      },
    );

    expect(request).toMatchObject({
      year_min: 1950,
      output_variables: ["pop"],
      constants: {
        nri: 2_000_000_000_000,
        nruf2: 0.5,
      },
    });
  });

  test("resolves preset-backed scenarios through the browser helper", async () => {
    const { ModelData, resolveScenarioRequest } = await loadContractsSuite();

    const request = resolveScenarioRequest(ModelData, {
      preset: "standard-run",
      request: { year_max: 2050 },
    });

    expect(request).toMatchObject({ year_max: 2050 });
  });

  test("preserves optional scalar overrides when they are provided", async () => {
    const { ModelData, buildSimulationRequestFromPreset } = await loadContractsSuite();

    const request = buildSimulationRequestFromPreset(ModelData, "standard-run", {
      dt: 1,
      pyear: 2000,
      iphst: 1980,
    });

    expect(request).toMatchObject({
      dt: 1,
      pyear: 2000,
      iphst: 1980,
    });
  });

  test("throws a clear error for unknown presets", async () => {
    const { ModelData, buildSimulationRequestFromPreset } =
      await loadContractsSuite();

    expect(() =>
      buildSimulationRequestFromPreset(ModelData, "missing-preset"),
    ).toThrow("Unknown preset");
  });
});
