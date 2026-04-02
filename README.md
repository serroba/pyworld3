<p align="center">
  <img src="./app/static/assets/brand/world3-mark.svg" alt="World3" width="120" />
</p>

<p align="center"><b>Explore the Limits to Growth model interactively</b></p>

<p align="center">
  <a href="https://github.com/serroba/world3/actions/workflows/ui-validate.yml"><img src="https://github.com/serroba/world3/actions/workflows/ui-validate.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/serroba/world3/actions/workflows/container-smoke.yml"><img src="https://github.com/serroba/world3/actions/workflows/container-smoke.yml/badge.svg" alt="E2E" /></a>
  <a href="https://github.com/serroba/world3/actions/workflows/deploy-pages.yml"><img src="https://github.com/serroba/world3/actions/workflows/deploy-pages.yml/badge.svg" alt="Deploy" /></a>
  <a href="https://www.gnu.org/licenses/gpl-3.0.html"><img src="https://img.shields.io/badge/licence-GPL%20v3-028181" alt="License: GPL v3" /></a>
</p>

<p align="center">
  <a href="https://limits.world">Live app</a> · <a href="./app/static/assets/brand/world3-mark.svg">Logo mark</a>
</p>

---

- [About](#about)
- [Quick Start](#quick-start)
- [CLI](#cli)
- [Features](#features)
- [Deployment](#deployment)
- [Project Layout](#project-layout)
- [Architecture](#architecture)
- [References](#references)
- [Licence](#licence)

---

# About

**World3** is a system dynamics model that simulates the long-term interaction of population, industrial capital, agriculture, pollution, and nonrenewable resources. It was built at MIT in 1972 and published as [*The Limits to Growth*](https://www.clubofrome.org/publication/the-limits-to-growth/) by the Club of Rome.

This project is an interactive, browser-native World3 simulator at [limits.world](https://limits.world). It lets you explore scenarios, adjust model constants, and see how different assumptions about technology, policy, and resources shape the trajectory of civilization from 1900 to 2100.

# Quick Start

## Web App

```bash
cd app/static
npm ci
npm run build
npm run serve -- --port 8000
```

Then open `http://localhost:8000`.

## TypeScript Checks

```bash
cd app/static
npm run typecheck
npm run test:coverage
```

## End-to-End Tests

```bash
cd app/static
npx playwright install chromium
npm run test:e2e
```

# CLI

The CLI uses the same TypeScript simulation core as the web app. Run any preset scenario or override individual constants from the terminal.

```bash
cd app/static
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

# Features

- **5 preset scenarios**: Standard run, Optimistic technology, Comprehensive policy, Doubled resources, Population stability
- **Interactive parameter editor**: Adjust any of 50+ model constants with sliders and see results in real time
- **Compare mode**: Overlay two scenarios side-by-side
- **Calibration & validation**: Fit constants to Our World in Data observations and validate against real-world time series
- **22 languages**: English, Spanish, French, German, Italian, Dutch, Hungarian, Polish, Turkish, Russian, Ukrainian, Arabic, Hindi, Bengali, Indonesian, Vietnamese, Thai, Japanese, Simplified Chinese, Traditional Chinese, Portuguese (Brazil & Portugal)
- **Dark mode**: Automatic via `prefers-color-scheme`, charts adapt live
- **Keyboard shortcuts**: Press `?` for the full shortcut reference
- **Accessibility**: Skip link, focus-visible on all controls, aria-live status regions, chart labels, reduced motion support
- **SEO**: Dedicated pages (`/what-is-world3`, `/limits-to-growth-model`, `/world3-scenarios`), hreflang tags, JSON-LD structured data, locale-prefixed URLs (`/es/history`, `/fr/model`)
- **History & FAQ**: The story from cybernetics to planetary boundaries, and the 5 most common misconceptions debunked
- **CLI**: Terminal chart, preset selection, constant overrides, SVG export

# Deployment

## GitHub Pages

Deployed via `.github/workflows/deploy-pages.yml`. The workflow runs `npm run build` to compile TypeScript before publishing.

## Cloudflare Workers

The root [wrangler.jsonc](./wrangler.jsonc) deploys the app as a static-assets-only Worker.

**Build command** (set in Cloudflare dashboard): `cd app/static && npm ci && npm run build`

The Worker uses SPA fallback mode (`not_found_handling: "single-page-application"`) for path-based routing.

# Project Layout

| Path | Purpose |
|------|---------|
| `app/static/ts/core/` | Shared World3 simulation engine, sector logic, equation DSL, calibration and validation |
| `app/static/ts/cli/` | Node CLI adapters (summary, SVG, terminal chart) |
| `app/static/js/views/` | Hand-written browser view modules (intro, history, FAQ, model, explore, compare, advanced, calibrate) |
| `app/static/js/` | Hand-written app modules (router, charts, keyboard nav, state, UI) — compiled TS output is gitignored |
| `app/static/data/locales/` | 22 locale JSON files with full i18n content |
| `app/static/data/` | Static lookup tables and OWID-derived validation data |
| `app/static/test/` | Unit tests (vitest) and end-to-end tests (Playwright) |
| `app/static/css/` | Stylesheets with CSS custom properties, dark mode, responsive breakpoints |

# Architecture

## 1. Shared TS Core

Pure TypeScript modules implement:

- Runtime primitives and execution graph
- Sector logic (population, capital, agriculture, resources, pollution)
- Equation DSL for declarative World3 equations
- Calibration against OWID data
- Validation metrics (RMSE, MAPE, correlation)
- Artifact generation (summaries, SVG plots, terminal charts)

Compiled JS output is **gitignored** — `npm run build` regenerates it. TypeScript is the single source of truth.

## 2. Browser Adapter

The static web app consumes the shared core via lightweight browser-facing modules. It loads tables and bundled reference data as static assets and runs entirely in the browser — no server required.

## 3. CLI Adapter

The CLI consumes the same shared core to generate summaries, SVG plots, and terminal charts. Used by CI for simulation validation and chart previews in pull requests.

# References

- [Club of Rome](https://www.clubofrome.org/) — commissioned the original Limits to Growth study (1972)
- [Forrester, J. W.](https://en.wikipedia.org/wiki/Jay_Wright_Forrester) — *[World Dynamics](https://en.wikipedia.org/wiki/World_Dynamics)* (1971), the precursor model
- Meadows, D. L., Behrens, W. W., Meadows, D. H., Naill, R. F., Randers, J. & Zahn, E. — *Dynamics of Growth in a Finite World* (1974)
- Meadows, D. H., Meadows, D. L., Randers, J. & Behrens, W. W. — [*The Limits to Growth*](https://www.clubofrome.org/publication/the-limits-to-growth/) (1972)
- Meadows, D. H., Randers, J. & Meadows, D. L. — [*Limits to Growth: The 30-Year Update*](https://donellameadows.org/archives/a-synopsis-limits-to-growth-the-30-year-update/) (2005)
- Meadows, D. H. — [*Leverage Points: Places to Intervene in a System*](https://donellameadows.org/archives/leverage-points-places-to-intervene-in-a-system/) (1999)
- Meadows, D. H. — [*Thinking in Systems: A Primer*](https://en.wikipedia.org/wiki/Thinking_in_Systems) (2008)
- [Turner, G. (2008)](https://www.sciencedirect.com/science/article/abs/pii/S0959378008000435) — A comparison of *The Limits to Growth* with 30 years of reality
- [Herrington, G. (2021)](https://doi.org/10.1111/jiec.13084) — Update to limits to growth
- [Rockström, J. et al.](https://www.stockholmresilience.org/research/planetary-boundaries.html) — Planetary Boundaries framework (2009)
- Vanwynsberghe, C. (2021) — Original open-source World3 implementation: [hal-03414394](https://hal.archives-ouvertes.fr/hal-03414394)
- Nebel, A., Kling, A., Willamowski, R. & Schell, T. (2024) — PyWorld3-03 recalibration. *Journal of Industrial Ecology*, 28, 87–99.
- [Dennis Meadows: Limits to Growth turns 50](https://www.youtube.com/watch?v=zCfnKTzx9FA) — The Great Simplification #12 (2022)
- [Breaking Down: Collapse](https://open.spotify.com/episode/5Joc87wU9xDznvfuLlkz66) — Ep. 4: Overshoot & Limits to Growth (2020)

# Licence

This project is licensed under the [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html). See [LICENSE](./LICENSE) for details.
