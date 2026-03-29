import type { ConstantMap, SimulationResult } from "../simulation-contracts.js";
import type { RuntimePreparation } from "./browser-native-runtime.js";
import {
  extendAgricultureSourceVariables,
  populateAgricultureNativeSupportSeries,
} from "./agriculture-sector.js";
import {
  extendCapitalSourceVariables,
  populateCapitalNativeSupportSeries,
} from "./capital-sector.js";
import { computeCoupledCapitalResourceSeries } from "./coupled-capital-resource-runtime.js";
import {
  extendResourceSourceVariables,
  populateResourceNativeSupportSeries,
} from "./resource-sector.js";
import {
  createBirthRateDerivedDefinition,
  createP1StockStateDefinition,
  createPopulationStockStateDefinitions,
  extendPopulationSourceVariables,
  createPopulationSumDerivedDefinition,
  populatePopulationBirthNativeSupportSeries,
  populatePopulationNativeSupportSeries,
} from "./population-sector.js";
import {
  populateDerivedBufferFromDefinition,
} from "./runtime-state-frame.js";
import type { RuntimeStateDefinition, RuntimeStateFrame } from "./runtime-state-frame.js";

export type RuntimeExecutionPlan = {
  readonly sourceVariables: Set<string>;
  readonly agricultureCapabilities: ReturnType<typeof extendAgricultureSourceVariables>;
  readonly capitalCapabilities: ReturnType<typeof extendCapitalSourceVariables>;
  readonly canUseNativeNrFlow: boolean;
  readonly canUseCoupledCapitalResource: boolean;
  readonly canUseNativeLifeExpectancy: boolean;
  readonly canUseNativeMortality: boolean;
  readonly canUseNativeCohortSupport: boolean;
  readonly canUseNativeDeathPath: boolean;
  readonly canUseNativePopulationStocks: boolean;
  readonly canUseNativeBirthSupport: boolean;
  readonly canUseNativeP1Stock: boolean;
};

const POPULATION_OUTPUTS_REQUIRING_FOOD = new Set([
  "le",
  "m1",
  "m2",
  "m3",
  "m4",
  "mat1",
  "mat2",
  "mat3",
  "d1",
  "d2",
  "d3",
  "d4",
  "d",
  "cdr",
  "p1",
  "p2",
  "p3",
  "p4",
  "b",
  "cbr",
  "tf",
]);

export function createRuntimeExecutionPlan(
  prepared: RuntimePreparation,
  fixture: SimulationResult,
): RuntimeExecutionPlan {
  const sourceVariables = new Set(
    prepared.outputVariables.filter(
      (variable) =>
        variable !== "nrfr" &&
        variable !== "fcaor" &&
        variable !== "io" &&
        variable !== "iopc" &&
        variable !== "so" &&
        variable !== "sopc" &&
        variable !== "le" &&
        variable !== "m1" &&
        variable !== "m2" &&
        variable !== "m3" &&
        variable !== "m4" &&
        variable !== "mat1" &&
        variable !== "mat2" &&
        variable !== "mat3" &&
        variable !== "d1" &&
        variable !== "d2" &&
        variable !== "d3" &&
        variable !== "d4" &&
        variable !== "d" &&
        variable !== "cdr" &&
        variable !== "b" &&
        variable !== "cbr" &&
        variable !== "tf" &&
        variable !== "p1" &&
        variable !== "f" &&
        variable !== "fpc" &&
        variable !== "fioaa" &&
        variable !== "tai",
    ),
  );

  const needsNativeFoodPath = prepared.outputVariables.some((variable) =>
    POPULATION_OUTPUTS_REQUIRING_FOOD.has(variable),
  );

  const agricultureCapabilities = extendAgricultureSourceVariables(
    sourceVariables,
    prepared.outputVariables,
    fixture,
    prepared.lookupLibrary,
    needsNativeFoodPath,
  );

  const capitalCapabilities = extendCapitalSourceVariables(
    sourceVariables,
    prepared.outputVariables,
    fixture,
    prepared.lookupLibrary,
  );

  const { canUseNativeNrFlow } = extendResourceSourceVariables(
    sourceVariables,
    prepared.outputVariables,
    fixture,
    prepared.lookupLibrary,
    capitalCapabilities.canUseNativeCapitalOrdering,
  );
  const {
    canUseNativeLifeExpectancy,
    canUseNativeMortality,
    canUseNativeCohortSupport,
    canUseNativeDeathPath,
    canUseNativePopulationStocks,
    canUseNativeBirthSupport,
    canUseNativeP1Stock,
  } = extendPopulationSourceVariables(
    sourceVariables,
    prepared.outputVariables,
    fixture,
    prepared.lookupLibrary,
    agricultureCapabilities.canUseNativeFoodPath,
  );

  return {
    sourceVariables,
    agricultureCapabilities,
    capitalCapabilities,
    canUseNativeNrFlow,
    canUseCoupledCapitalResource:
      capitalCapabilities.canUseNativeCapitalOrdering &&
      canUseNativeNrFlow &&
      sourceVariables.has("nr"),
    canUseNativeLifeExpectancy,
    canUseNativeMortality,
    canUseNativeCohortSupport,
    canUseNativeDeathPath,
    canUseNativePopulationStocks,
    canUseNativeBirthSupport,
    canUseNativeP1Stock,
  };
}

export function applyRuntimeExecutionPlan(
  sourceFrame: RuntimeStateFrame,
  sourceSeries: Map<string, Float64Array>,
  prepared: RuntimePreparation,
  constantsUsed: ConstantMap,
  plan: RuntimeExecutionPlan,
  stepNr: (definition: RuntimeStateDefinition) => void,
  nrStateDefinition: RuntimeStateDefinition | undefined,
): void {
  if (plan.canUseCoupledCapitalResource) {
    const coupledSeries = computeCoupledCapitalResourceSeries(
      sourceFrame,
      prepared,
      constantsUsed,
    );
    for (const [name, values] of Object.entries(coupledSeries)) {
      sourceSeries.set(name, values);
    }
  } else {
    populateCapitalNativeSupportSeries(
      sourceFrame,
      sourceSeries,
      prepared,
      constantsUsed,
      plan.capitalCapabilities.canUseNativeCapitalAllocation,
      plan.capitalCapabilities.canUseNativeCapitalInvestment,
      plan.capitalCapabilities.canUseNativeCapitalStocks,
      plan.capitalCapabilities.canUseNativeCapitalVisibleOutputFormulas,
      plan.capitalCapabilities.canUseNativeCapitalOrdering,
    );

    populateResourceNativeSupportSeries(
      sourceFrame,
      sourceSeries,
      prepared,
      constantsUsed,
      plan.canUseNativeNrFlow,
    );
  }

  populateAgricultureNativeSupportSeries(
    sourceFrame,
    sourceSeries,
    prepared,
    constantsUsed,
    plan.agricultureCapabilities.canUseNativeFoodPath,
    plan.agricultureCapabilities.canUseNativeAgriculturalAllocation,
  );

  populatePopulationNativeSupportSeries(
    sourceFrame,
    sourceSeries,
    prepared,
    constantsUsed,
    plan.canUseNativeLifeExpectancy,
    plan.canUseNativeMortality,
    plan.canUseNativeCohortSupport,
    plan.canUseNativeDeathPath,
    plan.canUseNativePopulationStocks,
  );

  if (plan.canUseNativePopulationStocks) {
    for (const definition of createPopulationStockStateDefinitions()) {
      stepNr(definition);
    }
  }

  populatePopulationBirthNativeSupportSeries(
    sourceFrame,
    sourceSeries,
    prepared,
    constantsUsed,
    plan.canUseNativeBirthSupport,
  );

  if (plan.canUseNativeP1Stock) {
    stepNr(createP1StockStateDefinition());
  }

  if (plan.canUseNativePopulationStocks || plan.canUseNativeP1Stock) {
    populateDerivedBufferFromDefinition(sourceFrame, sourceSeries, createPopulationSumDerivedDefinition());
  }

  if (plan.canUseNativeBirthSupport) {
    populateDerivedBufferFromDefinition(sourceFrame, sourceSeries, createBirthRateDerivedDefinition());
  }

  if (!plan.canUseCoupledCapitalResource && sourceSeries.has("nr") && nrStateDefinition) {
    stepNr(nrStateDefinition);
  }
}
