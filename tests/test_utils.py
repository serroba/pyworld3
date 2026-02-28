import numpy as np

from pyworld3.utils import requires


class FakeSector:
    """Minimal stand-in for a World3 sector to test the @requires decorator."""

    def __init__(self):
        self.verbose = False
        self.redo_loop = False
        # Two arrays the decorator will inspect
        self.pop = np.array([1.0, np.nan, 3.0])
        self.gdp = np.array([100.0, 200.0, 300.0])

    @requires(inputs=["POP", "GDP"])
    def update_both_known(self, k):
        return "ok"

    @requires(inputs=["POP"])
    def update_pop_only(self, k):
        return "ok"

    @requires(inputs=None)
    def update_no_inputs(self, k):
        return "ok"

    @requires(inputs=["POP"], check_at_init=False)
    def update_skip_init_check(self, k):
        return "ok"

    @requires(inputs=["POP"], check_after_init=False)
    def update_skip_after_init_check(self, k):
        return "ok"


class TestRequires:
    def test_proceeds_when_all_inputs_known(self):
        s = FakeSector()
        result = s.update_both_known(0)
        assert result == "ok"
        assert s.redo_loop is False

    def test_reschedules_when_input_is_nan(self):
        s = FakeSector()
        # k=1 → pop[1] is NaN
        s.update_pop_only(1)
        assert s.redo_loop is True

    def test_no_reschedule_when_input_known(self):
        s = FakeSector()
        # k=2 → pop[2] = 3.0
        s.update_pop_only(2)
        assert s.redo_loop is False

    def test_no_inputs_never_reschedules(self):
        s = FakeSector()
        s.update_no_inputs(1)
        assert s.redo_loop is False

    def test_skip_init_check_at_k0(self):
        s = FakeSector()
        s.pop[0] = np.nan
        s.update_skip_init_check(0)
        # check_at_init=False → no reschedule even though pop[0] is NaN
        assert s.redo_loop is False

    def test_skip_after_init_check_at_k1(self):
        s = FakeSector()
        # pop[1] is NaN, but check_after_init=False → no reschedule
        s.update_skip_after_init_check(1)
        assert s.redo_loop is False

    def test_decorated_function_preserves_name(self):
        s = FakeSector()
        assert s.update_pop_only.__name__ == "update_pop_only"
