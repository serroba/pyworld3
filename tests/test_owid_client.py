"""Tests for OWIDClient: fetching, filtering, caching, and downloads."""

from __future__ import annotations

import os
import time
from unittest.mock import MagicMock, patch

import pytest

from .conftest import make_parquet_bytes, mock_wdi_data, requires_pandas


@requires_pandas
class TestOWIDClientFetch:
    def test_fetch_indicator_filters_by_entity_and_year(
        self, tmp_cache, mock_wdi_parquet
    ):
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache)

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


@requires_pandas
class TestOWIDClientCache:
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

        data = mock_wdi_data(
            years=[2020],
            pop=[7.8e9],
        )
        cache_path = client._cache_path("https://example.com/test.parquet")
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_bytes(make_parquet_bytes(data))

        with patch.object(client, "_download") as mock_download:
            df = client._read_parquet("https://example.com/test.parquet")

        mock_download.assert_not_called()
        assert not df.empty

    def test_cache_miss_triggers_download(self, tmp_cache):
        """When no cached file exists, _download is called."""
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache, ttl_seconds=3600)
        url = "https://example.com/missing.parquet"

        data = mock_wdi_data(years=[2020], pop=[7.8e9])

        def fake_download(_url, dest):
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(make_parquet_bytes(data))

        with patch.object(client, "_download", side_effect=fake_download) as mock_dl:
            df = client._read_parquet(url)

        mock_dl.assert_called_once()
        assert not df.empty

    def test_expired_cache_triggers_redownload(self, tmp_cache):
        """When cached file is past TTL, _download is called again."""
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache, ttl_seconds=60)
        url = "https://example.com/stale.parquet"

        data = mock_wdi_data(years=[2020], pop=[7.8e9])
        parquet_bytes = make_parquet_bytes(data)

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

        data = mock_wdi_data(years=[2020], pop=[7.8e9], le=[72.0])
        cache_path = client._cache_path(url)
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_bytes(make_parquet_bytes(data))

        df = client._read_parquet(url, columns=["country", "year", "sp_pop_totl"])
        assert "sp_pop_totl" in df.columns
        assert "sp_dyn_le00_in" not in df.columns


@requires_pandas
class TestOWIDClientDownload:
    def test_download_creates_parent_dirs(self, tmp_cache):
        """_download creates intermediate directories if needed."""
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache)
        dest = tmp_cache / "sub" / "dir" / "file.parquet"

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


@requires_pandas
class TestOWIDClientClearCache:
    def test_clear_cache(self, tmp_cache):
        from pyworld3.adapters.owid.client import OWIDClient

        client = OWIDClient(cache_dir=tmp_cache)

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
