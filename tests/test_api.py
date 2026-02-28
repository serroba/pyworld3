from fastapi.testclient import TestClient

from pyworld3.adapters.api import app
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
