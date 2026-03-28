export function createTimeGrid(yearMin, yearMax, dt) {
    if (!(dt > 0)) {
        throw new Error("dt must be greater than zero");
    }
    if (yearMax < yearMin) {
        throw new Error("yearMax must be greater than or equal to yearMin");
    }
    const steps = Math.round((yearMax - yearMin) / dt);
    const time = new Float64Array(steps + 1);
    for (let index = 0; index <= steps; index += 1) {
        time[index] = yearMin + index * dt;
    }
    return time;
}
export function createSeriesBuffer(length) {
    return new Float64Array(length);
}
export class Smooth {
    dt;
    input;
    out;
    constructor(input, dt, length = input.length) {
        this.input = input;
        this.dt = dt;
        this.out = new Float64Array(length);
    }
    step(k, delay) {
        if (k === 0) {
            this.out[k] = this.input[k] ?? 0;
            return this.out[k] ?? 0;
        }
        const previous = this.out[k - 1] ?? 0;
        const source = this.input[k - 1] ?? 0;
        const derivative = (source - previous) * (this.dt / delay);
        this.out[k] = previous + derivative;
        return this.out[k] ?? 0;
    }
}
export class Delay3 {
    dt;
    input;
    out;
    states;
    constructor(input, dt, length = input.length) {
        this.input = input;
        this.dt = dt;
        this.out = new Float64Array(length);
        this.states = [
            new Float64Array(length),
            new Float64Array(length),
            new Float64Array(length),
        ];
    }
    init(delay) {
        const initial = (this.input[0] ?? 0) * 3 / delay;
        const [state0, state1, state2] = this.states;
        if (!state0 || !state1 || !state2) {
            throw new Error("Delay3 states are not initialized");
        }
        state0[0] = initial;
        state1[0] = initial;
        state2[0] = initial;
        this.out[0] = initial;
    }
    step(k, delay) {
        if (k === 0) {
            this.init(delay);
            return this.out[0] ?? 0;
        }
        const [state0, state1, state2] = this.states;
        if (!state0 || !state1 || !state2) {
            throw new Error("Delay3 states are not initialized");
        }
        const source = this.input[k - 1] ?? 0;
        const previous0 = state0[k - 1] ?? 0;
        const previous1 = state1[k - 1] ?? 0;
        const previous2 = state2[k - 1] ?? 0;
        const factor = (this.dt * 3) / delay;
        state0[k] = previous0 + (source - previous0) * factor;
        state1[k] = previous1 + (previous0 - previous1) * factor;
        state2[k] = previous2 + (previous1 - previous2) * factor;
        this.out[k] = state2[k] ?? 0;
        return this.out[k] ?? 0;
    }
}
export class Dlinf3 extends Delay3 {
    init() {
        const initial = this.input[0] ?? 0;
        const [state0, state1, state2] = this.states;
        if (!state0 || !state1 || !state2) {
            throw new Error("Dlinf3 states are not initialized");
        }
        state0[0] = initial;
        state1[0] = initial;
        state2[0] = initial;
        this.out[0] = initial;
    }
}
