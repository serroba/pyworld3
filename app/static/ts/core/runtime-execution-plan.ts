import type { ConstantMap, SimulationResult } from "../simulation-contracts.js";
import type { RuntimePreparation } from "./browser-native-runtime.js";
import {
  extendCapitalSourceVariables,
  populateCapitalNativeSupportSeries,
} from "./capital-sector.js";
import { computeCoupledCapitalResourceSeries } from "./coupled-capital-resource-runtime.js";
import {
  extendResourceSourceVariables,
  populateResourceNativeSupportSeries,
} from "./resource-sector.js";
import type { RuntimeStateDefinition, RuntimeStateFrame } from "./runtime-state-frame.js";

export type RuntimeExecutionPlan = {
  readonly sourceVariables: Set<string>;
  readonly capitalCapabilities: ReturnType<typeof extendCapitalSourceVariables>;
  readonly canUseNativeNrFlow: boolean;
  readonly canUseCoupledCapitalResource: boolean;
};

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
        variable !== "sopc",
    ),
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

  return {
    sourceVariables,
    capitalCapabilities,
    canUseNativeNrFlow,
    canUseCoupledCapitalResource:
      capitalCapabilities.canUseNativeCapitalOrdering &&
      canUseNativeNrFlow &&
      sourceVariables.has("nr"),
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
    return;
  }

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

  if (sourceSeries.has("nr") && nrStateDefinition) {
    stepNr(nrStateDefinition);
  }
}
