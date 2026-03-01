"""Shared fixtures for the pyworld3 test suite."""

from __future__ import annotations

import io
from pathlib import Path

import pytest

try:
    import pandas  # noqa: F401
    import pyarrow  # noqa: F401

    _has_pandas = True
except ModuleNotFoundError:
    _has_pandas = False

requires_pandas = pytest.mark.skipif(
    not _has_pandas, reason="pandas/pyarrow required for OWID client tests"
)

# ---------------------------------------------------------------------------
# Helpers to build mock parquet data
# ---------------------------------------------------------------------------


def make_parquet_bytes(
    data: dict[str, list], columns: list[str] | None = None
) -> bytes:
    """Create an in-memory parquet file from dict data."""
    import pandas as pd

    df = pd.DataFrame(data)
    buf = io.BytesIO()
    df.to_parquet(buf, index=False)
    return buf.getvalue()


def mock_wdi_data(
    years: list[int] | None = None,
    pop: list[float] | None = None,
    le: list[float] | None = None,
    cbr: list[float] | None = None,
    cdr: list[float] | None = None,
    tfr: list[float] | None = None,
    gdp: list[float] | None = None,
    gdp_pc: list[float] | None = None,
    pop_0_14_pct: list[float] | None = None,
    pop_15_64_pct: list[float] | None = None,
    pop_65_up_pct: list[float] | None = None,
    gcf_pct: list[float] | None = None,
    ind_pct: list[float] | None = None,
) -> dict[str, list]:
    """Build a mock WDI dataset."""
    if years is None:
        years = [1960, 1970, 1980, 1990, 2000, 2010, 2020]

    n = len(years)
    data: dict[str, list] = {
        "country": ["World"] * n,
        "year": years,
    }

    if pop is not None:
        data["sp_pop_totl"] = pop
    if le is not None:
        data["sp_dyn_le00_in"] = le
    if cbr is not None:
        data["sp_dyn_cbrt_in"] = cbr
    if cdr is not None:
        data["sp_dyn_cdrt_in"] = cdr
    if tfr is not None:
        data["sp_dyn_tfrt_in"] = tfr
    if gdp is not None:
        data["ny_gdp_mktp_cd"] = gdp
    if gdp_pc is not None:
        data["ny_gdp_pcap_cd"] = gdp_pc
    if pop_0_14_pct is not None:
        data["sp_pop_0014_to_zs"] = pop_0_14_pct
    if pop_15_64_pct is not None:
        data["sp_pop_1564_to_zs"] = pop_15_64_pct
    if pop_65_up_pct is not None:
        data["sp_pop_65up_to_zs"] = pop_65_up_pct
    if gcf_pct is not None:
        data["ne_gdi_totl_zs"] = gcf_pct
    if ind_pct is not None:
        data["nv_ind_totl_zs"] = ind_pct

    return data


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def tmp_cache(tmp_path: Path) -> Path:
    """Provide a temporary cache directory."""
    cache = tmp_path / "owid_cache"
    cache.mkdir()
    return cache


@pytest.fixture
def mock_wdi_parquet(tmp_cache: Path) -> Path:
    """Create a mock WDI parquet file in the cache."""
    data = mock_wdi_data(
        years=[1960, 1970, 1980, 1990, 2000, 2010, 2020],
        pop=[3.0e9, 3.7e9, 4.4e9, 5.3e9, 6.1e9, 6.9e9, 7.8e9],
        le=[52.6, 58.8, 63.0, 65.4, 67.7, 70.6, 72.7],
        cbr=[34.9, 32.5, 28.3, 26.0, 21.5, 19.4, 17.9],
        cdr=[17.7, 12.4, 10.7, 9.4, 8.7, 7.9, 7.6],
        tfr=[4.98, 4.74, 3.68, 3.39, 2.73, 2.53, 2.35],
        gdp=[1.4e12, 2.9e12, 1.1e13, 2.3e13, 3.4e13, 6.6e13, 8.5e13],
        gdp_pc=[467, 784, 2495, 4337, 5570, 9556, 10926],
        pop_0_14_pct=[37.2, 37.1, 35.3, 32.7, 30.0, 26.7, 25.4],
        pop_15_64_pct=[58.0, 57.6, 59.2, 61.5, 63.3, 65.7, 65.2],
        pop_65_up_pct=[4.8, 5.3, 5.5, 5.8, 6.7, 7.6, 9.4],
        gcf_pct=[22.0, 25.0, 24.0, 23.0, 22.0, 24.0, 25.0],
        ind_pct=[38.0, 38.0, 36.0, 33.0, 29.0, 27.0, 26.0],
    )
    parquet_bytes = make_parquet_bytes(data)

    parquet_path = tmp_cache / "mock_wdi.parquet"
    parquet_path.write_bytes(parquet_bytes)
    return parquet_path
