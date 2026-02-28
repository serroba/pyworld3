import json

from typer.testing import CliRunner

from app.cli import app

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
