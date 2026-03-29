import importlib.resources
import tomllib
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field, model_validator

from pyworld3.application.ports import (
    CalibrationParams,
    CalibrationResult,
    SimulationParams,
    SimulationResult,
    ValidationResult,
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


# ---------------------------------------------------------------------------
# Preset helpers (shared by CLI + API)
# ---------------------------------------------------------------------------

_PRESET_PACKAGE = "pyworld3.domain.presets"


def list_presets() -> list[str]:
    """Return sorted list of available preset names (without .toml extension)."""
    files = importlib.resources.files(_PRESET_PACKAGE)
    return sorted(
        p.name.removesuffix(".toml")
        for p in files.iterdir()
        if p.name.endswith(".toml")
    )


def load_preset(name: str) -> ScenarioFile:
    """Load a built-in preset by name."""
    ref = importlib.resources.files(_PRESET_PACKAGE).joinpath(f"{name}.toml")
    with importlib.resources.as_file(ref) as path:
        return ScenarioFile.from_toml(path)


# ---------------------------------------------------------------------------
# API-specific schemas
# ---------------------------------------------------------------------------


class PresetInfo(BaseModel):
    name: str
    description: str
    constants: dict[str, float]


class ScenarioSpec(BaseModel):
    """One side of a comparison: either a preset name or an inline request."""

    preset: str | None = None
    request: SimulationRequest | None = None

    @model_validator(mode="after")
    def _at_least_one(self):
        if self.preset is None and self.request is None:
            raise ValueError("Either 'preset' or 'request' must be provided")
        return self


class CompareRequest(BaseModel):
    scenario_a: ScenarioSpec
    scenario_b: ScenarioSpec | None = None


class CompareMetric(BaseModel):
    label: str
    variable: str
    value_a: float
    value_b: float
    delta_pct: float | None


class CompareResponse(BaseModel):
    scenario_a: str
    scenario_b: str
    results_a: SimulationResponse
    results_b: SimulationResponse
    metrics: list[CompareMetric]


# ---------------------------------------------------------------------------
# OWID calibration / validation schemas
# ---------------------------------------------------------------------------


class CalibrationRequest(BaseModel):
    """Request to calibrate World3 constants from OWID observed data."""

    reference_year: int = Field(
        default=1970,
        ge=1900,
        le=2025,
        description="Reference year for calibration",
    )
    entity: str = Field(
        default="World",
        description="Entity to calibrate against (default: World)",
    )
    parameters: list[str] | None = Field(
        default=None,
        description="Specific constants to calibrate (default: all available)",
    )

    def to_params(self) -> CalibrationParams:
        return CalibrationParams(
            reference_year=self.reference_year,
            entity=self.entity,
            parameters=self.parameters,
        )


class CalibratedConstantOutput(BaseModel):
    name: str
    value: float
    confidence: str
    owid_indicator: str
    description: str
    default_value: float


class CalibrationResponse(BaseModel):
    reference_year: int
    entity: str
    constants: dict[str, CalibratedConstantOutput]
    warnings: list[str]

    @staticmethod
    def from_result(result: CalibrationResult) -> "CalibrationResponse":
        return CalibrationResponse(
            reference_year=result.reference_year,
            entity=result.entity,
            constants={
                name: CalibratedConstantOutput(
                    name=cc.name,
                    value=cc.value,
                    confidence=cc.confidence,
                    owid_indicator=cc.owid_indicator,
                    description=cc.description,
                    default_value=cc.default_value,
                )
                for name, cc in result.constants.items()
            },
            warnings=result.warnings,
        )


class ValidationRequest(BaseModel):
    """Request to validate simulation output against OWID data."""

    entity: str = Field(
        default="World",
        description="Entity to validate against (default: World)",
    )
    variables: list[str] | None = Field(
        default=None,
        description="Specific variables to validate (default: all available)",
    )


class ValidationFromResultRequest(BaseModel):
    """Request to validate a provided simulation result against OWID data."""

    simulation_result: SimulationResponse
    validation_request: ValidationRequest | None = None


class ValidationMetricOutput(BaseModel):
    variable: str
    owid_indicator: str
    confidence: str
    description: str
    overlap_years: list[float]
    n_points: int
    rmse: float
    mape: float
    correlation: float


class ValidationResponse(BaseModel):
    entity: str
    overlap_start: float
    overlap_end: float
    metrics: dict[str, ValidationMetricOutput]
    warnings: list[str]

    @staticmethod
    def from_result(result: ValidationResult) -> "ValidationResponse":
        return ValidationResponse(
            entity=result.entity,
            overlap_start=result.overlap_start,
            overlap_end=result.overlap_end,
            metrics={
                name: ValidationMetricOutput(
                    variable=vm.variable,
                    owid_indicator=vm.owid_indicator,
                    confidence=vm.confidence,
                    description=vm.description,
                    overlap_years=list(vm.overlap_years),
                    n_points=vm.n_points,
                    rmse=vm.rmse,
                    mape=vm.mape,
                    correlation=vm.correlation,
                )
                for name, vm in result.metrics.items()
            },
            warnings=result.warnings,
        )
