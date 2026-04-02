import { describe, expect, test } from "vitest";

import {
  buildAdvancedScenarioHash,
  buildCompareScenarioHash,
  decodeSavedScenarioState,
  encodeSavedScenarioState,
  normalizeSavedScenarioState,
  savedScenarioStateToRequest,
} from "../ts/scenario-state.ts";

describe("scenario state", () => {
  test("encodes and decodes saved scenario state", () => {
    const original = {
      preset: "standard-run",
      view: "combined" as const,
      constants: { dcfsn: 2, len: 40 },
      controls: { dt: 1, pyear: 2000 },
    };

    const encoded = encodeSavedScenarioState(original);
    expect(decodeSavedScenarioState(encoded)).toEqual(original);
  });

  test("normalizes empty records away", () => {
    expect(
      normalizeSavedScenarioState({
        preset: "standard-run",
        constants: {},
        controls: {},
      }),
    ).toEqual({
      preset: "standard-run",
    });
  });

  test("builds an advanced hash with serialized state", () => {
    const hash = buildAdvancedScenarioHash({
      preset: "standard-run",
      view: "combined",
      constants: { len: 40 },
      controls: { pyear: 2000 },
    });

    expect(hash).toContain("/advanced?");
    expect(hash).toContain("preset=standard-run");
    expect(hash).toContain("view=combined");
    expect(hash).toContain("state=");
  });

  test("builds a compare hash for a shared scenario", () => {
    const hash = buildCompareScenarioHash({
      leftPreset: "standard-run",
      rightPreset: "standard-run",
      rightState: {
        preset: "standard-run",
        controls: { pyear: 2000 },
        constants: { len: 35 },
      },
    });

    expect(hash).toContain("#compare?");
    expect(hash).toContain("a=standard-run");
    expect(hash).toContain("bpreset=standard-run");
    expect(hash).toContain("bscenario=");
  });

  test("converts saved state into a simulation request", () => {
    expect(
      savedScenarioStateToRequest({
        controls: {
          year_min: 1900,
          year_max: 2050,
          dt: 0.5,
          pyear: 1975,
          iphst: 1940,
        },
        constants: { len: 32 },
      }),
    ).toEqual({
      year_min: 1900,
      year_max: 2050,
      dt: 0.5,
      pyear: 1975,
      iphst: 1940,
      constants: { len: 32 },
    });
  });
});
