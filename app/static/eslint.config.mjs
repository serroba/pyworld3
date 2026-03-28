export default [
  {
    files: ["js/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        window: "readonly",
        document: "readonly",
        location: "readonly",
        fetch: "readonly",
        Chart: "readonly",
        console: "readonly",
        HTMLCanvasElement: "readonly",
        isNaN: "readonly",
        parseFloat: "readonly",
        encodeURIComponent: "readonly",
        decodeURIComponent: "readonly",
        Math: "readonly",
        Promise: "readonly",
        Object: "readonly",
        JSON: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", {
        varsIgnorePattern: "^(API|State|Router|UI|Charts|ModelData|SimulationProvider|buildSimulationRequestFromPreset|resolveScenarioRequest|IntroView|ExploreView|CompareView|AdvancedView|_)",
        caughtErrorsIgnorePattern: "^_",
      }],
      eqeqeq: "warn",
      "no-var": "error",
      "prefer-const": "warn",
    },
  },
];
