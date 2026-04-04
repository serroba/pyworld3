import { describe, expect, test } from "vitest";

import { WORLD3_STOCK_KEYS } from "../ts/core/world3-keys.ts";
import {
  defineDerivedEquation,
  defineEquationPhase,
  defineRuntimePhase,
  defineRuntimeValue,
  runWorld3ExecutionPhase,
} from "../ts/core/world3-equation-dsl.ts";
import {
  WORLD3_CAPITAL_ALLOCATION_EQUATIONS,
  WORLD3_CAPITAL_INVESTMENT_EQUATIONS,
  WORLD3_CAPITAL_FLOW_EQUATIONS,
  WORLD3_CROSS_SECTOR_EQUATIONS,
  WORLD3_CROSS_SECTOR_PHASES,
  WORLD3_CROSS_SECTOR_RESOURCE_EQUATIONS,
  WORLD3_DERIVED_STOCK_EQUATIONS,
  WORLD3_AGRICULTURE_EQUATIONS,
  WORLD3_POLLUTION_EQUATIONS,
  WORLD3_POPULATION_BIRTH_EQUATIONS,
  WORLD3_POPULATION_FEEDBACK_LATE_EQUATIONS,
  WORLD3_POPULATION_FEEDBACK_PHASES,
  WORLD3_POPULATION_FEEDBACK_PRIMARY_EQUATIONS,
  WORLD3_POPULATION_LEADING_EQUATIONS,
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

  test("declares capital allocation and reinvestment equations explicitly", () => {
    expect(WORLD3_CAPITAL_ALLOCATION_EQUATIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "derived-equation",
          key: "fioac",
          inputs: ["iopc", "iopcd", "fioac1", "fioac2"],
        }),
        expect.objectContaining({
          kind: "derived-equation",
          key: "fioas",
          inputs: ["sopc"],
        }),
        expect.objectContaining({
          kind: "derived-equation",
          key: "scir",
          inputs: ["io", "fioas"],
        }),
      ]),
    );

    expect(WORLD3_CAPITAL_INVESTMENT_EQUATIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "derived-equation",
          key: "fioai",
          inputs: ["fioaa", "fioas", "fioac"],
        }),
        expect.objectContaining({
          kind: "derived-equation",
          key: "icir",
          inputs: ["io", "fioai"],
        }),
      ]),
    );
  });

  test("declares population fertility and birth equations explicitly", () => {
    expect(WORLD3_POPULATION_BIRTH_EQUATIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "derived-equation",
          key: "mtf",
          inputs: ["le", "mtfn"],
        }),
        expect.objectContaining({
          kind: "derived-equation",
          key: "fcapc",
          inputs: ["mtf", "dtf", "sopc"],
        }),
        expect.objectContaining({
          kind: "derived-equation",
          key: "tf",
          inputs: ["mtf", "dtf", "fce"],
        }),
        expect.objectContaining({
          kind: "derived-equation",
          key: "b",
          inputs: ["d", "tf", "p2", "rlt"],
        }),
      ]),
    );
  });

  test("declares population leading equations explicitly", () => {
    expect(WORLD3_POPULATION_LEADING_EQUATIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "derived-equation", key: "fpu", inputs: ["pop"] }),
        expect.objectContaining({ kind: "derived-equation", key: "cdr", inputs: ["d", "pop"] }),
        expect.objectContaining({ kind: "derived-equation", key: "fce", inputs: ["fcest"] }),
      ]),
    );
  });

  test("declares agriculture and pollution equations explicitly", () => {
    expect(WORLD3_AGRICULTURE_EQUATIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "derived-equation", key: "ai", inputs: [] }),
        expect.objectContaining({ kind: "derived-equation", key: "falm", inputs: ["pfr"] }),
        expect.objectContaining({ kind: "derived-equation", key: "aiph", inputs: ["ai", "falm", "al"] }),
      ]),
    );

    expect(WORLD3_POLLUTION_EQUATIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "derived-equation", key: "ppolx", inputs: ["ppol", "ppol70"] }),
        expect.objectContaining({ kind: "derived-equation", key: "ppgao", inputs: ["aiph", "al", "fipm", "amti"] }),
        expect.objectContaining({ kind: "derived-equation", key: "ppasr", inputs: ["ppol", "ppolx", "ahl70"] }),
      ]),
    );
  });

  test("declares cross-sector and population-feedback equations explicitly", () => {
    expect(WORLD3_CROSS_SECTOR_EQUATIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "derived-equation", key: "io", inputs: ["ic", "fcaor", "cuf"] }),
        expect.objectContaining({ kind: "derived-equation", key: "ly", inputs: ["lfert", "lymap"] }),
        expect.objectContaining({ kind: "derived-equation", key: "lfr", inputs: ["lfert", "ilf"] }),
      ]),
    );

    expect(WORLD3_CROSS_SECTOR_RESOURCE_EQUATIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "derived-equation", key: "nrur", inputs: ["pop"] }),
      ]),
    );

    expect(WORLD3_POPULATION_FEEDBACK_PRIMARY_EQUATIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "derived-equation", key: "lmc", inputs: ["fpu"] }),
        expect.objectContaining({ kind: "derived-equation", key: "fpc", inputs: ["f", "pop"] }),
        expect.objectContaining({ kind: "derived-equation", key: "fioaa", inputs: ["fpc", "ifpc"] }),
      ]),
    );

    expect(WORLD3_POPULATION_FEEDBACK_LATE_EQUATIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "derived-equation", key: "ldr", inputs: ["tai", "pal", "palt"] }),
        expect.objectContaining({ kind: "derived-equation", key: "ppgr", inputs: ["pop", "ppgao", "frpm", "imef", "imti"] }),
        expect.objectContaining({ kind: "derived-equation", key: "le", inputs: ["lmhs", "lmc", "len"] }),
      ]),
    );
  });

  test("declares phase-aware execution for cross-sector and population feedback", () => {
    expect(WORLD3_CROSS_SECTOR_PHASES.map((phase) => phase.name)).toEqual([
      "cross-sector-policy",
      "cross-sector-primary",
      "cross-sector-runtime",
      "cross-sector-allocation",
      "cross-sector-resource",
    ]);

    expect(WORLD3_POPULATION_FEEDBACK_PHASES.map((phase) => phase.name)).toEqual([
      "population-feedback-policy",
      "population-feedback-primary-runtime",
      "population-feedback-primary",
      "population-feedback-late-runtime",
      "population-feedback-late",
    ]);
  });

  test("runs runtime and equation phases against shared context", () => {
    const buffers = {
      iopc: Float64Array.of(4),
      io: Float64Array.of(0),
    } as unknown as Parameters<typeof runWorld3ExecutionPhase>[1]["buffers"];

    const context: Parameters<typeof runWorld3ExecutionPhase>[1] = {
      k: 0,
      dt: 0,
      t: 1900,
      policyYear: 1950,
      buffers,
      constants: {} as Parameters<typeof runWorld3ExecutionPhase>[1]["constants"],
      lookups: {} as Parameters<typeof runWorld3ExecutionPhase>[1]["lookups"],
      runtime: {},
    };

    const runtimePhase = defineRuntimePhase("runtime", [
      defineRuntimeValue({
        key: "pcrum",
        inputs: ["iopc"],
        compute: ({ k, buffers }) => buffers.iopc[k]! * 2,
      }),
    ]);
    const equationPhase = defineEquationPhase("equations", [
      defineDerivedEquation({
        key: "io",
        inputs: ["iopc"],
        compute: (phaseContext) => phaseContext.buffers.iopc[phaseContext.k]! + phaseContext.runtime!.pcrum!,
      }),
    ]);

    runWorld3ExecutionPhase(runtimePhase, context);
    runWorld3ExecutionPhase(equationPhase, context);

    expect(context.runtime?.pcrum).toBe(8);
    expect(buffers.io[0]).toBe(12);
  });
});
