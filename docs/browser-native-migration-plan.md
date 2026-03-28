# Browser-Native Migration Plan

This document turns the current exploration into a concrete plan for migrating PyWorld3 from a browser client backed by a Python API into a browser-native application with an in-browser simulation engine.

The goal is not a line-by-line port of the Python code. The goal is to extract the World3 model into an explicit simulation engine and model definition that can run entirely in the browser while preserving the current model behavior.

## Current State

Today the project has:

- A browser UI in `app/static`
- A Python API that exposes presets, metadata, and simulation endpoints
- A Python World3 engine in `pyworld3/domain`

The frontend depends on the API for both metadata and simulation execution. The application service in `pyworld3/application/simulate.py` is a thin wrapper around the domain engine, which makes the current Python simulation a good reference implementation for parity testing.

## What We Should Preserve

The browser-native version should preserve:

- The current public simulation inputs:
  - `year_min`
  - `year_max`
  - `dt`
  - `pyear`
  - `iphst`
  - constant overrides
  - selected output variables
- Built-in scenario presets
- Constant and variable metadata used by the UI
- Numerical behavior of the current default simulation as closely as practical

## Core Migration Insight

The current codebase already contains the pieces we need, but they are encoded procedurally:

- Stock updates are spread across per-sector update methods
- Same-timestep dependency ordering is implicit
- Delay and smoothing behavior is isolated in helper primitives
- Table functions are stored in JSON and loaded dynamically

The migration should therefore extract three explicit layers:

1. A small browser-native simulation runtime
2. A declarative World3 model definition
3. A UI adapter that calls the local engine instead of HTTP

## Target Architecture

### 1. Simulation Runtime

Create a TypeScript runtime that supports:

- time grid creation
- state vector allocation
- stock integration
- derived variable evaluation
- delay and smoothing nodes
- lookup table interpolation
- deterministic execution order

The runtime should use `Float64Array` for numeric series where practical.

### 2. Model Definition

Represent World3 in a model package with explicit definitions for:

- constants
- stocks
- auxiliaries
- tables
- delays
- outputs

The first version does not need a fully generic graph compiler. It is acceptable to encode the ordered step list explicitly while we establish parity.

### 3. Browser Adapter

Replace frontend HTTP usage with a local simulation facade that returns the same shapes currently returned by the API:

- presets
- constant defaults
- variable lists
- metadata
- simulation results
- comparison results

This will let us migrate the UI with minimal churn.

## Phased Plan

### Phase 0: Freeze the Python Engine as the Reference Oracle

Before porting logic, define the current Python outputs as the source of truth.

Deliverables:

- Document the standard scenarios and output variables we will use for parity
- Add parity fixtures or fixture-generation scripts based on current Python results
- Decide acceptable tolerances for each output series

Notes:

- Existing tests in `tests/test_simulate.py` and `tests/test_api.py` already cover the Python behavior at a service and API level
- We should extend parity coverage around specific scenarios rather than rely only on generic smoke tests

### Phase 1: Extract Shared Model Data

Move the browser-relevant static model data into a format that both Python and TypeScript can consume or mirror clearly.

Deliverables:

- Export or mirror:
  - constant defaults
  - constant metadata
  - variable metadata
  - default output variable list
  - built-in presets
  - lookup tables
- Define one canonical naming convention for model identifiers

Success criteria:

- The frontend can load metadata without calling the backend

### Phase 2: Build the TypeScript Runtime

Implement the minimum runtime needed to reproduce the Python engine.

Deliverables:

- time-series container utilities
- linear interpolation helper
- first-order smoothing primitive
- third-order delay primitive
- time-switch helpers equivalent to `clip`, `switch`, and `ramp`

Success criteria:

- Independent unit tests prove these primitives match the Python behavior on representative inputs

### Phase 3: Reproduce the Fast Execution Path

Port the model using the current `fast=True` execution order as the first browser-native implementation.

Why this first:

- It is the path the application already uses in production
- It gives us an explicit ordered update list to reproduce
- It avoids trying to infer the full dependency graph too early

Deliverables:

- TypeScript World3 engine with the same ordered update pass as Python
- Matching stock initialization and timestep semantics
- Matching output serialization

Success criteria:

- Standard run parity passes within agreed tolerances
- Preset scenarios produce the same shape and comparable trajectories

### Phase 4: Swap the Frontend to Local Simulation

Once the engine has parity, replace fetch-based simulation with an in-browser adapter.

Deliverables:

- local `simulate`
- local `compare`
- local metadata loading
- graceful UI fallback or feature flags during migration

Success criteria:

- The app runs without the Python API for normal simulation workflows

### Phase 5: Decide the Future of the Backend

After local simulation works, choose one of these paths:

- Keep the Python backend for calibration and validation only
- Keep it as an optional server mode for heavy workloads
- Remove it entirely if browser execution covers the intended use cases

Recommendation:

Keep the backend for OWID calibration and validation at first. Those features are separable from the core simulation and do not need to block browser-native migration.

## Numerical and Modeling Risks

These are the main risks that can break parity:

### 1. Same-Timestep Dependency Ordering

The current model relies on an ordered update sequence. In the safe path, ordering is recovered via retry-based rescheduling. In the fast path, the order is hardcoded.

Implication:

The first TypeScript version should preserve the explicit Python fast order rather than trying to derive a graph scheduler immediately.

### 2. Delay and Smoothing Semantics

The `Smooth`, `Delay3`, and `Dlinf3` primitives materially affect model behavior. These are not cosmetic helpers.

Implication:

They should be ported and tested in isolation before porting the sectors.

### 3. Lookup Table Interpolation

The table functions encode core nonlinearities. They also clamp at the first and last table values when inputs are out of range.

Implication:

The TypeScript interpolation behavior must match this exactly.

### 4. Initialization Edge Cases

The Python application tolerates some leading `NaN` behavior for delay-based variables before normalizing outputs.

Implication:

The browser engine should either match these semantics or normalize in one clearly documented place.

## Recommended Implementation Strategy

Build the browser-native engine in this order:

1. Shared data package for constants, metadata, presets, and tables
2. Runtime primitives and tests
3. One end-to-end simulation path that reproduces the standard run
4. Frontend adapter that can switch between API mode and local mode
5. Cleanup and backend narrowing

This gives us early wins without forcing a big-bang rewrite.

## Proposed File Layout

One reasonable target layout is:

```text
app/static/js/
  engine/
    runtime.js
    tables.js
    delays.js
    world3-model.js
    world3-sim.js
    local-api.js
```

If we choose to introduce TypeScript and a build step, the equivalent can live under a new frontend workspace. That is likely cleaner long term, but it is not required for the first migration slice.

## Immediate Next Step

The next implementation step should be:

1. Create a browser-native model data layer for presets, constants, metadata, and lookup tables
2. Add parity fixtures for the standard run and at least one alternate preset
3. Implement the runtime primitives in JavaScript or TypeScript

Only after those pieces exist should we start porting sector logic.

## Smaller Migration Slices

To keep the blast radius small, we should execute the migration as a series of narrow, reversible changes. Each slice should have one clear verification target and should not force the frontend off the current backend path until the new piece is proven.

### Slice 1: Local Static Metadata

Move only the static model data into the frontend:

- constant defaults
- constant metadata
- variable metadata
- default output variable list
- presets

Do not change simulation yet.

Verification:

- the UI can boot and render controls using local metadata
- simulation requests still go to the Python backend

Risk:

- very low

### Slice 2: Local Lookup Tables

Move the lookup table JSON into the browser-native side and load it locally.

Do not use it for simulation yet beyond small runtime tests.

Verification:

- local interpolation tests pass against known table points and clamping behavior

Risk:

- low

### Slice 3: Runtime Primitives Only

Implement and test:

- interpolation
- `clip`
- `switch`
- `ramp`
- first-order smoothing
- third-order delay

Do not port any sector logic yet.

Verification:

- primitive tests match Python behavior on representative inputs

Risk:

- low to medium

### Slice 4: Local Simulation Facade Behind a Flag

Introduce a frontend simulation provider interface with two implementations:

- current HTTP-backed provider
- future local-engine provider

Keep HTTP as the default.

Verification:

- no user-visible behavior change
- the frontend can switch providers through one small seam

Risk:

- low

### Slice 5: One Narrow Engine Probe

Port one tiny vertical slice of simulation behavior, not a whole sector. A good first probe is:

- time-grid creation
- result shape serialization
- one or two simple derived outputs that do not depend on the full graph

This step is about proving the engine shell, not replacing the model.

Verification:

- local engine returns data in the same shape as `/simulate`

Risk:

- low to medium

### Slice 6: One Real Sector With Parity Tests

Port the smallest practical sector or subgraph with minimal cross-sector coupling. Resource is a good candidate because it has fewer state variables than population or agriculture.

Verification:

- parity checks for the selected sector against Python fixtures

Risk:

- medium

### Slice 7: Expand Sector-by-Sector

Port the remaining sectors one at a time, preserving the Python fast execution order.

Recommended order:

1. Resource
2. Pollution primitives and coupling points
3. Capital
4. Agriculture
5. Population

This order is not mandatory, but it keeps us away from the most coupled logic until the runtime is proven.

Verification:

- each sector adds parity coverage before the next starts

Risk:

- medium to high, but controlled by scope

### Slice 8: Default to Local Simulation

Once parity is good enough, switch the frontend default from HTTP to the local engine while retaining the backend as a fallback.

Verification:

- the main flows work with no backend
- compare and advanced controls still behave correctly

Risk:

- medium

## Recommended Next Three Tasks

If we want the smallest sensible starting point, I recommend:

1. Add a frontend-local data module for constants, metadata, variables, and presets
2. Add a simulation provider seam so the UI can use either HTTP or local execution
3. Add parity fixture generation for the standard run

That gives us better control over the migration without touching the core equations yet.

## Suggested Acceptance Criteria

We should consider the migration viable when:

- the browser app can run the standard scenario with no backend
- at least two preset scenarios match Python within defined tolerances
- metadata and advanced controls work locally
- the simulation remains responsive in the browser for default `dt`

## Out of Scope for the First Slice

These can wait until after local simulation works:

- OWID calibration in the browser
- automatic graph compilation from decorators
- Web Worker parallelization
- WASM or Rust acceleration
- multi-scenario batch execution

Those are good follow-on improvements, but they should not be prerequisites.
