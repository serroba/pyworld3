/**
 * @world3/core — World3 system dynamics simulation engine.
 *
 * This is the public API surface. Consumers should only import from
 * this module, not from individual files.
 */

// ── Factories ───────────────────────────────────────────────────
export { createWorld3Core } from "./world3-core.js";
export { createCalibrationCore } from "./calibration-core.js";
export { createOwidDataProvider } from "./owid-data.js";
export { createValidationCore } from "./validation-core.js";

// ── Static data ─────────────────────────────────────────────────
export { ModelData } from "./model-data.js";
export { WORLD3_EQUATION_REFERENCE } from "./world3-equation-reference.js";

// ── Contract helpers ────────────────────────────────────────────
export {
  buildSimulationRequestFromPreset,
  resolveScenarioRequest,
} from "./simulation-contracts.js";

// ── Types ───────────────────────────────────────────────────────
export type {
  ConstantMap,
  SimulationRequest,
  SimulationResult,
  TimeSeriesResult,
  CompareResult,
  CompareMetric,
  PresetInfo,
  ModelDataPayload,
  ScenarioSpec,
} from "./simulation-contracts.js";

export type {
  World3VariableKey,
  World3ConstantKey,
} from "./world3-keys.js";

export type { RawLookupTable } from "./world3-tables.js";
export type { EquationReference } from "./world3-equation-reference.js";
export type { OwidDataset } from "./owid-data.js";
