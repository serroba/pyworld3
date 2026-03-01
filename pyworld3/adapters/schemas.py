import tomllib
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field, model_validator

from pyworld3.application.ports import (
    SimulationParams,
    SimulationResult,
)


class ScenarioFile(BaseModel):
    """A scenario loaded from a TOML file."""

    name: str = "Unnamed Scenario"
    description: str = ""
    year_min: float | None = None
    year_max: float | None = None
    dt: float | None = None
    pyear: float | None = None
    iphst: float | None = None
    constants: dict[str, float] = Field(default_factory=dict)
    output_variables: list[str] | None = None

    @staticmethod
    def from_toml(path: Path) -> "ScenarioFile":
        with path.open("rb") as f:
            data = tomllib.load(f)
        return ScenarioFile(**data)

    def to_simulation_request(self, **cli_overrides: object) -> "SimulationRequest":
        """Build a SimulationRequest, letting cli_overrides take precedence."""
        params: dict[str, Any] = {}
        for field_name in ("year_min", "year_max", "dt", "pyear", "iphst"):
            cli_val = cli_overrides.get(field_name)
            file_val = getattr(self, field_name)
            if cli_val is not None:
                params[field_name] = cli_val
            elif file_val is not None:
                params[field_name] = file_val

        # Merge constants: file values, then --set overrides on top
        merged_constants = dict(self.constants)
        cli_constants = cli_overrides.get("constants")
        if isinstance(cli_constants, dict):
            merged_constants.update(cli_constants)
        params["constants"] = merged_constants or None

        # Output variables: CLI --var overrides file
        cli_vars = cli_overrides.get("output_variables")
        if cli_vars is not None:
            params["output_variables"] = cli_vars
        elif self.output_variables is not None:
            params["output_variables"] = self.output_variables

        return SimulationRequest(**params)


class SimulationRequest(BaseModel):
    year_min: float = Field(
        default=1900, ge=1900, le=2500, description="Start year of the simulation"
    )
    year_max: float = Field(
        default=2100, ge=1900, le=2500, description="End year of the simulation"
    )
    dt: float = Field(
        default=0.5, gt=0, le=100, description="Time step of the simulation [year]"
    )
    pyear: float = Field(
        default=1975, description="Implementation date of new policies [year]"
    )
    iphst: float = Field(
        default=1940,
        description="Implementation date of new policy on health service time [year]",
    )
    constants: dict[str, float] | None = Field(
        default=None,
        description="Override any World3 constant by name (e.g. {'nri': 2e12})",
    )
    output_variables: list[str] | None = Field(
        default=None,
        description="Which output variables to return (default: a curated list)",
    )

    @model_validator(mode="after")
    def check_year_range(self):
        if self.year_max < self.year_min:
            raise ValueError(
                f"year_max ({self.year_max}) must be >= year_min ({self.year_min})"
            )
        if not (self.year_min <= self.pyear <= self.year_max):
            raise ValueError(
                f"pyear ({self.pyear}) must be within"
                f" [{self.year_min}, {self.year_max}]"
            )
        if not (self.year_min <= self.iphst <= self.year_max):
            raise ValueError(
                f"iphst ({self.iphst}) must be within"
                f" [{self.year_min}, {self.year_max}]"
            )
        steps = (self.year_max - self.year_min) / self.dt
        if steps > 100_000:
            raise ValueError(
                f"Too many time steps ({steps:.0f}); reduce the year range"
                f" or increase dt (max 100,000 steps)"
            )
        return self

    def to_params(self) -> SimulationParams:
        return SimulationParams(
            year_min=self.year_min,
            year_max=self.year_max,
            dt=self.dt,
            pyear=self.pyear,
            iphst=self.iphst,
            constants=self.constants,
            output_variables=self.output_variables,
        )


class TimeSeriesOutput(BaseModel):
    name: str
    values: list[float]


class SimulationResponse(BaseModel):
    year_min: float
    year_max: float
    dt: float
    time: list[float]
    constants_used: dict[str, float]
    series: dict[str, TimeSeriesOutput]

    @staticmethod
    def from_result(result: SimulationResult) -> "SimulationResponse":
        return SimulationResponse(
            year_min=result.year_min,
            year_max=result.year_max,
            dt=result.dt,
            time=result.time,
            constants_used=result.constants_used,
            series={
                name: TimeSeriesOutput(name=ts.name, values=ts.values)
                for name, ts in result.series.items()
            },
        )
