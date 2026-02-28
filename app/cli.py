import json
import sys
from collections import defaultdict
from pathlib import Path
from typing import Annotated

import typer

from .engine import (
    CONSTANT_DEFAULTS,
    CONSTANT_META,
    DEFAULT_OUTPUT_VARIABLES,
    VARIABLE_META,
    SimulationValidationError,
    run_simulation,
)
from .models import SimulationRequest, SimulationResponse

app = typer.Typer(name="pyworld3", help="Run World3 what-if simulations")


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
    output: Annotated[
        Path | None,
        typer.Option("--output", "-o", help="Output file (default: stdout)"),
    ] = None,
    pretty: Annotated[bool, typer.Option(help="Pretty-print JSON")] = False,
    summary: Annotated[
        bool, typer.Option(help="Print compact summary instead of JSON")
    ] = False,
):
    """Run a World3 simulation and output results as JSON."""
    if summary and (output is not None or pretty):
        typer.echo(
            "Error: --summary cannot be combined with --output or --pretty",
            err=True,
        )
        raise typer.Exit(code=1)

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

    try:
        request = SimulationRequest(
            year_min=year_min,
            year_max=year_max,
            dt=dt,
            pyear=pyear,
            iphst=iphst,
            constants=constants or None,
            output_variables=var or None,
        )
    except ValueError as exc:
        typer.echo(f"Error: {exc}", err=True)
        raise typer.Exit(code=1) from exc

    try:
        response = run_simulation(request)
    except SimulationValidationError as exc:
        typer.echo(f"Error: {exc}", err=True)
        raise typer.Exit(code=1) from exc

    if summary:
        sys.stdout.write(_format_simulation_summary(response))
        sys.stdout.write("\n")
        return

    result = response.model_dump()
    indent = 2 if pretty else None
    json_str = json.dumps(result, indent=indent)

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


if __name__ == "__main__":
    app()
