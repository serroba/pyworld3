<p align="center">
  <img src="./app/assets/brand/world3-mark.svg" alt="World3" width="120" />
</p>

<p align="center"><b>Explore the Limits to Growth model interactively</b></p>

<p align="center">
  <a href="https://github.com/serroba/world3/actions/workflows/ui-validate.yml"><img src="https://github.com/serroba/world3/actions/workflows/ui-validate.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/serroba/world3/actions/workflows/container-smoke.yml"><img src="https://github.com/serroba/world3/actions/workflows/container-smoke.yml/badge.svg" alt="E2E" /></a>
  <a href="https://github.com/serroba/world3/actions/workflows/deploy-pages.yml"><img src="https://github.com/serroba/world3/actions/workflows/deploy-pages.yml/badge.svg" alt="Deploy" /></a>
  <a href="https://www.gnu.org/licenses/gpl-3.0.html"><img src="https://img.shields.io/badge/licence-GPL%20v3-028181" alt="License: GPL v3" /></a>
</p>

<p align="center">
  <a href="https://limits.world">Live app</a> · <a href="https://www.npmjs.com/package/@world3/core">npm package</a>
</p>

---

- [About](#about)
- [Quick Start](#quick-start)
- [CLI](#cli)
- [API](#api)
- [Features](#features)
- [Repository Structure](#repository-structure)
- [Architecture](#architecture)
- [Deployment](#deployment)
- [References](#references)
- [Licence](#licence)

---

# About

**World3** is a system dynamics model that simulates the long-term interaction of population, industrial capital, agriculture, pollution, and nonrenewable resources. It was built at MIT in 1972 and published as [*The Limits to Growth*](https://www.clubofrome.org/publication/the-limits-to-growth/) by the Club of Rome.

This project is an interactive, browser-native World3 simulator at [limits.world](https://limits.world). It lets you explore scenarios, adjust model constants, and see how different assumptions about technology, policy, and resources shape the trajectory of civilization from 1900 to 2100.

# Quick Start

## Web App

```bash
cd app
npm ci
npm run build
npm run serve -- --port 8000
```

Then open `http://localhost:8000`.

## TypeScript Checks

```bash
cd app
npm run typecheck
npm run test:coverage
```

## End-to-End Tests

```bash
cd app
npx playwright install chromium
npm run test:e2e
```

# CLI

The CLI uses the same TypeScript simulation core as the web app. Run any preset scenario or override individual constants from the terminal.

```bash
cd app
npm run build

# ASCII chart of the standard run
npm run browser-native:cli -- --tui

# Compare presets
npm run browser-native:cli -- --tui --preset optimistic-technology
npm run browser-native:cli -- --tui --preset comprehensive-policy

# Override constants
npm run browser-native:cli -- --tui --set nri=2e12 --set dcfsn=2.0

# List all available constants
npm run browser-native:cli -- --list-constants

# Numeric summary
npm run browser-native:cli -- --summary --preset doubled-resources

# Export SVG chart
npm run browser-native:cli -- --plot-svg /tmp/world3.svg
```

# API

The simulator exposes a JSON API when deployed via Cloudflare Workers. The same simulation engine that runs in the browser runs server-side.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/simulate` | Run a simulation with custom parameters |
| `GET` | `/api/presets` | List presets, constants, and variable metadata |

## Quick example

```bash
# Standard run (all defaults)
curl -X POST https://limits.world/api/simulate \
  -H "Content-Type: application/json" \
  -d '{}'

# Named preset with overrides
curl -X POST https://limits.world/api/simulate \
  -H "Content-Type: application/json" \
  -d '{"preset": "comprehensive-policy", "year_max": 2200}'
```

## Specifications

| Resource | URL | Source |
|----------|-----|--------|
| OpenAPI 3.0 spec | [/openapi.json](https://limits.world/openapi.json) | [`app/openapi.json`](./app/openapi.json) |
| Agent manifest | [/agent.json](https://limits.world/agent.json) | [`app/agent.json`](./app/agent.json) |
| Developer docs | [/developers](https://limits.world/developers) | In-app API reference |

# Features

- **6 preset scenarios**: Standard run, Optimistic technology, Comprehensive policy, Doubled resources, Population stability, Recalibration 2023
- **Scenario comparison**: Overlay two scenarios with divergence year selection (1972, 2004, 2024, or custom) to visualize "what if we changed course at year X?"
- **Interactive parameter editor**: Adjust any of 60+ model constants with sliders and see results in real time
- **Calibration & validation**: Fit constants to Our World in Data observations and validate against real-world time series
- **22 languages**: English, Spanish, French, German, Italian, Dutch, Hungarian, Polish, Turkish, Russian, Ukrainian, Arabic, Hindi, Bengali, Indonesian, Vietnamese, Thai, Japanese, Simplified Chinese, Traditional Chinese, Portuguese (Brazil & Portugal)
- **Chart annotations**: "Now" and "Policy" year markers on all charts
- **Dark mode**: Automatic via `prefers-color-scheme`, charts adapt live
- **Keyboard shortcuts**: Press `?` for the full shortcut reference
- **Accessibility**: Skip link, focus-visible, aria-live regions, chart labels
- **CLI**: Terminal chart, preset selection, constant overrides, SVG export
- **JSON API**: `POST /api/simulate` for programmatic access

# Repository Structure

```
world3/
├── app/                          Frontend application
│   ├── index.html                SPA entry point
│   ├── ts/                       TypeScript source
│   │   ├── core/                 Synced from packages/core/src/ (gitignored)
│   │   ├── cli/                  CLI tools (static-server, browser-native-cli)
│   │   ├── charts.ts             Chart rendering (Chart.js wrappers)
│   │   ├── simulation-provider.ts
│   │   ├── browser-native.ts     Bootstrap for browser runtime
│   │   └── ...                   i18n, scenario state, model domain
│   ├── js/                       Hand-written JS (views, router, UI)
│   │   └── views/                11 view modules (explore, compare, advanced, ...)
│   ├── css/                      Stylesheets (CSS custom properties, dark mode)
│   ├── data/                     Locales (22 languages), lookup tables, OWID data
│   ├── test/                     Unit tests (vitest) + E2E (Playwright)
│   ├── assets/                   Favicons, logos, images
│   ├── openapi.json              API specification
│   └── package.json
│
├── packages/core/                Simulation engine (@world3/core on npm)
│   ├── src/                      Source of truth for all core modules
│   │   ├── world3-simulation.ts  Main Euler integration loop
│   │   ├── world3-simulation-sectors.ts  13 stocks + equation phases
│   │   ├── world3-equation-dsl.ts        DSL type system
│   │   ├── world3-equation-reference.ts  88 equations mapped to DYNAMO source
│   │   ├── world3-keys.ts        Variable & constant type definitions
│   │   ├── runtime-primitives.ts Smooth, Delay3, Dlinf3 integrators
│   │   ├── simulation-contracts.ts  Request/response types
│   │   └── ...
│   ├── package.json              Published as @world3/core
│   └── README.md                 Model math & DSL documentation
│
├── worker/                       Cloudflare Worker
│   └── index.ts                  Serves /api/* + static SPA fallback
│
├── scripts/
│   └── sync-core.sh              Copies packages/core/src/ → app/ts/core/
│
├── docs/                         Paper (Nebel et al. 2023) + reference images
├── Dockerfile                    Alpine Node container
├── wrangler.jsonc                Cloudflare Workers config
└── .github/workflows/            CI/CD (7 workflows)
```

**Key design decision**: `packages/core/src/` is the single source of truth for the simulation engine. A sync script copies it into `app/ts/core/` before build (required because tsc `rootDir` can't reach outside `app/`). The `app/ts/core/` directory is gitignored.

# Architecture

```
┌─────────────────────────────────────────────┐
│              @world3/core                    │
│  Simulation engine, equation DSL, sectors,  │
│  calibration, validation, runtime prims     │
└──────────┬────────────┬────────────┬────────┘
           │            │            │
    ┌──────▼──────┐ ┌───▼───┐ ┌─────▼─────┐
    │  Browser    │ │  CLI  │ │  Worker   │
    │  Adapter    │ │       │ │  (API)    │
    │  (SPA)      │ │       │ │           │
    └─────────────┘ └───────┘ └───────────┘
```

All three adapters consume the same core. TypeScript is compiled to ES modules for the browser and NodeNext for the CLI.

# Deployment

## Cloudflare Workers

The root [wrangler.jsonc](./wrangler.jsonc) deploys the app as a Worker with static assets. The Worker ([`worker/index.ts`](./worker/index.ts)) handles `/api/*` routes and falls through to static assets for the SPA.

**Build command** (Cloudflare dashboard): `cd app && npm ci && npm run build`

## Docker

```bash
docker build -t world3 .
docker run -p 8000:8000 world3
```

## GitHub Pages

Deployed via `.github/workflows/deploy-pages.yml`.

# References

- [Club of Rome](https://www.clubofrome.org/) — commissioned the original Limits to Growth study (1972)
- [Forrester, J. W.](https://en.wikipedia.org/wiki/Jay_Wright_Forrester) — *[World Dynamics](https://en.wikipedia.org/wiki/World_Dynamics)* (1971), the precursor model
- Meadows, D. L., Behrens, W. W., Meadows, D. H., Naill, R. F., Randers, J. & Zahn, E. — *Dynamics of Growth in a Finite World* (1974)
- Meadows, D. H., Meadows, D. L., Randers, J. & Behrens, W. W. — [*The Limits to Growth*](https://www.clubofrome.org/publication/the-limits-to-growth/) (1972)
- Meadows, D. H., Randers, J. & Meadows, D. L. — [*Limits to Growth: The 30-Year Update*](https://donellameadows.org/archives/a-synopsis-limits-to-growth-the-30-year-update/) (2005)
- Meadows, D. H. — [*Thinking in Systems: A Primer*](https://en.wikipedia.org/wiki/Thinking_in_Systems) (2008)
- [Turner, G. (2008)](https://www.sciencedirect.com/science/article/abs/pii/S0959378008000435) — A comparison of *The Limits to Growth* with 30 years of reality
- [Herrington, G. (2021)](https://doi.org/10.1111/jiec.13084) — Update to limits to growth
- Nebel, A., Kling, A., Willamowski, R. & Schell, T. (2024) — PyWorld3-03 recalibration. *Journal of Industrial Ecology*, 28, 87-99.
- Vanwynsberghe, C. (2021) — Original open-source World3 implementation: [hal-03414394](https://hal.archives-ouvertes.fr/hal-03414394)

# Licence

This project is licensed under the [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html). See [LICENSE](./LICENSE) for details.
