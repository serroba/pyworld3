export const WORLD3_SCENARIO_CONTROL_REGISTRY = [
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
];
export function buildWorld3ScenarioControlMeta() {
    return Object.fromEntries(WORLD3_SCENARIO_CONTROL_REGISTRY.map((definition) => [
        definition.key,
        {
            full_name: definition.fullName,
            unit: definition.unit,
        },
    ]));
}
export function buildWorld3ScenarioControlDefaults() {
    return Object.fromEntries(WORLD3_SCENARIO_CONTROL_REGISTRY.map((definition) => [
        definition.key,
        definition.defaultValue,
    ]));
}
export function buildWorld3ScenarioControlConstraints() {
    return Object.fromEntries(WORLD3_SCENARIO_CONTROL_REGISTRY.map((definition) => [
        definition.key,
        definition.constraints,
    ]));
}
