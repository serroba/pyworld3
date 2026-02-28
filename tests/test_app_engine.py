import pytest

from app.engine import CONSTANT_DEFAULTS, DEFAULT_OUTPUT_VARIABLES, run_simulation
from app.models import SimulationRequest


def test_default_simulation():
    request = SimulationRequest()
    response = run_simulation(request)
    assert response.year_min == 1900
    assert response.year_max == 2100
    assert response.dt == 0.5
    assert len(response.time) > 0
    assert response.time[0] == 1900
    assert len(response.series) == len(DEFAULT_OUTPUT_VARIABLES)
    for var_name in DEFAULT_OUTPUT_VARIABLES:
        assert var_name in response.series
        ts = response.series[var_name]
        assert ts.name == var_name
        assert len(ts.values) == len(response.time)


def test_custom_constants():
    request = SimulationRequest(constants={"nri": 2e12})
    response = run_simulation(request)
    assert response.constants_used["nri"] == 2e12
    # Other constants remain at defaults
    assert response.constants_used["dcfsn"] == CONSTANT_DEFAULTS["dcfsn"]


def test_custom_output_variables():
    request = SimulationRequest(output_variables=["pop", "nr"])
    response = run_simulation(request)
    assert set(response.series.keys()) == {"pop", "nr"}


def test_unknown_constant_raises():
    request = SimulationRequest(constants={"nonexistent_param": 42})
    with pytest.raises(ValueError, match="Unknown constants"):
        run_simulation(request)


def test_unknown_variable_raises():
    request = SimulationRequest(output_variables=["nonexistent_var"])
    with pytest.raises(ValueError, match="Unknown output variables"):
        run_simulation(request)


def test_short_simulation():
    request = SimulationRequest(year_min=1900, year_max=1910, dt=1)
    response = run_simulation(request)
    assert len(response.time) == 11
    assert response.time[-1] == 1910


def test_no_nan_in_output():
    request = SimulationRequest()
    response = run_simulation(request)
    for ts in response.series.values():
        for v in ts.values:
            assert v == v  # NaN != NaN


def test_constants_dict_complete():
    assert len(CONSTANT_DEFAULTS) == 65
