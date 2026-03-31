import { describe, expect, test } from "vitest";

import { WORLD3_STOCK_KEYS } from "../ts/core/world3-keys.ts";
import {
  WORLD3_CAPITAL_FLOW_EQUATIONS,
  WORLD3_DERIVED_STOCK_EQUATIONS,
  WORLD3_POPULATION_FLOW_EQUATIONS,
  WORLD3_RESOURCE_DERIVED_EQUATIONS,
  WORLD3_STATE_STOCK_EQUATIONS,
} from "../ts/core/world3-simulation-sectors.ts";

describe("World3 stock equation DSL", () => {
  test("covers every stock key exactly once", () => {
    const declaredKeys = [
      ...WORLD3_STATE_STOCK_EQUATIONS.map((equation) => equation.key),
      ...WORLD3_DERIVED_STOCK_EQUATIONS.map((equation) => equation.key),
    ];

    expect(new Set(declaredKeys)).toEqual(new Set(WORLD3_STOCK_KEYS));
    expect(declaredKeys.length).toBe(WORLD3_STOCK_KEYS.length);
  });

  test("declares initialization metadata for all state stocks", () => {
    for (const equation of WORLD3_STATE_STOCK_EQUATIONS) {
      expect(equation.kind).toBe("state-stock");
      expect(equation.initialConstant).toBeTruthy();
      expect(equation.inputs.length).toBeGreaterThan(0);
    }
  });

  test("declares dependency inputs for derived stocks", () => {
    for (const equation of WORLD3_DERIVED_STOCK_EQUATIONS) {
      expect(equation.kind).toBe("derived-stock");
      expect(equation.inputs.length).toBeGreaterThan(0);
    }
  });

  test("declares resource derived equations explicitly", () => {
    expect(WORLD3_RESOURCE_DERIVED_EQUATIONS).toEqual([
      expect.objectContaining({
        kind: "derived-equation",
        key: "nrfr",
        inputs: ["nr", "nri"],
      }),
      expect.objectContaining({
        kind: "derived-equation",
        key: "fcaor",
        inputs: ["nrfr"],
      }),
    ]);
  });

  test("declares population mortality and maturation flow equations explicitly", () => {
    expect(WORLD3_POPULATION_FLOW_EQUATIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "derived-equation",
          key: "m1",
          inputs: ["le"],
        }),
        expect.objectContaining({
          kind: "derived-equation",
          key: "mat1",
          inputs: ["p1", "m1"],
        }),
        expect.objectContaining({
          kind: "derived-equation",
          key: "d4",
          inputs: ["p4", "m4"],
        }),
      ]),
    );
  });

  test("declares capital depreciation and service-output equations explicitly", () => {
    expect(WORLD3_CAPITAL_FLOW_EQUATIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "derived-equation",
          key: "icdr",
          inputs: ["ic", "alic1", "alic2"],
        }),
        expect.objectContaining({
          kind: "derived-equation",
          key: "so",
          inputs: ["sc", "cuf", "scor1", "scor2"],
        }),
        expect.objectContaining({
          kind: "derived-equation",
          key: "sopc",
          inputs: ["so", "pop"],
        }),
      ]),
    );
  });
});
