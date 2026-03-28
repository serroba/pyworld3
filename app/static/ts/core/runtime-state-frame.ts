import type { ConstantMap, SimulationResult } from "../simulation-contracts.js";
import type { RuntimePreparation } from "./browser-native-runtime.js";
import type { LookupInterpolator } from "./world3-tables.js";

const TIME_KEY_PRECISION = 8;
const DEFAULT_POLICY_YEAR = 1975;

export type RuntimeStateFrame = {
  readonly request: RuntimePreparation["request"];
  readonly time: Float64Array;
  readonly constantsUsed: ConstantMap;
  readonly series: Map<string, Float64Array>;
};

export type RuntimeObservation = {
  readonly index: number;
  readonly time: number;
  readonly values: Record<string, number>;
};

export type RuntimeStepper = {
  current: () => RuntimeObservation | null;
  next: () => RuntimeObservation | null;
  peek: (offset?: number) => RuntimeObservation | null;
  reset: () => void;
  isDone: () => boolean;
  index: () => number;
  length: () => number;
};

export type RuntimeSeriesDeriver = (observation: RuntimeObservation) => number;
export type RuntimeStateAdvance = (
  currentValue: number,
  observation: RuntimeObservation,
  nextObservation: RuntimeObservation | null,
) => number;
export type RuntimeStateDefinition = {
  readonly variable: string;
  readonly advance: RuntimeStateAdvance;
};
export type RuntimeDerivedDefinition = {
  readonly variable: string;
  readonly derive: RuntimeSeriesDeriver;
};

const NR_RATE_SERIES = "__nr_rate";
const NRUF_SERIES = "__nruf";
const PCRUM_SERIES = "__pcrum";
function toTimeKey(value: number): string {
  return value.toFixed(TIME_KEY_PRECISION);
}

function buildProjectedIndices(
  prepared: RuntimePreparation,
  fixture: SimulationResult,
): number[] {
  const fixtureTimeIndex = new Map<string, number>();

  fixture.time.forEach((value, index) => {
    fixtureTimeIndex.set(toTimeKey(value), index);
  });

  return Array.from(prepared.time, (value) => {
    const index = fixtureTimeIndex.get(toTimeKey(value));
    if (index === undefined) {
      throw new Error(
        `Fixture-backed runtime cannot project year ${value} onto the requested time grid.`,
      );
    }
    return index;
  });
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

function resolveSourceSeriesValues(
  variable: string,
  fixture: SimulationResult,
  indices: number[],
): Float64Array {
  const source = fixture.series[variable];
  if (!source) {
    throw new Error(
      `Fixture-backed runtime is missing the requested output variable '${variable}'.`,
    );
  }

  return projectSeriesValues(source.values, indices, source.name);
}

function createOracleRateSeries(
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

function createObservedDeltaAdvance(variable: string): RuntimeStateAdvance {
  return (currentValue, observation, nextObservation) => {
    const observed = observation.values[variable];
    const nextObserved = nextObservation?.values[variable];
    if (observed === undefined) {
      throw new Error(
        `Runtime state advance is missing the observed '${variable}' value.`,
      );
    }
    if (nextObserved === undefined) {
      return currentValue;
    }
    return currentValue + (nextObserved - observed);
  };
}

export function createReplayStateDefinition(
  variable: string,
): RuntimeStateDefinition {
  return {
    variable,
    advance: createObservedDeltaAdvance(variable),
  };
}

export function createEulerStateDefinition(
  variable: string,
  rateVariable: string,
  multiplier = 1,
): RuntimeStateDefinition {
  return {
    variable,
    advance: (currentValue, observation, nextObservation) => {
      const rate = observation.values[rateVariable];
      if (rate === undefined) {
        throw new Error(
          `Runtime Euler state advance is missing the rate variable '${rateVariable}'.`,
        );
      }
      if (!nextObservation) {
        return currentValue;
      }
      const dt = nextObservation.time - observation.time;
      return currentValue + dt * rate * multiplier;
    },
  };
}

function clipAtPolicyYear(
  beforeValue: number,
  afterValue: number,
  time: number,
  policyYear: number,
): number {
  return time > policyYear ? afterValue : beforeValue;
}

export function createNrufDerivedDefinition(
  constantsUsed: ConstantMap,
  policyYear = DEFAULT_POLICY_YEAR,
): RuntimeDerivedDefinition {
  return createDerivedSeriesDefinition(NRUF_SERIES, (observation) => {
    const nruf1 = constantsUsed.nruf1 ?? 1;
    const nruf2 = constantsUsed.nruf2 ?? 1;
    return clipAtPolicyYear(nruf1, nruf2, observation.time, policyYear);
  });
}

export function createPcrumDerivedDefinition(
  pcrumLookup: LookupInterpolator,
): RuntimeDerivedDefinition {
  return createDerivedSeriesDefinition(PCRUM_SERIES, (observation) => {
    const iopc = observation.values.iopc;
    if (iopc === undefined) {
      throw new Error(
        "Fixture-backed runtime cannot derive '__pcrum' because the source variable 'iopc' is missing.",
      );
    }
    return pcrumLookup.evaluate(iopc);
  });
}

export function createNrResourceUsageRateDefinition(): RuntimeDerivedDefinition {
  return createDerivedSeriesDefinition(NR_RATE_SERIES, (observation) => {
    const pop = observation.values.pop;
    const pcrum = observation.values[PCRUM_SERIES];
    const nruf = observation.values[NRUF_SERIES];
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
  });
}

const STEPPED_SOURCE_STATE_DEFINITIONS = new Map<string, RuntimeStateDefinition>(
  [
    ["nr", createEulerStateDefinition("nr", NR_RATE_SERIES, -1)],
    ["pop", createReplayStateDefinition("pop")],
    ["iopc", createReplayStateDefinition("iopc")],
    ["fpc", createReplayStateDefinition("fpc")],
    ["ppolx", createReplayStateDefinition("ppolx")],
    ["le", createReplayStateDefinition("le")],
  ],
);

export function populateStateBufferFromDefinition(
  sourceSeries: Map<string, Float64Array>,
  oracleFrame: RuntimeStateFrame,
  definition: RuntimeStateDefinition,
): void {
  const { variable, advance } = definition;
  const projectedValues = sourceSeries.get(variable);
  if (!projectedValues) {
    throw new Error(
      `Fixture-backed runtime cannot populate the source variable '${variable}' because it is missing.`,
    );
  }

  sourceSeries.set(
    variable,
    populateStateBufferFromStepper(
      oracleFrame,
      projectedValues[0] ?? 0,
      advance,
    ),
  );
}

export function createDerivedSeriesDefinition(
  variable: string,
  derive: RuntimeSeriesDeriver,
): RuntimeDerivedDefinition {
  return {
    variable,
    derive,
  };
}

export function createNrfrDerivedDefinition(
  constantsUsed: ConstantMap,
): RuntimeDerivedDefinition {
  return createDerivedSeriesDefinition("nrfr", (observation) => {
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
  });
}

export function populateDerivedBufferFromDefinition(
  sourceFrame: RuntimeStateFrame,
  series: Map<string, Float64Array>,
  definition: RuntimeDerivedDefinition,
): void {
  series.set(
    definition.variable,
    populateSeriesBufferFromStepper(sourceFrame, definition.derive),
  );
}

export function createRuntimeStateFrame(
  prepared: RuntimePreparation,
  fixture: SimulationResult,
): RuntimeStateFrame {
  const projectedIndices = buildProjectedIndices(prepared, fixture);
  const constantsUsed = {
    ...fixture.constants_used,
    ...(prepared.request.constants ?? {}),
  };

  const sourceVariables = new Set(
    prepared.outputVariables.filter((variable) => variable !== "nrfr"),
  );
  if (prepared.outputVariables.includes("nrfr")) {
    sourceVariables.add("nr");
  }
  const shouldComputeNativeNrFlow = sourceVariables.has("nr");
  const pcrumLookup = prepared.lookupLibrary.get("PCRUM");
  const canUseNativeNrFlow =
    shouldComputeNativeNrFlow &&
    Boolean(fixture.series.pop) &&
    Boolean(fixture.series.iopc) &&
    Boolean(pcrumLookup);
  if (canUseNativeNrFlow) {
    sourceVariables.add("pop");
    sourceVariables.add("iopc");
  }

  const sourceSeries = new Map<string, Float64Array>();
  for (const variable of sourceVariables) {
    if (variable === "nr" && !fixture.series.nr) {
      throw new Error(
        "Fixture-backed runtime cannot derive 'nrfr' because the source variable 'nr' is missing.",
      );
    }
    sourceSeries.set(
      variable,
      resolveSourceSeriesValues(variable, fixture, projectedIndices),
    );
  }

  const oracleFrame: RuntimeStateFrame = {
    request: prepared.request,
    time: Float64Array.from(prepared.time),
    constantsUsed,
    series: sourceSeries,
  };

  const projectedNr = sourceSeries.get("nr");
  if (projectedNr && canUseNativeNrFlow && pcrumLookup) {
    populateDerivedBufferFromDefinition(
      oracleFrame,
      sourceSeries,
      createNrufDerivedDefinition(
        constantsUsed,
        prepared.request.pyear ?? DEFAULT_POLICY_YEAR,
      ),
    );
    const nrFlowFrame: RuntimeStateFrame = {
      request: oracleFrame.request,
      time: oracleFrame.time,
      constantsUsed,
      series: sourceSeries,
    };
    populateDerivedBufferFromDefinition(
      nrFlowFrame,
      sourceSeries,
      createPcrumDerivedDefinition(pcrumLookup),
    );
    const nrRateFrame: RuntimeStateFrame = {
      request: oracleFrame.request,
      time: oracleFrame.time,
      constantsUsed,
      series: sourceSeries,
    };
    populateDerivedBufferFromDefinition(
      nrRateFrame,
      sourceSeries,
      createNrResourceUsageRateDefinition(),
    );
  } else if (projectedNr) {
    sourceSeries.set(
      NR_RATE_SERIES,
      createOracleRateSeries(projectedNr, oracleFrame.time),
    );
  }

  for (const variable of sourceVariables) {
    const definition = STEPPED_SOURCE_STATE_DEFINITIONS.get(variable);
    if (!definition) {
      continue;
    }
    populateStateBufferFromDefinition(sourceSeries, oracleFrame, definition);
  }

  const sourceFrame: RuntimeStateFrame = {
    request: prepared.request,
    time: oracleFrame.time,
    constantsUsed,
    series: sourceSeries,
  };

  const series = new Map<string, Float64Array>();
  for (const variable of prepared.outputVariables) {
    if (variable === "nrfr") {
      populateDerivedBufferFromDefinition(
        sourceFrame,
        series,
        createNrfrDerivedDefinition(constantsUsed),
      );
      continue;
    }

    const values = sourceSeries.get(variable);
    if (!values) {
      throw new Error(
        `Fixture-backed runtime is missing the requested output variable '${variable}'.`,
      );
    }
    series.set(variable, values);
  }

  return {
    request: prepared.request,
    time: sourceFrame.time,
    constantsUsed,
    series,
  };
}

export function runtimeStateFrameToSimulationResult(
  frame: RuntimeStateFrame,
): SimulationResult {
  return assembleSimulationResultFromStepper(frame);
}

export function assembleSimulationResultFromStepper(
  frame: RuntimeStateFrame,
): SimulationResult {
  const stepper = createRuntimeStepper(frame);
  const seriesNames = Array.from(frame.series.keys());
  const seriesValues = new Map<string, number[]>(
    seriesNames.map((name) => [name, []]),
  );
  const time: number[] = [];

  while (!stepper.isDone()) {
    const observation = stepper.next();
    if (!observation) {
      break;
    }
    time.push(observation.time);
    for (const name of seriesNames) {
      const value = observation.values[name];
      if (value === undefined) {
        throw new Error(
          `Runtime observation is missing '${name}' while assembling the simulation result.`,
        );
      }
      const values = seriesValues.get(name);
      if (!values) {
        throw new Error(
          `Runtime result assembly is missing a buffer for '${name}'.`,
        );
      }
      values.push(value);
    }
  }

  return {
    year_min: frame.request.year_min ?? frame.time[0] ?? 1900,
    year_max:
      frame.request.year_max ?? frame.time[frame.time.length - 1] ?? 2100,
    dt: frame.request.dt ?? 0.5,
    time,
    constants_used: { ...frame.constantsUsed },
    series: Object.fromEntries(
      Array.from(seriesValues.entries(), ([name, values]) => [
        name,
        { name, values },
      ]),
    ),
  };
}

export function observeRuntimeStateAt(
  frame: RuntimeStateFrame,
  index: number,
): RuntimeObservation {
  const time = frame.time[index];
  if (time === undefined) {
    throw new Error(`Runtime state frame index ${index} is out of bounds.`);
  }

  const values = Object.fromEntries(
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

  return { index, time, values };
}

export function listRuntimeObservations(
  frame: RuntimeStateFrame,
): RuntimeObservation[] {
  return Array.from(frame.time, (_time, index) => observeRuntimeStateAt(frame, index));
}

export function createRuntimeStepper(frame: RuntimeStateFrame): RuntimeStepper {
  let currentIndex = 0;

  function hasIndex(index: number): boolean {
    return index >= 0 && index < frame.time.length;
  }

  return {
    current() {
      if (!hasIndex(currentIndex)) {
        return null;
      }
      return observeRuntimeStateAt(frame, currentIndex);
    },

    next() {
      if (!hasIndex(currentIndex)) {
        return null;
      }
      const observation = observeRuntimeStateAt(frame, currentIndex);
      currentIndex += 1;
      return observation;
    },

    peek(offset = 0) {
      const targetIndex = currentIndex + offset;
      if (!hasIndex(targetIndex)) {
        return null;
      }
      return observeRuntimeStateAt(frame, targetIndex);
    },

    reset() {
      currentIndex = 0;
    },

    isDone() {
      return currentIndex >= frame.time.length;
    },

    index() {
      return currentIndex;
    },

    length() {
      return frame.time.length;
    },
  };
}

export function populateSeriesBufferFromStepper(
  frame: RuntimeStateFrame,
  deriveValue: RuntimeSeriesDeriver,
): Float64Array {
  const stepper = createRuntimeStepper(frame);
  const values = new Float64Array(frame.time.length);

  while (!stepper.isDone()) {
    const observation = stepper.next();
    if (!observation) {
      break;
    }
    values[observation.index] = deriveValue(observation);
  }

  return values;
}

export function populateStateBufferFromStepper(
  frame: RuntimeStateFrame,
  initialValue: number,
  advanceState: RuntimeStateAdvance,
): Float64Array {
  const stepper = createRuntimeStepper(frame);
  const values = new Float64Array(frame.time.length);
  if (values.length === 0) {
    return values;
  }

  values[0] = initialValue;
  let currentValue = initialValue;

  while (!stepper.isDone()) {
    const observation = stepper.next();
    if (!observation) {
      break;
    }
    if (observation.index >= values.length - 1) {
      break;
    }
    const nextObservation = stepper.current();
    currentValue = advanceState(currentValue, observation, nextObservation);
    values[observation.index + 1] = currentValue;
  }

  return values;
}
