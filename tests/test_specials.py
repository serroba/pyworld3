import numpy as np
import pytest

from pyworld3.specials import Delay3, Dlinf3, Smooth, clip, ramp, switch

# ── switch ──────────────────────────────────────────────────────────────


class TestSwitch:
    def test_returns_var1_when_false(self):
        assert switch(10, 20, False) == 10

    def test_returns_var2_when_true(self):
        assert switch(10, 20, True) == 20

    def test_nan_var1(self):
        assert np.isnan(switch(np.nan, 20, False))

    def test_nan_var2(self):
        assert np.isnan(switch(10, np.nan, True))

    def test_truthy_switch_value(self):
        assert switch(10, 20, 1) == 20

    def test_falsy_switch_value(self):
        assert switch(10, 20, 0) == 10


# ── clip ────────────────────────────────────────────────────────────────


class TestClip:
    def test_returns_func1_before_switch(self):
        assert clip(99, 1, t=1970, t_switch=2000) == 1

    def test_returns_func1_at_switch(self):
        assert clip(99, 1, t=2000, t_switch=2000) == 1

    def test_returns_func2_after_switch(self):
        assert clip(99, 1, t=2001, t_switch=2000) == 99

    def test_nan_func1(self):
        assert np.isnan(clip(99, np.nan, t=1970, t_switch=2000))

    def test_nan_func2(self):
        assert np.isnan(clip(np.nan, 1, t=1970, t_switch=2000))


# ── ramp ────────────────────────────────────────────────────────────────


class TestRamp:
    def test_zero_before_offset(self):
        assert ramp(0.5, 2000, t=1999) == 0

    def test_zero_at_offset(self):
        assert ramp(0.5, 2000, t=2000) == 0

    def test_linear_after_offset(self):
        assert ramp(0.5, 2000, t=2010) == pytest.approx(5.0)

    def test_negative_slope(self):
        assert ramp(-1.0, 10, t=15) == pytest.approx(-5.0)


# ── Smooth (1st-order delay) ───────────────────────────────────────────


class TestSmooth:
    @pytest.fixture
    def step_input(self):
        """Step from 0 to 10 at k=0 (constant input)."""
        n = 100
        t = np.linspace(0, 10, n)
        dt = t[1] - t[0]
        in_arr = np.full(n, 10.0)
        return in_arr, dt, t

    @pytest.mark.parametrize("method", ["euler", "odeint"])
    def test_initial_value_equals_input(self, step_input, method):
        in_arr, dt, t = step_input
        smooth = Smooth(in_arr, dt, t, method=method)
        val = smooth(0, delay=2.0)
        assert val == pytest.approx(in_arr[0])

    @pytest.mark.parametrize("method", ["euler"])
    def test_converges_to_constant_input(self, step_input, method):
        in_arr, dt, t = step_input
        smooth = Smooth(in_arr, dt, t, method=method)
        for k in range(len(t)):
            smooth(k, delay=2.0)
        assert smooth.out_arr[-1] == pytest.approx(10.0, abs=0.1)

    @pytest.mark.parametrize("method", ["euler"])
    def test_higher_delay_is_slower(self, method):
        n = 50
        t = np.linspace(0, 5, n)
        dt = t[1] - t[0]
        in_arr = np.full(n, 10.0)
        in_arr[0] = 0.0  # start from 0, rest is 10

        fast = Smooth(in_arr.copy(), dt, t, method=method)
        slow = Smooth(in_arr.copy(), dt, t, method=method)
        for k in range(n):
            fast(k, delay=1.0)
            slow(k, delay=5.0)
        # At mid-point, fast should be closer to 10 than slow
        mid = n // 2
        assert fast.out_arr[mid] > slow.out_arr[mid]


# ── Delay3 (3rd-order delay) ───────────────────────────────────────────


class TestDelay3:
    @pytest.fixture
    def step_input(self):
        n = 200
        t = np.linspace(0, 20, n)
        dt = t[1] - t[0]
        in_arr = np.full(n, 10.0)
        return in_arr, dt, t

    @pytest.mark.parametrize("method", ["euler", "odeint"])
    def test_converges_to_constant_input(self, step_input, method):
        in_arr, dt, t = step_input
        d3 = Delay3(in_arr, dt, t, method=method)
        for k in range(len(t)):
            d3(k, delay=2.0)
        assert d3.out_arr[-1, 2] == pytest.approx(10.0, abs=0.5)

    def test_initial_state_scaled_by_delay(self, step_input):
        in_arr, dt, t = step_input
        d3 = Delay3(in_arr, dt, t)
        d3(0, delay=3.0)
        # _init_out_arr sets out_arr[0, :] = in_arr[0] * 3 / delay
        expected = in_arr[0] * 3 / 3.0
        np.testing.assert_allclose(d3.out_arr[0, :], expected)

    @pytest.mark.parametrize("method", ["euler", "odeint"])
    def test_output_shape(self, step_input, method):
        in_arr, dt, t = step_input
        d3 = Delay3(in_arr, dt, t, method=method)
        for k in range(len(t)):
            val = d3(k, delay=2.0)
        assert d3.out_arr.shape == (len(t), 3)
        # __call__ returns the 3rd stage
        assert val == d3.out_arr[-1, 2]


# ── Dlinf3 (different initialization from Delay3) ──────────────────────


class TestDlinf3:
    def test_initial_state_equals_input(self):
        n = 50
        t = np.linspace(0, 5, n)
        dt = t[1] - t[0]
        in_arr = np.full(n, 7.0)
        d = Dlinf3(in_arr, dt, t)
        d(0, delay=2.0)
        # Dlinf3 sets out_arr[0, :] = in_arr[0] (no scaling)
        np.testing.assert_allclose(d.out_arr[0, :], 7.0)

    def test_differs_from_delay3_init(self):
        n = 50
        t = np.linspace(0, 5, n)
        dt = t[1] - t[0]
        in_arr = np.full(n, 10.0)
        delay = 5.0  # != 3, so the two inits differ

        d3 = Delay3(in_arr.copy(), dt, t)
        dl = Dlinf3(in_arr.copy(), dt, t)
        d3(0, delay=delay)
        dl(0, delay=delay)

        # Delay3: in_arr[0] * 3/delay = 10*3/5 = 6
        # Dlinf3: in_arr[0] = 10
        assert not np.allclose(d3.out_arr[0, :], dl.out_arr[0, :])
