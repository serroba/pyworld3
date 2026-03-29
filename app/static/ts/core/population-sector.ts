import type { ConstantMap, SimulationResult } from "../simulation-contracts.js";
import type { RuntimePreparation } from "./browser-native-runtime.js";
import { Smooth } from "./runtime-primitives.js";
import type {
  RuntimeDerivedDefinition,
  RuntimeObservation,
  RuntimeStateFrame,
} from "./runtime-state-frame.js";
import type { LookupInterpolator } from "./world3-tables.js";

const DEFAULT_HEALTH_POLICY_YEAR = 1940;

export const POPULATION_HIDDEN_SERIES = {
  cmi: "__cmi",
  ehspc: "__ehspc",
  fpu: "__fpu",
  hsapc: "__hsapc",
  lmc: "__lmc",
  lmf: "__lmf",
  lmhs: "__lmhs",
  lmhs1: "__lmhs1",
  lmhs2: "__lmhs2",
  lmp: "__lmp",
} as const;

const POPULATION_MORTALITY_OUTPUTS = ["m1", "m2", "m3", "m4"] as const;

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

export function extendPopulationSourceVariables(
  sourceVariables: Set<string>,
  outputVariables: string[],
  fixture: SimulationResult,
  lookupLibrary?: Map<string, LookupInterpolator>,
): {
  canUseNativeLifeExpectancy: boolean;
  canUseNativeMortality: boolean;
} {
  const needsLifeExpectancy =
    outputVariables.includes("le") ||
    outputVariables.some((variable) =>
      POPULATION_MORTALITY_OUTPUTS.includes(variable as (typeof POPULATION_MORTALITY_OUTPUTS)[number]),
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
    outputVariables.some((variable) =>
      POPULATION_MORTALITY_OUTPUTS.includes(variable as (typeof POPULATION_MORTALITY_OUTPUTS)[number]),
    ) &&
    canUseNativeLifeExpectancy &&
    Boolean(lookupLibrary?.has("M1")) &&
    Boolean(lookupLibrary?.has("M2")) &&
    Boolean(lookupLibrary?.has("M3")) &&
    Boolean(lookupLibrary?.has("M4"));

  return { canUseNativeLifeExpectancy, canUseNativeMortality };
}

export function populatePopulationNativeSupportSeries(
  sourceFrame: RuntimeStateFrame,
  sourceSeries: Map<string, Float64Array>,
  prepared: RuntimePreparation,
  constantsUsed: ConstantMap,
  canUseNativeLifeExpectancy: boolean,
  canUseNativeMortality = false,
): void {
  if (!canUseNativeLifeExpectancy) {
    return;
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
}

export function maybePopulatePopulationOutputSeries(
  variable: string,
  sourceFrame: RuntimeStateFrame,
  series: Map<string, Float64Array>,
): boolean {
  const isMortalityOutput = POPULATION_MORTALITY_OUTPUTS.includes(
    variable as (typeof POPULATION_MORTALITY_OUTPUTS)[number],
  );
  if (variable !== "le" && !isMortalityOutput) {
    return false;
  }

  const values = sourceFrame.series.get(variable);
  if (!values) {
    return false;
  }
  series.set(variable, values);
  return true;
}
