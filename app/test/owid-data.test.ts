import { describe, expect, test } from "vitest";

import { createOwidDataProvider } from "../ts/core/owid-data.ts";

describe("owid data provider", () => {
  const provider = createOwidDataProvider(async () => ({
    entities: {
      World: {
        indicators: {
          pop_total: {
            years: [1970, 1980],
            values: [3.7e9, 4.4e9],
          },
          fertility_rate: {
            years: [1970, 1980],
            values: [4.74, 3.67],
          },
        },
      },
    },
  }));

  test("loads calibration point data for a requested year", async () => {
    const result = await provider.getCalibrationData({
      referenceYear: 1970,
      indicatorNames: ["pop_total"],
    });

    expect(result.reference_year).toBe(1970);
    expect(result.indicators.pop_total).toBe(3.7e9);
    expect(result.warnings).toEqual([]);
  });

  test("warns when a requested calibration year is missing", async () => {
    const result = await provider.getCalibrationData({
      referenceYear: 1990,
      indicatorNames: ["pop_total"],
    });

    expect(result.indicators).toEqual({});
    expect(result.warnings[0]).toContain("No local data for pop_total");
  });

  test("loads validation series data", async () => {
    const result = await provider.getValidationData({
      indicatorNames: ["fertility_rate"],
    });

    expect(result.indicators.fertility_rate).toBeDefined();
    expect(result.indicators.fertility_rate?.years).toEqual([1970, 1980]);
    expect(result.indicators.fertility_rate?.values).toEqual([4.74, 3.67]);
  });

  test("rejects unsupported entities", async () => {
    await expect(
      provider.getCalibrationData({
        entity: "France",
        referenceYear: 1970,
        indicatorNames: ["pop_total"],
      }),
    ).rejects.toThrow("Local OWID data currently supports only");
  });
});
