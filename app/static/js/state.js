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

  /** Load all metadata from local model data (called once at boot). */
  async init() {
    this.presets = ModelData.presets.map((preset) => ({
      ...preset,
      constants: { ...preset.constants },
    }));
    this.constantDefaults = { ...ModelData.constantDefaults };
    this.defaultVariables = [...ModelData.defaultVariables];
    this.constantMeta = { ...ModelData.constantMeta };
    this.variableMeta = { ...ModelData.variableMeta };
    this.ready = true;
  },
};
