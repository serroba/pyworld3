/**
 * Equation reference map for auditing the World3 implementation.
 *
 * Each entry pairs a DSL equation key with its DYNAMO equivalent,
 * source reference, and a plain-English description. The primary
 * source is:
 *
 *   Meadows, D. L., Behrens, W. W., Meadows, D. H., Naill, R. F.,
 *   Randers, J. & Zahn, E. — "Dynamics of Growth in a Finite World"
 *   (1974), hereafter "DGFW".
 *
 * Variable abbreviations follow the original DYNAMO naming conventions.
 */

import type { World3VariableKey } from "./world3-keys.js";

export type EquationReference = {
  /** DYNAMO equation in the form "VAR.K = expression" */
  dynamo: string;
  /** Source citation (e.g. "DGFW p.234") */
  source: string;
  /** Plain-English description of what this equation computes */
  description: string;
};

export const WORLD3_EQUATION_REFERENCE: Readonly<Record<World3VariableKey, EquationReference>> = {
  // ── State Stocks ──────────────────────────────────────────────
  p1: {
    dynamo: "P1.K = P1.J + DT * (B.JK - D1.JK - MAT1.JK)",
    source: "DGFW Ch. 2",
    description: "Population ages 0–14, integrated from births minus deaths and maturation out",
  },
  p2: {
    dynamo: "P2.K = P2.J + DT * (MAT1.JK - D2.JK - MAT2.JK)",
    source: "DGFW Ch. 2",
    description: "Population ages 15–44, integrated from maturation in/out and deaths",
  },
  p3: {
    dynamo: "P3.K = P3.J + DT * (MAT2.JK - D3.JK - MAT3.JK)",
    source: "DGFW Ch. 2",
    description: "Population ages 45–64, integrated from maturation in/out and deaths",
  },
  p4: {
    dynamo: "P4.K = P4.J + DT * (MAT3.JK - D4.JK)",
    source: "DGFW Ch. 2",
    description: "Population ages 65+, integrated from maturation in minus deaths",
  },
  ic: {
    dynamo: "IC.K = IC.J + DT * (ICIR.JK - ICDR.JK)",
    source: "DGFW Ch. 3",
    description: "Industrial capital, accumulated from investment minus depreciation",
  },
  sc: {
    dynamo: "SC.K = SC.J + DT * (SCIR.JK - SCDR.JK)",
    source: "DGFW Ch. 3",
    description: "Service capital, accumulated from investment minus depreciation",
  },
  al: {
    dynamo: "AL.K = AL.J + DT * (LDR.JK - LER.JK - LRUI.JK)",
    source: "DGFW Ch. 4",
    description: "Arable land, increased by development, decreased by erosion and urban use",
  },
  pal: {
    dynamo: "PAL.K = PAL.J - DT * LDR.JK",
    source: "DGFW Ch. 4",
    description: "Potentially arable land, depleted as land is developed",
  },
  uil: {
    dynamo: "UIL.K = UIL.J + DT * LRUI.JK",
    source: "DGFW Ch. 4",
    description: "Urban-industrial land, increased by land removal from agriculture",
  },
  lfert: {
    dynamo: "LFERT.K = LFERT.J + DT * (LFR.JK - LFD.JK)",
    source: "DGFW Ch. 4",
    description: "Land fertility, increased by regeneration, decreased by degradation",
  },
  ppol: {
    dynamo: "PPOL.K = PPOL.J + DT * (PPAPR.JK - PPASR.JK)",
    source: "DGFW Ch. 5",
    description: "Persistent pollution, accumulated from appearance minus assimilation",
  },
  nr: {
    dynamo: "NR.K = NR.J - DT * NRUR.JK",
    source: "DGFW Ch. 6",
    description: "Nonrenewable resources remaining, depleted by usage rate",
  },

  // ── Derived Stocks ────────────────────────────────────────────
  pop: {
    dynamo: "POP.K = P1.K + P2.K + P3.K + P4.K",
    source: "DGFW Ch. 2",
    description: "Total population, sum of all four age cohorts",
  },

  // ── Resources ─────────────────────────────────────────────────
  nrfr: {
    dynamo: "NRFR.K = NR.K / NRI",
    source: "DGFW Ch. 6",
    description: "Fraction of initial nonrenewable resources remaining",
  },
  fcaor: {
    dynamo: "FCAOR.K = TABHL(FCAOR1/FCAOR2, NRFR.K, ...)",
    source: "DGFW Ch. 6",
    description: "Fraction of capital allocated to obtaining resources, policy-switched",
  },
  nrur: {
    dynamo: "NRUR.KL = POP.K * PCRUM.K * NRUF",
    source: "DGFW Ch. 6",
    description: "Nonrenewable resource usage rate, driven by population and per-capita usage",
  },

  // ── Population Mortality ──────────────────────────────────────
  m1: {
    dynamo: "M1.K = TABHL(M1T, LE.K, ...)",
    source: "DGFW Ch. 2",
    description: "Mortality rate ages 0–14, lookup from life expectancy",
  },
  m2: {
    dynamo: "M2.K = TABHL(M2T, LE.K, ...)",
    source: "DGFW Ch. 2",
    description: "Mortality rate ages 15–44, lookup from life expectancy",
  },
  m3: {
    dynamo: "M3.K = TABHL(M3T, LE.K, ...)",
    source: "DGFW Ch. 2",
    description: "Mortality rate ages 45–64, lookup from life expectancy",
  },
  m4: {
    dynamo: "M4.K = TABHL(M4T, LE.K, ...)",
    source: "DGFW Ch. 2",
    description: "Mortality rate ages 65+, lookup from life expectancy",
  },
  mat1: {
    dynamo: "MAT1.KL = P1.K * (1 - M1.K) / 15",
    source: "DGFW Ch. 2",
    description: "Maturation rate from cohort 0–14 to 15–44 (15-year span)",
  },
  mat2: {
    dynamo: "MAT2.KL = P2.K * (1 - M2.K) / 30",
    source: "DGFW Ch. 2",
    description: "Maturation rate from cohort 15–44 to 45–64 (30-year span)",
  },
  mat3: {
    dynamo: "MAT3.KL = P3.K * (1 - M3.K) / 20",
    source: "DGFW Ch. 2",
    description: "Maturation rate from cohort 45–64 to 65+ (20-year span)",
  },
  d1: {
    dynamo: "D1.KL = P1.K * M1.K",
    source: "DGFW Ch. 2",
    description: "Deaths per year in cohort 0–14",
  },
  d2: {
    dynamo: "D2.KL = P2.K * M2.K",
    source: "DGFW Ch. 2",
    description: "Deaths per year in cohort 15–44",
  },
  d3: {
    dynamo: "D3.KL = P3.K * M3.K",
    source: "DGFW Ch. 2",
    description: "Deaths per year in cohort 45–64",
  },
  d4: {
    dynamo: "D4.KL = P4.K * M4.K",
    source: "DGFW Ch. 2",
    description: "Deaths per year in cohort 65+",
  },

  // ── Population Fertility ──────────────────────────────────────
  mtf: {
    dynamo: "MTF.K = MTFN * FM(LE.K)",
    source: "DGFW Ch. 2",
    description: "Maximum total fertility, upper bound modulated by life expectancy",
  },
  fcapc: {
    dynamo: "FCAPC.K = TABHL(FSAFC, IOPC.K / ..., ...)",
    source: "DGFW Ch. 2",
    description: "Food coefficient from affluence per capita",
  },
  tf: {
    dynamo: "TF.K = MIN(MTF.K, MTF.K * (1 - FCE.K) + DTF.K * FCE.K)",
    source: "DGFW Ch. 2",
    description: "Total fertility, blending maximum and desired fertility by contraception effectiveness",
  },
  b: {
    dynamo: "B.KL = CLIP(D.K, TF.K * P2.K * 0.5 / RLT, POP.K, 0)",
    source: "DGFW Ch. 2",
    description: "Births per year, from fertility rate applied to reproductive-age women",
  },

  // ── Population Auxiliaries ────────────────────────────────────
  fpu: {
    dynamo: "FPU.K = TABHL(FPUT, FPC.K / SFPC, ...)",
    source: "DGFW Ch. 2",
    description: "Food potential utilization, lookup from food per capita ratio",
  },
  lmhs: {
    dynamo: "LMHS.K = CLIP(LMHS2(EHSPC), LMHS1(EHSPC), TIME, IPHST)",
    source: "DGFW Ch. 2",
    description: "Lifetime multiplier from health services, policy-switched at health start year",
  },
  d: {
    dynamo: "D.K = D1.K + D2.K + D3.K + D4.K",
    source: "DGFW Ch. 2",
    description: "Total deaths per year, sum across all cohorts",
  },
  cdr: {
    dynamo: "CDR.K = 1000 * D.K / POP.K",
    source: "DGFW Ch. 2",
    description: "Crude death rate per 1000 population",
  },
  sfsn: {
    dynamo: "SFSN.K = TABHL(SFSNT, DIOPC.K, ...)",
    source: "DGFW Ch. 2",
    description: "Social family size norm, lookup from delayed industrial output per capita",
  },
  cmple: {
    dynamo: "CMPLE.K = TABHL(CMPLET, PLE.K, ...)",
    source: "DGFW Ch. 2",
    description: "Compensatory multiplier from perceived life expectancy",
  },
  fce: {
    dynamo: "FCE.K = CLIP(1, TABHL(FCET, FCFPC.K, ...), TIME, FCEST)",
    source: "DGFW Ch. 2",
    description: "Fertility control effectiveness, activated after family planning start time",
  },
  cbr: {
    dynamo: "CBR.K = 1000 * B.K / POP.K",
    source: "DGFW Ch. 2",
    description: "Crude birth rate per 1000 population",
  },
  hsapc: {
    dynamo: "HSAPC.K = TABHL(HSAPCT, SOPC.K, ...)",
    source: "DGFW Ch. 2",
    description: "Health services allocation per capita, lookup from service output per capita",
  },
  le: {
    dynamo: "LE.K = LEN * LMHS.K * LMF.K * LMP.K * LMC.K",
    source: "DGFW Ch. 2",
    description: "Life expectancy, product of normal value and four multipliers (health, food, pollution, crowding)",
  },
  lmc: {
    dynamo: "LMC.K = 1 - CMI.K * FPU.K",
    source: "DGFW Ch. 2",
    description: "Lifetime multiplier from crowding",
  },
  dcfs: {
    dynamo: "DCFS.K = DCFSN * FRSN(SFSN.K) * CMPLE.K",
    source: "DGFW Ch. 2",
    description: "Desired completed family size, from norm, social influence, and life expectancy compensation",
  },
  dtf: {
    dynamo: "DTF.K = DCFS.K * CMPLE.K",
    source: "DGFW Ch. 2",
    description: "Desired total fertility",
  },

  // ── Capital ───────────────────────────────────────────────────
  cuf: {
    dynamo: "CUF.K = TABHL(CUFT, LUFD.K, ...)",
    source: "DGFW Ch. 3",
    description: "Capital utilization fraction, lookup from smoothed labor utilization",
  },
  lf: {
    dynamo: "LF.K = (P2.K + P3.K) * LFPF",
    source: "DGFW Ch. 3",
    description: "Labor force, working-age cohorts times participation fraction",
  },
  icdr: {
    dynamo: "ICDR.KL = IC.K / ALIC",
    source: "DGFW Ch. 3",
    description: "Industrial capital depreciation rate",
  },
  scdr: {
    dynamo: "SCDR.KL = SC.K / ALSC",
    source: "DGFW Ch. 3",
    description: "Service capital depreciation rate",
  },
  so: {
    dynamo: "SO.K = SC.K * CUF.K / SCOR",
    source: "DGFW Ch. 3",
    description: "Service output per year",
  },
  sopc: {
    dynamo: "SOPC.K = SO.K / POP.K",
    source: "DGFW Ch. 3",
    description: "Service output per capita",
  },
  pjss: {
    dynamo: "PJSS.K = SC.K * JPSCU(SOPC.K)",
    source: "DGFW Ch. 3",
    description: "Potential jobs in the service sector",
  },
  fioac: {
    dynamo: "FIOAC.K = CLIP(FIOACV(IOPC.K/IOPCD), FIOAC1/FIOAC2, TIME, IET)",
    source: "DGFW Ch. 3",
    description: "Fraction of industrial output allocated to consumption",
  },
  fioas: {
    dynamo: "FIOAS.K = CLIP(FIOAS2(SOPC/ISOPC2), FIOAS1(SOPC/ISOPC1), TIME, PYEAR)",
    source: "DGFW Ch. 3",
    description: "Fraction of industrial output allocated to services",
  },
  scir: {
    dynamo: "SCIR.KL = IO.K * FIOAS.K",
    source: "DGFW Ch. 3",
    description: "Service capital investment rate",
  },
  fioai: {
    dynamo: "FIOAI.K = 1 - FIOAA.K - FIOAS.K - FIOAC.K",
    source: "DGFW Ch. 3",
    description: "Fraction of industrial output allocated to industry (residual)",
  },
  icir: {
    dynamo: "ICIR.KL = IO.K * FIOAI.K",
    source: "DGFW Ch. 3",
    description: "Industrial capital investment rate",
  },

  // ── Cross-Sector ──────────────────────────────────────────────
  io: {
    dynamo: "IO.K = IC.K * (1 - FCAOR.K) * CUF.K / ICOR",
    source: "DGFW Ch. 3",
    description: "Industrial output per year, capital times utilization divided by capital-output ratio",
  },
  iopc: {
    dynamo: "IOPC.K = IO.K / POP.K",
    source: "DGFW Ch. 3",
    description: "Industrial output per capita",
  },
  pjis: {
    dynamo: "PJIS.K = IC.K * JPICU(IOPC.K)",
    source: "DGFW Ch. 3",
    description: "Potential jobs in the industrial sector",
  },
  pjas: {
    dynamo: "PJAS.K = AIPH.K * AL.K * JPH(AIPH.K)",
    source: "DGFW Ch. 3",
    description: "Potential jobs in the agricultural sector",
  },
  j: {
    dynamo: "J.K = PJIS.K + PJAS.K + PJSS.K",
    source: "DGFW Ch. 3",
    description: "Total jobs across all sectors",
  },
  luf: {
    dynamo: "LUF.K = J.K / LF.K",
    source: "DGFW Ch. 3",
    description: "Labor utilization fraction, jobs divided by labor force",
  },
  ifpc: {
    dynamo: "IFPC.K = CLIP(IFPC2(IOPC.K), IFPC1(IOPC.K), TIME, PYEAR)",
    source: "DGFW Ch. 4",
    description: "Indicated food per capita, policy-switched lookup from industrial output",
  },
  lymap: {
    dynamo: "LYMAP.K = CLIP(LYMAP2(IO.K/IO70), LYMAP1(IO.K/IO70), TIME, PYEAR)",
    source: "DGFW Ch. 5",
    description: "Land yield multiplier from air pollution",
  },
  ly: {
    dynamo: "LY.K = LYF * LFERT.K * LYMC * LYMAP.K",
    source: "DGFW Ch. 4",
    description: "Land yield per hectare, product of fertility, technology, and pollution factors",
  },
  llmy: {
    dynamo: "LLMY.K = LY.K / ILF",
    source: "DGFW Ch. 4",
    description: "Land life multiplier from yield, ratio of actual to inherent fertility",
  },
  lfd: {
    dynamo: "LFD.KL = LFERT.K * LFDR(LLMY.K)",
    source: "DGFW Ch. 4",
    description: "Land fertility degradation rate",
  },
  lrui: {
    dynamo: "LRUI.KL = MAX(0, UILPC(IOPC.K) * POP.K - UIL.K) / UILDT",
    source: "DGFW Ch. 4",
    description: "Land removal for urban-industrial use",
  },
  lfr: {
    dynamo: "LFR.KL = (ILF - LFERT.K) / LFRT",
    source: "DGFW Ch. 4",
    description: "Land fertility regeneration rate",
  },

  // ── Agriculture ───────────────────────────────────────────────
  ai: {
    dynamo: "AI.K = SMOOTH(TAI.K * (1 - FALM.K), ALAI)",
    source: "DGFW Ch. 4",
    description: "Agricultural inputs, smoothed from total investment net of maintenance",
  },
  pfr: {
    dynamo: "PFR.K = SMOOTH(FR.K, FSPD)",
    source: "DGFW Ch. 4",
    description: "Perceived food ratio, smoothed from actual food ratio",
  },
  falm: {
    dynamo: "FALM.K = TABHL(FALMT, PFR.K, ...)",
    source: "DGFW Ch. 4",
    description: "Fraction of agricultural inputs allocated to land maintenance",
  },
  aiph: {
    dynamo: "AIPH.K = AI.K * (1 - FALM.K) / AL.K",
    source: "DGFW Ch. 4",
    description: "Agricultural inputs per hectare",
  },
  f: {
    dynamo: "F.K = LY.K * AL.K * LFH * (1 - PL)",
    source: "DGFW Ch. 4",
    description: "Total food production, from yield times harvested land minus processing loss",
  },
  fpc: {
    dynamo: "FPC.K = F.K / POP.K",
    source: "DGFW Ch. 4",
    description: "Food per capita",
  },
  fioaa: {
    dynamo: "FIOAA.K = CLIP(FIOAA2(FPC/IFPC), FIOAA1(FPC/IFPC), TIME, PYEAR)",
    source: "DGFW Ch. 4",
    description: "Fraction of industrial output allocated to agriculture",
  },
  tai: {
    dynamo: "TAI.K = IO.K * FIOAA.K",
    source: "DGFW Ch. 4",
    description: "Total agricultural investment",
  },
  ldr: {
    dynamo: "LDR.KL = TAI.K * FIALD.K / DCPH(PAL.K/PALT)",
    source: "DGFW Ch. 4",
    description: "Land development rate, investment allocated to new land divided by development cost",
  },
  cai: {
    dynamo: "CAI.KL = TAI.K * (1 - FIALD.K)",
    source: "DGFW Ch. 4",
    description: "Current agricultural investment (not allocated to land development)",
  },
  ler: {
    dynamo: "LER.KL = AL.K / ALLN / LLMY.K",
    source: "DGFW Ch. 4",
    description: "Land erosion rate, arable land divided by lifetime and yield multiplier",
  },
  fr: {
    dynamo: "FR.K = FPC.K / SFPC",
    source: "DGFW Ch. 4",
    description: "Food ratio, actual food per capita divided by subsistence level",
  },

  // ── Pollution ─────────────────────────────────────────────────
  ppolx: {
    dynamo: "PPOLX.K = PPOL.K / PPOL70",
    source: "DGFW Ch. 5",
    description: "Pollution index, relative to 1970 level",
  },
  ppgao: {
    dynamo: "PPGAO.K = AIPH.K * AL.K * FIPM * AMTI",
    source: "DGFW Ch. 5",
    description: "Persistent pollution generated by agriculture",
  },
  ppapr: {
    dynamo: "PPAPR.KL = DELAY3(PPGR.K, PPTD)",
    source: "DGFW Ch. 5",
    description: "Persistent pollution appearance rate, delayed from generation rate",
  },
  ppasr: {
    dynamo: "PPASR.KL = PPOL.K / (PPOLX.K * AHL70 * AHLM(PPOLX.K))",
    source: "DGFW Ch. 5",
    description: "Persistent pollution assimilation rate",
  },
  ppgr: {
    dynamo: "PPGR.K = (PPGIO.K + PPGAO.K + PPGAI.K) * PPGF",
    source: "DGFW Ch. 5 + Guliyeva et al. 2025",
    description: "Persistent pollution generation rate, industrial plus agricultural plus AI, times policy factor",
  },

  // ── AI pollution sector (Guliyeva et al. 2025) ───────────────
  aiofrac: {
    dynamo: "AIOFRAC.K = AIIO20 + (AIIO50 - AIIO20) / (1 + EXP(-(TIME - 2035) / 5))",
    source: "Guliyeva et al. 2025, Table 7",
    description: "Fraction of industrial output allocated to AI (S-curve interpolating 2020 to 2050 share)",
  },
  aiout: {
    dynamo: "AIOUT.K = IF THEN ELSE(TIME >= 2020, AIOFRAC.K * IO.K, 0)",
    source: "Guliyeva et al. 2025, Table 7",
    description: "AI output in $/yr, proportional to industrial output from 2020 onward",
  },
  aipi: {
    dynamo: "AIPI.K = (AICO2E20 * (1 + EXP(-BAIE * (1 - MAX(0, TIME-2020) * AIESR))) * MAX(0, TIME-2020) + MAX(2e-5, AIWEI20*(1-AIEWR*MAX(0,TIME-2020)))) * CO2TOPER",
    source: "Guliyeva et al. 2025, Table 7",
    description: "AI pollution intensity in pollution units per $: CO₂ component grows after 2020; e-waste component declines from circularity improvements (floored at 2e-5 to prevent negative values); both scaled by co2toper",
  },
  aiptcm: {
    dynamo: "AIPTCM.K = MIN(5, MAX(0.7 * PPGF1, 0.3 * (1 + 0.1 * (TIME - 2020))))",
    source: "Guliyeva et al. 2025, Table 7",
    description: "AI pollution tech-change multiplier — AI inherits the same planetary clean-tech progress floor as the industrial sector",
  },
  ppgai: {
    dynamo: "PPGAI.K = IF THEN ELSE(TIME<2020 :OR: TIME>2100, 0, AIOUT.K * AIPI.K / AIPTCM.K)",
    source: "Guliyeva et al. 2025, Table 7",
    description: "Persistent pollution generation by AI data centers, active 2020–2100",
  },
};
