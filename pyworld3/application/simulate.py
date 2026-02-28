import numpy as np

from pyworld3.domain.constants import (
    CONSTANT_DEFAULTS,
    DEFAULT_OUTPUT_VARIABLES,
)
from pyworld3.domain.exceptions import SimulationValidationError
from pyworld3.domain.validation import validate_constants, validate_output_variables
from pyworld3.domain.world3 import World3

from .ports import SimulationParams, SimulationResult, TimeSeriesResult


class SimulationService:
    """Application service implementing the 'run simulation' use case."""

    def run(self, params: SimulationParams) -> SimulationResult:
        world3 = World3(
            year_min=params.year_min,
            year_max=params.year_max,
            dt=params.dt,
            pyear=params.pyear,
            iphst=params.iphst,
        )

        merged = dict(CONSTANT_DEFAULTS)
        if params.constants:
            unknown = set(params.constants) - set(CONSTANT_DEFAULTS)
            if unknown:
                raise SimulationValidationError(
                    f"Unknown constants: {', '.join(sorted(unknown))}"
                )
            merged.update(params.constants)

        validate_constants(merged)

        world3.init_world3_constants(**merged)
        world3.init_world3_variables()
        world3.set_world3_table_functions()
        world3.set_world3_delay_functions()
        world3.run_world3(fast=True)

        output_vars = params.output_variables or DEFAULT_OUTPUT_VARIABLES
        all_valid = set(DEFAULT_OUTPUT_VARIABLES) | set(CONSTANT_DEFAULTS)
        validate_output_variables(
            output_vars,
            {v for v in all_valid if hasattr(world3, v)},
        )

        series: dict[str, TimeSeriesResult] = {}
        for var_name in output_vars:
            raw = getattr(world3, var_name)
            arr = np.asarray(raw, dtype=float)
            if np.any(np.isinf(arr)):
                raise SimulationValidationError(
                    f"Infinite values encountered in simulation output for '{var_name}'"
                )
            nan_count = int(np.sum(np.isnan(arr)))
            if nan_count > 0:
                # Tolerate a single leading NaN (common initialization artifact in
                # delay-based World3 variables like cbr/cdr at t=0).  Anything
                # beyond that signals simulation divergence.
                leading_nan = np.isnan(arr[0]) if len(arr) > 0 else False
                if nan_count > 1 or (nan_count == 1 and not leading_nan):
                    raise SimulationValidationError(
                        f"NaN values encountered in simulation output for"
                        f" '{var_name}'; the simulation likely diverged"
                    )
                # Replace the single leading NaN with 0.0
                arr = arr.copy()
                arr[0] = 0.0
            series[var_name] = TimeSeriesResult(name=var_name, values=arr.tolist())

        return SimulationResult(
            year_min=params.year_min,
            year_max=params.year_max,
            dt=params.dt,
            time=world3.time.tolist(),
            constants_used=merged,
            series=series,
        )
