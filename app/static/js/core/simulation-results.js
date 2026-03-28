const TIME_KEY_PRECISION = 8;
function toTimeKey(value) {
    return value.toFixed(TIME_KEY_PRECISION);
}
function projectSeriesValues(source, indices) {
    return {
        name: source.name,
        values: indices.map((index) => {
            const value = source.values[index];
            if (value === undefined) {
                throw new Error(`Fixture series '${source.name}' is missing a value at index ${index}.`);
            }
            return value;
        }),
    };
}
function deriveNrfrSeries(fixture, indices, constantsUsed) {
    const nrSeries = fixture.series.nr;
    if (!nrSeries) {
        throw new Error("Fixture-backed runtime cannot derive 'nrfr' because the source variable 'nr' is missing.");
    }
    const nri = constantsUsed.nri;
    if (nri === undefined || nri === 0) {
        throw new Error("Fixture-backed runtime cannot derive 'nrfr' because constant 'nri' is missing or zero.");
    }
    const projectedNr = projectSeriesValues(nrSeries, indices);
    return {
        name: "nrfr",
        values: projectedNr.values.map((value) => value / nri),
    };
}
function resolveProjectedSeries(variable, fixture, indices, constantsUsed) {
    if (variable === "nrfr") {
        return deriveNrfrSeries(fixture, indices, constantsUsed);
    }
    const source = fixture.series[variable];
    if (!source) {
        throw new Error(`Fixture-backed runtime is missing the requested output variable '${variable}'.`);
    }
    return projectSeriesValues(source, indices);
}
export function projectSimulationResult(prepared, fixture) {
    const fixtureTimeIndex = new Map();
    fixture.time.forEach((value, index) => {
        fixtureTimeIndex.set(toTimeKey(value), index);
    });
    const projectedIndices = Array.from(prepared.time, (value) => {
        const index = fixtureTimeIndex.get(toTimeKey(value));
        if (index === undefined) {
            throw new Error(`Fixture-backed runtime cannot project year ${value} onto the requested time grid.`);
        }
        return index;
    });
    const constantsUsed = {
        ...fixture.constants_used,
        ...(prepared.request.constants ?? {}),
    };
    const series = Object.fromEntries(prepared.outputVariables.map((variable) => {
        return [
            variable,
            resolveProjectedSeries(variable, fixture, projectedIndices, constantsUsed),
        ];
    }));
    return {
        year_min: prepared.request.year_min ?? fixture.year_min,
        year_max: prepared.request.year_max ?? fixture.year_max,
        dt: prepared.request.dt ?? fixture.dt,
        time: Array.from(prepared.time),
        constants_used: constantsUsed,
        series,
    };
}
