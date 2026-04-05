# CLAUDE.md

Project-specific instructions for Claude Code.

## What this project is

An interactive World3 system dynamics simulator at [limits.world](https://limits.world). The World3 model (1972, MIT) simulates population, capital, agriculture, pollution, and resources from 1900 to 2100.

## Tech stack

- **TypeScript** for all simulation logic and app-level modules
- **Hand-written JS** for browser views (`app/js/views/`), router, UI, state
- **No framework** — vanilla DOM, Chart.js for charts, CSS custom properties
- **No bundler** — tsc compiles TS to ES modules, browser loads them directly
- **No Python** — the project was migrated from Python; all Python artifacts are removed

## Repository layout

- `packages/core/src/` — **single source of truth** for the simulation engine (published as `@world3/core`)
- `app/ts/core/` — **generated** by `scripts/sync-core.sh` (gitignored, do NOT edit)
- `app/ts/` — app-level TypeScript (browser-native bootstrap, charts, i18n, simulation provider)
- `app/js/` — hand-written JS (views, router, state, UI) + compiled TS output (gitignored)
- `app/js/views/` — 11 view modules that consume globals (`Charts`, `State`, `UI`, `I18n`, `SimulationProvider`)
- `app/ts/worker.ts` — Cloudflare Worker serving API + SPA (entry point in wrangler.jsonc)
- `app/test/` — vitest unit tests + Playwright E2E

## Critical patterns

### Global binding pattern
TS modules export functions AND assign to `window.GlobalName` so hand-written view JS can use them. Examples: `window.Charts`, `window.SimulationProvider`, `window.I18n`, `window.State`.

### Core sync pipeline
`packages/core/src/` → (sync-core.sh copies) → `app/ts/core/` → (tsc compiles) → `app/js/core/`

The sync runs automatically via npm `prebuild`, `pretest`, `pretypecheck` hooks. If you edit core simulation code, edit in `packages/core/src/`, never in `app/ts/core/`.

### Equation DSL
The simulation uses a declarative DSL (`world3-equation-dsl.ts`) with four equation types:
- `defineStateStock` — Euler-integrated stocks (population, capital, land, etc.)
- `defineDerivedStock` — Computed from other stocks (total population = sum of cohorts)
- `defineDerivedEquation` — Auxiliaries and flows
- `defineRuntimeValue` — Cached intermediates (policy switches via CLIP)

Every equation is cross-referenced to DYNAMO source in `world3-equation-reference.ts`.

### Policy switches
Constants come in pairs (e.g., `icor1`/`icor2`). The `clip()` function switches at `pyear`. Presets like `comprehensive-policy` set `*2` values; `standard-run` has `*1 == *2` (no change).

### Divergence simulation
`SimulationRequest.diverge_year` + `base_constants` makes the engine run with base constants until the diverge year, then switch. Only affects rate/policy constants — initial stock values (`nri`, `p1i`, etc.) are set at 1900 and unaffected.

## Build & test

```bash
cd app
npm run build        # sync core + compile TS
npm run typecheck    # all 3 tsconfig variants
npx vitest run       # ~290 unit tests
npm run test:e2e     # Playwright E2E
```

## i18n

22 locale files in `app/data/locales/`. Always add new i18n keys to `en.json` first, then all other locale files. There is a locale completeness test that will fail if keys are missing.

## CI

7 GitHub Actions workflows. All app steps use `working-directory: app`. The Cloudflare build command is `cd app && npm ci && npm run build` (configured in dashboard, not in repo).

## Things to avoid

- Never edit `app/ts/core/` — edit `packages/core/src/` instead
- Never use Python tooling — this is a pure TS/JS project
- Don't add `app/js/core/` or `app/ts/core/` to git — they're generated
- Don't use `app/static/` paths — the directory was flattened to `app/`
