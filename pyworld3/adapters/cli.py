from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path
from typing import TYPE_CHECKING, Annotated

if TYPE_CHECKING:
    from pyworld3.application.ports import ValidationResult

import typer

from pyworld3.application.container import get_service
from pyworld3.domain.constants import (
    CONSTANT_DEFAULTS,
    CONSTANT_META,
    DEFAULT_OUTPUT_VARIABLES,
    VARIABLE_META,
)
from pyworld3.domain.exceptions import SimulationValidationError

from .schemas import (
    ScenarioFile,
    SimulationRequest,
    SimulationResponse,
)
from .schemas import list_presets as _list_presets
from .schemas import load_preset as _load_preset

app = typer.Typer(name="pyworld3", help="Run World3 what-if simulations")


# ---------------------------------------------------------------------------
# Scenario / preset helpers
# ---------------------------------------------------------------------------


def _load_scenario_file(path: Path) -> ScenarioFile:
    """Load a user-provided scenario TOML file."""
    if not path.exists():
        typer.echo(f"Error: scenario file not found: {path}", err=True)
        raise typer.Exit(code=1)
    try:
        return ScenarioFile.from_toml(path)
    except Exception as exc:
        typer.echo(f"Error: failed to parse scenario file: {exc}", err=True)
        raise typer.Exit(code=1) from exc


def _parse_set_overrides(set_: list[str] | None) -> dict[str, float]:
    """Parse --set name=value pairs into a dict."""
    constants: dict[str, float] = {}
    if set_:
        for item in set_:
            if "=" not in item:
                typer.echo(
                    f"Error: invalid --set format '{item}', expected name=value",
                    err=True,
                )
                raise typer.Exit(code=1)
            name, val = item.split("=", 1)
            try:
                constants[name] = float(val)
            except ValueError as exc:
                typer.echo(
                    f"Error: cannot parse '{val}' as float for '{name}'", err=True
                )
                raise typer.Exit(code=1) from exc
    return constants


def _build_request(
    *,
    scenario: ScenarioFile | None,
    year_min: float,
    year_max: float,
    dt: float,
    pyear: float,
    iphst: float,
    constants: dict[str, float],
    var: list[str] | None,
) -> SimulationRequest:
    """Build a SimulationRequest from a scenario file + CLI overrides."""
    if scenario is not None:
        # Only pass CLI values that differ from defaults as overrides
        cli_overrides: dict[str, object] = {}
        cli_overrides["year_min"] = year_min
        cli_overrides["year_max"] = year_max
        cli_overrides["dt"] = dt
        cli_overrides["pyear"] = pyear
        cli_overrides["iphst"] = iphst
        if constants:
            cli_overrides["constants"] = constants
        if var:
            cli_overrides["output_variables"] = var
        return scenario.to_simulation_request(**cli_overrides)
    return SimulationRequest(
        year_min=year_min,
        year_max=year_max,
        dt=dt,
        pyear=pyear,
        iphst=iphst,
        constants=constants or None,
        output_variables=var or None,
    )


def _run_request(request: SimulationRequest) -> SimulationResponse:
    """Execute a simulation request and return the response."""
    service = get_service()
    result = service.run(request.to_params())
    return SimulationResponse.from_result(result)


# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------


def _format_constants_table() -> str:
    """Format constants grouped by sector with values and descriptions."""
    by_sector: dict[str, list[str]] = defaultdict(list)
    for name, default in CONSTANT_DEFAULTS.items():
        meta = CONSTANT_META[name]
        by_sector[meta.sector].append(
            f"  {name:<10s} {default:>12.4g}  {meta.full_name} ({meta.unit})"
        )
    lines: list[str] = []
    for sector, entries in by_sector.items():
        lines.append(f"\n{sector}")
        lines.append("-" * len(sector))
        lines.extend(entries)
    return "\n".join(lines).lstrip("\n")


def _format_variables_table() -> str:
    """Format output variables grouped by sector with descriptions."""
    by_sector: dict[str, list[str]] = defaultdict(list)
    for name in DEFAULT_OUTPUT_VARIABLES:
        meta = VARIABLE_META[name]
        by_sector[meta.sector].append(f"  {name:<10s} {meta.full_name} ({meta.unit})")
    lines: list[str] = []
    for sector, entries in by_sector.items():
        lines.append(f"\n{sector}")
        lines.append("-" * len(sector))
        lines.extend(entries)
    return "\n".join(lines).lstrip("\n")


def _generate_plot(response: SimulationResponse, output_path: Path) -> None:
    """Generate a normalized overlay plot of key simulation variables."""
    import matplotlib

    matplotlib.use("Agg")

    import matplotlib.pyplot as plt
    import numpy as np

    time = np.array(response.time)

    plot_vars = {
        "pop": ("Population", "#2196F3"),
        "nr": ("Resources", "#4CAF50"),
        "iopc": ("Industrial output/cap", "#F44336"),
        "fpc": ("Food/capita", "#FF9800"),
        "ppolx": ("Pollution index", "#9C27B0"),
    }

    _fig, ax = plt.subplots(figsize=(10, 6))

    for var_name, (label, color) in plot_vars.items():
        if var_name not in response.series:
            continue
        vals = np.array(response.series[var_name].values)
        vmin, vmax = vals.min(), vals.max()
        normalized = (
            (vals - vmin) / (vmax - vmin) if vmax > vmin else np.zeros_like(vals)
        )
        ax.plot(time, normalized, label=label, color=color, linewidth=2.5)

    ax.set_xlabel("Year", fontsize=12)
    ax.set_ylabel("Normalized value (0\u20131)", fontsize=12)
    ax.set_title(
        f"World3 Simulation \u2014 Key Variables "
        f"({response.year_min:.0f}\u2013{response.year_max:.0f})",
        fontsize=14,
    )
    ax.legend(loc="upper left", fontsize=11)
    ax.set_xlim(response.year_min, response.year_max)
    ax.set_ylim(-0.05, 1.1)
    ax.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(str(output_path), dpi=150)
    plt.close()


def _format_simulation_summary(response: SimulationResponse) -> str:
    """Format a compact simulation summary with trends."""
    header = (
        f"World3 Simulation Summary "
        f"({response.year_min:.0f}-{response.year_max:.0f}, dt={response.dt})"
    )
    lines: list[str] = [header, ""]

    by_sector: dict[str, list[str]] = defaultdict(list)
    for var_name, ts in response.series.items():
        meta = VARIABLE_META.get(var_name)
        vals = ts.values
        if not vals:
            continue
        first = vals[0]
        last = vals[-1]
        v_min = min(vals)
        v_max = max(vals)

        # Trend: compare last 10% to middle 10%
        n = len(vals)
        mid_start = int(n * 0.45)
        mid_end = int(n * 0.55)
        late_start = int(n * 0.9)
        mid_avg = sum(vals[mid_start:mid_end]) / max(1, mid_end - mid_start)
        late_avg = sum(vals[late_start:]) / max(1, n - late_start)
        change = (late_avg - mid_avg) / abs(mid_avg) if mid_avg != 0 else 0.0
        if change > 0.05:
            trend = "rising"
        elif change < -0.05:
            trend = "declining"
        else:
            trend = "stable"

        full_name = meta.full_name if meta else var_name
        sector = meta.sector if meta else "Other"
        line = (
            f"  {var_name:<10s} {full_name:<45s} "
            f"{first:>12.2f} -> {last:>12.2f}  "
            f"min={v_min:<12.2f}  max={v_max:<12.2f}  ({trend})"
        )
        by_sector[sector].append(line)

    for sector, entries in by_sector.items():
        lines.append(sector)
        lines.append("-" * len(sector))
        lines.extend(entries)
        lines.append("")

    return "\n".join(lines)


def _format_value(value: float) -> str:
    """Format a number in a human-friendly way."""
    abs_val = abs(value)
    if abs_val >= 1e12:
        return f"{value / 1e12:.2f}T"
    if abs_val >= 1e9:
        return f"{value / 1e9:.2f}B"
    if abs_val >= 1e6:
        return f"{value / 1e6:.2f}M"
    if abs_val >= 1e3:
        return f"{value / 1e3:.2f}K"
    return f"{value:.2f}"


def _format_comparison(
    name_a: str,
    name_b: str,
    resp_a: SimulationResponse,
    resp_b: SimulationResponse,
) -> str:
    """Format a side-by-side comparison of two simulation results."""
    year_range = f"{resp_a.year_min:.0f}-{resp_a.year_max:.0f}"
    lines: list[str] = [
        f"Comparison: {name_a} vs {name_b} ({year_range})",
        "",
    ]

    # Key metrics to compare: (variable, label, unit, use_last_value)
    metrics = [
        ("pop", "Population", "", True),
        ("iopc", "Industrial output/cap", "$", True),
        ("fpc", "Food/capita", "kg", True),
        ("ppolx", "Pollution index", "", True),
        ("nrfr", "Resources remaining", "%", True),
        ("le", "Life expectancy", "yr", True),
    ]

    col_w = max(len(name_a), len(name_b), 15)
    header = f"{'':30s} {name_a:>{col_w}s}   {name_b:>{col_w}s}     {'Delta':>8s}"
    lines.append(header)
    lines.append("-" * len(header))

    for var_name, label, unit, use_last in metrics:
        series_a = resp_a.series.get(var_name)
        series_b = resp_b.series.get(var_name)
        if not series_a or not series_b:
            continue

        val_a = series_a.values[-1] if use_last else series_a.values[0]
        val_b = series_b.values[-1] if use_last else series_b.values[0]

        if var_name == "nrfr":
            # Show as percentage
            str_a = f"{val_a * 100:.0f}%"
            str_b = f"{val_b * 100:.0f}%"
        else:
            suffix = f" {unit}" if unit else ""
            str_a = f"{_format_value(val_a)}{suffix}"
            str_b = f"{_format_value(val_b)}{suffix}"

        if val_a != 0:
            delta_pct = (val_b - val_a) / abs(val_a) * 100
            sign = "+" if delta_pct >= 0 else ""
            delta_str = f"{sign}{delta_pct:.0f}%"
        else:
            delta_str = "N/A"

        lines.append(
            f"  {label:<28s} {str_a:>{col_w}s}   {str_b:>{col_w}s}     {delta_str:>8s}"
        )

    return "\n".join(lines)


def _generate_comparison_plot(
    name_a: str,
    name_b: str,
    resp_a: SimulationResponse,
    resp_b: SimulationResponse,
    output_path: Path,
) -> None:
    """Generate an overlay comparison plot for two scenarios."""
    import matplotlib

    matplotlib.use("Agg")

    import matplotlib.pyplot as plt
    import numpy as np

    time_a = np.array(resp_a.time)
    time_b = np.array(resp_b.time)

    plot_vars = {
        "pop": ("Population", "#2196F3"),
        "nr": ("Resources", "#4CAF50"),
        "iopc": ("Industrial output/cap", "#F44336"),
        "fpc": ("Food/capita", "#FF9800"),
        "ppolx": ("Pollution index", "#9C27B0"),
    }

    _fig, axes = plt.subplots(len(plot_vars), 1, figsize=(10, 3 * len(plot_vars)))

    for ax, (var_name, (label, color)) in zip(axes, plot_vars.items()):
        series_a = resp_a.series.get(var_name)
        series_b = resp_b.series.get(var_name)

        if series_a:
            ax.plot(
                time_a,
                series_a.values,
                label=name_a,
                color=color,
                linewidth=2,
                linestyle="-",
            )
        if series_b:
            ax.plot(
                time_b,
                series_b.values,
                label=name_b,
                color=color,
                linewidth=2,
                linestyle="--",
                alpha=0.8,
            )

        ax.set_ylabel(label, fontsize=10)
        ax.legend(fontsize=9)
        ax.grid(True, alpha=0.3)

    axes[-1].set_xlabel("Year", fontsize=12)
    axes[0].set_title(
        f"Comparison: {name_a} vs {name_b}",
        fontsize=14,
    )

    plt.tight_layout()
    plt.savefig(str(output_path), dpi=150)
    plt.close()


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------


@app.command()
def simulate(
    year_min: Annotated[float, typer.Option(help="Start year")] = 1900,
    year_max: Annotated[float, typer.Option(help="End year")] = 2100,
    dt: Annotated[float, typer.Option(help="Time step [year]")] = 0.5,
    pyear: Annotated[float, typer.Option(help="Policy year")] = 1975,
    iphst: Annotated[float, typer.Option(help="Health policy year")] = 1940,
    set_: Annotated[
        list[str] | None,
        typer.Option("--set", help="Constant override: name=value"),
    ] = None,
    var: Annotated[
        list[str] | None,
        typer.Option(help="Output variable name"),
    ] = None,
    from_file: Annotated[
        Path | None,
        typer.Option("--from", help="Load scenario from a TOML file"),
    ] = None,
    preset: Annotated[
        str | None,
        typer.Option(help="Use a built-in preset scenario"),
    ] = None,
    output: Annotated[
        Path | None,
        typer.Option("--output", "-o", help="Output file (default: stdout)"),
    ] = None,
    pretty: Annotated[bool, typer.Option(help="Pretty-print JSON")] = False,
    summary: Annotated[
        bool, typer.Option(help="Print compact summary instead of JSON")
    ] = False,
    plot: Annotated[
        Path | None,
        typer.Option(help="Save a plot of key variables to this path (png)"),
    ] = None,
):
    """Run a World3 simulation and output results as JSON."""
    if summary and (output is not None or pretty):
        typer.echo(
            "Error: --summary cannot be combined with --output or --pretty",
            err=True,
        )
        raise typer.Exit(code=1)

    if from_file is not None and preset is not None:
        typer.echo(
            "Error: --from and --preset are mutually exclusive",
            err=True,
        )
        raise typer.Exit(code=1)

    # Load scenario from file or preset
    scenario: ScenarioFile | None = None
    if from_file is not None:
        scenario = _load_scenario_file(from_file)
    elif preset is not None:
        available = _list_presets()
        if preset not in available:
            typer.echo(
                f"Error: unknown preset '{preset}'. Available: {', '.join(available)}",
                err=True,
            )
            raise typer.Exit(code=1)
        scenario = _load_preset(preset)

    constants = _parse_set_overrides(set_)

    try:
        request = _build_request(
            scenario=scenario,
            year_min=year_min,
            year_max=year_max,
            dt=dt,
            pyear=pyear,
            iphst=iphst,
            constants=constants,
            var=var,
        )
    except ValueError as exc:
        typer.echo(f"Error: {exc}", err=True)
        raise typer.Exit(code=1) from exc

    try:
        response = _run_request(request)
    except SimulationValidationError as exc:
        typer.echo(f"Error: {exc.safe_message}", err=True)
        raise typer.Exit(code=1) from exc

    if plot is not None:
        _generate_plot(response, plot)
        typer.echo(f"Plot saved to {plot}", err=True)

    if summary:
        sys.stdout.write(_format_simulation_summary(response))
        sys.stdout.write("\n")
        return

    result_dict = response.model_dump()
    indent = 2 if pretty else None
    json_str = json.dumps(result_dict, indent=indent)

    if output:
        output.write_text(json_str)
        typer.echo(f"Written to {output}", err=True)
    else:
        sys.stdout.write(json_str)
        sys.stdout.write("\n")


@app.command()
def constants(
    describe: Annotated[
        bool, typer.Option(help="Show human-readable table grouped by sector")
    ] = False,
):
    """Print all World3 constant defaults as JSON."""
    if describe:
        print(_format_constants_table())
    else:
        print(json.dumps(CONSTANT_DEFAULTS, indent=2))


@app.command()
def variables(
    describe: Annotated[
        bool, typer.Option(help="Show human-readable table grouped by sector")
    ] = False,
):
    """Print default output variable names."""
    if describe:
        print(_format_variables_table())
    else:
        print(json.dumps(DEFAULT_OUTPUT_VARIABLES, indent=2))


@app.command(name="presets")
def list_presets():
    """List available built-in scenario presets."""
    available = _list_presets()
    for name in available:
        scenario = _load_preset(name)
        typer.echo(f"  {name:<30s} {scenario.description}")


@app.command()
def compare(
    from_file: Annotated[
        list[Path] | None,
        typer.Option("--from", help="Scenario TOML file (can specify up to 2)"),
    ] = None,
    preset: Annotated[
        list[str] | None,
        typer.Option(help="Built-in preset name (can specify up to 2)"),
    ] = None,
    plot: Annotated[
        Path | None,
        typer.Option(help="Save comparison plot to this path (png)"),
    ] = None,
):
    """Compare two scenarios side by side.

    Provide two scenarios via --from and/or --preset. If only one is given,
    it is compared against the standard run (defaults).
    """
    # Collect scenarios
    scenarios: list[ScenarioFile] = []

    if from_file:
        for path in from_file:
            scenarios.append(_load_scenario_file(path))
    if preset:
        available = _list_presets()
        for name in preset:
            if name not in available:
                typer.echo(
                    f"Error: unknown preset '{name}'. "
                    f"Available: {', '.join(available)}",
                    err=True,
                )
                raise typer.Exit(code=1)
            scenarios.append(_load_preset(name))

    if len(scenarios) == 0:
        typer.echo(
            "Error: provide at least one scenario via --from or --preset", err=True
        )
        raise typer.Exit(code=1)
    if len(scenarios) > 2:
        typer.echo("Error: compare accepts at most 2 scenarios", err=True)
        raise typer.Exit(code=1)

    # If only one scenario, compare against defaults
    if len(scenarios) == 1:
        scenarios.insert(0, ScenarioFile(name="Standard Run"))

    scenario_a, scenario_b = scenarios

    try:
        req_a = scenario_a.to_simulation_request()
        req_b = scenario_b.to_simulation_request()
    except ValueError as exc:
        typer.echo(f"Error: {exc}", err=True)
        raise typer.Exit(code=1) from exc

    try:
        resp_a = _run_request(req_a)
        resp_b = _run_request(req_b)
    except SimulationValidationError as exc:
        typer.echo(f"Error: {exc.safe_message}", err=True)
        raise typer.Exit(code=1) from exc

    comparison = _format_comparison(scenario_a.name, scenario_b.name, resp_a, resp_b)
    sys.stdout.write(comparison)
    sys.stdout.write("\n")

    if plot is not None:
        _generate_comparison_plot(
            scenario_a.name, scenario_b.name, resp_a, resp_b, plot
        )
        typer.echo(f"Comparison plot saved to {plot}", err=True)


@app.command()
def calibrate(
    reference_year: Annotated[
        int, typer.Option(help="Reference year for calibration")
    ] = 1970,
    entity: Annotated[str, typer.Option(help="Entity to calibrate against")] = "World",
    param: Annotated[
        list[str] | None,
        typer.Option(help="Specific constant to calibrate (repeatable)"),
    ] = None,
    output: Annotated[
        Path | None,
        typer.Option("--output", "-o", help="Output file (default: stdout)"),
    ] = None,
    pretty: Annotated[bool, typer.Option(help="Pretty-print JSON")] = False,
):
    """Calibrate World3 constants from OWID observed data.

    Fetches real-world data from Our World in Data and derives calibrated
    values for World3 model constants.

    Requires: pip install pyworld3[owid]
    """
    try:
        from pyworld3.application.calibrate import CalibrationService
        from pyworld3.application.ports import CalibrationParams
    except ImportError:
        typer.echo(
            "Error: OWID dependencies not installed. "
            "Install with: pip install pyworld3[owid]",
            err=True,
        )
        raise typer.Exit(code=1) from None

    params = CalibrationParams(
        reference_year=reference_year,
        entity=entity,
        parameters=param or None,
    )

    try:
        service = CalibrationService()
        result = service.calibrate(params)
    except Exception as exc:
        typer.echo(f"Error: {exc}", err=True)
        raise typer.Exit(code=1) from exc

    # Format output
    output_data: dict[str, object] = {
        "reference_year": result.reference_year,
        "entity": result.entity,
        "constants": {
            name: {
                "value": cc.value,
                "default_value": cc.default_value,
                "confidence": cc.confidence,
                "owid_indicator": cc.owid_indicator,
                "description": cc.description,
            }
            for name, cc in result.constants.items()
        },
    }
    if result.warnings:
        output_data["warnings"] = result.warnings

    indent = 2 if pretty else None
    json_str = json.dumps(output_data, indent=indent)

    if output:
        output.write_text(json_str)
        typer.echo(f"Written to {output}", err=True)
    else:
        sys.stdout.write(json_str)
        sys.stdout.write("\n")


@app.command(name="validate")
def validate_cmd(
    from_file: Annotated[
        Path | None,
        typer.Option("--from", help="Load scenario from a TOML file"),
    ] = None,
    preset: Annotated[
        str | None,
        typer.Option(help="Use a built-in preset scenario"),
    ] = None,
    entity: Annotated[str, typer.Option(help="Entity to validate against")] = "World",
    var: Annotated[
        list[str] | None,
        typer.Option(help="Specific variable to validate (repeatable)"),
    ] = None,
    output: Annotated[
        Path | None,
        typer.Option("--output", "-o", help="Output file (default: stdout)"),
    ] = None,
    pretty: Annotated[bool, typer.Option(help="Pretty-print JSON")] = False,
    summary: Annotated[
        bool, typer.Option(help="Print compact summary instead of JSON")
    ] = False,
):
    """Validate a simulation against OWID observed data.

    Runs a simulation and compares its outputs to real-world data from
    Our World in Data, computing error metrics (RMSE, MAPE, correlation).

    Requires: pip install pyworld3[owid]
    """
    try:
        from pyworld3.application.ports import ValidationParams
        from pyworld3.application.validate import ValidationService
    except ImportError:
        typer.echo(
            "Error: OWID dependencies not installed. "
            "Install with: pip install pyworld3[owid]",
            err=True,
        )
        raise typer.Exit(code=1) from None

    if from_file is not None and preset is not None:
        typer.echo(
            "Error: --from and --preset are mutually exclusive",
            err=True,
        )
        raise typer.Exit(code=1)

    # Build simulation request
    scenario: ScenarioFile | None = None
    if from_file is not None:
        scenario = _load_scenario_file(from_file)
    elif preset is not None:
        available = _list_presets()
        if preset not in available:
            typer.echo(
                f"Error: unknown preset '{preset}'. Available: {', '.join(available)}",
                err=True,
            )
            raise typer.Exit(code=1)
        scenario = _load_preset(preset)

    if scenario is not None:
        request = scenario.to_simulation_request()
    else:
        request = SimulationRequest()

    # Run simulation
    try:
        response = _run_request(request)
    except SimulationValidationError as exc:
        typer.echo(f"Error: {exc.safe_message}", err=True)
        raise typer.Exit(code=1) from exc

    # Convert to SimulationResult for the validation service
    from pyworld3.application.ports import SimulationResult, TimeSeriesResult

    sim_result = SimulationResult(
        year_min=response.year_min,
        year_max=response.year_max,
        dt=response.dt,
        time=response.time,
        constants_used=response.constants_used,
        series={
            name: TimeSeriesResult(name=ts.name, values=ts.values)
            for name, ts in response.series.items()
        },
    )

    # Validate
    try:
        service = ValidationService()
        result = service.validate(
            sim_result,
            ValidationParams(entity=entity, variables=var or None),
        )
    except Exception as exc:
        typer.echo(f"Error: {exc}", err=True)
        raise typer.Exit(code=1) from exc

    if summary:
        _print_validation_summary(result)
        return

    # Format output
    output_data: dict[str, object] = {
        "entity": result.entity,
        "overlap_start": result.overlap_start,
        "overlap_end": result.overlap_end,
        "metrics": {
            name: {
                "variable": vm.variable,
                "owid_indicator": vm.owid_indicator,
                "confidence": vm.confidence,
                "overlap_years": list(vm.overlap_years),
                "n_points": vm.n_points,
                "rmse": vm.rmse,
                "mape": vm.mape,
                "correlation": vm.correlation,
            }
            for name, vm in result.metrics.items()
        },
    }
    if result.warnings:
        output_data["warnings"] = result.warnings

    indent = 2 if pretty else None
    json_str = json.dumps(output_data, indent=indent)

    if output:
        output.write_text(json_str)
        typer.echo(f"Written to {output}", err=True)
    else:
        sys.stdout.write(json_str)
        sys.stdout.write("\n")


def _print_validation_summary(result: ValidationResult) -> None:
    """Print a human-readable validation summary."""
    print(f"Validation Summary (entity: {result.entity})")
    print(f"Overlap: {result.overlap_start:.0f} - {result.overlap_end:.0f}")
    print()

    if not result.metrics:
        print("  No metrics computed.")
        if result.warnings:
            print()
            for w in result.warnings:
                print(f"  Warning: {w}")
        return

    header = f"  {'Variable':<10s} {'RMSE':>12s} {'MAPE':>8s} {'Corr':>8s} {'Points':>8s} {'Confidence':<10s}"
    print(header)
    print("  " + "-" * (len(header) - 2))

    for name, vm in result.metrics.items():
        mape_str = f"{vm.mape:.1f}%" if vm.mape == vm.mape else "N/A"
        corr_str = (
            f"{vm.correlation:.3f}" if vm.correlation == vm.correlation else "N/A"
        )
        print(
            f"  {name:<10s} {vm.rmse:>12.4g} {mape_str:>8s} {corr_str:>8s} "
            f"{vm.n_points:>8d} {vm.confidence:<10s}"
        )

    if result.warnings:
        print()
        for w in result.warnings:
            print(f"  Warning: {w}")


if __name__ == "__main__":
    app()
