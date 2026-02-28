import pytest

from pyworld3.adapters.schemas import SimulationRequest
from pyworld3.application.ports import SimulationParams
from pyworld3.application.simulate import SimulationService
from pyworld3.domain.constants import (
    CONSTANT_CONSTRAINTS,
    CONSTANT_DEFAULTS,
    CONSTANT_META,
    DEFAULT_OUTPUT_VARIABLES,
    VARIABLE_META,
)
from pyworld3.domain.exceptions import SimulationValidationError

_service = SimulationService()


def test_default_simulation():
    params = SimulationParams()
    response = _service.run(params)
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
    params = SimulationParams(constants={"nri": 2e12})
    response = _service.run(params)
    assert response.constants_used["nri"] == 2e12
    # Other constants remain at defaults
    assert response.constants_used["dcfsn"] == CONSTANT_DEFAULTS["dcfsn"]


def test_custom_output_variables():
    params = SimulationParams(output_variables=["pop", "nr"])
    response = _service.run(params)
    assert set(response.series.keys()) == {"pop", "nr"}


def test_unknown_constant_raises():
    params = SimulationParams(constants={"nonexistent_param": 42})
    with pytest.raises(SimulationValidationError, match="Unknown constants"):
        _service.run(params)


def test_unknown_variable_raises():
    params = SimulationParams(output_variables=["nonexistent_var"])
    with pytest.raises(SimulationValidationError, match="Unknown output variables"):
        _service.run(params)


def test_short_simulation():
    params = SimulationParams(
        year_min=1900, year_max=1910, dt=1, pyear=1905, iphst=1905
    )
    response = _service.run(params)
    assert len(response.time) == 11
    assert response.time[-1] == 1910


def test_no_nan_in_output():
    params = SimulationParams()
    response = _service.run(params)
    for ts in response.series.values():
        for v in ts.values:
            assert v == v  # NaN != NaN


def test_constants_dict_complete():
    assert len(CONSTANT_DEFAULTS) == 65


def test_all_constants_have_constraints():
    """Every constant in CONSTANT_DEFAULTS should have a constraint entry."""
    assert set(CONSTANT_CONSTRAINTS) == set(CONSTANT_DEFAULTS)


# --- Validation tests ---


def test_negative_constant_rejected():
    params = SimulationParams(constants={"nri": -1})
    with pytest.raises(SimulationValidationError, match="nri"):
        _service.run(params)


def test_negative_population_rejected():
    params = SimulationParams(constants={"p1i": -100})
    with pytest.raises(SimulationValidationError, match="p1i"):
        _service.run(params)


def test_fraction_above_one_rejected():
    params = SimulationParams(constants={"lfpf": 1.5})
    with pytest.raises(SimulationValidationError, match="lfpf"):
        _service.run(params)


def test_fraction_negative_rejected():
    params = SimulationParams(constants={"fioac1": -0.1})
    with pytest.raises(SimulationValidationError, match="fioac1"):
        _service.run(params)


def test_pyear_outside_range_rejected():
    with pytest.raises(ValueError, match="pyear"):
        SimulationRequest(year_min=1900, year_max=2100, pyear=2200)


def test_iphst_outside_range_rejected():
    with pytest.raises(ValueError, match="iphst"):
        SimulationRequest(year_min=1900, year_max=2100, iphst=1800)


def test_excessive_array_size_rejected():
    with pytest.raises(ValueError, match="Too many time steps"):
        SimulationRequest(year_min=1900, year_max=2100, dt=0.001)


def test_year_min_out_of_bounds():
    with pytest.raises(ValueError, match="greater than or equal to 1900"):
        SimulationRequest(year_min=1000)


def test_year_max_out_of_bounds():
    with pytest.raises(ValueError, match="less than or equal to 2500"):
        SimulationRequest(year_max=3000)


def test_dt_too_large():
    with pytest.raises(ValueError, match="less than or equal to 100"):
        SimulationRequest(dt=200)


def test_all_constants_have_metadata():
    """Every constant in CONSTANT_DEFAULTS should have a CONSTANT_META entry."""
    assert set(CONSTANT_META) == set(CONSTANT_DEFAULTS)


def test_all_variables_have_metadata():
    """Every variable in DEFAULT_OUTPUT_VARIABLES should have a VARIABLE_META entry."""
    assert set(VARIABLE_META) == set(DEFAULT_OUTPUT_VARIABLES)
