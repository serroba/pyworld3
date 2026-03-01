"""Tests for the ValidationService (simulation vs OWID observed data)."""

from __future__ import annotations

import math

import pytest

from .conftest import requires_pandas


def _make_mock_sim_result():
    """Create a mock simulation result with linear growth patterns."""
    from pyworld3.application.ports import SimulationResult, TimeSeriesResult

    years = [float(y) for y in range(1900, 2101)]
    pop_values = [
        1.6e9 + (i / 200) * 6.2e9  # Linear growth from 1.6B to 7.8B
        for i in range(len(years))
    ]
    le_values = [
        30.0 + (i / 200) * 45.0  # Linear growth from 30 to 75
        for i in range(len(years))
    ]

    return SimulationResult(
        year_min=1900,
        year_max=2100,
        dt=1.0,
        time=years,
        constants_used={},
        series={
            "pop": TimeSeriesResult(name="pop", values=pop_values),
            "le": TimeSeriesResult(name="le", values=le_values),
            "cbr": TimeSeriesResult(name="cbr", values=[30.0] * len(years)),
            "cdr": TimeSeriesResult(name="cdr", values=[10.0] * len(years)),
        },
    )


def _make_client_with_mock_timeseries(tmp_cache):
    from pyworld3.adapters.owid.client import OWIDClient

    client = OWIDClient(cache_dir=tmp_cache)

    mock_timeseries = {
        "sp_pop_totl": (
            [1960, 1970, 1980, 1990, 2000, 2010, 2020],
            [3.0e9, 3.7e9, 4.4e9, 5.3e9, 6.1e9, 6.9e9, 7.8e9],
        ),
        "sp_dyn_le00_in": (
            [1960, 1970, 1980, 1990, 2000, 2010, 2020],
            [52.6, 58.8, 63.0, 65.4, 67.7, 70.6, 72.7],
        ),
        "sp_dyn_cbrt_in": (
            [1960, 1970, 1980, 1990, 2000, 2010, 2020],
            [34.9, 32.5, 28.3, 26.0, 21.5, 19.4, 17.9],
        ),
        "sp_dyn_cdrt_in": (
            [1960, 1970, 1980, 1990, 2000, 2010, 2020],
            [17.7, 12.4, 10.7, 9.4, 8.7, 7.9, 7.6],
        ),
    }

    def mock_fetch_timeseries(parquet_url, column, **kwargs):
        data = mock_timeseries.get(column)
        if data is None:
            return [], []
        years, values = data
        year_min = kwargs.get("year_min")
        year_max = kwargs.get("year_max")
        filtered = [
            (y, v)
            for y, v in zip(years, values)
            if (year_min is None or y >= year_min)
            and (year_max is None or y <= year_max)
        ]
        if not filtered:
            return [], []
        return (
            [float(y) for y, _ in filtered],
            [float(v) for _, v in filtered],
        )

    client.fetch_timeseries = mock_fetch_timeseries
    return client


@requires_pandas
class TestValidationService:
    def test_validate_returns_metrics(self, tmp_cache):
        from pyworld3.application.ports import ValidationParams
        from pyworld3.application.validate import ValidationService

        client = _make_client_with_mock_timeseries(tmp_cache)
        service = ValidationService(client=client)

        sim_result = _make_mock_sim_result()
        result = service.validate(sim_result, ValidationParams())

        assert "pop" in result.metrics
        assert "le" in result.metrics

    def test_validate_metrics_have_correct_fields(self, tmp_cache):
        from pyworld3.application.ports import ValidationParams
        from pyworld3.application.validate import ValidationService

        client = _make_client_with_mock_timeseries(tmp_cache)
        service = ValidationService(client=client)

        sim_result = _make_mock_sim_result()
        result = service.validate(sim_result, ValidationParams())

        pop_metric = result.metrics["pop"]
        assert pop_metric.variable == "pop"
        assert pop_metric.owid_indicator == "pop_total"
        assert pop_metric.n_points > 0
        assert not math.isnan(pop_metric.rmse)
        assert not math.isnan(pop_metric.correlation)
        assert pop_metric.overlap_years[0] <= pop_metric.overlap_years[1]

    def test_validate_specific_variables(self, tmp_cache):
        from pyworld3.application.ports import ValidationParams
        from pyworld3.application.validate import ValidationService

        client = _make_client_with_mock_timeseries(tmp_cache)
        service = ValidationService(client=client)

        sim_result = _make_mock_sim_result()
        result = service.validate(
            sim_result,
            ValidationParams(variables=["pop"]),
        )

        assert "pop" in result.metrics
        assert "le" not in result.metrics

    def test_validate_warns_on_missing_variable(self, tmp_cache):
        from pyworld3.application.ports import SimulationResult, ValidationParams
        from pyworld3.application.validate import ValidationService

        client = _make_client_with_mock_timeseries(tmp_cache)
        service = ValidationService(client=client)

        # Simulation without the expected output
        sim_result = SimulationResult(
            year_min=1900,
            year_max=2100,
            dt=1.0,
            time=list(range(1900, 2101)),
            constants_used={},
            series={},
        )

        result = service.validate(sim_result, ValidationParams())
        assert len(result.warnings) > 0


class TestNumericalHelpers:
    def test_interpolate_at_exact_points(self):
        from pyworld3.application.validate import _interpolate_at

        result = _interpolate_at(
            [1.0, 2.0, 3.0],
            [10.0, 20.0, 30.0],
            [1.0, 2.0, 3.0],
        )
        assert result == pytest.approx([10.0, 20.0, 30.0])

    def test_interpolate_at_midpoints(self):
        from pyworld3.application.validate import _interpolate_at

        result = _interpolate_at(
            [0.0, 10.0],
            [0.0, 100.0],
            [5.0],
        )
        assert result == pytest.approx([50.0])

    def test_interpolate_at_out_of_range_skipped(self):
        from pyworld3.application.validate import _interpolate_at

        result = _interpolate_at(
            [2.0, 4.0],
            [20.0, 40.0],
            [1.0, 3.0, 5.0],
        )
        # Only 3.0 is in range
        assert len(result) == 1
        assert result[0] == pytest.approx(30.0)

    def test_compute_rmse(self):
        from pyworld3.application.validate import _compute_rmse

        # Perfect match
        assert _compute_rmse([1, 2, 3], [1, 2, 3]) == pytest.approx(0.0)
        # Known RMSE
        assert _compute_rmse([0, 0], [1, 1]) == pytest.approx(1.0)

    def test_compute_mape(self):
        from pyworld3.application.validate import _compute_mape

        # Perfect match
        assert _compute_mape([1, 2, 3], [1, 2, 3]) == pytest.approx(0.0)
        # 100% error
        assert _compute_mape([2, 4, 6], [1, 2, 3]) == pytest.approx(100.0)

    def test_compute_correlation(self):
        from pyworld3.application.validate import _compute_correlation

        # Perfect positive correlation
        assert _compute_correlation([1, 2, 3], [1, 2, 3]) == pytest.approx(1.0)
        # Perfect negative correlation
        assert _compute_correlation([1, 2, 3], [3, 2, 1]) == pytest.approx(-1.0)
