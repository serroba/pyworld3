import type { ConstantMap } from "../simulation-contracts.js";
import type { RuntimePreparation } from "./browser-native-runtime.js";
import {
  populateAgricultureNativeSupportSeries,
} from "./agriculture-sector.js";
import {
  populateCapitalNativeSupportSeries,
} from "./capital-sector.js";
import { computeCoupledCapitalResourceSeries } from "./coupled-capital-resource-runtime.js";
import {
  createBirthRateDerivedDefinition,
  createP1StockStateDefinition,
  createPopulationStockStateDefinitions,
  createPopulationSumDerivedDefinition,
} from "./population-sector.js";
import {
  populatePopulationBirthNativeSupportSeries,
  populatePopulationNativeSupportSeries,
} from "./population-runtime.js";
import {
  populatePollutionNativeSupportSeries,
} from "./pollution-sector.js";
import {
  extendResourceSourceVariables,
  populateResourceNativeSupportSeries,
} from "./resource-sector.js";
import {
  populateDerivedBufferFromDefinition,
} from "./runtime-state-frame.js";
import type { RuntimeStateDefinition, RuntimeStateFrame } from "./runtime-state-frame.js";
import type { RuntimeExecutionPlan } from "./runtime-execution-plan.js";

export type RuntimeExecutionStageId =
  | "coupled-capital-resource"
  | "capital"
  | "resource"
  | "agriculture"
  | "pollution"
  | "population-support"
  | "population-stocks"
  | "population-birth-support"
  | "population-p1"
  | "population-sum"
  | "birth-rate"
  | "resource-stock";

export type RuntimeExecutionContext = {
  readonly sourceFrame: RuntimeStateFrame;
  readonly sourceSeries: Map<string, Float64Array>;
  readonly prepared: RuntimePreparation;
  readonly constantsUsed: ConstantMap;
  readonly plan: RuntimeExecutionPlan;
  readonly stepState: (definition: RuntimeStateDefinition) => void;
  readonly nrStateDefinition?: RuntimeStateDefinition;
};

export type RuntimeExecutionStage = {
  readonly id: RuntimeExecutionStageId;
  readonly run: (context: RuntimeExecutionContext) => void;
};

function runCoupledCapitalResource(context: RuntimeExecutionContext): void {
  const coupledSeries = computeCoupledCapitalResourceSeries(
    context.sourceFrame,
    context.prepared,
    context.constantsUsed,
  );
  for (const [name, values] of Object.entries(coupledSeries)) {
    context.sourceSeries.set(name, values);
  }
}

function runCapital(context: RuntimeExecutionContext): void {
  const { capitalCapabilities } = context.plan;
  populateCapitalNativeSupportSeries(
    context.sourceFrame,
    context.sourceSeries,
    context.prepared,
    context.constantsUsed,
    capitalCapabilities.canUseNativeCapitalAllocation,
    capitalCapabilities.canUseNativeCapitalInvestment,
    capitalCapabilities.canUseNativeCapitalStocks,
    capitalCapabilities.canUseNativeCapitalVisibleOutputFormulas,
    capitalCapabilities.canUseNativeCapitalOrdering,
  );
}

function runResource(context: RuntimeExecutionContext): void {
  populateResourceNativeSupportSeries(
    context.sourceFrame,
    context.sourceSeries,
    context.prepared,
    context.constantsUsed,
    context.plan.canUseNativeNrFlow,
  );
}

function runAgriculture(context: RuntimeExecutionContext): void {
  const { agricultureCapabilities } = context.plan;
  populateAgricultureNativeSupportSeries(
    context.sourceFrame,
    context.sourceSeries,
    context.prepared,
    context.constantsUsed,
    agricultureCapabilities.canUseNativeFoodPath,
    agricultureCapabilities.canUseNativeAgriculturalAllocation,
    agricultureCapabilities.canUseNativeAgricultureProductivity,
    agricultureCapabilities.canUseNativeAgricultureOrdering,
  );
}

function runPollution(context: RuntimeExecutionContext): void {
  populatePollutionNativeSupportSeries(
    context.sourceFrame,
    context.sourceSeries,
    context.prepared,
    context.constantsUsed,
    context.plan.pollutionCapabilities.canUseNativePollutionPath,
  );
}

function runPopulationSupport(context: RuntimeExecutionContext): void {
  populatePopulationNativeSupportSeries(
    context.sourceFrame,
    context.sourceSeries,
    context.prepared,
    context.constantsUsed,
    context.plan.canUseNativeLifeExpectancy,
    context.plan.canUseNativeMortality,
    context.plan.canUseNativeCohortSupport,
    context.plan.canUseNativeDeathPath,
    context.plan.canUseNativePopulationStocks,
  );
}

function runPopulationStocks(context: RuntimeExecutionContext): void {
  for (const definition of createPopulationStockStateDefinitions()) {
    context.stepState(definition);
  }
}

function runPopulationBirthSupport(context: RuntimeExecutionContext): void {
  populatePopulationBirthNativeSupportSeries(
    context.sourceFrame,
    context.sourceSeries,
    context.prepared,
    context.constantsUsed,
    context.plan.canUseNativeBirthSupport,
  );
}

function runPopulationP1(context: RuntimeExecutionContext): void {
  context.stepState(createP1StockStateDefinition());
}

function runPopulationSum(context: RuntimeExecutionContext): void {
  populateDerivedBufferFromDefinition(
    context.sourceFrame,
    context.sourceSeries,
    createPopulationSumDerivedDefinition(),
  );
}

function runBirthRate(context: RuntimeExecutionContext): void {
  populateDerivedBufferFromDefinition(
    context.sourceFrame,
    context.sourceSeries,
    createBirthRateDerivedDefinition(),
  );
}

function runResourceStock(context: RuntimeExecutionContext): void {
  if (context.nrStateDefinition) {
    context.stepState(context.nrStateDefinition);
  }
}

export function createRuntimeExecutionGraph(
  plan: RuntimeExecutionPlan,
): RuntimeExecutionStage[] {
  const stages: RuntimeExecutionStage[] = [];

  if (plan.canUseCoupledCapitalResource) {
    stages.push({ id: "coupled-capital-resource", run: runCoupledCapitalResource });
  } else {
    stages.push({ id: "capital", run: runCapital });
    stages.push({ id: "resource", run: runResource });
  }

  stages.push({ id: "agriculture", run: runAgriculture });
  stages.push({ id: "pollution", run: runPollution });
  stages.push({ id: "population-support", run: runPopulationSupport });

  if (plan.canUseNativePopulationStocks) {
    stages.push({ id: "population-stocks", run: runPopulationStocks });
  }

  stages.push({ id: "population-birth-support", run: runPopulationBirthSupport });

  if (plan.canUseNativeP1Stock) {
    stages.push({ id: "population-p1", run: runPopulationP1 });
  }

  if (plan.canUseNativePopulationStocks || plan.canUseNativeP1Stock) {
    stages.push({ id: "population-sum", run: runPopulationSum });
  }

  if (plan.canUseNativeBirthSupport) {
    stages.push({ id: "birth-rate", run: runBirthRate });
  }

  if (!plan.canUseCoupledCapitalResource) {
    stages.push({ id: "resource-stock", run: runResourceStock });
  }

  return stages;
}

export function applyRuntimeExecutionGraph(
  context: RuntimeExecutionContext,
): void {
  for (const stage of createRuntimeExecutionGraph(context.plan)) {
    stage.run(context);
  }
}
