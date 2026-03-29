function getEntityData(dataset, entity = "World") {
    const resolvedEntity = dataset.entities[entity];
    if (!resolvedEntity) {
        throw new Error(`Local OWID data currently supports only: ${Object.keys(dataset.entities).join(", ")}`);
    }
    return resolvedEntity;
}
function resolveIndicatorNames(availableIndicators, requestedIndicatorNames) {
    if (!requestedIndicatorNames || requestedIndicatorNames.length === 0) {
        return Object.keys(availableIndicators);
    }
    return requestedIndicatorNames;
}
export function createOwidDataProvider(loadDataset) {
    return {
        async getCalibrationData({ referenceYear = 1970, entity = "World", indicatorNames } = {}) {
            const dataset = await loadDataset();
            const entityData = getEntityData(dataset, entity);
            const indicators = {};
            const warnings = [];
            for (const indicatorName of resolveIndicatorNames(entityData.indicators, indicatorNames)) {
                const series = entityData.indicators[indicatorName];
                if (!series) {
                    warnings.push(`Unknown local indicator: ${indicatorName}`);
                    continue;
                }
                const yearIndex = series.years.indexOf(referenceYear);
                if (yearIndex === -1) {
                    warnings.push(`No local data for ${indicatorName} at year=${referenceYear}`);
                    continue;
                }
                const value = series.values[yearIndex];
                if (value === undefined) {
                    warnings.push(`No local value for ${indicatorName} at year=${referenceYear}`);
                    continue;
                }
                indicators[indicatorName] = value;
            }
            return {
                reference_year: referenceYear,
                entity,
                indicators,
                warnings,
            };
        },
        async getValidationData({ entity = "World", indicatorNames } = {}) {
            const dataset = await loadDataset();
            const entityData = getEntityData(dataset, entity);
            const indicators = {};
            const warnings = [];
            for (const indicatorName of resolveIndicatorNames(entityData.indicators, indicatorNames)) {
                const series = entityData.indicators[indicatorName];
                if (!series) {
                    warnings.push(`Unknown local indicator: ${indicatorName}`);
                    continue;
                }
                indicators[indicatorName] = {
                    years: [...series.years],
                    values: [...series.values],
                };
            }
            return {
                entity,
                indicators,
                warnings,
            };
        },
    };
}
