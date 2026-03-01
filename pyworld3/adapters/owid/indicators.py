"""Registry of OWID parquet URLs, columns, and metadata.

Each indicator maps to a specific parquet file in the OWID catalog,
along with the column name and any filtering/transform notes.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class OWIDIndicator:
    """A single OWID data indicator with its parquet source."""

    name: str
    description: str
    parquet_url: str
    column: str
    entity_column: str = "country"
    year_column: str = "year"
    unit: str = ""
    sector: str = ""


# ---------------------------------------------------------------------------
# World Development Indicators (WDI) — World Bank via OWID
# ---------------------------------------------------------------------------

_WDI_BASE = (
    "https://catalog.ourworldindata.org/garden/wb/2024-10-07"
    "/world_development_indicators"
)

_WDI_PARQUET = f"{_WDI_BASE}/world_development_indicators.parquet"

# ---------------------------------------------------------------------------
# Energy — OWID energy dataset
# ---------------------------------------------------------------------------

_ENERGY_BASE = "https://catalog.ourworldindata.org/garden/energy/2024-11-20/energy_mix"
_ENERGY_PARQUET = f"{_ENERGY_BASE}/energy_mix.parquet"

# ---------------------------------------------------------------------------
# Minerals — OWID minerals dataset
# ---------------------------------------------------------------------------

_MINERALS_BASE = (
    "https://catalog.ourworldindata.org/grapher/minerals/2025-12-15/minerals"
)
_MINERALS_PARQUET = f"{_MINERALS_BASE}/minerals.parquet"


# ---------------------------------------------------------------------------
# Indicator registry
# ---------------------------------------------------------------------------

OWID_INDICATORS: dict[str, OWIDIndicator] = {
    # ── Population sector ──────────────────────────────────────────────
    "pop_total": OWIDIndicator(
        name="pop_total",
        description="Total population (World Bank)",
        parquet_url=_WDI_PARQUET,
        column="sp_pop_totl",
        unit="people",
        sector="Population",
    ),
    "life_expectancy": OWIDIndicator(
        name="life_expectancy",
        description="Life expectancy at birth (World Bank)",
        parquet_url=_WDI_PARQUET,
        column="sp_dyn_le00_in",
        unit="years",
        sector="Population",
    ),
    "crude_birth_rate": OWIDIndicator(
        name="crude_birth_rate",
        description="Crude birth rate per 1000 (World Bank)",
        parquet_url=_WDI_PARQUET,
        column="sp_dyn_cbrt_in",
        unit="births/1000/yr",
        sector="Population",
    ),
    "crude_death_rate": OWIDIndicator(
        name="crude_death_rate",
        description="Crude death rate per 1000 (World Bank)",
        parquet_url=_WDI_PARQUET,
        column="sp_dyn_cdrt_in",
        unit="deaths/1000/yr",
        sector="Population",
    ),
    "fertility_rate": OWIDIndicator(
        name="fertility_rate",
        description="Total fertility rate (World Bank)",
        parquet_url=_WDI_PARQUET,
        column="sp_dyn_tfrt_in",
        unit="children/woman",
        sector="Population",
    ),
    "pop_0_14": OWIDIndicator(
        name="pop_0_14",
        description="Population ages 0-14 (World Bank)",
        parquet_url=_WDI_PARQUET,
        column="sp_pop_0014_to_zs",
        unit="% of total",
        sector="Population",
    ),
    "pop_15_64": OWIDIndicator(
        name="pop_15_64",
        description="Population ages 15-64 (World Bank)",
        parquet_url=_WDI_PARQUET,
        column="sp_pop_1564_to_zs",
        unit="% of total",
        sector="Population",
    ),
    "pop_65_up": OWIDIndicator(
        name="pop_65_up",
        description="Population ages 65+ (World Bank)",
        parquet_url=_WDI_PARQUET,
        column="sp_pop_65up_to_zs",
        unit="% of total",
        sector="Population",
    ),
    # ── Capital / GDP sector ───────────────────────────────────────────
    "gdp_current": OWIDIndicator(
        name="gdp_current",
        description="GDP current US$ (World Bank)",
        parquet_url=_WDI_PARQUET,
        column="ny_gdp_mktp_cd",
        unit="US$",
        sector="Capital",
    ),
    "gdp_per_capita": OWIDIndicator(
        name="gdp_per_capita",
        description="GDP per capita current US$ (World Bank)",
        parquet_url=_WDI_PARQUET,
        column="ny_gdp_pcap_cd",
        unit="US$/person",
        sector="Capital",
    ),
    "gross_capital_formation_pct": OWIDIndicator(
        name="gross_capital_formation_pct",
        description="Gross capital formation (% of GDP)",
        parquet_url=_WDI_PARQUET,
        column="ne_gdi_totl_zs",
        unit="% of GDP",
        sector="Capital",
    ),
    "industry_value_added_pct": OWIDIndicator(
        name="industry_value_added_pct",
        description="Industry value added (% of GDP)",
        parquet_url=_WDI_PARQUET,
        column="nv_ind_totl_zs",
        unit="% of GDP",
        sector="Capital",
    ),
    "gdp_deflator": OWIDIndicator(
        name="gdp_deflator",
        description="GDP deflator (base year varies)",
        parquet_url=_WDI_PARQUET,
        column="ny_gdp_defl_zs",
        unit="index",
        sector="Capital",
    ),
    # ── Energy sector ──────────────────────────────────────────────────
    "primary_energy_per_capita": OWIDIndicator(
        name="primary_energy_per_capita",
        description="Primary energy consumption per capita",
        parquet_url=_ENERGY_PARQUET,
        column="primary_energy_per_capita__kwh",
        unit="kWh/person",
        sector="Energy",
    ),
    "fossil_fuel_pct": OWIDIndicator(
        name="fossil_fuel_pct",
        description="Fossil fuels share of primary energy",
        parquet_url=_ENERGY_PARQUET,
        column="fossil_fuels__pct_equivalent_primary_energy",
        unit="%",
        sector="Energy",
    ),
    "renewables_pct": OWIDIndicator(
        name="renewables_pct",
        description="Renewables share of primary energy",
        parquet_url=_ENERGY_PARQUET,
        column="renewables__pct_equivalent_primary_energy",
        unit="%",
        sector="Energy",
    ),
    # ── Resources / Mining sector ──────────────────────────────────────
    "minerals": OWIDIndicator(
        name="minerals",
        description="Minerals reserves and production data",
        parquet_url=_MINERALS_PARQUET,
        column="reserves",
        entity_column="country",
        unit="various",
        sector="Resources",
    ),
    # ── Pollution sector ───────────────────────────────────────────────
    "co2_per_gdp": OWIDIndicator(
        name="co2_per_gdp",
        description="CO2 emissions per unit GDP (kg per PPP $ of GDP)",
        parquet_url=_WDI_PARQUET,
        column="en_atm_co2e_pp_gd",
        unit="kg/$",
        sector="Pollution",
    ),
}
