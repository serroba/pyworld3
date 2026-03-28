from unittest.mock import patch

from fastapi.testclient import TestClient

from pyworld3.adapters.api import app
from pyworld3.adapters.schemas import ScenarioFile, list_presets
from pyworld3.domain.constants import CONSTANT_DEFAULTS, DEFAULT_OUTPUT_VARIABLES

client = TestClient(app)


def test_simulate_default():
    resp = client.post("/simulate", json={})
    assert resp.status_code == 200
    data = resp.json()
    assert data["year_min"] == 1900
    assert data["year_max"] == 2100
    assert "time" in data
    assert "series" in data
    assert len(data["series"]) == len(DEFAULT_OUTPUT_VARIABLES)


def test_simulate_with_constants():
    resp = client.post("/simulate", json={"constants": {"nri": 2e12}})
    assert resp.status_code == 200
    data = resp.json()
    assert data["constants_used"]["nri"] == 2e12


def test_simulate_with_output_variables():
    resp = client.post("/simulate", json={"output_variables": ["pop", "nr"]})
    assert resp.status_code == 200
    data = resp.json()
    assert set(data["series"].keys()) == {"pop", "nr"}


def test_simulate_unknown_constant():
    resp = client.post("/simulate", json={"constants": {"bad_param": 1}})
    assert resp.status_code == 422
    assert "Unknown constants" in resp.json()["detail"]


def test_simulate_unknown_variable():
    resp = client.post("/simulate", json={"output_variables": ["bad_var"]})
    assert resp.status_code == 422
    assert "Unknown output variables" in resp.json()["detail"]


def test_get_constants():
    resp = client.get("/constants")
    assert resp.status_code == 200
    data = resp.json()
    assert data == {k: v for k, v in CONSTANT_DEFAULTS.items()}
    assert len(data) == 65


def test_get_variables():
    resp = client.get("/variables")
    assert resp.status_code == 200
    data = resp.json()
    assert data == DEFAULT_OUTPUT_VARIABLES


def test_simulate_no_body():
    resp = client.post("/simulate")
    assert resp.status_code == 200
    data = resp.json()
    assert "series" in data


# --- Validation tests ---


def test_simulate_negative_constant():
    resp = client.post("/simulate", json={"constants": {"nri": -1}})
    assert resp.status_code == 422
    assert "nri" in resp.json()["detail"]


def test_simulate_pyear_outside_range():
    resp = client.post("/simulate", json={"pyear": 2200})
    # Pydantic validation returns 422 via FastAPI's request validation
    assert resp.status_code == 422


def test_simulate_iphst_outside_range():
    resp = client.post("/simulate", json={"iphst": 1800})
    assert resp.status_code == 422


def test_simulate_excessive_steps():
    resp = client.post("/simulate", json={"dt": 0.001})
    assert resp.status_code == 422


def test_simulate_year_min_out_of_bounds():
    resp = client.post("/simulate", json={"year_min": 1000})
    assert resp.status_code == 422


def test_simulate_year_max_out_of_bounds():
    resp = client.post("/simulate", json={"year_max": 3000})
    assert resp.status_code == 422


def test_simulate_internal_error_no_leak():
    """Unexpected errors should return generic 500, not leak internals."""
    resp = client.post("/simulate", json={"constants": {"bad_param": 1}})
    assert resp.status_code == 422
    # The detail should be our validation message, not a stack trace
    assert "Unknown constants" in resp.json()["detail"]


# --- Preset endpoints ---


def test_get_presets():
    resp = client.get("/presets")
    assert resp.status_code == 200
    data = resp.json()
    names = [p["name"] for p in data]
    assert len(data) == len(list_presets())
    assert "standard-run" in names
    assert "doubled-resources" in names
    for p in data:
        assert "description" in p
        assert "constants" in p


def test_simulate_preset():
    resp = client.post("/simulate/preset/standard-run")
    assert resp.status_code == 200
    data = resp.json()
    assert "series" in data
    assert data["year_min"] == 1900


def test_simulate_preset_with_overrides():
    resp = client.post(
        "/simulate/preset/standard-run",
        json={"constants": {"nri": 2e12}},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["constants_used"]["nri"] == 2e12


def test_simulate_unknown_preset():
    resp = client.post("/simulate/preset/does-not-exist")
    assert resp.status_code == 404
    assert "Unknown preset" in resp.json()["detail"]


# --- Compare endpoint ---


def test_compare_two_presets():
    resp = client.post(
        "/compare",
        json={
            "scenario_a": {"preset": "standard-run"},
            "scenario_b": {"preset": "doubled-resources"},
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["scenario_a"] == "Standard Run"
    assert data["scenario_b"] == "Doubled Resources"
    assert "results_a" in data
    assert "results_b" in data
    assert len(data["metrics"]) > 0
    metric_vars = [m["variable"] for m in data["metrics"]]
    assert "pop" in metric_vars


def test_compare_single_preset_vs_defaults():
    resp = client.post(
        "/compare",
        json={"scenario_a": {"preset": "doubled-resources"}},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["scenario_b"] == "Standard Run"
    assert len(data["metrics"]) > 0


def test_compare_inline_requests():
    resp = client.post(
        "/compare",
        json={
            "scenario_a": {"request": {"constants": {"nri": 2e12}}},
            "scenario_b": {"request": {}},
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["scenario_a"] == "Custom"
    assert data["results_a"]["constants_used"]["nri"] == 2e12


def test_compare_must_specify_scenario_a():
    resp = client.post("/compare", json={})
    assert resp.status_code == 422


# --- Metadata endpoints ---


def test_constant_metadata_endpoint():
    resp = client.get("/metadata/constants")
    assert resp.status_code == 200
    data = resp.json()
    assert "nri" in data
    assert data["nri"]["full_name"] == "Initial nonrenewable resources"
    assert data["nri"]["unit"] == "resource units"
    assert data["nri"]["sector"] == "Resources"
    # Should cover all constants that have metadata
    from pyworld3.domain.constants import CONSTANT_META

    assert set(data.keys()) == set(CONSTANT_META.keys())


def test_variable_metadata_endpoint():
    resp = client.get("/metadata/variables")
    assert resp.status_code == 200
    data = resp.json()
    assert "pop" in data
    assert data["pop"]["full_name"] == "Total population"
    assert data["pop"]["unit"] == "people"
    assert data["pop"]["sector"] == "Population"
    from pyworld3.domain.constants import VARIABLE_META

    assert set(data.keys()) == set(VARIABLE_META.keys())


# --- Static file serving ---


def test_static_index_served():
    resp = client.get("/")
    assert resp.status_code == 200
    assert "PyWorld3" in resp.text


def test_static_js_served():
    resp = client.get("/js/app.js")
    assert resp.status_code == 200
    assert "State" in resp.text


def test_static_model_data_served():
    resp = client.get("/js/model-data.js")
    assert resp.status_code == 200
    assert "const ModelData" in resp.text
    assert "standard-run" in resp.text


def test_static_simulation_provider_served():
    resp = client.get("/js/simulation-provider.js")
    assert resp.status_code == 200
    assert "const HttpSimulationProvider" in resp.text
    assert "createSimulationProvider" in resp.text


def test_static_simulation_contracts_served():
    resp = client.get("/js/simulation-contracts.js")
    assert resp.status_code == 200
    assert "function buildSimulationRequestFromPreset" in resp.text
    assert "function resolveScenarioRequest" in resp.text


def test_static_browser_native_bridge_served():
    resp = client.get("/js/browser-native.js")
    assert resp.status_code == 200
    assert "window.ModelData = ModelData" in resp.text
    assert "window.SimulationProvider = createSimulationProvider(ModelData)" in resp.text


def test_static_local_standard_run_fixture_served():
    resp = client.get("/data/standard-run-explore.json")
    assert resp.status_code == 200
    assert '"year_min":1900' in resp.text
    assert '"pop"' in resp.text


def test_static_world3_lookup_tables_served():
    resp = client.get("/data/functions-table-world3.json")
    assert resp.status_code == 200
    assert '"y.name": "M1"' in resp.text
    assert '"sector": "Population"' in resp.text


def test_static_css_served():
    resp = client.get("/css/variables.css")
    assert resp.status_code == 200
    assert "--color-primary" in resp.text


# --- Calibrate endpoint ---


def _mock_calibrate_service_init(self, client=None):
    """Patch CalibrationService to use a mock client that returns canned data."""
    from pyworld3.adapters.owid.client import OWIDClient

    mock_client = OWIDClient.__new__(OWIDClient)
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
    mock_client.fetch_value = lambda parquet_url, column, year, **kw: mock_values.get(
        column
    )
    self._client = mock_client


def _mock_validate_service_init(self, client=None):
    """Patch ValidationService to use a mock client that returns canned timeseries."""
    from pyworld3.adapters.owid.client import OWIDClient

    mock_client = OWIDClient.__new__(OWIDClient)
    mock_ts = {
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

    def _fetch_ts(parquet_url, column, **kwargs):
        data = mock_ts.get(column)
        if data is None:
            return [], []
        years, values = data
        yr_min = kwargs.get("year_min")
        yr_max = kwargs.get("year_max")
        filtered = [
            (y, v)
            for y, v in zip(years, values)
            if (yr_min is None or y >= yr_min) and (yr_max is None or y <= yr_max)
        ]
        if not filtered:
            return [], []
        return ([float(y) for y, _ in filtered], [float(v) for _, v in filtered])

    mock_client.fetch_timeseries = _fetch_ts
    self._client = mock_client


def test_calibrate_default():
    with patch(
        "pyworld3.application.calibrate.CalibrationService.__init__",
        _mock_calibrate_service_init,
    ):
        resp = client.post("/calibrate", json={})
    assert resp.status_code == 200
    data = resp.json()
    assert data["reference_year"] == 1970
    assert data["entity"] == "World"
    assert "constants" in data


def test_calibrate_with_parameters():
    with patch(
        "pyworld3.application.calibrate.CalibrationService.__init__",
        _mock_calibrate_service_init,
    ):
        resp = client.post("/calibrate", json={"parameters": ["p1i"]})
    assert resp.status_code == 200
    data = resp.json()
    assert "constants" in data
    assert "p1i" in data["constants"]


def test_calibrate_no_body():
    with patch(
        "pyworld3.application.calibrate.CalibrationService.__init__",
        _mock_calibrate_service_init,
    ):
        resp = client.post("/calibrate")
    assert resp.status_code == 200
    data = resp.json()
    assert "constants" in data


# --- Validate endpoint ---


def test_validate_default():
    with patch(
        "pyworld3.application.validate.ValidationService.__init__",
        _mock_validate_service_init,
    ):
        resp = client.post("/validate")
    assert resp.status_code == 200
    data = resp.json()
    assert data["entity"] == "World"
    assert "metrics" in data
    assert "overlap_start" in data
    assert "overlap_end" in data


def test_validate_with_variables():
    with patch(
        "pyworld3.application.validate.ValidationService.__init__",
        _mock_validate_service_init,
    ):
        resp = client.post(
            "/validate",
            json={"validation_request": {"variables": ["pop"]}},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert "metrics" in data


def test_validate_metrics_structure():
    with patch(
        "pyworld3.application.validate.ValidationService.__init__",
        _mock_validate_service_init,
    ):
        resp = client.post("/validate")
    assert resp.status_code == 200
    data = resp.json()
    for _name, metric in data["metrics"].items():
        assert "rmse" in metric
        assert "mape" in metric
        assert "correlation" in metric
        assert "n_points" in metric
        assert "confidence" in metric


def test_year_max_less_than_year_min_returns_422():
    resp = client.post("/simulate", json={"year_min": 2000, "year_max": 1950})
    assert resp.status_code == 422


# --- ScenarioFile.to_simulation_request override tests ---


def test_scenario_cli_override_precedence():
    """CLI overrides take priority over file values."""
    scenario = ScenarioFile(name="Test", year_min=1950, pyear=1980, iphst=1950)
    request = scenario.to_simulation_request(year_min=1900, pyear=1975, iphst=1940)
    assert request.year_min == 1900
    assert request.pyear == 1975
    assert request.iphst == 1940


def test_scenario_constants_merging():
    """File + CLI constants merge correctly, with CLI winning on conflicts."""
    scenario = ScenarioFile(name="Test", constants={"nri": 2e12, "ici": 1e11})
    request = scenario.to_simulation_request(constants={"nri": 3e12, "sci": 5e10})
    assert request.constants["nri"] == 3e12
    assert request.constants["ici"] == 1e11
    assert request.constants["sci"] == 5e10


def test_scenario_output_variables_override():
    """CLI output_variables override file values."""
    scenario = ScenarioFile(name="Test", output_variables=["pop", "nr"])
    request = scenario.to_simulation_request(output_variables=["le", "fpc"])
    assert request.output_variables == ["le", "fpc"]


def test_scenario_file_values_used_when_no_cli():
    """File values are used when CLI provides None."""
    scenario = ScenarioFile(
        name="Test",
        year_min=1900,
        year_max=2050,
        constants={"nri": 2e12},
        output_variables=["pop"],
    )
    request = scenario.to_simulation_request()
    assert request.year_min == 1900
    assert request.year_max == 2050
    assert request.constants["nri"] == 2e12
    assert request.output_variables == ["pop"]
