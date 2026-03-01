"""OWID data client -- fetches parquet files from the OWID catalog.

Handles HTTP fetching, local file-based caching with a configurable TTL,
and basic filtering by entity and year range. Returns pandas DataFrames.

This module requires the ``owid`` optional dependency group:
``pip install pyworld3[owid]``.
"""

from __future__ import annotations

import hashlib
import logging
import time
from pathlib import Path
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    import pandas as pd

logger = logging.getLogger(__name__)

_DEFAULT_CACHE_DIR = Path.home() / ".cache" / "pyworld3" / "owid"
_DEFAULT_TTL_SECONDS = 30 * 24 * 3600  # 30 days
_DEFAULT_ENTITY = "World"


class OWIDClient:
    """Fetches and caches OWID parquet data.

    Parameters
    ----------
    cache_dir
        Local directory for cached parquet files.
    ttl_seconds
        Time-to-live for cached files in seconds.
    default_entity
        Default entity to filter by (World3 is a global model).
    """

    def __init__(
        self,
        cache_dir: Path = _DEFAULT_CACHE_DIR,
        ttl_seconds: int = _DEFAULT_TTL_SECONDS,
        default_entity: str = _DEFAULT_ENTITY,
    ) -> None:
        self.cache_dir = cache_dir
        self.ttl_seconds = ttl_seconds
        self.default_entity = default_entity

    def fetch_indicator(
        self,
        parquet_url: str,
        column: str,
        *,
        entity: str | None = None,
        entity_column: str = "country",
        year_column: str = "year",
        year_min: int | None = None,
        year_max: int | None = None,
    ) -> pd.DataFrame:
        """Fetch a single indicator column from an OWID parquet file.

        Returns a DataFrame with columns ``[year_column, column]``
        filtered by entity and year range.
        """
        entity = entity or self.default_entity

        df = self._read_parquet(
            parquet_url, columns=[entity_column, year_column, column]
        )

        # Filter by entity
        df = df[df[entity_column] == entity]

        # Filter by year range
        if year_min is not None:
            df = df[df[year_column] >= year_min]
        if year_max is not None:
            df = df[df[year_column] <= year_max]

        # Drop entity column, keep year + value
        df = df[[year_column, column]].dropna(subset=[column])
        df = df.sort_values(year_column).reset_index(drop=True)

        return df

    def fetch_value(
        self,
        parquet_url: str,
        column: str,
        year: int,
        *,
        entity: str | None = None,
        entity_column: str = "country",
        year_column: str = "year",
    ) -> float | None:
        """Fetch a single value for a specific year.

        Returns None if no data available for the requested year.
        """
        df = self.fetch_indicator(
            parquet_url,
            column,
            entity=entity,
            entity_column=entity_column,
            year_column=year_column,
            year_min=year,
            year_max=year,
        )
        if df.empty:
            return None
        return float(df[column].iloc[0])

    def fetch_timeseries(
        self,
        parquet_url: str,
        column: str,
        *,
        entity: str | None = None,
        entity_column: str = "country",
        year_column: str = "year",
        year_min: int | None = None,
        year_max: int | None = None,
    ) -> tuple[list[float], list[float]]:
        """Fetch a time series as (years, values) tuples.

        Convenience wrapper around :meth:`fetch_indicator`.
        """
        df = self.fetch_indicator(
            parquet_url,
            column,
            entity=entity,
            entity_column=entity_column,
            year_column=year_column,
            year_min=year_min,
            year_max=year_max,
        )
        years = df[year_column].astype(float).tolist()
        values = df[column].astype(float).tolist()
        return years, values

    # ------------------------------------------------------------------
    # Parquet fetching with cache
    # ------------------------------------------------------------------

    def _read_parquet(
        self,
        url: str,
        columns: list[str] | None = None,
    ) -> Any:
        """Read a parquet file, using the local cache if available."""
        import pandas as _pd

        cache_path = self._cache_path(url)

        if cache_path.exists() and not self._is_expired(cache_path):
            logger.debug("Cache hit: %s", cache_path)
            return _pd.read_parquet(cache_path, columns=columns)

        logger.info("Fetching %s", url)
        self._download(url, cache_path)
        return _pd.read_parquet(cache_path, columns=columns)

    def _cache_path(self, url: str) -> Path:
        """Deterministic local path for a remote URL."""
        url_hash = hashlib.sha256(url.encode()).hexdigest()[:16]
        filename = url.rsplit("/", 1)[-1]
        return self.cache_dir / f"{url_hash}_{filename}"

    def _is_expired(self, path: Path) -> bool:
        """Check whether a cached file has exceeded the TTL."""
        age = time.time() - path.stat().st_mtime
        return age > self.ttl_seconds

    def _download(self, url: str, dest: Path) -> None:
        """Download a URL to a local file using httpx."""
        import httpx

        dest.parent.mkdir(parents=True, exist_ok=True)
        with httpx.stream("GET", url, follow_redirects=True, timeout=120.0) as resp:
            resp.raise_for_status()
            with dest.open("wb") as f:
                for chunk in resp.iter_bytes(chunk_size=65536):
                    f.write(chunk)
        logger.info("Cached %s -> %s", url, dest)

    def clear_cache(self) -> int:
        """Remove all cached files. Returns the number of files removed."""
        if not self.cache_dir.exists():
            return 0
        count = 0
        for path in self.cache_dir.iterdir():
            if path.is_file():
                path.unlink()
                count += 1
        return count
