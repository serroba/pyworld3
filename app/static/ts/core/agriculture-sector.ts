import type { ConstantMap, SimulationResult } from "../simulation-contracts.js";
import type { RuntimePreparation } from "./browser-native-runtime.js";
import type {
  RuntimeDerivedDefinition,
  RuntimeObservation,
  RuntimeStateFrame,
} from "./runtime-state-frame.js";
import { Smooth } from "./runtime-primitives.js";
import type { LookupInterpolator } from "./world3-tables.js";

const DEFAULT_AGRICULTURE_POLICY_YEAR = 1975;

export const AGRICULTURE_HIDDEN_SERIES = {
  aiph: "__aiph",
  all: "all",
  alai: "alai",
  cai: "cai",
  dcph: "dcph",
  falm: "falm",
  fiald: "fiald",
  fr: "fr",
  ifpc: "__ifpc",
  lfd: "lfd",
  lfdr: "lfdr",
  lfert: "lfert",
  lfr: "lfr",
  lfrt: "lfrt",
  llmy: "llmy",
  ldr: "ldr",
  ler: "ler",
  lymap: "__lymap",
  lymc: "__lymc",
  lyf: "__lyf",
  mpai: "mpai",
  mpld: "mpld",
  mlymc: "mlymc",
  pfr: "pfr",
  pal: "pal",
  uil: "uil",
  uilpc: "uilpc",
  uilr: "uilr",
  lrui: "lrui",
} as const;

export type AgricultureOrderedSeries = {
  al: Float64Array;
  f: Float64Array;
  fioaa: Float64Array;
  fpc: Float64Array;
  ly: Float64Array;
  tai: Float64Array;
  [AGRICULTURE_HIDDEN_SERIES.aiph]: Float64Array;
  [AGRICULTURE_HIDDEN_SERIES.all]: Float64Array;
  [AGRICULTURE_HIDDEN_SERIES.alai]: Float64Array;
  [AGRICULTURE_HIDDEN_SERIES.cai]: Float64Array;
  [AGRICULTURE_HIDDEN_SERIES.dcph]: Float64Array;
  [AGRICULTURE_HIDDEN_SERIES.falm]: Float64Array;
  [AGRICULTURE_HIDDEN_SERIES.fiald]: Float64Array;
  [AGRICULTURE_HIDDEN_SERIES.fr]: Float64Array;
  [AGRICULTURE_HIDDEN_SERIES.ifpc]: Float64Array;
  [AGRICULTURE_HIDDEN_SERIES.lfd]: Float64Array;
  [AGRICULTURE_HIDDEN_SERIES.lfdr]: Float64Array;
  [AGRICULTURE_HIDDEN_SERIES.lfert]: Float64Array;
  [AGRICULTURE_HIDDEN_SERIES.lfr]: Float64Array;
  [AGRICULTURE_HIDDEN_SERIES.lfrt]: Float64Array;
  [AGRICULTURE_HIDDEN_SERIES.ldr]: Float64Array;
  [AGRICULTURE_HIDDEN_SERIES.ler]: Float64Array;
  [AGRICULTURE_HIDDEN_SERIES.llmy]: Float64Array;
  [AGRICULTURE_HIDDEN_SERIES.lrui]: Float64Array;
  [AGRICULTURE_HIDDEN_SERIES.lyf]: Float64Array;
  [AGRICULTURE_HIDDEN_SERIES.lymap]: Float64Array;
  [AGRICULTURE_HIDDEN_SERIES.lymc]: Float64Array;
  [AGRICULTURE_HIDDEN_SERIES.mpai]: Float64Array;
  [AGRICULTURE_HIDDEN_SERIES.mpld]: Float64Array;
  [AGRICULTURE_HIDDEN_SERIES.mlymc]: Float64Array;
  [AGRICULTURE_HIDDEN_SERIES.pal]: Float64Array;
  [AGRICULTURE_HIDDEN_SERIES.pfr]: Float64Array;
  [AGRICULTURE_HIDDEN_SERIES.uil]: Float64Array;
  [AGRICULTURE_HIDDEN_SERIES.uilpc]: Float64Array;
  [AGRICULTURE_HIDDEN_SERIES.uilr]: Float64Array;
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

function getLookupOrThrow(
  lookupLibrary: Map<string, LookupInterpolator>,
  name: string,
): LookupInterpolator {
  const lookup = lookupLibrary.get(name);
  if (!lookup) {
    throw new Error(`Fixture-backed runtime cannot derive agriculture support because lookup '${name}' is missing.`);
  }
  return lookup;
}

function getConstantOrThrow(constantsUsed: ConstantMap, name: keyof ConstantMap): number {
  const value = constantsUsed[name];
  if (value === undefined) {
    throw new Error(`Fixture-backed runtime cannot derive agriculture support because constant '${name}' is missing.`);
  }
  return value;
}

function getSeriesValue(
  sourceSeries: Map<string, Float64Array>,
  name: string,
  index: number,
): number {
  const series = sourceSeries.get(name);
  const value = series?.[index];
  if (value === undefined) {
    throw new Error(`Fixture-backed runtime cannot derive agriculture support because source series '${name}' is missing at index ${index}.`);
  }
  return value;
}

function valueAt(series: Float64Array, index: number, name: string): number {
  const value = series[index];
  if (value === undefined) {
    throw new Error(`Runtime agriculture series '${name}' is missing a value at index ${index}.`);
  }
  return value;
}

export function createFoodDerivedDefinition(
  constantsUsed: ConstantMap,
): RuntimeDerivedDefinition {
  return {
    variable: "f",
    derive: (observation: RuntimeObservation) => {
      const ly = observation.values.ly;
      const al = observation.values.al;
      if (ly === undefined || al === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive 'f' because 'ly' or 'al' is missing.",
        );
      }
      const lfh = constantsUsed.lfh ?? 0.7;
      const pl = constantsUsed.pl ?? 0.1;
      return ly * al * lfh * (1 - pl);
    },
  };
}

export function createAiphDerivedDefinition(): RuntimeDerivedDefinition {
  return {
    variable: AGRICULTURE_HIDDEN_SERIES.aiph,
    derive: (observation: RuntimeObservation) => {
      const ai = observation.values.ai;
      const falm = observation.values.falm;
      const al = observation.values.al;
      if (ai === undefined || falm === undefined || al === undefined || al === 0) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__aiph' because 'ai', 'falm', or 'al' is missing or zero.",
        );
      }
      return ai * (1 - falm) / al;
    },
  };
}

export function createLymcDerivedDefinition(
  lymcLookup: LookupInterpolator,
): RuntimeDerivedDefinition {
  return {
    variable: AGRICULTURE_HIDDEN_SERIES.lymc,
    derive: (observation: RuntimeObservation) => {
      const aiph = observation.values[AGRICULTURE_HIDDEN_SERIES.aiph];
      if (aiph === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__lymc' because '__aiph' is missing.",
        );
      }
      return lymcLookup.evaluate(aiph);
    },
  };
}

export function createLyfDerivedDefinition(
  constantsUsed: ConstantMap,
  policyYear = DEFAULT_AGRICULTURE_POLICY_YEAR,
): RuntimeDerivedDefinition {
  return {
    variable: AGRICULTURE_HIDDEN_SERIES.lyf,
    derive: (observation: RuntimeObservation) =>
      clipAtPolicyYear(
        constantsUsed.lyf1 ?? 1,
        constantsUsed.lyf2 ?? 1,
        observation.time,
        policyYear,
      ),
  };
}

export function createLymapDerivedDefinition(
  constantsUsed: ConstantMap,
  lymap1Lookup: LookupInterpolator,
  lymap2Lookup: LookupInterpolator,
  policyYear = DEFAULT_AGRICULTURE_POLICY_YEAR,
): RuntimeDerivedDefinition {
  return {
    variable: AGRICULTURE_HIDDEN_SERIES.lymap,
    derive: (observation: RuntimeObservation) => {
      const io = observation.values.io;
      const io70 = constantsUsed.io70;
      if (io === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__lymap' because 'io' is missing.",
        );
      }
      if (io70 === undefined || io70 === 0) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__lymap' because constant 'io70' is missing or zero.",
        );
      }
      const ioRatio = io / io70;
      return clipAtPolicyYear(
        lymap1Lookup.evaluate(ioRatio),
        lymap2Lookup.evaluate(ioRatio),
        observation.time,
        policyYear,
      );
    },
  };
}

export function createLyDerivedDefinition(): RuntimeDerivedDefinition {
  return {
    variable: "ly",
    derive: (observation: RuntimeObservation) => {
      const lyf = observation.values[AGRICULTURE_HIDDEN_SERIES.lyf];
      const lfert = observation.values.lfert;
      const lymc = observation.values[AGRICULTURE_HIDDEN_SERIES.lymc];
      const lymap = observation.values[AGRICULTURE_HIDDEN_SERIES.lymap];
      if (
        lyf === undefined ||
        lfert === undefined ||
        lymc === undefined ||
        lymap === undefined
      ) {
        throw new Error(
          "Fixture-backed runtime cannot derive 'ly' because productivity inputs are missing.",
        );
      }
      return lyf * lfert * lymc * lymap;
    },
  };
}

export function createFoodPerCapitaDerivedDefinition(): RuntimeDerivedDefinition {
  return {
    variable: "fpc",
    derive: (observation: RuntimeObservation) => {
      const f = observation.values.f;
      const pop = observation.values.pop;
      if (f === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive 'fpc' because the source variable 'f' is missing.",
        );
      }
      if (pop === undefined || pop === 0) {
        throw new Error(
          "Fixture-backed runtime cannot derive 'fpc' because the source variable 'pop' is missing or zero.",
        );
      }
      return f / pop;
    },
  };
}

export function createIfpcDerivedDefinition(
  ifpc1Lookup: LookupInterpolator,
  ifpc2Lookup: LookupInterpolator,
  policyYear = DEFAULT_AGRICULTURE_POLICY_YEAR,
): RuntimeDerivedDefinition {
  return {
    variable: AGRICULTURE_HIDDEN_SERIES.ifpc,
    derive: (observation: RuntimeObservation) => {
      const iopc = observation.values.iopc;
      if (iopc === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__ifpc' because the source variable 'iopc' is missing.",
        );
      }
      return clipAtPolicyYear(
        ifpc1Lookup.evaluate(iopc),
        ifpc2Lookup.evaluate(iopc),
        observation.time,
        policyYear,
      );
    },
  };
}

export function createFioaaDerivedDefinition(
  fioaa1Lookup: LookupInterpolator,
  fioaa2Lookup: LookupInterpolator,
  policyYear = DEFAULT_AGRICULTURE_POLICY_YEAR,
): RuntimeDerivedDefinition {
  return {
    variable: "fioaa",
    derive: (observation: RuntimeObservation) => {
      const fpc = observation.values.fpc;
      const ifpc = observation.values[AGRICULTURE_HIDDEN_SERIES.ifpc];
      if (fpc === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive 'fioaa' because the source variable 'fpc' is missing.",
        );
      }
      if (ifpc === undefined || ifpc === 0) {
        throw new Error(
          "Fixture-backed runtime cannot derive 'fioaa' because the source variable '__ifpc' is missing or zero.",
        );
      }
      return clipAtPolicyYear(
        fioaa1Lookup.evaluate(fpc / ifpc),
        fioaa2Lookup.evaluate(fpc / ifpc),
        observation.time,
        policyYear,
      );
    },
  };
}

export function createTaiDerivedDefinition(): RuntimeDerivedDefinition {
  return {
    variable: "tai",
    derive: (observation: RuntimeObservation) => {
      const io = observation.values.io;
      const fioaa = observation.values.fioaa;
      if (io === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive 'tai' because the source variable 'io' is missing.",
        );
      }
      if (fioaa === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive 'tai' because the source variable 'fioaa' is missing.",
        );
      }
      return io * fioaa;
    },
  };
}

export function extendAgricultureSourceVariables(
  sourceVariables: Set<string>,
  outputVariables: string[],
  fixture: SimulationResult,
  lookupLibrary?: Map<string, LookupInterpolator>,
  needsNativeFoodPath = false,
): {
  canUseNativeFoodPath: boolean;
  canUseNativeAgriculturalAllocation: boolean;
  canUseNativeAgricultureProductivity: boolean;
  canUseNativeAgricultureOrdering: boolean;
} {
  const needsAgricultureOrdering = outputVariables.some((variable) =>
    [
      "al",
      "f",
      "fioaa",
      "fpc",
      "ly",
      "tai",
      "pal",
      "ldr",
      "ler",
      "lrui",
      "dcph",
      "fiald",
      "cai",
      "ai",
      "falm",
      "fr",
      "pfr",
      "all",
      "llmy",
      "uil",
      "uilpc",
      "uilr",
      "lfert",
      "lfr",
      "lfrt",
      "lfd",
      "lfdr",
      "mpld",
      "mpai",
      "mlymc",
    ].includes(variable),
  ) || needsNativeFoodPath;

  const canUseNativeAgricultureOrdering =
    needsAgricultureOrdering &&
    Boolean(fixture.series.pop) &&
    Boolean(fixture.series.iopc) &&
    Boolean(fixture.series.ppolx) &&
    fixture.constants_used.ali !== undefined &&
    fixture.constants_used.pali !== undefined &&
    fixture.constants_used.uili !== undefined &&
    fixture.constants_used.lferti !== undefined &&
    fixture.constants_used.palt !== undefined &&
    fixture.constants_used.uildt !== undefined &&
    fixture.constants_used.alln !== undefined &&
    fixture.constants_used.ilf !== undefined &&
    fixture.constants_used.io70 !== undefined &&
    fixture.constants_used.sfpc !== undefined &&
    fixture.constants_used.fspd !== undefined &&
    fixture.constants_used.sd !== undefined &&
    Boolean(lookupLibrary?.has("IFPC1")) &&
    Boolean(lookupLibrary?.has("IFPC2")) &&
    Boolean(lookupLibrary?.has("FIOAA1")) &&
    Boolean(lookupLibrary?.has("FIOAA2")) &&
    Boolean(lookupLibrary?.has("DCPH")) &&
    Boolean(lookupLibrary?.has("LYMC")) &&
    Boolean(lookupLibrary?.has("LYMAP1")) &&
    Boolean(lookupLibrary?.has("LYMAP2")) &&
    Boolean(lookupLibrary?.has("FIALD")) &&
    Boolean(lookupLibrary?.has("MLYMC")) &&
    Boolean(lookupLibrary?.has("LLMY1")) &&
    Boolean(lookupLibrary?.has("LLMY2")) &&
    Boolean(lookupLibrary?.has("UILPC")) &&
    Boolean(lookupLibrary?.has("LFDR")) &&
    Boolean(lookupLibrary?.has("LFRT")) &&
    Boolean(lookupLibrary?.has("FALM"));

  if (canUseNativeAgricultureOrdering) {
    sourceVariables.delete("al");
    sourceVariables.delete("ly");
    sourceVariables.delete("f");
    sourceVariables.delete("fpc");
    sourceVariables.delete("fioaa");
    sourceVariables.delete("tai");
    sourceVariables.add("pop");
    sourceVariables.add("iopc");
    sourceVariables.add("ppolx");
  }

  const needsAgricultureFoodPath =
    needsNativeFoodPath ||
    outputVariables.includes("f") ||
    outputVariables.includes("fpc") ||
    outputVariables.includes("fioaa") ||
    outputVariables.includes("tai");

  const canUseNativeFoodPath =
    needsAgricultureFoodPath &&
    !canUseNativeAgricultureOrdering &&
    Boolean(fixture.series.al) &&
    Boolean(fixture.series.ly) &&
    Boolean(fixture.series.pop);

  if (canUseNativeFoodPath) {
    sourceVariables.add("al");
    sourceVariables.add("ly");
    sourceVariables.add("pop");
  }

  const canUseNativeAgriculturalAllocation =
    (outputVariables.includes("fioaa") || outputVariables.includes("tai")) &&
    !canUseNativeAgricultureOrdering &&
    canUseNativeFoodPath &&
    Boolean(fixture.series.io) &&
    Boolean(fixture.series.iopc) &&
    Boolean(lookupLibrary?.has("IFPC1")) &&
    Boolean(lookupLibrary?.has("IFPC2")) &&
    Boolean(lookupLibrary?.has("FIOAA1")) &&
    Boolean(lookupLibrary?.has("FIOAA2"));

  if (canUseNativeAgriculturalAllocation) {
    sourceVariables.add("io");
    sourceVariables.add("iopc");
  }

  const canUseNativeAgricultureProductivity =
    (outputVariables.includes("ly") || canUseNativeFoodPath) &&
    !canUseNativeAgricultureOrdering &&
    Boolean(fixture.series.ai) &&
    Boolean(fixture.series.falm) &&
    Boolean(fixture.series.al) &&
    Boolean(fixture.series.io) &&
    Boolean(fixture.series.lfert) &&
    Boolean(lookupLibrary?.has("LYMC")) &&
    Boolean(lookupLibrary?.has("LYMAP1")) &&
    Boolean(lookupLibrary?.has("LYMAP2")) &&
    fixture.constants_used.io70 !== undefined;

  if (canUseNativeAgricultureProductivity) {
    sourceVariables.add("al");
    sourceVariables.add("ai");
    sourceVariables.add("falm");
    sourceVariables.add("io");
    sourceVariables.add("lfert");
  }

  return {
    canUseNativeFoodPath,
    canUseNativeAgriculturalAllocation,
    canUseNativeAgricultureProductivity,
    canUseNativeAgricultureOrdering,
  };
}

export function computeAgricultureOrderedSeries(
  sourceFrame: RuntimeStateFrame,
  prepared: RuntimePreparation,
  constantsUsed: ConstantMap,
): AgricultureOrderedSeries {
  const { time } = sourceFrame;
  const length = time.length;
  const policyYear = prepared.request.pyear ?? DEFAULT_AGRICULTURE_POLICY_YEAR;
  const lfh = constantsUsed.lfh ?? 0.7;
  const pl = constantsUsed.pl ?? 0.1;
  const palt = getConstantOrThrow(constantsUsed, "palt");
  const uildt = getConstantOrThrow(constantsUsed, "uildt");
  const alln = getConstantOrThrow(constantsUsed, "alln");
  const ilf = getConstantOrThrow(constantsUsed, "ilf");
  const sfpc = getConstantOrThrow(constantsUsed, "sfpc");
  const fspd = getConstantOrThrow(constantsUsed, "fspd");
  const sd = getConstantOrThrow(constantsUsed, "sd");
  const io70 = getConstantOrThrow(constantsUsed, "io70");
  const alai1 = constantsUsed.alai1 ?? 2;
  const alai2 = constantsUsed.alai2 ?? 2;

  const ifpc1Lookup = getLookupOrThrow(prepared.lookupLibrary, "IFPC1");
  const ifpc2Lookup = getLookupOrThrow(prepared.lookupLibrary, "IFPC2");
  const fioaa1Lookup = getLookupOrThrow(prepared.lookupLibrary, "FIOAA1");
  const fioaa2Lookup = getLookupOrThrow(prepared.lookupLibrary, "FIOAA2");
  const dcphLookup = getLookupOrThrow(prepared.lookupLibrary, "DCPH");
  const lymcLookup = getLookupOrThrow(prepared.lookupLibrary, "LYMC");
  const lymap1Lookup = getLookupOrThrow(prepared.lookupLibrary, "LYMAP1");
  const lymap2Lookup = getLookupOrThrow(prepared.lookupLibrary, "LYMAP2");
  const fialdLookup = getLookupOrThrow(prepared.lookupLibrary, "FIALD");
  const mlymcLookup = getLookupOrThrow(prepared.lookupLibrary, "MLYMC");
  const llmy1Lookup = getLookupOrThrow(prepared.lookupLibrary, "LLMY1");
  const llmy2Lookup = getLookupOrThrow(prepared.lookupLibrary, "LLMY2");
  const uilpcLookup = getLookupOrThrow(prepared.lookupLibrary, "UILPC");
  const lfdrLookup = getLookupOrThrow(prepared.lookupLibrary, "LFDR");
  const lfrtLookup = getLookupOrThrow(prepared.lookupLibrary, "LFRT");
  const falmLookup = getLookupOrThrow(prepared.lookupLibrary, "FALM");

  const pop = sourceSeriesArray(sourceFrame.series.get("pop"), "pop");
  const iopc = sourceSeriesArray(sourceFrame.series.get("iopc"), "iopc");
  const ppolx = sourceSeriesArray(sourceFrame.series.get("ppolx"), "ppolx");

  const al = new Float64Array(length);
  const pal = new Float64Array(length);
  const uil = new Float64Array(length);
  const lfert = new Float64Array(length);
  const f = new Float64Array(length);
  const fpc = new Float64Array(length);
  const fioaa = new Float64Array(length);
  const tai = new Float64Array(length);
  const aiph = new Float64Array(length);
  const ifpc = new Float64Array(length);
  const lymap = new Float64Array(length);
  const lymc = new Float64Array(length);
  const lyf = new Float64Array(length);
  const ly = new Float64Array(length);
  const all = new Float64Array(length);
  const alai = new Float64Array(length);
  const cai = new Float64Array(length);
  const dcph = new Float64Array(length);
  const falm = new Float64Array(length);
  const fiald = new Float64Array(length);
  const fr = new Float64Array(length);
  const lfd = new Float64Array(length);
  const lfdr = new Float64Array(length);
  const lfr = new Float64Array(length);
  const lfrt = new Float64Array(length);
  const llmy = new Float64Array(length);
  const ldr = new Float64Array(length);
  const ler = new Float64Array(length);
  const lrui = new Float64Array(length);
  const mpai = new Float64Array(length);
  const mpld = new Float64Array(length);
  const mlymc = new Float64Array(length);
  const pfr = new Float64Array(length);
  const uilpc = new Float64Array(length);
  const uilr = new Float64Array(length);
  const io = new Float64Array(length);

  const ai = new Float64Array(length);
  const smoothCai = new Smooth(cai, sourceFrame.request.dt ?? 1, length);
  const smoothFr = new Smooth(fr, sourceFrame.request.dt ?? 1, length);

  al[0] = getConstantOrThrow(constantsUsed, "ali");
  pal[0] = getConstantOrThrow(constantsUsed, "pali");
  uil[0] = getConstantOrThrow(constantsUsed, "uili");
  lfert[0] = getConstantOrThrow(constantsUsed, "lferti");

  for (let index = 0; index < length; index += 1) {
    const currentTime = time[index] ?? 0;
    const popValue = valueAt(pop, index, "pop");
    const iopcValue = valueAt(iopc, index, "iopc");
    const ppolxValue = valueAt(ppolx, index, "ppolx");
    io[index] = popValue * iopcValue;
    const ioValue = valueAt(io, index, "io");

    ifpc[index] = clipAtPolicyYear(
      ifpc1Lookup.evaluate(iopcValue),
      ifpc2Lookup.evaluate(iopcValue),
      currentTime,
      policyYear,
    );
    alai[index] = clipAtPolicyYear(alai1, alai2, currentTime, policyYear);
    lyf[index] = clipAtPolicyYear(
      constantsUsed.lyf1 ?? 1,
      constantsUsed.lyf2 ?? 1,
      currentTime,
      policyYear,
    );
    lymap[index] = clipAtPolicyYear(
      lymap1Lookup.evaluate(ioValue / io70),
      lymap2Lookup.evaluate(ioValue / io70),
      currentTime,
      policyYear,
    );
    dcph[index] = dcphLookup.evaluate(valueAt(pal, index, "pal") / palt);
    lfdr[index] = lfdrLookup.evaluate(ppolxValue);
    uilpc[index] = uilpcLookup.evaluate(iopcValue);
    uilr[index] = valueAt(uilpc, index, "uilpc") * popValue;

    if (index === 0) {
      let aiValue = 0;
      let pfrValue = 0;
      for (let iteration = 0; iteration < 8; iteration += 1) {
        falm[index] = falmLookup.evaluate(pfrValue);
        const falmValue = valueAt(falm, index, "falm");
        const alValue = valueAt(al, index, "al");
        aiph[index] = alValue === 0 ? 0 : aiValue * (1 - falmValue) / alValue;
        const aiphValue = valueAt(aiph, index, "__aiph");
        lymc[index] = lymcLookup.evaluate(aiphValue);
        mlymc[index] = mlymcLookup.evaluate(aiphValue);
        const lyfValue = valueAt(lyf, index, "__lyf");
        const lfertValue = valueAt(lfert, index, "lfert");
        const lymcValue = valueAt(lymc, index, "__lymc");
        const lymapValue = valueAt(lymap, index, "__lymap");
        ly[index] = lyfValue * lfertValue * lymcValue * lymapValue;
        const lyValue = valueAt(ly, index, "ly");
        f[index] = lyValue * alValue * lfh * (1 - pl);
        const fValue = valueAt(f, index, "f");
        fpc[index] = popValue === 0 ? 0 : fValue / popValue;
        const fpcValue = valueAt(fpc, index, "fpc");
        fr[index] = sfpc === 0 ? 0 : fpcValue / sfpc;
        pfrValue = valueAt(fr, index, "fr");
        const ifpcValue = valueAt(ifpc, index, "__ifpc");
        fioaa[index] = clipAtPolicyYear(
          fioaa1Lookup.evaluate(fpcValue / ifpcValue),
          fioaa2Lookup.evaluate(fpcValue / ifpcValue),
          currentTime,
          policyYear,
        );
        const fioaaValue = valueAt(fioaa, index, "fioaa");
        tai[index] = ioValue * fioaaValue;
        const dcphValue = valueAt(dcph, index, "dcph");
        mpld[index] = dcphValue === 0 ? 0 : lyValue / (dcphValue * sd);
        const alaiValue = valueAt(alai, index, "alai");
        const mlymcValue = valueAt(mlymc, index, "mlymc");
        mpai[index] = lymcValue === 0 ? 0 : alaiValue * lyValue * mlymcValue / lymcValue;
        const mpldValue = valueAt(mpld, index, "mpld");
        const mpaiValue = valueAt(mpai, index, "mpai");
        fiald[index] = mpaiValue === 0 ? 0 : fialdLookup.evaluate(mpldValue / mpaiValue);
        const taiValue = valueAt(tai, index, "tai");
        const fialdValue = valueAt(fiald, index, "fiald");
        ldr[index] = dcphValue === 0 ? 0 : (taiValue * fialdValue) / dcphValue;
        cai[index] = taiValue * (1 - fialdValue);
        aiValue = valueAt(cai, index, "cai");
      }
      ai[index] = valueAt(cai, index, "cai");
      pfr[index] = valueAt(fr, index, "fr");
    } else {
      const alaiValue = valueAt(alai, index, "alai");
      ai[index] = smoothCai.step(index, alaiValue);
      pfr[index] = smoothFr.step(index, fspd);
      const pfrValue = valueAt(pfr, index, "pfr");
      falm[index] = falmLookup.evaluate(pfrValue);
      const falmValue = valueAt(falm, index, "falm");
      const alValue = valueAt(al, index, "al");
      const aiValue = valueAt(ai, index, "ai");
      aiph[index] = alValue === 0 ? 0 : aiValue * (1 - falmValue) / alValue;
      const aiphValue = valueAt(aiph, index, "__aiph");
      lymc[index] = lymcLookup.evaluate(aiphValue);
      mlymc[index] = mlymcLookup.evaluate(aiphValue);
      const lyfValue = valueAt(lyf, index, "__lyf");
      const lfertValue = valueAt(lfert, index, "lfert");
      const lymcValue = valueAt(lymc, index, "__lymc");
      const lymapValue = valueAt(lymap, index, "__lymap");
      ly[index] = lyfValue * lfertValue * lymcValue * lymapValue;
      const lyValue = valueAt(ly, index, "ly");
      f[index] = lyValue * alValue * lfh * (1 - pl);
      const fValue = valueAt(f, index, "f");
      fpc[index] = popValue === 0 ? 0 : fValue / popValue;
      const fpcValue = valueAt(fpc, index, "fpc");
      fr[index] = sfpc === 0 ? 0 : fpcValue / sfpc;
      const ifpcValue = valueAt(ifpc, index, "__ifpc");
      fioaa[index] = clipAtPolicyYear(
        fioaa1Lookup.evaluate(fpcValue / ifpcValue),
        fioaa2Lookup.evaluate(fpcValue / ifpcValue),
        currentTime,
        policyYear,
      );
      const fioaaValue = valueAt(fioaa, index, "fioaa");
      tai[index] = ioValue * fioaaValue;
      const dcphValue = valueAt(dcph, index, "dcph");
      mpld[index] = dcphValue === 0 ? 0 : lyValue / (dcphValue * sd);
      const mlymcValue = valueAt(mlymc, index, "mlymc");
      mpai[index] = lymcValue === 0 ? 0 : alaiValue * lyValue * mlymcValue / lymcValue;
      const mpldValue = valueAt(mpld, index, "mpld");
      const mpaiValue = valueAt(mpai, index, "mpai");
      fiald[index] = mpaiValue === 0 ? 0 : fialdLookup.evaluate(mpldValue / mpaiValue);
      const taiValue = valueAt(tai, index, "tai");
      const fialdValue = valueAt(fiald, index, "fiald");
      ldr[index] = dcphValue === 0 ? 0 : (taiValue * fialdValue) / dcphValue;
      cai[index] = taiValue * (1 - fialdValue);
    }

    const lfertValue = valueAt(lfert, index, "lfert");
    const lfdrValue = valueAt(lfdr, index, "lfdr");
    lfd[index] = lfertValue * lfdrValue;
    const lyValue = valueAt(ly, index, "ly");
    llmy[index] = clipAtPolicyYear(
      llmy1Lookup.evaluate(lyValue / ilf),
      llmy2Lookup.evaluate(lyValue / ilf),
      currentTime,
      policyYear,
    );
    const llmyValue = valueAt(llmy, index, "llmy");
    all[index] = alln * llmyValue;
    const allValue = valueAt(all, index, "all");
    const alValue = valueAt(al, index, "al");
    ler[index] = allValue === 0 ? 0 : alValue / allValue;
    const uilrValue = valueAt(uilr, index, "uilr");
    const uilValue = valueAt(uil, index, "uil");
    lrui[index] = Math.max(0, (uilrValue - uilValue) / uildt);
    const falmValue = valueAt(falm, index, "falm");
    lfrt[index] = lfrtLookup.evaluate(falmValue);
    const lfrtValue = valueAt(lfrt, index, "lfrt");
    lfr[index] = lfrtValue === 0 ? 0 : (ilf - lfertValue) / lfrtValue;

    if (index >= length - 1) {
      continue;
    }
    const nextTime = time[index + 1];
    if (nextTime === undefined) {
      throw new Error(`Runtime agriculture timestep index ${index + 1} is out of bounds.`);
    }
    const dt = nextTime - currentTime;
    const ldrValue = valueAt(ldr, index, "ldr");
    const lerValue = valueAt(ler, index, "ler");
    const lruiValue = valueAt(lrui, index, "lrui");
    const lfrValue = valueAt(lfr, index, "lfr");
    const lfdValue = valueAt(lfd, index, "lfd");
    al[index + 1] = alValue + dt * (ldrValue - lerValue - lruiValue);
    pal[index + 1] = valueAt(pal, index, "pal") - dt * ldrValue;
    uil[index + 1] = uilValue + dt * lruiValue;
    lfert[index + 1] = lfertValue + dt * (lfrValue - lfdValue);
  }

  return {
    al,
    f,
    fioaa,
    fpc,
    ly,
    tai,
    [AGRICULTURE_HIDDEN_SERIES.aiph]: aiph,
    [AGRICULTURE_HIDDEN_SERIES.all]: all,
    [AGRICULTURE_HIDDEN_SERIES.alai]: alai,
    [AGRICULTURE_HIDDEN_SERIES.cai]: cai,
    [AGRICULTURE_HIDDEN_SERIES.dcph]: dcph,
    [AGRICULTURE_HIDDEN_SERIES.falm]: falm,
    [AGRICULTURE_HIDDEN_SERIES.fiald]: fiald,
    [AGRICULTURE_HIDDEN_SERIES.fr]: fr,
    [AGRICULTURE_HIDDEN_SERIES.ifpc]: ifpc,
    [AGRICULTURE_HIDDEN_SERIES.lfd]: lfd,
    [AGRICULTURE_HIDDEN_SERIES.lfdr]: lfdr,
    [AGRICULTURE_HIDDEN_SERIES.lfert]: lfert,
    [AGRICULTURE_HIDDEN_SERIES.lfr]: lfr,
    [AGRICULTURE_HIDDEN_SERIES.lfrt]: lfrt,
    [AGRICULTURE_HIDDEN_SERIES.ldr]: ldr,
    [AGRICULTURE_HIDDEN_SERIES.ler]: ler,
    [AGRICULTURE_HIDDEN_SERIES.llmy]: llmy,
    [AGRICULTURE_HIDDEN_SERIES.lrui]: lrui,
    [AGRICULTURE_HIDDEN_SERIES.lyf]: lyf,
    [AGRICULTURE_HIDDEN_SERIES.lymap]: lymap,
    [AGRICULTURE_HIDDEN_SERIES.lymc]: lymc,
    [AGRICULTURE_HIDDEN_SERIES.mpai]: mpai,
    [AGRICULTURE_HIDDEN_SERIES.mpld]: mpld,
    [AGRICULTURE_HIDDEN_SERIES.mlymc]: mlymc,
    [AGRICULTURE_HIDDEN_SERIES.pal]: pal,
    [AGRICULTURE_HIDDEN_SERIES.pfr]: pfr,
    [AGRICULTURE_HIDDEN_SERIES.uil]: uil,
    [AGRICULTURE_HIDDEN_SERIES.uilpc]: uilpc,
    [AGRICULTURE_HIDDEN_SERIES.uilr]: uilr,
  };
}

function sourceSeriesArray(series: Float64Array | undefined, name: string): Float64Array {
  if (!series) {
    throw new Error(`Fixture-backed runtime cannot derive agriculture support because source series '${name}' is missing.`);
  }
  return series;
}

export function populateAgricultureNativeSupportSeries(
  sourceFrame: RuntimeStateFrame,
  sourceSeries: Map<string, Float64Array>,
  prepared: RuntimePreparation,
  constantsUsed: ConstantMap,
  canUseNativeFoodPath: boolean,
  canUseNativeAgriculturalAllocation: boolean,
  canUseNativeAgricultureProductivity: boolean,
  canUseNativeAgricultureOrdering = false,
): void {
  if (canUseNativeAgricultureOrdering) {
    const orderedSeries = computeAgricultureOrderedSeries(
      sourceFrame,
      prepared,
      constantsUsed,
    );
    for (const [name, values] of Object.entries(orderedSeries)) {
      sourceSeries.set(name, values);
    }
    return;
  }

  if (!canUseNativeFoodPath && !canUseNativeAgricultureProductivity) {
    return;
  }

  if (canUseNativeAgricultureProductivity) {
    const lymcLookup = prepared.lookupLibrary.get("LYMC");
    const lymap1Lookup = prepared.lookupLibrary.get("LYMAP1");
    const lymap2Lookup = prepared.lookupLibrary.get("LYMAP2");
    if (lymcLookup && lymap1Lookup && lymap2Lookup) {
      sourceSeries.set(
        AGRICULTURE_HIDDEN_SERIES.aiph,
        deriveSeriesValues(sourceFrame, createAiphDerivedDefinition()),
      );
      const productivityFrame: RuntimeStateFrame = {
        request: sourceFrame.request,
        time: sourceFrame.time,
        constantsUsed,
        series: sourceSeries,
      };
      sourceSeries.set(
        AGRICULTURE_HIDDEN_SERIES.lymc,
        deriveSeriesValues(
          productivityFrame,
          createLymcDerivedDefinition(lymcLookup),
        ),
      );
      sourceSeries.set(
        AGRICULTURE_HIDDEN_SERIES.lyf,
        deriveSeriesValues(
          productivityFrame,
          createLyfDerivedDefinition(
            constantsUsed,
            prepared.request.pyear ?? DEFAULT_AGRICULTURE_POLICY_YEAR,
          ),
        ),
      );
      sourceSeries.set(
        AGRICULTURE_HIDDEN_SERIES.lymap,
        deriveSeriesValues(
          productivityFrame,
          createLymapDerivedDefinition(
            constantsUsed,
            lymap1Lookup,
            lymap2Lookup,
            prepared.request.pyear ?? DEFAULT_AGRICULTURE_POLICY_YEAR,
          ),
        ),
      );
      const lyFrame: RuntimeStateFrame = {
        request: sourceFrame.request,
        time: sourceFrame.time,
        constantsUsed,
        series: sourceSeries,
      };
      sourceSeries.set(
        "ly",
        deriveSeriesValues(lyFrame, createLyDerivedDefinition()),
      );
    }
  }

  if (!canUseNativeFoodPath) {
    return;
  }

  sourceSeries.set(
    "f",
    deriveSeriesValues(sourceFrame, createFoodDerivedDefinition(constantsUsed)),
  );

  const foodFrame: RuntimeStateFrame = {
    request: sourceFrame.request,
    time: sourceFrame.time,
    constantsUsed,
    series: sourceSeries,
  };

  sourceSeries.set(
    "fpc",
    deriveSeriesValues(foodFrame, createFoodPerCapitaDerivedDefinition()),
  );

  if (!canUseNativeAgriculturalAllocation) {
    return;
  }

  const ifpc1Lookup = prepared.lookupLibrary.get("IFPC1");
  const ifpc2Lookup = prepared.lookupLibrary.get("IFPC2");
  const fioaa1Lookup = prepared.lookupLibrary.get("FIOAA1");
  const fioaa2Lookup = prepared.lookupLibrary.get("FIOAA2");
  if (!ifpc1Lookup || !ifpc2Lookup || !fioaa1Lookup || !fioaa2Lookup) {
    return;
  }

  sourceSeries.set(
    AGRICULTURE_HIDDEN_SERIES.ifpc,
    deriveSeriesValues(
      foodFrame,
      createIfpcDerivedDefinition(
        ifpc1Lookup,
        ifpc2Lookup,
        prepared.request.pyear ?? DEFAULT_AGRICULTURE_POLICY_YEAR,
      ),
    ),
  );

  const allocationFrame: RuntimeStateFrame = {
    request: sourceFrame.request,
    time: sourceFrame.time,
    constantsUsed,
    series: sourceSeries,
  };

  sourceSeries.set(
    "fioaa",
    deriveSeriesValues(
      allocationFrame,
      createFioaaDerivedDefinition(
        fioaa1Lookup,
        fioaa2Lookup,
        prepared.request.pyear ?? DEFAULT_AGRICULTURE_POLICY_YEAR,
      ),
    ),
  );
  sourceSeries.set(
    "tai",
    deriveSeriesValues(allocationFrame, createTaiDerivedDefinition()),
  );
}

export function maybePopulateAgricultureOutputSeries(
  variable: string,
  sourceFrame: RuntimeStateFrame,
  series: Map<string, Float64Array>,
  fixture: SimulationResult,
  projectedIndices: number[],
): boolean {
  const agricultureOutputVariables = new Set([
    "al",
    "f",
    "fioaa",
    "fpc",
    "ly",
    "tai",
    "pal",
    "ldr",
    "ler",
    "lrui",
    "dcph",
    "fiald",
    "cai",
    "ai",
    "falm",
    "fr",
    "pfr",
    "all",
    "llmy",
    "uil",
    "uilpc",
    "uilr",
    "lfert",
    "lfr",
    "lfrt",
    "lfd",
    "lfdr",
    "mpld",
    "mpai",
    "mlymc",
  ]);
  if (!agricultureOutputVariables.has(variable)) {
    return false;
  }

  const values = sourceFrame.series.get(variable);
  if (values) {
    series.set(variable, values);
    return true;
  }

  const fixtureSeries = fixture.series[variable];
  if (!fixtureSeries) {
    return false;
  }

  series.set(
    variable,
    projectSeriesValues(fixtureSeries.values, projectedIndices, variable),
  );
  return true;
}
