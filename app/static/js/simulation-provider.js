"use strict";
/**
 * Simulation provider seam.
 *
 * HTTP remains the default implementation for now. This lets us move the UI
 * onto a stable abstraction before introducing a browser-native engine.
 */
const SimulationProvider = {
    mode: "http",
    async simulatePreset(name, overrides) {
        return API.simulatePreset(name, overrides);
    },
    async simulate(request, options) {
        return API.simulate(request, options);
    },
    async compare(scenarioA, scenarioB) {
        return API.compare(scenarioA, scenarioB);
    },
};
window.SimulationProvider = SimulationProvider;
