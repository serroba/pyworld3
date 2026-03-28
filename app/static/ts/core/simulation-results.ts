import type { SimulationResult } from "../simulation-contracts.js";
import type { RuntimePreparation } from "./browser-native-runtime.js";
import {
  createRuntimeStateFrame,
  runtimeStateFrameToSimulationResult,
} from "./runtime-state-frame.js";

export function projectSimulationResult(
  prepared: RuntimePreparation,
  fixture: SimulationResult,
): SimulationResult {
  return runtimeStateFrameToSimulationResult(
    createRuntimeStateFrame(prepared, fixture),
  );
}
