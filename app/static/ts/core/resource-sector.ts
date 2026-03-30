import type { ConstantMap, SimulationResult } from "../simulation-contracts.js";
import type { RuntimePreparation } from "./browser-native-runtime.js";
import type {
  RuntimeDerivedDefinition,
  RuntimeObservation,
  RuntimeStateFrame,
} from "./runtime-state-frame.js";
import type { LookupInterpolator } from "./world3-tables.js";

export const DEFAULT_RESOURCE_POLICY_YEAR = 1975;
export const RESOURCE_INTERNAL_SERIES = {
  nonrenewableResourceUsageRate: "__nr_rate",
  nrRate: "__nr_rate",
  nonrenewableResourceUseFactor: "__nruf",
  nruf: "__nruf",
  perCapitaResourceUseMultiplier: "__pcrum",
  pcrum: "__pcrum",
} as const;

/** @deprecated Prefer RESOURCE_INTERNAL_SERIES for TypeScript-facing code. */
export const RESOURCE_HIDDEN_SERIES = RESOURCE_INTERNAL_SERIES;

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

export function createOracleRateSeries(
  values: Float64Array,
  time: Float64Array,
): Float64Array {
  const rates = new Float64Array(values.length);
  if (values.length === 0) {
    return rates;
  }

  for (let index = 0; index < values.length - 1; index += 1) {
    const currentValue = values[index];
    const nextValue = values[index + 1];
    const currentTime = time[index];
    const nextTime = time[index + 1];
    if (
      currentValue === undefined ||
      nextValue === undefined ||
      currentTime === undefined ||
      nextTime === undefined
    ) {
      throw new Error("Oracle-backed rate construction is missing a source value.");
    }
    const dt = nextTime - currentTime;
    rates[index] = dt === 0 ? 0 : (currentValue - nextValue) / dt;
  }

  if (rates.length > 1) {
    rates[rates.length - 1] = rates[rates.length - 2] ?? 0;
  }

  return rates;
}

export function createNrufDerivedDefinition(
  constantsUsed: ConstantMap,
  policyYear = DEFAULT_RESOURCE_POLICY_YEAR,
): RuntimeDerivedDefinition {
  return {
    variable: RESOURCE_HIDDEN_SERIES.nruf,
    derive: (observation: RuntimeObservation) => {
      const nruf1 = constantsUsed.nruf1 ?? 1;
      const nruf2 = constantsUsed.nruf2 ?? 1;
      return clipAtPolicyYear(nruf1, nruf2, observation.time, policyYear);
    },
  };
}

export function createPcrumDerivedDefinition(
  pcrumLookup: LookupInterpolator,
): RuntimeDerivedDefinition {
  return {
    variable: RESOURCE_HIDDEN_SERIES.pcrum,
    derive: (observation: RuntimeObservation) => {
      const iopc = observation.values.iopc;
      if (iopc === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__pcrum' because the source variable 'iopc' is missing.",
        );
      }
      return pcrumLookup.evaluate(iopc);
    },
  };
}

export function createNrResourceUsageRateDefinition(): RuntimeDerivedDefinition {
  return {
    variable: RESOURCE_HIDDEN_SERIES.nrRate,
    derive: (observation: RuntimeObservation) => {
      const pop = observation.values.pop;
      const pcrum = observation.values[RESOURCE_HIDDEN_SERIES.pcrum];
      const nruf = observation.values[RESOURCE_HIDDEN_SERIES.nruf];
      if (pop === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__nr_rate' because the source variable 'pop' is missing.",
        );
      }
      if (pcrum === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__nr_rate' because the source variable '__pcrum' is missing.",
        );
      }
      if (nruf === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__nr_rate' because the source variable '__nruf' is missing.",
        );
      }
      return pop * pcrum * nruf;
    },
  };
}

export function createNrfrDerivedDefinition(
  constantsUsed: ConstantMap,
): RuntimeDerivedDefinition {
  return {
    variable: "nrfr",
    derive: (observation: RuntimeObservation) => {
      const nr = observation.values.nr;
      const nri = constantsUsed.nri;
      if (nr === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive 'nrfr' because the source variable 'nr' is missing.",
        );
      }
      if (nri === undefined || nri === 0) {
        throw new Error(
          "Fixture-backed runtime cannot derive 'nrfr' because constant 'nri' is missing or zero.",
        );
      }
      return nr / nri;
    },
  };
}

export function createFcaorDerivedDefinition(
  constantsUsed: ConstantMap,
  fcaor1Lookup: LookupInterpolator,
  fcaor2Lookup: LookupInterpolator,
  policyYear = DEFAULT_RESOURCE_POLICY_YEAR,
): RuntimeDerivedDefinition {
  return {
    variable: "fcaor",
    derive: (observation: RuntimeObservation) => {
      const nr = observation.values.nr;
      const nri = constantsUsed.nri;
      if (nr === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive 'fcaor' because the source variable 'nr' is missing.",
        );
      }
      if (nri === undefined || nri === 0) {
        throw new Error(
          "Fixture-backed runtime cannot derive 'fcaor' because constant 'nri' is missing or zero.",
        );
      }
      const nrfr = nr / nri;
      const beforePolicy = fcaor1Lookup.evaluate(nrfr);
      const afterPolicy = fcaor2Lookup.evaluate(nrfr);
      return clipAtPolicyYear(beforePolicy, afterPolicy, observation.time, policyYear);
    },
  };
}

export const createReferenceRateSeries = createOracleRateSeries;
export const createResourceUseFactorDefinition = createNrufDerivedDefinition;
export const createPerCapitaResourceUseMultiplierDefinition =
  createPcrumDerivedDefinition;
export const createResourceUsageRateDefinition = createNrResourceUsageRateDefinition;
export const createResourceFractionRemainingDefinition = createNrfrDerivedDefinition;
export const createCapitalAllocationToResourcesDefinition =
  createFcaorDerivedDefinition;

export function extendResourceSourceVariables(
  sourceVariables: Set<string>,
  outputVariables: string[],
  fixture: SimulationResult,
  lookupLibrary: Map<string, LookupInterpolator>,
  canUseNativeCapitalOrdering: boolean,
): { canUseNativeNrFlow: boolean } {
  if (
    outputVariables.includes("nrfr") ||
    outputVariables.includes("fcaor")
  ) {
    sourceVariables.add("nr");
  }

  const hasNrSource =
    Boolean(fixture.series.nr) ||
    (Boolean(fixture.series.nrfr) && Boolean(fixture.constants_used?.nri));

  const canUseNativeNrFlow =
    sourceVariables.has("nr") &&
    hasNrSource &&
    Boolean(fixture.series.pop) &&
    (Boolean(fixture.series.iopc) || canUseNativeCapitalOrdering) &&
    lookupLibrary.has("PCRUM");

  if (canUseNativeNrFlow) {
    sourceVariables.add("pop");
    if (fixture.series.iopc) {
      sourceVariables.add("iopc");
    }
  }

  return { canUseNativeNrFlow };
}

export function populateResourceNativeSupportSeries(
  oracleFrame: RuntimeStateFrame,
  sourceSeries: Map<string, Float64Array>,
  prepared: RuntimePreparation,
  constantsUsed: ConstantMap,
  canUseNativeNrFlow: boolean,
): void {
  const projectedNr = sourceSeries.get("nr");
  if (!projectedNr) {
    return;
  }

  if (canUseNativeNrFlow) {
    const pcrumLookup = prepared.lookupLibrary.get("PCRUM");
    if (pcrumLookup) {
      sourceSeries.set(
        RESOURCE_HIDDEN_SERIES.nruf,
        deriveSeriesValues(
          oracleFrame,
          createNrufDerivedDefinition(
            constantsUsed,
            prepared.request.pyear ?? DEFAULT_RESOURCE_POLICY_YEAR,
          ),
        ),
      );
      const nrufFrame: RuntimeStateFrame = {
        request: oracleFrame.request,
        time: oracleFrame.time,
        constantsUsed,
        series: sourceSeries,
      };
      sourceSeries.set(
        RESOURCE_HIDDEN_SERIES.pcrum,
        deriveSeriesValues(nrufFrame, createPcrumDerivedDefinition(pcrumLookup)),
      );
      const pcrumFrame: RuntimeStateFrame = {
        request: oracleFrame.request,
        time: oracleFrame.time,
        constantsUsed,
        series: sourceSeries,
      };
      sourceSeries.set(
        RESOURCE_HIDDEN_SERIES.nrRate,
        deriveSeriesValues(pcrumFrame, createNrResourceUsageRateDefinition()),
      );
      return;
    }
  }

  sourceSeries.set(
    RESOURCE_HIDDEN_SERIES.nrRate,
    createOracleRateSeries(projectedNr, oracleFrame.time),
  );
}

export function maybePopulateResourceOutputSeries(
  variable: string,
  sourceFrame: RuntimeStateFrame,
  series: Map<string, Float64Array>,
  prepared: RuntimePreparation,
  fixture: SimulationResult,
  projectedIndices: number[],
  constantsUsed: ConstantMap,
): boolean {
  if (variable === "nrfr") {
    const nr = sourceFrame.series.get("nr");
    const nri = constantsUsed.nri;
    if (nr && nri !== undefined && nri !== 0) {
      series.set(
        "nrfr",
        deriveSeriesValues(sourceFrame, createNrfrDerivedDefinition(constantsUsed)),
      );
      return true;
    }

    if (fixture.series.nrfr) {
      series.set(
        "nrfr",
        projectSeriesValues(fixture.series.nrfr.values, projectedIndices, "nrfr"),
      );
      return true;
    }

    series.set(
      "nrfr",
      deriveSeriesValues(sourceFrame, createNrfrDerivedDefinition(constantsUsed)),
    );
    return true;
  }

  if (variable !== "fcaor") {
    return false;
  }

  const fcaor1Lookup = prepared.lookupLibrary.get("FCAOR1");
  const fcaor2Lookup = prepared.lookupLibrary.get("FCAOR2");
  if (fcaor1Lookup && fcaor2Lookup) {
    series.set(
      "fcaor",
      deriveSeriesValues(
        sourceFrame,
        createFcaorDerivedDefinition(
          constantsUsed,
          fcaor1Lookup,
          fcaor2Lookup,
          prepared.request.pyear ?? DEFAULT_RESOURCE_POLICY_YEAR,
        ),
      ),
    );
    return true;
  }

  if (fixture.series.fcaor) {
    series.set(
      "fcaor",
      projectSeriesValues(fixture.series.fcaor.values, projectedIndices, "fcaor"),
    );
    return true;
  }

  throw new Error(
    "Fixture-backed runtime cannot derive 'fcaor' because lookup tables 'FCAOR1' and 'FCAOR2' are missing.",
  );
}
