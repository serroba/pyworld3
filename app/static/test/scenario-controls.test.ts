import { describe, expect, test } from "vitest";

import {
  WORLD3_SCENARIO_CONTROL_REGISTRY,
  buildWorld3ScenarioControlConstraints,
  buildWorld3ScenarioControlDefaults,
  buildWorld3ScenarioControlMeta,
} from "../ts/scenario-controls.ts";
import { ModelData } from "../ts/model-data.ts";

describe("scenario controls registry", () => {
  test("builds scenario control metadata from the canonical registry", () => {
    expect(WORLD3_SCENARIO_CONTROL_REGISTRY.map((item) => item.key)).toEqual([
      "year_min",
      "year_max",
      "dt",
      "pyear",
      "iphst",
    ]);

    expect(buildWorld3ScenarioControlDefaults()).toEqual({
      year_min: 1900,
      year_max: 2100,
      dt: 0.5,
      pyear: 1975,
      iphst: 1940,
    });

    expect(buildWorld3ScenarioControlMeta()).toEqual({
      year_min: { full_name: "Start year", unit: "year" },
      year_max: { full_name: "End year", unit: "year" },
      dt: { full_name: "Time step", unit: "years" },
      pyear: { full_name: "Policy implementation year", unit: "year" },
      iphst: { full_name: "Health services impact start year", unit: "year" },
    });

    expect(buildWorld3ScenarioControlConstraints()).toEqual({
      year_min: [1900, 2100],
      year_max: [1950, 2300],
      dt: [0.1, 2],
      pyear: [1800, 2300],
      iphst: [1800, 2300],
    });
  });

  test("exposes scenario control metadata through model data", () => {
    expect(ModelData.scenarioControlDefaults.pyear).toBe(1975);
    expect(ModelData.scenarioControlMeta.iphst).toEqual({
      full_name: "Health services impact start year",
      unit: "year",
    });
    expect(ModelData.scenarioControlConstraints.dt).toEqual([0.1, 2]);
  });
});
