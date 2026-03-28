import { describe, expect, test } from "vitest";

import {
  assembleSimulationResultFromStepper,
  createReplayStateDefinition,
  createRuntimeStepper,
  createRuntimeStateFrame,
  listRuntimeObservations,
  observeRuntimeStateAt,
  populateSeriesBufferFromStepper,
  populateStateBufferFromDefinition,
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
    iopc: { name: "iopc", values: [1, 1.5, 2, 2.5, 3] },
    fpc: { name: "fpc", values: [300, 290, 280, 270, 260] },
    ppolx: { name: "ppolx", values: [0.1, 0.15, 0.2, 0.25, 0.3] },
    le: { name: "le", values: [30, 31, 32, 33, 34] },
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

  test("can populate the pop source series through the stepped state path", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["pop"],
      },
      tables,
    );
    const frame = createRuntimeStateFrame(prepared, fixture);

    expect(Array.from(frame.series.get("pop") ?? [])).toEqual([10, 14, 18]);

    const replayedPop = populateStateBufferFromStepper(
      frame,
      frame.series.get("pop")?.[0] ?? 0,
      (currentValue, observation, nextObservation) => {
        const observed = observation.values.pop;
        const nextObserved = nextObservation?.values.pop;
        if (observed === undefined) {
          throw new Error("Missing pop during state buffer population.");
        }
        if (nextObserved === undefined) {
          return currentValue;
        }
        return currentValue + (nextObserved - observed);
      },
    );

    expect(Array.from(replayedPop)).toEqual([10, 14, 18]);
  });

  test("can populate the iopc source series through the stepped state path", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["iopc"],
      },
      tables,
    );
    const frame = createRuntimeStateFrame(prepared, fixture);

    expect(Array.from(frame.series.get("iopc") ?? [])).toEqual([1, 2, 3]);

    const replayedIopc = populateStateBufferFromStepper(
      frame,
      frame.series.get("iopc")?.[0] ?? 0,
      (currentValue, observation, nextObservation) => {
        const observed = observation.values.iopc;
        const nextObserved = nextObservation?.values.iopc;
        if (observed === undefined) {
          throw new Error("Missing iopc during state buffer population.");
        }
        if (nextObserved === undefined) {
          return currentValue;
        }
        return currentValue + (nextObserved - observed);
      },
    );

    expect(Array.from(replayedIopc)).toEqual([1, 2, 3]);
  });

  test("can populate the fpc source series through the stepped state path", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["fpc"],
      },
      tables,
    );
    const frame = createRuntimeStateFrame(prepared, fixture);

    expect(Array.from(frame.series.get("fpc") ?? [])).toEqual([300, 280, 260]);

    const replayedFpc = populateStateBufferFromStepper(
      frame,
      frame.series.get("fpc")?.[0] ?? 0,
      (currentValue, observation, nextObservation) => {
        const observed = observation.values.fpc;
        const nextObserved = nextObservation?.values.fpc;
        if (observed === undefined) {
          throw new Error("Missing fpc during state buffer population.");
        }
        if (nextObserved === undefined) {
          return currentValue;
        }
        return currentValue + (nextObserved - observed);
      },
    );

    expect(Array.from(replayedFpc)).toEqual([300, 280, 260]);
  });

  test("can populate the ppolx source series through the stepped state path", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["ppolx"],
      },
      tables,
    );
    const frame = createRuntimeStateFrame(prepared, fixture);

    expect(Array.from(frame.series.get("ppolx") ?? [])).toEqual([0.1, 0.2, 0.3]);

    const replayedPpolx = populateStateBufferFromStepper(
      frame,
      frame.series.get("ppolx")?.[0] ?? 0,
      (currentValue, observation, nextObservation) => {
        const observed = observation.values.ppolx;
        const nextObserved = nextObservation?.values.ppolx;
        if (observed === undefined) {
          throw new Error("Missing ppolx during state buffer population.");
        }
        if (nextObserved === undefined) {
          return currentValue;
        }
        return currentValue + (nextObserved - observed);
      },
    );

    expect(Array.from(replayedPpolx)).toEqual([0.1, 0.2, 0.3]);
  });

  test("can populate the le source series through the stepped state path", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["le"],
      },
      tables,
    );
    const frame = createRuntimeStateFrame(prepared, fixture);

    expect(Array.from(frame.series.get("le") ?? [])).toEqual([30, 32, 34]);

    const replayedLe = populateStateBufferFromStepper(
      frame,
      frame.series.get("le")?.[0] ?? 0,
      (currentValue, observation, nextObservation) => {
        const observed = observation.values.le;
        const nextObserved = nextObservation?.values.le;
        if (observed === undefined) {
          throw new Error("Missing le during state buffer population.");
        }
        if (nextObserved === undefined) {
          return currentValue;
        }
        return currentValue + (nextObserved - observed);
      },
    );

    expect(Array.from(replayedLe)).toEqual([30, 32, 34]);
  });

  test("can populate a source series from an explicit runtime state definition", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["ppolx"],
      },
      tables,
    );
    const projectedPpolx = new Map([
      ["ppolx", Float64Array.from([0.1, 0.2, 0.3])],
    ]);

    populateStateBufferFromDefinition(
      projectedPpolx,
      {
        request: prepared.request,
        time: Float64Array.from(prepared.time),
        constantsUsed: fixture.constants_used,
        series: projectedPpolx,
      },
      createReplayStateDefinition("ppolx"),
    );

    expect(Array.from(projectedPpolx.get("ppolx") ?? [])).toEqual([0.1, 0.2, 0.3]);
  });
});
