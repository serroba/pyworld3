import json
import sys
from pathlib import Path
from typing import Annotated, Optional

import typer

from .engine import CONSTANT_DEFAULTS, DEFAULT_OUTPUT_VARIABLES, run_simulation
from .models import SimulationRequest

app = typer.Typer(name="pyworld3", help="Run World3 what-if simulations")


@app.command()
def simulate(
    year_min: Annotated[float, typer.Option(help="Start year")] = 1900,
    year_max: Annotated[float, typer.Option(help="End year")] = 2100,
    dt: Annotated[float, typer.Option(help="Time step [year]")] = 0.5,
    pyear: Annotated[float, typer.Option(help="Policy year")] = 1975,
    iphst: Annotated[float, typer.Option(help="Health policy year")] = 1940,
    set_: Annotated[
        Optional[list[str]],
        typer.Option("--set", help="Constant override: name=value"),
    ] = None,
    var: Annotated[
        Optional[list[str]],
        typer.Option(help="Output variable name"),
    ] = None,
    output: Annotated[
        Optional[Path],
        typer.Option("--output", "-o", help="Output file (default: stdout)"),
    ] = None,
    pretty: Annotated[bool, typer.Option(help="Pretty-print JSON")] = False,
):
    """Run a World3 simulation and output results as JSON."""
    constants: dict[str, float] = {}
    if set_:
        for item in set_:
            if "=" not in item:
                typer.echo(f"Error: invalid --set format '{item}', expected name=value", err=True)
                raise typer.Exit(code=1)
            name, val = item.split("=", 1)
            try:
                constants[name] = float(val)
            except ValueError:
                typer.echo(f"Error: cannot parse '{val}' as float for '{name}'", err=True)
                raise typer.Exit(code=1)

    request = SimulationRequest(
        year_min=year_min,
        year_max=year_max,
        dt=dt,
        pyear=pyear,
        iphst=iphst,
        constants=constants or None,
        output_variables=var or None,
    )

    try:
        response = run_simulation(request)
    except ValueError as exc:
        typer.echo(f"Error: {exc}", err=True)
        raise typer.Exit(code=1)

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
def constants():
    """Print all World3 constant defaults as JSON."""
    print(json.dumps(CONSTANT_DEFAULTS, indent=2))


@app.command()
def variables():
    """Print default output variable names."""
    print(json.dumps(DEFAULT_OUTPUT_VARIABLES, indent=2))


if __name__ == "__main__":
    app()
