import { CAPITAL_HIDDEN_SERIES, createAlicDerivedDefinition, createAlscDerivedDefinition, createCapitalIoDerivedDefinition, createCapitalSoDerivedDefinition, createCufDerivedDefinition, createFioacDerivedDefinition, createFioaiDerivedDefinition, createFioasDerivedDefinition, createIcdrDerivedDefinition, createIcirDerivedDefinition, createIcorDerivedDefinition, createIopcDerivedDefinition, createIsopcDerivedDefinition, createScdrDerivedDefinition, createScirDerivedDefinition, createScorDerivedDefinition, createSopcDerivedDefinition, } from "./capital-sector.js";
import { RESOURCE_HIDDEN_SERIES, createFcaorDerivedDefinition, createNrResourceUsageRateDefinition, createNrufDerivedDefinition, createPcrumDerivedDefinition, } from "./resource-sector.js";
function requireSeries(sourceFrame, variable) {
    const values = sourceFrame.series.get(variable);
    if (!values) {
        throw new Error(`Fixture-backed runtime cannot derive coupled capital-resource values because the source variable '${variable}' is missing.`);
    }
    return values;
}
function createRuntimeObservation(index, time, values) {
    return { index, time, values };
}
export function computeCoupledCapitalResourceSeries(sourceFrame, prepared, constantsUsed) {
    const fioacvLookup = prepared.lookupLibrary.get("FIOACV");
    const isopc1Lookup = prepared.lookupLibrary.get("ISOPC1");
    const isopc2Lookup = prepared.lookupLibrary.get("ISOPC2");
    const fioas1Lookup = prepared.lookupLibrary.get("FIOAS1");
    const fioas2Lookup = prepared.lookupLibrary.get("FIOAS2");
    const cufLookup = prepared.lookupLibrary.get("CUF");
    const fcaor1Lookup = prepared.lookupLibrary.get("FCAOR1");
    const fcaor2Lookup = prepared.lookupLibrary.get("FCAOR2");
    const pcrumLookup = prepared.lookupLibrary.get("PCRUM");
    if (!fioacvLookup ||
        !isopc1Lookup ||
        !isopc2Lookup ||
        !fioas1Lookup ||
        !fioas2Lookup ||
        !cufLookup ||
        !fcaor1Lookup ||
        !fcaor2Lookup ||
        !pcrumLookup) {
        throw new Error("Fixture-backed runtime cannot derive coupled capital-resource values because the required lookups are incomplete.");
    }
    const pop = requireSeries(sourceFrame, "pop");
    const fioaa = requireSeries(sourceFrame, "fioaa");
    const luf = requireSeries(sourceFrame, "luf");
    const nrSeed = requireSeries(sourceFrame, "nr");
    const fcaorSeries = sourceFrame.series.get("fcaor");
    const alicDefinition = createAlicDerivedDefinition(constantsUsed);
    const alscDefinition = createAlscDerivedDefinition(constantsUsed);
    const cufDefinition = createCufDerivedDefinition(cufLookup);
    const icorDefinition = createIcorDerivedDefinition(constantsUsed);
    const scorDefinition = createScorDerivedDefinition(constantsUsed);
    const ioDefinition = createCapitalIoDerivedDefinition();
    const iopcDefinition = createIopcDerivedDefinition();
    const fcaorDefinition = createFcaorDerivedDefinition(constantsUsed, fcaor1Lookup, fcaor2Lookup);
    const fioacDefinition = createFioacDerivedDefinition(constantsUsed, fioacvLookup);
    const isopcDefinition = createIsopcDerivedDefinition(isopc1Lookup, isopc2Lookup);
    const soDefinition = createCapitalSoDerivedDefinition();
    const sopcDefinition = createSopcDerivedDefinition();
    const fioasDefinition = createFioasDerivedDefinition(fioas1Lookup, fioas2Lookup);
    const fioaiDefinition = createFioaiDerivedDefinition();
    const scirDefinition = createScirDerivedDefinition();
    const icirDefinition = createIcirDerivedDefinition();
    const icdrDefinition = createIcdrDerivedDefinition();
    const scdrDefinition = createScdrDerivedDefinition();
    const nrufDefinition = createNrufDerivedDefinition(constantsUsed, prepared.request.pyear);
    const pcrumDefinition = createPcrumDerivedDefinition(pcrumLookup);
    const nrRateDefinition = createNrResourceUsageRateDefinition();
    const io = new Float64Array(sourceFrame.time.length);
    const iopc = new Float64Array(sourceFrame.time.length);
    const so = new Float64Array(sourceFrame.time.length);
    const sopc = new Float64Array(sourceFrame.time.length);
    const alic = new Float64Array(sourceFrame.time.length);
    const alsc = new Float64Array(sourceFrame.time.length);
    const cuf = new Float64Array(sourceFrame.time.length);
    const fioac = new Float64Array(sourceFrame.time.length);
    const fioai = new Float64Array(sourceFrame.time.length);
    const ic = new Float64Array(sourceFrame.time.length);
    const icdr = new Float64Array(sourceFrame.time.length);
    const icor = new Float64Array(sourceFrame.time.length);
    const fioas = new Float64Array(sourceFrame.time.length);
    const icir = new Float64Array(sourceFrame.time.length);
    const isopc = new Float64Array(sourceFrame.time.length);
    const sc = new Float64Array(sourceFrame.time.length);
    const scor = new Float64Array(sourceFrame.time.length);
    const scdr = new Float64Array(sourceFrame.time.length);
    const scir = new Float64Array(sourceFrame.time.length);
    const nr = new Float64Array(sourceFrame.time.length);
    const nruf = new Float64Array(sourceFrame.time.length);
    const pcrum = new Float64Array(sourceFrame.time.length);
    const nrRate = new Float64Array(sourceFrame.time.length);
    let currentIc = constantsUsed.ici ?? 0;
    let currentSc = constantsUsed.sci ?? 0;
    let currentNr = nrSeed[0] ?? 0;
    for (let index = 0; index < sourceFrame.time.length; index += 1) {
        const time = sourceFrame.time[index];
        const popValue = pop[index];
        const fioaaValue = fioaa[index];
        const lufValue = luf[index];
        if (time === undefined ||
            popValue === undefined ||
            fioaaValue === undefined ||
            lufValue === undefined) {
            throw new Error("Fixture-backed runtime is missing a source value for coupled capital-resource execution.");
        }
        const values = {
            nr: currentNr,
            pop: popValue,
            fioaa: fioaaValue,
            luf: lufValue,
            [CAPITAL_HIDDEN_SERIES.ic]: currentIc,
            [CAPITAL_HIDDEN_SERIES.sc]: currentSc,
        };
        const observedFcaorValue = fcaorSeries?.[index];
        values.fcaor =
            observedFcaorValue ??
                fcaorDefinition.derive(createRuntimeObservation(index, time, values));
        const observation = createRuntimeObservation(index, time, values);
        alic[index] = alicDefinition.derive(observation);
        values[CAPITAL_HIDDEN_SERIES.alic] = alic[index] ?? 0;
        alsc[index] = alscDefinition.derive(observation);
        values[CAPITAL_HIDDEN_SERIES.alsc] = alsc[index] ?? 0;
        cuf[index] = cufDefinition.derive(observation);
        values[CAPITAL_HIDDEN_SERIES.cuf] = cuf[index] ?? 0;
        icor[index] = icorDefinition.derive(observation);
        values[CAPITAL_HIDDEN_SERIES.icor] = icor[index] ?? 0;
        scor[index] = scorDefinition.derive(observation);
        values[CAPITAL_HIDDEN_SERIES.scor] = scor[index] ?? 0;
        io[index] = ioDefinition.derive(observation);
        values.io = io[index] ?? 0;
        iopc[index] = iopcDefinition.derive(observation);
        values.iopc = iopc[index] ?? 0;
        fioac[index] = fioacDefinition.derive(observation);
        values[CAPITAL_HIDDEN_SERIES.fioac] = fioac[index] ?? 0;
        isopc[index] = isopcDefinition.derive(observation);
        values[CAPITAL_HIDDEN_SERIES.isopc] = isopc[index] ?? 0;
        so[index] = soDefinition.derive(observation);
        values.so = so[index] ?? 0;
        sopc[index] = sopcDefinition.derive(observation);
        values.sopc = sopc[index] ?? 0;
        fioas[index] = fioasDefinition.derive(observation);
        values[CAPITAL_HIDDEN_SERIES.fioas] = fioas[index] ?? 0;
        fioai[index] = fioaiDefinition.derive(observation);
        values[CAPITAL_HIDDEN_SERIES.fioai] = fioai[index] ?? 0;
        scir[index] = scirDefinition.derive(observation);
        values[CAPITAL_HIDDEN_SERIES.scir] = scir[index] ?? 0;
        icir[index] = icirDefinition.derive(observation);
        values[CAPITAL_HIDDEN_SERIES.icir] = icir[index] ?? 0;
        icdr[index] = icdrDefinition.derive(observation);
        values[CAPITAL_HIDDEN_SERIES.icdr] = icdr[index] ?? 0;
        scdr[index] = scdrDefinition.derive(observation);
        values[CAPITAL_HIDDEN_SERIES.scdr] = scdr[index] ?? 0;
        nr[index] = currentNr;
        ic[index] = currentIc;
        sc[index] = currentSc;
        nruf[index] = nrufDefinition.derive(observation);
        values[RESOURCE_HIDDEN_SERIES.nruf] = nruf[index] ?? 0;
        pcrum[index] = pcrumDefinition.derive(observation);
        values[RESOURCE_HIDDEN_SERIES.pcrum] = pcrum[index] ?? 0;
        nrRate[index] = nrRateDefinition.derive(observation);
        values[RESOURCE_HIDDEN_SERIES.nrRate] = nrRate[index] ?? 0;
        const nextTime = sourceFrame.time[index + 1];
        if (nextTime !== undefined) {
            const dt = nextTime - time;
            currentIc = currentIc + dt * (icir[index] - icdr[index]);
            currentSc = currentSc + dt * (scir[index] - scdr[index]);
            currentNr = currentNr - dt * nrRate[index];
        }
    }
    return {
        nr,
        io,
        iopc,
        so,
        sopc,
        [CAPITAL_HIDDEN_SERIES.alic]: alic,
        [CAPITAL_HIDDEN_SERIES.alsc]: alsc,
        [CAPITAL_HIDDEN_SERIES.cuf]: cuf,
        [CAPITAL_HIDDEN_SERIES.fioac]: fioac,
        [CAPITAL_HIDDEN_SERIES.fioai]: fioai,
        [CAPITAL_HIDDEN_SERIES.ic]: ic,
        [CAPITAL_HIDDEN_SERIES.icdr]: icdr,
        [CAPITAL_HIDDEN_SERIES.icor]: icor,
        [CAPITAL_HIDDEN_SERIES.fioas]: fioas,
        [CAPITAL_HIDDEN_SERIES.icir]: icir,
        [CAPITAL_HIDDEN_SERIES.isopc]: isopc,
        [CAPITAL_HIDDEN_SERIES.sc]: sc,
        [CAPITAL_HIDDEN_SERIES.scor]: scor,
        [CAPITAL_HIDDEN_SERIES.scdr]: scdr,
        [CAPITAL_HIDDEN_SERIES.scir]: scir,
        [RESOURCE_HIDDEN_SERIES.nruf]: nruf,
        [RESOURCE_HIDDEN_SERIES.pcrum]: pcrum,
        [RESOURCE_HIDDEN_SERIES.nrRate]: nrRate,
    };
}
