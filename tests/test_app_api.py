from fastapi.testclient import TestClient

from app.api import app
from app.engine import CONSTANT_DEFAULTS, DEFAULT_OUTPUT_VARIABLES

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
