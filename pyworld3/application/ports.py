from dataclasses import dataclass, field
from typing import Protocol


@dataclass
class SimulationParams:
    year_min: float = 1900
    year_max: float = 2100
    dt: float = 0.5
    pyear: float = 1975
    iphst: float = 1940
    constants: dict[str, float] | None = None
    output_variables: list[str] | None = None


@dataclass
class TimeSeriesResult:
    name: str
    values: list[float]


@dataclass
class SimulationResult:
    year_min: float
    year_max: float
    dt: float
    time: list[float]
    constants_used: dict[str, float]
    series: dict[str, TimeSeriesResult] = field(default_factory=dict)


class SimulationPort(Protocol):
    def run(self, params: SimulationParams) -> SimulationResult: ...


# ---------------------------------------------------------------------------
# Calibration ports
# ---------------------------------------------------------------------------


@dataclass
class CalibrationParams:
    """Parameters for calibrating World3 constants from OWID data."""

    reference_year: int = 1970
    entity: str = "World"
    parameters: list[str] | None = None  # None = calibrate all available


@dataclass
class CalibratedConstant:
    """A single calibrated constant with provenance."""

    name: str
    value: float
    confidence: str
    owid_indicator: str
    description: str
    default_value: float


@dataclass
class CalibrationResult:
    """Result of calibrating World3 constants from OWID data."""

    reference_year: int
    entity: str
    constants: dict[str, CalibratedConstant]
    warnings: list[str] = field(default_factory=list)

    def to_constants_dict(self) -> dict[str, float]:
        """Extract a plain dict suitable for SimulationParams.constants."""
        return {name: cc.value for name, cc in self.constants.items()}


class CalibrationPort(Protocol):
    def calibrate(self, params: CalibrationParams) -> CalibrationResult: ...


# ---------------------------------------------------------------------------
# Validation ports
# ---------------------------------------------------------------------------


@dataclass
class ValidationMetric:
    """Error metrics for a single validated output variable."""

    variable: str
    owid_indicator: str
    confidence: str
    description: str
    overlap_years: tuple[float, float]
    n_points: int
    rmse: float
    mape: float  # Mean Absolute Percentage Error (0-100)
    correlation: float  # Pearson r


@dataclass
class ValidationParams:
    """Parameters for validating simulation output against OWID data."""

    entity: str = "World"
    variables: list[str] | None = None  # None = validate all available


@dataclass
class ValidationResult:
    """Result of validating a simulation against OWID data."""

    entity: str
    overlap_start: float
    overlap_end: float
    metrics: dict[str, ValidationMetric]
    warnings: list[str] = field(default_factory=list)


class ValidationPort(Protocol):
    def validate(
        self, result: SimulationResult, params: ValidationParams
    ) -> ValidationResult: ...
