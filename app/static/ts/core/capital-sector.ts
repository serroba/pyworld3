import type { ConstantMap, SimulationResult } from "../simulation-contracts.js";
import type { RuntimePreparation } from "./browser-native-runtime.js";
import type {
  RuntimeDerivedDefinition,
  RuntimeObservation,
  RuntimeStateFrame,
} from "./runtime-state-frame.js";
import type { LookupInterpolator } from "./world3-tables.js";

const DEFAULT_CAPITAL_POLICY_YEAR = 1975;

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

export function createIoDerivedDefinition(): RuntimeDerivedDefinition {
  return {
    variable: "io",
    derive: (observation: RuntimeObservation) => {
      const pop = observation.values.pop;
      const iopc = observation.values.iopc;
      if (pop === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive 'io' because the source variable 'pop' is missing.",
        );
      }
      if (iopc === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive 'io' because the source variable 'iopc' is missing.",
        );
      }
      return pop * iopc;
    },
  };
}

export function createIopcDerivedDefinition(): RuntimeDerivedDefinition {
  return {
    variable: "iopc",
    derive: (observation: RuntimeObservation) => {
      const io = observation.values.io;
      const pop = observation.values.pop;
      if (io === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive 'iopc' because the source variable 'io' is missing.",
        );
      }
      if (pop === undefined || pop === 0) {
        throw new Error(
          "Fixture-backed runtime cannot derive 'iopc' because the source variable 'pop' is missing or zero.",
        );
      }
      return io / pop;
    },
  };
}

export function createFioacDerivedDefinition(
  constantsUsed: ConstantMap,
  fioacvLookup: LookupInterpolator,
  policyYear = DEFAULT_CAPITAL_POLICY_YEAR,
): RuntimeDerivedDefinition {
  return {
    variable: "__fioac",
    derive: (observation: RuntimeObservation) => {
      const iopc = observation.values.iopc;
      const iopcd = constantsUsed.iopcd;
      if (iopc === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__fioac' because the source variable 'iopc' is missing.",
        );
      }
      if (iopcd === undefined || iopcd === 0) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__fioac' because constant 'iopcd' is missing or zero.",
        );
      }
      const fioacv = fioacvLookup.evaluate(iopc / iopcd);
      const fioacc = clipAtPolicyYear(
        constantsUsed.fioac1 ?? 0.43,
        constantsUsed.fioac2 ?? 0.43,
        observation.time,
        policyYear,
      );
      return clipAtPolicyYear(fioacc, fioacv, observation.time, constantsUsed.iet ?? 4000);
    },
  };
}

export function createIsopcDerivedDefinition(
  isopc1Lookup: LookupInterpolator,
  isopc2Lookup: LookupInterpolator,
  policyYear = DEFAULT_CAPITAL_POLICY_YEAR,
): RuntimeDerivedDefinition {
  return {
    variable: "__isopc",
    derive: (observation: RuntimeObservation) => {
      const iopc = observation.values.iopc;
      if (iopc === undefined) {
        throw new Error(
          "Fixture-backed runtime cannot derive '__isopc' because the source variable 'iopc' is missing.",
        );
      }
      return clipAtPolicyYear(
        isopc1Lookup.evaluate(iopc),
        isopc2Lookup.evaluate(iopc),
        observation.time,
        policyYear,
      );
    },
  };
}

export function extendCapitalSourceVariables(
  sourceVariables: Set<string>,
  outputVariables: string[],
  fixture: SimulationResult,
): { canDeriveIo: boolean; canDeriveIopc: boolean } {
  const canDeriveIo =
    outputVariables.includes("io") &&
    Boolean(fixture.series.pop) &&
    Boolean(fixture.series.iopc);
  const canDeriveIopc =
    outputVariables.includes("iopc") &&
    Boolean(fixture.series.pop) &&
    Boolean(fixture.series.io);

  if (canDeriveIo || canDeriveIopc) {
    sourceVariables.add("pop");
  }
  if (canDeriveIo) {
    sourceVariables.add("iopc");
  }
  if (canDeriveIopc) {
    sourceVariables.add("io");
  }

  return { canDeriveIo, canDeriveIopc };
}

export function maybePopulateCapitalOutputSeries(
  variable: string,
  sourceFrame: RuntimeStateFrame,
  series: Map<string, Float64Array>,
  fixture: SimulationResult,
  projectedIndices: number[],
  _prepared: RuntimePreparation,
  capabilities: { canDeriveIo: boolean; canDeriveIopc: boolean },
): boolean {
  if (variable === "io") {
    if (capabilities.canDeriveIo) {
      series.set("io", deriveSeriesValues(sourceFrame, createIoDerivedDefinition()));
      return true;
    }
    if (fixture.series.io) {
      series.set("io", projectSeriesValues(fixture.series.io.values, projectedIndices, "io"));
      return true;
    }
    throw new Error(
      "Fixture-backed runtime cannot derive 'io' because the source variables 'pop' and 'iopc' are missing.",
    );
  }

  if (variable === "iopc") {
    if (capabilities.canDeriveIopc) {
      series.set("iopc", deriveSeriesValues(sourceFrame, createIopcDerivedDefinition()));
      return true;
    }
    if (fixture.series.iopc) {
      series.set(
        "iopc",
        projectSeriesValues(fixture.series.iopc.values, projectedIndices, "iopc"),
      );
      return true;
    }
    throw new Error(
      "Fixture-backed runtime cannot derive 'iopc' because the source variables 'io' and 'pop' are missing.",
    );
  }

  return false;
}
