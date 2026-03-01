"""Validation service — compares simulation output against OWID observed data.

Takes a SimulationResult and computes error metrics (RMSE, MAPE,
correlation) per output variable over the overlapping time period.

Requires the ``owid`` optional dependency group.
"""

from __future__ import annotations

import logging
import math

from pyworld3.adapters.owid.client import OWIDClient
from pyworld3.adapters.owid.indicators import OWID_INDICATORS
from pyworld3.domain.mappings import get_validation_mappings

from .ports import (
    SimulationResult,
    ValidationMetric,
    ValidationParams,
    ValidationPort,
    ValidationResult,
)

logger = logging.getLogger(__name__)


class ValidationService:
    """Validates World3 simulation outputs against OWID observed data.

    Parameters
    ----------
    client
        An OWIDClient instance for fetching data. If None, a default
        client is created.
    """

    def __init__(self, client: OWIDClient | None = None) -> None:
        self._client = client or OWIDClient()

    def validate(
        self, result: SimulationResult, params: ValidationParams
    ) -> ValidationResult:
        """Validate simulation outputs against OWID data.

        Returns error metrics for each output variable that has both
        simulation data and OWID observed data in an overlapping period.
        """
        mappings = get_validation_mappings()

        # Filter to requested variables if specified
        if params.variables:
            requested = set(params.variables)
            mappings = [m for m in mappings if m.world3_param in requested]

        metrics: dict[str, ValidationMetric] = {}
        warnings: list[str] = []
        global_overlap_start = float("inf")
        global_overlap_end = float("-inf")

        sim_years = result.time

        for mapping in mappings:
            # Check that the simulation has this output variable
            series = result.series.get(mapping.world3_param)
            if series is None:
                warnings.append(
                    f"Skipping {mapping.world3_param}: not in simulation output"
                )
                continue

            # Fetch OWID time series
            indicator = OWID_INDICATORS.get(mapping.owid_indicator)
            if indicator is None:
                warnings.append(
                    f"Skipping {mapping.world3_param}: "
                    f"unknown indicator {mapping.owid_indicator}"
                )
                continue

            owid_years, owid_values = self._client.fetch_timeseries(
                indicator.parquet_url,
                indicator.column,
                entity=params.entity,
                entity_column=indicator.entity_column,
                year_column=indicator.year_column,
                year_min=int(result.year_min),
                year_max=int(result.year_max),
            )

            if not owid_years:
                warnings.append(
                    f"Skipping {mapping.world3_param}: no OWID data in simulation range"
                )
                continue

            # Apply transform to OWID values
            transformed_owid = []
            for val in owid_values:
                if mapping.transform is not None:
                    transformed_owid.append(mapping.transform(val, {}))
                else:
                    transformed_owid.append(val)

            # Interpolate simulation values at OWID year points
            sim_at_owid = _interpolate_at(sim_years, series.values, owid_years)

            if not sim_at_owid:
                warnings.append(
                    f"Skipping {mapping.world3_param}: no overlapping data points"
                )
                continue

            # Compute metrics
            overlap_start = owid_years[0]
            overlap_end = owid_years[-1]
            n_points = len(sim_at_owid)

            rmse = _compute_rmse(sim_at_owid, transformed_owid)
            mape = _compute_mape(sim_at_owid, transformed_owid)
            correlation = _compute_correlation(sim_at_owid, transformed_owid)

            metrics[mapping.world3_param] = ValidationMetric(
                variable=mapping.world3_param,
                owid_indicator=mapping.owid_indicator,
                confidence=mapping.confidence.value,
                description=mapping.description,
                overlap_years=(overlap_start, overlap_end),
                n_points=n_points,
                rmse=rmse,
                mape=mape,
                correlation=correlation,
            )

            global_overlap_start = min(global_overlap_start, overlap_start)
            global_overlap_end = max(global_overlap_end, overlap_end)

            logger.info(
                "Validated %s: RMSE=%.4g, MAPE=%.1f%%, r=%.3f (%d points, %d-%d)",
                mapping.world3_param,
                rmse,
                mape,
                correlation,
                n_points,
                int(overlap_start),
                int(overlap_end),
            )

        # Handle case where no metrics were computed
        if not metrics:
            global_overlap_start = result.year_min
            global_overlap_end = result.year_max

        return ValidationResult(
            entity=params.entity,
            overlap_start=global_overlap_start,
            overlap_end=global_overlap_end,
            metrics=metrics,
            warnings=warnings,
        )


# ---------------------------------------------------------------------------
# Numerical helpers
# ---------------------------------------------------------------------------


def _interpolate_at(
    x_source: list[float],
    y_source: list[float],
    x_target: list[float],
) -> list[float]:
    """Linearly interpolate y_source at x_target points.

    Only returns values for target points within the source range.
    """
    if not x_source or not y_source:
        return []

    result = []
    src_min = x_source[0]
    src_max = x_source[-1]

    for xt in x_target:
        if xt < src_min or xt > src_max:
            continue

        # Find bracketing indices via binary search
        lo, hi = 0, len(x_source) - 1
        while lo < hi - 1:
            mid = (lo + hi) // 2
            if x_source[mid] <= xt:
                lo = mid
            else:
                hi = mid

        if x_source[lo] == xt:
            result.append(y_source[lo])
        elif lo < len(x_source) - 1:
            # Linear interpolation
            x0, x1 = x_source[lo], x_source[hi]
            y0, y1 = y_source[lo], y_source[hi]
            t = (xt - x0) / (x1 - x0) if x1 != x0 else 0.0
            result.append(y0 + t * (y1 - y0))
        else:
            result.append(y_source[lo])

    return result


def _compute_rmse(predicted: list[float], observed: list[float]) -> float:
    """Root Mean Square Error."""
    n = min(len(predicted), len(observed))
    if n == 0:
        return float("nan")
    mse = sum((p - o) ** 2 for p, o in zip(predicted, observed)) / n
    return math.sqrt(mse)


def _compute_mape(predicted: list[float], observed: list[float]) -> float:
    """Mean Absolute Percentage Error (0-100 scale)."""
    n = min(len(predicted), len(observed))
    if n == 0:
        return float("nan")
    errors = []
    for p, o in zip(predicted, observed):
        if abs(o) > 1e-10:
            errors.append(abs(p - o) / abs(o))
    if not errors:
        return float("nan")
    return sum(errors) / len(errors) * 100.0


def _compute_correlation(x: list[float], y: list[float]) -> float:
    """Pearson correlation coefficient."""
    n = min(len(x), len(y))
    if n < 2:
        return float("nan")

    mean_x = sum(x[:n]) / n
    mean_y = sum(y[:n]) / n

    cov = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x, y)) / n
    std_x = math.sqrt(sum((xi - mean_x) ** 2 for xi in x[:n]) / n)
    std_y = math.sqrt(sum((yi - mean_y) ** 2 for yi in y[:n]) / n)

    if std_x < 1e-10 or std_y < 1e-10:
        return float("nan")

    return cov / (std_x * std_y)


_: type[ValidationPort] = ValidationService
