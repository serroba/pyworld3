import { defineDerivedEquation, defineDerivedStock, defineStateStock, } from "./world3-equation-dsl.js";
function clip(ifTrue, ifFalse, t, switchTime) {
    return t > switchTime ? ifTrue : ifFalse;
}
export const WORLD3_STATE_STOCK_EQUATIONS = [
    defineStateStock({
        key: "p1",
        initialConstant: "p1i",
        inputs: ["b", "d1", "mat1"],
        next: ({ k, dt, buffers }) => buffers.p1[k - 1] + dt * (buffers.b[k - 1] - buffers.d1[k - 1] - buffers.mat1[k - 1]),
    }),
    defineStateStock({
        key: "p2",
        initialConstant: "p2i",
        inputs: ["mat1", "d2", "mat2"],
        next: ({ k, dt, buffers }) => buffers.p2[k - 1] +
            dt * (buffers.mat1[k - 1] - buffers.d2[k - 1] - buffers.mat2[k - 1]),
    }),
    defineStateStock({
        key: "p3",
        initialConstant: "p3i",
        inputs: ["mat2", "d3", "mat3"],
        next: ({ k, dt, buffers }) => buffers.p3[k - 1] +
            dt * (buffers.mat2[k - 1] - buffers.d3[k - 1] - buffers.mat3[k - 1]),
    }),
    defineStateStock({
        key: "p4",
        initialConstant: "p4i",
        inputs: ["mat3", "d4"],
        next: ({ k, dt, buffers }) => buffers.p4[k - 1] + dt * (buffers.mat3[k - 1] - buffers.d4[k - 1]),
    }),
    defineStateStock({
        key: "ic",
        initialConstant: "ici",
        inputs: ["icir", "icdr"],
        next: ({ k, dt, buffers }) => buffers.ic[k - 1] + dt * (buffers.icir[k - 1] - buffers.icdr[k - 1]),
    }),
    defineStateStock({
        key: "sc",
        initialConstant: "sci",
        inputs: ["scir", "scdr"],
        next: ({ k, dt, buffers }) => buffers.sc[k - 1] + dt * (buffers.scir[k - 1] - buffers.scdr[k - 1]),
    }),
    defineStateStock({
        key: "al",
        initialConstant: "ali",
        inputs: ["ldr", "ler", "lrui"],
        next: ({ k, dt, buffers }) => buffers.al[k - 1] +
            dt * (buffers.ldr[k - 1] - buffers.ler[k - 1] - buffers.lrui[k - 1]),
    }),
    defineStateStock({
        key: "pal",
        initialConstant: "pali",
        inputs: ["ldr"],
        next: ({ k, dt, buffers }) => buffers.pal[k - 1] - dt * buffers.ldr[k - 1],
    }),
    defineStateStock({
        key: "uil",
        initialConstant: "uili",
        inputs: ["lrui"],
        next: ({ k, dt, buffers }) => buffers.uil[k - 1] + dt * buffers.lrui[k - 1],
    }),
    defineStateStock({
        key: "lfert",
        initialConstant: "lferti",
        inputs: ["lfr", "lfd"],
        next: ({ k, dt, buffers }) => buffers.lfert[k - 1] + dt * (buffers.lfr[k - 1] - buffers.lfd[k - 1]),
    }),
    defineStateStock({
        key: "ppol",
        initialConstant: "ppoli",
        inputs: ["ppapr", "ppasr"],
        next: ({ k, dt, buffers }) => buffers.ppol[k - 1] + dt * (buffers.ppapr[k - 1] - buffers.ppasr[k - 1]),
    }),
    defineStateStock({
        key: "nr",
        initialConstant: "nri",
        inputs: ["nrur"],
        next: ({ k, dt, buffers }) => buffers.nr[k - 1] - dt * buffers.nrur[k - 1],
    }),
];
export const WORLD3_DERIVED_STOCK_EQUATIONS = [
    defineDerivedStock({
        key: "pop",
        inputs: ["p1", "p2", "p3", "p4"],
        compute: ({ k, buffers }) => buffers.p1[k] + buffers.p2[k] + buffers.p3[k] + buffers.p4[k],
    }),
];
export const WORLD3_RESOURCE_DERIVED_EQUATIONS = [
    defineDerivedEquation({
        key: "nrfr",
        inputs: ["nr", "nri"],
        compute: ({ k, buffers, constants }) => buffers.nr[k] / constants.nri,
    }),
];
export function advanceStateStocks(k, dt, buffers, constants) {
    const context = { k, dt, buffers, constants };
    if (k === 0) {
        for (const equation of WORLD3_STATE_STOCK_EQUATIONS) {
            buffers[equation.key][0] = constants[equation.initialConstant];
        }
    }
    else {
        for (const equation of WORLD3_STATE_STOCK_EQUATIONS) {
            buffers[equation.key][k] = equation.next(context);
        }
    }
    for (const equation of WORLD3_DERIVED_STOCK_EQUATIONS) {
        buffers[equation.key][k] = equation.compute(context);
    }
}
export function computePopulationLeadingStep(k, t, buffers, constants, lookups, integrators, healthPolicyStartYear) {
    buffers.fpu[k] = lookups.FPU(buffers.pop[k]);
    const ehspc = integrators.smooth_hsapc.step(k, constants.hsid);
    buffers.lmhs[k] = clip(lookups.LMHS2(ehspc), lookups.LMHS1(ehspc), t, healthPolicyStartYear);
    buffers.d[k] = k === 0 ? 0 : buffers.d1[k - 1] + buffers.d2[k - 1] + buffers.d3[k - 1] + buffers.d4[k - 1];
    buffers.cdr[k] = 1000 * buffers.d[k] / buffers.pop[k];
    const aiopc = integrators.smooth_iopc.step(k, constants.ieat);
    const diopc = integrators.dlinf3_iopc.step(k, constants.sad);
    buffers.sfsn[k] = lookups.SFSN(diopc);
    const ple = integrators.dlinf3_le.step(k, constants.lpd);
    buffers.cmple[k] = lookups.CMPLE(ple);
    const fcfpc = integrators.dlinf3_fcapc.step(k, constants.hsid);
    buffers.fce[k] = clip(1.0, lookups.FCE_TOCLIP(fcfpc), t, constants.fcest);
    buffers.cbr[k] = k === 0 ? 0 : 1000 * buffers.b[k - 1] / buffers.pop[k];
    return { aiopc, diopc };
}
export function computeCapitalStep(k, t, buffers, constants, lookups, integrators, policyYear) {
    const lufd = integrators.smooth_luf.step(k, constants.lufdt);
    buffers.cuf[k] = lookups.CUF(lufd);
    buffers.icdr[k] = buffers.ic[k] / clip(constants.alic2, constants.alic1, t, policyYear);
    const icor = clip(constants.icor2, constants.icor1, t, policyYear);
    buffers.scdr[k] = buffers.sc[k] / clip(constants.alsc2, constants.alsc1, t, policyYear);
    const scor = clip(constants.scor2, constants.scor1, t, policyYear);
    buffers.so[k] = buffers.sc[k] * buffers.cuf[k] / scor;
    buffers.sopc[k] = buffers.so[k] / buffers.pop[k];
    buffers.pjss[k] = buffers.sc[k] * lookups.JPSCU(buffers.sopc[k]);
    buffers.lf[k] = (buffers.p2[k] + buffers.p3[k]) * constants.lfpf;
    return { icor, scor };
}
export function computeAgricultureStep(k, t, buffers, constants, lookups, integrators, policyYear) {
    const alai = clip(constants.alai2, constants.alai1, t, policyYear);
    buffers.ai[k] = integrators.smooth_cai.step(k, alai);
    buffers.pfr[k] = integrators.smooth_fr.step(k, constants.fspd);
    buffers.falm[k] = lookups.FALM(buffers.pfr[k]);
    buffers.aiph[k] = buffers.ai[k] * (1 - buffers.falm[k]) / buffers.al[k];
    const lymc = lookups.LYMC(buffers.aiph[k]);
    const lyf = clip(constants.lyf2, constants.lyf1, t, policyYear);
    const lfrt = lookups.LFRT(buffers.falm[k]);
    return { alai, lymc, lyf, lfrt };
}
export function computePollutionStep(k, t, buffers, constants, lookups, integrators, policyYear) {
    buffers.ppolx[k] = buffers.ppol[k] / constants.ppol70;
    buffers.ppgao[k] = buffers.aiph[k] * buffers.al[k] * constants.fipm * constants.amti;
    const ppgf = clip(constants.ppgf2, constants.ppgf1, t, policyYear);
    const pptd = clip(constants.pptd2, constants.pptd1, t, policyYear);
    buffers.ppapr[k] = integrators.delay3_ppgr.step(k, pptd);
    const ahlm = lookups.AHLM(buffers.ppolx[k]);
    buffers.ppasr[k] = buffers.ppol[k] / (ahlm * constants.ahl70 * 1.4);
    return { ppgf };
}
export function computeResourceStep(k, t, buffers, constants, lookups, policyYear) {
    const context = { k, dt: 0, buffers, constants };
    const [nrfrEquation] = WORLD3_RESOURCE_DERIVED_EQUATIONS;
    buffers.nrfr[k] = nrfrEquation.compute(context);
    buffers.fcaor[k] = clip(lookups.FCAOR2(buffers.nrfr[k]), lookups.FCAOR1(buffers.nrfr[k]), t, policyYear);
    return { nruf: clip(constants.nruf2, constants.nruf1, t, policyYear) };
}
export function computeCrossSectorStep(k, t, buffers, constants, lookups, capital, agriculture, resources, policyYear) {
    buffers.hsapc[k] = lookups.HSAPC(buffers.sopc[k]);
    buffers.io[k] = buffers.ic[k] * (1 - buffers.fcaor[k]) * buffers.cuf[k] / capital.icor;
    buffers.iopc[k] = buffers.io[k] / buffers.pop[k];
    buffers.fioac[k] = clip(lookups.FIOACV(buffers.iopc[k] / constants.iopcd), clip(constants.fioac2, constants.fioac1, t, policyYear), t, constants.iet);
    const isopc = clip(lookups.ISOPC2(buffers.iopc[k]), lookups.ISOPC1(buffers.iopc[k]), t, policyYear);
    buffers.fioas[k] = clip(lookups.FIOAS2(buffers.sopc[k] / isopc), lookups.FIOAS1(buffers.sopc[k] / isopc), t, policyYear);
    buffers.scir[k] = buffers.io[k] * buffers.fioas[k];
    buffers.pjis[k] = buffers.ic[k] * lookups.JPICU(buffers.iopc[k]);
    buffers.pjas[k] = lookups.JPH(buffers.aiph[k]) * buffers.al[k];
    buffers.j[k] = buffers.pjis[k] + buffers.pjas[k] + buffers.pjss[k];
    buffers.luf[k] = buffers.j[k] / buffers.lf[k];
    buffers.ifpc[k] = clip(lookups.IFPC2(buffers.iopc[k]), lookups.IFPC1(buffers.iopc[k]), t, policyYear);
    buffers.lymap[k] = clip(lookups.LYMAP2(buffers.io[k] / constants.io70), lookups.LYMAP1(buffers.io[k] / constants.io70), t, policyYear);
    buffers.lfd[k] = buffers.lfert[k] * lookups.LFDR(buffers.ppolx[k]);
    buffers.ly[k] = agriculture.lyf * buffers.lfert[k] * agriculture.lymc * buffers.lymap[k];
    buffers.llmy[k] = clip(lookups.LLMY2(buffers.ly[k] / constants.ilf), lookups.LLMY1(buffers.ly[k] / constants.ilf), t, policyYear);
    buffers.lrui[k] = Math.max(0, (lookups.UILPC(buffers.iopc[k]) * buffers.pop[k] - buffers.uil[k]) / constants.uildt);
    buffers.lfr[k] = (constants.ilf - buffers.lfert[k]) / agriculture.lfrt;
    const pcrum = lookups.PCRUM(buffers.iopc[k]);
    buffers.nrur[k] = buffers.pop[k] * pcrum * resources.nruf;
    return { pcrum };
}
export function computePopulationFeedbackStep(k, t, buffers, constants, lookups, leading, agriculture, pollution, crossSector, policyYear) {
    const cmi = lookups.CMI(buffers.iopc[k]);
    buffers.lmc[k] = 1 - cmi * buffers.fpu[k];
    const fie = leading.aiopc === 0 ? 0 : (buffers.iopc[k] - leading.aiopc) / leading.aiopc;
    buffers.dcfs[k] = clip(2.0, constants.dcfsn * lookups.FRSN(fie) * buffers.sfsn[k], t, constants.zpgt);
    buffers.dtf[k] = buffers.dcfs[k] * buffers.cmple[k];
    buffers.f[k] = buffers.ly[k] * buffers.al[k] * constants.lfh * (1 - constants.pl);
    buffers.fpc[k] = buffers.f[k] / buffers.pop[k];
    buffers.fioaa[k] = clip(lookups.FIOAA2(buffers.fpc[k] / buffers.ifpc[k]), lookups.FIOAA1(buffers.fpc[k] / buffers.ifpc[k]), t, policyYear);
    buffers.tai[k] = buffers.io[k] * buffers.fioaa[k];
    const mpai = agriculture.alai * buffers.ly[k] * lookups.MLYMC(buffers.aiph[k]) / agriculture.lymc;
    const mpld = buffers.ly[k] / (lookups.DCPH(buffers.pal[k] / constants.palt) * constants.sd);
    const fiald = lookups.FIALD(mpld / mpai);
    buffers.ldr[k] = buffers.tai[k] * fiald / lookups.DCPH(buffers.pal[k] / constants.palt);
    buffers.cai[k] = buffers.tai[k] * (1 - fiald);
    buffers.fr[k] = buffers.fpc[k] / constants.sfpc;
    buffers.ler[k] = buffers.al[k] / (constants.alln * buffers.llmy[k]);
    buffers.ppgr[k] = (crossSector.pcrum * buffers.pop[k] * constants.frpm * constants.imef * constants.imti + buffers.ppgao[k]) * pollution.ppgf;
    const lmf = lookups.LMF(buffers.fpc[k] / constants.sfpc);
    const lmp = lookups.LMP(buffers.ppolx[k]);
    buffers.le[k] = constants.len * lmf * buffers.lmhs[k] * lmp * buffers.lmc[k];
}
export function computeMortalityAndBirthStep(k, t, buffers, constants, lookups) {
    buffers.m1[k] = lookups.M1(buffers.le[k]);
    buffers.m2[k] = lookups.M2(buffers.le[k]);
    buffers.m3[k] = lookups.M3(buffers.le[k]);
    buffers.m4[k] = lookups.M4(buffers.le[k]);
    buffers.mat1[k] = buffers.p1[k] * (1 - buffers.m1[k]) / 15;
    buffers.mat2[k] = buffers.p2[k] * (1 - buffers.m2[k]) / 30;
    buffers.mat3[k] = buffers.p3[k] * (1 - buffers.m3[k]) / 20;
    buffers.d1[k] = buffers.p1[k] * buffers.m1[k];
    buffers.d2[k] = buffers.p2[k] * buffers.m2[k];
    buffers.d3[k] = buffers.p3[k] * buffers.m3[k];
    buffers.d4[k] = buffers.p4[k] * buffers.m4[k];
    const fm = lookups.FM(buffers.le[k]);
    buffers.mtf[k] = constants.mtfn * fm;
    buffers.fcapc[k] = lookups.FSAFC(buffers.mtf[k] / buffers.dtf[k] - 1) * buffers.sopc[k];
    buffers.tf[k] = Math.min(buffers.mtf[k], buffers.mtf[k] * (1 - buffers.fce[k]) + buffers.dtf[k] * buffers.fce[k]);
    buffers.b[k] = clip(buffers.d[k], buffers.tf[k] * buffers.p2[k] * 0.5 / constants.rlt, t, constants.pet);
    buffers.fioai[k] = 1 - buffers.fioaa[k] - buffers.fioas[k] - buffers.fioac[k];
    buffers.icir[k] = buffers.io[k] * buffers.fioai[k];
}
