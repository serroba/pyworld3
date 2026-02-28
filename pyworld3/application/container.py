from __future__ import annotations

from .ports import SimulationPort

_service: SimulationPort | None = None


def get_service() -> SimulationPort:
    global _service
    if _service is None:
        from .simulate import SimulationService

        _service = SimulationService()
    return _service


def override_service(service: SimulationPort | None) -> None:
    global _service
    _service = service
