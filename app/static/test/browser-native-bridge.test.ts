import { beforeEach, describe, expect, test, vi } from "vitest";

type TestWindow = Window &
  typeof globalThis & {
    ModelData?: unknown;
    CalibrationCore?: { calibrate: (data: unknown) => unknown };
    ValidationCore?: { validate: (result: unknown, options?: unknown) => Promise<unknown> };
    LocalOwidData?: {
      getCalibrationData: (options?: unknown) => Promise<unknown>;
      getValidationData: (options?: unknown) => Promise<unknown>;
    };
    SimulationProvider?: { mode: string };
  };

const owidDataset = {
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
};

describe("browser native bridge", () => {
  beforeEach(() => {
    vi.resetModules();
    Reflect.deleteProperty(window, "ModelData");
    Reflect.deleteProperty(window, "CalibrationCore");
    Reflect.deleteProperty(window, "ValidationCore");
    Reflect.deleteProperty(window, "LocalOwidData");
    Reflect.deleteProperty(window, "SimulationProvider");
    globalThis.fetch = vi.fn(async (input) => {
      if (input === "http://localhost:3000/data/owid-world-data.json") {
        return {
          ok: true,
          status: 200,
          json: async () => owidDataset,
        } as Response;
      }
      if (input === "http://localhost:3000/data/functions-table-world3.json") {
        return {
          ok: true,
          status: 200,
          json: async () => [],
        } as Response;
      }
      if (input === "http://localhost:3000/data/standard-run-explore.json") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            year_min: 1900,
            year_max: 1900.5,
            dt: 0.5,
            time: [1900, 1900.5],
            constants_used: {},
            series: { pop: { name: "pop", values: [1, 2] } },
          }),
        } as Response;
      }
      throw new Error(`Unexpected fetch input: ${String(input)}`);
    });
  });

  test("exposes local data and validation globals", async () => {
    await import("../ts/browser-native.ts");

    const testWindow = window as TestWindow;
    expect(testWindow.ModelData).toBeDefined();
    expect(testWindow.CalibrationCore).toBeDefined();
    expect(testWindow.LocalOwidData).toBeDefined();
    expect(testWindow.ValidationCore).toBeDefined();
    expect(testWindow.SimulationProvider?.mode).toBe("local");

    const calibrationData = await testWindow.LocalOwidData?.getCalibrationData({
      referenceYear: 1970,
      indicatorNames: ["pop_total"],
    });
    expect(calibrationData).toMatchObject({
      reference_year: 1970,
      indicators: { pop_total: 3.7e9 },
    });
    await expect(
      testWindow.LocalOwidData?.getCalibrationData({
        referenceYear: 1970,
        indicatorNames: ["pop_total"],
      }) ?? Promise.reject(new Error("LocalOwidData unavailable")),
    ).resolves.toMatchObject({
      indicators: { pop_total: 3.7e9 },
    });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    await expect(
      testWindow.ValidationCore?.validate(
        {
          year_min: 1970,
          year_max: 1970,
          dt: 1,
          time: [1970],
          constants_used: {},
          series: {
            pop: { name: "pop", values: [3.7e9] },
          },
        },
        { entity: "World", variables: ["pop"] },
      ) ?? Promise.reject(new Error("ValidationCore unavailable")),
    ).resolves.toMatchObject({
      entity: "World",
      metrics: {
        pop: { owid_indicator: "pop_total" },
      },
    });
  });

  test("surfaces local OWID fetch failures and resets the loader", async () => {
    let firstCall = true;
    globalThis.fetch = vi.fn(async (input) => {
      if (input !== "http://localhost:3000/data/owid-world-data.json") {
        throw new Error(`Unexpected fetch input: ${String(input)}`);
      }
      if (firstCall) {
        firstCall = false;
        return {
          ok: false,
          status: 500,
          json: async () => ({}),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => owidDataset,
      } as Response;
    });

    await import("../ts/browser-native.ts");
    const testWindow = window as TestWindow;

    await expect(
      testWindow.LocalOwidData?.getCalibrationData({
        referenceYear: 1970,
        indicatorNames: ["pop_total"],
      }) ?? Promise.reject(new Error("LocalOwidData unavailable")),
    ).rejects.toThrow("Failed to load local OWID data");

    await expect(
      testWindow.LocalOwidData?.getCalibrationData({
        referenceYear: 1970,
        indicatorNames: ["pop_total"],
      }) ?? Promise.reject(new Error("LocalOwidData unavailable")),
    ).resolves.toMatchObject({
      indicators: { pop_total: 3.7e9 },
    });
  });
});
