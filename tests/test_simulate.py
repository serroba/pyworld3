import math

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
            assert not math.isnan(v), f"NaN found in series '{ts.name}'"


def test_constants_dict_complete():
    assert len(CONSTANT_DEFAULTS) == 65


def test_all_constants_have_constraints():
    """Every constant in CONSTANT_DEFAULTS should have a constraint entry."""
    assert set(CONSTANT_CONSTRAINTS) == set(CONSTANT_DEFAULTS)


# --- Validation: negative values rejected for non-negative constants ---


@pytest.mark.parametrize(
    "constant",
    ["nri", "p1i", "p2i", "p3i", "p4i", "ici", "sci", "ali", "ppoli", "dcfsn"],
    ids=lambda c: f"negative_{c}",
)
def test_negative_constant_rejected(constant):
    """Constants with lower bound >= 0 must reject negative values."""
    params = SimulationParams(constants={constant: -1})
    with pytest.raises(SimulationValidationError, match=constant):
        _service.run(params)


# --- Validation: fractions must be in [0, 1] ---


@pytest.mark.parametrize(
    "constant",
    ["lfpf", "fioac1", "fioac2", "lfh", "pl"],
    ids=lambda c: f"fraction_{c}",
)
class TestFractionBounds:
    def test_above_one_rejected(self, constant):
        params = SimulationParams(constants={constant: 1.5})
        with pytest.raises(SimulationValidationError, match=constant):
            _service.run(params)

    def test_negative_rejected(self, constant):
        params = SimulationParams(constants={constant: -0.1})
        with pytest.raises(SimulationValidationError, match=constant):
            _service.run(params)


# --- Validation: SimulationRequest schema bounds ---


@pytest.mark.parametrize(
    ("kwargs", "match"),
    [
        ({"year_min": 1900, "year_max": 2100, "pyear": 2200}, "pyear"),
        ({"year_min": 1900, "year_max": 2100, "iphst": 1800}, "iphst"),
        ({"year_min": 1900, "year_max": 2100, "dt": 0.001}, "Too many time steps"),
        ({"year_min": 1000}, "greater than or equal to 1900"),
        ({"year_max": 3000}, "less than or equal to 2500"),
        ({"dt": 200}, "less than or equal to 100"),
    ],
    ids=[
        "pyear_above_range",
        "iphst_below_range",
        "dt_too_small",
        "year_min_too_low",
        "year_max_too_high",
        "dt_too_large",
    ],
)
def test_request_schema_validation(kwargs, match):
    with pytest.raises(ValueError, match=match):
        SimulationRequest(**kwargs)


# --- Metadata consistency ---


def test_all_constants_have_metadata():
    """Every constant in CONSTANT_DEFAULTS should have a CONSTANT_META entry."""
    assert set(CONSTANT_META) == set(CONSTANT_DEFAULTS)


def test_all_variables_have_metadata():
    """Every variable in DEFAULT_OUTPUT_VARIABLES should have a VARIABLE_META entry."""
    assert set(VARIABLE_META) == set(DEFAULT_OUTPUT_VARIABLES)
