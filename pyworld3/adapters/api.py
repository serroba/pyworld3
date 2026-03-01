import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from pyworld3.application.calibrate import CalibrationService
from pyworld3.application.container import get_service
from pyworld3.application.ports import (
    SimulationResult,
    TimeSeriesResult,
    ValidationParams,
)
from pyworld3.application.validate import ValidationService
from pyworld3.domain.constants import (
    CONSTANT_DEFAULTS,
    CONSTANT_META,
    DEFAULT_OUTPUT_VARIABLES,
    VARIABLE_META,
)
from pyworld3.domain.exceptions import SimulationValidationError

from .schemas import (
    CalibrationRequest,
    CalibrationResponse,
    CompareMetric,
    CompareRequest,
    CompareResponse,
    PresetInfo,
    ScenarioSpec,
    SimulationRequest,
    SimulationResponse,
    ValidationRequest,
    ValidationResponse,
    list_presets,
    load_preset,
)

logger = logging.getLogger(__name__)

app = FastAPI(title="PyWorld3 API", description="Run World3 what-if simulations")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_COMPARE_METRICS = [
    ("Population", "pop"),
    ("Industrial output/cap", "iopc"),
    ("Food/capita", "fpc"),
    ("Pollution index", "ppolx"),
    ("Resources remaining", "nrfr"),
    ("Life expectancy", "le"),
]


def _run(request: SimulationRequest) -> SimulationResponse:
    service = get_service()
    result = service.run(request.to_params())
    return SimulationResponse.from_result(result)


def _resolve_spec(spec: ScenarioSpec) -> tuple[str, SimulationRequest]:
    """Resolve a ScenarioSpec into a label and SimulationRequest."""
    if spec.preset is not None:
        available = list_presets()
        if spec.preset not in available:
            raise HTTPException(
                status_code=404,
                detail=f"Unknown preset '{spec.preset}'. Available: {', '.join(available)}",
            )
        scenario = load_preset(spec.preset)
        base_request = scenario.to_simulation_request()
        if spec.request is not None:
            # Merge overrides from the inline request
            overrides = spec.request.model_dump(exclude_defaults=True)
            base_request = SimulationRequest(
                **{**base_request.model_dump(), **overrides}
            )
        return scenario.name, base_request
    # inline request only
    return "Custom", spec.request or SimulationRequest()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.post("/simulate", response_model=SimulationResponse)
def simulate(request: SimulationRequest | None = None):
    if request is None:
        request = SimulationRequest()
    try:
        return _run(request)
    except SimulationValidationError as exc:
        return JSONResponse(status_code=422, content={"detail": exc.safe_message})
    except Exception:
        logger.exception("Unexpected error during simulation")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )


@app.get("/constants")
def constants() -> dict[str, float]:
    return CONSTANT_DEFAULTS


@app.get("/variables")
def variables() -> list[str]:
    return DEFAULT_OUTPUT_VARIABLES


@app.get("/presets", response_model=list[PresetInfo])
def get_presets():
    """List available built-in scenario presets."""
    result = []
    for name in list_presets():
        scenario = load_preset(name)
        result.append(
            PresetInfo(
                name=name,
                description=scenario.description,
                constants=scenario.constants,
            )
        )
    return result


@app.post("/simulate/preset/{preset_name}", response_model=SimulationResponse)
def simulate_preset(
    preset_name: str,
    overrides: SimulationRequest | None = None,
):
    """Run a simulation using a built-in preset, with optional overrides."""
    available = list_presets()
    if preset_name not in available:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown preset '{preset_name}'. Available: {', '.join(available)}",
        )
    scenario = load_preset(preset_name)
    request = scenario.to_simulation_request()
    if overrides is not None:
        override_data = overrides.model_dump(exclude_defaults=True)
        request = SimulationRequest(**{**request.model_dump(), **override_data})
    try:
        return _run(request)
    except SimulationValidationError as exc:
        return JSONResponse(status_code=422, content={"detail": exc.safe_message})
    except Exception:
        logger.exception("Unexpected error during simulation")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )


@app.get("/metadata/constants")
def constant_metadata() -> dict[str, dict[str, str]]:
    """Return metadata (full name, unit, sector) for every tunable constant."""
    return {
        name: {"full_name": meta.full_name, "unit": meta.unit, "sector": meta.sector}
        for name, meta in CONSTANT_META.items()
    }


@app.get("/metadata/variables")
def variable_metadata() -> dict[str, dict[str, str]]:
    """Return metadata (full name, unit, sector) for every output variable."""
    return {
        name: {"full_name": meta.full_name, "unit": meta.unit, "sector": meta.sector}
        for name, meta in VARIABLE_META.items()
    }


@app.post("/compare", response_model=CompareResponse)
def compare(body: CompareRequest):
    """Compare two scenarios side by side."""
    label_a, req_a = _resolve_spec(body.scenario_a)
    if body.scenario_b is not None:
        label_b, req_b = _resolve_spec(body.scenario_b)
    else:
        label_b, req_b = "Standard Run", SimulationRequest()

    try:
        resp_a = _run(req_a)
        resp_b = _run(req_b)
    except SimulationValidationError as exc:
        return JSONResponse(status_code=422, content={"detail": exc.safe_message})
    except Exception:
        logger.exception("Unexpected error during comparison")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )

    metrics: list[CompareMetric] = []
    for label, var in _COMPARE_METRICS:
        series_a = resp_a.series.get(var)
        series_b = resp_b.series.get(var)
        if not series_a or not series_b:
            continue
        val_a = series_a.values[-1]
        val_b = series_b.values[-1]
        delta_pct = ((val_b - val_a) / abs(val_a) * 100) if val_a != 0 else None
        metrics.append(
            CompareMetric(
                label=label,
                variable=var,
                value_a=val_a,
                value_b=val_b,
                delta_pct=delta_pct,
            )
        )

    return CompareResponse(
        scenario_a=label_a,
        scenario_b=label_b,
        results_a=resp_a,
        results_b=resp_b,
        metrics=metrics,
    )


# ---------------------------------------------------------------------------
# OWID calibration / validation endpoints
# ---------------------------------------------------------------------------


@app.post("/calibrate", response_model=CalibrationResponse)
def calibrate(request: CalibrationRequest | None = None):
    """Calibrate World3 constants from OWID observed data."""
    if request is None:
        request = CalibrationRequest()
    try:
        service = CalibrationService()
        result = service.calibrate(request.to_params())
        return CalibrationResponse.from_result(result)
    except Exception:
        logger.exception("Unexpected error during calibration")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )


@app.post("/validate", response_model=ValidationResponse)
def validate_simulation(
    simulation_request: SimulationRequest | None = None,
    validation_request: ValidationRequest | None = None,
):
    """Run a simulation and validate its outputs against OWID data.

    If no simulation_request is provided, runs with defaults.
    """
    if simulation_request is None:
        simulation_request = SimulationRequest()
    if validation_request is None:
        validation_request = ValidationRequest()
    try:
        sim_response = _run(simulation_request)
        sim_result = SimulationResult(
            year_min=sim_response.year_min,
            year_max=sim_response.year_max,
            dt=sim_response.dt,
            time=sim_response.time,
            constants_used=sim_response.constants_used,
            series={
                name: TimeSeriesResult(name=ts.name, values=ts.values)
                for name, ts in sim_response.series.items()
            },
        )
        service = ValidationService()
        result = service.validate(
            sim_result,
            ValidationParams(
                entity=validation_request.entity,
                variables=validation_request.variables,
            ),
        )
        return ValidationResponse.from_result(result)
    except SimulationValidationError as exc:
        return JSONResponse(status_code=422, content={"detail": exc.safe_message})
    except Exception:
        logger.exception("Unexpected error during validation")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )


# ---------------------------------------------------------------------------
# Static files (must be registered after all API routes)
# ---------------------------------------------------------------------------

_static_dir = Path(__file__).resolve().parent.parent.parent / "app" / "static"
if _static_dir.is_dir():
    app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")
