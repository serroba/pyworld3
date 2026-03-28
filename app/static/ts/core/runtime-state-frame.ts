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

function deriveNrfrSeries(
  fixture: SimulationResult,
  indices: number[],
  constantsUsed: ConstantMap,
): Float64Array {
  const nrSeries = fixture.series.nr;
  if (!nrSeries) {
    throw new Error(
      "Fixture-backed runtime cannot derive 'nrfr' because the source variable 'nr' is missing.",
    );
  }

  const nri = constantsUsed.nri;
  if (nri === undefined || nri === 0) {
    throw new Error(
      "Fixture-backed runtime cannot derive 'nrfr' because constant 'nri' is missing or zero.",
    );
  }

  const projectedNr = projectSeriesValues(nrSeries.values, indices, nrSeries.name);
  return Float64Array.from(projectedNr, (value) => value / nri);
}

function resolveSeriesValues(
  variable: string,
  fixture: SimulationResult,
  indices: number[],
  constantsUsed: ConstantMap,
): Float64Array {
  if (variable === "nrfr") {
    return deriveNrfrSeries(fixture, indices, constantsUsed);
  }

  const source = fixture.series[variable];
  if (!source) {
    throw new Error(
      `Fixture-backed runtime is missing the requested output variable '${variable}'.`,
    );
  }

  return projectSeriesValues(source.values, indices, source.name);
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

  const series = new Map<string, Float64Array>();
  for (const variable of prepared.outputVariables) {
    series.set(
      variable,
      resolveSeriesValues(variable, fixture, projectedIndices, constantsUsed),
    );
  }

  return {
    request: prepared.request,
    time: Float64Array.from(prepared.time),
    constantsUsed,
    series,
  };
}

export function runtimeStateFrameToSimulationResult(
  frame: RuntimeStateFrame,
): SimulationResult {
  return {
    year_min: frame.request.year_min ?? frame.time[0] ?? 1900,
    year_max:
      frame.request.year_max ?? frame.time[frame.time.length - 1] ?? 2100,
    dt: frame.request.dt ?? 0.5,
    time: Array.from(frame.time),
    constants_used: { ...frame.constantsUsed },
    series: Object.fromEntries(
      Array.from(frame.series.entries(), ([name, values]) => [
        name,
        { name, values: Array.from(values) },
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
