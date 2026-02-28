from .constants import CONSTANT_CONSTRAINTS
from .exceptions import SimulationValidationError


def validate_constants(overrides: dict[str, float]) -> None:
    """Validate constant overrides against CONSTANT_CONSTRAINTS."""
    errors: list[str] = []
    for name, value in overrides.items():
        bounds = CONSTANT_CONSTRAINTS.get(name)
        if bounds is None:
            continue
        lo, hi = bounds
        if lo is not None and value < lo:
            errors.append(f"Constant '{name}' must be >= {lo}, got {value}")
        if hi is not None and value > hi:
            errors.append(f"Constant '{name}' must be <= {hi}, got {value}")
    if errors:
        raise SimulationValidationError("; ".join(errors))


def validate_output_variables(requested: list[str], valid: set[str]) -> None:
    """Validate that all requested output variables are known."""
    unknown = [v for v in requested if v not in valid]
    if unknown:
        raise SimulationValidationError(
            f"Unknown output variables: {', '.join(unknown)}"
        )
