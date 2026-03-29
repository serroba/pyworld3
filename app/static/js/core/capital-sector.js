const DEFAULT_CAPITAL_POLICY_YEAR = 1975;
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
        variable: "__fioac",
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
        variable: "__isopc",
        derive: (observation) => {
            const iopc = observation.values.iopc;
            if (iopc === undefined) {
                throw new Error("Fixture-backed runtime cannot derive '__isopc' because the source variable 'iopc' is missing.");
            }
            return clipAtPolicyYear(isopc1Lookup.evaluate(iopc), isopc2Lookup.evaluate(iopc), observation.time, policyYear);
        },
    };
}
export function extendCapitalSourceVariables(sourceVariables, outputVariables, fixture) {
    const canDeriveIo = outputVariables.includes("io") &&
        Boolean(fixture.series.pop) &&
        Boolean(fixture.series.iopc);
    const canDeriveIopc = outputVariables.includes("iopc") &&
        Boolean(fixture.series.pop) &&
        Boolean(fixture.series.io);
    if (canDeriveIo || canDeriveIopc) {
        sourceVariables.add("pop");
    }
    if (canDeriveIo) {
        sourceVariables.add("iopc");
    }
    if (canDeriveIopc) {
        sourceVariables.add("io");
    }
    return { canDeriveIo, canDeriveIopc };
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
    return false;
}
