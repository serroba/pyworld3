import { describe, expect, test } from "vitest";

import { ModelDomain } from "../ts/model-domain.ts";

describe("ModelDomain", () => {
  test("hydrates model sections from canonical variable and constant metadata", () => {
    const hydrated = ModelDomain.hydrateSection({
      id: "population",
      chartVars: ["pop", "le"],
      constantKeys: ["len", "p1i"],
    });

    expect(hydrated.variables.map((entry) => entry.key)).toEqual(["pop", "le"]);
    expect(hydrated.variables[0]?.meta.full_name).toBe("Total population");
    expect(hydrated.constants.map((entry) => entry.key)).toEqual(["len", "p1i"]);
    expect(hydrated.constants[0]?.meta.full_name).toBe("Life expectancy normal");
    expect(hydrated.constants[0]?.defaultValue).toBe(28);
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
  });
});
