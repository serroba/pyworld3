![World3](./img/world3-wordmark.svg)

> A static World3 explorer powered by a shared TypeScript simulation core

[Live app](https://serroba.github.io/world3/) · [Logo mark](./app/static/assets/brand/world3-mark.svg)

[![License: CeCILL 2.1](https://img.shields.io/badge/licence-CeCILL%202.1-028181)](https://opensource.org/licenses/CECILL-2.1)

- [What This Repo Is](#what-this-repo-is)
- [Quick Start](#quick-start)
- [GitHub Pages](#github-pages)
- [CLI](#cli)
- [Project Layout](#project-layout)
- [Architecture](#architecture)
- [References and Acknowledgment](#references-and-acknowledgment)
- [Licence](#licence)

---

# What This Repo Is

This repository now centers on a **browser-native World3 experience**:

- a static web app in `app/static/`
- a shared TypeScript simulation core used by both the web UI and CLI
- CI visual validation that renders the BAU chart from that same TS core

The main product path is now:

1. static site
2. shared TS simulation engine

World3 models the long-term interaction of:

- population
- industrial capital
- agriculture and food
- pollution
- nonrenewable resources

This fork is focused on making that model explorable, testable, and deployable in modern browser and CI environments.

# Quick Start

## Web App

Run the static app locally:

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

## End-to-End UI

```bash
cd app/static
npx playwright install chromium
npm run test:e2e
```

# GitHub Pages

The static app is deployed through GitHub Pages using `.github/workflows/deploy-pages.yml`.

The site is built from `app/static/` and is safe to serve under the repository subpath:

`https://serroba.github.io/world3/`

# CLI

The browser-native CLI uses the same TS core as the web app.

Example:

```bash
cd app/static
npm run build
npm run browser-native:cli -- --summary
npm run browser-native:cli -- --plot-svg /tmp/world3.svg
```

This is the path used by CI to generate the simulation summary and chart preview in pull requests.

# Project Layout

| Path | Purpose |
|------|---------|
| `app/static/ts/core/` | Shared World3 engine, sector logic, runtime graph, calibration and validation logic |
| `app/static/ts/cli/` | Node-facing adapters for the TS core |
| `app/static/js/` | Generated browser/runtime JS assets |
| `app/static/data/` | Static lookup tables, parity fixtures, and OWID-derived local data |
| `app/static/test/` | Unit and end-to-end coverage for the static app and core |

# Architecture

The current architecture has three layers:

## 1. Shared TS Core

Pure TypeScript modules implement:

- runtime primitives
- execution graph planning
- sector logic
- calibration and validation logic
- artifact generation for summaries and plots

This core is designed to be usable from both browser and CLI adapters and could be extracted into a publishable npm package later.

## 2. Browser Adapter

The static web app consumes the shared core via lightweight browser-facing modules. It loads tables and bundled reference data as static assets and runs locally in the browser.

## 3. CLI Adapter

The TS CLI consumes the same shared core to generate summaries and SVG plots in CI and local workflows.

# References and Acknowledgment

- Meadows, Dennis L., William W. Behrens, Donella H. Meadows, Roger F. Naill, Jørgen Randers, and Erich Zahn. *Dynamics of Growth in a Finite World*. Wright-Allen Press, 1974.
- Meadows, Donella H., Dennis L. Meadows, Jorgen Randers, and William W. Behrens. *The Limits to Growth*. 1972.
- Meadows, Donella H., Jorgen Randers, and Dennis L. Meadows. *Limits to Growth: The 30-Year Update*. Earthscan, 2005.
- Vanwynsberghe, C. (2021). Original open-source World3 implementation lineage referenced by this project: [hal-03414394](https://hal.archives-ouvertes.fr/hal-03414394).
- Nebel, A., Kling, A., Willamowski, R., & Schell, T. (2024). Recalibration of limits to growth: An update of the World3 model. *Journal of Industrial Ecology*, 28, 87–99.

# Licence

The project is under the CeCILL 2.1 licence, a GPL-compatible licence. See [LICENSE](./LICENSE) for details.
