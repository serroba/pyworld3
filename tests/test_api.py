from fastapi.testclient import TestClient

from pyworld3.adapters.api import app
from pyworld3.adapters.schemas import list_presets
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


def test_static_css_served():
    resp = client.get("/css/variables.css")
    assert resp.status_code == 200
    assert "--color-primary" in resp.text
