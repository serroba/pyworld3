const validationMappings = [
    {
        owidIndicator: "pop_total",
        world3Param: "pop",
        confidence: "high",
        description: "Total population: direct comparison",
    },
    {
        owidIndicator: "life_expectancy",
        world3Param: "le",
        confidence: "high",
        description: "Life expectancy: direct comparison",
    },
    {
        owidIndicator: "crude_birth_rate",
        world3Param: "cbr",
        confidence: "high",
        description: "Crude birth rate: direct comparison (per 1000)",
    },
    {
        owidIndicator: "crude_death_rate",
        world3Param: "cdr",
        confidence: "high",
        description: "Crude death rate: direct comparison (per 1000)",
    },
    {
        owidIndicator: "gdp_per_capita",
        world3Param: "iopc",
        confidence: "medium",
        description: "Industrial output/cap: GDP/cap as upper-bound proxy",
    },
];
function interpolateAt(xSource, ySource, xTarget) {
    if (xSource.length === 0 || ySource.length === 0) {
        return [];
    }
    const result = [];
    const sourceMin = xSource[0];
    const sourceMax = xSource.at(-1) ?? sourceMin;
    for (const targetX of xTarget) {
        if (targetX < sourceMin || targetX > sourceMax) {
            continue;
        }
        let low = 0;
        let high = xSource.length - 1;
        while (low < high - 1) {
            const mid = Math.floor((low + high) / 2);
            if ((xSource[mid] ?? Number.POSITIVE_INFINITY) <= targetX) {
                low = mid;
            }
            else {
                high = mid;
            }
        }
        const lowX = xSource[low];
        const lowY = ySource[low];
        if (lowX === undefined || lowY === undefined) {
            continue;
        }
        if (lowX === targetX) {
            result.push(lowY);
            continue;
        }
        if (low < xSource.length - 1) {
            const x0 = lowX;
            const x1 = xSource[high];
            const y0 = lowY;
            const y1 = ySource[high];
            if (x1 === undefined || y1 === undefined) {
                continue;
            }
            const t = x1 !== x0 ? (targetX - x0) / (x1 - x0) : 0;
            result.push(y0 + t * (y1 - y0));
            continue;
        }
        result.push(lowY);
    }
    return result;
}
function alignObservedAndSimulatedSeries(simulationYears, simulationValues, observedYears, observedValues) {
    if (simulationYears.length === 0 ||
        simulationValues.length === 0 ||
        observedYears.length === 0 ||
        observedValues.length === 0) {
        return { years: [], observedValues: [], simulatedValues: [] };
    }
    const simulationStart = simulationYears[0];
    const simulationEnd = simulationYears.at(-1) ?? simulationStart;
    const overlappingYears = [];
    const overlappingObservedValues = [];
    for (let index = 0; index < observedYears.length; index += 1) {
        const observedYear = observedYears[index];
        const observedValue = observedValues[index];
        if (observedYear === undefined || observedValue === undefined) {
            continue;
        }
        if (observedYear < simulationStart || observedYear > simulationEnd) {
            continue;
        }
        overlappingYears.push(observedYear);
        overlappingObservedValues.push(observedValue);
    }
    if (overlappingYears.length === 0) {
        return { years: [], observedValues: [], simulatedValues: [] };
    }
    const simulatedValuesAtOverlap = interpolateAt(simulationYears, simulationValues, overlappingYears);
    if (simulatedValuesAtOverlap.length !== overlappingYears.length) {
        const alignedLength = Math.min(overlappingYears.length, overlappingObservedValues.length, simulatedValuesAtOverlap.length);
        return {
            years: overlappingYears.slice(0, alignedLength),
            observedValues: overlappingObservedValues.slice(0, alignedLength),
            simulatedValues: simulatedValuesAtOverlap.slice(0, alignedLength),
        };
    }
    return {
        years: overlappingYears,
        observedValues: overlappingObservedValues,
        simulatedValues: simulatedValuesAtOverlap,
    };
}
function computeRmse(predicted, observed) {
    const n = Math.min(predicted.length, observed.length);
    if (n === 0) {
        return Number.NaN;
    }
    let mse = 0;
    for (let index = 0; index < n; index += 1) {
        const predictedValue = predicted[index];
        const observedValue = observed[index];
        if (predictedValue === undefined || observedValue === undefined) {
            continue;
        }
        mse += (predictedValue - observedValue) ** 2;
    }
    return Math.sqrt(mse / n);
}
function computeMape(predicted, observed) {
    const n = Math.min(predicted.length, observed.length);
    if (n === 0) {
        return Number.NaN;
    }
    const errors = [];
    for (let index = 0; index < n; index += 1) {
        const observedValue = observed[index];
        const predictedValue = predicted[index];
        if (observedValue === undefined || predictedValue === undefined) {
            continue;
        }
        if (Math.abs(observedValue) > 1e-10) {
            errors.push(Math.abs(predictedValue - observedValue) / Math.abs(observedValue));
        }
    }
    if (errors.length === 0) {
        return Number.NaN;
    }
    return (errors.reduce((sum, value) => sum + value, 0) / errors.length) * 100;
}
function computeCorrelation(xValues, yValues) {
    const n = Math.min(xValues.length, yValues.length);
    if (n < 2) {
        return Number.NaN;
    }
    const meanX = xValues.slice(0, n).reduce((sum, value) => sum + value, 0) / n;
    const meanY = yValues.slice(0, n).reduce((sum, value) => sum + value, 0) / n;
    let covariance = 0;
    let varianceX = 0;
    let varianceY = 0;
    for (let index = 0; index < n; index += 1) {
        const xValue = xValues[index];
        const yValue = yValues[index];
        if (xValue === undefined || yValue === undefined) {
            continue;
        }
        const deltaX = xValue - meanX;
        const deltaY = yValue - meanY;
        covariance += deltaX * deltaY;
        varianceX += deltaX ** 2;
        varianceY += deltaY ** 2;
    }
    const stdX = Math.sqrt(varianceX / n);
    const stdY = Math.sqrt(varianceY / n);
    if (stdX < 1e-10 || stdY < 1e-10) {
        return Number.NaN;
    }
    return (covariance / n) / (stdX * stdY);
}
export function validateSimulationResult(result, validationData, options = {}) {
    const requested = options.variables ? new Set(options.variables) : null;
    const mappings = requested
        ? validationMappings.filter((mapping) => requested.has(mapping.world3Param))
        : validationMappings;
    const metrics = {};
    const warnings = [...validationData.warnings];
    let overlapStart = Number.POSITIVE_INFINITY;
    let overlapEnd = Number.NEGATIVE_INFINITY;
    for (const mapping of mappings) {
        const series = result.series[mapping.world3Param];
        if (!series) {
            warnings.push(`Skipping ${mapping.world3Param}: not in simulation output`);
            continue;
        }
        const observedSeries = validationData.indicators[mapping.owidIndicator];
        if (!observedSeries) {
            warnings.push(`Skipping ${mapping.world3Param}: no local data for ${mapping.owidIndicator}`);
            continue;
        }
        const transformedObservedValues = observedSeries.values.map((value) => mapping.transform ? mapping.transform(value) : value);
        const alignedSeries = alignObservedAndSimulatedSeries(result.time, series.values, observedSeries.years, transformedObservedValues);
        if (alignedSeries.years.length === 0) {
            warnings.push(`Skipping ${mapping.world3Param}: no overlapping data points`);
            continue;
        }
        const start = alignedSeries.years[0];
        const end = alignedSeries.years.at(-1) ?? start;
        overlapStart = Math.min(overlapStart, start);
        overlapEnd = Math.max(overlapEnd, end);
        metrics[mapping.world3Param] = {
            variable: mapping.world3Param,
            owid_indicator: mapping.owidIndicator,
            confidence: mapping.confidence,
            description: mapping.description,
            overlap_years: [start, end],
            n_points: alignedSeries.years.length,
            rmse: computeRmse(alignedSeries.simulatedValues, alignedSeries.observedValues),
            mape: computeMape(alignedSeries.simulatedValues, alignedSeries.observedValues) / 100,
            correlation: computeCorrelation(alignedSeries.simulatedValues, alignedSeries.observedValues),
        };
    }
    if (Object.keys(metrics).length === 0) {
        overlapStart = result.year_min;
        overlapEnd = result.year_max;
    }
    return {
        entity: options.entity ?? validationData.entity,
        overlap_start: overlapStart,
        overlap_end: overlapEnd,
        metrics,
        warnings,
    };
}
export function createValidationCore(loadValidationData) {
    return {
        async validate(result, options = {}) {
            const validationData = await loadValidationData(options);
            return validateSimulationResult(result, validationData, options);
        },
    };
}
