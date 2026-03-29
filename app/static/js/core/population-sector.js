import { Smooth } from "./runtime-primitives.js";
const DEFAULT_HEALTH_POLICY_YEAR = 1940;
export const POPULATION_HIDDEN_SERIES = {
    cmi: "__cmi",
    ehspc: "__ehspc",
    fpu: "__fpu",
    hsapc: "__hsapc",
    lmc: "__lmc",
    lmf: "__lmf",
    lmhs: "__lmhs",
    lmhs1: "__lmhs1",
    lmhs2: "__lmhs2",
    lmp: "__lmp",
};
const POPULATION_MORTALITY_OUTPUTS = ["m1", "m2", "m3", "m4"];
function clipAtPolicyYear(beforeValue, afterValue, time, policyYear) {
    return time > policyYear ? afterValue : beforeValue;
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
export function createFpuDerivedDefinition(fpuLookup) {
    return {
        variable: POPULATION_HIDDEN_SERIES.fpu,
        derive: (observation) => {
            const pop = observation.values.pop;
            if (pop === undefined) {
                throw new Error("Fixture-backed runtime cannot derive '__fpu' because the source variable 'pop' is missing.");
            }
            return fpuLookup.evaluate(pop);
        },
    };
}
export function createLmpDerivedDefinition(lmpLookup) {
    return {
        variable: POPULATION_HIDDEN_SERIES.lmp,
        derive: (observation) => {
            const ppolx = observation.values.ppolx;
            if (ppolx === undefined) {
                throw new Error("Fixture-backed runtime cannot derive '__lmp' because the source variable 'ppolx' is missing.");
            }
            return lmpLookup.evaluate(ppolx);
        },
    };
}
export function createLmfDerivedDefinition(constantsUsed, lmfLookup) {
    return {
        variable: POPULATION_HIDDEN_SERIES.lmf,
        derive: (observation) => {
            const fpc = observation.values.fpc;
            const sfpc = constantsUsed.sfpc;
            if (fpc === undefined) {
                throw new Error("Fixture-backed runtime cannot derive '__lmf' because the source variable 'fpc' is missing.");
            }
            if (sfpc === undefined || sfpc === 0) {
                throw new Error("Fixture-backed runtime cannot derive '__lmf' because constant 'sfpc' is missing or zero.");
            }
            return lmfLookup.evaluate(fpc / sfpc);
        },
    };
}
export function createCmiDerivedDefinition(cmiLookup) {
    return {
        variable: POPULATION_HIDDEN_SERIES.cmi,
        derive: (observation) => {
            const iopc = observation.values.iopc;
            if (iopc === undefined) {
                throw new Error("Fixture-backed runtime cannot derive '__cmi' because the source variable 'iopc' is missing.");
            }
            return cmiLookup.evaluate(iopc);
        },
    };
}
export function createHsapcDerivedDefinition(hsapcLookup) {
    return {
        variable: POPULATION_HIDDEN_SERIES.hsapc,
        derive: (observation) => {
            const sopc = observation.values.sopc;
            if (sopc === undefined) {
                throw new Error("Fixture-backed runtime cannot derive '__hsapc' because the source variable 'sopc' is missing.");
            }
            return hsapcLookup.evaluate(sopc);
        },
    };
}
export function createLmhsDerivedDefinitions(lmhs1Lookup, lmhs2Lookup, policyYear = DEFAULT_HEALTH_POLICY_YEAR) {
    return [
        {
            variable: POPULATION_HIDDEN_SERIES.lmhs1,
            derive: (observation) => {
                const ehspc = observation.values[POPULATION_HIDDEN_SERIES.ehspc];
                if (ehspc === undefined) {
                    throw new Error("Fixture-backed runtime cannot derive '__lmhs1' because the source variable '__ehspc' is missing.");
                }
                return lmhs1Lookup.evaluate(ehspc);
            },
        },
        {
            variable: POPULATION_HIDDEN_SERIES.lmhs2,
            derive: (observation) => {
                const ehspc = observation.values[POPULATION_HIDDEN_SERIES.ehspc];
                if (ehspc === undefined) {
                    throw new Error("Fixture-backed runtime cannot derive '__lmhs2' because the source variable '__ehspc' is missing.");
                }
                return lmhs2Lookup.evaluate(ehspc);
            },
        },
        {
            variable: POPULATION_HIDDEN_SERIES.lmhs,
            derive: (observation) => {
                const lmhs1 = observation.values[POPULATION_HIDDEN_SERIES.lmhs1];
                const lmhs2 = observation.values[POPULATION_HIDDEN_SERIES.lmhs2];
                if (lmhs1 === undefined || lmhs2 === undefined) {
                    throw new Error("Fixture-backed runtime cannot derive '__lmhs' because health-service multiplier inputs are missing.");
                }
                return clipAtPolicyYear(lmhs1, lmhs2, observation.time, policyYear);
            },
        },
    ];
}
export function createLmcDerivedDefinition() {
    return {
        variable: POPULATION_HIDDEN_SERIES.lmc,
        derive: (observation) => {
            const cmi = observation.values[POPULATION_HIDDEN_SERIES.cmi];
            const fpu = observation.values[POPULATION_HIDDEN_SERIES.fpu];
            if (cmi === undefined || fpu === undefined) {
                throw new Error("Fixture-backed runtime cannot derive '__lmc' because crowding inputs are missing.");
            }
            return 1 - cmi * fpu;
        },
    };
}
export function createLeDerivedDefinition(constantsUsed) {
    return {
        variable: "le",
        derive: (observation) => {
            const len = constantsUsed.len;
            const lmf = observation.values[POPULATION_HIDDEN_SERIES.lmf];
            const lmhs = observation.values[POPULATION_HIDDEN_SERIES.lmhs];
            const lmp = observation.values[POPULATION_HIDDEN_SERIES.lmp];
            const lmc = observation.values[POPULATION_HIDDEN_SERIES.lmc];
            if (len === undefined) {
                throw new Error("Fixture-backed runtime cannot derive 'le' because constant 'len' is missing.");
            }
            if (lmf === undefined ||
                lmhs === undefined ||
                lmp === undefined ||
                lmc === undefined) {
                throw new Error("Fixture-backed runtime cannot derive 'le' because life-expectancy multiplier inputs are missing.");
            }
            return len * lmf * lmhs * lmp * lmc;
        },
    };
}
export function createMortalityDerivedDefinition(variable, mortalityLookup) {
    return {
        variable,
        derive: (observation) => {
            const le = observation.values.le;
            if (le === undefined) {
                throw new Error(`Fixture-backed runtime cannot derive '${variable}' because the source variable 'le' is missing.`);
            }
            return mortalityLookup.evaluate(le);
        },
    };
}
export function extendPopulationSourceVariables(sourceVariables, outputVariables, fixture, lookupLibrary) {
    const needsLifeExpectancy = outputVariables.includes("le") ||
        outputVariables.some((variable) => POPULATION_MORTALITY_OUTPUTS.includes(variable));
    const canUseNativeLifeExpectancy = needsLifeExpectancy &&
        Boolean(fixture.series.pop) &&
        Boolean(fixture.series.fpc) &&
        Boolean(fixture.series.iopc) &&
        Boolean(fixture.series.sopc) &&
        Boolean(fixture.series.ppolx) &&
        fixture.constants_used.len !== undefined &&
        fixture.constants_used.sfpc !== undefined &&
        Boolean(lookupLibrary?.has("FPU")) &&
        Boolean(lookupLibrary?.has("LMF")) &&
        Boolean(lookupLibrary?.has("HSAPC")) &&
        Boolean(lookupLibrary?.has("LMHS1")) &&
        Boolean(lookupLibrary?.has("LMHS2")) &&
        Boolean(lookupLibrary?.has("CMI")) &&
        Boolean(lookupLibrary?.has("LMP"));
    if (canUseNativeLifeExpectancy) {
        sourceVariables.add("pop");
        sourceVariables.add("fpc");
        sourceVariables.add("iopc");
        sourceVariables.add("sopc");
        sourceVariables.add("ppolx");
    }
    const canUseNativeMortality = outputVariables.some((variable) => POPULATION_MORTALITY_OUTPUTS.includes(variable)) &&
        canUseNativeLifeExpectancy &&
        Boolean(lookupLibrary?.has("M1")) &&
        Boolean(lookupLibrary?.has("M2")) &&
        Boolean(lookupLibrary?.has("M3")) &&
        Boolean(lookupLibrary?.has("M4"));
    return { canUseNativeLifeExpectancy, canUseNativeMortality };
}
export function populatePopulationNativeSupportSeries(sourceFrame, sourceSeries, prepared, constantsUsed, canUseNativeLifeExpectancy, canUseNativeMortality = false) {
    if (!canUseNativeLifeExpectancy) {
        return;
    }
    const fpuLookup = prepared.lookupLibrary.get("FPU");
    const lmfLookup = prepared.lookupLibrary.get("LMF");
    const hsapcLookup = prepared.lookupLibrary.get("HSAPC");
    const lmhs1Lookup = prepared.lookupLibrary.get("LMHS1");
    const lmhs2Lookup = prepared.lookupLibrary.get("LMHS2");
    const cmiLookup = prepared.lookupLibrary.get("CMI");
    const lmpLookup = prepared.lookupLibrary.get("LMP");
    if (!fpuLookup ||
        !lmfLookup ||
        !hsapcLookup ||
        !lmhs1Lookup ||
        !lmhs2Lookup ||
        !cmiLookup ||
        !lmpLookup) {
        return;
    }
    sourceSeries.set(POPULATION_HIDDEN_SERIES.fpu, deriveSeriesValues(sourceFrame, createFpuDerivedDefinition(fpuLookup)));
    sourceSeries.set(POPULATION_HIDDEN_SERIES.lmp, deriveSeriesValues(sourceFrame, createLmpDerivedDefinition(lmpLookup)));
    sourceSeries.set(POPULATION_HIDDEN_SERIES.lmf, deriveSeriesValues(sourceFrame, createLmfDerivedDefinition(constantsUsed, lmfLookup)));
    sourceSeries.set(POPULATION_HIDDEN_SERIES.cmi, deriveSeriesValues(sourceFrame, createCmiDerivedDefinition(cmiLookup)));
    sourceSeries.set(POPULATION_HIDDEN_SERIES.hsapc, deriveSeriesValues(sourceFrame, createHsapcDerivedDefinition(hsapcLookup)));
    const hsapcValues = sourceSeries.get(POPULATION_HIDDEN_SERIES.hsapc);
    if (!hsapcValues) {
        return;
    }
    const smoothHsapc = new Smooth(hsapcValues, prepared.request.dt ?? 1, sourceFrame.time.length);
    const ehspc = new Float64Array(sourceFrame.time.length);
    const hsid = constantsUsed.hsid ?? 20;
    for (let index = 0; index < sourceFrame.time.length; index += 1) {
        ehspc[index] = smoothHsapc.step(index, hsid);
    }
    sourceSeries.set(POPULATION_HIDDEN_SERIES.ehspc, ehspc);
    const ehspcFrame = {
        request: sourceFrame.request,
        time: sourceFrame.time,
        constantsUsed,
        series: sourceSeries,
    };
    for (const definition of createLmhsDerivedDefinitions(lmhs1Lookup, lmhs2Lookup, constantsUsed.iphst ?? DEFAULT_HEALTH_POLICY_YEAR)) {
        sourceSeries.set(definition.variable, deriveSeriesValues(ehspcFrame, definition));
    }
    const supportFrame = {
        request: sourceFrame.request,
        time: sourceFrame.time,
        constantsUsed,
        series: sourceSeries,
    };
    sourceSeries.set(POPULATION_HIDDEN_SERIES.lmc, deriveSeriesValues(supportFrame, createLmcDerivedDefinition()));
    sourceSeries.set("le", deriveSeriesValues(supportFrame, createLeDerivedDefinition(constantsUsed)));
    if (!canUseNativeMortality) {
        return;
    }
    for (const variable of POPULATION_MORTALITY_OUTPUTS) {
        const lookup = prepared.lookupLibrary.get(variable.toUpperCase());
        if (!lookup) {
            continue;
        }
        sourceSeries.set(variable, deriveSeriesValues(supportFrame, createMortalityDerivedDefinition(variable, lookup)));
    }
}
export function maybePopulatePopulationOutputSeries(variable, sourceFrame, series) {
    const isMortalityOutput = POPULATION_MORTALITY_OUTPUTS.includes(variable);
    if (variable !== "le" && !isMortalityOutput) {
        return false;
    }
    const values = sourceFrame.series.get(variable);
    if (!values) {
        return false;
    }
    series.set(variable, values);
    return true;
}
