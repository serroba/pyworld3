import type { SimulationResult, TimeSeriesResult } from "../simulation-contracts.js";
import type { RuntimePreparation } from "./browser-native-runtime.js";

const TIME_KEY_PRECISION = 8;

function toTimeKey(value: number): string {
  return value.toFixed(TIME_KEY_PRECISION);
}

function projectSeriesValues(
  source: TimeSeriesResult,
  indices: number[],
): TimeSeriesResult {
  return {
    name: source.name,
    values: indices.map((index) => {
      const value = source.values[index];
      if (value === undefined) {
        throw new Error(
          `Fixture series '${source.name}' is missing a value at index ${index}.`,
        );
      }
      return value;
    }),
  };
}

export function projectSimulationResult(
  prepared: RuntimePreparation,
  fixture: SimulationResult,
): SimulationResult {
  const fixtureTimeIndex = new Map<string, number>();

  fixture.time.forEach((value, index) => {
    fixtureTimeIndex.set(toTimeKey(value), index);
  });

  const projectedIndices = Array.from(prepared.time, (value) => {
    const index = fixtureTimeIndex.get(toTimeKey(value));
    if (index === undefined) {
      throw new Error(
        `Fixture-backed runtime cannot project year ${value} onto the requested time grid.`,
      );
    }
    return index;
  });

  const series = Object.fromEntries(
    prepared.outputVariables.map((variable) => {
      const source = fixture.series[variable];
      if (!source) {
        throw new Error(
          `Fixture-backed runtime is missing the requested output variable '${variable}'.`,
        );
      }
      return [variable, projectSeriesValues(source, projectedIndices)];
    }),
  );

  return {
    year_min: prepared.request.year_min ?? fixture.year_min,
    year_max: prepared.request.year_max ?? fixture.year_max,
    dt: prepared.request.dt ?? fixture.dt,
    time: Array.from(prepared.time),
    constants_used: {
      ...fixture.constants_used,
      ...(prepared.request.constants ?? {}),
    },
    series,
  };
}
