/**
 * Shared application state — populated once at boot, read by all views.
 */

const State = {
  /** @type {Array<{name:string, description:string, constants:Object}>} */
  presets: [],

  /** @type {Object<string, number>} constant name → default value */
  constantDefaults: {},

  /** @type {Object<string, {full_name:string, unit:string, sector:string}>} */
  constantMeta: {},

  /** @type {Object<string, {full_name:string, unit:string, sector:string}>} */
  variableMeta: {},

  /** @type {string[]} */
  defaultVariables: [],

  /** True once all metadata has been loaded */
  ready: false,

  /** Load all metadata from the API (called once at boot). */
  async init() {
    const [presets, constants, variables, cMeta, vMeta] = await Promise.all([
      API.getPresets(),
      API.getConstants(),
      API.getVariables(),
      API.getConstantMeta(),
      API.getVariableMeta(),
    ]);
    this.presets = presets;
    this.constantDefaults = constants;
    this.defaultVariables = variables;
    this.constantMeta = cMeta;
    this.variableMeta = vMeta;
    this.ready = true;
  },
};
