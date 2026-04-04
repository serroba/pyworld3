import { beforeEach, describe, expect, test, vi } from "vitest";

async function loadContractsSuite() {
  vi.resetModules();
  const { ModelData } = await import("../ts/model-data.ts");
  const contracts = await import("../ts/simulation-contracts.ts");
  return { ModelData, ...contracts };
}

describe("simulation contracts", () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, "ModelData");
    Reflect.deleteProperty(window, "buildSimulationRequestFromPreset");
    Reflect.deleteProperty(window, "resolveScenarioRequest");
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
