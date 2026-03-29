import { extendCapitalSourceVariables, populateCapitalNativeSupportSeries, } from "./capital-sector.js";
import { computeCoupledCapitalResourceSeries } from "./coupled-capital-resource-runtime.js";
import { extendResourceSourceVariables, populateResourceNativeSupportSeries, } from "./resource-sector.js";
import { extendPopulationSourceVariables, populatePopulationNativeSupportSeries, } from "./population-sector.js";
export function createRuntimeExecutionPlan(prepared, fixture) {
    const sourceVariables = new Set(prepared.outputVariables.filter((variable) => variable !== "nrfr" &&
        variable !== "fcaor" &&
        variable !== "io" &&
        variable !== "iopc" &&
        variable !== "so" &&
        variable !== "sopc"));
    const capitalCapabilities = extendCapitalSourceVariables(sourceVariables, prepared.outputVariables, fixture, prepared.lookupLibrary);
    const { canUseNativeNrFlow } = extendResourceSourceVariables(sourceVariables, prepared.outputVariables, fixture, prepared.lookupLibrary, capitalCapabilities.canUseNativeCapitalOrdering);
    const { canUseNativeLifeExpectancy } = extendPopulationSourceVariables(sourceVariables, prepared.outputVariables, fixture, prepared.lookupLibrary);
    return {
        sourceVariables,
        capitalCapabilities,
        canUseNativeNrFlow,
        canUseCoupledCapitalResource: capitalCapabilities.canUseNativeCapitalOrdering &&
            canUseNativeNrFlow &&
            sourceVariables.has("nr"),
        canUseNativeLifeExpectancy,
    };
}
export function applyRuntimeExecutionPlan(sourceFrame, sourceSeries, prepared, constantsUsed, plan, stepNr, nrStateDefinition) {
    if (plan.canUseCoupledCapitalResource) {
        const coupledSeries = computeCoupledCapitalResourceSeries(sourceFrame, prepared, constantsUsed);
        for (const [name, values] of Object.entries(coupledSeries)) {
            sourceSeries.set(name, values);
        }
        return;
    }
    populateCapitalNativeSupportSeries(sourceFrame, sourceSeries, prepared, constantsUsed, plan.capitalCapabilities.canUseNativeCapitalAllocation, plan.capitalCapabilities.canUseNativeCapitalInvestment, plan.capitalCapabilities.canUseNativeCapitalStocks, plan.capitalCapabilities.canUseNativeCapitalVisibleOutputFormulas, plan.capitalCapabilities.canUseNativeCapitalOrdering);
    populateResourceNativeSupportSeries(sourceFrame, sourceSeries, prepared, constantsUsed, plan.canUseNativeNrFlow);
    populatePopulationNativeSupportSeries(sourceFrame, sourceSeries, prepared, constantsUsed, plan.canUseNativeLifeExpectancy);
    if (sourceSeries.has("nr") && nrStateDefinition) {
        stepNr(nrStateDefinition);
    }
}
