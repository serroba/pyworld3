import { RESOURCE_HIDDEN_SERIES, createFcaorDerivedDefinition, } from "./resource-sector.js";
const DEFAULT_CAPITAL_POLICY_YEAR = 1975;
export const CAPITAL_INTERNAL_SERIES = {
    averageLifetimeOfIndustrialCapital: "__alic",
    alic: "__alic",
    averageLifetimeOfServiceCapital: "__alsc",
    alsc: "__alsc",
    capitalUtilizationFraction: "__cuf",
    cuf: "__cuf",
    fractionOfIndustrialOutputAllocatedToConsumption: "__fioac",
    fioac: "__fioac",
    fractionOfIndustrialOutputAllocatedToIndustry: "__fioai",
    fioai: "__fioai",
    industrialCapital: "__ic",
    ic: "__ic",
    industrialCapitalDepreciationRate: "__icdr",
    icdr: "__icdr",
    industrialCapitalOutputRatio: "__icor",
    icor: "__icor",
    fractionOfIndustrialOutputAllocatedToServices: "__fioas",
    fioas: "__fioas",
    industrialCapitalInvestmentRate: "__icir",
    icir: "__icir",
    indicatedServiceOutputPerCapita: "__isopc",
    isopc: "__isopc",
    serviceCapital: "__sc",
    sc: "__sc",
    serviceCapitalOutputRatio: "__scor",
    scor: "__scor",
    serviceCapitalDepreciationRate: "__scdr",
    scdr: "__scdr",
    serviceCapitalInvestmentRate: "__scir",
    scir: "__scir",
};
/** @deprecated Prefer CAPITAL_INTERNAL_SERIES for TypeScript-facing code. */
export const CAPITAL_HIDDEN_SERIES = CAPITAL_INTERNAL_SERIES;
function clipAtPolicyYear(beforeValue, afterValue, time, policyYear) {
    return time > policyYear ? afterValue : beforeValue;
}
function projectSeriesValues(values, indices, name) {
    return Float64Array.from(indices.map((index) => {
        const value = values[index];
        if (value === undefined) {
            throw new Error(`Fixture series '${name}' is missing a value at index ${index}.`);
        }
        return value;
    }));
}
function deriveSeriesValues(frame, definition) {
    const values = new Float64Array(frame.time.length);
    for (let index = 0; index < frame.time.length; index += 1) {
        const time = frame.time[index];
        if (time === undefined) {
            throw new Error(`Runtime state frame index ${index} is out of bounds.`);
        }
        const observationValues = Object.fromEntries(Array.from(frame.series.entries(), ([name, series]) => {
            const value = series[index];
            if (value === undefined) {
                throw new Error(`Runtime state frame series '${name}' is missing a value at index ${index}.`);
            }
            return [name, value];
        }));
        values[index] = definition.derive({
            index,
            time,
            values: observationValues,
        });
    }
    return values;
}
function populateStockValues(time, initialValue, inflow, lifetime) {
    const values = new Float64Array(time.length);
    if (values.length === 0) {
        return values;
    }
    values[0] = initialValue;
    let currentValue = initialValue;
    for (let index = 0; index < time.length - 1; index += 1) {
        const currentTime = time[index];
        const nextTime = time[index + 1];
        const inflowValue = inflow[index];
        const lifetimeValue = lifetime[index];
        if (currentTime === undefined ||
            nextTime === undefined ||
            inflowValue === undefined ||
            lifetimeValue === undefined) {
            throw new Error("Capital stock stepping is missing a source value.");
        }
        const dt = nextTime - currentTime;
        const depreciation = lifetimeValue === 0 ? 0 : currentValue / lifetimeValue;
        currentValue = currentValue + dt * (inflowValue - depreciation);
        values[index + 1] = currentValue;
    }
    return values;
}
export function createIoDerivedDefinition() {
    return {
        variable: "io",
        derive: (observation) => {
            const pop = observation.values.pop;
            const iopc = observation.values.iopc;
            if (pop === undefined) {
                throw new Error("Fixture-backed runtime cannot derive 'io' because the source variable 'pop' is missing.");
            }
            if (iopc === undefined) {
                throw new Error("Fixture-backed runtime cannot derive 'io' because the source variable 'iopc' is missing.");
            }
            return pop * iopc;
        },
    };
}
export function createCapitalIoDerivedDefinition() {
    return {
        variable: "io",
        derive: (observation) => {
            const ic = observation.values[CAPITAL_HIDDEN_SERIES.ic];
            const fcaor = observation.values.fcaor;
            const cuf = observation.values[CAPITAL_HIDDEN_SERIES.cuf];
            const icor = observation.values[CAPITAL_HIDDEN_SERIES.icor];
            if (ic === undefined) {
                throw new Error("Fixture-backed runtime cannot derive 'io' because the source variable '__ic' is missing.");
            }
            if (fcaor === undefined) {
                throw new Error("Fixture-backed runtime cannot derive 'io' because the source variable 'fcaor' is missing.");
            }
            if (cuf === undefined) {
                throw new Error("Fixture-backed runtime cannot derive 'io' because the source variable '__cuf' is missing.");
            }
            if (icor === undefined || icor === 0) {
                throw new Error("Fixture-backed runtime cannot derive 'io' because the source variable '__icor' is missing or zero.");
            }
            return ic * (1 - fcaor) * cuf / icor;
        },
    };
}
export function createIopcDerivedDefinition() {
    return {
        variable: "iopc",
        derive: (observation) => {
            const io = observation.values.io;
            const pop = observation.values.pop;
            if (io === undefined) {
                throw new Error("Fixture-backed runtime cannot derive 'iopc' because the source variable 'io' is missing.");
            }
            if (pop === undefined || pop === 0) {
                throw new Error("Fixture-backed runtime cannot derive 'iopc' because the source variable 'pop' is missing or zero.");
            }
            return io / pop;
        },
    };
}
export function createFioacDerivedDefinition(constantsUsed, fioacvLookup, policyYear = DEFAULT_CAPITAL_POLICY_YEAR) {
    return {
        variable: CAPITAL_HIDDEN_SERIES.fioac,
        derive: (observation) => {
            const iopc = observation.values.iopc;
            const iopcd = constantsUsed.iopcd;
            if (iopc === undefined) {
                throw new Error("Fixture-backed runtime cannot derive '__fioac' because the source variable 'iopc' is missing.");
            }
            if (iopcd === undefined || iopcd === 0) {
                throw new Error("Fixture-backed runtime cannot derive '__fioac' because constant 'iopcd' is missing or zero.");
            }
            const fioacv = fioacvLookup.evaluate(iopc / iopcd);
            const fioacc = clipAtPolicyYear(constantsUsed.fioac1 ?? 0.43, constantsUsed.fioac2 ?? 0.43, observation.time, policyYear);
            return clipAtPolicyYear(fioacc, fioacv, observation.time, constantsUsed.iet ?? 4000);
        },
    };
}
export function createAlicDerivedDefinition(constantsUsed, policyYear = DEFAULT_CAPITAL_POLICY_YEAR) {
    return {
        variable: CAPITAL_HIDDEN_SERIES.alic,
        derive: (observation) => clipAtPolicyYear(constantsUsed.alic1 ?? 14, constantsUsed.alic2 ?? 14, observation.time, policyYear),
    };
}
export function createAlscDerivedDefinition(constantsUsed, policyYear = DEFAULT_CAPITAL_POLICY_YEAR) {
    return {
        variable: CAPITAL_HIDDEN_SERIES.alsc,
        derive: (observation) => clipAtPolicyYear(constantsUsed.alsc1 ?? 20, constantsUsed.alsc2 ?? 20, observation.time, policyYear),
    };
}
export function createIsopcDerivedDefinition(isopc1Lookup, isopc2Lookup, policyYear = DEFAULT_CAPITAL_POLICY_YEAR) {
    return {
        variable: CAPITAL_HIDDEN_SERIES.isopc,
        derive: (observation) => {
            const iopc = observation.values.iopc;
            if (iopc === undefined) {
                throw new Error("Fixture-backed runtime cannot derive '__isopc' because the source variable 'iopc' is missing.");
            }
            return clipAtPolicyYear(isopc1Lookup.evaluate(iopc), isopc2Lookup.evaluate(iopc), observation.time, policyYear);
        },
    };
}
export function createSoDerivedDefinition() {
    return {
        variable: "so",
        derive: (observation) => {
            const pop = observation.values.pop;
            const sopc = observation.values.sopc;
            if (pop === undefined) {
                throw new Error("Fixture-backed runtime cannot derive 'so' because the source variable 'pop' is missing.");
            }
            if (sopc === undefined) {
                throw new Error("Fixture-backed runtime cannot derive 'so' because the source variable 'sopc' is missing.");
            }
            return pop * sopc;
        },
    };
}
export function createCapitalSoDerivedDefinition() {
    return {
        variable: "so",
        derive: (observation) => {
            const sc = observation.values[CAPITAL_HIDDEN_SERIES.sc];
            const cuf = observation.values[CAPITAL_HIDDEN_SERIES.cuf];
            const scor = observation.values[CAPITAL_HIDDEN_SERIES.scor];
            if (sc === undefined) {
                throw new Error("Fixture-backed runtime cannot derive 'so' because the source variable '__sc' is missing.");
            }
            if (cuf === undefined) {
                throw new Error("Fixture-backed runtime cannot derive 'so' because the source variable '__cuf' is missing.");
            }
            if (scor === undefined || scor === 0) {
                throw new Error("Fixture-backed runtime cannot derive 'so' because the source variable '__scor' is missing or zero.");
            }
            return sc * cuf / scor;
        },
    };
}
export function createSopcDerivedDefinition() {
    return {
        variable: "sopc",
        derive: (observation) => {
            const so = observation.values.so;
            const pop = observation.values.pop;
            if (so === undefined) {
                throw new Error("Fixture-backed runtime cannot derive 'sopc' because the source variable 'so' is missing.");
            }
            if (pop === undefined || pop === 0) {
                throw new Error("Fixture-backed runtime cannot derive 'sopc' because the source variable 'pop' is missing or zero.");
            }
            return so / pop;
        },
    };
}
export function createFioasDerivedDefinition(fioas1Lookup, fioas2Lookup, policyYear = DEFAULT_CAPITAL_POLICY_YEAR) {
    return {
        variable: CAPITAL_HIDDEN_SERIES.fioas,
        derive: (observation) => {
            const sopc = observation.values.sopc;
            const isopc = observation.values[CAPITAL_HIDDEN_SERIES.isopc];
            if (sopc === undefined) {
                throw new Error("Fixture-backed runtime cannot derive '__fioas' because the source variable 'sopc' is missing.");
            }
            if (isopc === undefined || isopc === 0) {
                throw new Error("Fixture-backed runtime cannot derive '__fioas' because the source variable '__isopc' is missing or zero.");
            }
            return clipAtPolicyYear(fioas1Lookup.evaluate(sopc / isopc), fioas2Lookup.evaluate(sopc / isopc), observation.time, policyYear);
        },
    };
}
export function createFioaiDerivedDefinition() {
    return {
        variable: CAPITAL_HIDDEN_SERIES.fioai,
        derive: (observation) => {
            const fioaa = observation.values.fioaa;
            const fioas = observation.values[CAPITAL_HIDDEN_SERIES.fioas];
            const fioac = observation.values[CAPITAL_HIDDEN_SERIES.fioac];
            if (fioaa === undefined) {
                throw new Error("Fixture-backed runtime cannot derive '__fioai' because the source variable 'fioaa' is missing.");
            }
            if (fioas === undefined) {
                throw new Error("Fixture-backed runtime cannot derive '__fioai' because the source variable '__fioas' is missing.");
            }
            if (fioac === undefined) {
                throw new Error("Fixture-backed runtime cannot derive '__fioai' because the source variable '__fioac' is missing.");
            }
            return 1 - fioaa - fioas - fioac;
        },
    };
}
export function createScirDerivedDefinition() {
    return {
        variable: CAPITAL_HIDDEN_SERIES.scir,
        derive: (observation) => {
            const io = observation.values.io;
            const fioas = observation.values[CAPITAL_HIDDEN_SERIES.fioas];
            if (io === undefined) {
                throw new Error("Fixture-backed runtime cannot derive '__scir' because the source variable 'io' is missing.");
            }
            if (fioas === undefined) {
                throw new Error("Fixture-backed runtime cannot derive '__scir' because the source variable '__fioas' is missing.");
            }
            return io * fioas;
        },
    };
}
export function createIcirDerivedDefinition() {
    return {
        variable: CAPITAL_HIDDEN_SERIES.icir,
        derive: (observation) => {
            const io = observation.values.io;
            const fioai = observation.values[CAPITAL_HIDDEN_SERIES.fioai];
            if (io === undefined) {
                throw new Error("Fixture-backed runtime cannot derive '__icir' because the source variable 'io' is missing.");
            }
            if (fioai === undefined) {
                throw new Error("Fixture-backed runtime cannot derive '__icir' because the source variable '__fioai' is missing.");
            }
            return io * fioai;
        },
    };
}
export function createIcdrDerivedDefinition() {
    return {
        variable: CAPITAL_HIDDEN_SERIES.icdr,
        derive: (observation) => {
            const ic = observation.values[CAPITAL_HIDDEN_SERIES.ic];
            const alic = observation.values[CAPITAL_HIDDEN_SERIES.alic];
            if (ic === undefined) {
                throw new Error("Fixture-backed runtime cannot derive '__icdr' because the source variable '__ic' is missing.");
            }
            if (alic === undefined || alic === 0) {
                throw new Error("Fixture-backed runtime cannot derive '__icdr' because the source variable '__alic' is missing or zero.");
            }
            return ic / alic;
        },
    };
}
export function createScdrDerivedDefinition() {
    return {
        variable: CAPITAL_HIDDEN_SERIES.scdr,
        derive: (observation) => {
            const sc = observation.values[CAPITAL_HIDDEN_SERIES.sc];
            const alsc = observation.values[CAPITAL_HIDDEN_SERIES.alsc];
            if (sc === undefined) {
                throw new Error("Fixture-backed runtime cannot derive '__scdr' because the source variable '__sc' is missing.");
            }
            if (alsc === undefined || alsc === 0) {
                throw new Error("Fixture-backed runtime cannot derive '__scdr' because the source variable '__alsc' is missing or zero.");
            }
            return sc / alsc;
        },
    };
}
export function createCufDerivedDefinition(cufLookup) {
    return {
        variable: CAPITAL_HIDDEN_SERIES.cuf,
        derive: (observation) => {
            const luf = observation.values.luf;
            if (luf === undefined) {
                throw new Error("Fixture-backed runtime cannot derive '__cuf' because the source variable 'luf' is missing.");
            }
            return cufLookup.evaluate(luf);
        },
    };
}
export function createIcorDerivedDefinition(constantsUsed, policyYear = DEFAULT_CAPITAL_POLICY_YEAR) {
    return {
        variable: CAPITAL_HIDDEN_SERIES.icor,
        derive: (observation) => clipAtPolicyYear(constantsUsed.icor1 ?? 3, constantsUsed.icor2 ?? 3, observation.time, policyYear),
    };
}
export function createScorDerivedDefinition(constantsUsed, policyYear = DEFAULT_CAPITAL_POLICY_YEAR) {
    return {
        variable: CAPITAL_HIDDEN_SERIES.scor,
        derive: (observation) => clipAtPolicyYear(constantsUsed.scor1 ?? 1, constantsUsed.scor2 ?? 1, observation.time, policyYear),
    };
}
export function extendCapitalSourceVariables(sourceVariables, outputVariables, fixture, lookupLibrary) {
    const needsVisibleCapitalOutput = outputVariables.some((variable) => ["io", "iopc", "so", "sopc"].includes(variable));
    const needsCapitalResourceSupport = outputVariables.some((variable) => ["nr", "nrfr", "fcaor"].includes(variable));
    const canUseNativeResourceFeedbackInCapital = Boolean(fixture.series.nr) &&
        fixture.constants_used.nri !== undefined &&
        Boolean(lookupLibrary?.has("FCAOR1")) &&
        Boolean(lookupLibrary?.has("FCAOR2"));
    const canDeriveIo = outputVariables.includes("io") &&
        Boolean(fixture.series.pop) &&
        Boolean(fixture.series.iopc);
    const canDeriveIopc = outputVariables.includes("iopc") &&
        Boolean(fixture.series.pop) &&
        Boolean(fixture.series.io);
    const canDeriveSo = outputVariables.includes("so") &&
        Boolean(fixture.series.pop) &&
        Boolean(fixture.series.sopc);
    const canDeriveSopc = outputVariables.includes("sopc") &&
        Boolean(fixture.series.pop) &&
        Boolean(fixture.series.so);
    if (canDeriveIo || canDeriveIopc || canDeriveSo || canDeriveSopc) {
        sourceVariables.add("pop");
    }
    if (canDeriveIo) {
        sourceVariables.add("iopc");
    }
    if (canDeriveIopc) {
        sourceVariables.add("io");
    }
    if (canDeriveSo) {
        sourceVariables.add("sopc");
    }
    if (canDeriveSopc) {
        sourceVariables.add("so");
    }
    const canUseNativeCapitalOrdering = (needsVisibleCapitalOutput || needsCapitalResourceSupport) &&
        Boolean(fixture.series.pop) &&
        Boolean(fixture.series.fioaa) &&
        Boolean(fixture.series.luf) &&
        constantsUsedHasCapitalStockSeeds(fixture.constants_used) &&
        Boolean(lookupLibrary?.has("FIOACV")) &&
        Boolean(lookupLibrary?.has("ISOPC1")) &&
        Boolean(lookupLibrary?.has("ISOPC2")) &&
        Boolean(lookupLibrary?.has("FIOAS1")) &&
        Boolean(lookupLibrary?.has("FIOAS2")) &&
        Boolean(lookupLibrary?.has("CUF")) &&
        (Boolean(fixture.series.fcaor) || canUseNativeResourceFeedbackInCapital);
    if (canUseNativeCapitalOrdering) {
        sourceVariables.delete("io");
        sourceVariables.delete("iopc");
        sourceVariables.delete("so");
        sourceVariables.delete("sopc");
        sourceVariables.add("pop");
        sourceVariables.add("fioaa");
        sourceVariables.add("luf");
        if (fixture.series.fcaor) {
            sourceVariables.add("fcaor");
        }
        else if (canUseNativeResourceFeedbackInCapital) {
            sourceVariables.add("nr");
        }
    }
    const canUseNativeCapitalAllocation = canUseNativeCapitalOrdering ||
        (sourceVariables.has("iopc") &&
            sourceVariables.has("sopc") &&
            Boolean(lookupLibrary?.has("FIOACV")) &&
            Boolean(lookupLibrary?.has("ISOPC1")) &&
            Boolean(lookupLibrary?.has("ISOPC2")) &&
            Boolean(lookupLibrary?.has("FIOAS1")) &&
            Boolean(lookupLibrary?.has("FIOAS2")));
    const canUseNativeCapitalInvestment = canUseNativeCapitalOrdering ||
        (canUseNativeCapitalAllocation &&
            Boolean(fixture.series.fioaa) &&
            (Boolean(fixture.series.io) ||
                (Boolean(fixture.series.pop) && Boolean(fixture.series.iopc))));
    if (canUseNativeCapitalInvestment && !canUseNativeCapitalOrdering) {
        sourceVariables.add("fioaa");
        if (fixture.series.io) {
            sourceVariables.add("io");
        }
        else {
            sourceVariables.add("pop");
            sourceVariables.add("iopc");
        }
    }
    const canUseNativeCapitalStocks = canUseNativeCapitalOrdering ||
        (canUseNativeCapitalInvestment &&
            constantsUsedHasCapitalStockSeeds(fixture.constants_used));
    const canUseNativeCapitalVisibleOutputFormulas = canUseNativeCapitalOrdering ||
        (canUseNativeCapitalStocks &&
            Boolean(fixture.series.fcaor) &&
            Boolean(fixture.series.luf) &&
            Boolean(lookupLibrary?.has("CUF")));
    if (canUseNativeCapitalVisibleOutputFormulas) {
        if (fixture.series.fcaor) {
            sourceVariables.add("fcaor");
        }
        else if (canUseNativeResourceFeedbackInCapital) {
            sourceVariables.add("nr");
        }
        sourceVariables.add("luf");
    }
    return {
        canDeriveIo,
        canDeriveIopc,
        canDeriveSo,
        canDeriveSopc,
        canUseNativeCapitalAllocation,
        canUseNativeCapitalInvestment,
        canUseNativeCapitalStocks,
        canUseNativeCapitalVisibleOutputFormulas,
        canUseNativeCapitalOrdering,
    };
}
function constantsUsedHasCapitalStockSeeds(constantsUsed) {
    return Boolean(constantsUsed.ici !== undefined &&
        constantsUsed.sci !== undefined &&
        constantsUsed.alic1 !== undefined &&
        constantsUsed.alic2 !== undefined &&
        constantsUsed.alsc1 !== undefined &&
        constantsUsed.alsc2 !== undefined);
}
export function populateCapitalNativeSupportSeries(sourceFrame, sourceSeries, prepared, constantsUsed, canUseNativeCapitalAllocation, canUseNativeCapitalInvestment, canUseNativeCapitalStocks, canUseNativeCapitalVisibleOutputFormulas, canUseNativeCapitalOrdering = false) {
    if (canUseNativeCapitalOrdering) {
        const orderedSeries = computeCapitalOrderedSeries(sourceFrame, prepared, constantsUsed);
        for (const [name, values] of Object.entries(orderedSeries)) {
            sourceSeries.set(name, values);
        }
        return;
    }
    const fioacvLookup = prepared.lookupLibrary.get("FIOACV");
    if (canUseNativeCapitalAllocation && sourceSeries.has("iopc") && fioacvLookup) {
        sourceSeries.set(CAPITAL_HIDDEN_SERIES.fioac, deriveSeriesValues(sourceFrame, createFioacDerivedDefinition(constantsUsed, fioacvLookup)));
    }
    if (!canUseNativeCapitalAllocation) {
        return;
    }
    const isopc1Lookup = prepared.lookupLibrary.get("ISOPC1");
    const isopc2Lookup = prepared.lookupLibrary.get("ISOPC2");
    const fioas1Lookup = prepared.lookupLibrary.get("FIOAS1");
    const fioas2Lookup = prepared.lookupLibrary.get("FIOAS2");
    if (!isopc1Lookup || !isopc2Lookup || !fioas1Lookup || !fioas2Lookup) {
        return;
    }
    sourceSeries.set(CAPITAL_HIDDEN_SERIES.isopc, deriveSeriesValues(sourceFrame, createIsopcDerivedDefinition(isopc1Lookup, isopc2Lookup)));
    sourceSeries.set(CAPITAL_HIDDEN_SERIES.fioas, deriveSeriesValues(sourceFrame, createFioasDerivedDefinition(fioas1Lookup, fioas2Lookup)));
    if (!canUseNativeCapitalInvestment) {
        return;
    }
    if (!sourceSeries.has("io") && sourceSeries.has("pop") && sourceSeries.has("iopc")) {
        sourceSeries.set("io", deriveSeriesValues(sourceFrame, createIoDerivedDefinition()));
    }
    sourceSeries.set(CAPITAL_HIDDEN_SERIES.fioai, deriveSeriesValues(sourceFrame, createFioaiDerivedDefinition()));
    sourceSeries.set(CAPITAL_HIDDEN_SERIES.scir, deriveSeriesValues(sourceFrame, createScirDerivedDefinition()));
    sourceSeries.set(CAPITAL_HIDDEN_SERIES.icir, deriveSeriesValues(sourceFrame, createIcirDerivedDefinition()));
    if (!canUseNativeCapitalStocks) {
        return;
    }
    sourceSeries.set(CAPITAL_HIDDEN_SERIES.alic, deriveSeriesValues(sourceFrame, createAlicDerivedDefinition(constantsUsed)));
    sourceSeries.set(CAPITAL_HIDDEN_SERIES.alsc, deriveSeriesValues(sourceFrame, createAlscDerivedDefinition(constantsUsed)));
    const icir = sourceSeries.get(CAPITAL_HIDDEN_SERIES.icir);
    const alic = sourceSeries.get(CAPITAL_HIDDEN_SERIES.alic);
    const scir = sourceSeries.get(CAPITAL_HIDDEN_SERIES.scir);
    const alsc = sourceSeries.get(CAPITAL_HIDDEN_SERIES.alsc);
    if (!icir || !alic || !scir || !alsc) {
        return;
    }
    sourceSeries.set(CAPITAL_HIDDEN_SERIES.ic, populateStockValues(sourceFrame.time, constantsUsed.ici ?? 0, icir, alic));
    sourceSeries.set(CAPITAL_HIDDEN_SERIES.sc, populateStockValues(sourceFrame.time, constantsUsed.sci ?? 0, scir, alsc));
    const supportFrame = {
        request: sourceFrame.request,
        time: sourceFrame.time,
        constantsUsed: sourceFrame.constantsUsed,
        series: sourceSeries,
    };
    sourceSeries.set(CAPITAL_HIDDEN_SERIES.icdr, deriveSeriesValues(supportFrame, createIcdrDerivedDefinition()));
    sourceSeries.set(CAPITAL_HIDDEN_SERIES.scdr, deriveSeriesValues(supportFrame, createScdrDerivedDefinition()));
    if (!canUseNativeCapitalVisibleOutputFormulas) {
        return;
    }
    const cufLookup = prepared.lookupLibrary.get("CUF");
    if (!cufLookup) {
        return;
    }
    sourceSeries.set(CAPITAL_HIDDEN_SERIES.cuf, deriveSeriesValues(supportFrame, createCufDerivedDefinition(cufLookup)));
    sourceSeries.set(CAPITAL_HIDDEN_SERIES.icor, deriveSeriesValues(supportFrame, createIcorDerivedDefinition(constantsUsed)));
    sourceSeries.set(CAPITAL_HIDDEN_SERIES.scor, deriveSeriesValues(supportFrame, createScorDerivedDefinition(constantsUsed)));
}
export function maybePopulateCapitalOutputSeries(variable, sourceFrame, series, fixture, projectedIndices, _prepared, capabilities) {
    if (variable === "io") {
        if (capabilities.canUseNativeCapitalOrdering) {
            const values = sourceFrame.series.get("io");
            if (values) {
                series.set("io", values);
                return true;
            }
        }
        if (capabilities.canUseNativeCapitalVisibleOutputFormulas) {
            series.set("io", deriveSeriesValues(sourceFrame, createCapitalIoDerivedDefinition()));
            return true;
        }
        if (capabilities.canDeriveIo) {
            series.set("io", deriveSeriesValues(sourceFrame, createIoDerivedDefinition()));
            return true;
        }
        if (fixture.series.io) {
            series.set("io", projectSeriesValues(fixture.series.io.values, projectedIndices, "io"));
            return true;
        }
        throw new Error("Fixture-backed runtime cannot derive 'io' because the source variables 'pop' and 'iopc' are missing.");
    }
    if (variable === "iopc") {
        if (capabilities.canUseNativeCapitalOrdering) {
            const values = sourceFrame.series.get("iopc");
            if (values) {
                series.set("iopc", values);
                return true;
            }
        }
        if (capabilities.canDeriveIopc) {
            series.set("iopc", deriveSeriesValues(sourceFrame, createIopcDerivedDefinition()));
            return true;
        }
        if (fixture.series.iopc) {
            series.set("iopc", projectSeriesValues(fixture.series.iopc.values, projectedIndices, "iopc"));
            return true;
        }
        throw new Error("Fixture-backed runtime cannot derive 'iopc' because the source variables 'io' and 'pop' are missing.");
    }
    if (variable === "so") {
        if (capabilities.canUseNativeCapitalOrdering) {
            const values = sourceFrame.series.get("so");
            if (values) {
                series.set("so", values);
                return true;
            }
        }
        if (capabilities.canUseNativeCapitalVisibleOutputFormulas) {
            series.set("so", deriveSeriesValues(sourceFrame, createCapitalSoDerivedDefinition()));
            return true;
        }
        if (capabilities.canDeriveSo) {
            series.set("so", deriveSeriesValues(sourceFrame, createSoDerivedDefinition()));
            return true;
        }
        if (fixture.series.so) {
            series.set("so", projectSeriesValues(fixture.series.so.values, projectedIndices, "so"));
            return true;
        }
        throw new Error("Fixture-backed runtime cannot derive 'so' because the source variables 'sopc' and 'pop' are missing.");
    }
    if (variable === "sopc") {
        if (capabilities.canUseNativeCapitalOrdering) {
            const values = sourceFrame.series.get("sopc");
            if (values) {
                series.set("sopc", values);
                return true;
            }
        }
        if (capabilities.canDeriveSopc) {
            series.set("sopc", deriveSeriesValues(sourceFrame, createSopcDerivedDefinition()));
            return true;
        }
        if (fixture.series.sopc) {
            series.set("sopc", projectSeriesValues(fixture.series.sopc.values, projectedIndices, "sopc"));
            return true;
        }
        throw new Error("Fixture-backed runtime cannot derive 'sopc' because the source variables 'so' and 'pop' are missing.");
    }
    return false;
}
function requireSeries(sourceFrame, variable) {
    const values = sourceFrame.series.get(variable);
    if (!values) {
        throw new Error(`Fixture-backed runtime cannot derive ordered capital values because the source variable '${variable}' is missing.`);
    }
    return values;
}
function createCapitalObservation(index, time, values) {
    return { index, time, values };
}
export function computeCapitalOrderedSeries(sourceFrame, prepared, constantsUsed) {
    const fioacvLookup = prepared.lookupLibrary.get("FIOACV");
    const isopc1Lookup = prepared.lookupLibrary.get("ISOPC1");
    const isopc2Lookup = prepared.lookupLibrary.get("ISOPC2");
    const fioas1Lookup = prepared.lookupLibrary.get("FIOAS1");
    const fioas2Lookup = prepared.lookupLibrary.get("FIOAS2");
    const cufLookup = prepared.lookupLibrary.get("CUF");
    const fcaor1Lookup = prepared.lookupLibrary.get("FCAOR1");
    const fcaor2Lookup = prepared.lookupLibrary.get("FCAOR2");
    if (!fioacvLookup ||
        !isopc1Lookup ||
        !isopc2Lookup ||
        !fioas1Lookup ||
        !fioas2Lookup ||
        !cufLookup) {
        throw new Error("Fixture-backed runtime cannot derive ordered capital values because the capital lookups are incomplete.");
    }
    const pop = requireSeries(sourceFrame, "pop");
    const fioaa = requireSeries(sourceFrame, "fioaa");
    const luf = requireSeries(sourceFrame, "luf");
    const fcaorSeries = sourceFrame.series.get("fcaor");
    const nrSeries = sourceFrame.series.get("nr");
    const canDeriveNativeFcaor = !fcaorSeries &&
        Boolean(nrSeries) &&
        Boolean(fcaor1Lookup) &&
        Boolean(fcaor2Lookup) &&
        constantsUsed.nri !== undefined;
    if (!fcaorSeries && !canDeriveNativeFcaor) {
        throw new Error("Fixture-backed runtime cannot derive ordered capital values because 'fcaor' or native resource feedback inputs are missing.");
    }
    const alicDefinition = createAlicDerivedDefinition(constantsUsed);
    const alscDefinition = createAlscDerivedDefinition(constantsUsed);
    const cufDefinition = createCufDerivedDefinition(cufLookup);
    const icorDefinition = createIcorDerivedDefinition(constantsUsed);
    const scorDefinition = createScorDerivedDefinition(constantsUsed);
    const ioDefinition = createCapitalIoDerivedDefinition();
    const iopcDefinition = createIopcDerivedDefinition();
    const fcaorDefinition = canDeriveNativeFcaor && fcaor1Lookup && fcaor2Lookup
        ? createFcaorDerivedDefinition(constantsUsed, fcaor1Lookup, fcaor2Lookup)
        : null;
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
    let currentIc = constantsUsed.ici ?? 0;
    let currentSc = constantsUsed.sci ?? 0;
    for (let index = 0; index < sourceFrame.time.length; index += 1) {
        const time = sourceFrame.time[index];
        const popValue = pop[index];
        const fioaaValue = fioaa[index];
        const observedFcaorValue = fcaorSeries?.[index];
        const nrValue = nrSeries?.[index];
        const lufValue = luf[index];
        if (time === undefined ||
            popValue === undefined ||
            fioaaValue === undefined ||
            lufValue === undefined) {
            throw new Error("Fixture-backed runtime is missing a source value for ordered capital execution.");
        }
        const values = {
            pop: popValue,
            fioaa: fioaaValue,
            luf: lufValue,
            [CAPITAL_HIDDEN_SERIES.ic]: currentIc,
            [CAPITAL_HIDDEN_SERIES.sc]: currentSc,
        };
        if (observedFcaorValue !== undefined) {
            values.fcaor = observedFcaorValue;
        }
        else if (fcaorDefinition && nrValue !== undefined) {
            values.nr = nrValue;
            values.fcaor = fcaorDefinition.derive(createCapitalObservation(index, time, values));
        }
        else {
            throw new Error("Fixture-backed runtime is missing 'fcaor' and cannot derive it from native resource state.");
        }
        const observation = createCapitalObservation(index, time, values);
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
        ic[index] = currentIc;
        sc[index] = currentSc;
        const nextTime = sourceFrame.time[index + 1];
        if (nextTime !== undefined) {
            const dt = nextTime - time;
            currentIc = currentIc + dt * (icir[index] - icdr[index]);
            currentSc = currentSc + dt * (scir[index] - scdr[index]);
        }
    }
    return {
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
    };
}
export const createIndustrialOutputDefinition = createIoDerivedDefinition;
export const createIndustrialOutputFromCapitalStocksDefinition = createCapitalIoDerivedDefinition;
export const createIndustrialOutputPerCapitaDefinition = createIopcDerivedDefinition;
export const createServiceOutputDefinition = createSoDerivedDefinition;
export const createServiceOutputFromCapitalStocksDefinition = createCapitalSoDerivedDefinition;
export const createServiceOutputPerCapitaDefinition = createSopcDerivedDefinition;
export const createCapitalUtilizationFractionDefinition = createCufDerivedDefinition;
export const createConsumptionAllocationFractionDefinition = createFioacDerivedDefinition;
export const createIndustryAllocationFractionDefinition = createFioaiDerivedDefinition;
export const createServiceAllocationFractionDefinition = createFioasDerivedDefinition;
export const createIndustrialCapitalInvestmentRateDefinition = createIcirDerivedDefinition;
export const createServiceCapitalInvestmentRateDefinition = createScirDerivedDefinition;
