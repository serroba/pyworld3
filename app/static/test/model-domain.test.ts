import { describe, expect, test } from "vitest";

import { ModelDomain } from "../ts/model-domain.ts";

describe("ModelDomain", () => {
  test("hydrates model sections from canonical variable and constant metadata", () => {
    const hydrated = ModelDomain.hydrateSection({
      id: "population",
      chartVars: ["pop", "le"],
      constantKeys: ["len", "p1i"],
      requestKeys: ["pyear"],
    });

    expect(hydrated.variables.map((entry) => entry.key)).toEqual(["pop", "le"]);
    expect(hydrated.variables[0]?.meta.full_name).toBe("Total population");
    expect(hydrated.constants.map((entry) => entry.key)).toEqual(["len", "p1i", "pyear"]);
    expect(hydrated.constants[0]?.label).toBe("Life expectancy normal");
    expect(hydrated.constants[0]?.defaultValue).toBe(28);
    expect(hydrated.constants[2]).toMatchObject({
      key: "pyear",
      label: "Policy implementation year",
      defaultValue: 1975,
      source: "request",
    });
    expect("constantKeys" in hydrated).toBe(false);
    expect("requestKeys" in hydrated).toBe(false);
    expect("constants" in hydrated && Array.isArray(hydrated.constants)).toBe(true);
  });

  test("supports explainer variable hydration through the same registry", () => {
    const hydrated = ModelDomain.hydrateExplainer({ variables: ["nrfr", "fcaor"] });

    expect(hydrated.variables.map((entry) => entry.key)).toEqual(["nrfr", "fcaor"]);
    expect(hydrated.variables[0]?.meta.full_name).toBe(
      "Nonrenewable resource fraction remaining",
    );
  });

  test("throws for unknown model keys", () => {
    expect(() =>
      ModelDomain.hydrateSection({
        id: "broken",
        chartVars: ["pop", "not-real"],
      }),
    ).toThrow("Unknown World3 variable: not-real");

    expect(() =>
      ModelDomain.hydrateSection({
        id: "broken-constants",
        constantKeys: ["len", "bad-constant"],
      }),
    ).toThrow("Unknown World3 constant: bad-constant");

    expect(() =>
      ModelDomain.hydrateSection({
        id: "broken-request",
        requestKeys: ["not-real" as never],
      }),
    ).toThrow("Unknown World3 request field: not-real");
  });
});
