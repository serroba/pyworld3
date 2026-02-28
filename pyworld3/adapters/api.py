import logging

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from pyworld3.application.container import get_service
from pyworld3.domain.constants import CONSTANT_DEFAULTS, DEFAULT_OUTPUT_VARIABLES
from pyworld3.domain.exceptions import SimulationValidationError

from .schemas import SimulationRequest, SimulationResponse

logger = logging.getLogger(__name__)

app = FastAPI(title="PyWorld3 API", description="Run World3 what-if simulations")


@app.post("/simulate", response_model=SimulationResponse)
def simulate(request: SimulationRequest | None = None):
    if request is None:
        request = SimulationRequest()
    try:
        service = get_service()
        result = service.run(request.to_params())
        return SimulationResponse.from_result(result)
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
