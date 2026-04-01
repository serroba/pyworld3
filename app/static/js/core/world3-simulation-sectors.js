import { defineEquationPhase, defineDerivedEquation, defineDerivedStock, defineRuntimePhase, defineRuntimeValue, defineStateStock, requireWorld3RuntimeValue, runWorld3ExecutionPhase, } from "./world3-equation-dsl.js";
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
    defineDerivedEquation({
        key: "fcaor",
        inputs: ["nrfr"],
        compute: ({ k, t, buffers, lookups, policyYear }) => clip(lookups.FCAOR2(buffers.nrfr[k]), lookups.FCAOR1(buffers.nrfr[k]), t, policyYear),
    }),
];
export const WORLD3_POPULATION_FLOW_EQUATIONS = [
    defineDerivedEquation({
        key: "m1",
        inputs: ["le"],
        compute: ({ k, buffers, lookups }) => lookups.M1(buffers.le[k]),
    }),
    defineDerivedEquation({
        key: "m2",
        inputs: ["le"],
        compute: ({ k, buffers, lookups }) => lookups.M2(buffers.le[k]),
    }),
    defineDerivedEquation({
        key: "m3",
        inputs: ["le"],
        compute: ({ k, buffers, lookups }) => lookups.M3(buffers.le[k]),
    }),
    defineDerivedEquation({
        key: "m4",
        inputs: ["le"],
        compute: ({ k, buffers, lookups }) => lookups.M4(buffers.le[k]),
    }),
    defineDerivedEquation({
        key: "mat1",
        inputs: ["p1", "m1"],
        compute: ({ k, buffers }) => buffers.p1[k] * (1 - buffers.m1[k]) / 15,
    }),
    defineDerivedEquation({
        key: "mat2",
        inputs: ["p2", "m2"],
        compute: ({ k, buffers }) => buffers.p2[k] * (1 - buffers.m2[k]) / 30,
    }),
    defineDerivedEquation({
        key: "mat3",
        inputs: ["p3", "m3"],
        compute: ({ k, buffers }) => buffers.p3[k] * (1 - buffers.m3[k]) / 20,
    }),
    defineDerivedEquation({
        key: "d1",
        inputs: ["p1", "m1"],
        compute: ({ k, buffers }) => buffers.p1[k] * buffers.m1[k],
    }),
    defineDerivedEquation({
        key: "d2",
        inputs: ["p2", "m2"],
        compute: ({ k, buffers }) => buffers.p2[k] * buffers.m2[k],
    }),
    defineDerivedEquation({
        key: "d3",
        inputs: ["p3", "m3"],
        compute: ({ k, buffers }) => buffers.p3[k] * buffers.m3[k],
    }),
    defineDerivedEquation({
        key: "d4",
        inputs: ["p4", "m4"],
        compute: ({ k, buffers }) => buffers.p4[k] * buffers.m4[k],
    }),
];
export const WORLD3_CAPITAL_FLOW_EQUATIONS = [
    defineDerivedEquation({
        key: "icdr",
        inputs: ["ic", "alic1", "alic2"],
        compute: ({ k, t, buffers, constants, policyYear }) => buffers.ic[k] / clip(constants.alic2, constants.alic1, t, policyYear),
    }),
    defineDerivedEquation({
        key: "scdr",
        inputs: ["sc", "alsc1", "alsc2"],
        compute: ({ k, t, buffers, constants, policyYear }) => buffers.sc[k] / clip(constants.alsc2, constants.alsc1, t, policyYear),
    }),
    defineDerivedEquation({
        key: "so",
        inputs: ["sc", "cuf", "scor1", "scor2"],
        compute: ({ k, t, buffers, constants, policyYear }) => {
            const scor = clip(constants.scor2, constants.scor1, t, policyYear);
            return buffers.sc[k] * buffers.cuf[k] / scor;
        },
    }),
    defineDerivedEquation({
        key: "sopc",
        inputs: ["so", "pop"],
        compute: ({ k, buffers }) => buffers.so[k] / buffers.pop[k],
    }),
];
export const WORLD3_CAPITAL_ALLOCATION_EQUATIONS = [
    defineDerivedEquation({
        key: "fioac",
        inputs: ["iopc", "iopcd", "fioac1", "fioac2"],
        compute: ({ k, t, buffers, constants, lookups }) => clip(lookups.FIOACV(buffers.iopc[k] / constants.iopcd), clip(constants.fioac2, constants.fioac1, t, constants.iet), t, constants.iet),
    }),
    defineDerivedEquation({
        key: "fioas",
        inputs: ["sopc"],
        compute: ({ k, t, buffers, lookups, policyYear }) => {
            const isopc = clip(lookups.ISOPC2(buffers.iopc[k]), lookups.ISOPC1(buffers.iopc[k]), t, policyYear);
            return clip(lookups.FIOAS2(buffers.sopc[k] / isopc), lookups.FIOAS1(buffers.sopc[k] / isopc), t, policyYear);
        },
    }),
    defineDerivedEquation({
        key: "scir",
        inputs: ["io", "fioas"],
        compute: ({ k, buffers }) => buffers.io[k] * buffers.fioas[k],
    }),
];
export const WORLD3_CAPITAL_INVESTMENT_EQUATIONS = [
    defineDerivedEquation({
        key: "fioai",
        inputs: ["fioaa", "fioas", "fioac"],
        compute: ({ k, buffers }) => 1 - buffers.fioaa[k] - buffers.fioas[k] - buffers.fioac[k],
    }),
    defineDerivedEquation({
        key: "icir",
        inputs: ["io", "fioai"],
        compute: ({ k, buffers }) => buffers.io[k] * buffers.fioai[k],
    }),
];
export const WORLD3_POPULATION_BIRTH_EQUATIONS = [
    defineDerivedEquation({
        key: "mtf",
        inputs: ["le", "mtfn"],
        compute: ({ k, buffers, constants, lookups }) => constants.mtfn * lookups.FM(buffers.le[k]),
    }),
    defineDerivedEquation({
        key: "fcapc",
        inputs: ["mtf", "dtf", "sopc"],
        compute: ({ k, buffers, lookups }) => lookups.FSAFC(buffers.mtf[k] / buffers.dtf[k] - 1) * buffers.sopc[k],
    }),
    defineDerivedEquation({
        key: "tf",
        inputs: ["mtf", "dtf", "fce"],
        compute: ({ k, buffers }) => Math.min(buffers.mtf[k], buffers.mtf[k] * (1 - buffers.fce[k]) + buffers.dtf[k] * buffers.fce[k]),
    }),
    defineDerivedEquation({
        key: "b",
        inputs: ["d", "tf", "p2", "rlt"],
        compute: ({ k, t, buffers, constants }) => clip(buffers.d[k], buffers.tf[k] * buffers.p2[k] * 0.5 / constants.rlt, t, constants.pet),
    }),
];
export const WORLD3_POPULATION_LEADING_EQUATIONS = [
    defineDerivedEquation({
        key: "fpu",
        inputs: ["pop"],
        compute: ({ k, buffers, lookups }) => lookups.FPU(buffers.pop[k]),
    }),
    defineDerivedEquation({
        key: "lmhs",
        inputs: [],
        compute: (context) => {
            const ehspc = requireWorld3RuntimeValue(context, "ehspc");
            return clip(context.lookups.LMHS2(ehspc), context.lookups.LMHS1(ehspc), context.t, context.policyYear);
        },
    }),
    defineDerivedEquation({
        key: "d",
        inputs: ["d1", "d2", "d3", "d4"],
        compute: ({ k, buffers }) => k === 0 ? 0 : buffers.d1[k - 1] + buffers.d2[k - 1] + buffers.d3[k - 1] + buffers.d4[k - 1],
    }),
    defineDerivedEquation({
        key: "cdr",
        inputs: ["d", "pop"],
        compute: ({ k, buffers }) => 1000 * buffers.d[k] / buffers.pop[k],
    }),
    defineDerivedEquation({
        key: "sfsn",
        inputs: [],
        compute: (context) => context.lookups.SFSN(requireWorld3RuntimeValue(context, "diopc")),
    }),
    defineDerivedEquation({
        key: "cmple",
        inputs: [],
        compute: (context) => context.lookups.CMPLE(requireWorld3RuntimeValue(context, "ple")),
    }),
    defineDerivedEquation({
        key: "fce",
        inputs: ["fcest"],
        compute: (context) => clip(1.0, context.lookups.FCE_TOCLIP(requireWorld3RuntimeValue(context, "fcfpc")), context.t, context.constants.fcest),
    }),
    defineDerivedEquation({
        key: "cbr",
        inputs: ["b", "pop"],
        compute: ({ k, buffers }) => (k === 0 ? 0 : 1000 * buffers.b[k - 1] / buffers.pop[k]),
    }),
];
export const WORLD3_AGRICULTURE_EQUATIONS = [
    defineDerivedEquation({
        key: "ai",
        inputs: [],
        compute: (context) => requireWorld3RuntimeValue(context, "ai"),
    }),
    defineDerivedEquation({
        key: "pfr",
        inputs: [],
        compute: (context) => requireWorld3RuntimeValue(context, "pfr"),
    }),
    defineDerivedEquation({
        key: "falm",
        inputs: ["pfr"],
        compute: ({ k, buffers, lookups }) => lookups.FALM(buffers.pfr[k]),
    }),
    defineDerivedEquation({
        key: "aiph",
        inputs: ["ai", "falm", "al"],
        compute: ({ k, buffers }) => buffers.ai[k] * (1 - buffers.falm[k]) / buffers.al[k],
    }),
];
export const WORLD3_POLLUTION_EQUATIONS = [
    defineDerivedEquation({
        key: "ppolx",
        inputs: ["ppol", "ppol70"],
        compute: ({ k, buffers, constants }) => buffers.ppol[k] / constants.ppol70,
    }),
    defineDerivedEquation({
        key: "ppgao",
        inputs: ["aiph", "al", "fipm", "amti"],
        compute: ({ k, buffers, constants }) => buffers.aiph[k] * buffers.al[k] * constants.fipm * constants.amti,
    }),
    defineDerivedEquation({
        key: "ppapr",
        inputs: [],
        compute: (context) => requireWorld3RuntimeValue(context, "ppapr"),
    }),
    defineDerivedEquation({
        key: "ppasr",
        inputs: ["ppol", "ppolx", "ahl70"],
        compute: ({ k, buffers, constants, lookups }) => {
            const ahlm = lookups.AHLM(buffers.ppolx[k]);
            return buffers.ppol[k] / (ahlm * constants.ahl70 * 1.4);
        },
    }),
];
export const WORLD3_CROSS_SECTOR_EQUATIONS = [
    defineDerivedEquation({
        key: "hsapc",
        inputs: ["sopc"],
        compute: ({ k, buffers, lookups }) => lookups.HSAPC(buffers.sopc[k]),
    }),
    defineDerivedEquation({
        key: "io",
        inputs: ["ic", "fcaor", "cuf"],
        compute: (context) => context.buffers.ic[context.k] *
            (1 - context.buffers.fcaor[context.k]) *
            context.buffers.cuf[context.k] /
            requireWorld3RuntimeValue(context, "icor"),
    }),
    defineDerivedEquation({
        key: "iopc",
        inputs: ["io", "pop"],
        compute: ({ k, buffers }) => buffers.io[k] / buffers.pop[k],
    }),
    defineDerivedEquation({
        key: "pjis",
        inputs: ["ic", "iopc"],
        compute: ({ k, buffers, lookups }) => buffers.ic[k] * lookups.JPICU(buffers.iopc[k]),
    }),
    defineDerivedEquation({
        key: "pjas",
        inputs: ["aiph", "al"],
        compute: ({ k, buffers, lookups }) => lookups.JPH(buffers.aiph[k]) * buffers.al[k],
    }),
    defineDerivedEquation({
        key: "j",
        inputs: ["pjis", "pjas", "pjss"],
        compute: ({ k, buffers }) => buffers.pjis[k] + buffers.pjas[k] + buffers.pjss[k],
    }),
    defineDerivedEquation({
        key: "luf",
        inputs: ["j", "lf"],
        compute: ({ k, buffers }) => buffers.j[k] / buffers.lf[k],
    }),
    defineDerivedEquation({
        key: "ifpc",
        inputs: ["iopc"],
        compute: ({ k, t, buffers, lookups, policyYear }) => clip(lookups.IFPC2(buffers.iopc[k]), lookups.IFPC1(buffers.iopc[k]), t, policyYear),
    }),
    defineDerivedEquation({
        key: "lymap",
        inputs: ["io", "io70"],
        compute: ({ k, t, buffers, constants, lookups, policyYear }) => clip(lookups.LYMAP2(buffers.io[k] / constants.io70), lookups.LYMAP1(buffers.io[k] / constants.io70), t, policyYear),
    }),
    defineDerivedEquation({
        key: "lfd",
        inputs: ["lfert", "ppolx"],
        compute: ({ k, buffers, lookups }) => buffers.lfert[k] * lookups.LFDR(buffers.ppolx[k]),
    }),
    defineDerivedEquation({
        key: "ly",
        inputs: ["lfert", "lymap"],
        compute: (context) => requireWorld3RuntimeValue(context, "lyf") *
            context.buffers.lfert[context.k] *
            requireWorld3RuntimeValue(context, "lymc") *
            context.buffers.lymap[context.k],
    }),
    defineDerivedEquation({
        key: "llmy",
        inputs: ["ly", "ilf"],
        compute: ({ k, t, buffers, constants, lookups, policyYear }) => clip(lookups.LLMY2(buffers.ly[k] / constants.ilf), lookups.LLMY1(buffers.ly[k] / constants.ilf), t, policyYear),
    }),
    defineDerivedEquation({
        key: "lrui",
        inputs: ["iopc", "pop", "uil", "uildt"],
        compute: ({ k, buffers, constants, lookups }) => Math.max(0, (lookups.UILPC(buffers.iopc[k]) * buffers.pop[k] - buffers.uil[k]) / constants.uildt),
    }),
    defineDerivedEquation({
        key: "lfr",
        inputs: ["lfert", "ilf"],
        compute: (context) => (context.constants.ilf - context.buffers.lfert[context.k]) /
            requireWorld3RuntimeValue(context, "lfrt"),
    }),
];
export const WORLD3_CROSS_SECTOR_RESOURCE_EQUATIONS = [
    defineDerivedEquation({
        key: "nrur",
        inputs: ["pop"],
        compute: (context) => context.buffers.pop[context.k] *
            requireWorld3RuntimeValue(context, "pcrum") *
            requireWorld3RuntimeValue(context, "nruf"),
    }),
];
export const WORLD3_POPULATION_FEEDBACK_PRIMARY_EQUATIONS = [
    defineDerivedEquation({
        key: "lmc",
        inputs: ["fpu"],
        compute: (context) => 1 - requireWorld3RuntimeValue(context, "cmi") * context.buffers.fpu[context.k],
    }),
    defineDerivedEquation({
        key: "dcfs",
        inputs: ["sfsn", "dcfsn", "zpgt"],
        compute: (context) => clip(2.0, context.constants.dcfsn *
            context.lookups.FRSN(requireWorld3RuntimeValue(context, "fie")) *
            context.buffers.sfsn[context.k], context.t, context.constants.zpgt),
    }),
    defineDerivedEquation({
        key: "dtf",
        inputs: ["dcfs", "cmple"],
        compute: ({ k, buffers }) => buffers.dcfs[k] * buffers.cmple[k],
    }),
    defineDerivedEquation({
        key: "f",
        inputs: ["ly", "al"],
        compute: ({ k, buffers, constants }) => buffers.ly[k] * buffers.al[k] * constants.lfh * (1 - constants.pl),
    }),
    defineDerivedEquation({
        key: "fpc",
        inputs: ["f", "pop"],
        compute: ({ k, buffers }) => buffers.f[k] / buffers.pop[k],
    }),
    defineDerivedEquation({
        key: "fioaa",
        inputs: ["fpc", "ifpc"],
        compute: ({ k, t, buffers, lookups, policyYear }) => clip(lookups.FIOAA2(buffers.fpc[k] / buffers.ifpc[k]), lookups.FIOAA1(buffers.fpc[k] / buffers.ifpc[k]), t, policyYear),
    }),
    defineDerivedEquation({
        key: "tai",
        inputs: ["io", "fioaa"],
        compute: ({ k, buffers }) => buffers.io[k] * buffers.fioaa[k],
    }),
    defineDerivedEquation({
        key: "fr",
        inputs: ["fpc", "sfpc"],
        compute: ({ k, buffers, constants }) => buffers.fpc[k] / constants.sfpc,
    }),
];
export const WORLD3_POPULATION_FEEDBACK_LATE_EQUATIONS = [
    defineDerivedEquation({
        key: "ldr",
        inputs: ["tai", "pal", "palt"],
        compute: (context) => context.buffers.tai[context.k] *
            requireWorld3RuntimeValue(context, "fiald") /
            context.lookups.DCPH(context.buffers.pal[context.k] / context.constants.palt),
    }),
    defineDerivedEquation({
        key: "cai",
        inputs: ["tai"],
        compute: (context) => context.buffers.tai[context.k] * (1 - requireWorld3RuntimeValue(context, "fiald")),
    }),
    defineDerivedEquation({
        key: "ler",
        inputs: ["al", "llmy", "alln"],
        compute: ({ k, buffers, constants }) => buffers.al[k] / (constants.alln * buffers.llmy[k]),
    }),
    defineDerivedEquation({
        key: "ppgr",
        inputs: ["pop", "ppgao", "frpm", "imef", "imti"],
        compute: (context) => (requireWorld3RuntimeValue(context, "pcrum") *
            context.buffers.pop[context.k] *
            context.constants.frpm *
            context.constants.imef *
            context.constants.imti +
            context.buffers.ppgao[context.k]) *
            requireWorld3RuntimeValue(context, "ppgf"),
    }),
    defineDerivedEquation({
        key: "le",
        inputs: ["lmhs", "lmc", "len"],
        compute: (context) => context.constants.len *
            requireWorld3RuntimeValue(context, "lmf") *
            context.buffers.lmhs[context.k] *
            requireWorld3RuntimeValue(context, "lmp") *
            context.buffers.lmc[context.k],
    }),
];
export const WORLD3_CROSS_SECTOR_PHASES = [
    defineEquationPhase("cross-sector-primary", WORLD3_CROSS_SECTOR_EQUATIONS),
    defineRuntimePhase("cross-sector-runtime", [
        defineRuntimeValue({
            key: "pcrum",
            inputs: ["iopc"],
            compute: ({ k, buffers, lookups }) => lookups.PCRUM(buffers.iopc[k]),
        }),
    ]),
    defineEquationPhase("cross-sector-allocation", WORLD3_CAPITAL_ALLOCATION_EQUATIONS),
    defineEquationPhase("cross-sector-resource", WORLD3_CROSS_SECTOR_RESOURCE_EQUATIONS),
];
export const WORLD3_POPULATION_FEEDBACK_PHASES = [
    defineRuntimePhase("population-feedback-primary-runtime", [
        defineRuntimeValue({
            key: "cmi",
            inputs: ["iopc"],
            compute: ({ k, buffers, lookups }) => lookups.CMI(buffers.iopc[k]),
        }),
        defineRuntimeValue({
            key: "fie",
            inputs: ["iopc"],
            compute: (context) => {
                const aiopc = requireWorld3RuntimeValue(context, "aiopc");
                return aiopc === 0 ? 0 : (context.buffers.iopc[context.k] - aiopc) / aiopc;
            },
        }),
    ]),
    defineEquationPhase("population-feedback-primary", WORLD3_POPULATION_FEEDBACK_PRIMARY_EQUATIONS),
    defineRuntimePhase("population-feedback-late-runtime", [
        defineRuntimeValue({
            key: "mpai",
            inputs: ["ly", "aiph"],
            compute: (context) => requireWorld3RuntimeValue(context, "alai") *
                context.buffers.ly[context.k] *
                context.lookups.MLYMC(context.buffers.aiph[context.k]) /
                requireWorld3RuntimeValue(context, "lymc"),
        }),
        defineRuntimeValue({
            key: "mpld",
            inputs: ["ly", "pal", "palt", "sd"],
            compute: ({ k, buffers, constants, lookups }) => buffers.ly[k] / (lookups.DCPH(buffers.pal[k] / constants.palt) * constants.sd),
        }),
        defineRuntimeValue({
            key: "fiald",
            inputs: [],
            compute: (context) => context.lookups.FIALD(requireWorld3RuntimeValue(context, "mpld") / requireWorld3RuntimeValue(context, "mpai")),
        }),
        defineRuntimeValue({
            key: "lmf",
            inputs: ["fpc", "sfpc"],
            compute: ({ k, buffers, constants, lookups }) => lookups.LMF(buffers.fpc[k] / constants.sfpc),
        }),
        defineRuntimeValue({
            key: "lmp",
            inputs: ["ppolx"],
            compute: ({ k, buffers, lookups }) => lookups.LMP(buffers.ppolx[k]),
        }),
    ]),
    defineEquationPhase("population-feedback-late", WORLD3_POPULATION_FEEDBACK_LATE_EQUATIONS),
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
    const ehspc = integrators.smooth_hsapc.step(k, constants.hsid);
    const aiopc = integrators.smooth_iopc.step(k, constants.ieat);
    const diopc = integrators.dlinf3_iopc.step(k, constants.sad);
    const ple = integrators.dlinf3_le.step(k, constants.lpd);
    const fcfpc = integrators.dlinf3_fcapc.step(k, constants.hsid);
    const context = {
        k,
        dt: 0,
        buffers,
        constants,
        t,
        policyYear: healthPolicyStartYear,
        lookups,
        runtime: { ehspc, diopc, ple, fcfpc },
    };
    for (const equation of WORLD3_POPULATION_LEADING_EQUATIONS) {
        buffers[equation.key][k] = equation.compute(context);
    }
    return { aiopc, diopc };
}
export function computeCapitalStep(k, t, buffers, constants, lookups, integrators, policyYear) {
    const lufd = integrators.smooth_luf.step(k, constants.lufdt);
    buffers.cuf[k] = lookups.CUF(lufd);
    const icor = clip(constants.icor2, constants.icor1, t, policyYear);
    const scor = clip(constants.scor2, constants.scor1, t, policyYear);
    const context = {
        k,
        dt: 0,
        buffers,
        constants,
        t,
        policyYear,
        lookups,
    };
    for (const equation of WORLD3_CAPITAL_FLOW_EQUATIONS) {
        buffers[equation.key][k] = equation.compute(context);
    }
    buffers.pjss[k] = buffers.sc[k] * lookups.JPSCU(buffers.sopc[k]);
    buffers.lf[k] = (buffers.p2[k] + buffers.p3[k]) * constants.lfpf;
    return { icor, scor };
}
export function computeAgricultureStep(k, t, buffers, constants, lookups, integrators, policyYear) {
    const alai = clip(constants.alai2, constants.alai1, t, policyYear);
    const ai = integrators.smooth_cai.step(k, alai);
    const pfr = integrators.smooth_fr.step(k, constants.fspd);
    const context = {
        k,
        dt: 0,
        buffers,
        constants,
        t,
        policyYear,
        lookups,
        runtime: { alai, ai, pfr },
    };
    for (const equation of WORLD3_AGRICULTURE_EQUATIONS) {
        buffers[equation.key][k] = equation.compute(context);
    }
    const lymc = lookups.LYMC(buffers.aiph[k]);
    const lyf = clip(constants.lyf2, constants.lyf1, t, policyYear);
    const lfrt = lookups.LFRT(buffers.falm[k]);
    return { alai, lymc, lyf, lfrt };
}
export function computePollutionStep(k, t, buffers, constants, lookups, integrators, policyYear) {
    const ppgf = clip(constants.ppgf2, constants.ppgf1, t, policyYear);
    const pptd = clip(constants.pptd2, constants.pptd1, t, policyYear);
    const ppapr = integrators.delay3_ppgr.step(k, pptd);
    const context = {
        k,
        dt: 0,
        buffers,
        constants,
        t,
        policyYear,
        lookups,
        runtime: { ppgf, pptd, ppapr },
    };
    for (const equation of WORLD3_POLLUTION_EQUATIONS) {
        buffers[equation.key][k] = equation.compute(context);
    }
    return { ppgf };
}
export function computeResourceStep(k, t, buffers, constants, lookups, policyYear) {
    const context = {
        k,
        dt: 0,
        buffers,
        constants,
        t,
        policyYear,
        lookups,
    };
    for (const equation of WORLD3_RESOURCE_DERIVED_EQUATIONS) {
        buffers[equation.key][k] = equation.compute(context);
    }
    return { nruf: clip(constants.nruf2, constants.nruf1, t, policyYear) };
}
export function computeCrossSectorStep(k, t, buffers, constants, lookups, capital, agriculture, resources, policyYear) {
    const context = {
        k,
        dt: 0,
        buffers,
        constants,
        t,
        policyYear,
        lookups,
        runtime: {
            icor: capital.icor,
            lyf: agriculture.lyf,
            lymc: agriculture.lymc,
            lfrt: agriculture.lfrt,
            nruf: resources.nruf,
        },
    };
    for (const phase of WORLD3_CROSS_SECTOR_PHASES) {
        runWorld3ExecutionPhase(phase, context);
    }
    return { pcrum: requireWorld3RuntimeValue(context, "pcrum") };
}
export function computePopulationFeedbackStep(k, t, buffers, constants, lookups, leading, agriculture, pollution, crossSector, policyYear) {
    const context = {
        k,
        dt: 0,
        buffers,
        constants,
        t,
        policyYear,
        lookups,
        runtime: {
            aiopc: leading.aiopc,
            alai: agriculture.alai,
            lymc: agriculture.lymc,
            pcrum: crossSector.pcrum,
            ppgf: pollution.ppgf,
        },
    };
    for (const phase of WORLD3_POPULATION_FEEDBACK_PHASES) {
        runWorld3ExecutionPhase(phase, context);
    }
}
export function computeMortalityAndBirthStep(k, t, buffers, constants, lookups) {
    const context = { k, dt: 0, buffers, constants, t, policyYear: constants.pet, lookups };
    for (const equation of WORLD3_POPULATION_FLOW_EQUATIONS) {
        buffers[equation.key][k] = equation.compute(context);
    }
    for (const equation of WORLD3_POPULATION_BIRTH_EQUATIONS) {
        buffers[equation.key][k] = equation.compute(context);
    }
    for (const equation of WORLD3_CAPITAL_INVESTMENT_EQUATIONS) {
        buffers[equation.key][k] = equation.compute(context);
    }
}
