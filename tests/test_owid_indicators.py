"""Tests for the OWID indicator registry and mapping consistency."""

from __future__ import annotations

import pytest


class TestIndicatorRegistry:
    def test_all_indicators_have_required_fields(self):
        from pyworld3.adapters.owid.indicators import OWID_INDICATORS

        for key, indicator in OWID_INDICATORS.items():
            assert indicator.name == key
            assert indicator.parquet_url.startswith("https://")
            assert indicator.column != ""
            assert indicator.sector != ""

    def test_key_indicators_present(self):
        from pyworld3.adapters.owid.indicators import OWID_INDICATORS

        required = [
            "pop_total",
            "life_expectancy",
            "crude_birth_rate",
            "crude_death_rate",
            "fertility_rate",
            "gdp_current",
            "gdp_per_capita",
        ]
        for key in required:
            assert key in OWID_INDICATORS, f"Missing indicator: {key}"

    def test_indicator_count(self):
        from pyworld3.adapters.owid.indicators import OWID_INDICATORS

        assert len(OWID_INDICATORS) == 18

    def test_indicators_cover_all_sectors(self):
        from pyworld3.adapters.owid.indicators import OWID_INDICATORS

        sectors = {ind.sector for ind in OWID_INDICATORS.values()}
        assert "Population" in sectors
        assert "Capital" in sectors
        assert "Energy" in sectors
        assert "Resources" in sectors
        assert "Pollution" in sectors

    def test_indicator_defaults(self):
        """OWIDIndicator defaults for entity_column and year_column."""
        from pyworld3.adapters.owid.indicators import OWIDIndicator

        ind = OWIDIndicator(
            name="test",
            description="test",
            parquet_url="https://example.com/test.parquet",
            column="col",
        )
        assert ind.entity_column == "country"
        assert ind.year_column == "year"
        assert ind.unit == ""
        assert ind.sector == ""

    def test_indicator_is_frozen(self):
        """OWIDIndicator instances are immutable."""
        from pyworld3.adapters.owid.indicators import OWID_INDICATORS

        ind = OWID_INDICATORS["pop_total"]
        with pytest.raises(AttributeError):
            ind.name = "changed"

    def test_parquet_urls_end_with_parquet(self):
        from pyworld3.adapters.owid.indicators import OWID_INDICATORS

        for key, ind in OWID_INDICATORS.items():
            assert ind.parquet_url.endswith(".parquet"), (
                f"Indicator {key} URL doesn't end with .parquet: {ind.parquet_url}"
            )

    def test_wdi_indicators_share_same_url(self):
        """All WDI-based indicators point to the same parquet file."""
        from pyworld3.adapters.owid.indicators import OWID_INDICATORS

        wdi_indicators = [
            ind
            for ind in OWID_INDICATORS.values()
            if ind.sector in ("Population", "Capital", "Pollution")
            and "energy" not in ind.parquet_url
            and "minerals" not in ind.parquet_url
        ]
        urls = {ind.parquet_url for ind in wdi_indicators}
        assert len(urls) == 1, f"Expected 1 WDI URL, got {urls}"

    def test_package_exports(self):
        """The owid __init__ re-exports key symbols."""
        from pyworld3.adapters.owid import OWID_INDICATORS, OWIDClient, OWIDIndicator

        assert OWIDClient is not None
        assert OWIDIndicator is not None
        assert isinstance(OWID_INDICATORS, dict)


class TestMappingRegistry:
    def test_calibration_mappings_exist(self):
        from pyworld3.domain.mappings import get_calibration_mappings

        mappings = get_calibration_mappings()
        assert len(mappings) > 0
        params = {m.world3_param for m in mappings}
        assert "p1i" in params
        assert "p4i" in params
        assert "dcfsn" in params

    def test_validation_mappings_exist(self):
        from pyworld3.domain.mappings import get_validation_mappings

        mappings = get_validation_mappings()
        assert len(mappings) > 0
        params = {m.world3_param for m in mappings}
        assert "pop" in params
        assert "le" in params
        assert "cbr" in params
        assert "cdr" in params

    def test_all_mappings_reference_valid_indicators(self):
        from pyworld3.adapters.owid.indicators import OWID_INDICATORS
        from pyworld3.domain.mappings import INDICATOR_MAPPINGS

        for mapping in INDICATOR_MAPPINGS:
            assert mapping.owid_indicator in OWID_INDICATORS, (
                f"Mapping {mapping.world3_param} references unknown "
                f"indicator {mapping.owid_indicator}"
            )

    def test_calibration_mappings_reference_valid_constants(self):
        from pyworld3.domain.constants import CONSTANT_DEFAULTS
        from pyworld3.domain.mappings import get_calibration_mappings

        for mapping in get_calibration_mappings():
            assert mapping.world3_param in CONSTANT_DEFAULTS, (
                f"Calibration mapping references unknown constant "
                f"{mapping.world3_param}"
            )

    def test_validation_mappings_reference_valid_variables(self):
        from pyworld3.domain.constants import VARIABLE_META
        from pyworld3.domain.mappings import get_validation_mappings

        for mapping in get_validation_mappings():
            assert mapping.world3_param in VARIABLE_META, (
                f"Validation mapping references unknown variable {mapping.world3_param}"
            )

    def test_get_mapping_for_param(self):
        from pyworld3.domain.mappings import get_mapping_for_param

        mapping = get_mapping_for_param("p1i")
        assert mapping is not None
        assert mapping.world3_param == "p1i"

        assert get_mapping_for_param("nonexistent") is None
