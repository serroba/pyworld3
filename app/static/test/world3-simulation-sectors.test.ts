import { describe, expect, test } from "vitest";

import {
  advanceStateStocks,
  computePopulationLeadingStep,
  computeResourceStep,
  type World3SimulationBuffers,
  type World3SimulationConstants,
  type World3SimulationIntegrators,
  type World3SimulationLookups,
} from "../ts/core/world3-simulation-sectors.ts";

function createBuffers(length = 2): World3SimulationBuffers {
  const make = () => new Float64Array(length);
  return {
    p1: make(), p2: make(), p3: make(), p4: make(), pop: make(), fpu: make(), lmhs: make(),
    d: make(), cdr: make(), sfsn: make(), cmple: make(), fce: make(), cbr: make(), cuf: make(),
    ic: make(), icdr: make(), sc: make(), scdr: make(), so: make(), sopc: make(), pjss: make(),
    lf: make(), al: make(), pal: make(), uil: make(), lfert: make(), aiph: make(), falm: make(),
    ppol: make(), ppolx: make(), ppgao: make(), ppapr: make(), ppasr: make(), nr: make(), nrfr: make(),
    fcaor: make(), hsapc: make(), io: make(), iopc: make(), fioac: make(), fioas: make(), scir: make(),
    pjis: make(), pjas: make(), j: make(), luf: make(), ifpc: make(), lymap: make(), lfd: make(),
    ly: make(), llmy: make(), lrui: make(), lfr: make(), nrur: make(), lmc: make(), dcfs: make(),
    dtf: make(), f: make(), fpc: make(), fioaa: make(), tai: make(), ldr: make(), cai: make(), fr: make(),
    ler: make(), ppgr: make(), le: make(), m1: make(), m2: make(), m3: make(), m4: make(), mat1: make(),
    mat2: make(), mat3: make(), d1: make(), d2: make(), d3: make(), d4: make(), fcapc: make(), tf: make(),
    b: make(), fioai: make(), icir: make(), pfr: make(), ai: make(), mtf: make(),
  };
}

function createConstants(): World3SimulationConstants {
  return {
    p1i: 10, p2i: 20, p3i: 30, p4i: 40,
    ici: 50, sci: 60,
    ali: 70, pali: 80, uili: 90,
    lferti: 100, ppoli: 110, nri: 120,
    alic1: 14, alic2: 15, icor1: 3, icor2: 4, alsc1: 20, alsc2: 21, scor1: 1, scor2: 2,
    lfpf: 0.75, palt: 1000, alai1: 2, alai2: 3, ppol70: 25, fipm: 0.1, amti: 1,
    ppgf1: 1, ppgf2: 2, pptd1: 20, pptd2: 30, ahl70: 1.5, nruf1: 0.5, nruf2: 0.25,
    fioac1: 0.43, fioac2: 0.5, iopcd: 100, iet: 4000, fcest: 4000,
    hsid: 20, ieat: 3, lpd: 20, sad: 20, lufdt: 2, fspd: 2, dcfsn: 4, zpgt: 4000, mtfn: 12,
    rlt: 30, pet: 4000, len: 28, lfh: 1, pl: 0, sfpc: 230, sd: 0.07, ilf: 600, alln: 6000,
    frpm: 0.02, imef: 0.1, imti: 10, io70: 790000000000, lyf1: 1, lyf2: 1, uildt: 10,
  };
}

function createLookups(): World3SimulationLookups {
  const one = () => 1;
  const identity = (x: number) => x;
  return {
    FPU: identity, LMF: identity, HSAPC: identity, LMHS1: identity, LMHS2: (x) => x + 1,
    CMI: identity, LMP: identity, M1: one, M2: one, M3: one, M4: one, FM: one, CMPLE: identity,
    SFSN: identity, FRSN: identity, FCE_TOCLIP: identity, FSAFC: identity, FIOACV: identity,
    ISOPC1: identity, ISOPC2: identity, FIOAS1: identity, FIOAS2: identity, JPICU: identity,
    JPSCU: identity, JPH: identity, CUF: identity, IFPC1: identity, IFPC2: identity,
    FIOAA1: identity, FIOAA2: identity, DCPH: identity, LYMC: identity, LYMAP1: identity,
    LYMAP2: identity, FIALD: identity, MLYMC: identity, LLMY1: identity, LLMY2: identity,
    UILPC: identity, LFDR: identity, LFRT: identity, FALM: identity, AHLM: identity,
    FCAOR1: identity, FCAOR2: (x) => x + 1, PCRUM: identity,
  };
}

function createIntegrators(): World3SimulationIntegrators {
  return {
    smooth_hsapc: { step: () => 2 } as unknown as World3SimulationIntegrators["smooth_hsapc"],
    smooth_iopc: { step: () => 4 } as unknown as World3SimulationIntegrators["smooth_iopc"],
    dlinf3_le: { step: () => 5 } as unknown as World3SimulationIntegrators["dlinf3_le"],
    dlinf3_iopc: { step: () => 6 } as unknown as World3SimulationIntegrators["dlinf3_iopc"],
    dlinf3_fcapc: { step: () => 7 } as unknown as World3SimulationIntegrators["dlinf3_fcapc"],
    smooth_luf: { step: () => 8 } as unknown as World3SimulationIntegrators["smooth_luf"],
    smooth_cai: { step: () => 9 } as unknown as World3SimulationIntegrators["smooth_cai"],
    smooth_fr: { step: () => 10 } as unknown as World3SimulationIntegrators["smooth_fr"],
    delay3_ppgr: { step: () => 11 } as unknown as World3SimulationIntegrators["delay3_ppgr"],
  };
}

describe("world3 simulation sector helpers", () => {
  test("initializes stock state at k=0", () => {
    const buffers = createBuffers();
    advanceStateStocks(0, 0.5, buffers, createConstants());

    expect(buffers.p1[0]).toBe(10);
    expect(buffers.ic[0]).toBe(50);
    expect(buffers.nr[0]).toBe(120);
    expect(buffers.pop[0]).toBe(100);
  });

  test("advances stock state from prior timestep when k>0", () => {
    const buffers = createBuffers();
    const constants = createConstants();
    buffers.p1[0] = 10;
    buffers.p2[0] = 20;
    buffers.p3[0] = 30;
    buffers.p4[0] = 40;
    buffers.b[0] = 2;
    buffers.d1[0] = 1;
    buffers.mat1[0] = 1;
    buffers.mat2[0] = 2;
    buffers.mat3[0] = 3;
    buffers.d2[0] = 1;
    buffers.d3[0] = 1;
    buffers.d4[0] = 1;
    buffers.ic[0] = 50;
    buffers.icir[0] = 10;
    buffers.icdr[0] = 5;
    buffers.sc[0] = 60;
    buffers.scir[0] = 8;
    buffers.scdr[0] = 3;
    buffers.al[0] = 70;
    buffers.ldr[0] = 4;
    buffers.ler[0] = 2;
    buffers.lrui[0] = 1;
    buffers.pal[0] = 80;
    buffers.uil[0] = 90;
    buffers.lfert[0] = 100;
    buffers.lfr[0] = 3;
    buffers.lfd[0] = 1;
    buffers.ppol[0] = 110;
    buffers.ppapr[0] = 7;
    buffers.ppasr[0] = 2;
    buffers.nr[0] = 120;
    buffers.nrur[0] = 4;

    advanceStateStocks(1, 0.5, buffers, constants);

    expect(buffers.p1[1]).toBeCloseTo(10);
    expect(buffers.ic[1]).toBeCloseTo(52.5);
    expect(buffers.al[1]).toBeCloseTo(70.5);
    expect(buffers.pop[1]).toBeCloseTo(buffers.p1[1]! + buffers.p2[1]! + buffers.p3[1]! + buffers.p4[1]!);
  });

  test("uses policy-year branching in population leading and resource helpers", () => {
    const buffers = createBuffers();
    const constants = createConstants();
    const lookups = createLookups();
    const integrators = createIntegrators();
    buffers.pop[0] = 100;
    buffers.d1[0] = 1;
    buffers.d2[0] = 2;
    buffers.d3[0] = 3;
    buffers.d4[0] = 4;
    buffers.b[0] = 5;
    buffers.nr[0] = 60;

    computePopulationLeadingStep(0, 1930, buffers, constants, lookups, integrators, 1940);
    expect(buffers.lmhs[0]).toBe(2);
    expect(buffers.cbr[0]).toBe(0);

    computePopulationLeadingStep(1, 1950, buffers, constants, lookups, integrators, 1940);
    expect(buffers.lmhs[1]).toBe(3);

    computeResourceStep(0, 1970, buffers, constants, lookups, 1975);
    expect(buffers.nrfr[0]).toBeCloseTo(0.5);
    expect(buffers.fcaor[0]).toBeCloseTo(0.5);

    buffers.nr[1] = 60;
    computeResourceStep(1, 1980, buffers, constants, lookups, 1975);
    expect(buffers.fcaor[1]).toBeCloseTo(1.5);
  });
});
