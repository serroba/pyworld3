import type { Smooth, Delay3, Dlinf3 } from "./runtime-primitives.js";

type LookupFn = (x: number) => number;

export type World3SimulationLookups = {
  FPU: LookupFn;
  LMF: LookupFn;
  HSAPC: LookupFn;
  LMHS1: LookupFn;
  LMHS2: LookupFn;
  CMI: LookupFn;
  LMP: LookupFn;
  M1: LookupFn;
  M2: LookupFn;
  M3: LookupFn;
  M4: LookupFn;
  FM: LookupFn;
  CMPLE: LookupFn;
  SFSN: LookupFn;
  FRSN: LookupFn;
  FCE_TOCLIP: LookupFn;
  FSAFC: LookupFn;
  FIOACV: LookupFn;
  ISOPC1: LookupFn;
  ISOPC2: LookupFn;
  FIOAS1: LookupFn;
  FIOAS2: LookupFn;
  JPICU: LookupFn;
  JPSCU: LookupFn;
  JPH: LookupFn;
  CUF: LookupFn;
  IFPC1: LookupFn;
  IFPC2: LookupFn;
  FIOAA1: LookupFn;
  FIOAA2: LookupFn;
  DCPH: LookupFn;
  LYMC: LookupFn;
  LYMAP1: LookupFn;
  LYMAP2: LookupFn;
  FIALD: LookupFn;
  MLYMC: LookupFn;
  LLMY1: LookupFn;
  LLMY2: LookupFn;
  UILPC: LookupFn;
  LFDR: LookupFn;
  LFRT: LookupFn;
  FALM: LookupFn;
  AHLM: LookupFn;
  FCAOR1: LookupFn;
  FCAOR2: LookupFn;
  PCRUM: LookupFn;
};

export type World3SimulationConstants = {
  p1i: number;
  p2i: number;
  p3i: number;
  p4i: number;
  ici: number;
  sci: number;
  ali: number;
  pali: number;
  uili: number;
  lferti: number;
  ppoli: number;
  nri: number;
  alic1: number;
  alic2: number;
  icor1: number;
  icor2: number;
  alsc1: number;
  alsc2: number;
  scor1: number;
  scor2: number;
  lfpf: number;
  palt: number;
  alai1: number;
  alai2: number;
  ppol70: number;
  fipm: number;
  amti: number;
  ppgf1: number;
  ppgf2: number;
  pptd1: number;
  pptd2: number;
  ahl70: number;
  nruf1: number;
  nruf2: number;
  fioac1: number;
  fioac2: number;
  iopcd: number;
  iet: number;
  fcest: number;
  hsid: number;
  ieat: number;
  lpd: number;
  sad: number;
  lufdt: number;
  fspd: number;
  dcfsn: number;
  zpgt: number;
  mtfn: number;
  rlt: number;
  pet: number;
  len: number;
  lfh: number;
  pl: number;
  sfpc: number;
  sd: number;
  ilf: number;
  alln: number;
  frpm: number;
  imef: number;
  imti: number;
  io70: number;
  lyf1: number;
  lyf2: number;
  uildt: number;
};

export type World3SimulationBuffers = {
  p1: Float64Array;
  p2: Float64Array;
  p3: Float64Array;
  p4: Float64Array;
  pop: Float64Array;
  fpu: Float64Array;
  lmhs: Float64Array;
  d: Float64Array;
  cdr: Float64Array;
  sfsn: Float64Array;
  cmple: Float64Array;
  fce: Float64Array;
  cbr: Float64Array;
  cuf: Float64Array;
  ic: Float64Array;
  icdr: Float64Array;
  sc: Float64Array;
  scdr: Float64Array;
  so: Float64Array;
  sopc: Float64Array;
  pjss: Float64Array;
  lf: Float64Array;
  al: Float64Array;
  pal: Float64Array;
  uil: Float64Array;
  lfert: Float64Array;
  aiph: Float64Array;
  falm: Float64Array;
  ppol: Float64Array;
  ppolx: Float64Array;
  ppgao: Float64Array;
  ppapr: Float64Array;
  ppasr: Float64Array;
  nr: Float64Array;
  nrfr: Float64Array;
  fcaor: Float64Array;
  hsapc: Float64Array;
  io: Float64Array;
  iopc: Float64Array;
  fioac: Float64Array;
  fioas: Float64Array;
  scir: Float64Array;
  pjis: Float64Array;
  pjas: Float64Array;
  j: Float64Array;
  luf: Float64Array;
  ifpc: Float64Array;
  lymap: Float64Array;
  lfd: Float64Array;
  ly: Float64Array;
  llmy: Float64Array;
  lrui: Float64Array;
  lfr: Float64Array;
  nrur: Float64Array;
  lmc: Float64Array;
  dcfs: Float64Array;
  dtf: Float64Array;
  f: Float64Array;
  fpc: Float64Array;
  fioaa: Float64Array;
  tai: Float64Array;
  ldr: Float64Array;
  cai: Float64Array;
  fr: Float64Array;
  ler: Float64Array;
  ppgr: Float64Array;
  le: Float64Array;
  m1: Float64Array;
  m2: Float64Array;
  m3: Float64Array;
  m4: Float64Array;
  mat1: Float64Array;
  mat2: Float64Array;
  mat3: Float64Array;
  d1: Float64Array;
  d2: Float64Array;
  d3: Float64Array;
  d4: Float64Array;
  fcapc: Float64Array;
  tf: Float64Array;
  b: Float64Array;
  fioai: Float64Array;
  icir: Float64Array;
  pfr: Float64Array;
  ai: Float64Array;
  mtf: Float64Array;
};

export type World3SimulationIntegrators = {
  smooth_hsapc: Smooth;
  smooth_iopc: Smooth;
  dlinf3_le: Dlinf3;
  dlinf3_iopc: Dlinf3;
  dlinf3_fcapc: Dlinf3;
  smooth_luf: Smooth;
  smooth_cai: Smooth;
  smooth_fr: Smooth;
  delay3_ppgr: Delay3;
};

export type PopulationLeadingState = {
  aiopc: number;
  diopc: number;
};

export type CapitalState = {
  icor: number;
  scor: number;
};

export type AgricultureState = {
  alai: number;
  lymc: number;
  lyf: number;
  lfrt: number;
};

export type PollutionState = {
  ppgf: number;
};

export type ResourceState = {
  nruf: number;
};

export type CrossSectorState = {
  pcrum: number;
};

function clip(ifTrue: number, ifFalse: number, t: number, switchTime: number): number {
  return t > switchTime ? ifTrue : ifFalse;
}

export function advanceStateStocks(
  k: number,
  dt: number,
  buffers: World3SimulationBuffers,
  constants: World3SimulationConstants,
): void {
  if (k === 0) {
    buffers.p1[0] = constants.p1i;
    buffers.p2[0] = constants.p2i;
    buffers.p3[0] = constants.p3i;
    buffers.p4[0] = constants.p4i;
    buffers.ic[0] = constants.ici;
    buffers.sc[0] = constants.sci;
    buffers.al[0] = constants.ali;
    buffers.pal[0] = constants.pali;
    buffers.uil[0] = constants.uili;
    buffers.lfert[0] = constants.lferti;
    buffers.ppol[0] = constants.ppoli;
    buffers.nr[0] = constants.nri;
  } else {
    buffers.p1[k] = buffers.p1[k - 1]! + dt * (buffers.b[k - 1]! - buffers.d1[k - 1]! - buffers.mat1[k - 1]!);
    buffers.p2[k] = buffers.p2[k - 1]! + dt * (buffers.mat1[k - 1]! - buffers.d2[k - 1]! - buffers.mat2[k - 1]!);
    buffers.p3[k] = buffers.p3[k - 1]! + dt * (buffers.mat2[k - 1]! - buffers.d3[k - 1]! - buffers.mat3[k - 1]!);
    buffers.p4[k] = buffers.p4[k - 1]! + dt * (buffers.mat3[k - 1]! - buffers.d4[k - 1]!);
    buffers.ic[k] = buffers.ic[k - 1]! + dt * (buffers.icir[k - 1]! - buffers.icdr[k - 1]!);
    buffers.sc[k] = buffers.sc[k - 1]! + dt * (buffers.scir[k - 1]! - buffers.scdr[k - 1]!);
    buffers.al[k] = buffers.al[k - 1]! + dt * (buffers.ldr[k - 1]! - buffers.ler[k - 1]! - buffers.lrui[k - 1]!);
    buffers.pal[k] = buffers.pal[k - 1]! - dt * buffers.ldr[k - 1]!;
    buffers.uil[k] = buffers.uil[k - 1]! + dt * buffers.lrui[k - 1]!;
    buffers.lfert[k] = buffers.lfert[k - 1]! + dt * (buffers.lfr[k - 1]! - buffers.lfd[k - 1]!);
    buffers.ppol[k] = buffers.ppol[k - 1]! + dt * (buffers.ppapr[k - 1]! - buffers.ppasr[k - 1]!);
    buffers.nr[k] = buffers.nr[k - 1]! - dt * buffers.nrur[k - 1]!;
  }

  buffers.pop[k] = buffers.p1[k]! + buffers.p2[k]! + buffers.p3[k]! + buffers.p4[k]!;
}

export function computePopulationLeadingStep(
  k: number,
  t: number,
  buffers: World3SimulationBuffers,
  constants: World3SimulationConstants,
  lookups: World3SimulationLookups,
  integrators: World3SimulationIntegrators,
  healthPolicyStartYear: number,
): PopulationLeadingState {
  buffers.fpu[k] = lookups.FPU(buffers.pop[k]!);
  const ehspc = integrators.smooth_hsapc.step(k, constants.hsid);
  buffers.lmhs[k] = clip(lookups.LMHS2(ehspc), lookups.LMHS1(ehspc), t, healthPolicyStartYear);
  buffers.d[k] = k === 0 ? 0 : buffers.d1[k - 1]! + buffers.d2[k - 1]! + buffers.d3[k - 1]! + buffers.d4[k - 1]!;
  buffers.cdr[k] = 1000 * buffers.d[k]! / buffers.pop[k]!;

  const aiopc = integrators.smooth_iopc.step(k, constants.ieat);
  const diopc = integrators.dlinf3_iopc.step(k, constants.sad);
  buffers.sfsn[k] = lookups.SFSN(diopc);
  const ple = integrators.dlinf3_le.step(k, constants.lpd);
  buffers.cmple[k] = lookups.CMPLE(ple);
  const fcfpc = integrators.dlinf3_fcapc.step(k, constants.hsid);
  buffers.fce[k] = clip(1.0, lookups.FCE_TOCLIP(fcfpc), t, constants.fcest);
  buffers.cbr[k] = k === 0 ? 0 : 1000 * buffers.b[k - 1]! / buffers.pop[k]!;

  return { aiopc, diopc };
}

export function computeCapitalStep(
  k: number,
  t: number,
  buffers: World3SimulationBuffers,
  constants: World3SimulationConstants,
  lookups: World3SimulationLookups,
  integrators: World3SimulationIntegrators,
  policyYear: number,
): CapitalState {
  const lufd = integrators.smooth_luf.step(k, constants.lufdt);
  buffers.cuf[k] = lookups.CUF(lufd);
  buffers.icdr[k] = buffers.ic[k]! / clip(constants.alic2, constants.alic1, t, policyYear);
  const icor = clip(constants.icor2, constants.icor1, t, policyYear);
  buffers.scdr[k] = buffers.sc[k]! / clip(constants.alsc2, constants.alsc1, t, policyYear);
  const scor = clip(constants.scor2, constants.scor1, t, policyYear);
  buffers.so[k] = buffers.sc[k]! * buffers.cuf[k]! / scor;
  buffers.sopc[k] = buffers.so[k]! / buffers.pop[k]!;
  buffers.pjss[k] = buffers.sc[k]! * lookups.JPSCU(buffers.sopc[k]!);
  buffers.lf[k] = (buffers.p2[k]! + buffers.p3[k]!) * constants.lfpf;
  return { icor, scor };
}

export function computeAgricultureStep(
  k: number,
  t: number,
  buffers: World3SimulationBuffers,
  constants: World3SimulationConstants,
  lookups: World3SimulationLookups,
  integrators: World3SimulationIntegrators,
  policyYear: number,
): AgricultureState {
  const alai = clip(constants.alai2, constants.alai1, t, policyYear);
  buffers.ai[k] = integrators.smooth_cai.step(k, alai);
  buffers.pfr[k] = integrators.smooth_fr.step(k, constants.fspd);
  buffers.falm[k] = lookups.FALM(buffers.pfr[k]!);
  buffers.aiph[k] = buffers.ai[k]! * (1 - buffers.falm[k]!) / buffers.al[k]!;
  const lymc = lookups.LYMC(buffers.aiph[k]!);
  const lyf = clip(constants.lyf2, constants.lyf1, t, policyYear);
  const lfrt = lookups.LFRT(buffers.falm[k]!);
  return { alai, lymc, lyf, lfrt };
}

export function computePollutionStep(
  k: number,
  t: number,
  buffers: World3SimulationBuffers,
  constants: World3SimulationConstants,
  lookups: World3SimulationLookups,
  integrators: World3SimulationIntegrators,
  policyYear: number,
): PollutionState {
  buffers.ppolx[k] = buffers.ppol[k]! / constants.ppol70;
  buffers.ppgao[k] = buffers.aiph[k]! * buffers.al[k]! * constants.fipm * constants.amti;
  const ppgf = clip(constants.ppgf2, constants.ppgf1, t, policyYear);
  const pptd = clip(constants.pptd2, constants.pptd1, t, policyYear);
  buffers.ppapr[k] = integrators.delay3_ppgr.step(k, pptd);
  const ahlm = lookups.AHLM(buffers.ppolx[k]!);
  buffers.ppasr[k] = buffers.ppol[k]! / (ahlm * constants.ahl70 * 1.4);
  return { ppgf };
}

export function computeResourceStep(
  k: number,
  t: number,
  buffers: World3SimulationBuffers,
  constants: World3SimulationConstants,
  lookups: World3SimulationLookups,
  policyYear: number,
): ResourceState {
  buffers.nrfr[k] = buffers.nr[k]! / constants.nri;
  buffers.fcaor[k] = clip(lookups.FCAOR2(buffers.nrfr[k]!), lookups.FCAOR1(buffers.nrfr[k]!), t, policyYear);
  return { nruf: clip(constants.nruf2, constants.nruf1, t, policyYear) };
}

export function computeCrossSectorStep(
  k: number,
  t: number,
  buffers: World3SimulationBuffers,
  constants: World3SimulationConstants,
  lookups: World3SimulationLookups,
  capital: CapitalState,
  agriculture: AgricultureState,
  resources: ResourceState,
  policyYear: number,
): CrossSectorState {
  buffers.hsapc[k] = lookups.HSAPC(buffers.sopc[k]!);
  buffers.io[k] = buffers.ic[k]! * (1 - buffers.fcaor[k]!) * buffers.cuf[k]! / capital.icor;
  buffers.iopc[k] = buffers.io[k]! / buffers.pop[k]!;
  buffers.fioac[k] = clip(lookups.FIOACV(buffers.iopc[k]! / constants.iopcd), clip(constants.fioac2, constants.fioac1, t, policyYear), t, constants.iet);
  const isopc = clip(lookups.ISOPC2(buffers.iopc[k]!), lookups.ISOPC1(buffers.iopc[k]!), t, policyYear);
  buffers.fioas[k] = clip(lookups.FIOAS2(buffers.sopc[k]! / isopc), lookups.FIOAS1(buffers.sopc[k]! / isopc), t, policyYear);
  buffers.scir[k] = buffers.io[k]! * buffers.fioas[k]!;
  buffers.pjis[k] = buffers.ic[k]! * lookups.JPICU(buffers.iopc[k]!);
  buffers.pjas[k] = lookups.JPH(buffers.aiph[k]!) * buffers.al[k]!;
  buffers.j[k] = buffers.pjis[k]! + buffers.pjas[k]! + buffers.pjss[k]!;
  buffers.luf[k] = buffers.j[k]! / buffers.lf[k]!;
  buffers.ifpc[k] = clip(lookups.IFPC2(buffers.iopc[k]!), lookups.IFPC1(buffers.iopc[k]!), t, policyYear);
  buffers.lymap[k] = clip(lookups.LYMAP2(buffers.io[k]! / constants.io70), lookups.LYMAP1(buffers.io[k]! / constants.io70), t, policyYear);
  buffers.lfd[k] = buffers.lfert[k]! * lookups.LFDR(buffers.ppolx[k]!);
  buffers.ly[k] = agriculture.lyf * buffers.lfert[k]! * agriculture.lymc * buffers.lymap[k]!;
  buffers.llmy[k] = clip(lookups.LLMY2(buffers.ly[k]! / constants.ilf), lookups.LLMY1(buffers.ly[k]! / constants.ilf), t, policyYear);
  buffers.lrui[k] = Math.max(0, (lookups.UILPC(buffers.iopc[k]!) * buffers.pop[k]! - buffers.uil[k]!) / constants.uildt);
  buffers.lfr[k] = (constants.ilf - buffers.lfert[k]!) / agriculture.lfrt;
  const pcrum = lookups.PCRUM(buffers.iopc[k]!);
  buffers.nrur[k] = buffers.pop[k]! * pcrum * resources.nruf;
  return { pcrum };
}

export function computePopulationFeedbackStep(
  k: number,
  t: number,
  buffers: World3SimulationBuffers,
  constants: World3SimulationConstants,
  lookups: World3SimulationLookups,
  leading: PopulationLeadingState,
  agriculture: AgricultureState,
  pollution: PollutionState,
  crossSector: CrossSectorState,
  policyYear: number,
): void {
  const cmi = lookups.CMI(buffers.iopc[k]!);
  buffers.lmc[k] = 1 - cmi * buffers.fpu[k]!;
  const fie = leading.aiopc === 0 ? 0 : (buffers.iopc[k]! - leading.aiopc) / leading.aiopc;
  buffers.dcfs[k] = clip(2.0, constants.dcfsn * lookups.FRSN(fie) * buffers.sfsn[k]!, t, constants.zpgt);
  buffers.dtf[k] = buffers.dcfs[k]! * buffers.cmple[k]!;
  buffers.f[k] = buffers.ly[k]! * buffers.al[k]! * constants.lfh * (1 - constants.pl);
  buffers.fpc[k] = buffers.f[k]! / buffers.pop[k]!;
  buffers.fioaa[k] = clip(lookups.FIOAA2(buffers.fpc[k]! / buffers.ifpc[k]!), lookups.FIOAA1(buffers.fpc[k]! / buffers.ifpc[k]!), t, policyYear);
  buffers.tai[k] = buffers.io[k]! * buffers.fioaa[k]!;
  const mpai = agriculture.alai * buffers.ly[k]! * lookups.MLYMC(buffers.aiph[k]!) / agriculture.lymc;
  const mpld = buffers.ly[k]! / (lookups.DCPH(buffers.pal[k]! / constants.palt) * constants.sd);
  const fiald = lookups.FIALD(mpld / mpai);
  buffers.ldr[k] = buffers.tai[k]! * fiald / lookups.DCPH(buffers.pal[k]! / constants.palt);
  buffers.cai[k] = buffers.tai[k]! * (1 - fiald);
  buffers.fr[k] = buffers.fpc[k]! / constants.sfpc;
  buffers.ler[k] = buffers.al[k]! / (constants.alln * buffers.llmy[k]!);
  buffers.ppgr[k] = (crossSector.pcrum * buffers.pop[k]! * constants.frpm * constants.imef * constants.imti + buffers.ppgao[k]!) * pollution.ppgf;
  const lmf = lookups.LMF(buffers.fpc[k]! / constants.sfpc);
  const lmp = lookups.LMP(buffers.ppolx[k]!);
  buffers.le[k] = constants.len * lmf * buffers.lmhs[k]! * lmp * buffers.lmc[k]!;
}

export function computeMortalityAndBirthStep(
  k: number,
  t: number,
  buffers: World3SimulationBuffers,
  constants: World3SimulationConstants,
  lookups: World3SimulationLookups,
): void {
  buffers.m1[k] = lookups.M1(buffers.le[k]!);
  buffers.m2[k] = lookups.M2(buffers.le[k]!);
  buffers.m3[k] = lookups.M3(buffers.le[k]!);
  buffers.m4[k] = lookups.M4(buffers.le[k]!);
  buffers.mat1[k] = buffers.p1[k]! * (1 - buffers.m1[k]!) / 15;
  buffers.mat2[k] = buffers.p2[k]! * (1 - buffers.m2[k]!) / 30;
  buffers.mat3[k] = buffers.p3[k]! * (1 - buffers.m3[k]!) / 20;
  buffers.d1[k] = buffers.p1[k]! * buffers.m1[k]!;
  buffers.d2[k] = buffers.p2[k]! * buffers.m2[k]!;
  buffers.d3[k] = buffers.p3[k]! * buffers.m3[k]!;
  buffers.d4[k] = buffers.p4[k]! * buffers.m4[k]!;
  const fm = lookups.FM(buffers.le[k]!);
  buffers.mtf[k] = constants.mtfn * fm;
  buffers.fcapc[k] = lookups.FSAFC(buffers.mtf[k]! / buffers.dtf[k]! - 1) * buffers.sopc[k]!;
  buffers.tf[k] = Math.min(buffers.mtf[k]!, buffers.mtf[k]! * (1 - buffers.fce[k]!) + buffers.dtf[k]! * buffers.fce[k]!);
  buffers.b[k] = clip(buffers.d[k]!, buffers.tf[k]! * buffers.p2[k]! * 0.5 / constants.rlt, t, constants.pet);
  buffers.fioai[k] = 1 - buffers.fioaa[k]! - buffers.fioas[k]! - buffers.fioac[k]!;
  buffers.icir[k] = buffers.io[k]! * buffers.fioai[k]!;
}
