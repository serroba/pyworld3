import type { SimulationRequest } from "./simulation-contracts.js";

export type ScenarioControlKey = keyof Pick<
  SimulationRequest,
  "year_min" | "year_max" | "dt" | "pyear" | "iphst"
>;

export type ScenarioControlDefinition = {
  key: ScenarioControlKey;
  fullName: string;
  unit: string;
  defaultValue: number;
  constraints: [number | null, number | null];
};

export const WORLD3_SCENARIO_CONTROL_REGISTRY: ReadonlyArray<ScenarioControlDefinition> = [
  {
    key: "year_min",
    fullName: "Start year",
    unit: "year",
    defaultValue: 1900,
    constraints: [1800, 2300],
  },
  {
    key: "year_max",
    fullName: "End year",
    unit: "year",
    defaultValue: 2100,
    constraints: [1800, 2300],
  },
  {
    key: "dt",
    fullName: "Time step",
    unit: "years",
    defaultValue: 0.5,
    constraints: [0.01, 50],
  },
  {
    key: "pyear",
    fullName: "Policy implementation year",
    unit: "year",
    defaultValue: 1975,
    constraints: [1800, 2300],
  },
  {
    key: "iphst",
    fullName: "Health services impact start year",
    unit: "year",
    defaultValue: 1940,
    constraints: [1800, 2300],
  },
] as const;

export function buildWorld3ScenarioControlMeta(): Record<
  ScenarioControlKey,
  { full_name: string; unit: string }
> {
  return Object.fromEntries(
    WORLD3_SCENARIO_CONTROL_REGISTRY.map((definition) => [
      definition.key,
      {
        full_name: definition.fullName,
        unit: definition.unit,
      },
    ]),
  ) as Record<ScenarioControlKey, { full_name: string; unit: string }>;
}

export function buildWorld3ScenarioControlDefaults(): Record<ScenarioControlKey, number> {
  return Object.fromEntries(
    WORLD3_SCENARIO_CONTROL_REGISTRY.map((definition) => [
      definition.key,
      definition.defaultValue,
    ]),
  ) as Record<ScenarioControlKey, number>;
}

export function buildWorld3ScenarioControlConstraints(): Record<
  ScenarioControlKey,
  [number | null, number | null]
> {
  return Object.fromEntries(
    WORLD3_SCENARIO_CONTROL_REGISTRY.map((definition) => [
      definition.key,
      definition.constraints,
    ]),
  ) as Record<ScenarioControlKey, [number | null, number | null]>;
}
