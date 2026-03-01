"""Tests for the OWID data integration layer.

Uses mocked HTTP responses to avoid network calls during testing.
"""

from __future__ import annotations

import io
import math
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# ---------------------------------------------------------------------------
# Helpers to build mock parquet data
# ---------------------------------------------------------------------------


def _make_parquet_bytes(
    data: dict[str, list], columns: list[str] | None = None
) -> bytes:
    """Create an in-memory parquet file from dict data."""
    import pandas as pd

    df = pd.DataFrame(data)
    buf = io.BytesIO()
    df.to_parquet(buf, index=False)
    return buf.getvalue()


def _mock_wdi_data(
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
    data = _mock_wdi_data(
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
    parquet_bytes = _make_parquet_bytes(data)

    # Write to cache path that matches the hash the client would generate
    parquet_path = tmp_cache / "mock_wdi.parquet"
    parquet_path.write_bytes(parquet_bytes)
    return parquet_path


# ---------------------------------------------------------------------------
# OWIDClient tests
# ---------------------------------------------------------------------------


class TestOWIDClient:
    def test_fetch_indicator_filters_by_entity_and_year(
        self, tmp_cache, mock_wdi_parquet
    ):
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache)

        # Patch _read_parquet to return our mock data
        import pandas as pd

        mock_df = pd.read_parquet(mock_wdi_parquet)

        with patch.object(client, "_read_parquet", return_value=mock_df):
            df = client.fetch_indicator(
                "https://example.com/wdi.parquet",
                "sp_pop_totl",
                year_min=1970,
                year_max=2000,
            )

        assert len(df) == 4  # 1970, 1980, 1990, 2000
        assert df["year"].iloc[0] == 1970
        assert df["sp_pop_totl"].iloc[0] == pytest.approx(3.7e9)

    def test_fetch_indicator_no_year_filter(self, tmp_cache, mock_wdi_parquet):
        """Without year_min/year_max all rows are returned."""
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache)
        import pandas as pd

        mock_df = pd.read_parquet(mock_wdi_parquet)

        with patch.object(client, "_read_parquet", return_value=mock_df):
            df = client.fetch_indicator(
                "https://example.com/wdi.parquet",
                "sp_pop_totl",
            )

        assert len(df) == 7  # all years

    def test_fetch_indicator_filters_by_custom_entity(
        self, tmp_cache, mock_wdi_parquet
    ):
        """Passing entity= filters to that entity (and returns empty for unknowns)."""
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache)
        import pandas as pd

        mock_df = pd.read_parquet(mock_wdi_parquet)

        with patch.object(client, "_read_parquet", return_value=mock_df):
            df = client.fetch_indicator(
                "https://example.com/wdi.parquet",
                "sp_pop_totl",
                entity="France",  # not in mock data
            )

        assert df.empty

    def test_fetch_indicator_uses_default_entity(self, tmp_cache, mock_wdi_parquet):
        """Client default_entity is used when entity is not specified."""
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache, default_entity="World")
        import pandas as pd

        mock_df = pd.read_parquet(mock_wdi_parquet)

        with patch.object(client, "_read_parquet", return_value=mock_df):
            df = client.fetch_indicator(
                "https://example.com/wdi.parquet",
                "sp_pop_totl",
            )

        assert len(df) == 7

    def test_fetch_indicator_drops_nan_values(self, tmp_cache):
        """Rows with NaN in the value column are dropped."""
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache)
        import pandas as pd

        data = {
            "country": ["World"] * 3,
            "year": [2000, 2010, 2020],
            "val": [1.0, float("nan"), 3.0],
        }
        mock_df = pd.DataFrame(data)

        with patch.object(client, "_read_parquet", return_value=mock_df):
            df = client.fetch_indicator(
                "https://example.com/test.parquet",
                "val",
            )

        assert len(df) == 2
        assert list(df["year"]) == [2000, 2020]

    def test_fetch_indicator_returns_sorted_by_year(self, tmp_cache):
        """Output is always sorted by year regardless of input order."""
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache)
        import pandas as pd

        data = {
            "country": ["World"] * 3,
            "year": [2020, 2000, 2010],
            "val": [3.0, 1.0, 2.0],
        }
        mock_df = pd.DataFrame(data)

        with patch.object(client, "_read_parquet", return_value=mock_df):
            df = client.fetch_indicator(
                "https://example.com/test.parquet",
                "val",
            )

        assert list(df["year"]) == [2000, 2010, 2020]
        assert list(df["val"]) == [1.0, 2.0, 3.0]

    def test_fetch_value_returns_single_year(self, tmp_cache, mock_wdi_parquet):
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache)

        import pandas as pd

        mock_df = pd.read_parquet(mock_wdi_parquet)

        with patch.object(client, "_read_parquet", return_value=mock_df):
            value = client.fetch_value(
                "https://example.com/wdi.parquet",
                "sp_pop_totl",
                2020,
            )

        assert value == pytest.approx(7.8e9)

    def test_fetch_value_returns_none_for_missing_year(
        self, tmp_cache, mock_wdi_parquet
    ):
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache)

        import pandas as pd

        mock_df = pd.read_parquet(mock_wdi_parquet)

        with patch.object(client, "_read_parquet", return_value=mock_df):
            value = client.fetch_value(
                "https://example.com/wdi.parquet",
                "sp_pop_totl",
                1950,  # not in mock data
            )

        assert value is None

    def test_fetch_timeseries_returns_years_and_values(
        self, tmp_cache, mock_wdi_parquet
    ):
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache)

        import pandas as pd

        mock_df = pd.read_parquet(mock_wdi_parquet)

        with patch.object(client, "_read_parquet", return_value=mock_df):
            years, values = client.fetch_timeseries(
                "https://example.com/wdi.parquet",
                "sp_dyn_le00_in",
            )

        assert len(years) == 7
        assert years[0] == 1960.0
        assert values[0] == pytest.approx(52.6)

    def test_fetch_timeseries_with_year_bounds(self, tmp_cache, mock_wdi_parquet):
        """Year bounds are forwarded to fetch_indicator."""
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache)
        import pandas as pd

        mock_df = pd.read_parquet(mock_wdi_parquet)

        with patch.object(client, "_read_parquet", return_value=mock_df):
            years, values = client.fetch_timeseries(
                "https://example.com/wdi.parquet",
                "sp_pop_totl",
                year_min=2000,
                year_max=2020,
            )

        assert years == [2000.0, 2010.0, 2020.0]
        assert len(values) == 3

    def test_fetch_timeseries_empty(self, tmp_cache, mock_wdi_parquet):
        """Empty result when entity has no data."""
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache)
        import pandas as pd

        mock_df = pd.read_parquet(mock_wdi_parquet)

        with patch.object(client, "_read_parquet", return_value=mock_df):
            years, values = client.fetch_timeseries(
                "https://example.com/wdi.parquet",
                "sp_pop_totl",
                entity="Narnia",
            )

        assert years == []
        assert values == []

    # -- Caching layer tests ------------------------------------------------

    def test_cache_path_is_deterministic(self, tmp_cache):
        """Same URL always yields the same cache path."""
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache)
        url = "https://catalog.ourworldindata.org/some/data.parquet"

        path1 = client._cache_path(url)
        path2 = client._cache_path(url)
        assert path1 == path2

    def test_cache_path_differs_for_different_urls(self, tmp_cache):
        """Different URLs produce different cache paths."""
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache)

        path_a = client._cache_path("https://example.com/a.parquet")
        path_b = client._cache_path("https://example.com/b.parquet")
        assert path_a != path_b

    def test_cache_path_preserves_filename(self, tmp_cache):
        """Cache path ends with the original filename (prefixed by hash)."""
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache)
        path = client._cache_path("https://example.com/deep/path/mydata.parquet")
        assert path.name.endswith("_mydata.parquet")
        assert path.parent == tmp_cache

    def test_cache_path_lives_in_cache_dir(self, tmp_cache):
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache)
        path = client._cache_path("https://example.com/foo.parquet")
        assert path.parent == tmp_cache

    def test_is_expired_fresh_file(self, tmp_cache):
        """A freshly-written file is not expired."""
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache, ttl_seconds=3600)
        f = tmp_cache / "fresh.parquet"
        f.write_bytes(b"data")

        assert not client._is_expired(f)

    def test_is_expired_old_file(self, tmp_cache):
        """A file whose mtime is older than TTL is expired."""
        import os

        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache, ttl_seconds=60)
        f = tmp_cache / "old.parquet"
        f.write_bytes(b"data")

        # Backdate mtime by 120 seconds
        old_time = time.time() - 120
        os.utime(f, (old_time, old_time))

        assert client._is_expired(f)

    def test_cache_hit_avoids_download(self, tmp_cache):
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache, ttl_seconds=3600)

        # Pre-create a cached file
        data = _mock_wdi_data(
            years=[2020],
            pop=[7.8e9],
        )
        cache_path = client._cache_path("https://example.com/test.parquet")
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_bytes(_make_parquet_bytes(data))

        with patch.object(client, "_download") as mock_download:
            df = client._read_parquet("https://example.com/test.parquet")

        mock_download.assert_not_called()
        assert not df.empty

    def test_cache_miss_triggers_download(self, tmp_cache):
        """When no cached file exists, _download is called."""
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache, ttl_seconds=3600)
        url = "https://example.com/missing.parquet"

        # Prepare a valid parquet that _download will "create"
        data = _mock_wdi_data(years=[2020], pop=[7.8e9])

        def fake_download(_url, dest):
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(_make_parquet_bytes(data))

        with patch.object(client, "_download", side_effect=fake_download) as mock_dl:
            df = client._read_parquet(url)

        mock_dl.assert_called_once()
        assert not df.empty

    def test_expired_cache_triggers_redownload(self, tmp_cache):
        """When cached file is past TTL, _download is called again."""
        import os

        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache, ttl_seconds=60)
        url = "https://example.com/stale.parquet"

        data = _mock_wdi_data(years=[2020], pop=[7.8e9])
        parquet_bytes = _make_parquet_bytes(data)

        # Place an expired cached file
        cache_path = client._cache_path(url)
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_bytes(parquet_bytes)
        old_time = time.time() - 120
        os.utime(cache_path, (old_time, old_time))

        def fake_download(_url, dest):
            dest.write_bytes(parquet_bytes)

        with patch.object(client, "_download", side_effect=fake_download) as mock_dl:
            df = client._read_parquet(url)

        mock_dl.assert_called_once()
        assert not df.empty

    def test_read_parquet_passes_column_filter(self, tmp_cache):
        """_read_parquet forwards the columns argument to pd.read_parquet."""
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache, ttl_seconds=3600)
        url = "https://example.com/cols.parquet"

        data = _mock_wdi_data(years=[2020], pop=[7.8e9], le=[72.0])
        cache_path = client._cache_path(url)
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_bytes(_make_parquet_bytes(data))

        df = client._read_parquet(url, columns=["country", "year", "sp_pop_totl"])
        assert "sp_pop_totl" in df.columns
        assert "sp_dyn_le00_in" not in df.columns

    def test_download_creates_parent_dirs(self, tmp_cache):
        """_download creates intermediate directories if needed."""
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache)
        dest = tmp_cache / "sub" / "dir" / "file.parquet"

        # Mock httpx.stream to return a fake response
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.iter_bytes.return_value = [b"parquet-data"]
        mock_response.__enter__ = lambda s: s
        mock_response.__exit__ = MagicMock(return_value=False)

        with patch("httpx.stream", return_value=mock_response):
            client._download("https://example.com/file.parquet", dest)

        assert dest.exists()
        assert dest.read_bytes() == b"parquet-data"

    def test_download_raises_on_http_error(self, tmp_cache):
        """_download propagates HTTP errors."""
        import httpx

        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache)
        dest = tmp_cache / "fail.parquet"

        mock_response = MagicMock()
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "404", request=MagicMock(), response=MagicMock()
        )
        mock_response.__enter__ = lambda s: s
        mock_response.__exit__ = MagicMock(return_value=False)

        with (
            patch("httpx.stream", return_value=mock_response),
            pytest.raises(httpx.HTTPStatusError),
        ):
            client._download("https://example.com/missing.parquet", dest)

    # -- clear_cache --------------------------------------------------------

    def test_clear_cache(self, tmp_cache):
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache)

        # Create some fake cached files
        (tmp_cache / "file1.parquet").write_bytes(b"fake")
        (tmp_cache / "file2.parquet").write_bytes(b"fake")

        removed = client.clear_cache()
        assert removed == 2
        assert list(tmp_cache.iterdir()) == []

    def test_clear_cache_nonexistent_dir(self, tmp_path):
        """clear_cache returns 0 when cache directory doesn't exist."""
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_path / "nope")
        assert client.clear_cache() == 0

    def test_clear_cache_empty_dir(self, tmp_cache):
        """clear_cache returns 0 on an empty cache directory."""
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache)
        assert client.clear_cache() == 0

    def test_clear_cache_skips_subdirectories(self, tmp_cache):
        """clear_cache only removes files, not subdirectories."""
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache)
        (tmp_cache / "file.parquet").write_bytes(b"data")
        (tmp_cache / "subdir").mkdir()

        removed = client.clear_cache()
        assert removed == 1
        assert (tmp_cache / "subdir").is_dir()


# ---------------------------------------------------------------------------
# Indicator registry tests
# ---------------------------------------------------------------------------


class TestIndicatorRegistry:
    def test_all_indicators_have_required_fields(self):
        from pyworld3.adapters.owid.indicators import OWID_INDICATORS

        for key, indicator in OWID_INDICATORS.items():
            assert indicator.name == key
            assert indicator.parquet_url.startswith("https://")
            assert indicator.column != ""
            assert indicator.sector != ""

    def test_key_indicators_present(self):
        from pyworld3.adapters.owid.indicators import OWID_INDICATORS

        required = [
            "pop_total",
            "life_expectancy",
            "crude_birth_rate",
            "crude_death_rate",
            "fertility_rate",
            "gdp_current",
            "gdp_per_capita",
        ]
        for key in required:
            assert key in OWID_INDICATORS, f"Missing indicator: {key}"

    def test_indicator_count(self):
        from pyworld3.adapters.owid.indicators import OWID_INDICATORS

        assert len(OWID_INDICATORS) == 18

    def test_indicators_cover_all_sectors(self):
        from pyworld3.adapters.owid.indicators import OWID_INDICATORS

        sectors = {ind.sector for ind in OWID_INDICATORS.values()}
        assert "Population" in sectors
        assert "Capital" in sectors
        assert "Energy" in sectors
        assert "Resources" in sectors
        assert "Pollution" in sectors

    def test_indicator_defaults(self):
        """OWIDIndicator defaults for entity_column and year_column."""
        from pyworld3.adapters.owid.indicators import OWIDIndicator

        ind = OWIDIndicator(
            name="test",
            description="test",
            parquet_url="https://example.com/test.parquet",
            column="col",
        )
        assert ind.entity_column == "country"
        assert ind.year_column == "year"
        assert ind.unit == ""
        assert ind.sector == ""

    def test_indicator_is_frozen(self):
        """OWIDIndicator instances are immutable."""
        from pyworld3.adapters.owid.indicators import OWID_INDICATORS

        ind = OWID_INDICATORS["pop_total"]
        with pytest.raises(AttributeError):
            ind.name = "changed"

    def test_parquet_urls_end_with_parquet(self):
        from pyworld3.adapters.owid.indicators import OWID_INDICATORS

        for key, ind in OWID_INDICATORS.items():
            assert ind.parquet_url.endswith(".parquet"), (
                f"Indicator {key} URL doesn't end with .parquet: {ind.parquet_url}"
            )

    def test_wdi_indicators_share_same_url(self):
        """All WDI-based indicators point to the same parquet file."""
        from pyworld3.adapters.owid.indicators import OWID_INDICATORS

        wdi_indicators = [
            ind
            for ind in OWID_INDICATORS.values()
            if ind.sector in ("Population", "Capital", "Pollution")
            and "energy" not in ind.parquet_url
            and "minerals" not in ind.parquet_url
        ]
        urls = {ind.parquet_url for ind in wdi_indicators}
        assert len(urls) == 1, f"Expected 1 WDI URL, got {urls}"

    def test_package_exports(self):
        """The owid __init__ re-exports key symbols."""
        from pyworld3.adapters.owid import OWID_INDICATORS, OWIDClient, OWIDIndicator

        assert OWIDClient is not None
        assert OWIDIndicator is not None
        assert isinstance(OWID_INDICATORS, dict)


# ---------------------------------------------------------------------------
# Mapping registry tests
# ---------------------------------------------------------------------------


class TestMappingRegistry:
    def test_calibration_mappings_exist(self):
        from pyworld3.domain.mappings import get_calibration_mappings

        mappings = get_calibration_mappings()
        assert len(mappings) > 0
        params = {m.world3_param for m in mappings}
        assert "p1i" in params
        assert "p4i" in params
        assert "dcfsn" in params

    def test_validation_mappings_exist(self):
        from pyworld3.domain.mappings import get_validation_mappings

        mappings = get_validation_mappings()
        assert len(mappings) > 0
        params = {m.world3_param for m in mappings}
        assert "pop" in params
        assert "le" in params
        assert "cbr" in params
        assert "cdr" in params

    def test_all_mappings_reference_valid_indicators(self):
        from pyworld3.adapters.owid.indicators import OWID_INDICATORS
        from pyworld3.domain.mappings import INDICATOR_MAPPINGS

        for mapping in INDICATOR_MAPPINGS:
            assert mapping.owid_indicator in OWID_INDICATORS, (
                f"Mapping {mapping.world3_param} references unknown "
                f"indicator {mapping.owid_indicator}"
            )

    def test_calibration_mappings_reference_valid_constants(self):
        from pyworld3.domain.constants import CONSTANT_DEFAULTS
        from pyworld3.domain.mappings import get_calibration_mappings

        for mapping in get_calibration_mappings():
            assert mapping.world3_param in CONSTANT_DEFAULTS, (
                f"Calibration mapping references unknown constant "
                f"{mapping.world3_param}"
            )

    def test_validation_mappings_reference_valid_variables(self):
        from pyworld3.domain.constants import VARIABLE_META
        from pyworld3.domain.mappings import get_validation_mappings

        for mapping in get_validation_mappings():
            assert mapping.world3_param in VARIABLE_META, (
                f"Validation mapping references unknown variable {mapping.world3_param}"
            )

    def test_get_mapping_for_param(self):
        from pyworld3.domain.mappings import get_mapping_for_param

        mapping = get_mapping_for_param("p1i")
        assert mapping is not None
        assert mapping.world3_param == "p1i"

        assert get_mapping_for_param("nonexistent") is None


# ---------------------------------------------------------------------------
# CalibrationService tests
# ---------------------------------------------------------------------------


class TestCalibrationService:
    def _make_client_with_mock_data(self, tmp_cache, reference_year=1970):
        """Create an OWIDClient that returns mock data without HTTP."""
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache)

        # Mock data for reference year
        mock_values = {
            "sp_pop_totl": 3.7e9,
            "sp_pop_0014_to_zs": 37.1,
            "sp_pop_1564_to_zs": 57.6,
            "sp_pop_65up_to_zs": 5.3,
            "sp_dyn_tfrt_in": 4.74,
            "ny_gdp_mktp_cd": 2.9e12,
            "nv_ind_totl_zs": 38.0,
            "ne_gdi_totl_zs": 25.0,
            "en_atm_co2e_pp_gd": 0.95,
        }

        def mock_fetch_value(parquet_url, column, year, **kwargs):
            return mock_values.get(column)

        client.fetch_value = mock_fetch_value
        return client

    def test_calibrate_population_cohorts(self, tmp_cache):
        from pyworld3.application.calibrate import CalibrationService
        from pyworld3.application.ports import CalibrationParams

        client = self._make_client_with_mock_data(tmp_cache)
        service = CalibrationService(client=client)

        result = service.calibrate(
            CalibrationParams(
                reference_year=1970,
                parameters=["p1i", "p2i", "p3i", "p4i"],
            )
        )

        # p1i = 37.1% of 3.7e9 ≈ 1.37e9
        assert "p1i" in result.constants
        p1i = result.constants["p1i"].value
        assert p1i == pytest.approx(3.7e9 * 37.1 / 100.0)

        # p4i = 5.3% of 3.7e9 ≈ 1.96e8
        assert "p4i" in result.constants
        p4i = result.constants["p4i"].value
        assert p4i == pytest.approx(3.7e9 * 5.3 / 100.0)

        # Total should be close to 3.7e9
        total = sum(result.constants[p].value for p in ["p1i", "p2i", "p3i", "p4i"])
        assert total == pytest.approx(3.7e9, rel=0.01)

    def test_calibrate_fertility(self, tmp_cache):
        from pyworld3.application.calibrate import CalibrationService
        from pyworld3.application.ports import CalibrationParams

        client = self._make_client_with_mock_data(tmp_cache)
        service = CalibrationService(client=client)

        result = service.calibrate(
            CalibrationParams(
                reference_year=1970,
                parameters=["dcfsn"],
            )
        )

        assert "dcfsn" in result.constants
        assert result.constants["dcfsn"].value == pytest.approx(4.74)

    def test_calibrate_returns_provenance(self, tmp_cache):
        from pyworld3.application.calibrate import CalibrationService
        from pyworld3.application.ports import CalibrationParams

        client = self._make_client_with_mock_data(tmp_cache)
        service = CalibrationService(client=client)

        result = service.calibrate(
            CalibrationParams(reference_year=1970, parameters=["p1i"])
        )

        cc = result.constants["p1i"]
        assert cc.confidence == "high"
        assert cc.owid_indicator == "pop_0_14"
        assert cc.default_value == 65e7
        assert cc.description != ""

    def test_calibrate_to_constants_dict(self, tmp_cache):
        from pyworld3.application.calibrate import CalibrationService
        from pyworld3.application.ports import CalibrationParams

        client = self._make_client_with_mock_data(tmp_cache)
        service = CalibrationService(client=client)

        result = service.calibrate(CalibrationParams(reference_year=1970))
        constants_dict = result.to_constants_dict()

        assert isinstance(constants_dict, dict)
        assert all(isinstance(v, float) for v in constants_dict.values())

    def test_calibrate_warns_on_missing_data(self, tmp_cache):
        from pyworld3.adapters.owid.client import OWIDClient
        from pyworld3.application.calibrate import CalibrationService
        from pyworld3.application.ports import CalibrationParams

        client = OWIDClient(cache_dir=tmp_cache)
        # All fetches return None
        client.fetch_value = lambda *args, **kwargs: None

        service = CalibrationService(client=client)
        result = service.calibrate(CalibrationParams(reference_year=1970))

        assert len(result.warnings) > 0
        assert len(result.constants) == 0


# ---------------------------------------------------------------------------
# ValidationService tests
# ---------------------------------------------------------------------------


class TestValidationService:
    def _make_mock_sim_result(self):
        """Create a mock simulation result."""
        from pyworld3.application.ports import SimulationResult, TimeSeriesResult

        years = [float(y) for y in range(1900, 2101)]
        pop_values = [
            1.6e9 + (i / 200) * 6.2e9  # Linear growth from 1.6B to 7.8B
            for i in range(len(years))
        ]
        le_values = [
            30.0 + (i / 200) * 45.0  # Linear growth from 30 to 75
            for i in range(len(years))
        ]

        return SimulationResult(
            year_min=1900,
            year_max=2100,
            dt=1.0,
            time=years,
            constants_used={},
            series={
                "pop": TimeSeriesResult(name="pop", values=pop_values),
                "le": TimeSeriesResult(name="le", values=le_values),
                "cbr": TimeSeriesResult(name="cbr", values=[30.0] * len(years)),
                "cdr": TimeSeriesResult(name="cdr", values=[10.0] * len(years)),
            },
        )

    def _make_client_with_mock_timeseries(self, tmp_cache):
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache)

        mock_timeseries = {
            "sp_pop_totl": (
                [1960, 1970, 1980, 1990, 2000, 2010, 2020],
                [3.0e9, 3.7e9, 4.4e9, 5.3e9, 6.1e9, 6.9e9, 7.8e9],
            ),
            "sp_dyn_le00_in": (
                [1960, 1970, 1980, 1990, 2000, 2010, 2020],
                [52.6, 58.8, 63.0, 65.4, 67.7, 70.6, 72.7],
            ),
            "sp_dyn_cbrt_in": (
                [1960, 1970, 1980, 1990, 2000, 2010, 2020],
                [34.9, 32.5, 28.3, 26.0, 21.5, 19.4, 17.9],
            ),
            "sp_dyn_cdrt_in": (
                [1960, 1970, 1980, 1990, 2000, 2010, 2020],
                [17.7, 12.4, 10.7, 9.4, 8.7, 7.9, 7.6],
            ),
        }

        def mock_fetch_timeseries(parquet_url, column, **kwargs):
            data = mock_timeseries.get(column)
            if data is None:
                return [], []
            years, values = data
            year_min = kwargs.get("year_min")
            year_max = kwargs.get("year_max")
            filtered = [
                (y, v)
                for y, v in zip(years, values)
                if (year_min is None or y >= year_min)
                and (year_max is None or y <= year_max)
            ]
            if not filtered:
                return [], []
            return (
                [float(y) for y, _ in filtered],
                [float(v) for _, v in filtered],
            )

        client.fetch_timeseries = mock_fetch_timeseries
        return client

    def test_validate_returns_metrics(self, tmp_cache):
        from pyworld3.application.ports import ValidationParams
        from pyworld3.application.validate import ValidationService

        client = self._make_client_with_mock_timeseries(tmp_cache)
        service = ValidationService(client=client)

        sim_result = self._make_mock_sim_result()
        result = service.validate(sim_result, ValidationParams())

        assert "pop" in result.metrics
        assert "le" in result.metrics

    def test_validate_metrics_have_correct_fields(self, tmp_cache):
        from pyworld3.application.ports import ValidationParams
        from pyworld3.application.validate import ValidationService

        client = self._make_client_with_mock_timeseries(tmp_cache)
        service = ValidationService(client=client)

        sim_result = self._make_mock_sim_result()
        result = service.validate(sim_result, ValidationParams())

        pop_metric = result.metrics["pop"]
        assert pop_metric.variable == "pop"
        assert pop_metric.owid_indicator == "pop_total"
        assert pop_metric.n_points > 0
        assert not math.isnan(pop_metric.rmse)
        assert not math.isnan(pop_metric.correlation)
        assert pop_metric.overlap_years[0] <= pop_metric.overlap_years[1]

    def test_validate_specific_variables(self, tmp_cache):
        from pyworld3.application.ports import ValidationParams
        from pyworld3.application.validate import ValidationService

        client = self._make_client_with_mock_timeseries(tmp_cache)
        service = ValidationService(client=client)

        sim_result = self._make_mock_sim_result()
        result = service.validate(
            sim_result,
            ValidationParams(variables=["pop"]),
        )

        assert "pop" in result.metrics
        assert "le" not in result.metrics

    def test_validate_warns_on_missing_variable(self, tmp_cache):
        from pyworld3.application.ports import SimulationResult, ValidationParams
        from pyworld3.application.validate import ValidationService

        client = self._make_client_with_mock_timeseries(tmp_cache)
        service = ValidationService(client=client)

        # Simulation without the expected output
        sim_result = SimulationResult(
            year_min=1900,
            year_max=2100,
            dt=1.0,
            time=list(range(1900, 2101)),
            constants_used={},
            series={},
        )

        result = service.validate(sim_result, ValidationParams())
        assert len(result.warnings) > 0


# ---------------------------------------------------------------------------
# Numerical helper tests
# ---------------------------------------------------------------------------


class TestNumericalHelpers:
    def test_interpolate_at_exact_points(self):
        from pyworld3.application.validate import _interpolate_at

        result = _interpolate_at(
            [1.0, 2.0, 3.0],
            [10.0, 20.0, 30.0],
            [1.0, 2.0, 3.0],
        )
        assert result == pytest.approx([10.0, 20.0, 30.0])

    def test_interpolate_at_midpoints(self):
        from pyworld3.application.validate import _interpolate_at

        result = _interpolate_at(
            [0.0, 10.0],
            [0.0, 100.0],
            [5.0],
        )
        assert result == pytest.approx([50.0])

    def test_interpolate_at_out_of_range_skipped(self):
        from pyworld3.application.validate import _interpolate_at

        result = _interpolate_at(
            [2.0, 4.0],
            [20.0, 40.0],
            [1.0, 3.0, 5.0],
        )
        # Only 3.0 is in range
        assert len(result) == 1
        assert result[0] == pytest.approx(30.0)

    def test_compute_rmse(self):
        from pyworld3.application.validate import _compute_rmse

        # Perfect match
        assert _compute_rmse([1, 2, 3], [1, 2, 3]) == pytest.approx(0.0)
        # Known RMSE
        assert _compute_rmse([0, 0], [1, 1]) == pytest.approx(1.0)

    def test_compute_mape(self):
        from pyworld3.application.validate import _compute_mape

        # Perfect match
        assert _compute_mape([1, 2, 3], [1, 2, 3]) == pytest.approx(0.0)
        # 100% error
        assert _compute_mape([2, 4, 6], [1, 2, 3]) == pytest.approx(100.0)

    def test_compute_correlation(self):
        from pyworld3.application.validate import _compute_correlation

        # Perfect positive correlation
        assert _compute_correlation([1, 2, 3], [1, 2, 3]) == pytest.approx(1.0)
        # Perfect negative correlation
        assert _compute_correlation([1, 2, 3], [3, 2, 1]) == pytest.approx(-1.0)


# ---------------------------------------------------------------------------
# Transform function tests
# ---------------------------------------------------------------------------


class TestTransforms:
    def test_population_cohort_0_14(self):
        from pyworld3.domain.mappings import _population_cohort_0_14

        result = _population_cohort_0_14(37.1, {"pop_total": 3.7e9})
        assert result == pytest.approx(3.7e9 * 37.1 / 100.0)

    def test_population_cohort_65_plus(self):
        from pyworld3.domain.mappings import _population_cohort_65_plus

        result = _population_cohort_65_plus(5.3, {"pop_total": 3.7e9})
        assert result == pytest.approx(3.7e9 * 5.3 / 100.0)

    def test_fertility_to_dcfsn(self):
        from pyworld3.domain.mappings import _fertility_to_dcfsn

        assert _fertility_to_dcfsn(4.74, {}) == pytest.approx(4.74)

    def test_gdp_to_industrial_capital(self):
        from pyworld3.domain.mappings import _gdp_to_industrial_capital

        # With explicit industry share
        result = _gdp_to_industrial_capital(2.9e12, {"industry_value_added_pct": 38.0})
        expected = 2.9e12 * 38.0 / 100.0 / 7.7
        assert result == pytest.approx(expected)

    def test_capital_formation_to_icor(self):
        from pyworld3.domain.mappings import _capital_formation_to_icor

        result = _capital_formation_to_icor(25.0, {})
        assert result == pytest.approx(25.0 / 100.0 * 14.0)
