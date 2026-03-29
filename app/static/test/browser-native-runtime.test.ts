import { describe, expect, test, vi } from "vitest";

import { ModelData } from "../ts/model-data.ts";
import {
  createFixtureBackedRuntime,
  prepareRuntime,
} from "../ts/core/index.ts";
import type { RawLookupTable } from "../ts/core/index.ts";
import type { SimulationResult } from "../ts/simulation-contracts.ts";

const fixture: SimulationResult = {
  year_min: 1900,
  year_max: 1901,
  dt: 0.5,
  time: [1900, 1900.5, 1901],
  constants_used: {},
  series: {
    pop: { name: "pop", values: [1, 2, 3] },
  },
};

const tables: RawLookupTable[] = [
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

describe("browser-native runtime", () => {
  test("prepares a runtime context with time grid and lookup library", () => {
    const prepared = prepareRuntime(
      ModelData,
      { year_min: 1900, year_max: 1901, dt: 0.5, output_variables: ["pop"] },
      tables,
    );

    expect(Array.from(prepared.time)).toEqual([1900, 1900.5, 1901]);
    expect(prepared.outputVariables).toEqual(["pop"]);
    expect(prepared.lookupLibrary.get("M1")?.evaluate(30)).toBeCloseTo(0.04, 8);
  });

  test("uses model defaults when request fields are omitted", () => {
    const prepared = prepareRuntime(ModelData, {}, tables);

    expect(prepared.outputVariables).toEqual(ModelData.defaultVariables);
    expect(prepared.time[0]).toBe(1900);
    expect(prepared.time[prepared.time.length - 1]).toBe(2100);
  });

  test("caches tables and fixture loads in the fixture-backed runtime", async () => {
    const loadTables = vi.fn(async () => tables);
    const loadFixture = vi.fn(async () => fixture);
    const runtime = createFixtureBackedRuntime(ModelData, loadTables, loadFixture);

    await runtime.prepareStandardRun();
    await runtime.prepareStandardRun();
    await runtime.simulateStandardRun();
    await runtime.simulateStandardRun();

    expect(loadTables).toHaveBeenCalledTimes(1);
    expect(loadFixture).toHaveBeenCalledTimes(1);
  });

  test("projects fixture results onto the requested output variables and aligned grid", async () => {
    const runtime = createFixtureBackedRuntime(
      ModelData,
      async () => tables,
      async () => ({
        year_min: 1900,
        year_max: 1902,
        dt: 0.5,
        time: [1900, 1900.5, 1901, 1901.5, 1902],
        constants_used: { nri: 2_000_000_000_000 },
        series: {
          pop: { name: "pop", values: [1, 2, 3, 4, 5] },
          nr: { name: "nr", values: [5, 4, 3, 2, 1] },
        },
      }),
    );

    await expect(
      runtime.simulateStandardRun({
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["nr"],
        constants: { nri: 123 },
      }),
    ).resolves.toEqual({
      year_min: 1900,
      year_max: 1902,
      dt: 1,
      time: [1900, 1901, 1902],
      constants_used: { nri: 123 },
      series: {
        nr: { name: "nr", values: [5, 3, 1] },
      },
    });
  });

  test("derives nrfr natively through the runtime projection seam", async () => {
    const runtime = createFixtureBackedRuntime(
      ModelData,
      async () => tables,
      async () => ({
        year_min: 1900,
        year_max: 1902,
        dt: 0.5,
        time: [1900, 1900.5, 1901, 1901.5, 1902],
        constants_used: { nri: 100 },
        series: {
          nr: { name: "nr", values: [100, 95, 90, 85, 80] },
          nrfr: { name: "nrfr", values: [7, 7, 7, 7, 7] },
        },
      }),
    );

    await expect(
      runtime.simulateStandardRun({
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["nrfr"],
      }),
    ).resolves.toEqual({
      year_min: 1900,
      year_max: 1902,
      dt: 1,
      time: [1900, 1901, 1902],
      constants_used: { nri: 100 },
      series: {
        nrfr: { name: "nrfr", values: [1, 0.9, 0.8] },
      },
    });
  });

  test("derives iopc natively through the runtime projection seam", async () => {
    const runtime = createFixtureBackedRuntime(
      ModelData,
      async () => tables,
      async () => ({
        year_min: 1900,
        year_max: 1902,
        dt: 0.5,
        time: [1900, 1900.5, 1901, 1901.5, 1902],
        constants_used: {},
        series: {
          pop: { name: "pop", values: [10, 12, 14, 16, 18] },
          io: { name: "io", values: [10, 18, 28, 40, 54] },
          iopc: { name: "iopc", values: [99, 99, 99, 99, 99] },
        },
      }),
    );

    await expect(
      runtime.simulateStandardRun({
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["iopc"],
      }),
    ).resolves.toEqual({
      year_min: 1900,
      year_max: 1902,
      dt: 1,
      time: [1900, 1901, 1902],
      constants_used: {},
      series: {
        iopc: { name: "iopc", values: [1, 2, 3] },
      },
    });
  });

  test("derives sopc natively through the runtime projection seam", async () => {
    const runtime = createFixtureBackedRuntime(
      ModelData,
      async () => tables,
      async () => ({
        year_min: 1900,
        year_max: 1902,
        dt: 0.5,
        time: [1900, 1900.5, 1901, 1901.5, 1902],
        constants_used: {},
        series: {
          pop: { name: "pop", values: [10, 12, 14, 16, 18] },
          so: { name: "so", values: [40, 60, 84, 112, 144] },
          sopc: { name: "sopc", values: [99, 99, 99, 99, 99] },
        },
      }),
    );

    await expect(
      runtime.simulateStandardRun({
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["sopc"],
      }),
    ).resolves.toEqual({
      year_min: 1900,
      year_max: 1902,
      dt: 1,
      time: [1900, 1901, 1902],
      constants_used: {},
      series: {
        sopc: { name: "sopc", values: [4, 6, 8] },
      },
    });
  });

  test("derives iopc through the ordered capital seam when same-timestep dependencies are present", async () => {
    const runtime = createFixtureBackedRuntime(
      ModelData,
      async () => tables,
      async () => ({
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
      }),
    );

    await expect(
      runtime.simulateStandardRun({
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["iopc"],
      }),
    ).resolves.toEqual({
      year_min: 1900,
      year_max: 1902,
      dt: 1,
      time: [1900, 1901, 1902],
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
        iopc: {
          name: "iopc",
          values: [5.6, 3.8568311688311696, 2.9158462736956245],
        },
      },
    });
  });

  test("derives nrfr through linked capital and resource native seams", async () => {
    const runtime = createFixtureBackedRuntime(
      ModelData,
      async () => [
        ...tables,
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
      ],
      async () => ({
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
      }),
    );

    await expect(
      runtime.simulateStandardRun({
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["nrfr"],
      }),
    ).resolves.toEqual({
      year_min: 1900,
      year_max: 1902,
      dt: 1,
      time: [1900, 1901, 1902],
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
        nrfr: {
          name: "nrfr",
          values: [1, 0.96, 0.904],
        },
      },
    });
  });

  test("derives iopc through native resource feedback into the capital seam", async () => {
    const runtime = createFixtureBackedRuntime(
      ModelData,
      async () => [
        ...tables,
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
      ],
      async () => ({
        year_min: 1900,
        year_max: 1902,
        dt: 0.5,
        time: [1900, 1900.5, 1901, 1901.5, 1902],
        constants_used: {
          nri: 100,
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
          luf: { name: "luf", values: [2, 2, 2, 2, 2] },
          nr: { name: "nr", values: [100, 90, 80, 59, 38] },
          pop: { name: "pop", values: [10, 12, 14, 16, 18] },
        },
      }),
    );

    await expect(
      runtime.simulateStandardRun({
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["iopc"],
      }),
    ).resolves.toEqual({
      year_min: 1900,
      year_max: 1902,
      dt: 1,
      time: [1900, 1901, 1902],
      constants_used: {
        nri: 100,
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
        iopc: {
          name: "iopc",
          values: [7, 2.9211348464619493, 0.18560842240895634],
        },
      },
    });
  });

  test("derives le through the native population seam", async () => {
    const runtime = createFixtureBackedRuntime(
      ModelData,
      async () => [
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
      async () => ({
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
      }),
    );

    await expect(
      runtime.simulateStandardRun({
        year_min: 1900,
        year_max: 1902,
        dt: 1,
        output_variables: ["le"],
      }),
    ).resolves.toEqual({
      year_min: 1900,
      year_max: 1902,
      dt: 1,
      time: [1900, 1901, 1902],
      constants_used: {
        len: 28,
        sfpc: 230,
        hsid: 20,
        iphst: 1940,
      },
      series: {
        le: {
          name: "le",
          values: [27.972, 29.079232, 30.185568],
        },
      },
    });
  });

  test("derives the native population mortality family through the browser seam", async () => {
    const runtime = createFixtureBackedRuntime(
      ModelData,
      async () => [
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
      async () => ({
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
      }),
    );

    const result = await runtime.simulateStandardRun({
      year_min: 1900,
      year_max: 1902,
      dt: 1,
      output_variables: ["m1", "m2", "m3", "m4"],
    });

    expect(result.year_min).toBe(1900);
    expect(result.year_max).toBe(1902);
    expect(result.dt).toBe(1);
    expect(result.time).toEqual([1900, 1901, 1902]);
    expect(result.constants_used).toEqual({
      len: 28,
      sfpc: 230,
      hsid: 20,
      iphst: 1940,
    });
    const mortalityExpectations = {
      m1: [0.034056, 0.031841536, 0.029628864],
      m2: [0.022028, 0.020920768, 0.019814432],
      m3: [0.044056, 0.041841536, 0.039628864],
      m4: [0.104056, 0.101841536, 0.099628864],
    } as const;

    for (const [variable, expected] of Object.entries(mortalityExpectations)) {
      const series = result.series[variable];
      expect(series?.name).toBe(variable);
      expect(series?.values[0]).toBeCloseTo(expected[0], 8);
      expect(series?.values[1]).toBeCloseTo(expected[1], 8);
      expect(series?.values[2]).toBeCloseTo(expected[2], 8);
    }
  });

  test("derives the native population death path through the browser seam", async () => {
    const runtime = createFixtureBackedRuntime(
      ModelData,
      async () => [
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
      async () => ({
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
          p1: { name: "p1", values: [1, 1.5, 2, 2.5, 3] },
          p2: { name: "p2", values: [2, 2.5, 3, 3.5, 4] },
          p3: { name: "p3", values: [3, 3.5, 4, 4.5, 5] },
          p4: { name: "p4", values: [4, 4.5, 5, 5.5, 6] },
          fpc: { name: "fpc", values: [230, 253, 276, 299, 322] },
          iopc: { name: "iopc", values: [10, 10, 10, 10, 10] },
          sopc: { name: "sopc", values: [10, 10, 10, 10, 10] },
          ppolx: { name: "ppolx", values: [1, 1, 1, 1, 1] },
        },
      }),
    );

    const result = await runtime.simulateStandardRun({
      year_min: 1900,
      year_max: 1902,
      dt: 1,
      output_variables: ["d1", "d2", "d3", "d4", "d", "cdr"],
    });

    const deathExpectations = {
      d1: [0.034056, 0.063683072, 0.088886592],
      d2: [0.044056, 0.062762304, 0.079257728],
      d3: [0.132168, 0.167366144, 0.19814432],
      d4: [0.416224, 0.50920768, 0.597773184],
      d: [0.626504, 0.8030192, 0.964061824],
      cdr: [62.6504, 57.35851428571429, 53.55899022222223],
    } as const;

    for (const [variable, expected] of Object.entries(deathExpectations)) {
      const series = result.series[variable];
      expect(series?.name).toBe(variable);
      expect(series?.values[0]).toBeCloseTo(expected[0], 8);
      expect(series?.values[1]).toBeCloseTo(expected[1], 8);
      expect(series?.values[2]).toBeCloseTo(expected[2], 8);
    }
  });

  test("derives the native population stock path through the browser seam", async () => {
    const runtime = createFixtureBackedRuntime(
      ModelData,
      async () => [
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
      async () => ({
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
          p1: { name: "p1", values: [1, 1.5, 2, 2.5, 3] },
          p2: { name: "p2", values: [2, 2.5, 3, 3.5, 4] },
          p3: { name: "p3", values: [3, 3.5, 4, 4.5, 5] },
          p4: { name: "p4", values: [4, 4.5, 5, 5.5, 6] },
          fpc: { name: "fpc", values: [230, 253, 276, 299, 322] },
          iopc: { name: "iopc", values: [10, 10, 10, 10, 10] },
          sopc: { name: "sopc", values: [10, 10, 10, 10, 10] },
          ppolx: { name: "ppolx", values: [1, 1, 1, 1, 1] },
        },
      }),
    );

    const result = await runtime.simulateStandardRun({
      year_min: 1900,
      year_max: 1902,
      dt: 1,
      output_variables: ["p2", "p3", "p4", "pop"],
    });

    const expectations = {
      p2: [2, 1.9551421333333334, 1.9235597013333333],
      p3: [3, 2.7896385333333334, 2.5285486197333336],
      p4: [4, 3.7271676, 3.4095916128],
      pop: [10, 10.471948266666666, 10.861699933866667],
    } as const;

    for (const [variable, expected] of Object.entries(expectations)) {
      const series = result.series[variable];
      expect(series?.name).toBe(variable);
      expect(series?.values[0]).toBeCloseTo(expected[0], 6);
      expect(series?.values[1]).toBeCloseTo(expected[1], 6);
      expect(series?.values[2]).toBeCloseTo(expected[2], 6);
    }
  });

  test("derives the native birth path through the browser seam", async () => {
    const runtime = createFixtureBackedRuntime(
      ModelData,
      async () => [
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
        {
          sector: "Population",
          "x.name": "LE",
          "x.values": [20, 30, 40],
          "y.name": "FM",
          "y.values": [0.4, 0.8, 1.0],
        },
        {
          sector: "Population",
          "x.name": "PLE",
          "x.values": [20, 30, 40],
          "y.name": "CMPLE",
          "y.values": [1.6, 1.4, 1.2],
        },
        {
          sector: "Population",
          "x.name": "DIOPC",
          "x.values": [0, 5, 10],
          "y.name": "SFSN",
          "y.values": [1.1, 0.8, 0.6],
        },
        {
          sector: "Population",
          "x.name": "FIE",
          "x.values": [-0.2, 0, 0.2],
          "y.name": "FRSN",
          "y.values": [0.6, 0.8, 1.0],
        },
        {
          sector: "Population",
          "x.name": "FCFPC",
          "x.values": [0, 1, 2],
          "y.name": "FCE_TOCLIP",
          "y.values": [0.8, 0.9, 1.0],
        },
        {
          sector: "Population",
          "x.name": "NFC",
          "x.values": [0, 2, 4],
          "y.name": "FSAFC",
          "y.values": [0, 0.01, 0.02],
        },
      ],
      async () => ({
        year_min: 1900,
        year_max: 1902,
        dt: 0.5,
        time: [1900, 1900.5, 1901, 1901.5, 1902],
        constants_used: {
          dcfsn: 3.8,
          fcest: 4000,
          hsid: 20,
          ieat: 3,
          iphst: 1940,
          len: 28,
          lpd: 20,
          mtfn: 12,
          pet: 4000,
          rlt: 30,
          sad: 20,
          sfpc: 230,
          zpgt: 4000,
        },
        series: {
          pop: { name: "pop", values: [10, 12, 14, 16, 18] },
          p1: { name: "p1", values: [1, 1.5, 2, 2.5, 3] },
          p2: { name: "p2", values: [2, 2.5, 3, 3.5, 4] },
          p3: { name: "p3", values: [3, 3.5, 4, 4.5, 5] },
          p4: { name: "p4", values: [4, 4.5, 5, 5.5, 6] },
          fpc: { name: "fpc", values: [230, 253, 276, 299, 322] },
          iopc: { name: "iopc", values: [10, 10, 10, 10, 10] },
          sopc: { name: "sopc", values: [10, 10, 10, 10, 10] },
          ppolx: { name: "ppolx", values: [1, 1, 1, 1, 1] },
        },
      }),
    );

    const result = await runtime.simulateStandardRun({
      year_min: 1900,
      year_max: 1902,
      dt: 1,
      output_variables: ["p1", "b", "cbr", "tf", "pop"],
    });

    const expectations = {
      p1: [1, 1.0194037470997106, 0.9354030535095691],
      b: [0.12529654709971055, 0.1257180733431918, 0.12654756393802175],
      cbr: [12.529654709971055, 13.246280731923632, 14.387989823808349],
      tf: [3.7588964129913167, 3.859123726903247, 3.950871070251402],
      pop: [10, 9.49082054709971, 8.795360956442902],
    } as const;

    for (const [variable, expected] of Object.entries(expectations)) {
      const series = result.series[variable];
      expect(series?.name).toBe(variable);
      expect(series?.values[0]).toBeCloseTo(expected[0], 6);
      expect(series?.values[1]).toBeCloseTo(expected[1], 6);
      expect(series?.values[2]).toBeCloseTo(expected[2], 6);
    }
  });
});
