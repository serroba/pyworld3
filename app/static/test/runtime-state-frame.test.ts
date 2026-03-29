import { describe, expect, test } from "vitest";

import {
  assembleSimulationResultFromStepper,
  createEulerStateDefinition,
  createFcaorDerivedDefinition,
  createNrResourceUsageRateDefinition,
  createReplayStateDefinition,
  createNrfrDerivedDefinition,
  createNrufDerivedDefinition,
  createPcrumDerivedDefinition,
  createRuntimeStepper,
  createRuntimeStateFrame,
  listRuntimeObservations,
  observeRuntimeStateAt,
  populateDerivedBufferFromDefinition,
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
    sector: "Resources",
    "x.name": "IOPC",
    "x.values": [1, 2, 3],
    "y.name": "PCRUM",
    "y.values": [2, 3, 4],
  },
  {
    sector: "Resources",
    "x.name": "NRFR",
    "x.values": [0, 1],
    "y.name": "FCAOR1",
    "y.values": [1, 0],
  },
  {
    sector: "Resources",
    "x.name": "NRFR",
    "x.values": [0, 1],
    "y.name": "FCAOR2",
    "y.values": [0.5, 0.2],
  },
  {
    sector: "Population",
    "x.name": "LE",
    "x.values": [20, 40],
    "y.name": "M1",
    "y.values": [0.05, 0.03],
  },
  {
    sector: "Capital",
    "x.name": "IOPCR",
    "x.values": [0, 1, 2],
    "y.name": "FIOACV",
    "y.values": [0.2, 0.4, 0.6],
  },
  {
    sector: "Capital",
    "x.name": "IOPC",
    "x.values": [0, 100, 200],
    "y.name": "ISOPC1",
    "y.values": [10, 20, 30],
  },
  {
    sector: "Capital",
    "x.name": "IOPC",
    "x.values": [0, 100, 200],
    "y.name": "ISOPC2",
    "y.values": [15, 25, 35],
  },
  {
    sector: "Capital",
    "x.name": "SOR",
    "x.values": [0, 2, 4],
    "y.name": "FIOAS1",
    "y.values": [0.2, 0.4, 0.6],
  },
  {
    sector: "Capital",
    "x.name": "SOR",
    "x.values": [0, 2, 4],
    "y.name": "FIOAS2",
    "y.values": [0.25, 0.45, 0.65],
  },
  {
    sector: "Capital",
    "x.name": "LUFD",
    "x.values": [0, 1, 2],
    "y.name": "CUF",
    "y.values": [0, 0.5, 1],
  },
];

const fixture: SimulationResult = {
  year_min: 1900,
  year_max: 1902,
  dt: 0.5,
  time: [1900, 1900.5, 1901, 1901.5, 1902],
  constants_used: { nri: 100, nruf1: 1, nruf2: 0.5 },
  series: {
    nr: { name: "nr", values: [100, 95, 90, 85, 80] },
    pop: { name: "pop", values: [10, 12, 14, 16, 18] },
    so: { name: "so", values: [40, 60, 84, 112, 144] },
    sopc: { name: "sopc", values: [4, 5, 6, 7, 8] },
    iopc: { name: "iopc", values: [1, 1.5, 2, 2.5, 3] },
    fpc: { name: "fpc", values: [300, 290, 280, 270, 260] },
    ppolx: { name: "ppolx", values: [0.1, 0.15, 0.2, 0.25, 0.3] },
    le: { name: "le", values: [30, 31, 32, 33, 34] },
    nrfr: { name: "nrfr", values: [99, 99, 99, 99, 99] },
  },
};

const capitalFixture: SimulationResult = {
  year_min: 1900,
  year_max: 1902,
  dt: 0.5,
  time: [1900, 1900.5, 1901, 1901.5, 1902],
  constants_used: {
    fioac1: 0.43,
    fioac2: 0.5,
    iopcd: 100,
    iet: 1950,
    ici: 210,
    sci: 144,
    alic1: 14,
    alic2: 14,
    alsc1: 20,
    alsc2: 20,
    icor1: 3,
    icor2: 3,
    scor1: 1,
    scor2: 1,
  },
  series: {
    fioaa: { name: "fioaa", values: [0.1, 0.1, 0.1, 0.1, 0.1] },
    fcaor: { name: "fcaor", values: [0.2, 0.2, 0.2, 0.2, 0.2] },
    luf: { name: "luf", values: [2, 2, 2, 2, 2] },
    pop: { name: "pop", values: [10, 12, 14, 16, 18] },
    iopc: { name: "iopc", values: [99, 99, 99, 99, 99] },
    sopc: { name: "sopc", values: [99, 99, 99, 99, 99] },
  },
};

const capitalResourceFixture: SimulationResult = {
  year_min: 1900,
  year_max: 1902,
  dt: 0.5,
  time: [1900, 1900.5, 1901, 1901.5, 1902],
  constants_used: {
    nri: 100,
    nruf1: 0.1,
    nruf2: 0.1,
    fioac1: 0.43,
    fioac2: 0.5,
    iopcd: 100,
    iet: 1950,
    ici: 210,
    sci: 144,
    alic1: 14,
    alic2: 14,
    alsc1: 20,
    alsc2: 20,
    icor1: 3,
    icor2: 3,
    scor1: 1,
    scor2: 1,
  },
  series: {
    nr: { name: "nr", values: [100, 100, 100, 100, 100] },
    fioaa: { name: "fioaa", values: [0.1, 0.1, 0.1, 0.1, 0.1] },
    fcaor: { name: "fcaor", values: [0.2, 0.2, 0.2, 0.2, 0.2] },
    luf: { name: "luf", values: [2, 2, 2, 2, 2] },
    pop: { name: "pop", values: [10, 12, 14, 16, 18] },
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
    expect(frame.constantsUsed).toEqual({ nri: 100, nruf1: 1, nruf2: 0.5 });
    expect(Array.from(frame.series.get("pop") ?? [])).toEqual([10, 14, 18]);
    expect(Array.from(frame.series.get("nrfr") ?? [])).toEqual([1, 0.8, 0.38]);
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
      constants_used: { nri: 200, nruf1: 1, nruf2: 0.5 },
      series: {
        nrfr: { name: "nrfr", values: [0.5, 0.4, 0.19] },
      },
    });
  });

  test("can derive io natively from pop and iopc through the runtime state frame", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["io"],
      },
      tables,
    );

    const frame = createRuntimeStateFrame(prepared, fixture);

    expect(runtimeStateFrameToSimulationResult(frame)).toEqual({
      year_min: 1900,
      year_max: 1902,
      dt: 1,
      time: [1900, 1901, 1902],
      constants_used: { nri: 100, nruf1: 1, nruf2: 0.5 },
      series: {
        io: { name: "io", values: [10, 28, 54] },
      },
    });
  });

  test("can derive sopc natively from so and pop through the runtime state frame", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["sopc"],
      },
      tables,
    );

    const frame = createRuntimeStateFrame(prepared, fixture);

    expect(runtimeStateFrameToSimulationResult(frame)).toEqual({
      year_min: 1900,
      year_max: 1902,
      dt: 1,
      time: [1900, 1901, 1902],
      constants_used: { nri: 100, nruf1: 1, nruf2: 0.5 },
      series: {
        sopc: { name: "sopc", values: [4, 6, 8] },
      },
    });
  });

  test("can derive iopc through the ordered capital sector path", () => {
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

    const frame = createRuntimeStateFrame(prepared, capitalFixture);

    expect(runtimeStateFrameToSimulationResult(frame)).toEqual({
      year_min: 1900,
      year_max: 1902,
      dt: 1,
      time: [1900, 1901, 1902],
      constants_used: capitalFixture.constants_used,
      series: {
        iopc: {
          name: "iopc",
          values: [5.6, 3.8568311688311696, 2.9158462736956245],
        },
      },
    });
  });

  test("can derive iopc through native nr-to-fcaor capital feedback", () => {
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
    const capitalFeedbackFixture: SimulationResult = {
      ...capitalFixture,
      constants_used: {
        ...capitalFixture.constants_used,
        nri: 100,
      },
      series: {
        ...capitalFixture.series,
        nr: { name: "nr", values: [100, 90, 80, 59, 38] },
      },
    };
    delete capitalFeedbackFixture.series.fcaor;

    const frame = createRuntimeStateFrame(prepared, capitalFeedbackFixture);

    expect(runtimeStateFrameToSimulationResult(frame)).toEqual({
      year_min: 1900,
      year_max: 1902,
      dt: 1,
      time: [1900, 1901, 1902],
      constants_used: capitalFeedbackFixture.constants_used,
      series: {
        iopc: {
          name: "iopc",
          values: [7, 2.9211348464619493, 0.18560842240895634],
        },
      },
    });
  });

  test("can derive fcaor natively from stepped nr", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["fcaor"],
      },
      tables,
    );

    const frame = createRuntimeStateFrame(prepared, fixture);
    const result = runtimeStateFrameToSimulationResult(frame);
    expect(result.year_min).toBe(1900);
    expect(result.year_max).toBe(1902);
    expect(result.dt).toBe(1);
    expect(result.time).toEqual([1900, 1901, 1902]);
    expect(result.constants_used).toEqual({ nri: 100, nruf1: 1, nruf2: 0.5 });
    expect(result.series.fcaor?.name).toBe("fcaor");
    expect(result.series.fcaor?.values[0]).toBeCloseTo(0, 8);
    expect(result.series.fcaor?.values[1]).toBeCloseTo(0.2, 8);
    expect(result.series.fcaor?.values[2]).toBeCloseTo(0.62, 8);
  });

  test("can derive le through the native population support path", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["le"],
      },
      [
        ...tables,
        {
          sector: "Population",
          "x.name": "POP",
          "x.values": [0, 100, 200],
          "y.name": "FPU",
          "y.values": [0, 0.1, 0.2],
        },
        {
          sector: "Population",
          "x.name": "FPC/SFPC",
          "x.values": [0, 1, 2],
          "y.name": "LMF",
          "y.values": [0.8, 1, 1.2],
        },
        {
          sector: "Population",
          "x.name": "SOPC",
          "x.values": [0, 10, 20],
          "y.name": "HSAPC",
          "y.values": [0, 10, 20],
        },
        {
          sector: "Population",
          "x.name": "EHSPC",
          "x.values": [0, 10, 20],
          "y.name": "LMHS1",
          "y.values": [0.5, 1, 1.5],
        },
        {
          sector: "Population",
          "x.name": "EHSPC",
          "x.values": [0, 10, 20],
          "y.name": "LMHS2",
          "y.values": [0.4, 0.9, 1.4],
        },
        {
          sector: "Population",
          "x.name": "IOPC",
          "x.values": [0, 10, 20],
          "y.name": "CMI",
          "y.values": [0, 0.1, 0.2],
        },
        {
          sector: "Population",
          "x.name": "PPOLX",
          "x.values": [0, 1, 2],
          "y.name": "LMP",
          "y.values": [1.2, 1, 0.8],
        },
      ],
    );
    const populationFixture: SimulationResult = {
      year_min: 1900,
      year_max: 1902,
      dt: 0.5,
      time: [1900, 1900.5, 1901, 1901.5, 1902],
      constants_used: {
        len: 28,
        sfpc: 230,
        hsid: 20,
        iphst: 1940,
      },
      series: {
        pop: { name: "pop", values: [10, 12, 14, 16, 18] },
        fpc: { name: "fpc", values: [230, 253, 276, 299, 322] },
        iopc: { name: "iopc", values: [10, 10, 10, 10, 10] },
        sopc: { name: "sopc", values: [10, 10, 10, 10, 10] },
        ppolx: { name: "ppolx", values: [1, 1, 1, 1, 1] },
        le: { name: "le", values: [0, 0, 0, 0, 0] },
      },
    };

    const frame = createRuntimeStateFrame(prepared, populationFixture);

    expect(runtimeStateFrameToSimulationResult(frame)).toEqual({
      year_min: 1900,
      year_max: 1902,
      dt: 1,
      time: [1900, 1901, 1902],
      constants_used: populationFixture.constants_used,
      series: {
        le: {
          name: "le",
          values: [27.972, 29.079232, 30.185568],
        },
      },
    });
  });

  test("can derive m1 through the native population mortality path", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["m1"],
      },
      [
        ...tables,
        {
          sector: "Population",
          "x.name": "POP",
          "x.values": [0, 100, 200],
          "y.name": "FPU",
          "y.values": [0, 0.1, 0.2],
        },
        {
          sector: "Population",
          "x.name": "FPC/SFPC",
          "x.values": [0, 1, 2],
          "y.name": "LMF",
          "y.values": [0.8, 1, 1.2],
        },
        {
          sector: "Population",
          "x.name": "SOPC",
          "x.values": [0, 10, 20],
          "y.name": "HSAPC",
          "y.values": [0, 10, 20],
        },
        {
          sector: "Population",
          "x.name": "EHSPC",
          "x.values": [0, 10, 20],
          "y.name": "LMHS1",
          "y.values": [0.5, 1, 1.5],
        },
        {
          sector: "Population",
          "x.name": "EHSPC",
          "x.values": [0, 10, 20],
          "y.name": "LMHS2",
          "y.values": [0.4, 0.9, 1.4],
        },
        {
          sector: "Population",
          "x.name": "IOPC",
          "x.values": [0, 10, 20],
          "y.name": "CMI",
          "y.values": [0, 0.1, 0.2],
        },
        {
          sector: "Population",
          "x.name": "PPOLX",
          "x.values": [0, 1, 2],
          "y.name": "LMP",
          "y.values": [1.2, 1, 0.8],
        },
        {
          sector: "Population",
          "x.name": "LE",
          "x.values": [20, 30, 40],
          "y.name": "M1",
          "y.values": [0.05, 0.03, 0.01],
        },
        {
          sector: "Population",
          "x.name": "LE",
          "x.values": [20, 30, 40],
          "y.name": "M2",
          "y.values": [0.03, 0.02, 0.01],
        },
        {
          sector: "Population",
          "x.name": "LE",
          "x.values": [20, 30, 40],
          "y.name": "M3",
          "y.values": [0.06, 0.04, 0.02],
        },
        {
          sector: "Population",
          "x.name": "LE",
          "x.values": [20, 30, 40],
          "y.name": "M4",
          "y.values": [0.12, 0.1, 0.08],
        },
      ],
    );
    const populationFixture: SimulationResult = {
      year_min: 1900,
      year_max: 1902,
      dt: 0.5,
      time: [1900, 1900.5, 1901, 1901.5, 1902],
      constants_used: {
        len: 28,
        sfpc: 230,
        hsid: 20,
        iphst: 1940,
      },
      series: {
        pop: { name: "pop", values: [10, 12, 14, 16, 18] },
        fpc: { name: "fpc", values: [230, 253, 276, 299, 322] },
        iopc: { name: "iopc", values: [10, 10, 10, 10, 10] },
        sopc: { name: "sopc", values: [10, 10, 10, 10, 10] },
        ppolx: { name: "ppolx", values: [1, 1, 1, 1, 1] },
      },
    };

    const frame = createRuntimeStateFrame(prepared, populationFixture);

    const result = runtimeStateFrameToSimulationResult(frame);
    expect(result.year_min).toBe(1900);
    expect(result.year_max).toBe(1902);
    expect(result.dt).toBe(1);
    expect(result.time).toEqual([1900, 1901, 1902]);
    expect(result.constants_used).toEqual(populationFixture.constants_used);
    expect(result.series.m1?.name).toBe("m1");
    expect(result.series.m1?.values[0]).toBeCloseTo(0.034056, 8);
    expect(result.series.m1?.values[1]).toBeCloseTo(0.031841536, 8);
    expect(result.series.m1?.values[2]).toBeCloseTo(0.029628864, 8);
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
      constants_used: { nri: 100, nruf1: 1, nruf2: 0.5 },
      series: {
        pop: { name: "pop", values: [10, 14, 18] },
        nrfr: { name: "nrfr", values: [1, 0.8, 0.38] },
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
        nrfr: 0.8,
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

    expect(Array.from(frame.series.get("nr") ?? [])).toEqual([100, 80, 38]);

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

    expect(Array.from(replayedNr)).toEqual([100, 80, 38]);
  });

  test("can populate a stock series from an Euler-style runtime state definition", () => {
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
    const projectedNr = new Map<string, Float64Array>([
      ["nr", Float64Array.from([100, 0, 0])],
      ["__nr_rate", Float64Array.from([10, 10, 10])],
    ]);

    populateStateBufferFromDefinition(
      projectedNr,
      {
        request: prepared.request,
        time: Float64Array.from(prepared.time),
        constantsUsed: fixture.constants_used,
        series: projectedNr,
      },
      createEulerStateDefinition("nr", "__nr_rate", -1),
    );

    expect(Array.from(projectedNr.get("nr") ?? [])).toEqual([100, 90, 80]);
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

  test("can derive the le output series through the native population path", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["le"],
      },
      [
        ...tables,
        {
          sector: "Population",
          "x.name": "POP",
          "x.values": [0, 100, 200],
          "y.name": "FPU",
          "y.values": [0, 0.1, 0.2],
        },
        {
          sector: "Population",
          "x.name": "FPC/SFPC",
          "x.values": [0, 1, 2],
          "y.name": "LMF",
          "y.values": [0.8, 1, 1.2],
        },
        {
          sector: "Population",
          "x.name": "SOPC",
          "x.values": [0, 10, 20],
          "y.name": "HSAPC",
          "y.values": [0, 10, 20],
        },
        {
          sector: "Population",
          "x.name": "EHSPC",
          "x.values": [0, 10, 20],
          "y.name": "LMHS1",
          "y.values": [0.5, 1, 1.5],
        },
        {
          sector: "Population",
          "x.name": "EHSPC",
          "x.values": [0, 10, 20],
          "y.name": "LMHS2",
          "y.values": [0.4, 0.9, 1.4],
        },
        {
          sector: "Population",
          "x.name": "IOPC",
          "x.values": [0, 10, 20],
          "y.name": "CMI",
          "y.values": [0, 0.1, 0.2],
        },
        {
          sector: "Population",
          "x.name": "PPOLX",
          "x.values": [0, 1, 2],
          "y.name": "LMP",
          "y.values": [1.2, 1, 0.8],
        },
      ],
    );
    const populationFixture: SimulationResult = {
      year_min: 1900,
      year_max: 1902,
      dt: 0.5,
      time: [1900, 1900.5, 1901, 1901.5, 1902],
      constants_used: {
        len: 28,
        sfpc: 230,
        hsid: 20,
        iphst: 1940,
      },
      series: {
        pop: { name: "pop", values: [10, 12, 14, 16, 18] },
        fpc: { name: "fpc", values: [230, 253, 276, 299, 322] },
        iopc: { name: "iopc", values: [10, 10, 10, 10, 10] },
        sopc: { name: "sopc", values: [10, 10, 10, 10, 10] },
        ppolx: { name: "ppolx", values: [1, 1, 1, 1, 1] },
      },
    };
    const frame = createRuntimeStateFrame(prepared, populationFixture);

    expect(Array.from(frame.series.get("le") ?? [])).toEqual([27.972, 29.079232, 30.185568]);

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

    expect(Array.from(replayedLe)).toEqual([27.972, 29.079232, 30.185568]);
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

  test("can populate nr through an explicit Euler stock definition with positive outflow", () => {
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
    const projectedNr = new Map([
      ["nr", Float64Array.from([100, 90, 80])],
      ["__nr_rate", Float64Array.from([10, 10, 10])],
    ]);

    populateStateBufferFromDefinition(
      projectedNr,
      {
        request: prepared.request,
        time: Float64Array.from(prepared.time),
        constantsUsed: fixture.constants_used,
        series: projectedNr,
      },
      createEulerStateDefinition("nr", "__nr_rate", -1),
    );

    expect(Array.from(projectedNr.get("nr") ?? [])).toEqual([100, 90, 80]);
  });

  test("can derive the hidden nruf policy series from constants", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1974,
        year_max: 1976,
        dt: 1,
        pyear: 1975,
        output_variables: ["nr"],
      },
      tables,
    );
    const series = new Map([["nr", Float64Array.from([100, 90, 80])]]);
    const frame = {
      request: prepared.request,
      time: Float64Array.from(prepared.time),
      constantsUsed: fixture.constants_used,
      series,
    };

    populateDerivedBufferFromDefinition(
      frame,
      series,
      createNrufDerivedDefinition(fixture.constants_used, 1975),
    );

    expect(Array.from(series.get("__nruf") ?? [])).toEqual([1, 1, 0.5]);
  });

  test("can derive the hidden pcrum lookup series from iopc", () => {
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
    const series = new Map([["iopc", Float64Array.from([1, 2, 3])]]);
    const frame = {
      request: prepared.request,
      time: Float64Array.from(prepared.time),
      constantsUsed: fixture.constants_used,
      series,
    };

    populateDerivedBufferFromDefinition(
      frame,
      series,
      createPcrumDerivedDefinition(prepared.lookupLibrary.get("PCRUM")!),
    );

    expect(Array.from(series.get("__pcrum") ?? [])).toEqual([2, 3, 4]);
  });

  test("can derive the hidden resource usage rate from pop pcrum and nruf", () => {
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
    const series = new Map([
      ["pop", Float64Array.from([10, 14, 18])],
      ["__pcrum", Float64Array.from([2, 3, 4])],
      ["__nruf", Float64Array.from([1, 1, 0.5])],
    ]);
    const frame = {
      request: prepared.request,
      time: Float64Array.from(prepared.time),
      constantsUsed: fixture.constants_used,
      series,
    };

    populateDerivedBufferFromDefinition(
      frame,
      series,
      createNrResourceUsageRateDefinition(),
    );

    expect(Array.from(series.get("__nr_rate") ?? [])).toEqual([20, 42, 36]);
  });

  test("can derive fcaor from lookup tables and policy year", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1974,
        year_max: 1976,
        dt: 1,
        pyear: 1975,
        output_variables: ["fcaor"],
      },
      tables,
    );
    const series = new Map([
      ["nr", Float64Array.from([100, 80, 38])],
    ]);
    const frame = {
      request: prepared.request,
      time: Float64Array.from(prepared.time),
      constantsUsed: fixture.constants_used,
      series,
    };
    const derivedSeries = new Map<string, Float64Array>();

    populateDerivedBufferFromDefinition(
      frame,
      derivedSeries,
      createFcaorDerivedDefinition(
        fixture.constants_used,
        prepared.lookupLibrary.get("FCAOR1")!,
        prepared.lookupLibrary.get("FCAOR2")!,
        1975,
      ),
    );

    const values = Array.from(derivedSeries.get("fcaor") ?? []);
    expect(values[0]).toBeCloseTo(0, 8);
    expect(values[1]).toBeCloseTo(0.2, 8);
    expect(values[2]).toBeCloseTo(0.386, 8);
  });

  test("uses native resource flow definitions when hidden dependencies are available", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["nr", "nrfr"],
      },
      tables,
    );

    const frame = createRuntimeStateFrame(prepared, fixture);

    expect(Array.from(frame.series.get("nr") ?? [])).toEqual([100, 80, 38]);
    expect(Array.from(frame.series.get("nrfr") ?? [])).toEqual([1, 0.8, 0.38]);
  });

  test("uses native capital iopc to drive native resource flow when sectors are linked", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["nr", "nrfr", "iopc"],
      },
      tables,
    );

    const frame = createRuntimeStateFrame(prepared, capitalResourceFixture);

    expect(Array.from(frame.series.get("iopc") ?? [])).toEqual([
      5.6,
      3.8568311688311696,
      2.9158462736956245,
    ]);
    expect(Array.from(frame.series.get("nr") ?? [])).toEqual([
      100,
      96,
      90.4,
    ]);
    expect(Array.from(frame.series.get("nrfr") ?? [])).toEqual([
      1,
      0.96,
      0.904,
    ]);
  });

  test("can populate a stock series from an Euler-style runtime state definition", () => {
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
    const projectedNr = new Map<string, Float64Array>([
      ["nr", Float64Array.from([100, 0, 0])],
      ["__nr_rate", Float64Array.from([-10, -10, -10])],
    ]);

    populateStateBufferFromDefinition(
      projectedNr,
      {
        request: prepared.request,
        time: Float64Array.from(prepared.time),
        constantsUsed: fixture.constants_used,
        series: projectedNr,
      },
      createEulerStateDefinition("nr", "__nr_rate"),
    );

    expect(Array.from(projectedNr.get("nr") ?? [])).toEqual([100, 90, 80]);
  });

  test("can populate a derived series from an explicit runtime derived definition", () => {
    const prepared = prepareRuntime(
      ModelData,
      {
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["nrfr"],
      },
      tables,
    );
    const sourceFrame = {
      request: prepared.request,
      time: Float64Array.from(prepared.time),
      constantsUsed: { nri: 100 },
      series: new Map<string, Float64Array>([
        ["nr", Float64Array.from([100, 90, 80])],
      ]),
    };
    const derivedSeries = new Map<string, Float64Array>();

    populateDerivedBufferFromDefinition(
      sourceFrame,
      derivedSeries,
      createNrfrDerivedDefinition(sourceFrame.constantsUsed),
    );

    expect(Array.from(derivedSeries.get("nrfr") ?? [])).toEqual([1, 0.9, 0.8]);
  });
});
