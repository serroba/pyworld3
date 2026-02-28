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
