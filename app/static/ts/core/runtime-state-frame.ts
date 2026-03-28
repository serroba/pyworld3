import type { ConstantMap, SimulationResult } from "../simulation-contracts.js";
import type { RuntimePreparation } from "./browser-native-runtime.js";

const TIME_KEY_PRECISION = 8;

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

const STEPPED_SOURCE_STATE_DEFINITIONS = new Map<string, RuntimeStateDefinition>(
  ["nr", "pop", "iopc", "fpc", "ppolx", "le"].map((variable) => [
    variable,
    createReplayStateDefinition(variable),
  ]),
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
      series.set(
        variable,
        populateSeriesBufferFromStepper(sourceFrame, (observation) => {
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
        }),
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
