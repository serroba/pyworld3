import { describe, expect, test } from "vitest";

import {
  assembleSimulationResultFromStepper,
  createRuntimeStepper,
  createRuntimeStateFrame,
  listRuntimeObservations,
  observeRuntimeStateAt,
  populateSeriesBufferFromStepper,
  populateStateBufferFromStepper,
  prepareRuntime,
  runtimeStateFrameToSimulationResult,
} from "../ts/core/index.ts";
import { ModelData } from "../ts/model-data.ts";
import type { RawLookupTable } from "../ts/core/index.ts";
import type { SimulationResult } from "../ts/simulation-contracts.ts";

const tables: RawLookupTable[] = [
  {
    sector: "Population",
    "x.name": "LE",
    "x.values": [20, 40],
    "y.name": "M1",
    "y.values": [0.05, 0.03],
  },
];

const fixture: SimulationResult = {
  year_min: 1900,
  year_max: 1902,
  dt: 0.5,
  time: [1900, 1900.5, 1901, 1901.5, 1902],
  constants_used: { nri: 100 },
  series: {
    nr: { name: "nr", values: [100, 95, 90, 85, 80] },
    pop: { name: "pop", values: [10, 12, 14, 16, 18] },
    nrfr: { name: "nrfr", values: [99, 99, 99, 99, 99] },
  },
};

describe("runtime state frame", () => {
  test("creates a typed aligned state frame from runtime preparation", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["pop", "nrfr"],
      },
      tables,
    );

    const frame = createRuntimeStateFrame(prepared, fixture);

    expect(Array.from(frame.time)).toEqual([1900, 1901, 1902]);
    expect(frame.constantsUsed).toEqual({ nri: 100 });
    expect(Array.from(frame.series.get("pop") ?? [])).toEqual([10, 14, 18]);
    expect(Array.from(frame.series.get("nrfr") ?? [])).toEqual([1, 0.9, 0.8]);
    expect(frame.series.has("nr")).toBe(false);
  });

  test("can convert the state frame back to the public simulation result shape", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["nrfr"],
        constants: { nri: 200 },
      },
      tables,
    );

    const frame = createRuntimeStateFrame(prepared, fixture);

    expect(runtimeStateFrameToSimulationResult(frame)).toEqual({
      year_min: 1900,
      year_max: 1902,
      dt: 1,
      time: [1900, 1901, 1902],
      constants_used: { nri: 200 },
      series: {
        nrfr: { name: "nrfr", values: [0.5, 0.45, 0.4] },
      },
    });
  });

  test("can assemble the public simulation result by stepping observations", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["pop", "nrfr"],
      },
      tables,
    );

    const frame = createRuntimeStateFrame(prepared, fixture);

    expect(assembleSimulationResultFromStepper(frame)).toEqual({
      year_min: 1900,
      year_max: 1902,
      dt: 1,
      time: [1900, 1901, 1902],
      constants_used: { nri: 100 },
      series: {
        pop: { name: "pop", values: [10, 14, 18] },
        nrfr: { name: "nrfr", values: [1, 0.9, 0.8] },
      },
    });
  });

  test("can observe a single timestep snapshot from the frame", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["pop", "nrfr"],
      },
      tables,
    );

    const frame = createRuntimeStateFrame(prepared, fixture);

    expect(observeRuntimeStateAt(frame, 1)).toEqual({
      index: 1,
      time: 1901,
      values: {
        pop: 14,
        nrfr: 0.9,
      },
    });
  });

  test("can list the full observation stream from the frame", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1901,
        dt: 0.5,
        output_variables: ["pop"],
      },
      tables,
    );

    const frame = createRuntimeStateFrame(prepared, fixture);

    expect(listRuntimeObservations(frame)).toEqual([
      { index: 0, time: 1900, values: { pop: 10 } },
      { index: 1, time: 1900.5, values: { pop: 12 } },
      { index: 2, time: 1901, values: { pop: 14 } },
    ]);
  });

  test("fails clearly when observing an out-of-bounds frame index", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1901,
        dt: 1,
        output_variables: ["pop"],
      },
      tables,
    );

    const frame = createRuntimeStateFrame(prepared, fixture);

    expect(() => observeRuntimeStateAt(frame, 3)).toThrow(
      "index 3 is out of bounds",
    );
  });

  test("can step through the runtime frame sequentially", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1901,
        dt: 0.5,
        output_variables: ["pop"],
      },
      tables,
    );
    const frame = createRuntimeStateFrame(prepared, fixture);
    const stepper = createRuntimeStepper(frame);

    expect(stepper.length()).toBe(3);
    expect(stepper.index()).toBe(0);
    expect(stepper.current()).toEqual({
      index: 0,
      time: 1900,
      values: { pop: 10 },
    });
    expect(stepper.peek(1)).toEqual({
      index: 1,
      time: 1900.5,
      values: { pop: 12 },
    });
    expect(stepper.next()).toEqual({
      index: 0,
      time: 1900,
      values: { pop: 10 },
    });
    expect(stepper.index()).toBe(1);
    expect(stepper.next()).toEqual({
      index: 1,
      time: 1900.5,
      values: { pop: 12 },
    });
    expect(stepper.next()).toEqual({
      index: 2,
      time: 1901,
      values: { pop: 14 },
    });
    expect(stepper.isDone()).toBe(true);
    expect(stepper.current()).toBeNull();
    expect(stepper.next()).toBeNull();
    expect(stepper.peek()).toBeNull();
  });

  test("can reset the runtime stepper back to the beginning", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1901,
        dt: 1,
        output_variables: ["pop"],
      },
      tables,
    );
    const frame = createRuntimeStateFrame(prepared, fixture);
    const stepper = createRuntimeStepper(frame);

    stepper.next();
    stepper.next();

    expect(stepper.isDone()).toBe(true);

    stepper.reset();

    expect(stepper.index()).toBe(0);
    expect(stepper.isDone()).toBe(false);
    expect(stepper.current()).toEqual({
      index: 0,
      time: 1900,
      values: { pop: 10 },
    });
  });

  test("can populate a derived series buffer by stepping through the frame", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["pop", "nrfr"],
      },
      tables,
    );
    const frame = createRuntimeStateFrame(prepared, fixture);

    const doubledPopulation = populateSeriesBufferFromStepper(
      frame,
      (observation) => {
        const pop = observation.values.pop;
        if (pop === undefined) {
          throw new Error("Missing pop during derived buffer population.");
        }
        return pop * 2;
      },
    );

    expect(Array.from(doubledPopulation)).toEqual([20, 28, 36]);
  });

  test("can populate a source state series buffer by stepping observed transitions", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["nr"],
      },
      tables,
    );
    const frame = createRuntimeStateFrame(prepared, fixture);

    expect(Array.from(frame.series.get("nr") ?? [])).toEqual([100, 90, 80]);

    const replayedNr = populateStateBufferFromStepper(
      frame,
      frame.series.get("nr")?.[0] ?? 0,
      (currentValue, observation, nextObservation) => {
        const observed = observation.values.nr;
        const nextObserved = nextObservation?.values.nr;
        if (observed === undefined) {
          throw new Error("Missing nr during state buffer population.");
        }
        if (nextObserved === undefined) {
          return currentValue;
        }
        return currentValue + (nextObserved - observed);
      },
    );

    expect(Array.from(replayedNr)).toEqual([100, 90, 80]);
  });
});
