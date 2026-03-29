/**
 * API client — thin wrappers around fetch for all PyWorld3 endpoints.
 */

const API = (() => {
  async function _json(resp) {
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      throw new Error(body.detail || `HTTP ${resp.status}`);
    }
    return resp.json();
  }

  return {
    /** GET /presets */
    async getPresets() {
      return _json(await fetch("/presets"));
    },

    /** GET /constants */
    async getConstants() {
      return _json(await fetch("/constants"));
    },

    /** GET /variables */
    async getVariables() {
      return _json(await fetch("/variables"));
    },

    /** GET /metadata/constants */
    async getConstantMeta() {
      return _json(await fetch("/metadata/constants"));
    },

    /** GET /metadata/variables */
    async getVariableMeta() {
      return _json(await fetch("/metadata/variables"));
    },

    /** POST /simulate/preset/:name */
    async simulatePreset(name, overrides) {
      return _json(
        await fetch(`/simulate/preset/${encodeURIComponent(name)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: overrides ? JSON.stringify(overrides) : undefined,
        })
      );
    },

    /** POST /simulate */
    async simulate(request, { signal } = {}) {
      return _json(
        await fetch("/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request || {}),
          signal,
        })
      );
    },

    /** POST /compare */
    async compare(scenarioA, scenarioB) {
      return _json(
        await fetch("/compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenario_a: scenarioA,
            scenario_b: scenarioB || undefined,
          }),
        })
      );
    },

    /** POST /calibrate */
    async calibrate({ reference_year, entity, parameters } = {}) {
      return _json(
        await fetch("/calibrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference_year, entity, parameters }),
        })
      );
    },

    /** POST /calibrate/data */
    async calibrateData({ reference_year, entity, parameters } = {}) {
      return _json(
        await fetch("/calibrate/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference_year, entity, parameters }),
        })
      );
    },

    /** POST /validate */
    async validate(simRequest, { entity, variables } = {}) {
      return _json(
        await fetch("/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            simulation_request: simRequest || {},
            validation_request: { entity, variables },
          }),
        })
      );
    },

    /** POST /validate/result */
    async validateResult(simulationResult, { entity, variables } = {}) {
      return _json(
        await fetch("/validate/result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            simulation_result: simulationResult,
            validation_request: { entity, variables },
          }),
        })
      );
    },
  };
})();

window.API = API;
