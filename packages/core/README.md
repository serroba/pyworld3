# @world3/core

World3 system dynamics simulation engine from *The Limits to Growth*.

This package implements the complete World3-03 model (2005 edition) as a typed TypeScript library. It runs the same coupled simulation in the browser, Node.js CLI, and Cloudflare Workers.

## Install

```bash
npm install @world3/core
```

## Quick Start

```typescript
import { createWorld3Core, ModelData } from "@world3/core";
import type { RawLookupTable } from "@world3/core";

// Load lookup tables (ship as a JSON asset)
const tables: RawLookupTable[] = await fetch("/data/functions-table-world3.json").then(r => r.json());

const core = createWorld3Core(ModelData, async () => tables);
const sim = core.createLocalSimulationCore();

// Standard run
const result = await sim.simulatePreset("standard-run");
console.log(result.series.pop.values); // population time series

// Compare two scenarios with a divergence year
const comparison = await sim.compare(
  { preset: "standard-run" },
  { preset: "comprehensive-policy" },
  2024, // diverge year: run A's constants until 2024, then B's
);
```

## The World3 Model

World3 models five interacting sectors: **population**, **capital**, **agriculture**, **nonrenewable resources**, and **persistent pollution**. Each sector is a system of differential equations integrated via Euler stepping at configurable time intervals (default dt = 0.5 years).

The model tracks **88 variables** (13 stocks, 31 flows, 44 auxiliaries) governed by **60 tunable constants** and **46 nonlinear lookup tables**.

### State Stocks

The 13 state stocks are integrated over time. Each stock accumulates inflows and drains outflows at every time step:

```
Stock(t) = Stock(t-1) + dt * (inflows - outflows)
```

| Stock | DYNAMO | Description |
|-------|--------|-------------|
| `p1` | `P1.K = P1.J + DT * (B.JK - D1.JK - MAT1.JK)` | Population ages 0-14 |
| `p2` | `P2.K = P2.J + DT * (MAT1.JK - D2.JK - MAT2.JK)` | Population ages 15-44 |
| `p3` | `P3.K = P3.J + DT * (MAT2.JK - D3.JK - MAT3.JK)` | Population ages 45-64 |
| `p4` | `P4.K = P4.J + DT * (MAT3.JK - D4.JK)` | Population ages 65+ |
| `ic` | `IC.K = IC.J + DT * (ICIR.JK - ICDR.JK)` | Industrial capital |
| `sc` | `SC.K = SC.J + DT * (SCIR.JK - SCDR.JK)` | Service capital |
| `al` | `AL.K = AL.J + DT * (LDR.JK - LER.JK - LRUI.JK)` | Arable land |
| `pal` | `PAL.K = PAL.J + DT * (-LDR.JK)` | Potentially arable land |
| `uil` | `UIL.K = UIL.J + DT * (LRUI.JK)` | Urban-industrial land |
| `lfert` | `LFERT.K = LFERT.J + DT * (LFR.JK - LFD.JK)` | Land fertility |
| `ppol` | `PPOL.K = PPOL.J + DT * (PPAPR.JK - PPASR.JK)` | Persistent pollution |
| `nr` | `NR.K = NR.J + DT * (-NRUR.JK)` | Nonrenewable resources |

### Key Derived Equations

These are computed at each time step from stocks, constants, and lookup tables:

**Population sector:**
```
POP = P1 + P2 + P3 + P4
LE  = LEN * LMHS * LMF * LMP * LMC       (life expectancy)
TF  = MIN(MTF, MTF*(1-FCE) + DTF*FCE)     (total fertility)
B   = TF * P2 * 0.5 / RLT                  (births per year)
```

**Capital sector:**
```
IO   = IC * (1 - FCAOR) * CUF / ICOR       (industrial output)
IOPC = IO / POP                              (output per capita)
ICIR = IO * FIOAI                            (capital investment rate)
ICDR = IC / ALIC                             (capital depreciation rate)
```

**Agriculture sector:**
```
F    = LY * AL * LFH * (1 - PL)             (total food production)
FPC  = F / POP                               (food per capita)
LY   = LYF * LFERT * LYMC * LYMAP           (land yield)
```

**Resources & pollution:**
```
NRFR  = NR / NRI                             (resource fraction remaining)
NRUR  = POP * PCRUM * NRUF                   (resource usage rate)
PPOLX = PPOL / PPOL70                        (pollution index)
PPAPR = PPGAO * PPGF                         (pollution appearance rate)
PPASR = PPOL / (PPTD * AHL)                  (pollution assimilation rate)
```

### Policy Switches

Many constants come in pairs (e.g., `icor1`/`icor2`, `nruf1`/`nruf2`). The model uses a `CLIP` function to switch between them at the **policy year** (`pyear`, default 1975):

```
ICOR = CLIP(ICOR2, ICOR1, TIME, PYEAR)
     = TIME > PYEAR ? ICOR2 : ICOR1
```

This enables "what if?" scenarios: the Comprehensive Policy preset sets `icor2=2, nruf2=0.5, ppgf2=0.5` to model aggressive technology adoption after the policy year.

### Integrators

The model uses three types of smoothing/delay integrators to represent perception delays and material flows:

| Type | Purpose | Example |
|------|---------|---------|
| **Smooth** | Exponential smoothing (first-order lag) | Perceived industrial output per capita |
| **Delay3** | Third-order delay (3 cascaded lags) | Pollution generation delay |
| **Dlinf3** | Delay3 with infinite-history initialization | Life expectancy delayed perception |

## The Equation DSL

The simulation engine uses a declarative DSL to define all 88 equations. Each equation declares its type, dependencies, and computation:

### State Stock

```typescript
defineStateStock({
  key: "p1",
  initialConstant: "p1i",
  inputs: ["b", "d1", "mat1"],
  next: ({ k, dt, buffers }) =>
    buffers.p1[k-1] + dt * (buffers.b[k-1] - buffers.d1[k-1] - buffers.mat1[k-1]),
});
```

### Derived Stock

```typescript
defineDerivedStock({
  key: "pop",
  inputs: ["p1", "p2", "p3", "p4"],
  compute: ({ k, buffers }) =>
    buffers.p1[k] + buffers.p2[k] + buffers.p3[k] + buffers.p4[k],
});
```

### Derived Equation (auxiliary/flow)

```typescript
defineDerivedEquation({
  key: "nrfr",
  inputs: ["nr", "nri"],
  compute: ({ k, buffers, constants }) =>
    buffers.nr[k] / constants.nri,
});
```

### Runtime Value (cached intermediate)

```typescript
defineRuntimeValue({
  key: "icor",
  inputs: ["icor1", "icor2"],
  compute: ({ t, constants, policyYear }) =>
    clip(constants.icor2, constants.icor1, t, policyYear),
});
```

### Execution Phases

Equations are grouped into phases that execute in dependency order:

```typescript
defineEquationPhase("capital-flows", [capitalInvestmentEq, capitalDepreciationEq, ...]);
defineRuntimePhase("policy-switches", [icorValue, nrufValue, ppgfValue, ...]);
```

## Divergence Simulation

The engine supports mid-run constant switching for "what if we changed course at year X?" scenarios:

```typescript
simulateWorld3({
  constants: policyConstants,      // used after divergeYear
  baseConstants: standardConstants, // used before divergeYear
  divergeYear: 2024,
  rawTables: tables,
});
```

All model state (stocks, integrators) carries over naturally at the transition point. This produces physically correct continuity.

## Presets

| Name | Description |
|------|-------------|
| `standard-run` | Business as usual (all defaults) |
| `doubled-resources` | Initial NRI doubled to 2e12 |
| `optimistic-technology` | Technology halves pollution, doubles resource efficiency |
| `population-stability` | Desired family size drops, population stabilizes |
| `comprehensive-policy` | Combined technology + population + agriculture improvements |
| `recalibration-2023` | Nebel et al. 2023 constants fitted to 1970-2020 empirical data |

## API Reference

### `createWorld3Core(modelData, tablesLoader)`

Creates the main simulation orchestrator.

### `core.createLocalSimulationCore()`

Returns an object with:

- **`simulatePreset(name, overrides?)`** — Run a named preset
- **`simulate(request?)`** — Run with custom parameters
- **`compare(scenarioA, scenarioB?, divergeYear?)`** — Compare two scenarios

### `SimulationResult`

```typescript
{
  year_min: number;
  year_max: number;
  dt: number;
  time: number[];              // e.g., [1900, 1900.5, 1901, ...]
  constants_used: ConstantMap;
  series: {
    pop: { name: "pop", values: number[] },
    le:  { name: "le",  values: number[] },
    // ... 88 variables
  }
}
```

## Source References

Every equation in the DSL is cross-referenced to the original DYNAMO source from *Dynamics of Growth in a Finite World* (Meadows et al., 1974). See `world3-equation-reference.ts` for the complete mapping.

## Licence

GPL-3.0. See [LICENSE](../../LICENSE).
