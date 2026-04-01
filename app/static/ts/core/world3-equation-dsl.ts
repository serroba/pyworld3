import type {
  World3AuxiliaryKey,
  World3ConstantKey,
  World3FlowKey,
  World3StockKey,
  World3VariableKey,
} from "./world3-keys.js";
import type {
  World3SimulationBuffers,
  World3SimulationConstants,
  World3SimulationLookups,
} from "./world3-simulation-sectors.js";

export type World3EquationDependency = World3VariableKey | World3ConstantKey;
export type World3DerivedEquationKey = World3AuxiliaryKey | World3FlowKey;
export type World3RuntimeValueKey =
  | "aiopc"
  | "ehspc"
  | "diopc"
  | "ple"
  | "fcfpc"
  | "alai"
  | "ai"
  | "pfr"
  | "ppgf"
  | "pptd"
  | "ppapr"
  | "pcrum"
  | "cmi"
  | "fie"
  | "mpai"
  | "mpld"
  | "fiald"
  | "lmf"
  | "lmp"
  | "icor"
  | "lyf"
  | "lymc"
  | "lfrt"
  | "nruf";

export type World3StockEquationContext = {
  k: number;
  dt: number;
  buffers: World3SimulationBuffers;
  constants: World3SimulationConstants;
};

export type World3StateStockEquation<K extends World3StockKey = World3StockKey> = {
  kind: "state-stock";
  key: K;
  initialConstant: World3ConstantKey;
  inputs: readonly World3EquationDependency[];
  next: (context: World3StockEquationContext) => number;
};

export type World3DerivedStockEquation<K extends World3StockKey = World3StockKey> = {
  kind: "derived-stock";
  key: K;
  inputs: readonly World3VariableKey[];
  compute: (context: World3StockEquationContext) => number;
};

export type World3DerivedEquationContext = World3StockEquationContext & {
  t: number;
  policyYear: number;
  lookups: World3SimulationLookups;
  runtime?: Partial<Record<World3RuntimeValueKey, number>>;
};

export type World3RuntimeValueEquation<K extends World3RuntimeValueKey = World3RuntimeValueKey> = {
  kind: "runtime-value";
  key: K;
  inputs: readonly World3EquationDependency[];
  compute: (context: World3DerivedEquationContext) => number;
};

export function requireWorld3RuntimeValue(
  context: World3DerivedEquationContext,
  key: World3RuntimeValueKey,
): number {
  const value = context.runtime?.[key];
  if (value === undefined) {
    throw new Error(`Missing runtime value '${key}' for derived equation`);
  }
  return value;
}

export type World3DerivedEquation<K extends World3DerivedEquationKey = World3DerivedEquationKey> =
  {
    kind: "derived-equation";
    key: K;
    inputs: readonly World3EquationDependency[];
    compute: (context: World3DerivedEquationContext) => number;
  };

export type World3EquationPhase = {
  kind: "equation-phase";
  name: string;
  equations: readonly World3DerivedEquation[];
};

export type World3RuntimePhase = {
  kind: "runtime-phase";
  name: string;
  values: readonly World3RuntimeValueEquation[];
};

export type World3ExecutionPhase = World3EquationPhase | World3RuntimePhase;

export function defineStateStock<K extends World3StockKey>(
  definition: Omit<World3StateStockEquation<K>, "kind">,
): World3StateStockEquation<K> {
  return {
    kind: "state-stock",
    ...definition,
  };
}

export function defineDerivedStock<K extends World3StockKey>(
  definition: Omit<World3DerivedStockEquation<K>, "kind">,
): World3DerivedStockEquation<K> {
  return {
    kind: "derived-stock",
    ...definition,
  };
}

export function defineDerivedEquation<K extends World3DerivedEquationKey>(
  definition: Omit<World3DerivedEquation<K>, "kind">,
): World3DerivedEquation<K> {
  return {
    kind: "derived-equation",
    ...definition,
  };
}

export function defineRuntimeValue<K extends World3RuntimeValueKey>(
  definition: Omit<World3RuntimeValueEquation<K>, "kind">,
): World3RuntimeValueEquation<K> {
  return {
    kind: "runtime-value",
    ...definition,
  };
}

export function defineEquationPhase(
  name: string,
  equations: readonly World3DerivedEquation[],
): World3EquationPhase {
  return {
    kind: "equation-phase",
    name,
    equations,
  };
}

export function defineRuntimePhase(
  name: string,
  values: readonly World3RuntimeValueEquation[],
): World3RuntimePhase {
  return {
    kind: "runtime-phase",
    name,
    values,
  };
}

export function runWorld3ExecutionPhase(
  phase: World3ExecutionPhase,
  context: World3DerivedEquationContext,
): void {
  if (phase.kind === "runtime-phase") {
    const runtime = { ...(context.runtime ?? {}) };
    for (const value of phase.values) {
      context.runtime = runtime;
      runtime[value.key] = value.compute(context);
    }
    context.runtime = runtime;
    return;
  }

  for (const equation of phase.equations) {
    context.buffers[equation.key][context.k] = equation.compute(context);
  }
}
