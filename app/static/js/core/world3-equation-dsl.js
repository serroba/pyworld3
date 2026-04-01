export function requireWorld3RuntimeValue(context, key) {
    const value = context.runtime?.[key];
    if (value === undefined) {
        throw new Error(`Missing runtime value '${key}' for derived equation`);
    }
    return value;
}
export function defineStateStock(definition) {
    return {
        kind: "state-stock",
        ...definition,
    };
}
export function defineDerivedStock(definition) {
    return {
        kind: "derived-stock",
        ...definition,
    };
}
export function defineDerivedEquation(definition) {
    return {
        kind: "derived-equation",
        ...definition,
    };
}
export function defineRuntimeValue(definition) {
    return {
        kind: "runtime-value",
        ...definition,
    };
}
export function defineEquationPhase(name, equations) {
    return {
        kind: "equation-phase",
        name,
        equations,
    };
}
export function defineRuntimePhase(name, values) {
    return {
        kind: "runtime-phase",
        name,
        values,
    };
}
export function runWorld3ExecutionPhase(phase, context) {
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
