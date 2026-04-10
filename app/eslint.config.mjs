import tseslint from "typescript-eslint";

export default [
  // ─── Hand-written JS (script modules) ───────────────────────
  {
    files: [
      "js/app.js",
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
        I18n: "readonly",
        HTMLCanvasElement: "readonly",
        HTMLSelectElement: "readonly",
        isNaN: "readonly",
        parseFloat: "readonly",
        encodeURIComponent: "readonly",
        decodeURIComponent: "readonly",
        Math: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        history: "readonly",
        CustomEvent: "readonly",
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

  // ─── Compiled JS (ES modules) ───────────────────────────────
  {
    files: [
      "js/browser-native.js",
      "js/charts.js",
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

  // ─── App-level TypeScript (recommended + type-checked) ─────
  ...tseslint.config({
    files: ["ts/*.ts"],
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Allow `== null` / `!= null` (catches both null and undefined intentionally)
      eqeqeq: ["error", "always", { null: "ignore" }],
      "prefer-const": "error",
      "no-var": "error",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      // Chart.js and other browser globals surface as `any` — same pragmatic
      // suppression that the core section applies for its numeric patterns.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
    },
  }),

  // ─── Core TypeScript (strict) ───────────────────────────────
  ...tseslint.config({
    files: ["ts/core/**/*.ts"],
    extends: [
      ...tseslint.configs.strictTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Promote to errors — no warnings allowed in core
      eqeqeq: "error",
      "prefer-const": "error",
      "no-var": "error",

      // Type-checked rules
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/no-unnecessary-condition": "error",
      "@typescript-eslint/prefer-readonly": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/restrict-template-expressions": ["error", {
        allowNumber: true,
      }],

      // Relax rules that conflict with the simulation's numeric patterns
      "@typescript-eslint/no-non-null-assertion": "warn", // 185+ in buffer access — warn for now
      "@typescript-eslint/no-confusing-void-expression": "off", // step functions return void
      "@typescript-eslint/no-unsafe-argument": "off", // too noisy with Record<string, ...> patterns
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/restrict-plus-operands": "off", // numeric addition is the entire simulation
      "@typescript-eslint/no-unnecessary-condition": ["error", {
        allowConstantLoopConditions: true,
      }],
    },
  }),
];
