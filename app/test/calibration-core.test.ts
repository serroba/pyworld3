import { describe, expect, test } from "vitest";

import { createCalibrationCore } from "../ts/core/calibration-core.ts";
import { ModelData } from "../ts/model-data.ts";

describe("calibration core", () => {
  test("calibrates the mapped constants from raw indicator data", () => {
    const calibrationCore = createCalibrationCore(ModelData);
    const result = calibrationCore.calibrate({
      reference_year: 1970,
      entity: "World",
      indicators: {
        pop_total: 3.7e9,
        pop_0_14: 37.1,
        pop_15_64: 57.6,
        pop_65_up: 5.3,
        fertility_rate: 4.74,
        gdp_current: 2.9e12,
        industry_value_added_pct: 38,
        gross_capital_formation_pct: 25,
        co2_per_gdp: 0.95,
      },
      warnings: [],
    });

    const p1i = result.constants.p1i;
    const p2i = result.constants.p2i;
    const p3i = result.constants.p3i;
    const p4i = result.constants.p4i;
    const dcfsn = result.constants.dcfsn;
    const icor1 = result.constants.icor1;
    const imef = result.constants.imef;

    expect(p1i).toBeDefined();
    expect(p2i).toBeDefined();
    expect(p3i).toBeDefined();
    expect(p4i).toBeDefined();
    expect(dcfsn).toBeDefined();
    expect(icor1).toBeDefined();
    expect(imef).toBeDefined();
    expect(result.reference_year).toBe(1970);
    expect(result.entity).toBe("World");
    expect(p1i?.value).toBeCloseTo(3.7e9 * 37.1 / 100);
    expect(p2i?.value).toBeCloseTo(3.7e9 * 57.6 / 100 * 0.6);
    expect(p3i?.value).toBeCloseTo(3.7e9 * 57.6 / 100 * 0.4);
    expect(p4i?.value).toBeCloseTo(3.7e9 * 5.3 / 100);
    expect(dcfsn?.value).toBeCloseTo(4.74);
    expect(icor1?.value).toBeCloseTo(3.5);
    expect(imef?.value).toBeCloseTo(0.095);
    expect(result.warnings).toEqual([]);
  });

  test("filters requested parameters and preserves fetch warnings", () => {
    const calibrationCore = createCalibrationCore(ModelData);
    const result = calibrationCore.calibrate(
      {
        reference_year: 1970,
        entity: "World",
        indicators: {
          fertility_rate: 4.74,
        },
        warnings: ["No data for pop_total at year=1970"],
      },
      { parameters: ["dcfsn"] },
    );

    expect(Object.keys(result.constants)).toEqual(["dcfsn"]);
    expect(result.constants.dcfsn).toBeDefined();
    expect(result.constants.dcfsn?.value).toBe(4.74);
    expect(result.warnings).toEqual(["No data for pop_total at year=1970"]);
  });

  test("clamps calibrated values against model constraints", () => {
    const calibrationCore = createCalibrationCore(ModelData);
    const result = calibrationCore.calibrate(
      {
        reference_year: 1970,
        entity: "World",
        indicators: {
          fertility_rate: -2,
        },
        warnings: [],
      },
      { parameters: ["dcfsn"] },
    );

    expect(result.constants.dcfsn).toBeDefined();
    expect(result.constants.dcfsn?.value).toBe(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("dcfsn: calibrated value");
    expect(result.warnings[0]).toContain("below minimum");
    expect(result.warnings[0]).toContain("clamping");
  });

  test("warns when required context indicators are missing", () => {
    const calibrationCore = createCalibrationCore(ModelData);
    const result = calibrationCore.calibrate(
      {
        reference_year: 1970,
        entity: "World",
        indicators: {
          pop_0_14: 37.1,
        },
        warnings: [],
      },
      { parameters: ["p1i"] },
    );

    expect(result.constants).toEqual({});
    expect(result.warnings).toContain(
      "Skipping p1i: missing context indicators: pop_total",
    );
  });
});
