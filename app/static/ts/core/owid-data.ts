export type OwidIndicatorSeries = {
  years: number[];
  values: number[];
};

export type OwidEntityData = {
  indicators: Record<string, OwidIndicatorSeries>;
};

export type OwidDataset = {
  entities: Record<string, OwidEntityData>;
};

export type CalibrationDataResponse = {
  reference_year: number;
  entity: string;
  indicators: Record<string, number>;
  warnings: string[];
};

export type ValidationSeriesPoint = {
  years: number[];
  values: number[];
};

export type ValidationDataResponse = {
  entity: string;
  indicators: Record<string, ValidationSeriesPoint>;
  warnings: string[];
};

export type OwidDataProvider = {
  getCalibrationData: (options?: {
    referenceYear?: number;
    entity?: string;
    indicatorNames?: string[];
  }) => Promise<CalibrationDataResponse>;
  getValidationData: (options?: {
    entity?: string;
    indicatorNames?: string[];
  }) => Promise<ValidationDataResponse>;
};

function getEntityData(dataset: OwidDataset, entity = "World"): OwidEntityData {
  const resolvedEntity = dataset.entities[entity];
  if (!resolvedEntity) {
    throw new Error(
      `Local OWID data currently supports only: ${Object.keys(dataset.entities).join(", ")}`,
    );
  }
  return resolvedEntity;
}

function resolveIndicatorNames(
  availableIndicators: Record<string, OwidIndicatorSeries>,
  requestedIndicatorNames?: string[],
): string[] {
  if (!requestedIndicatorNames || requestedIndicatorNames.length === 0) {
    return Object.keys(availableIndicators);
  }
  return requestedIndicatorNames;
}

export function createOwidDataProvider(
  loadDataset: () => Promise<OwidDataset>,
): OwidDataProvider {
  return {
    async getCalibrationData({ referenceYear = 1970, entity = "World", indicatorNames } = {}) {
      const dataset = await loadDataset();
      const entityData = getEntityData(dataset, entity);
      const indicators: Record<string, number> = {};
      const warnings: string[] = [];

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
      const indicators: Record<string, ValidationSeriesPoint> = {};
      const warnings: string[] = [];

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
