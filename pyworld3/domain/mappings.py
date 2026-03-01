"""Declarative mapping definitions between OWID indicators and World3 parameters.

Each ``IndicatorMapping`` connects an OWID data source to a World3
constant (for calibration) or output variable (for validation), along
with a transform function and confidence metadata.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from enum import Enum


class MappingType(Enum):
    """Whether a mapping is used for calibration or validation."""

    CALIBRATION = "calibration"
    VALIDATION = "validation"


class Confidence(Enum):
    """Subjective confidence in the OWID-to-World3 mapping."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass(frozen=True)
class IndicatorMapping:
    """A single OWID indicator -> World3 parameter mapping.

    Parameters
    ----------
    owid_indicator
        Key in ``OWID_INDICATORS`` registry.
    world3_param
        World3 constant name (calibration) or output variable (validation).
    mapping_type
        Whether this is used for calibration or validation.
    confidence
        Subjective confidence in the mapping quality.
    sector
        World3 sector this belongs to.
    description
        Human-readable explanation of the mapping.
    transform
        Optional callable ``(owid_value: float, context: dict) -> float``
        that converts from OWID units to World3 units.
        If None, the value is used as-is.
    requires_indicators
        Additional OWID indicator keys needed by the transform function.
    """

    owid_indicator: str
    world3_param: str
    mapping_type: MappingType
    confidence: Confidence
    sector: str
    description: str
    transform: Callable[[float, dict[str, float]], float] | None = None
    requires_indicators: tuple[str, ...] = field(default_factory=tuple)


# ---------------------------------------------------------------------------
# Transform functions
# ---------------------------------------------------------------------------


def _identity(value: float, _ctx: dict[str, float]) -> float:
    """Pass-through (OWID and World3 units match)."""
    return value


def _population_cohort_0_14(value: float, ctx: dict[str, float]) -> float:
    """Derive p1i: population 0-14 from percentage x total population."""
    total_pop = ctx.get("pop_total", 0.0)
    return total_pop * value / 100.0


def _population_cohort_15_44(value: float, ctx: dict[str, float]) -> float:
    """Derive p2i: approximate 15-44 cohort.

    OWID gives 15-64; we estimate 15-44 as roughly 60% of 15-64 based on
    typical age distributions.
    """
    total_pop = ctx.get("pop_total", 0.0)
    pct_15_64 = value  # this is the 15-64 percentage
    # Approximate: 15-44 is about 60% of the 15-64 cohort
    return total_pop * pct_15_64 / 100.0 * 0.6


def _population_cohort_45_64(value: float, ctx: dict[str, float]) -> float:
    """Derive p3i: approximate 45-64 cohort.

    OWID gives 15-64; 45-64 is the remaining ~40%.
    """
    total_pop = ctx.get("pop_total", 0.0)
    pct_15_64 = value
    return total_pop * pct_15_64 / 100.0 * 0.4


def _population_cohort_65_plus(value: float, ctx: dict[str, float]) -> float:
    """Derive p4i: population 65+ from percentage x total population."""
    total_pop = ctx.get("pop_total", 0.0)
    return total_pop * value / 100.0


def _fertility_to_dcfsn(value: float, _ctx: dict[str, float]) -> float:
    """Use total fertility rate as a proxy for desired completed family size.

    TFR is a reasonable proxy for desired family size, though it reflects
    actual rather than desired fertility.
    """
    return value


def _gdp_to_industrial_capital(value: float, ctx: dict[str, float]) -> float:
    """Estimate initial industrial capital from GDP.

    World3 ``ici`` is in 1968 dollars. We:
    1. Multiply GDP by industry share (% of GDP)
    2. Deflate from current USD to 1968 USD (~7.5x deflation from 2015$,
       roughly 15x from current)

    This is an imperfect proxy — World3 "industrial output" excludes services.
    """
    industry_pct = ctx.get("industry_value_added_pct", 30.0)
    # Rough deflator: current USD -> 1968 USD
    # GDP deflator 2020 ≈ 115 (base 2015=100), 1968 ≈ 15 (base 2015=100)
    # So factor ≈ 115/15 ≈ 7.7
    deflator_ratio = 7.7
    industrial_gdp = value * industry_pct / 100.0
    return industrial_gdp / deflator_ratio


def _gdp_to_io70(value: float, ctx: dict[str, float]) -> float:
    """Estimate 1970 industrial output from 1970 GDP.

    Same deflation logic as _gdp_to_industrial_capital.
    """
    industry_pct = ctx.get(
        "industry_value_added_pct", 38.0
    )  # 1970 industry share was higher
    deflator_ratio = 7.7
    return value * industry_pct / 100.0 / deflator_ratio


def _capital_formation_to_icor(value: float, _ctx: dict[str, float]) -> float:
    """Estimate capital-output ratio from gross capital formation (% of GDP).

    K/Y ≈ investment-to-GDP ratio x avg capital lifetime.
    A rough approximation: ICOR ≈ investment_rate / growth_rate.
    We use a simplified version: ICOR ≈ GCF% x typical_lifetime / 100.
    For typical GCF ~25% and lifetime ~14yr => ICOR ≈ 3.5.
    """
    # Simplified: ICOR ≈ GCF% / 100 x 14 (avg lifetime from alic1 default)
    return value / 100.0 * 14.0


def _co2_to_imef(value: float, _ctx: dict[str, float]) -> float:
    """Use CO2 intensity (kg/$GDP) as proxy for industrial emission factor.

    The mapping is qualitative — World3's imef is dimensionless while
    CO2/GDP is in kg/$. We normalize relative to a reference value.
    """
    # Reference: 1970 CO2 intensity was ~1.0 kg/$ (rough estimate)
    # World3 default imef = 0.1
    reference_co2_intensity = 1.0
    return 0.1 * (value / reference_co2_intensity)


# ---------------------------------------------------------------------------
# Mapping registry
# ---------------------------------------------------------------------------

INDICATOR_MAPPINGS: list[IndicatorMapping] = [
    # ── Population sector — calibration ────────────────────────────────
    IndicatorMapping(
        owid_indicator="pop_0_14",
        world3_param="p1i",
        mapping_type=MappingType.CALIBRATION,
        confidence=Confidence.HIGH,
        sector="Population",
        description="Initial population 0-14: OWID percentage x total population",
        transform=_population_cohort_0_14,
        requires_indicators=("pop_total",),
    ),
    IndicatorMapping(
        owid_indicator="pop_15_64",
        world3_param="p2i",
        mapping_type=MappingType.CALIBRATION,
        confidence=Confidence.MEDIUM,
        sector="Population",
        description="Initial population 15-44: ~60% of 15-64 cohort",
        transform=_population_cohort_15_44,
        requires_indicators=("pop_total",),
    ),
    IndicatorMapping(
        owid_indicator="pop_15_64",
        world3_param="p3i",
        mapping_type=MappingType.CALIBRATION,
        confidence=Confidence.MEDIUM,
        sector="Population",
        description="Initial population 45-64: ~40% of 15-64 cohort",
        transform=_population_cohort_45_64,
        requires_indicators=("pop_total",),
    ),
    IndicatorMapping(
        owid_indicator="pop_65_up",
        world3_param="p4i",
        mapping_type=MappingType.CALIBRATION,
        confidence=Confidence.HIGH,
        sector="Population",
        description="Initial population 65+: OWID percentage x total population",
        transform=_population_cohort_65_plus,
        requires_indicators=("pop_total",),
    ),
    IndicatorMapping(
        owid_indicator="fertility_rate",
        world3_param="dcfsn",
        mapping_type=MappingType.CALIBRATION,
        confidence=Confidence.MEDIUM,
        sector="Population",
        description="Desired family size: TFR as proxy",
        transform=_fertility_to_dcfsn,
    ),
    # ── Population sector — validation ─────────────────────────────────
    IndicatorMapping(
        owid_indicator="pop_total",
        world3_param="pop",
        mapping_type=MappingType.VALIDATION,
        confidence=Confidence.HIGH,
        sector="Population",
        description="Total population: direct comparison",
        transform=_identity,
    ),
    IndicatorMapping(
        owid_indicator="life_expectancy",
        world3_param="le",
        mapping_type=MappingType.VALIDATION,
        confidence=Confidence.HIGH,
        sector="Population",
        description="Life expectancy: direct comparison",
        transform=_identity,
    ),
    IndicatorMapping(
        owid_indicator="crude_birth_rate",
        world3_param="cbr",
        mapping_type=MappingType.VALIDATION,
        confidence=Confidence.HIGH,
        sector="Population",
        description="Crude birth rate: direct comparison (per 1000)",
        transform=_identity,
    ),
    IndicatorMapping(
        owid_indicator="crude_death_rate",
        world3_param="cdr",
        mapping_type=MappingType.VALIDATION,
        confidence=Confidence.HIGH,
        sector="Population",
        description="Crude death rate: direct comparison (per 1000)",
        transform=_identity,
    ),
    # ── Capital sector — calibration ───────────────────────────────────
    IndicatorMapping(
        owid_indicator="gdp_current",
        world3_param="ici",
        mapping_type=MappingType.CALIBRATION,
        confidence=Confidence.MEDIUM,
        sector="Capital",
        description="Industrial capital: GDP x industry share, deflated to 1968$",
        transform=_gdp_to_industrial_capital,
        requires_indicators=("industry_value_added_pct",),
    ),
    IndicatorMapping(
        owid_indicator="gdp_current",
        world3_param="io70",
        mapping_type=MappingType.CALIBRATION,
        confidence=Confidence.MEDIUM,
        sector="Capital",
        description="1970 industrial output from 1970 GDP",
        transform=_gdp_to_io70,
        requires_indicators=("industry_value_added_pct",),
    ),
    IndicatorMapping(
        owid_indicator="gross_capital_formation_pct",
        world3_param="icor1",
        mapping_type=MappingType.CALIBRATION,
        confidence=Confidence.MEDIUM,
        sector="Capital",
        description="Capital-output ratio from investment/GDP ratio",
        transform=_capital_formation_to_icor,
    ),
    # ── Capital sector — validation ────────────────────────────────────
    IndicatorMapping(
        owid_indicator="gdp_per_capita",
        world3_param="iopc",
        mapping_type=MappingType.VALIDATION,
        confidence=Confidence.MEDIUM,
        sector="Capital",
        description="Industrial output/cap: GDP/cap as upper-bound proxy",
        transform=_identity,
    ),
    # ── Pollution sector — calibration ─────────────────────────────────
    IndicatorMapping(
        owid_indicator="co2_per_gdp",
        world3_param="imef",
        mapping_type=MappingType.CALIBRATION,
        confidence=Confidence.LOW,
        sector="Pollution",
        description="Industrial emission factor from CO2 intensity",
        transform=_co2_to_imef,
    ),
]


def get_calibration_mappings() -> list[IndicatorMapping]:
    """Return only mappings used for calibration."""
    return [m for m in INDICATOR_MAPPINGS if m.mapping_type == MappingType.CALIBRATION]


def get_validation_mappings() -> list[IndicatorMapping]:
    """Return only mappings used for validation."""
    return [m for m in INDICATOR_MAPPINGS if m.mapping_type == MappingType.VALIDATION]


def get_mappings_by_sector(sector: str) -> list[IndicatorMapping]:
    """Return mappings for a given sector."""
    return [m for m in INDICATOR_MAPPINGS if m.sector == sector]


def get_mapping_for_param(param: str) -> IndicatorMapping | None:
    """Return the first calibration mapping for a World3 parameter."""
    for m in INDICATOR_MAPPINGS:
        if m.world3_param == param and m.mapping_type == MappingType.CALIBRATION:
            return m
    return None
