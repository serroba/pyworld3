import { createRuntimeStateFrame, runtimeStateFrameToSimulationResult, } from "./runtime-state-frame.js";
export function projectSimulationResult(prepared, fixture) {
    return runtimeStateFrameToSimulationResult(createRuntimeStateFrame(prepared, fixture));
}
