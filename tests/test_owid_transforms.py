"""Tests for OWID -> World3 transform functions, including error paths."""

from __future__ import annotations

import pytest


class TestTransformHappyPaths:
    def test_population_cohort_0_14(self):
        from pyworld3.domain.mappings import _population_cohort_0_14

        result = _population_cohort_0_14(37.1, {"pop_total": 3.7e9})
        assert result == pytest.approx(3.7e9 * 37.1 / 100.0)

    def test_population_cohort_65_plus(self):
        from pyworld3.domain.mappings import _population_cohort_65_plus

        result = _population_cohort_65_plus(5.3, {"pop_total": 3.7e9})
        assert result == pytest.approx(3.7e9 * 5.3 / 100.0)

    def test_fertility_to_dcfsn(self):
        from pyworld3.domain.mappings import _fertility_to_dcfsn

        assert _fertility_to_dcfsn(4.74, {}) == pytest.approx(4.74)

    def test_gdp_to_industrial_capital(self):
        from pyworld3.domain.mappings import _gdp_to_industrial_capital

        result = _gdp_to_industrial_capital(2.9e12, {"industry_value_added_pct": 38.0})
        expected = 2.9e12 * 38.0 / 100.0 / 7.7
        assert result == pytest.approx(expected)

    def test_capital_formation_to_icor(self):
        from pyworld3.domain.mappings import _capital_formation_to_icor

        result = _capital_formation_to_icor(25.0, {})
        assert result == pytest.approx(25.0 / 100.0 * 14.0)


class TestTransformEdgeCases:
    """Edge cases and boundary conditions for transform functions."""

    def test_population_cohort_with_missing_pop_total(self):
        """When pop_total is missing from context, defaults to 0."""
        from pyworld3.domain.mappings import _population_cohort_0_14

        result = _population_cohort_0_14(37.1, {})
        assert result == pytest.approx(0.0)

    def test_population_cohort_with_zero_population(self):
        from pyworld3.domain.mappings import _population_cohort_0_14

        result = _population_cohort_0_14(37.1, {"pop_total": 0.0})
        assert result == pytest.approx(0.0)

    def test_population_cohort_with_zero_percentage(self):
        from pyworld3.domain.mappings import _population_cohort_0_14

        result = _population_cohort_0_14(0.0, {"pop_total": 3.7e9})
        assert result == pytest.approx(0.0)

    def test_population_cohort_100_percent(self):
        """100% of population should return the total."""
        from pyworld3.domain.mappings import _population_cohort_0_14

        result = _population_cohort_0_14(100.0, {"pop_total": 3.7e9})
        assert result == pytest.approx(3.7e9)

    def test_population_cohort_65_with_missing_pop_total(self):
        from pyworld3.domain.mappings import _population_cohort_65_plus

        result = _population_cohort_65_plus(5.3, {})
        assert result == pytest.approx(0.0)

    def test_population_cohort_15_44_with_missing_pop(self):
        from pyworld3.domain.mappings import _population_cohort_15_44

        result = _population_cohort_15_44(57.6, {})
        assert result == pytest.approx(0.0)

    def test_population_cohort_45_64_with_missing_pop(self):
        from pyworld3.domain.mappings import _population_cohort_45_64

        result = _population_cohort_45_64(57.6, {})
        assert result == pytest.approx(0.0)

    def test_fertility_to_dcfsn_zero(self):
        from pyworld3.domain.mappings import _fertility_to_dcfsn

        assert _fertility_to_dcfsn(0.0, {}) == pytest.approx(0.0)

    def test_gdp_to_industrial_capital_uses_default_industry_pct(self):
        """When industry_value_added_pct is missing, uses default of 30%."""
        from pyworld3.domain.mappings import _gdp_to_industrial_capital

        result = _gdp_to_industrial_capital(1e12, {})
        expected = 1e12 * 30.0 / 100.0 / 7.7
        assert result == pytest.approx(expected)

    def test_gdp_to_industrial_capital_zero_gdp(self):
        from pyworld3.domain.mappings import _gdp_to_industrial_capital

        result = _gdp_to_industrial_capital(0.0, {"industry_value_added_pct": 38.0})
        assert result == pytest.approx(0.0)

    def test_capital_formation_to_icor_zero(self):
        from pyworld3.domain.mappings import _capital_formation_to_icor

        result = _capital_formation_to_icor(0.0, {})
        assert result == pytest.approx(0.0)

    def test_capital_formation_to_icor_high_rate(self):
        """100% capital formation rate -> ICOR = 14."""
        from pyworld3.domain.mappings import _capital_formation_to_icor

        result = _capital_formation_to_icor(100.0, {})
        assert result == pytest.approx(14.0)


class TestTransformCohortConsistency:
    """Verify that population cohorts sum correctly."""

    def test_cohorts_sum_to_total_population(self):
        """p1 + p2 + p3 + p4 should approximate total population."""
        from pyworld3.domain.mappings import (
            _population_cohort_0_14,
            _population_cohort_15_44,
            _population_cohort_45_64,
            _population_cohort_65_plus,
        )

        total_pop = 7.8e9
        ctx = {"pop_total": total_pop}

        # Typical 2020 distribution
        p1 = _population_cohort_0_14(25.4, ctx)
        p2 = _population_cohort_15_44(65.2, ctx)  # 60% of 15-64
        p3 = _population_cohort_45_64(65.2, ctx)  # 40% of 15-64
        p4 = _population_cohort_65_plus(9.4, ctx)

        # p2 + p3 = 100% of 15-64 cohort, so total = 0-14 + 15-64 + 65+
        total = p1 + p4 + (p2 + p3)
        expected = total_pop * (25.4 + 65.2 + 9.4) / 100.0
        assert total == pytest.approx(expected)
