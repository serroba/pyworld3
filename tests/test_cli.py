import json

from typer.testing import CliRunner

from pyworld3.adapters.cli import app

runner = CliRunner()


def test_simulate_default():
    result = runner.invoke(app, ["simulate"])
    assert result.exit_code == 0
    data = json.loads(result.stdout)
    assert "time" in data
    assert "series" in data


def test_simulate_pretty():
    result = runner.invoke(app, ["simulate", "--pretty"])
    assert result.exit_code == 0
    data = json.loads(result.stdout)
    assert "series" in data


def test_simulate_with_set():
    result = runner.invoke(app, ["simulate", "--set", "nri=2e12", "--pretty"])
    assert result.exit_code == 0
    data = json.loads(result.stdout)
    assert data["constants_used"]["nri"] == 2e12


def test_simulate_with_var():
    result = runner.invoke(app, ["simulate", "--var", "pop", "--var", "nr"])
    assert result.exit_code == 0
    data = json.loads(result.stdout)
    assert set(data["series"].keys()) == {"pop", "nr"}


def test_simulate_invalid_set_format():
    result = runner.invoke(app, ["simulate", "--set", "badformat"])
    assert result.exit_code == 1


def test_simulate_invalid_set_value():
    result = runner.invoke(app, ["simulate", "--set", "nri=notanumber"])
    assert result.exit_code == 1


def test_simulate_unknown_constant():
    result = runner.invoke(app, ["simulate", "--set", "bad_param=1"])
    assert result.exit_code == 1


def test_simulate_output_file(tmp_path):
    outfile = tmp_path / "result.json"
    result = runner.invoke(app, ["simulate", "--output", str(outfile)])
    assert result.exit_code == 0
    data = json.loads(outfile.read_text())
    assert "series" in data


def test_constants_command():
    result = runner.invoke(app, ["constants"])
    assert result.exit_code == 0
    data = json.loads(result.stdout)
    assert len(data) == 65


def test_variables_command():
    result = runner.invoke(app, ["variables"])
    assert result.exit_code == 0
    data = json.loads(result.stdout)
    assert "pop" in data


# --- Validation tests ---


def test_simulate_negative_constant():
    result = runner.invoke(app, ["simulate", "--set", "nri=-1"])
    assert result.exit_code == 1
    assert "nri" in result.output


def test_simulate_pyear_outside_range():
    result = runner.invoke(app, ["simulate", "--pyear", "2200"])
    assert result.exit_code == 1


def test_simulate_iphst_outside_range():
    result = runner.invoke(app, ["simulate", "--iphst", "1800"])
    assert result.exit_code == 1


def test_simulate_excessive_steps():
    result = runner.invoke(app, ["simulate", "--dt", "0.001"])
    assert result.exit_code == 1


def test_simulate_year_min_out_of_bounds():
    result = runner.invoke(app, ["simulate", "--year-min", "1000"])
    assert result.exit_code == 1


def test_simulate_year_max_out_of_bounds():
    result = runner.invoke(app, ["simulate", "--year-max", "3000"])
    assert result.exit_code == 1


# --- Describe / summary tests ---


def test_constants_describe():
    result = runner.invoke(app, ["constants", "--describe"])
    assert result.exit_code == 0
    assert "Population" in result.stdout
    assert "Capital" in result.stdout
    assert "Initial population 0-14" in result.stdout
    assert "Initial industrial capital" in result.stdout


def test_variables_describe():
    result = runner.invoke(app, ["variables", "--describe"])
    assert result.exit_code == 0
    assert "Population" in result.stdout
    assert "Resources" in result.stdout
    assert "Total population" in result.stdout
    assert "Life expectancy" in result.stdout


def test_simulate_summary():
    result = runner.invoke(app, ["simulate", "--summary"])
    assert result.exit_code == 0
    assert "World3 Simulation Summary" in result.stdout
    assert "pop" in result.stdout
    # Should NOT be valid JSON
    try:
        json.loads(result.stdout)
        is_json = True
    except json.JSONDecodeError:
        is_json = False
    assert not is_json


def test_simulate_summary_with_output_is_error(tmp_path):
    outfile = tmp_path / "result.json"
    result = runner.invoke(app, ["simulate", "--summary", "--output", str(outfile)])
    assert result.exit_code == 1


def test_simulate_summary_with_pretty_is_error():
    result = runner.invoke(app, ["simulate", "--summary", "--pretty"])
    assert result.exit_code == 1


def test_simulate_plot(tmp_path):
    plot_file = tmp_path / "test_plot.png"
    result = runner.invoke(app, ["simulate", "--plot", str(plot_file)])
    assert result.exit_code == 0
    assert plot_file.exists()
    assert plot_file.stat().st_size > 0
