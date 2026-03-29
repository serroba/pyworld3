const DEFAULT_CAPITAL_POLICY_YEAR = 1975;
export const CAPITAL_HIDDEN_SERIES = {
    fioac: "__fioac",
    fioai: "__fioai",
    fioas: "__fioas",
    icir: "__icir",
    isopc: "__isopc",
    scir: "__scir",
};
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
export function extendCapitalSourceVariables(sourceVariables, outputVariables, fixture, lookupLibrary) {
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
    const canUseNativeCapitalAllocation = sourceVariables.has("iopc") &&
        sourceVariables.has("sopc") &&
        Boolean(lookupLibrary?.has("FIOACV")) &&
        Boolean(lookupLibrary?.has("ISOPC1")) &&
        Boolean(lookupLibrary?.has("ISOPC2")) &&
        Boolean(lookupLibrary?.has("FIOAS1")) &&
        Boolean(lookupLibrary?.has("FIOAS2"));
    const canUseNativeCapitalInvestment = canUseNativeCapitalAllocation &&
        Boolean(fixture.series.fioaa) &&
        (Boolean(fixture.series.io) ||
            (Boolean(fixture.series.pop) && Boolean(fixture.series.iopc)));
    if (canUseNativeCapitalInvestment) {
        sourceVariables.add("fioaa");
        if (fixture.series.io) {
            sourceVariables.add("io");
        }
        else {
            sourceVariables.add("pop");
            sourceVariables.add("iopc");
        }
    }
    return {
        canDeriveIo,
        canDeriveIopc,
        canDeriveSo,
        canDeriveSopc,
        canUseNativeCapitalAllocation,
        canUseNativeCapitalInvestment,
    };
}
export function populateCapitalNativeSupportSeries(sourceFrame, sourceSeries, prepared, constantsUsed, canUseNativeCapitalAllocation, canUseNativeCapitalInvestment) {
    const fioacvLookup = prepared.lookupLibrary.get("FIOACV");
    if (sourceSeries.has("iopc") && fioacvLookup) {
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
}
export function maybePopulateCapitalOutputSeries(variable, sourceFrame, series, fixture, projectedIndices, _prepared, capabilities) {
    if (variable === "io") {
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
