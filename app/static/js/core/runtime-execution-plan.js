import { extendAgricultureSourceVariables, } from "./agriculture-sector.js";
import { extendCapitalSourceVariables, } from "./capital-sector.js";
import { extendResourceSourceVariables, } from "./resource-sector.js";
import { extendPopulationSourceVariables, } from "./population-sector.js";
import { extendPollutionSourceVariables, POLLUTION_OUTPUTS, } from "./pollution-sector.js";
import { applyRuntimeExecutionGraph } from "./runtime-execution-graph.js";
const AGRICULTURE_NATIVE_OUTPUTS = new Set([
    "al",
    "f",
    "fioaa",
    "fpc",
    "ly",
    "tai",
    "pal",
    "ldr",
    "ler",
    "lrui",
    "dcph",
    "fiald",
    "cai",
    "ai",
    "falm",
    "fr",
    "pfr",
    "all",
    "llmy",
    "uil",
    "uilpc",
    "uilr",
    "lfert",
    "lfr",
    "lfrt",
    "lfd",
    "lfdr",
    "mpld",
    "mpai",
    "mlymc",
]);
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
const POPULATION_OUTPUTS_REQUIRING_POLLUTION = new Set([
    "le",
    "m1",
    "m2",
    "m3",
    "m4",
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
export function createRuntimeExecutionPlan(prepared, fixture) {
    const sourceVariables = new Set(prepared.outputVariables.filter((variable) => variable !== "nrfr" &&
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
        !POLLUTION_OUTPUTS.has(variable) &&
        !AGRICULTURE_NATIVE_OUTPUTS.has(variable)));
    const needsNativeFoodPath = prepared.outputVariables.some((variable) => POPULATION_OUTPUTS_REQUIRING_FOOD.has(variable));
    const agricultureCapabilities = extendAgricultureSourceVariables(sourceVariables, prepared.outputVariables, fixture, prepared.lookupLibrary, needsNativeFoodPath);
    const capitalCapabilities = extendCapitalSourceVariables(sourceVariables, prepared.outputVariables, fixture, prepared.lookupLibrary);
    const { canUseNativeNrFlow } = extendResourceSourceVariables(sourceVariables, prepared.outputVariables, fixture, prepared.lookupLibrary, capitalCapabilities.canUseNativeCapitalOrdering);
    const needsNativePollutionForPopulation = prepared.outputVariables.some((variable) => POPULATION_OUTPUTS_REQUIRING_POLLUTION.has(variable));
    const pollutionCapabilities = extendPollutionSourceVariables(sourceVariables, prepared.outputVariables, fixture, prepared.lookupLibrary, agricultureCapabilities.canUseNativeAgricultureOrdering, canUseNativeNrFlow, needsNativePollutionForPopulation);
    const { canUseNativeLifeExpectancy, canUseNativeMortality, canUseNativeCohortSupport, canUseNativeDeathPath, canUseNativePopulationStocks, canUseNativeBirthSupport, canUseNativeP1Stock, } = extendPopulationSourceVariables(sourceVariables, prepared.outputVariables, fixture, prepared.lookupLibrary, agricultureCapabilities.canUseNativeFoodPath ||
        agricultureCapabilities.canUseNativeAgricultureOrdering, pollutionCapabilities.canUseNativePollutionPath);
    return {
        sourceVariables,
        agricultureCapabilities,
        capitalCapabilities,
        canUseNativeNrFlow,
        canUseCoupledCapitalResource: capitalCapabilities.canUseNativeCapitalOrdering &&
            canUseNativeNrFlow &&
            sourceVariables.has("nr"),
        canUseNativeLifeExpectancy,
        canUseNativeMortality,
        canUseNativeCohortSupport,
        canUseNativeDeathPath,
        canUseNativePopulationStocks,
        canUseNativeBirthSupport,
        canUseNativeP1Stock,
        pollutionCapabilities,
    };
}
export function applyRuntimeExecutionPlan(sourceFrame, sourceSeries, prepared, constantsUsed, plan, stepNr, nrStateDefinition) {
    const executionContext = {
        sourceFrame,
        sourceSeries,
        prepared,
        constantsUsed,
        plan,
        stepState: stepNr,
    };
    if (!plan.canUseCoupledCapitalResource && sourceSeries.has("nr") && nrStateDefinition) {
        applyRuntimeExecutionGraph({
            ...executionContext,
            nrStateDefinition,
        });
        return;
    }
    applyRuntimeExecutionGraph(executionContext);
}
