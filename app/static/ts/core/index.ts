/**
 * Public API surface for the World3 core library.
 *
 * Only high-level entry points and boundary types used by external consumers
 * (browser-native.ts, simulation-provider.ts, browser-native-cli.ts) are
 * exported here.  Tests and other core modules should import directly from
 * the specific module that defines the symbol they need.
 */

export { createCalibrationCore } from "./calibration-core.js";
export { createOwidDataProvider } from "./owid-data.js";
export { createValidationCore } from "./validation-core.js";
export { createWorld3Core } from "./world3-core.js";

export type { OwidDataset } from "./owid-data.js";
export type { RawLookupTable } from "./world3-tables.js";
