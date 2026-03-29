import type { ConstantMap, SimulationResult } from "../simulation-contracts.js";
import type { RuntimePreparation } from "./browser-native-runtime.js";
import { AGRICULTURE_HIDDEN_SERIES } from "./agriculture-sector.js";
import { Delay3 } from "./runtime-primitives.js";
import type {
  RuntimeStateFrame,
} from "./runtime-state-frame.js";
import { RESOURCE_HIDDEN_SERIES } from "./resource-sector.js";
import type { LookupInterpolator } from "./world3-tables.js";

export const DEFAULT_POLLUTION_POLICY_YEAR = 1975;

export const POLLUTION_OUTPUTS = new Set([
  "ppol",
  "ppolx",
  "ppgio",
  "ppgao",
  "ppgf",
  "ppgr",
  "ppapr",
  "ppasr",
  "pptd",
  "ahlm",
  "ahl",
]);

export type PollutionOrderedSeries = {
  ppol: Float64Array;
  ppolx: Float64Array;
  ppgio: Float64Array;
  ppgao: Float64Array;
  ppgf: Float64Array;
  ppgr: Float64Array;
  ppapr: Float64Array;
  ppasr: Float64Array;
  pptd: Float64Array;
  ahlm: Float64Array;
  ahl: Float64Array;
};

function clipAtPolicyYear(
  beforeValue: number,
  afterValue: number,
  time: number,
  policyYear: number,
): number {
  return time > policyYear ? afterValue : beforeValue;
}

function projectSeriesValues(values: number[], indices: number[], name: string): Float64Array {
  return Float64Array.from(
    indices.map((index) => {
      const value = values[index];
      if (value === undefined) {
        throw new Error(
          `Fixture series '${name}' is missing a value at index ${index}.`,
        );
      }
      return value;
    }),
  );
}

function getLookupOrThrow(
  lookupLibrary: Map<string, LookupInterpolator>,
  name: string,
): LookupInterpolator {
  const lookup = lookupLibrary.get(name);
  if (!lookup) {
    throw new Error(`Fixture-backed runtime cannot derive pollution support because lookup '${name}' is missing.`);
  }
  return lookup;
}

function getConstantOrThrow(constantsUsed: ConstantMap, name: keyof ConstantMap): number {
  const value = constantsUsed[name];
  if (value === undefined) {
    throw new Error(`Fixture-backed runtime cannot derive pollution support because constant '${name}' is missing.`);
  }
  return value;
}

function sourceSeriesArray(series: Float64Array | undefined, name: string): Float64Array {
  if (!series) {
    throw new Error(`Fixture-backed runtime cannot derive pollution support because source series '${name}' is missing.`);
  }
  return series;
}

function valueAt(series: Float64Array, index: number, name: string): number {
  const value = series[index];
  if (value === undefined) {
    throw new Error(`Runtime pollution series '${name}' is missing a value at index ${index}.`);
  }
  return value;
}

export function extendPollutionSourceVariables(
  sourceVariables: Set<string>,
  outputVariables: string[],
  fixture: SimulationResult,
  lookupLibrary: Map<string, LookupInterpolator>,
  canUseNativeAgricultureOrdering: boolean,
  canUseNativeNrFlow: boolean,
  needsNativePollutionForPopulation = false,
): { canUseNativePollutionPath: boolean } {
  const needsNativePollutionPath =
    outputVariables.some((variable) => POLLUTION_OUTPUTS.has(variable)) ||
    needsNativePollutionForPopulation;

  const hasAgricultureInputs =
    canUseNativeAgricultureOrdering ||
    (Boolean(fixture.series.aiph) && Boolean(fixture.series.al));
  const hasResourceInputs =
    canUseNativeNrFlow || Boolean(fixture.series.pcrum);
  const hasConstants =
    fixture.constants_used.ppoli !== undefined &&
    fixture.constants_used.ppol70 !== undefined &&
    fixture.constants_used.ahl70 !== undefined &&
    fixture.constants_used.amti !== undefined &&
    fixture.constants_used.imti !== undefined &&
    fixture.constants_used.imef !== undefined &&
    fixture.constants_used.fipm !== undefined &&
    fixture.constants_used.frpm !== undefined &&
    fixture.constants_used.ppgf1 !== undefined &&
    fixture.constants_used.ppgf2 !== undefined &&
    fixture.constants_used.pptd1 !== undefined &&
    fixture.constants_used.pptd2 !== undefined;

  const canUseNativePollutionPath =
    needsNativePollutionPath &&
    Boolean(fixture.series.pop) &&
    hasAgricultureInputs &&
    hasResourceInputs &&
    hasConstants &&
    lookupLibrary.has("AHLM");

  if (canUseNativePollutionPath) {
    for (const variable of POLLUTION_OUTPUTS) {
      sourceVariables.delete(variable);
    }
    sourceVariables.add("pop");
    if (!canUseNativeAgricultureOrdering) {
      sourceVariables.add("al");
      sourceVariables.add("aiph");
    }
    if (!canUseNativeNrFlow) {
      sourceVariables.add("pcrum");
    }
  } else {
    for (const variable of outputVariables) {
      if (POLLUTION_OUTPUTS.has(variable)) {
        sourceVariables.add(variable);
      }
    }
    if (needsNativePollutionForPopulation) {
      sourceVariables.add("ppolx");
    }
  }

  return { canUseNativePollutionPath };
}

export function computePollutionOrderedSeries(
  sourceFrame: RuntimeStateFrame,
  prepared: RuntimePreparation,
  constantsUsed: ConstantMap,
): PollutionOrderedSeries {
  const { time } = sourceFrame;
  const length = time.length;
  const policyYear = prepared.request.pyear ?? DEFAULT_POLLUTION_POLICY_YEAR;

  const ppol70 = getConstantOrThrow(constantsUsed, "ppol70");
  const ppoli = getConstantOrThrow(constantsUsed, "ppoli");
  const ahl70 = getConstantOrThrow(constantsUsed, "ahl70");
  const amti = getConstantOrThrow(constantsUsed, "amti");
  const imti = getConstantOrThrow(constantsUsed, "imti");
  const imef = getConstantOrThrow(constantsUsed, "imef");
  const fipm = getConstantOrThrow(constantsUsed, "fipm");
  const frpm = getConstantOrThrow(constantsUsed, "frpm");
  const ppgf1 = getConstantOrThrow(constantsUsed, "ppgf1");
  const ppgf2 = getConstantOrThrow(constantsUsed, "ppgf2");
  const pptd1 = getConstantOrThrow(constantsUsed, "pptd1");
  const pptd2 = getConstantOrThrow(constantsUsed, "pptd2");

  const ahlmLookup = getLookupOrThrow(prepared.lookupLibrary, "AHLM");

  const pop = sourceSeriesArray(sourceFrame.series.get("pop"), "pop");
  const al = sourceFrame.series.get("al");
  const aiph =
    sourceFrame.series.get(AGRICULTURE_HIDDEN_SERIES.aiph) ??
    sourceFrame.series.get("aiph");
  const pcrum =
    sourceFrame.series.get(RESOURCE_HIDDEN_SERIES.pcrum) ??
    sourceFrame.series.get("pcrum");

  const alValues = sourceSeriesArray(al, "al");
  const aiphValues = sourceSeriesArray(aiph, AGRICULTURE_HIDDEN_SERIES.aiph);
  const pcrumValues = sourceSeriesArray(pcrum, RESOURCE_HIDDEN_SERIES.pcrum);

  const ppol = new Float64Array(length);
  const ppolx = new Float64Array(length);
  const ppgio = new Float64Array(length);
  const ppgao = new Float64Array(length);
  const ppgf = new Float64Array(length);
  const ppgr = new Float64Array(length);
  const ppapr = new Float64Array(length);
  const ppasr = new Float64Array(length);
  const pptd = new Float64Array(length);
  const ahlm = new Float64Array(length);
  const ahl = new Float64Array(length);

  const delayPpgr = new Delay3(ppgr, sourceFrame.request.dt ?? 1, length);

  let currentPpol = ppoli;

  for (let index = 0; index < length; index += 1) {
    const currentTime = time[index] ?? 0;
    if (index > 0) {
      const previousTime = time[index - 1];
      if (previousTime === undefined) {
        throw new Error(`Runtime pollution timestep index ${index - 1} is out of bounds.`);
      }
      const dt = currentTime - previousTime;
      currentPpol = currentPpol + dt * (valueAt(ppapr, index - 1, "ppapr") - valueAt(ppasr, index - 1, "ppasr"));
    }

    ppol[index] = currentPpol;
    const ppolValue = valueAt(ppol, index, "ppol");
    ppolx[index] = ppol70 === 0 ? 0 : ppolValue / ppol70;

    const popValue = valueAt(pop, index, "pop");
    const alValue = valueAt(alValues, index, "al");
    const aiphValue = valueAt(aiphValues, index, AGRICULTURE_HIDDEN_SERIES.aiph);
    const pcrumValue = valueAt(pcrumValues, index, RESOURCE_HIDDEN_SERIES.pcrum);

    ppgio[index] = pcrumValue * popValue * frpm * imef * imti;
    ppgao[index] = aiphValue * alValue * fipm * amti;
    ppgf[index] = clipAtPolicyYear(ppgf1, ppgf2, currentTime, policyYear);
    ppgr[index] = (valueAt(ppgio, index, "ppgio") + valueAt(ppgao, index, "ppgao")) * valueAt(ppgf, index, "ppgf");
    pptd[index] = clipAtPolicyYear(pptd1, pptd2, currentTime, policyYear);
    ppapr[index] = delayPpgr.step(index, valueAt(pptd, index, "pptd"));
    ahlm[index] = ahlmLookup.evaluate(valueAt(ppolx, index, "ppolx"));
    ahl[index] = valueAt(ahlm, index, "ahlm") * ahl70;
    const ahlValue = valueAt(ahl, index, "ahl");
    ppasr[index] = ahlValue === 0 ? 0 : ppolValue / (ahlValue * 1.4);
  }

  return {
    ppol,
    ppolx,
    ppgio,
    ppgao,
    ppgf,
    ppgr,
    ppapr,
    ppasr,
    pptd,
    ahlm,
    ahl,
  };
}

export function populatePollutionNativeSupportSeries(
  sourceFrame: RuntimeStateFrame,
  sourceSeries: Map<string, Float64Array>,
  prepared: RuntimePreparation,
  constantsUsed: ConstantMap,
  canUseNativePollutionPath: boolean,
): void {
  if (!canUseNativePollutionPath) {
    return;
  }

  const orderedSeries = computePollutionOrderedSeries(
    sourceFrame,
    prepared,
    constantsUsed,
  );
  for (const [name, values] of Object.entries(orderedSeries)) {
    sourceSeries.set(name, values);
  }
}

export function maybePopulatePollutionOutputSeries(
  variable: string,
  sourceFrame: RuntimeStateFrame,
  outputSeries: Map<string, Float64Array>,
  fixture: SimulationResult,
  projectedIndices: number[],
): boolean {
  if (!POLLUTION_OUTPUTS.has(variable)) {
    return false;
  }

  const values = sourceFrame.series.get(variable);
  if (values) {
    outputSeries.set(variable, values);
    return true;
  }

  const source = fixture.series[variable];
  if (source) {
    outputSeries.set(
      variable,
      projectSeriesValues(source.values, projectedIndices, source.name),
    );
    return true;
  }

  return false;
}
