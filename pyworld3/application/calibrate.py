"""Calibration service — derives World3 constants from OWID observed data.

Given a reference year, fetches OWID data for all mapped indicators and
produces calibrated constants. Returns confidence levels and provenance
per constant.

Requires the ``owid`` optional dependency group.
"""

from __future__ import annotations

import logging

from pyworld3.adapters.owid.client import OWIDClient
from pyworld3.adapters.owid.indicators import OWID_INDICATORS
from pyworld3.domain.constants import CONSTANT_CONSTRAINTS, CONSTANT_DEFAULTS
from pyworld3.domain.mappings import get_calibration_mappings

from .ports import (
    CalibratedConstant,
    CalibrationParams,
    CalibrationPort,
    CalibrationResult,
)

logger = logging.getLogger(__name__)


class CalibrationService:
    """Calibrates World3 constants from OWID observed data.

    Parameters
    ----------
    client
        An OWIDClient instance for fetching data. If None, a default
        client is created.
    """

    def __init__(self, client: OWIDClient | None = None) -> None:
        self._client = client or OWIDClient()

    @staticmethod
    def _resolve_mappings(params: CalibrationParams):
        mappings = get_calibration_mappings()
        if params.parameters:
            requested = set(params.parameters)
            mappings = [m for m in mappings if m.world3_param in requested]
        return mappings

    def fetch_indicator_values(
        self, params: CalibrationParams
    ) -> tuple[dict[str, float], list[str]]:
        """Fetch the raw OWID indicator values needed for calibration."""
        mappings = self._resolve_mappings(params)

        indicator_values: dict[str, float] = {}
        fetch_errors: list[str] = []

        needed_indicators: set[str] = set()
        for mapping in mappings:
            needed_indicators.add(mapping.owid_indicator)
            needed_indicators.update(mapping.requires_indicators)

        for indicator_key in needed_indicators:
            indicator = OWID_INDICATORS.get(indicator_key)
            if indicator is None:
                fetch_errors.append(f"Unknown indicator: {indicator_key}")
                continue

            value = self._client.fetch_value(
                indicator.parquet_url,
                indicator.column,
                params.reference_year,
                entity=params.entity,
                entity_column=indicator.entity_column,
                year_column=indicator.year_column,
            )
            if value is not None:
                indicator_values[indicator_key] = value
            else:
                fetch_errors.append(
                    f"No data for {indicator_key} at year={params.reference_year}"
                )

        return indicator_values, fetch_errors

    def calibrate(self, params: CalibrationParams) -> CalibrationResult:
        """Calibrate World3 constants for a reference year.

        Returns a CalibrationResult with calibrated values, confidence
        levels, and any warnings encountered.
        """
        mappings = self._resolve_mappings(params)
        indicator_values, fetch_errors = self.fetch_indicator_values(params)

        # Apply mappings to produce calibrated constants
        constants: dict[str, CalibratedConstant] = {}
        warnings: list[str] = list(fetch_errors)

        for mapping in mappings:
            # Check if we have the primary indicator value
            primary_value = indicator_values.get(mapping.owid_indicator)
            if primary_value is None:
                warnings.append(
                    f"Skipping {mapping.world3_param}: "
                    f"no data for {mapping.owid_indicator}"
                )
                continue

            # Check if we have all required context indicators
            missing_ctx = [
                k for k in mapping.requires_indicators if k not in indicator_values
            ]
            if missing_ctx:
                warnings.append(
                    f"Skipping {mapping.world3_param}: "
                    f"missing context indicators: {', '.join(missing_ctx)}"
                )
                continue

            # Build context dict for transform
            ctx = {k: indicator_values[k] for k in mapping.requires_indicators}

            # Apply transform
            transform = mapping.transform
            if transform is not None:
                calibrated_value = transform(primary_value, ctx)
            else:
                calibrated_value = primary_value

            # Validate against constraints
            constraint = CONSTANT_CONSTRAINTS.get(mapping.world3_param)
            if constraint:
                lo, hi = constraint
                if lo is not None and calibrated_value < lo:
                    warnings.append(
                        f"{mapping.world3_param}: calibrated value "
                        f"{calibrated_value:.4g} below minimum {lo:.4g}, clamping"
                    )
                    calibrated_value = lo
                if hi is not None and calibrated_value > hi:
                    warnings.append(
                        f"{mapping.world3_param}: calibrated value "
                        f"{calibrated_value:.4g} above maximum {hi:.4g}, clamping"
                    )
                    calibrated_value = hi

            default_value = CONSTANT_DEFAULTS.get(mapping.world3_param, 0.0)

            constants[mapping.world3_param] = CalibratedConstant(
                name=mapping.world3_param,
                value=calibrated_value,
                confidence=mapping.confidence.value,
                owid_indicator=mapping.owid_indicator,
                description=mapping.description,
                default_value=default_value,
            )

            logger.info(
                "Calibrated %s = %.4g (default: %.4g, confidence: %s)",
                mapping.world3_param,
                calibrated_value,
                default_value,
                mapping.confidence.value,
            )

        return CalibrationResult(
            reference_year=params.reference_year,
            entity=params.entity,
            constants=constants,
            warnings=warnings,
        )


_: type[CalibrationPort] = CalibrationService
