![Logo](./img/logo.png)

> The World3 model revisited in Python

[![License: CeCILL 2.1](https://img.shields.io/badge/licence-CeCILL%202.1-028181)](https://opensource.org/licenses/CECILL-2.1)

+ [Install & Hello World3](#Install-and-Hello-World3)
+ [Quick Start](#Quick-Start)
+ [Web Client](#Web-Client)
+ [REST API](#REST-API)
+ [CLI](#CLI)
+ [OWID Data Integration](#OWID-Data-Integration)
+ [Docker](#Docker)
+ [Architecture](#Architecture)
+ [How to tune your own simulation](#How-to-tune-your-own-simulation)
+ [Licence](#Licence)
+ [How to cite PyWorld3 with Bibtex](#How-to-cite-PyWorld3-with-Bibtex)
+ [References & acknowledgment](#References-and-acknowledgment)

---

PyWorld3 is a Python implementation of the World3 model, as described in
the book *Dynamics of Growth in a Finite World*. The lookup tables and default
constants follow the 2004 "30-Year Update" (World3-03) parameterization from
*Limits to Growth: The 30-Year Update*, based on the
[PyWorld3-03](https://github.com/TimSchell98/PyWorld3-03) implementation.

The World3 model is based on an Ordinary Differential Equation solved by a
Backward Euler method. Although it is described with 12 state variables, taking
internal delay functions into account raises the problem to the 29th order. For
the sake of clarity and model calibration purposes, the model is structured
into 5 main sectors: Population, Capital, Agriculture, Persistent Pollution
and Nonrenewable Resource.

# Install and Hello World3

Install pyworld3 either via:
```
pip install pyworld3
```

or using [uv](https://docs.astral.sh/uv/):
```
uv add pyworld3
```

For development, clone the repository and run:
```
uv sync
```

Run the provided example to simulate the standard run, known as the *Business
as usual* scenario:
``` Python
import pyworld3
pyworld3.hello_world3()
```

As shown below, the simulation output compares well with the original print.
For a tangible understanding by the general audience, the usual chart plots the
trajectories of the:
- population (`POP`) from the Population sector,
- nonrenewable resource fraction remaining (`NRFR`) from the Nonrenewable Resource sector,
- food per capita (`FPC`) from the Agriculture sector,
- industrial output per capita (`IOPC`) from the Capital sector,
- index of persistent pollution (`PPOLX`) from the Persistent Pollution sector.

![](./img/result_standard_run.png)

# Quick Start

There are three ways to use PyWorld3:

**1. CLI** — run simulations from the terminal:
```bash
pyworld3 simulate --preset standard-run --summary
```

**2. Web client** — interactive browser UI:
```bash
cd app/static
npm run serve -- --port 8000
# Open http://localhost:8000
```

**3. Python library** — import and script directly:
```python
from pyworld3 import World3
world3 = World3()
world3.init_world3_constants()
world3.init_world3_variables()
world3.set_world3_table_functions()
world3.set_world3_delay_functions()
world3.run_world3()
```

# Web Client

The web client is now a static app served independently from the Python API. It has four views:

| View | Description |
|------|-------------|
| **Intro** | Overview of the World3 model with preset scenario cards |
| **Explore** | Pick a preset and view simulation charts interactively |
| **Compare** | Side-by-side comparison of two scenarios with delta metrics |
| **Advanced** | Edit any model constant with range sliders, then simulate |

# REST API

The Python REST API is optional and no longer serves the browser frontend.

The FastAPI server exposes these endpoints:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/presets` | List built-in scenario presets |
| `GET` | `/constants` | Get all World3 constant defaults |
| `GET` | `/variables` | Get default output variable names |
| `GET` | `/metadata/constants` | Metadata (name, unit, sector) for all constants |
| `GET` | `/metadata/variables` | Metadata (name, unit, sector) for all variables |
| `POST` | `/simulate` | Run a simulation with optional constant overrides |
| `POST` | `/simulate/preset/{name}` | Run a preset scenario |
| `POST` | `/compare` | Compare two scenarios side by side |
| `POST` | `/calibrate` | Calibrate constants from OWID data (requires `owid` extras) |
| `POST` | `/validate` | Validate simulation output against OWID data (requires `owid` extras) |

# CLI

The `pyworld3` command provides the following subcommands:

| Command | Description | Key flags |
|---------|-------------|-----------|
| `simulate` | Run a simulation and output JSON | `--preset`, `--from`, `--set name=val`, `--var`, `--summary`, `--plot` |
| `constants` | Print constant defaults | `--describe` |
| `variables` | Print output variable names | `--describe` |
| `presets` | List built-in presets | — |
| `compare` | Compare two scenarios | `--preset` (×2), `--from` (×2), `--plot` |
| `calibrate` | Calibrate constants from OWID data | `--reference-year`, `--entity`, `--param`, `--pretty` |
| `validate` | Validate simulation against OWID data | `--preset`, `--from`, `--entity`, `--var`, `--summary` |

# OWID Data Integration

PyWorld3 can connect to [Our World in Data](https://ourworldindata.org/) (OWID) to **calibrate** model constants from observed data and **validate** simulation outputs against real-world time series. This is an optional feature that requires extra dependencies:

```bash
pip install pyworld3[owid]
# or
uv add pyworld3[owid]
```

## Calibration

Calibration derives World3 constants from OWID data at a reference year. It covers population cohorts (p1i-p4i), desired family size (dcfsn), industrial capital (ici), and more.

**CLI:**
```bash
# Calibrate all available constants for 1970
pyworld3 calibrate --reference-year 1970 --pretty

# Calibrate specific constants
pyworld3 calibrate --param p1i --param p2i --param p3i --param p4i --pretty
```

**Python:**
```python
from pyworld3.application.calibrate import CalibrationService
from pyworld3.application.ports import CalibrationParams

service = CalibrationService()
result = service.calibrate(CalibrationParams(reference_year=1970))

# Inspect calibrated values with provenance
for name, cc in result.constants.items():
    print(f"{name} = {cc.value:.4g}  (default: {cc.default_value:.4g}, "
          f"confidence: {cc.confidence}, source: {cc.owid_indicator})")

# Use calibrated constants in a simulation
from pyworld3.application.simulate import SimulationService
from pyworld3.application.ports import SimulationParams

sim = SimulationService()
sim_result = sim.run(SimulationParams(constants=result.to_constants_dict()))
```

**API:**
```bash
curl -X POST http://localhost:8000/calibrate \
  -H "Content-Type: application/json" \
  -d '{"reference_year": 1970}'
```

## Validation

Validation compares simulation outputs against OWID time series, computing RMSE, MAPE, and Pearson correlation for each mapped variable over the overlapping period.

**CLI:**
```bash
# Validate default simulation against OWID data
pyworld3 validate --summary

# Validate a specific preset
pyworld3 validate --preset doubled-resources --summary

# Validate specific variables
pyworld3 validate --var pop --var le --pretty
```

**Python:**
```python
from pyworld3.application.simulate import SimulationService
from pyworld3.application.validate import ValidationService
from pyworld3.application.ports import SimulationParams, ValidationParams

# Run simulation
sim = SimulationService()
sim_result = sim.run(SimulationParams())

# Validate against OWID data
validator = ValidationService()
val_result = validator.validate(sim_result, ValidationParams())

for name, metric in val_result.metrics.items():
    print(f"{name}: RMSE={metric.rmse:.4g}, MAPE={metric.mape:.1f}%, "
          f"r={metric.correlation:.3f} ({metric.n_points} points)")
```

## Data Sources

| Sector | OWID Source | Key Indicators |
|--------|-----------|----------------|
| Population | World Bank WDI | Total population, life expectancy, birth/death rates, age cohorts |
| Capital | World Bank WDI | GDP, GDP/capita, capital formation, industry share |
| Energy | OWID Energy Mix | Primary energy per capita, fossil fuel/renewables share |
| Resources | OWID Minerals | Mineral reserves and production |
| Pollution | World Bank WDI | CO2 emissions per unit GDP |

Data is fetched as parquet files from the OWID catalog and cached locally at `~/.cache/pyworld3/owid/` with a 30-day TTL. No API key is needed.

## Confidence Levels

Each mapping carries a confidence level reflecting how well the OWID indicator maps to the World3 concept:

- **High** -- Direct correspondence (e.g., total population, life expectancy, birth/death rates)
- **Medium** -- Reasonable proxy requiring transformation (e.g., GDP as proxy for industrial output, TFR for desired family size)
- **Low** -- Weak proxy (e.g., CO2 as proxy for World3's aggregate "persistent pollution")

# Docker

Build and run with Docker:
```bash
docker build -t pyworld3 .
docker run -p 8000:8000 pyworld3
```

The container now serves the static web client on port 8000. The Python API can still be run separately if you need the legacy REST surface.

# Architecture

PyWorld3 uses a hexagonal (ports-and-adapters) architecture. The core simulation logic in `pyworld3/` is framework-agnostic and exposes a `SimulationPort` interface. Adapters in `pyworld3/adapters/` implement the CLI (Typer), REST API (FastAPI), and a lightweight dependency-injection container wires them together. See the [`docs/`](./docs/) directory for detailed model reference and design notes.

# How to tune your own simulation

One simulation requires a script with the following steps:
``` Python
from pyworld3 import World3

world3 = World3()                    # choose the time limits and step.
world3.init_world3_constants()       # choose the model constants.
world3.init_world3_variables()       # initialize all variables.
world3.set_world3_table_functions()  # get tables from a json file.
world3.set_world3_delay_functions()  # initialize delay functions.
world3.run_world3()
```

You should be able to tune your own simulations quite quickly as long as you
want to modify:
- **time-related parameters** during the instantiation,
- **constants** with the `init_world3_constants` method,
- **nonlinear functions** by editing your modified tables
`./your_modified_tables.json` based on the initial json file
`pyworld3/functions_table_world3.json` and calling
`world3.set_world3_table_functions("./your_modified_tables.json")`.

# Licence

The project is under the CeCILL 2.1 licence, a GPL-like licence compatible with international and French laws. See the [terms](./LICENSE) for more details.

# How to cite PyWorld3 with Bibtex

To cite the project in your paper via BibTex:
```
@softwareversion{vanwynsberghe:hal-03414394v1,
  TITLE = {{PyWorld3 - The World3 model revisited in Python}},
  AUTHOR = {Vanwynsberghe, Charles},
  URL = {https://hal.archives-ouvertes.fr/hal-03414394},
  YEAR = {2021},
  MONTH = Nov,
  SWHID = {swh:1:dir:9d4ad7aec99385fa4d5057dece7a989d8892d866;origin=https://hal.archives-ouvertes.fr/hal-03414394;visit=swh:1:snp:be7d9ffa2c1be6920d774d1f193e49ada725ea5e;anchor=swh:1:rev:da5e3732d9d832734232d88ea33af99ab8987d52;path=/},
  LICENSE = {CeCILL Free Software License Agreement v2.1},
  HAL_ID = {hal-03414394},
}
```

# References and acknowledgment

-  Meadows, Dennis L., William W. Behrens, Donella H. Meadows, Roger F. Naill,
Jørgen Randers, and Erich Zahn. *Dynamics of Growth in a Finite World*.
Cambridge, MA: Wright-Allen Press, 1974.
- Meadows, Donella H., Dennis L. Meadows, Jorgen Randers, and William W.
Behrens. *The Limits to Growth*. New York 102, no. 1972 (1972): 27.
- Meadows, Donella H., Jorgen Randers, and Dennis L. Meadows. *Limits to
Growth: The 30-Year Update*. Earthscan, 2005.
- Markowich, P. *Sensitivity Analysis of Tech 1-A Systems Dynamics Model for
Technological Shift*, (1979).
- Vanwynsberghe, C. (2021). [PyWorld3](https://github.com/cvanwynsberghe/pyworld3) — The World3 model revisited in Python.
- Nebel, A., Kling, A., Willamowski, R., & Schell, T. (2024). Recalibration of limits to growth: An update of the World3 model. *Journal of Industrial Ecology*, 28, 87–99. Their [PyWorld3-03](https://github.com/TimSchell98/PyWorld3-03) implementation provided the 2004 edition table functions and constants used in this fork.
