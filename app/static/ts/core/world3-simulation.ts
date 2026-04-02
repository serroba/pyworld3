/**
 * Fully coupled World3 simulation engine.
 *
 * Implements the complete World3 model as a single coupled simulation loop
 * with all feedback loops closed, using Euler integration.
 *
 * The computation order follows the DYNAMO model equations.
 */

import type { ConstantMap, SimulationResult } from "../simulation-contracts.js";
import type { World3ConstantKey } from "./world3-keys.js";
import { createTimeGrid, createSeriesBuffer, Smooth, Delay3, Dlinf3 } from "./runtime-primitives.js";
import { type LookupInterpolator, type RawLookupTable, createLookupLibrary } from "./world3-tables.js";
import {
  advanceStateStocks,
  computeAgricultureStep,
  computeCapitalStep,
  computeCrossSectorStep,
  computeMortalityAndBirthStep,
  computePollutionStep,
  computePopulationFeedbackStep,
  computePopulationLeadingStep,
  computeResourceStep,
  type World3SimulationBuffers,
  type World3SimulationConstants,
  type World3SimulationIntegrators,
  type World3LookupName,
  type World3SimulationLookups,
} from "./world3-simulation-sectors.js";
import { buildWorld3SeriesResult } from "./world3-registry.js";

type LookupFn = (x: number) => number;

function requireLookup(lib: Map<string, LookupInterpolator>, name: World3LookupName): LookupFn {
  const entry = lib.get(name);
  if (!entry) {
    throw new Error(`Missing lookup table: ${name}`);
  }
  return entry.evaluate;
}

function c(constants: ConstantMap, name: World3ConstantKey): number {
  const val = constants[name];
  if (val === undefined) {
    throw new Error(`Missing constant: ${name}`);
  }
  return val;
}

export type World3SimulationOptions = {
  yearMin?: number;
  yearMax?: number;
  dt?: number;
  pyear?: number;
  iphst?: number;
  constants?: ConstantMap;
  rawTables: RawLookupTable[];
};

export function simulateWorld3(options: World3SimulationOptions): SimulationResult {
  /* v8 ignore next 3 -- trivial defaults */
  const requestedYearMin = options.yearMin ?? 1900;
  const requestedYearMax = options.yearMax ?? 2100;
  const requestedDt = options.dt ?? 0.5;
  const pyear = options.pyear ?? 1975;
  const iphst = options.iphst ?? 1940;

  // Validate and clamp inputs to safe ranges
  const yearMax = Math.max(1950, Math.min(requestedYearMax, 2300));
  const dt = Math.max(0.1, Math.min(requestedDt, 2));
  const clampedYearMin = Math.max(1900, Math.min(requestedYearMin, yearMax - dt));

  // Always simulate from 1900 so initial conditions are properly computed,
  // then trim the output to the requested yearMin.
  const simYearMin = 1900;
  const time = createTimeGrid(simYearMin, yearMax, dt);
  const N = time.length;
  const lookupLib = createLookupLibrary(options.rawTables);

  const lookups: World3SimulationLookups = {
    FPU: requireLookup(lookupLib, "FPU"),
    LMF: requireLookup(lookupLib, "LMF"),
    HSAPC: requireLookup(lookupLib, "HSAPC"),
    LMHS1: requireLookup(lookupLib, "LMHS1"),
    LMHS2: requireLookup(lookupLib, "LMHS2"),
    CMI: requireLookup(lookupLib, "CMI"),
    LMP: requireLookup(lookupLib, "LMP"),
    M1: requireLookup(lookupLib, "M1"),
    M2: requireLookup(lookupLib, "M2"),
    M3: requireLookup(lookupLib, "M3"),
    M4: requireLookup(lookupLib, "M4"),
    FM: requireLookup(lookupLib, "FM"),
    CMPLE: requireLookup(lookupLib, "CMPLE"),
    SFSN: requireLookup(lookupLib, "SFSN"),
    FRSN: requireLookup(lookupLib, "FRSN"),
    FCE_TOCLIP: requireLookup(lookupLib, "FCE_TOCLIP"),
    FSAFC: requireLookup(lookupLib, "FSAFC"),
    FIOACV: requireLookup(lookupLib, "FIOACV"),
    ISOPC1: requireLookup(lookupLib, "ISOPC1"),
    ISOPC2: requireLookup(lookupLib, "ISOPC2"),
    FIOAS1: requireLookup(lookupLib, "FIOAS1"),
    FIOAS2: requireLookup(lookupLib, "FIOAS2"),
    JPICU: requireLookup(lookupLib, "JPICU"),
    JPSCU: requireLookup(lookupLib, "JPSCU"),
    JPH: requireLookup(lookupLib, "JPH"),
    CUF: requireLookup(lookupLib, "CUF"),
    IFPC1: requireLookup(lookupLib, "IFPC1"),
    IFPC2: requireLookup(lookupLib, "IFPC2"),
    FIOAA1: requireLookup(lookupLib, "FIOAA1"),
    FIOAA2: requireLookup(lookupLib, "FIOAA2"),
    DCPH: requireLookup(lookupLib, "DCPH"),
    LYMC: requireLookup(lookupLib, "LYMC"),
    LYMAP1: requireLookup(lookupLib, "LYMAP1"),
    LYMAP2: requireLookup(lookupLib, "LYMAP2"),
    FIALD: requireLookup(lookupLib, "FIALD"),
    MLYMC: requireLookup(lookupLib, "MLYMC"),
    LLMY1: requireLookup(lookupLib, "LLMY1"),
    LLMY2: requireLookup(lookupLib, "LLMY2"),
    UILPC: requireLookup(lookupLib, "UILPC"),
    LFDR: requireLookup(lookupLib, "LFDR"),
    LFRT: requireLookup(lookupLib, "LFRT"),
    FALM: requireLookup(lookupLib, "FALM"),
    AHLM: requireLookup(lookupLib, "AHLM"),
    FCAOR1: requireLookup(lookupLib, "FCAOR1"),
    FCAOR2: requireLookup(lookupLib, "FCAOR2"),
    PCRUM: requireLookup(lookupLib, "PCRUM"),
  };

  const consts = options.constants ?? /* v8 ignore next */ {};
  const constants: World3SimulationConstants = {
    p1i: c(consts, "p1i"),
    p2i: c(consts, "p2i"),
    p3i: c(consts, "p3i"),
    p4i: c(consts, "p4i"),
    ici: c(consts, "ici"),
    sci: c(consts, "sci"),
    ali: c(consts, "ali"),
    pali: c(consts, "pali"),
    uili: c(consts, "uili"),
    lferti: c(consts, "lferti"),
    ppoli: c(consts, "ppoli"),
    nri: c(consts, "nri"),
    alic1: c(consts, "alic1"),
    alic2: c(consts, "alic2"),
    icor1: c(consts, "icor1"),
    icor2: c(consts, "icor2"),
    alsc1: c(consts, "alsc1"),
    alsc2: c(consts, "alsc2"),
    scor1: c(consts, "scor1"),
    scor2: c(consts, "scor2"),
    lfpf: c(consts, "lfpf"),
    palt: c(consts, "palt"),
    alai1: c(consts, "alai1"),
    alai2: c(consts, "alai2"),
    ppol70: c(consts, "ppol70"),
    fipm: c(consts, "fipm"),
    amti: c(consts, "amti"),
    ppgf1: c(consts, "ppgf1"),
    ppgf2: c(consts, "ppgf2"),
    ppgf21: c(consts, "ppgf21"),
    pptd1: c(consts, "pptd1"),
    pptd2: c(consts, "pptd2"),
    ahl70: c(consts, "ahl70"),
    nruf1: c(consts, "nruf1"),
    nruf2: c(consts, "nruf2"),
    fioac1: c(consts, "fioac1"),
    fioac2: c(consts, "fioac2"),
    iopcd: c(consts, "iopcd"),
    iet: c(consts, "iet"),
    fcest: c(consts, "fcest"),
    hsid: c(consts, "hsid"),
    ieat: c(consts, "ieat"),
    lpd: c(consts, "lpd"),
    sad: c(consts, "sad"),
    lufdt: c(consts, "lufdt"),
    fspd: c(consts, "fspd"),
    dcfsn: c(consts, "dcfsn"),
    zpgt: c(consts, "zpgt"),
    mtfn: c(consts, "mtfn"),
    rlt: c(consts, "rlt"),
    pet: c(consts, "pet"),
    len: c(consts, "len"),
    lfh: c(consts, "lfh"),
    pl: c(consts, "pl"),
    sfpc: c(consts, "sfpc"),
    sd: c(consts, "sd"),
    ilf: c(consts, "ilf"),
    alln: c(consts, "alln"),
    frpm: c(consts, "frpm"),
    imef: c(consts, "imef"),
    imti: c(consts, "imti"),
    io70: c(consts, "io70"),
    lyf1: c(consts, "lyf1"),
    lyf2: c(consts, "lyf2"),
    uildt: c(consts, "uildt"),
  };

  // Allocate all buffers
  const p1 = createSeriesBuffer(N), p2 = createSeriesBuffer(N);
  const p3 = createSeriesBuffer(N), p4 = createSeriesBuffer(N);
  const pop = createSeriesBuffer(N), fpu = createSeriesBuffer(N);
  const lmhs = createSeriesBuffer(N), d = createSeriesBuffer(N);
  const cdr = createSeriesBuffer(N), sfsn = createSeriesBuffer(N);
  const cmple = createSeriesBuffer(N), fce = createSeriesBuffer(N);
  const cbr = createSeriesBuffer(N), cuf_arr = createSeriesBuffer(N);
  const ic = createSeriesBuffer(N), icdr = createSeriesBuffer(N);
  const sc = createSeriesBuffer(N), scdr = createSeriesBuffer(N);
  const so = createSeriesBuffer(N), sopc = createSeriesBuffer(N);
  const pjss = createSeriesBuffer(N), lf = createSeriesBuffer(N);
  const al = createSeriesBuffer(N), pal = createSeriesBuffer(N);
  const uil = createSeriesBuffer(N), lfert = createSeriesBuffer(N);
  const aiph = createSeriesBuffer(N), falm_arr = createSeriesBuffer(N);
  const ppol = createSeriesBuffer(N), ppolx = createSeriesBuffer(N);
  const ppgao = createSeriesBuffer(N), ppapr = createSeriesBuffer(N);
  const ppasr = createSeriesBuffer(N);
  const nr = createSeriesBuffer(N), nrfr = createSeriesBuffer(N);
  const fcaor = createSeriesBuffer(N);
  const hsapc_arr = createSeriesBuffer(N), io = createSeriesBuffer(N);
  const iopc = createSeriesBuffer(N), fioac = createSeriesBuffer(N);
  const fioas = createSeriesBuffer(N), scir = createSeriesBuffer(N);
  const pjis = createSeriesBuffer(N), pjas = createSeriesBuffer(N);
  const j = createSeriesBuffer(N), luf = createSeriesBuffer(N);
  const ifpc = createSeriesBuffer(N), lymap = createSeriesBuffer(N);
  const lfd = createSeriesBuffer(N), ly = createSeriesBuffer(N);
  const llmy = createSeriesBuffer(N), lrui = createSeriesBuffer(N);
  const lfr = createSeriesBuffer(N), nrur = createSeriesBuffer(N);
  const lmc = createSeriesBuffer(N), dcfs = createSeriesBuffer(N);
  const dtf = createSeriesBuffer(N), f = createSeriesBuffer(N);
  const fpc = createSeriesBuffer(N), fioaa = createSeriesBuffer(N);
  const tai = createSeriesBuffer(N), ldr = createSeriesBuffer(N);
  const cai = createSeriesBuffer(N), fr = createSeriesBuffer(N);
  const ler = createSeriesBuffer(N), ppgr = createSeriesBuffer(N);
  const le = createSeriesBuffer(N);
  const m1 = createSeriesBuffer(N), m2 = createSeriesBuffer(N);
  const m3 = createSeriesBuffer(N), m4 = createSeriesBuffer(N);
  const mat1 = createSeriesBuffer(N), mat2 = createSeriesBuffer(N), mat3 = createSeriesBuffer(N);
  const d1 = createSeriesBuffer(N), d2 = createSeriesBuffer(N);
  const d3 = createSeriesBuffer(N), d4 = createSeriesBuffer(N);
  const fcapc = createSeriesBuffer(N), tf = createSeriesBuffer(N);
  const b = createSeriesBuffer(N), fioai = createSeriesBuffer(N);
  const icir = createSeriesBuffer(N), pfr = createSeriesBuffer(N);
  const ai = createSeriesBuffer(N), mtf = createSeriesBuffer(N);

  const buffers: World3SimulationBuffers = {
    p1, p2, p3, p4, pop, fpu, lmhs, d, cdr, sfsn, cmple, fce, cbr, cuf: cuf_arr,
    ic, icdr, sc, scdr, so, sopc, pjss, lf, al, pal, uil, lfert, aiph, falm: falm_arr,
    ppol, ppolx, ppgao, ppapr, ppasr, nr, nrfr, fcaor, hsapc: hsapc_arr, io, iopc,
    fioac, fioas, scir, pjis, pjas, j, luf, ifpc, lymap, lfd, ly, llmy, lrui, lfr,
    nrur, lmc, dcfs, dtf, f, fpc, fioaa, tai, ldr, cai, fr, ler, ppgr, le, m1, m2,
    m3, m4, mat1, mat2, mat3, d1, d2, d3, d4, fcapc, tf, b, fioai, icir, pfr, ai, mtf,
  };

  // Smooth/Delay objects
  const smooth_hsapc = new Smooth(hsapc_arr, dt, N);
  const smooth_iopc = new Smooth(iopc, dt, N);
  const dlinf3_le = new Dlinf3(le, dt, N);
  const dlinf3_iopc = new Dlinf3(iopc, dt, N);
  const dlinf3_fcapc = new Dlinf3(fcapc, dt, N);
  const smooth_luf = new Smooth(luf, dt, N);
  const smooth_cai = new Smooth(cai, dt, N);
  const smooth_fr = new Smooth(fr, dt, N);
  const delay3_ppgr = new Delay3(ppgr, dt, N);

  const integrators: World3SimulationIntegrators = {
    smooth_hsapc,
    smooth_iopc,
    dlinf3_le,
    dlinf3_iopc,
    dlinf3_fcapc,
    smooth_luf,
    smooth_cai,
    smooth_fr,
    delay3_ppgr,
  };

  // Core computation for one timestep
  function computeStep(k: number): void {
    const t = time[k]!;
    advanceStateStocks(k, dt, buffers, constants);
    const populationLeading = computePopulationLeadingStep(
      k,
      t,
      buffers,
      constants,
      lookups,
      integrators,
      iphst,
    );
    computeCapitalStep(k, t, buffers, constants, lookups, integrators, pyear);
    computeAgricultureStep(k, t, buffers, constants, lookups, integrators, pyear);
    computePollutionStep(k, t, buffers, constants, lookups, integrators, pyear);
    computeResourceStep(k, t, buffers, constants, lookups, pyear);
    const crossSectorState = computeCrossSectorStep(k, t, buffers, constants, lookups, pyear);
    computePopulationFeedbackStep(
      k,
      t,
      buffers,
      constants,
      lookups,
      populationLeading,
      crossSectorState,
      pyear,
    );
    computeMortalityAndBirthStep(k, t, buffers, constants, lookups);
  }

  // k=0: iterate to converge circular dependencies at initialization.
  for (let pass = 0; pass < 5; pass++) {
    computeStep(0);
  }

  // Main simulation loop
  for (let k = 1; k < N; k++) {
    computeStep(k);
  }

  // Build result — trim to requested yearMin
  const fullTime = Array.from(time);
  const fullSeries = buildWorld3SeriesResult(buffers);

  // Find the first index at or after the requested start year
  const trimIndex = clampedYearMin <= simYearMin ? 0 : fullTime.findIndex(t => t >= clampedYearMin);
  const startIdx = trimIndex >= 0 ? trimIndex : 0;

  const trimmedTime = fullTime.slice(startIdx);
  const trimmedSeries: typeof fullSeries = {} as typeof fullSeries;
  for (const [key, entry] of Object.entries(fullSeries)) {
    trimmedSeries[key as keyof typeof fullSeries] = {
      ...entry,
      values: entry.values.slice(startIdx),
    };
  }

  return {
    year_min: clampedYearMin,
    year_max: yearMax,
    dt,
    time: trimmedTime,
    constants_used: { ...consts },
    series: trimmedSeries,
  };
}
