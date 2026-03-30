"""Fixtures for end-to-end browser tests."""

import socket
import threading
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture(scope="session")
def base_url():
    """Start the static web app on a free port and yield the base URL."""
    port = _free_port()
    static_root = Path(__file__).resolve().parents[2] / "app" / "static"
    handler = partial(SimpleHTTPRequestHandler, directory=str(static_root))
    server = ThreadingHTTPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.5):
                break
        except OSError:
            time.sleep(0.1)
    else:
        pytest.fail("Static server did not start in time")

    yield f"http://127.0.0.1:{port}"

    server.shutdown()
    thread.join(timeout=5)
