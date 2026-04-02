import { describe, expect, test } from "vitest";

import { WORLD3_SERIES_REGISTRY } from "../ts/core/world3-registry.ts";
import { WORLD3_EQUATION_REFERENCE } from "../ts/core/world3-equation-reference.ts";
import {
  WORLD3_STATE_STOCK_EQUATIONS,
  WORLD3_DERIVED_STOCK_EQUATIONS,
  WORLD3_RESOURCE_DERIVED_EQUATIONS,
  WORLD3_POPULATION_FLOW_EQUATIONS,
  WORLD3_CAPITAL_LEADING_EQUATIONS,
  WORLD3_CAPITAL_FLOW_EQUATIONS,
  WORLD3_CAPITAL_ALLOCATION_EQUATIONS,
  WORLD3_CAPITAL_INVESTMENT_EQUATIONS,
  WORLD3_POPULATION_BIRTH_EQUATIONS,
  WORLD3_POPULATION_LEADING_EQUATIONS,
  WORLD3_AGRICULTURE_EQUATIONS,
  WORLD3_POLLUTION_EQUATIONS,
  WORLD3_CROSS_SECTOR_EQUATIONS,
  WORLD3_CROSS_SECTOR_RESOURCE_EQUATIONS,
  WORLD3_POPULATION_FEEDBACK_PRIMARY_EQUATIONS,
  WORLD3_POPULATION_FEEDBACK_LATE_EQUATIONS,
} from "../ts/core/world3-simulation-sectors.ts";

/**
 * Collects all variable keys declared across DSL equation arrays.
 * This is the set of variables the model promises to compute via the DSL.
 */
function collectDslKeys(): Set<string> {
  const allEquations = [
    ...WORLD3_STATE_STOCK_EQUATIONS,
    ...WORLD3_DERIVED_STOCK_EQUATIONS,
    ...WORLD3_RESOURCE_DERIVED_EQUATIONS,
    ...WORLD3_POPULATION_FLOW_EQUATIONS,
    ...WORLD3_CAPITAL_LEADING_EQUATIONS,
    ...WORLD3_CAPITAL_FLOW_EQUATIONS,
    ...WORLD3_CAPITAL_ALLOCATION_EQUATIONS,
    ...WORLD3_CAPITAL_INVESTMENT_EQUATIONS,
    ...WORLD3_POPULATION_BIRTH_EQUATIONS,
    ...WORLD3_POPULATION_LEADING_EQUATIONS,
    ...WORLD3_AGRICULTURE_EQUATIONS,
    ...WORLD3_POLLUTION_EQUATIONS,
    ...WORLD3_CROSS_SECTOR_EQUATIONS,
    ...WORLD3_CROSS_SECTOR_RESOURCE_EQUATIONS,
    ...WORLD3_POPULATION_FEEDBACK_PRIMARY_EQUATIONS,
    ...WORLD3_POPULATION_FEEDBACK_LATE_EQUATIONS,
  ];
  return new Set(allEquations.map((eq) => eq.key));
}

describe("DSL equation coverage", () => {
  const dslKeys = collectDslKeys();
  const registeredKeys = new Set(WORLD3_SERIES_REGISTRY.map((s) => s.key));

  test("no duplicate keys across equation arrays", () => {
    const allEquations = [
      ...WORLD3_STATE_STOCK_EQUATIONS,
      ...WORLD3_DERIVED_STOCK_EQUATIONS,
      ...WORLD3_RESOURCE_DERIVED_EQUATIONS,
      ...WORLD3_POPULATION_FLOW_EQUATIONS,
      ...WORLD3_CAPITAL_LEADING_EQUATIONS,
      ...WORLD3_CAPITAL_FLOW_EQUATIONS,
      ...WORLD3_CAPITAL_ALLOCATION_EQUATIONS,
      ...WORLD3_CAPITAL_INVESTMENT_EQUATIONS,
      ...WORLD3_POPULATION_BIRTH_EQUATIONS,
      ...WORLD3_POPULATION_LEADING_EQUATIONS,
      ...WORLD3_AGRICULTURE_EQUATIONS,
      ...WORLD3_POLLUTION_EQUATIONS,
      ...WORLD3_CROSS_SECTOR_EQUATIONS,
      ...WORLD3_CROSS_SECTOR_RESOURCE_EQUATIONS,
      ...WORLD3_POPULATION_FEEDBACK_PRIMARY_EQUATIONS,
      ...WORLD3_POPULATION_FEEDBACK_LATE_EQUATIONS,
    ];
    const keys = allEquations.map((eq) => eq.key);
    const duplicates = keys.filter((k, i) => keys.indexOf(k) !== i);
    expect(duplicates, "Duplicate equation keys").toEqual([]);
  });

  test("every registered variable has a DSL equation", () => {
    const missing = [...registeredKeys].filter((k) => !dslKeys.has(k));
    expect(
      missing,
      "Variables in WORLD3_SERIES_REGISTRY without a DSL equation",
    ).toEqual([]);
  });

  test("DSL declares more equations than the registry (internal intermediates are expected)", () => {
    // The DSL includes internal computation steps (mortality rates, maturation
    // flows, depreciation, etc.) that aren't exposed as output variables.
    // This is expected — the DSL is a superset of the public series registry.
    expect(dslKeys.size).toBeGreaterThanOrEqual(registeredKeys.size);
  });
});

describe("equation reference completeness", () => {
  const referenceKeys = new Set(Object.keys(WORLD3_EQUATION_REFERENCE));
  const dslKeys = collectDslKeys();

  test("every registered output variable has an equation reference", () => {
    const registeredKeys = WORLD3_SERIES_REGISTRY.map((s) => s.key);
    const missing = registeredKeys.filter((k) => !referenceKeys.has(k));
    expect(missing, "Registered variables without an equation reference").toEqual([]);
  });

  test("every equation reference key exists in the DSL", () => {
    const orphaned = [...referenceKeys].filter((k) => !dslKeys.has(k));
    expect(orphaned, "Reference keys with no matching DSL equation").toEqual([]);
  });

  test("every DSL equation key has an equation reference", () => {
    const missing = [...dslKeys].filter((k) => !referenceKeys.has(k));
    expect(missing, "DSL equation keys without a reference entry").toEqual([]);
  });

  test("every reference entry has all required fields", () => {
    for (const [key, ref] of Object.entries(WORLD3_EQUATION_REFERENCE)) {
      expect(ref.dynamo, `${key}.dynamo`).toBeTruthy();
      expect(ref.source, `${key}.source`).toBeTruthy();
      expect(ref.description, `${key}.description`).toBeTruthy();
    }
  });
});
