import type { ConstantConstraintMap, ModelDataPayload } from "../simulation-contracts.js";
import type { World3ConstantKey } from "./world3-keys.js";
import type { CalibrationDataResponse } from "./owid-data.js";

type CalibrationConfidence = "high" | "medium" | "low";

type CalibrationTransform = (value: number, context: Record<string, number>) => number;

type CalibrationMapping = {
  owidIndicator: string;
  world3Param: World3ConstantKey;
  confidence: CalibrationConfidence;
  description: string;
  requiresIndicators?: string[];
  transform?: CalibrationTransform;
};

export type CalibratedConstantOutput = {
  name: World3ConstantKey;
  value: number;
  confidence: CalibrationConfidence;
  owid_indicator: string;
  description: string;
  default_value: number;
};

export type CalibrationResponse = {
  reference_year: number;
  entity: string;
  constants: Partial<Record<World3ConstantKey, CalibratedConstantOutput>>;
  warnings: string[];
};

type CalibrateOptions = {
  parameters?: World3ConstantKey[];
};

const calibrationMappings: CalibrationMapping[] = [
  {
    owidIndicator: "pop_0_14",
    world3Param: "p1i",
    confidence: "high",
    description: "Initial population 0-14: OWID percentage x total population",
    requiresIndicators: ["pop_total"],
    transform: (value, context) => (context.pop_total || 0) * value / 100,
  },
  {
    owidIndicator: "pop_15_64",
    world3Param: "p2i",
    confidence: "medium",
    description: "Initial population 15-44: ~60% of 15-64 cohort",
    requiresIndicators: ["pop_total"],
    transform: (value, context) => (context.pop_total || 0) * value / 100 * 0.6,
  },
  {
    owidIndicator: "pop_15_64",
    world3Param: "p3i",
    confidence: "medium",
    description: "Initial population 45-64: ~40% of 15-64 cohort",
    requiresIndicators: ["pop_total"],
    transform: (value, context) => (context.pop_total || 0) * value / 100 * 0.4,
  },
  {
    owidIndicator: "pop_65_up",
    world3Param: "p4i",
    confidence: "high",
    description: "Initial population 65+: OWID percentage x total population",
    requiresIndicators: ["pop_total"],
    transform: (value, context) => (context.pop_total || 0) * value / 100,
  },
  {
    owidIndicator: "fertility_rate",
    world3Param: "dcfsn",
    confidence: "medium",
    description: "Desired family size: TFR as proxy",
  },
  {
    owidIndicator: "gdp_current",
    world3Param: "ici",
    confidence: "medium",
    description: "Industrial capital: GDP x industry share, deflated to 1968$",
    requiresIndicators: ["industry_value_added_pct"],
    transform: (value, context) =>
      (value * (context.industry_value_added_pct || 30) / 100) / 7.7,
  },
  {
    owidIndicator: "gdp_current",
    world3Param: "io70",
    confidence: "medium",
    description: "1970 industrial output from 1970 GDP",
    requiresIndicators: ["industry_value_added_pct"],
    transform: (value, context) =>
      (value * (context.industry_value_added_pct || 38) / 100) / 7.7,
  },
  {
    owidIndicator: "gross_capital_formation_pct",
    world3Param: "icor1",
    confidence: "medium",
    description: "Capital-output ratio from investment/GDP ratio",
    transform: (value) => (value / 100) * 14,
  },
  {
    owidIndicator: "co2_per_gdp",
    world3Param: "imef",
    confidence: "low",
    description: "Industrial emission factor from CO2 intensity",
    transform: (value) => 0.1 * (value / 1),
  },
];

function formatFourSig(value: number): string {
  return value.toPrecision(4).replace(/\.0+(?=e|$)/, "");
}

function applyConstraint(
  param: World3ConstantKey,
  value: number,
  constraints: ConstantConstraintMap,
  warnings: string[],
): number {
  const constraint = constraints[param];
  if (!constraint) {
    return value;
  }
  let constrainedValue = value;
  const [minimum, maximum] = constraint;
  if (minimum !== null && constrainedValue < minimum) {
    warnings.push(
      `${param}: calibrated value ${formatFourSig(constrainedValue)} below minimum ${formatFourSig(minimum)}, clamping`,
    );
    constrainedValue = minimum;
  }
  if (maximum !== null && constrainedValue > maximum) {
    warnings.push(
      `${param}: calibrated value ${formatFourSig(constrainedValue)} above maximum ${formatFourSig(maximum)}, clamping`,
    );
    constrainedValue = maximum;
  }
  return constrainedValue;
}

export function calibrateFromIndicatorData(
  modelData: Pick<ModelDataPayload, "constantDefaults" | "constantConstraints">,
  data: CalibrationDataResponse,
  options: CalibrateOptions = {},
): CalibrationResponse {
  const requested = options.parameters ? new Set(options.parameters) : null;
  const mappings = requested
    ? calibrationMappings.filter((mapping) => requested.has(mapping.world3Param))
    : calibrationMappings;

  const constants: Partial<Record<World3ConstantKey, CalibratedConstantOutput>> = {};
  const warnings = [...data.warnings];

  for (const mapping of mappings) {
    const primaryValue = data.indicators[mapping.owidIndicator];
    if (primaryValue === undefined) {
      warnings.push(`Skipping ${mapping.world3Param}: no data for ${mapping.owidIndicator}`);
      continue;
    }

    const required = mapping.requiresIndicators || [];
    const missingIndicators = required.filter(
      (indicatorName) => data.indicators[indicatorName] === undefined,
    );
    if (missingIndicators.length > 0) {
      warnings.push(
        `Skipping ${mapping.world3Param}: missing context indicators: ${missingIndicators.join(", ")}`,
      );
      continue;
    }

    const context = Object.fromEntries(
      required.map((indicatorName) => [indicatorName, data.indicators[indicatorName] as number]),
    );
    const transformedValue = mapping.transform
      ? mapping.transform(primaryValue, context)
      : primaryValue;
    const value = applyConstraint(
      mapping.world3Param,
      transformedValue,
      modelData.constantConstraints,
      warnings,
    );

    constants[mapping.world3Param] = {
      name: mapping.world3Param,
      value,
      confidence: mapping.confidence,
      owid_indicator: mapping.owidIndicator,
      description: mapping.description,
      default_value: modelData.constantDefaults[mapping.world3Param],
    };
  }

  return {
    reference_year: data.reference_year,
    entity: data.entity,
    constants,
    warnings,
  };
}

export function createCalibrationCore(
  modelData: Pick<ModelDataPayload, "constantDefaults" | "constantConstraints">,
): { calibrate: (data: CalibrationDataResponse, options?: CalibrateOptions) => CalibrationResponse } {
  return {
    calibrate: (data: CalibrationDataResponse, options?: CalibrateOptions) =>
      calibrateFromIndicatorData(modelData, data, options),
  };
}
