/**
 * Fully coupled World3 simulation engine.
 *
 * Implements the complete World3 model as a single coupled simulation loop
 * with all feedback loops closed, using Euler integration.
 *
 * The computation order follows the DYNAMO model equations.
 */
import { createTimeGrid, createSeriesBuffer, Smooth, Delay3, Dlinf3 } from "./runtime-primitives.js";
import { createLookupLibrary } from "./world3-tables.js";
function requireLookup(lib, name) {
    const entry = lib.get(name);
    if (!entry) {
        throw new Error(`Missing lookup table: ${name}`);
    }
    return entry.evaluate;
}
function clip(ifTrue, ifFalse, t, switchTime) {
    return t > switchTime ? ifTrue : ifFalse;
}
function c(constants, name) {
    const val = constants[name];
    if (val === undefined) {
        throw new Error(`Missing constant: ${name}`);
    }
    return val;
}
export function simulateWorld3(options) {
    /* v8 ignore next 3 -- trivial defaults */
    const yearMin = options.yearMin ?? 1900;
    const yearMax = options.yearMax ?? 2100;
    const dt = options.dt ?? 0.5;
    const pyear = options.pyear ?? 1975;
    const iphst = options.iphst ?? 1940;
    const time = createTimeGrid(yearMin, yearMax, dt);
    const N = time.length;
    const lookupLib = createLookupLibrary(options.rawTables);
    // Lookup functions
    const FPU = requireLookup(lookupLib, "FPU");
    const LMF = requireLookup(lookupLib, "LMF");
    const HSAPC = requireLookup(lookupLib, "HSAPC");
    const LMHS1 = requireLookup(lookupLib, "LMHS1");
    const LMHS2 = requireLookup(lookupLib, "LMHS2");
    const CMI = requireLookup(lookupLib, "CMI");
    const LMP = requireLookup(lookupLib, "LMP");
    const M1 = requireLookup(lookupLib, "M1");
    const M2 = requireLookup(lookupLib, "M2");
    const M3 = requireLookup(lookupLib, "M3");
    const M4 = requireLookup(lookupLib, "M4");
    const FM = requireLookup(lookupLib, "FM");
    const CMPLE = requireLookup(lookupLib, "CMPLE");
    const SFSN = requireLookup(lookupLib, "SFSN");
    const FRSN = requireLookup(lookupLib, "FRSN");
    const FCE_TOCLIP = requireLookup(lookupLib, "FCE_TOCLIP");
    const FSAFC = requireLookup(lookupLib, "FSAFC");
    const FIOACV = requireLookup(lookupLib, "FIOACV");
    const ISOPC1 = requireLookup(lookupLib, "ISOPC1");
    const ISOPC2 = requireLookup(lookupLib, "ISOPC2");
    const FIOAS1 = requireLookup(lookupLib, "FIOAS1");
    const FIOAS2 = requireLookup(lookupLib, "FIOAS2");
    const JPICU = requireLookup(lookupLib, "JPICU");
    const JPSCU = requireLookup(lookupLib, "JPSCU");
    const JPH = requireLookup(lookupLib, "JPH");
    const CUF = requireLookup(lookupLib, "CUF");
    const IFPC1 = requireLookup(lookupLib, "IFPC1");
    const IFPC2 = requireLookup(lookupLib, "IFPC2");
    const FIOAA1 = requireLookup(lookupLib, "FIOAA1");
    const FIOAA2 = requireLookup(lookupLib, "FIOAA2");
    const DCPH = requireLookup(lookupLib, "DCPH");
    const LYMC = requireLookup(lookupLib, "LYMC");
    const LYMAP1 = requireLookup(lookupLib, "LYMAP1");
    const LYMAP2 = requireLookup(lookupLib, "LYMAP2");
    const FIALD = requireLookup(lookupLib, "FIALD");
    const MLYMC = requireLookup(lookupLib, "MLYMC");
    const LLMY1 = requireLookup(lookupLib, "LLMY1");
    const LLMY2 = requireLookup(lookupLib, "LLMY2");
    const UILPC = requireLookup(lookupLib, "UILPC");
    const LFDR = requireLookup(lookupLib, "LFDR");
    const LFRT = requireLookup(lookupLib, "LFRT");
    const FALM = requireLookup(lookupLib, "FALM");
    const AHLM = requireLookup(lookupLib, "AHLM");
    const FCAOR1 = requireLookup(lookupLib, "FCAOR1");
    const FCAOR2 = requireLookup(lookupLib, "FCAOR2");
    const PCRUM = requireLookup(lookupLib, "PCRUM");
    // Constants
    const consts = options.constants ?? /* v8 ignore next */ {};
    const p1i = c(consts, "p1i"), p2i = c(consts, "p2i"), p3i = c(consts, "p3i"), p4i = c(consts, "p4i");
    const ici = c(consts, "ici"), sci = c(consts, "sci");
    const ali = c(consts, "ali"), pali = c(consts, "pali"), uili = c(consts, "uili");
    const lferti = c(consts, "lferti"), ppoli = c(consts, "ppoli"), nri = c(consts, "nri");
    const alic1 = c(consts, "alic1"), alic2 = c(consts, "alic2");
    const icor1 = c(consts, "icor1"), icor2 = c(consts, "icor2");
    const alsc1 = c(consts, "alsc1"), alsc2 = c(consts, "alsc2");
    const scor1 = c(consts, "scor1"), scor2 = c(consts, "scor2");
    const lfpf = c(consts, "lfpf"), palt = c(consts, "palt");
    const alai1 = c(consts, "alai1"), alai2 = c(consts, "alai2");
    const ppol70 = c(consts, "ppol70"), fipm = c(consts, "fipm"), amti = c(consts, "amti");
    const ppgf1 = c(consts, "ppgf1"), ppgf2 = c(consts, "ppgf2");
    const pptd1 = c(consts, "pptd1"), pptd2 = c(consts, "pptd2");
    const ahl70 = c(consts, "ahl70");
    const nruf1 = c(consts, "nruf1"), nruf2 = c(consts, "nruf2");
    const fioac1 = c(consts, "fioac1"), fioac2 = c(consts, "fioac2");
    const iopcd = c(consts, "iopcd"), iet = c(consts, "iet"), fcest = c(consts, "fcest");
    const hsid = c(consts, "hsid"), ieat = c(consts, "ieat"), lpd = c(consts, "lpd"), sad = c(consts, "sad");
    const lufdt = c(consts, "lufdt"), fspd = c(consts, "fspd");
    const dcfsn = c(consts, "dcfsn"), zpgt = c(consts, "zpgt"), mtfn = c(consts, "mtfn");
    const rlt = c(consts, "rlt"), pet = c(consts, "pet"), len = c(consts, "len");
    const lfh = c(consts, "lfh"), pl = c(consts, "pl"), sfpc = c(consts, "sfpc"), sd = c(consts, "sd");
    const ilf = c(consts, "ilf"), alln = c(consts, "alln");
    const frpm = c(consts, "frpm"), imef = c(consts, "imef"), imti = c(consts, "imti"), io70 = c(consts, "io70");
    const lyf1 = c(consts, "lyf1"), lyf2 = c(consts, "lyf2"), uildt = c(consts, "uildt");
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
    // Core computation for one timestep
    function computeStep(k) {
        const t = time[k];
        // State advances
        if (k === 0) {
            p1[0] = p1i;
            p2[0] = p2i;
            p3[0] = p3i;
            p4[0] = p4i;
            ic[0] = ici;
            sc[0] = sci;
            al[0] = ali;
            pal[0] = pali;
            uil[0] = uili;
            lfert[0] = lferti;
            ppol[0] = ppoli;
            nr[0] = nri;
        }
        else {
            p1[k] = p1[k - 1] + dt * (b[k - 1] - d1[k - 1] - mat1[k - 1]);
            p2[k] = p2[k - 1] + dt * (mat1[k - 1] - d2[k - 1] - mat2[k - 1]);
            p3[k] = p3[k - 1] + dt * (mat2[k - 1] - d3[k - 1] - mat3[k - 1]);
            p4[k] = p4[k - 1] + dt * (mat3[k - 1] - d4[k - 1]);
            ic[k] = ic[k - 1] + dt * (icir[k - 1] - icdr[k - 1]);
            sc[k] = sc[k - 1] + dt * (scir[k - 1] - scdr[k - 1]);
            al[k] = al[k - 1] + dt * (ldr[k - 1] - ler[k - 1] - lrui[k - 1]);
            pal[k] = pal[k - 1] - dt * ldr[k - 1];
            uil[k] = uil[k - 1] + dt * lrui[k - 1];
            lfert[k] = lfert[k - 1] + dt * (lfr[k - 1] - lfd[k - 1]);
            ppol[k] = ppol[k - 1] + dt * (ppapr[k - 1] - ppasr[k - 1]);
            nr[k] = nr[k - 1] - dt * nrur[k - 1];
        }
        pop[k] = p1[k] + p2[k] + p3[k] + p4[k];
        // Population sector
        fpu[k] = FPU(pop[k]);
        const ehspc_k = smooth_hsapc.step(k, hsid);
        lmhs[k] = clip(LMHS2(ehspc_k), LMHS1(ehspc_k), t, iphst);
        d[k] = k === 0 ? 0 : d1[k - 1] + d2[k - 1] + d3[k - 1] + d4[k - 1];
        cdr[k] = 1000 * d[k] / pop[k];
        const aiopc_k = smooth_iopc.step(k, ieat);
        const diopc_k = dlinf3_iopc.step(k, sad);
        sfsn[k] = SFSN(diopc_k);
        const ple_k = dlinf3_le.step(k, lpd);
        cmple[k] = CMPLE(ple_k);
        const fcfpc_k = dlinf3_fcapc.step(k, hsid);
        fce[k] = clip(1.0, FCE_TOCLIP(fcfpc_k), t, fcest);
        cbr[k] = k === 0 ? 0 : 1000 * b[k - 1] / pop[k];
        // Capital sector
        const lufd_k = smooth_luf.step(k, lufdt);
        cuf_arr[k] = CUF(lufd_k);
        icdr[k] = ic[k] / clip(alic2, alic1, t, pyear);
        const icor_k = clip(icor2, icor1, t, pyear);
        scdr[k] = sc[k] / clip(alsc2, alsc1, t, pyear);
        const scor_k = clip(scor2, scor1, t, pyear);
        so[k] = sc[k] * cuf_arr[k] / scor_k;
        sopc[k] = so[k] / pop[k];
        pjss[k] = sc[k] * JPSCU(sopc[k]);
        lf[k] = (p2[k] + p3[k]) * lfpf;
        // Agriculture land
        const alai_k = clip(alai2, alai1, t, pyear);
        ai[k] = smooth_cai.step(k, alai_k);
        pfr[k] = smooth_fr.step(k, fspd);
        falm_arr[k] = FALM(pfr[k]);
        aiph[k] = ai[k] * (1 - falm_arr[k]) / al[k];
        const lymc_k = LYMC(aiph[k]);
        const lyf_k = clip(lyf2, lyf1, t, pyear);
        const lfrt_k = LFRT(falm_arr[k]);
        // Pollution
        ppolx[k] = ppol[k] / ppol70;
        ppgao[k] = aiph[k] * al[k] * fipm * amti;
        const ppgf_k = clip(ppgf2, ppgf1, t, pyear);
        const pptd_k = clip(pptd2, pptd1, t, pyear);
        ppapr[k] = delay3_ppgr.step(k, pptd_k);
        const ahlm_k = AHLM(ppolx[k]);
        ppasr[k] = ppol[k] / (ahlm_k * ahl70 * 1.4);
        // Resources
        nrfr[k] = nr[k] / nri;
        fcaor[k] = clip(FCAOR2(nrfr[k]), FCAOR1(nrfr[k]), t, pyear);
        const nruf_k = clip(nruf2, nruf1, t, pyear);
        // Cross-sector feedback
        hsapc_arr[k] = HSAPC(sopc[k]);
        io[k] = ic[k] * (1 - fcaor[k]) * cuf_arr[k] / icor_k;
        iopc[k] = io[k] / pop[k];
        fioac[k] = clip(FIOACV(iopc[k] / iopcd), clip(fioac2, fioac1, t, pyear), t, iet);
        const isopc_k = clip(ISOPC2(iopc[k]), ISOPC1(iopc[k]), t, pyear);
        fioas[k] = clip(FIOAS2(sopc[k] / isopc_k), FIOAS1(sopc[k] / isopc_k), t, pyear);
        scir[k] = io[k] * fioas[k];
        pjis[k] = ic[k] * JPICU(iopc[k]);
        pjas[k] = JPH(aiph[k]) * al[k];
        j[k] = pjis[k] + pjas[k] + pjss[k];
        luf[k] = j[k] / lf[k];
        ifpc[k] = clip(IFPC2(iopc[k]), IFPC1(iopc[k]), t, pyear);
        lymap[k] = clip(LYMAP2(io[k] / io70), LYMAP1(io[k] / io70), t, pyear);
        lfd[k] = lfert[k] * LFDR(ppolx[k]);
        ly[k] = lyf_k * lfert[k] * lymc_k * lymap[k];
        llmy[k] = clip(LLMY2(ly[k] / ilf), LLMY1(ly[k] / ilf), t, pyear);
        lrui[k] = Math.max(0, (UILPC(iopc[k]) * pop[k] - uil[k]) / uildt);
        lfr[k] = (ilf - lfert[k]) / lfrt_k;
        const pcrum_k = PCRUM(iopc[k]);
        nrur[k] = pop[k] * pcrum_k * nruf_k;
        // Population feedback
        const cmi_k = CMI(iopc[k]);
        lmc[k] = 1 - cmi_k * fpu[k];
        const fie_k = aiopc_k === 0 ? 0 : (iopc[k] - aiopc_k) / aiopc_k;
        dcfs[k] = clip(2.0, dcfsn * FRSN(fie_k) * sfsn[k], t, zpgt);
        dtf[k] = dcfs[k] * cmple[k];
        f[k] = ly[k] * al[k] * lfh * (1 - pl);
        fpc[k] = f[k] / pop[k];
        fioaa[k] = clip(FIOAA2(fpc[k] / ifpc[k]), FIOAA1(fpc[k] / ifpc[k]), t, pyear);
        tai[k] = io[k] * fioaa[k];
        const mpai_k = alai_k * ly[k] * MLYMC(aiph[k]) / lymc_k;
        const mpld_k = ly[k] / (DCPH(pal[k] / palt) * sd);
        const fiald_k = FIALD(mpld_k / mpai_k);
        ldr[k] = tai[k] * fiald_k / DCPH(pal[k] / palt);
        cai[k] = tai[k] * (1 - fiald_k);
        fr[k] = fpc[k] / sfpc;
        ler[k] = al[k] / (alln * llmy[k]);
        ppgr[k] = (pcrum_k * pop[k] * frpm * imef * imti + ppgao[k]) * ppgf_k;
        const lmf_k = LMF(fpc[k] / sfpc);
        const lmp_k = LMP(ppolx[k]);
        le[k] = len * lmf_k * lmhs[k] * lmp_k * lmc[k];
        // Mortality and births
        m1[k] = M1(le[k]);
        m2[k] = M2(le[k]);
        m3[k] = M3(le[k]);
        m4[k] = M4(le[k]);
        mat1[k] = p1[k] * (1 - m1[k]) / 15;
        mat2[k] = p2[k] * (1 - m2[k]) / 30;
        mat3[k] = p3[k] * (1 - m3[k]) / 20;
        d1[k] = p1[k] * m1[k];
        d2[k] = p2[k] * m2[k];
        d3[k] = p3[k] * m3[k];
        d4[k] = p4[k] * m4[k];
        const fm_k = FM(le[k]);
        mtf[k] = mtfn * fm_k;
        fcapc[k] = FSAFC(mtf[k] / dtf[k] - 1) * sopc[k];
        tf[k] = Math.min(mtf[k], mtf[k] * (1 - fce[k]) + dtf[k] * fce[k]);
        b[k] = clip(d[k], tf[k] * p2[k] * 0.5 / rlt, t, pet);
        fioai[k] = 1 - fioaa[k] - fioas[k] - fioac[k];
        icir[k] = io[k] * fioai[k];
    }
    // k=0: iterate to converge circular dependencies at initialization.
    for (let pass = 0; pass < 5; pass++) {
        computeStep(0);
    }
    // Main simulation loop
    for (let k = 1; k < N; k++) {
        computeStep(k);
    }
    // Build result
    const timeArray = Array.from(time);
    const series = {};
    const exportMap = {
        pop, le, iopc, fpc, ppolx, nrfr,
        p1, p2, p3, p4, b, d, cbr, cdr,
        ic, sc, io, so, sopc,
        al, pal, uil, lfert, ly, f, ai, pfr,
        ppol, nr, nrur,
        fioai, fioaa, fioas, fioac,
        lf, j, cuf: cuf_arr, luf, fpu,
        lmhs, lmc, hsapc: hsapc_arr, fcaor, lymap,
        tf, mtf, dtf, dcfs, cmple, sfsn,
        fcapc, fce, fr, falm: falm_arr, aiph,
        ler, ldr, lrui, ppapr, ppasr,
    };
    for (const [name, buf] of Object.entries(exportMap)) {
        series[name] = { name, values: Array.from(buf) };
    }
    return {
        year_min: yearMin,
        year_max: yearMax,
        dt,
        time: timeArray,
        constants_used: { ...consts },
        series,
    };
}
