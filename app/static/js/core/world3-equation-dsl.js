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
