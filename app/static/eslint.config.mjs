export default [
  {
    files: [
      "js/app.js",
      "js/charts.js",
      "js/math-explainers.js",
      "js/model-sections.js",
      "js/router.js",
      "js/state.js",
      "js/ui.js",
      "js/views/**/*.js",
    ],
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
        varsIgnorePattern: "^(State|Router|UI|Charts|ModelData|SimulationProvider|buildSimulationRequestFromPreset|resolveScenarioRequest|IntroView|ExploreView|CompareView|AdvancedView|_)",
        caughtErrorsIgnorePattern: "^_",
      }],
      eqeqeq: "warn",
      "no-var": "error",
      "prefer-const": "warn",
    },
  },
  {
    files: [
      "js/browser-native.js",
      "js/model-data.js",
      "js/simulation-contracts.js",
      "js/simulation-provider.js",
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        window: "readonly",
        fetch: "readonly",
        Promise: "readonly",
        Object: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", {
        varsIgnorePattern: "^(ModelData|SimulationProvider|LOCAL_STANDARD_RUN_FIXTURE_URL|LOCAL_PROVIDER_ERROR|_)",
        caughtErrorsIgnorePattern: "^_",
      }],
      eqeqeq: "warn",
      "no-var": "error",
      "prefer-const": "warn",
    },
  },
];
