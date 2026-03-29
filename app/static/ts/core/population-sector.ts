import type { ConstantMap, SimulationResult } from "../simulation-contracts.js";
import type { RuntimePreparation } from "./browser-native-runtime.js";
import { Dlinf3, Smooth } from "./runtime-primitives.js";
import type {
  RuntimeDerivedDefinition,
  RuntimeObservation,
  RuntimeStateDefinition,
  RuntimeStateFrame,
} from "./runtime-state-frame.js";
import type { LookupInterpolator } from "./world3-tables.js";

const DEFAULT_HEALTH_POLICY_YEAR = 1940;

export const POPULATION_HIDDEN_SERIES = {
  aiopc: "__aiopc",
  cmi: "__cmi",
  cmple: "__cmple",
  dcfs: "__dcfs",
  diopc: "__diopc",
  ehspc: "__ehspc",
  fcapc: "__fcapc",
  fce: "__fce",
  fcfpc: "__fcfpc",
  fie: "__fie",
  fm: "__fm",
  frsn: "__frsn",
  fsafc: "__fsafc",
  fpu: "__fpu",
  hsapc: "__hsapc",
  lmc: "__lmc",
  lmf: "__lmf",
  lmhs: "__lmhs",
  lmhs1: "__lmhs1",
  lmhs2: "__lmhs2",
  lmp: "__lmp",
  mtf: "__mtf",
  nfc: "__nfc",
  ple: "__ple",
  sfsn: "__sfsn",
  tf: "__tf",
  dtf: "__dtf",
} as const;

const POPULATION_MORTALITY_OUTPUTS = ["m1", "m2", "m3", "m4"] as const;
const POPULATION_COHORT_OUTPUTS = ["mat1", "mat2", "mat3"] as const;
const POPULATION_DEATH_OUTPUTS = ["d1", "d2", "d3", "d4", "d", "cdr"] as const;
const POPULATION_STOCK_OUTPUTS = ["p2", "p3", "p4"] as const;
const POPULATION_BIRTH_OUTPUTS = ["p1", "b", "cbr", "tf"] as const;

function clipAtPolicyYear(
  beforeValue: number,
  afterValue: number,
  time: number,
  policyYear: number,
): number {
  return time > policyYear ? afterValue : beforeValue;
}

function deriveSeriesValues(
  frame: RuntimeStateFrame,
  definition: RuntimeDerivedDefinition,
): Float64Array {
  const values = new Float64Array(frame.time.length);

  for (let index = 0; index < frame.time.length; index += 1) {
    const time = frame.time[index];
    if (time === undefined) {
      throw new Error(`Runtime state frame index ${index} is out of bounds.`);
    }

    const observationValues = Object.fromEntries(
      Array.from(frame.series.entries(), ([name, series]) => {
        const value = series[index];
        if (value === undefined) {
          throw new Error(
            `Runtime state frame series '${name}' is missing a value at index ${index}.`,
          );
        }
        return [name, value];
      }),
    );

    values[index] = definition.derive({
      index,
      time,
      values: observationValues,
    });
  }

  return values;
}

function deriveSmoothSeriesValues(
  input: ArrayLike<number>,
  dt: number,
  delay: number,
  length = input.length,
): Float64Array {
  const smooth = new Smooth(input, dt, length);
  const values = new Float64Array(length);
  for (let index = 0; index < length; index += 1) {
    values[index] = smooth.step(index, delay);
  }
  return values;
}

function deriveDlinf3SeriesValues(
  input: ArrayLike<number>,
  dt: number,
  delay: number,
  length = input.length,
): Float64Array {
  const delayed = new Dlinf3(input, dt, length);
  const values = new Float64Array(length);
  for (let index = 0; index < length; index += 1) {
    values[index] = delayed.step(index, delay);
  }
  return values;
}

export function createFpuDerivedDefinition(
  fpuLookup: LookupInterpolator,
): RuntimeDerivedDefinition {
  return {
    variable: POPULATION_HIDDEN_SERIES.fpu,
    derive: (observation: RuntimeObservation) => {
      const pop = observation.values.pop;
      if (pop === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__fpu' because the source variable 'pop' is missing.",
        );
      }
      return fpuLookup.evaluate(pop);
    },
  };
}

export function createLmpDerivedDefinition(
  lmpLookup: LookupInterpolator,
): RuntimeDerivedDefinition {
  return {
    variable: POPULATION_HIDDEN_SERIES.lmp,
    derive: (observation: RuntimeObservation) => {
      const ppolx = observation.values.ppolx;
      if (ppolx === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__lmp' because the source variable 'ppolx' is missing.",
        );
      }
      return lmpLookup.evaluate(ppolx);
    },
  };
}

export function createLmfDerivedDefinition(
  constantsUsed: ConstantMap,
  lmfLookup: LookupInterpolator,
): RuntimeDerivedDefinition {
  return {
    variable: POPULATION_HIDDEN_SERIES.lmf,
    derive: (observation: RuntimeObservation) => {
      const fpc = observation.values.fpc;
      const sfpc = constantsUsed.sfpc;
      if (fpc === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__lmf' because the source variable 'fpc' is missing.",
        );
      }
      if (sfpc === undefined || sfpc === 0) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__lmf' because constant 'sfpc' is missing or zero.",
        );
      }
      return lmfLookup.evaluate(fpc / sfpc);
    },
  };
}

export function createCmiDerivedDefinition(
  cmiLookup: LookupInterpolator,
): RuntimeDerivedDefinition {
  return {
    variable: POPULATION_HIDDEN_SERIES.cmi,
    derive: (observation: RuntimeObservation) => {
      const iopc = observation.values.iopc;
      if (iopc === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__cmi' because the source variable 'iopc' is missing.",
        );
      }
      return cmiLookup.evaluate(iopc);
    },
  };
}

export function createHsapcDerivedDefinition(
  hsapcLookup: LookupInterpolator,
): RuntimeDerivedDefinition {
  return {
    variable: POPULATION_HIDDEN_SERIES.hsapc,
    derive: (observation: RuntimeObservation) => {
      const sopc = observation.values.sopc;
      if (sopc === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__hsapc' because the source variable 'sopc' is missing.",
        );
      }
      return hsapcLookup.evaluate(sopc);
    },
  };
}

export function createLmhsDerivedDefinitions(
  lmhs1Lookup: LookupInterpolator,
  lmhs2Lookup: LookupInterpolator,
  policyYear = DEFAULT_HEALTH_POLICY_YEAR,
): RuntimeDerivedDefinition[] {
  return [
    {
      variable: POPULATION_HIDDEN_SERIES.lmhs1,
      derive: (observation: RuntimeObservation) => {
        const ehspc = observation.values[POPULATION_HIDDEN_SERIES.ehspc];
        if (ehspc === undefined) {
          throw new Error(
            "Fixture-backed runtime cannot derive '__lmhs1' because the source variable '__ehspc' is missing.",
          );
        }
        return lmhs1Lookup.evaluate(ehspc);
      },
    },
    {
      variable: POPULATION_HIDDEN_SERIES.lmhs2,
      derive: (observation: RuntimeObservation) => {
        const ehspc = observation.values[POPULATION_HIDDEN_SERIES.ehspc];
        if (ehspc === undefined) {
          throw new Error(
            "Fixture-backed runtime cannot derive '__lmhs2' because the source variable '__ehspc' is missing.",
          );
        }
        return lmhs2Lookup.evaluate(ehspc);
      },
    },
    {
      variable: POPULATION_HIDDEN_SERIES.lmhs,
      derive: (observation: RuntimeObservation) => {
        const lmhs1 = observation.values[POPULATION_HIDDEN_SERIES.lmhs1];
        const lmhs2 = observation.values[POPULATION_HIDDEN_SERIES.lmhs2];
        if (lmhs1 === undefined || lmhs2 === undefined) {
          throw new Error(
            "Fixture-backed runtime cannot derive '__lmhs' because health-service multiplier inputs are missing.",
          );
        }
        return clipAtPolicyYear(lmhs1, lmhs2, observation.time, policyYear);
      },
    },
  ];
}

export function createLmcDerivedDefinition(): RuntimeDerivedDefinition {
  return {
    variable: POPULATION_HIDDEN_SERIES.lmc,
    derive: (observation: RuntimeObservation) => {
      const cmi = observation.values[POPULATION_HIDDEN_SERIES.cmi];
      const fpu = observation.values[POPULATION_HIDDEN_SERIES.fpu];
      if (cmi === undefined || fpu === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__lmc' because crowding inputs are missing.",
        );
      }
      return 1 - cmi * fpu;
    },
  };
}

export function createLeDerivedDefinition(
  constantsUsed: ConstantMap,
): RuntimeDerivedDefinition {
  return {
    variable: "le",
    derive: (observation: RuntimeObservation) => {
      const len = constantsUsed.len;
      const lmf = observation.values[POPULATION_HIDDEN_SERIES.lmf];
      const lmhs = observation.values[POPULATION_HIDDEN_SERIES.lmhs];
      const lmp = observation.values[POPULATION_HIDDEN_SERIES.lmp];
      const lmc = observation.values[POPULATION_HIDDEN_SERIES.lmc];
      if (len === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive 'le' because constant 'len' is missing.",
        );
      }
      if (
        lmf === undefined ||
        lmhs === undefined ||
        lmp === undefined ||
        lmc === undefined
      ) {
        throw new Error(
          "Fixture-backed runtime cannot derive 'le' because life-expectancy multiplier inputs are missing.",
        );
      }
      return len * lmf * lmhs * lmp * lmc;
    },
  };
}

export function createMortalityDerivedDefinition(
  variable: "m1" | "m2" | "m3" | "m4",
  mortalityLookup: LookupInterpolator,
): RuntimeDerivedDefinition {
  return {
    variable,
    derive: (observation: RuntimeObservation) => {
      const le = observation.values.le;
      if (le === undefined) {
        throw new Error(
          `Fixture-backed runtime cannot derive '${variable}' because the source variable 'le' is missing.`,
        );
      }
      return mortalityLookup.evaluate(le);
    },
  };
}

export function createDeathDerivedDefinition(
  variable: "d1" | "d2" | "d3" | "d4",
  populationVariable: "p1" | "p2" | "p3" | "p4",
  mortalityVariable: "m1" | "m2" | "m3" | "m4",
): RuntimeDerivedDefinition {
  return {
    variable,
    derive: (observation: RuntimeObservation) => {
      const population = observation.values[populationVariable];
      const mortality = observation.values[mortalityVariable];
      if (population === undefined || mortality === undefined) {
        throw new Error(
          `Fixture-backed runtime cannot derive '${variable}' because '${populationVariable}' or '${mortalityVariable}' is missing.`,
        );
      }
      return population * mortality;
    },
  };
}

export function createMaturationDerivedDefinition(
  variable: "mat1" | "mat2" | "mat3",
  populationVariable: "p1" | "p2" | "p3",
  mortalityVariable: "m1" | "m2" | "m3",
  residenceTime: number,
): RuntimeDerivedDefinition {
  return {
    variable,
    derive: (observation: RuntimeObservation) => {
      const population = observation.values[populationVariable];
      const mortality = observation.values[mortalityVariable];
      if (population === undefined || mortality === undefined) {
        throw new Error(
          `Fixture-backed runtime cannot derive '${variable}' because '${populationVariable}' or '${mortalityVariable}' is missing.`,
        );
      }
      return (population * (1 - mortality)) / residenceTime;
    },
  };
}

export function createFieDerivedDefinition(): RuntimeDerivedDefinition {
  return {
    variable: POPULATION_HIDDEN_SERIES.fie,
    derive: (observation: RuntimeObservation) => {
      const iopc = observation.values.iopc;
      const aiopc = observation.values[POPULATION_HIDDEN_SERIES.aiopc];
      if (iopc === undefined || aiopc === undefined || aiopc === 0) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__fie' because 'iopc' or '__aiopc' is missing or zero.",
        );
      }
      return (iopc - aiopc) / aiopc;
    },
  };
}

export function createSfsnDerivedDefinition(
  sfsnLookup: LookupInterpolator,
): RuntimeDerivedDefinition {
  return {
    variable: POPULATION_HIDDEN_SERIES.sfsn,
    derive: (observation: RuntimeObservation) => {
      const diopc = observation.values[POPULATION_HIDDEN_SERIES.diopc];
      if (diopc === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__sfsn' because '__diopc' is missing.",
        );
      }
      return sfsnLookup.evaluate(diopc);
    },
  };
}

export function createFrsnDerivedDefinition(
  frsnLookup: LookupInterpolator,
): RuntimeDerivedDefinition {
  return {
    variable: POPULATION_HIDDEN_SERIES.frsn,
    derive: (observation: RuntimeObservation) => {
      const fie = observation.values[POPULATION_HIDDEN_SERIES.fie];
      if (fie === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__frsn' because '__fie' is missing.",
        );
      }
      return frsnLookup.evaluate(fie);
    },
  };
}

export function createDcfsDerivedDefinition(
  constantsUsed: ConstantMap,
): RuntimeDerivedDefinition {
  return {
    variable: POPULATION_HIDDEN_SERIES.dcfs,
    derive: (observation: RuntimeObservation) => {
      const dcfsn = constantsUsed.dcfsn;
      const zpgt = constantsUsed.zpgt;
      const frsn = observation.values[POPULATION_HIDDEN_SERIES.frsn];
      const sfsn = observation.values[POPULATION_HIDDEN_SERIES.sfsn];
      if (
        dcfsn === undefined ||
        zpgt === undefined ||
        frsn === undefined ||
        sfsn === undefined
      ) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__dcfs' because desired-family-size inputs are missing.",
        );
      }
      return clipAtPolicyYear(dcfsn * frsn * sfsn, 2.0, observation.time, zpgt);
    },
  };
}

export function createCmpleDerivedDefinition(
  cmpleLookup: LookupInterpolator,
): RuntimeDerivedDefinition {
  return {
    variable: POPULATION_HIDDEN_SERIES.cmple,
    derive: (observation: RuntimeObservation) => {
      const ple = observation.values[POPULATION_HIDDEN_SERIES.ple];
      if (ple === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__cmple' because '__ple' is missing.",
        );
      }
      return cmpleLookup.evaluate(ple);
    },
  };
}

export function createDtfDerivedDefinition(): RuntimeDerivedDefinition {
  return {
    variable: POPULATION_HIDDEN_SERIES.dtf,
    derive: (observation: RuntimeObservation) => {
      const dcfs = observation.values[POPULATION_HIDDEN_SERIES.dcfs];
      const cmple = observation.values[POPULATION_HIDDEN_SERIES.cmple];
      if (dcfs === undefined || cmple === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__dtf' because fertility inputs are missing.",
        );
      }
      return dcfs * cmple;
    },
  };
}

export function createFmDerivedDefinition(
  fmLookup: LookupInterpolator,
): RuntimeDerivedDefinition {
  return {
    variable: POPULATION_HIDDEN_SERIES.fm,
    derive: (observation: RuntimeObservation) => {
      const le = observation.values.le;
      if (le === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__fm' because 'le' is missing.",
        );
      }
      return fmLookup.evaluate(le);
    },
  };
}

export function createMtfDerivedDefinition(
  constantsUsed: ConstantMap,
): RuntimeDerivedDefinition {
  return {
    variable: POPULATION_HIDDEN_SERIES.mtf,
    derive: (observation: RuntimeObservation) => {
      const mtfn = constantsUsed.mtfn;
      const fm = observation.values[POPULATION_HIDDEN_SERIES.fm];
      if (mtfn === undefined || fm === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__mtf' because fertility-normal inputs are missing.",
        );
      }
      return mtfn * fm;
    },
  };
}

export function createNfcDerivedDefinition(): RuntimeDerivedDefinition {
  return {
    variable: POPULATION_HIDDEN_SERIES.nfc,
    derive: (observation: RuntimeObservation) => {
      const mtf = observation.values[POPULATION_HIDDEN_SERIES.mtf];
      const dtf = observation.values[POPULATION_HIDDEN_SERIES.dtf];
      if (mtf === undefined || dtf === undefined || dtf === 0) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__nfc' because '__mtf' or '__dtf' is missing or zero.",
        );
      }
      return mtf / dtf - 1;
    },
  };
}

export function createFsafcDerivedDefinition(
  fsafcLookup: LookupInterpolator,
): RuntimeDerivedDefinition {
  return {
    variable: POPULATION_HIDDEN_SERIES.fsafc,
    derive: (observation: RuntimeObservation) => {
      const nfc = observation.values[POPULATION_HIDDEN_SERIES.nfc];
      if (nfc === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__fsafc' because '__nfc' is missing.",
        );
      }
      return fsafcLookup.evaluate(nfc);
    },
  };
}

export function createFcapcDerivedDefinition(): RuntimeDerivedDefinition {
  return {
    variable: POPULATION_HIDDEN_SERIES.fcapc,
    derive: (observation: RuntimeObservation) => {
      const fsafc = observation.values[POPULATION_HIDDEN_SERIES.fsafc];
      const sopc = observation.values.sopc;
      if (fsafc === undefined || sopc === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__fcapc' because '__fsafc' or 'sopc' is missing.",
        );
      }
      return fsafc * sopc;
    },
  };
}

export function createFceDerivedDefinition(
  constantsUsed: ConstantMap,
  fceLookup: LookupInterpolator,
): RuntimeDerivedDefinition {
  return {
    variable: POPULATION_HIDDEN_SERIES.fce,
    derive: (observation: RuntimeObservation) => {
      const fcfpc = observation.values[POPULATION_HIDDEN_SERIES.fcfpc];
      const fcest = constantsUsed.fcest;
      if (fcfpc === undefined || fcest === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__fce' because fertility-control inputs are missing.",
        );
      }
      return clipAtPolicyYear(
        fceLookup.evaluate(fcfpc),
        1.0,
        observation.time,
        fcest,
      );
    },
  };
}

export function createTfDerivedDefinition(): RuntimeDerivedDefinition {
  return {
    variable: "tf",
    derive: (observation: RuntimeObservation) => {
      const mtf = observation.values[POPULATION_HIDDEN_SERIES.mtf];
      const fce = observation.values[POPULATION_HIDDEN_SERIES.fce];
      const dtf = observation.values[POPULATION_HIDDEN_SERIES.dtf];
      if (mtf === undefined || fce === undefined || dtf === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive 'tf' because fertility-control inputs are missing.",
        );
      }
      return Math.min(mtf, mtf * (1 - fce) + dtf * fce);
    },
  };
}

export function createBirthsDerivedDefinition(
  constantsUsed: ConstantMap,
): RuntimeDerivedDefinition {
  return {
    variable: "b",
    derive: (observation: RuntimeObservation) => {
      const d = observation.values.d;
      const p2 = observation.values.p2;
      const tf = observation.values.tf;
      const rlt = constantsUsed.rlt;
      const pet = constantsUsed.pet;
      if (
        d === undefined ||
        p2 === undefined ||
        tf === undefined ||
        rlt === undefined ||
        pet === undefined ||
        rlt === 0
      ) {
        throw new Error(
          "Fixture-backed runtime cannot derive 'b' because birth-path inputs are missing.",
        );
      }
      return clipAtPolicyYear(
        (tf * p2 * 0.5) / rlt,
        d,
        observation.time,
        pet,
      );
    },
  };
}

export function createBirthRateDerivedDefinition(): RuntimeDerivedDefinition {
  return {
    variable: "cbr",
    derive: (observation: RuntimeObservation) => {
      const births = observation.values.b;
      const pop = observation.values.pop;
      if (births === undefined || pop === undefined || pop === 0) {
        throw new Error(
          "Fixture-backed runtime cannot derive 'cbr' because 'b' or 'pop' is missing or zero.",
        );
      }
      return (1000 * births) / pop;
    },
  };
}

export function createPopulationSumDerivedDefinition(): RuntimeDerivedDefinition {
  return {
    variable: "pop",
    derive: (observation: RuntimeObservation) => {
      const p1 = observation.values.p1;
      const p2 = observation.values.p2;
      const p3 = observation.values.p3;
      const p4 = observation.values.p4;
      if (
        p1 === undefined ||
        p2 === undefined ||
        p3 === undefined ||
        p4 === undefined
      ) {
        throw new Error(
          "Fixture-backed runtime cannot derive 'pop' because population cohort inputs are missing.",
        );
      }
      return p1 + p2 + p3 + p4;
    },
  };
}

export function createPopulationStockStateDefinition(
  variable: "p2" | "p3" | "p4",
  inflowVariable: "mat1" | "mat2" | "mat3",
  outflowVariables: readonly ("d2" | "d3" | "d4" | "mat2" | "mat3")[],
): RuntimeStateDefinition {
  return {
    variable,
    advance: (currentValue, observation, nextObservation) => {
      const inflow = observation.values[inflowVariable];
      if (inflow === undefined) {
        throw new Error(
          `Runtime population state advance is missing the inflow variable '${inflowVariable}'.`,
        );
      }
      if (!nextObservation) {
        return currentValue;
      }
      let netFlow = inflow;
      for (const outflowVariable of outflowVariables) {
        const outflow = observation.values[outflowVariable];
        if (outflow === undefined) {
          throw new Error(
            `Runtime population state advance is missing the outflow variable '${outflowVariable}'.`,
          );
        }
        netFlow -= outflow;
      }
      const dt = nextObservation.time - observation.time;
      return currentValue + dt * netFlow;
    },
  };
}

export function createPopulationStockStateDefinitions(): RuntimeStateDefinition[] {
  return [
    createPopulationStockStateDefinition("p2", "mat1", ["d2", "mat2"]),
    createPopulationStockStateDefinition("p3", "mat2", ["d3", "mat3"]),
    createPopulationStockStateDefinition("p4", "mat3", ["d4"]),
  ];
}

export function createP1StockStateDefinition(): RuntimeStateDefinition {
  return {
    variable: "p1",
    advance: (currentValue, observation, nextObservation) => {
      const births = observation.values.b;
      const d1 = observation.values.d1;
      const mat1 = observation.values.mat1;
      if (births === undefined || d1 === undefined || mat1 === undefined) {
        throw new Error(
          "Runtime population state advance is missing 'b', 'd1', or 'mat1' for 'p1'.",
        );
      }
      if (!nextObservation) {
        return currentValue;
      }
      const dt = nextObservation.time - observation.time;
      return currentValue + dt * (births - d1 - mat1);
    },
  };
}

export function createTotalDeathsDerivedDefinition(): RuntimeDerivedDefinition {
  return {
    variable: "d",
    derive: (observation: RuntimeObservation) => {
      const d1 = observation.values.d1;
      const d2 = observation.values.d2;
      const d3 = observation.values.d3;
      const d4 = observation.values.d4;
      if (
        d1 === undefined ||
        d2 === undefined ||
        d3 === undefined ||
        d4 === undefined
      ) {
        throw new Error(
          "Fixture-backed runtime cannot derive 'd' because age-band death inputs are missing.",
        );
      }
      return d1 + d2 + d3 + d4;
    },
  };
}

export function createCdrDerivedDefinition(): RuntimeDerivedDefinition {
  return {
    variable: "cdr",
    derive: (observation: RuntimeObservation) => {
      const deaths = observation.values.d;
      const pop = observation.values.pop;
      if (deaths === undefined || pop === undefined || pop === 0) {
        throw new Error(
          "Fixture-backed runtime cannot derive 'cdr' because 'd' or 'pop' is missing or zero.",
        );
      }
      return (1000 * deaths) / pop;
    },
  };
}

export function extendPopulationSourceVariables(
  sourceVariables: Set<string>,
  outputVariables: string[],
  fixture: SimulationResult,
  lookupLibrary?: Map<string, LookupInterpolator>,
): {
  canUseNativeLifeExpectancy: boolean;
  canUseNativeMortality: boolean;
  canUseNativeCohortSupport: boolean;
  canUseNativeDeathPath: boolean;
  canUseNativePopulationStocks: boolean;
  canUseNativeBirthSupport: boolean;
  canUseNativeP1Stock: boolean;
} {
  const needsLifeExpectancy =
    outputVariables.includes("le") ||
    outputVariables.some((variable) =>
      POPULATION_MORTALITY_OUTPUTS.includes(
        variable as (typeof POPULATION_MORTALITY_OUTPUTS)[number],
      ),
    ) ||
    outputVariables.some((variable) =>
      POPULATION_STOCK_OUTPUTS.includes(
        variable as (typeof POPULATION_STOCK_OUTPUTS)[number],
      ),
    ) ||
    outputVariables.some((variable) =>
      POPULATION_COHORT_OUTPUTS.includes(
        variable as (typeof POPULATION_COHORT_OUTPUTS)[number],
      ),
    ) ||
    outputVariables.some((variable) =>
      POPULATION_DEATH_OUTPUTS.includes(
        variable as (typeof POPULATION_DEATH_OUTPUTS)[number],
      ),
    ) ||
    outputVariables.some((variable) =>
      POPULATION_BIRTH_OUTPUTS.includes(
        variable as (typeof POPULATION_BIRTH_OUTPUTS)[number],
      ),
    );
  const canUseNativeLifeExpectancy =
    needsLifeExpectancy &&
    Boolean(fixture.series.pop) &&
    Boolean(fixture.series.fpc) &&
    Boolean(fixture.series.iopc) &&
    Boolean(fixture.series.sopc) &&
    Boolean(fixture.series.ppolx) &&
    fixture.constants_used.len !== undefined &&
    fixture.constants_used.sfpc !== undefined &&
    Boolean(lookupLibrary?.has("FPU")) &&
    Boolean(lookupLibrary?.has("LMF")) &&
    Boolean(lookupLibrary?.has("HSAPC")) &&
    Boolean(lookupLibrary?.has("LMHS1")) &&
    Boolean(lookupLibrary?.has("LMHS2")) &&
    Boolean(lookupLibrary?.has("CMI")) &&
    Boolean(lookupLibrary?.has("LMP"));

  if (canUseNativeLifeExpectancy) {
    sourceVariables.add("pop");
    sourceVariables.add("fpc");
    sourceVariables.add("iopc");
    sourceVariables.add("sopc");
    sourceVariables.add("ppolx");
  }

  const canUseNativeMortality =
    outputVariables.some(
      (variable) =>
        POPULATION_MORTALITY_OUTPUTS.includes(
          variable as (typeof POPULATION_MORTALITY_OUTPUTS)[number],
        ) ||
        POPULATION_STOCK_OUTPUTS.includes(
          variable as (typeof POPULATION_STOCK_OUTPUTS)[number],
        ) ||
        POPULATION_COHORT_OUTPUTS.includes(
          variable as (typeof POPULATION_COHORT_OUTPUTS)[number],
        ) ||
        POPULATION_DEATH_OUTPUTS.includes(
          variable as (typeof POPULATION_DEATH_OUTPUTS)[number],
        ) ||
        POPULATION_BIRTH_OUTPUTS.includes(
          variable as (typeof POPULATION_BIRTH_OUTPUTS)[number],
        ),
    ) &&
    canUseNativeLifeExpectancy &&
    Boolean(lookupLibrary?.has("M1")) &&
    Boolean(lookupLibrary?.has("M2")) &&
    Boolean(lookupLibrary?.has("M3")) &&
    Boolean(lookupLibrary?.has("M4"));

  const needsNativeCohortSupport =
    outputVariables.some((variable) =>
      POPULATION_COHORT_OUTPUTS.includes(
        variable as (typeof POPULATION_COHORT_OUTPUTS)[number],
      ),
    ) ||
    outputVariables.includes("pop") ||
    outputVariables.some((variable) =>
      POPULATION_DEATH_OUTPUTS.includes(
        variable as (typeof POPULATION_DEATH_OUTPUTS)[number],
      ),
    ) ||
    outputVariables.some((variable) =>
      POPULATION_BIRTH_OUTPUTS.includes(
        variable as (typeof POPULATION_BIRTH_OUTPUTS)[number],
      ),
    );
  const hasCohortInputs =
    Boolean(fixture.series.p1) &&
    Boolean(fixture.series.p2) &&
    Boolean(fixture.series.p3) &&
    Boolean(fixture.series.p4);
  const canUseNativeCohortSupport =
    needsNativeCohortSupport &&
    hasCohortInputs &&
    (outputVariables.includes("pop") || canUseNativeMortality);

  const needsNativeDeaths = outputVariables.some((variable) =>
    POPULATION_DEATH_OUTPUTS.includes(
      variable as (typeof POPULATION_DEATH_OUTPUTS)[number],
    ),
  );
  const canUseNativeDeathPath =
    needsNativeDeaths &&
    canUseNativeMortality &&
    hasCohortInputs;

  if (canUseNativeCohortSupport) {
    sourceVariables.add("p1");
    sourceVariables.add("p2");
    sourceVariables.add("p3");
    sourceVariables.add("p4");
  }

  const canUseNativePopulationStocks =
    (outputVariables.some((variable) =>
      POPULATION_STOCK_OUTPUTS.includes(
        variable as (typeof POPULATION_STOCK_OUTPUTS)[number],
      ),
    ) ||
      outputVariables.some((variable) =>
        POPULATION_BIRTH_OUTPUTS.includes(
          variable as (typeof POPULATION_BIRTH_OUTPUTS)[number],
        ),
      )) &&
    canUseNativeMortality &&
    canUseNativeCohortSupport;

  const canUseNativeBirthSupport =
    outputVariables.some((variable) =>
      POPULATION_BIRTH_OUTPUTS.includes(
        variable as (typeof POPULATION_BIRTH_OUTPUTS)[number],
      ),
    ) &&
    canUseNativePopulationStocks &&
    Boolean(lookupLibrary?.has("FM")) &&
    Boolean(lookupLibrary?.has("CMPLE")) &&
    Boolean(lookupLibrary?.has("SFSN")) &&
    Boolean(lookupLibrary?.has("FRSN")) &&
    Boolean(lookupLibrary?.has("FSAFC")) &&
    Boolean(lookupLibrary?.has("FCE_TOCLIP")) &&
    fixture.constants_used.dcfsn !== undefined &&
    fixture.constants_used.fcest !== undefined &&
    fixture.constants_used.hsid !== undefined &&
    fixture.constants_used.ieat !== undefined &&
    fixture.constants_used.lpd !== undefined &&
    fixture.constants_used.mtfn !== undefined &&
    fixture.constants_used.pet !== undefined &&
    fixture.constants_used.rlt !== undefined &&
    fixture.constants_used.sad !== undefined &&
    fixture.constants_used.zpgt !== undefined;

  const canUseNativeP1Stock =
    canUseNativeBirthSupport && outputVariables.includes("p1");

  return {
    canUseNativeLifeExpectancy,
    canUseNativeMortality,
    canUseNativeCohortSupport,
    canUseNativeDeathPath,
    canUseNativePopulationStocks,
    canUseNativeBirthSupport,
    canUseNativeP1Stock,
  };
}

export function populatePopulationNativeSupportSeries(
  sourceFrame: RuntimeStateFrame,
  sourceSeries: Map<string, Float64Array>,
  prepared: RuntimePreparation,
  constantsUsed: ConstantMap,
  canUseNativeLifeExpectancy: boolean,
  canUseNativeMortality = false,
  canUseNativeCohortSupport = false,
  canUseNativeDeathPath = false,
  canUseNativePopulationStocks = false,
): void {
  if (!canUseNativeLifeExpectancy) {
    return;
  }

  if (canUseNativeCohortSupport) {
    sourceSeries.set(
      "pop",
      deriveSeriesValues(sourceFrame, createPopulationSumDerivedDefinition()),
    );
  }

  const fpuLookup = prepared.lookupLibrary.get("FPU");
  const lmfLookup = prepared.lookupLibrary.get("LMF");
  const hsapcLookup = prepared.lookupLibrary.get("HSAPC");
  const lmhs1Lookup = prepared.lookupLibrary.get("LMHS1");
  const lmhs2Lookup = prepared.lookupLibrary.get("LMHS2");
  const cmiLookup = prepared.lookupLibrary.get("CMI");
  const lmpLookup = prepared.lookupLibrary.get("LMP");

  if (
    !fpuLookup ||
    !lmfLookup ||
    !hsapcLookup ||
    !lmhs1Lookup ||
    !lmhs2Lookup ||
    !cmiLookup ||
    !lmpLookup
  ) {
    return;
  }

  sourceSeries.set(
    POPULATION_HIDDEN_SERIES.fpu,
    deriveSeriesValues(sourceFrame, createFpuDerivedDefinition(fpuLookup)),
  );
  sourceSeries.set(
    POPULATION_HIDDEN_SERIES.lmp,
    deriveSeriesValues(sourceFrame, createLmpDerivedDefinition(lmpLookup)),
  );
  sourceSeries.set(
    POPULATION_HIDDEN_SERIES.lmf,
    deriveSeriesValues(sourceFrame, createLmfDerivedDefinition(constantsUsed, lmfLookup)),
  );
  sourceSeries.set(
    POPULATION_HIDDEN_SERIES.cmi,
    deriveSeriesValues(sourceFrame, createCmiDerivedDefinition(cmiLookup)),
  );
  sourceSeries.set(
    POPULATION_HIDDEN_SERIES.hsapc,
    deriveSeriesValues(sourceFrame, createHsapcDerivedDefinition(hsapcLookup)),
  );

  const hsapcValues = sourceSeries.get(POPULATION_HIDDEN_SERIES.hsapc);
  if (!hsapcValues) {
    return;
  }
  const smoothHsapc = new Smooth(hsapcValues, prepared.request.dt ?? 1, sourceFrame.time.length);
  const ehspc = new Float64Array(sourceFrame.time.length);
  const hsid = constantsUsed.hsid ?? 20;
  for (let index = 0; index < sourceFrame.time.length; index += 1) {
    ehspc[index] = smoothHsapc.step(index, hsid);
  }
  sourceSeries.set(POPULATION_HIDDEN_SERIES.ehspc, ehspc);

  const ehspcFrame: RuntimeStateFrame = {
    request: sourceFrame.request,
    time: sourceFrame.time,
    constantsUsed,
    series: sourceSeries,
  };
  for (const definition of createLmhsDerivedDefinitions(
    lmhs1Lookup,
    lmhs2Lookup,
    constantsUsed.iphst ?? DEFAULT_HEALTH_POLICY_YEAR,
  )) {
    sourceSeries.set(
      definition.variable,
      deriveSeriesValues(ehspcFrame, definition),
    );
  }

  const supportFrame: RuntimeStateFrame = {
    request: sourceFrame.request,
    time: sourceFrame.time,
    constantsUsed,
    series: sourceSeries,
  };
  sourceSeries.set(
    POPULATION_HIDDEN_SERIES.lmc,
    deriveSeriesValues(supportFrame, createLmcDerivedDefinition()),
  );
  sourceSeries.set(
    "le",
    deriveSeriesValues(supportFrame, createLeDerivedDefinition(constantsUsed)),
  );

  if (!canUseNativeMortality) {
    return;
  }

  for (const variable of POPULATION_MORTALITY_OUTPUTS) {
    const lookup = prepared.lookupLibrary.get(variable.toUpperCase());
    if (!lookup) {
      continue;
    }
    sourceSeries.set(
      variable,
      deriveSeriesValues(
        supportFrame,
        createMortalityDerivedDefinition(variable, lookup),
      ),
    );
  }

  if (canUseNativeCohortSupport) {
    const cohortSupportFrame: RuntimeStateFrame = {
      request: sourceFrame.request,
      time: sourceFrame.time,
      constantsUsed,
      series: sourceSeries,
    };
    for (const definition of [
      createMaturationDerivedDefinition("mat1", "p1", "m1", 15),
      createMaturationDerivedDefinition("mat2", "p2", "m2", 30),
      createMaturationDerivedDefinition("mat3", "p3", "m3", 20),
    ]) {
      sourceSeries.set(
        definition.variable,
        deriveSeriesValues(cohortSupportFrame, definition),
      );
    }
  }

  if (!canUseNativeDeathPath && !canUseNativePopulationStocks) {
    return;
  }

  const deathDefinitions = [
    createDeathDerivedDefinition("d1", "p1", "m1"),
    createDeathDerivedDefinition("d2", "p2", "m2"),
    createDeathDerivedDefinition("d3", "p3", "m3"),
    createDeathDerivedDefinition("d4", "p4", "m4"),
  ] as const;

  const deathSupportFrame: RuntimeStateFrame = {
    request: sourceFrame.request,
    time: sourceFrame.time,
    constantsUsed,
    series: sourceSeries,
  };

  for (const definition of deathDefinitions) {
    sourceSeries.set(
      definition.variable,
      deriveSeriesValues(deathSupportFrame, definition),
    );
  }

  if (canUseNativeDeathPath || canUseNativePopulationStocks) {
    const totalDeathsFrame: RuntimeStateFrame = {
      request: sourceFrame.request,
      time: sourceFrame.time,
      constantsUsed,
      series: sourceSeries,
    };
    sourceSeries.set(
      "d",
      deriveSeriesValues(totalDeathsFrame, createTotalDeathsDerivedDefinition()),
    );
  }

  if (canUseNativeDeathPath) {
    const totalDeathsFrame: RuntimeStateFrame = {
      request: sourceFrame.request,
      time: sourceFrame.time,
      constantsUsed,
      series: sourceSeries,
    };
    sourceSeries.set(
      "cdr",
      deriveSeriesValues(totalDeathsFrame, createCdrDerivedDefinition()),
    );
  }
}

export function populatePopulationBirthNativeSupportSeries(
  sourceFrame: RuntimeStateFrame,
  sourceSeries: Map<string, Float64Array>,
  prepared: RuntimePreparation,
  constantsUsed: ConstantMap,
  canUseNativeBirthSupport = false,
): void {
  if (!canUseNativeBirthSupport) {
    return;
  }

  const dt = prepared.request.dt ?? 1;
  const ieat = constantsUsed.ieat;
  const sad = constantsUsed.sad;
  const lpd = constantsUsed.lpd;
  const hsid = constantsUsed.hsid;
  if (
    ieat === undefined ||
    sad === undefined ||
    lpd === undefined ||
    hsid === undefined
  ) {
    return;
  }

  const iopcValues = sourceSeries.get("iopc");
  const leValues = sourceSeries.get("le");
  if (!iopcValues || !leValues) {
    return;
  }

  sourceSeries.set(
    POPULATION_HIDDEN_SERIES.aiopc,
    deriveSmoothSeriesValues(iopcValues, dt, ieat, sourceFrame.time.length),
  );
  sourceSeries.set(
    POPULATION_HIDDEN_SERIES.diopc,
    deriveDlinf3SeriesValues(iopcValues, dt, sad, sourceFrame.time.length),
  );
  sourceSeries.set(
    POPULATION_HIDDEN_SERIES.ple,
    deriveDlinf3SeriesValues(leValues, dt, lpd, sourceFrame.time.length),
  );

  const sfsnLookup = prepared.lookupLibrary.get("SFSN");
  const frsnLookup = prepared.lookupLibrary.get("FRSN");
  const cmpleLookup = prepared.lookupLibrary.get("CMPLE");
  const fmLookup = prepared.lookupLibrary.get("FM");
  const fsafcLookup = prepared.lookupLibrary.get("FSAFC");
  const fceLookup = prepared.lookupLibrary.get("FCE_TOCLIP");
  if (
    !sfsnLookup ||
    !frsnLookup ||
    !cmpleLookup ||
    !fmLookup ||
    !fsafcLookup ||
    !fceLookup
  ) {
    return;
  }

  let birthSupportFrame: RuntimeStateFrame = {
    request: sourceFrame.request,
    time: sourceFrame.time,
    constantsUsed,
    series: sourceSeries,
  };

  for (const definition of [
    createFieDerivedDefinition(),
    createSfsnDerivedDefinition(sfsnLookup),
    createFrsnDerivedDefinition(frsnLookup),
    createDcfsDerivedDefinition(constantsUsed),
    createCmpleDerivedDefinition(cmpleLookup),
    createDtfDerivedDefinition(),
    createFmDerivedDefinition(fmLookup),
    createMtfDerivedDefinition(constantsUsed),
    createNfcDerivedDefinition(),
    createFsafcDerivedDefinition(fsafcLookup),
    createFcapcDerivedDefinition(),
  ]) {
    sourceSeries.set(
      definition.variable,
      deriveSeriesValues(birthSupportFrame, definition),
    );
  }

  const fcapcValues = sourceSeries.get(POPULATION_HIDDEN_SERIES.fcapc);
  if (!fcapcValues) {
    return;
  }
  sourceSeries.set(
    POPULATION_HIDDEN_SERIES.fcfpc,
    deriveDlinf3SeriesValues(fcapcValues, dt, hsid, sourceFrame.time.length),
  );

  birthSupportFrame = {
    request: sourceFrame.request,
    time: sourceFrame.time,
    constantsUsed,
    series: sourceSeries,
  };
  for (const definition of [
    createFceDerivedDefinition(constantsUsed, fceLookup),
    createTfDerivedDefinition(),
    createBirthsDerivedDefinition(constantsUsed),
    createBirthRateDerivedDefinition(),
  ]) {
    sourceSeries.set(
      definition.variable,
      deriveSeriesValues(birthSupportFrame, definition),
    );
  }
}

export function maybePopulatePopulationOutputSeries(
  variable: string,
  sourceFrame: RuntimeStateFrame,
  series: Map<string, Float64Array>,
): boolean {
  const isCohortOutput = POPULATION_COHORT_OUTPUTS.includes(
    variable as (typeof POPULATION_COHORT_OUTPUTS)[number],
  );
  const isMortalityOutput = POPULATION_MORTALITY_OUTPUTS.includes(
    variable as (typeof POPULATION_MORTALITY_OUTPUTS)[number],
  );
  const isDeathOutput = POPULATION_DEATH_OUTPUTS.includes(
    variable as (typeof POPULATION_DEATH_OUTPUTS)[number],
  );
  const isStockOutput = POPULATION_STOCK_OUTPUTS.includes(
    variable as (typeof POPULATION_STOCK_OUTPUTS)[number],
  );
  const isBirthOutput = POPULATION_BIRTH_OUTPUTS.includes(
    variable as (typeof POPULATION_BIRTH_OUTPUTS)[number],
  );
  if (
    variable !== "le" &&
    variable !== "pop" &&
    !isCohortOutput &&
    !isMortalityOutput &&
    !isDeathOutput &&
    !isStockOutput &&
    !isBirthOutput
  ) {
    return false;
  }

  const values = sourceFrame.series.get(variable);
  if (!values) {
    return false;
  }
  series.set(variable, values);
  return true;
}
