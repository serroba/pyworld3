import { applyRuntimeExecutionPlan, createRuntimeExecutionPlan, } from "./runtime-execution-plan.js";
import { maybePopulateCapitalOutputSeries, } from "./capital-sector.js";
import { maybePopulatePopulationOutputSeries, } from "./population-sector.js";
import { RESOURCE_HIDDEN_SERIES, maybePopulateResourceOutputSeries, } from "./resource-sector.js";
const TIME_KEY_PRECISION = 8;
function toTimeKey(value) {
    return value.toFixed(TIME_KEY_PRECISION);
}
function buildProjectedIndices(prepared, fixture) {
    const fixtureTimeIndex = new Map();
    fixture.time.forEach((value, index) => {
        fixtureTimeIndex.set(toTimeKey(value), index);
    });
    return Array.from(prepared.time, (value) => {
        const index = fixtureTimeIndex.get(toTimeKey(value));
        if (index === undefined) {
            throw new Error(`Fixture-backed runtime cannot project year ${value} onto the requested time grid.`);
        }
        return index;
    });
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
function resolveSourceSeriesValues(variable, fixture, indices) {
    const source = fixture.series[variable];
    if (!source) {
        throw new Error(`Fixture-backed runtime is missing the requested output variable '${variable}'.`);
    }
    return projectSeriesValues(source.values, indices, source.name);
}
function createObservedDeltaAdvance(variable) {
    return (currentValue, observation, nextObservation) => {
        const observed = observation.values[variable];
        const nextObserved = nextObservation?.values[variable];
        if (observed === undefined) {
            throw new Error(`Runtime state advance is missing the observed '${variable}' value.`);
        }
        if (nextObserved === undefined) {
            return currentValue;
        }
        return currentValue + (nextObserved - observed);
    };
}
export function createReplayStateDefinition(variable) {
    return {
        variable,
        advance: createObservedDeltaAdvance(variable),
    };
}
export function createEulerStateDefinition(variable, rateVariable, multiplier = 1) {
    return {
        variable,
        advance: (currentValue, observation, nextObservation) => {
            const rate = observation.values[rateVariable];
            if (rate === undefined) {
                throw new Error(`Runtime Euler state advance is missing the rate variable '${rateVariable}'.`);
            }
            if (!nextObservation) {
                return currentValue;
            }
            const dt = nextObservation.time - observation.time;
            return currentValue + dt * rate * multiplier;
        },
    };
}
const STEPPED_SOURCE_STATE_DEFINITIONS = new Map([
    ["nr", createEulerStateDefinition("nr", RESOURCE_HIDDEN_SERIES.nrRate, -1)],
    ["pop", createReplayStateDefinition("pop")],
    ["iopc", createReplayStateDefinition("iopc")],
    ["fpc", createReplayStateDefinition("fpc")],
    ["ppolx", createReplayStateDefinition("ppolx")],
    ["le", createReplayStateDefinition("le")],
]);
export function populateStateBufferFromDefinition(sourceSeries, oracleFrame, definition) {
    const { variable, advance } = definition;
    const projectedValues = sourceSeries.get(variable);
    if (!projectedValues) {
        throw new Error(`Fixture-backed runtime cannot populate the source variable '${variable}' because it is missing.`);
    }
    sourceSeries.set(variable, populateStateBufferFromStepper(oracleFrame, projectedValues[0] ?? 0, advance));
}
export function createDerivedSeriesDefinition(variable, derive) {
    return {
        variable,
        derive,
    };
}
export function populateDerivedBufferFromDefinition(sourceFrame, series, definition) {
    series.set(definition.variable, populateSeriesBufferFromStepper(sourceFrame, definition.derive));
}
export function createRuntimeStateFrame(prepared, fixture) {
    const projectedIndices = buildProjectedIndices(prepared, fixture);
    const constantsUsed = {
        ...fixture.constants_used,
        ...(prepared.request.constants ?? {}),
    };
    const executionPlan = createRuntimeExecutionPlan(prepared, fixture);
    const { sourceVariables, capitalCapabilities } = executionPlan;
    const sourceSeries = new Map();
    for (const variable of sourceVariables) {
        if (variable === "nr" && !fixture.series.nr) {
            throw new Error("Fixture-backed runtime cannot derive 'nrfr' because the source variable 'nr' is missing.");
        }
        sourceSeries.set(variable, resolveSourceSeriesValues(variable, fixture, projectedIndices));
    }
    const oracleFrame = {
        request: prepared.request,
        time: Float64Array.from(prepared.time),
        constantsUsed,
        series: sourceSeries,
    };
    for (const variable of sourceVariables) {
        if (variable === "nr") {
            continue;
        }
        const definition = STEPPED_SOURCE_STATE_DEFINITIONS.get(variable);
        if (!definition) {
            continue;
        }
        populateStateBufferFromDefinition(sourceSeries, oracleFrame, definition);
    }
    const sourceFrame = {
        request: prepared.request,
        time: oracleFrame.time,
        constantsUsed,
        series: sourceSeries,
    };
    applyRuntimeExecutionPlan(sourceFrame, sourceSeries, prepared, constantsUsed, executionPlan, (definition) => {
        populateStateBufferFromDefinition(sourceSeries, sourceFrame, definition);
    }, STEPPED_SOURCE_STATE_DEFINITIONS.get("nr"));
    const series = new Map();
    for (const variable of prepared.outputVariables) {
        if (maybePopulateCapitalOutputSeries(variable, sourceFrame, series, fixture, projectedIndices, prepared, capitalCapabilities)) {
            continue;
        }
        if (maybePopulateResourceOutputSeries(variable, sourceFrame, series, prepared, fixture, projectedIndices, constantsUsed)) {
            continue;
        }
        if (maybePopulatePopulationOutputSeries(variable, sourceFrame, series)) {
            continue;
        }
        const values = sourceSeries.get(variable);
        if (!values) {
            throw new Error(`Fixture-backed runtime is missing the requested output variable '${variable}'.`);
        }
        series.set(variable, values);
    }
    return {
        request: prepared.request,
        time: sourceFrame.time,
        constantsUsed,
        series,
    };
}
export function runtimeStateFrameToSimulationResult(frame) {
    return assembleSimulationResultFromStepper(frame);
}
export function assembleSimulationResultFromStepper(frame) {
    const stepper = createRuntimeStepper(frame);
    const seriesNames = Array.from(frame.series.keys());
    const seriesValues = new Map(seriesNames.map((name) => [name, []]));
    const time = [];
    while (!stepper.isDone()) {
        const observation = stepper.next();
        if (!observation) {
            break;
        }
        time.push(observation.time);
        for (const name of seriesNames) {
            const value = observation.values[name];
            if (value === undefined) {
                throw new Error(`Runtime observation is missing '${name}' while assembling the simulation result.`);
            }
            const values = seriesValues.get(name);
            if (!values) {
                throw new Error(`Runtime result assembly is missing a buffer for '${name}'.`);
            }
            values.push(value);
        }
    }
    return {
        year_min: frame.request.year_min ?? frame.time[0] ?? 1900,
        year_max: frame.request.year_max ?? frame.time[frame.time.length - 1] ?? 2100,
        dt: frame.request.dt ?? 0.5,
        time,
        constants_used: { ...frame.constantsUsed },
        series: Object.fromEntries(Array.from(seriesValues.entries(), ([name, values]) => [
            name,
            { name, values },
        ])),
    };
}
export function observeRuntimeStateAt(frame, index) {
    const time = frame.time[index];
    if (time === undefined) {
        throw new Error(`Runtime state frame index ${index} is out of bounds.`);
    }
    const values = Object.fromEntries(Array.from(frame.series.entries(), ([name, series]) => {
        const value = series[index];
        if (value === undefined) {
            throw new Error(`Runtime state frame series '${name}' is missing a value at index ${index}.`);
        }
        return [name, value];
    }));
    return { index, time, values };
}
export function listRuntimeObservations(frame) {
    return Array.from(frame.time, (_time, index) => observeRuntimeStateAt(frame, index));
}
export function createRuntimeStepper(frame) {
    let currentIndex = 0;
    function hasIndex(index) {
        return index >= 0 && index < frame.time.length;
    }
    return {
        current() {
            if (!hasIndex(currentIndex)) {
                return null;
            }
            return observeRuntimeStateAt(frame, currentIndex);
        },
        next() {
            if (!hasIndex(currentIndex)) {
                return null;
            }
            const observation = observeRuntimeStateAt(frame, currentIndex);
            currentIndex += 1;
            return observation;
        },
        peek(offset = 0) {
            const targetIndex = currentIndex + offset;
            if (!hasIndex(targetIndex)) {
                return null;
            }
            return observeRuntimeStateAt(frame, targetIndex);
        },
        reset() {
            currentIndex = 0;
        },
        isDone() {
            return currentIndex >= frame.time.length;
        },
        index() {
            return currentIndex;
        },
        length() {
            return frame.time.length;
        },
    };
}
export function populateSeriesBufferFromStepper(frame, deriveValue) {
    const stepper = createRuntimeStepper(frame);
    const values = new Float64Array(frame.time.length);
    while (!stepper.isDone()) {
        const observation = stepper.next();
        if (!observation) {
            break;
        }
        values[observation.index] = deriveValue(observation);
    }
    return values;
}
export function populateStateBufferFromStepper(frame, initialValue, advanceState) {
    const stepper = createRuntimeStepper(frame);
    const values = new Float64Array(frame.time.length);
    if (values.length === 0) {
        return values;
    }
    values[0] = initialValue;
    let currentValue = initialValue;
    while (!stepper.isDone()) {
        const observation = stepper.next();
        if (!observation) {
            break;
        }
        if (observation.index >= values.length - 1) {
            break;
        }
        const nextObservation = stepper.current();
        currentValue = advanceState(currentValue, observation, nextObservation);
        values[observation.index + 1] = currentValue;
    }
    return values;
}
