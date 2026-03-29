import type { ConstantMap } from "../simulation-contracts.js";
import type { RuntimePreparation } from "./browser-native-runtime.js";
import { Dlinf3, Smooth } from "./runtime-primitives.js";
import type {
  RuntimeDerivedDefinition,
  RuntimeStateFrame,
} from "./runtime-state-frame.js";
import {
  POPULATION_HIDDEN_SERIES,
  createBirthRateDerivedDefinition,
  createBirthsDerivedDefinition,
  createCdrDerivedDefinition,
  createCmpleDerivedDefinition,
  createCmiDerivedDefinition,
  createDcfsDerivedDefinition,
  createDeathDerivedDefinition,
  createDtfDerivedDefinition,
  createFcapcDerivedDefinition,
  createFceDerivedDefinition,
  createFieDerivedDefinition,
  createFmDerivedDefinition,
  createFrsnDerivedDefinition,
  createFsafcDerivedDefinition,
  createFpuDerivedDefinition,
  createHsapcDerivedDefinition,
  createLeDerivedDefinition,
  createLmcDerivedDefinition,
  createLmfDerivedDefinition,
  createLmhsDerivedDefinitions,
  createLmpDerivedDefinition,
  createMaturationDerivedDefinition,
  createMortalityDerivedDefinition,
  createMtfDerivedDefinition,
  createNfcDerivedDefinition,
  createPopulationSumDerivedDefinition,
  createSfsnDerivedDefinition,
  createTfDerivedDefinition,
  createTotalDeathsDerivedDefinition,
} from "./population-sector.js";

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
  const ehspc = deriveSmoothSeriesValues(
    hsapcValues,
    prepared.request.dt ?? 1,
    constantsUsed.hsid ?? 20,
    sourceFrame.time.length,
  );
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
    constantsUsed.iphst ?? 1940,
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

  for (const variable of ["m1", "m2", "m3", "m4"] as const) {
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
