import { describe, expect, test } from "vitest";

import { ModelData } from "../ts/model-data.ts";
import {
  buildWorld3SeriesResult,
  WORLD3_SERIES_REGISTRY,
} from "../ts/core/world3-registry.ts";
import type { World3SimulationBuffers } from "../ts/core/world3-simulation-sectors.ts";

function createBuffers(length: number): World3SimulationBuffers {
  const makeSeries = () => new Float64Array(length);
  return {
    p1: makeSeries(),
    p2: makeSeries(),
    p3: makeSeries(),
    p4: makeSeries(),
    pop: makeSeries(),
    fpu: makeSeries(),
    lmhs: makeSeries(),
    d: makeSeries(),
    cdr: makeSeries(),
    sfsn: makeSeries(),
    cmple: makeSeries(),
    fce: makeSeries(),
    cbr: makeSeries(),
    cuf: makeSeries(),
    ic: makeSeries(),
    icdr: makeSeries(),
    sc: makeSeries(),
    scdr: makeSeries(),
    so: makeSeries(),
    sopc: makeSeries(),
    pjss: makeSeries(),
    lf: makeSeries(),
    al: makeSeries(),
    pal: makeSeries(),
    uil: makeSeries(),
    lfert: makeSeries(),
    aiph: makeSeries(),
    falm: makeSeries(),
    ppol: makeSeries(),
    ppolx: makeSeries(),
    ppgao: makeSeries(),
    ppapr: makeSeries(),
    ppasr: makeSeries(),
    nr: makeSeries(),
    nrfr: makeSeries(),
    fcaor: makeSeries(),
    hsapc: makeSeries(),
    io: makeSeries(),
    iopc: makeSeries(),
    fioac: makeSeries(),
    fioas: makeSeries(),
    scir: makeSeries(),
    pjis: makeSeries(),
    pjas: makeSeries(),
    j: makeSeries(),
    luf: makeSeries(),
    ifpc: makeSeries(),
    lymap: makeSeries(),
    lfd: makeSeries(),
    ly: makeSeries(),
    llmy: makeSeries(),
    lrui: makeSeries(),
    lfr: makeSeries(),
    nrur: makeSeries(),
    lmc: makeSeries(),
    dcfs: makeSeries(),
    dtf: makeSeries(),
    f: makeSeries(),
    fpc: makeSeries(),
    fioaa: makeSeries(),
    tai: makeSeries(),
    ldr: makeSeries(),
    cai: makeSeries(),
    fr: makeSeries(),
    ler: makeSeries(),
    ppgr: makeSeries(),
    le: makeSeries(),
    m1: makeSeries(),
    m2: makeSeries(),
    m3: makeSeries(),
    m4: makeSeries(),
    mat1: makeSeries(),
    mat2: makeSeries(),
    mat3: makeSeries(),
    d1: makeSeries(),
    d2: makeSeries(),
    d3: makeSeries(),
    d4: makeSeries(),
    fcapc: makeSeries(),
    tf: makeSeries(),
    b: makeSeries(),
    fioai: makeSeries(),
    icir: makeSeries(),
    pfr: makeSeries(),
    ai: makeSeries(),
    mtf: makeSeries(),
  };
}

describe("World3 registry", () => {
  test("uses unique exported series keys", () => {
    const keys = WORLD3_SERIES_REGISTRY.map((definition) => definition.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("covers all default UI variables", () => {
    const exportedKeys = new Set(WORLD3_SERIES_REGISTRY.map((definition) => definition.key));
    for (const variable of ModelData.defaultVariables) {
      expect(exportedKeys.has(variable as (typeof WORLD3_SERIES_REGISTRY)[number]["key"])).toBe(true);
    }
  });

  test("builds simulation results from the canonical registry", () => {
    const buffers = createBuffers(2);
    buffers.pop[0] = 1;
    buffers.pop[1] = 2;
    buffers.nrfr[0] = 1;
    buffers.nrfr[1] = 0.5;

    const series = buildWorld3SeriesResult(buffers);

    expect(series.pop).toEqual({ name: "pop", values: [1, 2] });
    expect(series.nrfr).toEqual({ name: "nrfr", values: [1, 0.5] });
    expect(Object.keys(series)).toEqual(
      WORLD3_SERIES_REGISTRY.map((definition) => definition.key),
    );
  });
});
