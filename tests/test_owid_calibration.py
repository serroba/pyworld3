"""Tests for the CalibrationService (OWID-backed constant calibration)."""

from __future__ import annotations

import pytest

from .conftest import requires_pandas


@requires_pandas
class TestCalibrationService:
    def _make_client_with_mock_data(self, tmp_cache, reference_year=1970):
        """Create an OWIDClient that returns mock data without HTTP."""
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache)

        mock_values = {
            "sp_pop_totl": 3.7e9,
            "sp_pop_0014_to_zs": 37.1,
            "sp_pop_1564_to_zs": 57.6,
            "sp_pop_65up_to_zs": 5.3,
            "sp_dyn_tfrt_in": 4.74,
            "ny_gdp_mktp_cd": 2.9e12,
            "nv_ind_totl_zs": 38.0,
            "ne_gdi_totl_zs": 25.0,
            "en_atm_co2e_pp_gd": 0.95,
        }

        def mock_fetch_value(parquet_url, column, year, **kwargs):
            return mock_values.get(column)

        client.fetch_value = mock_fetch_value
        return client

    def test_calibrate_population_cohorts(self, tmp_cache):
        from pyworld3.application.calibrate import CalibrationService
        from pyworld3.application.ports import CalibrationParams

        client = self._make_client_with_mock_data(tmp_cache)
        service = CalibrationService(client=client)

        result = service.calibrate(
            CalibrationParams(
                reference_year=1970,
                parameters=["p1i", "p2i", "p3i", "p4i"],
            )
        )

        # p1i = 37.1% of 3.7e9
        assert "p1i" in result.constants
        p1i = result.constants["p1i"].value
        assert p1i == pytest.approx(3.7e9 * 37.1 / 100.0)

        # p4i = 5.3% of 3.7e9
        assert "p4i" in result.constants
        p4i = result.constants["p4i"].value
        assert p4i == pytest.approx(3.7e9 * 5.3 / 100.0)

        # Total should be close to 3.7e9
        total = sum(result.constants[p].value for p in ["p1i", "p2i", "p3i", "p4i"])
        assert total == pytest.approx(3.7e9, rel=0.01)

    def test_calibrate_fertility(self, tmp_cache):
        from pyworld3.application.calibrate import CalibrationService
        from pyworld3.application.ports import CalibrationParams

        client = self._make_client_with_mock_data(tmp_cache)
        service = CalibrationService(client=client)

        result = service.calibrate(
            CalibrationParams(
                reference_year=1970,
                parameters=["dcfsn"],
            )
        )

        assert "dcfsn" in result.constants
        assert result.constants["dcfsn"].value == pytest.approx(4.74)

    def test_calibrate_returns_provenance(self, tmp_cache):
        from pyworld3.application.calibrate import CalibrationService
        from pyworld3.application.ports import CalibrationParams

        client = self._make_client_with_mock_data(tmp_cache)
        service = CalibrationService(client=client)

        result = service.calibrate(
            CalibrationParams(reference_year=1970, parameters=["p1i"])
        )

        cc = result.constants["p1i"]
        assert cc.confidence == "high"
        assert cc.owid_indicator == "pop_0_14"
        assert cc.default_value == 65e7
        assert cc.description != ""

    def test_calibrate_to_constants_dict(self, tmp_cache):
        from pyworld3.application.calibrate import CalibrationService
        from pyworld3.application.ports import CalibrationParams

        client = self._make_client_with_mock_data(tmp_cache)
        service = CalibrationService(client=client)

        result = service.calibrate(CalibrationParams(reference_year=1970))
        constants_dict = result.to_constants_dict()

        assert isinstance(constants_dict, dict)
        assert all(isinstance(v, float) for v in constants_dict.values())

    def test_calibrate_warns_on_missing_data(self, tmp_cache):
        from pyworld3.adapters.owid.client import OWIDClient
        from pyworld3.application.calibrate import CalibrationService
        from pyworld3.application.ports import CalibrationParams

        client = OWIDClient(cache_dir=tmp_cache)
        # All fetches return None
        client.fetch_value = lambda *args, **kwargs: None

        service = CalibrationService(client=client)
        result = service.calibrate(CalibrationParams(reference_year=1970))

        assert len(result.warnings) > 0
        assert len(result.constants) == 0
