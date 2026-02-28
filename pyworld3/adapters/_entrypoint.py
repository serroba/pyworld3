import sys


def main():
    try:
        from .cli import app
    except ImportError:
        print(
            "Error: the pyworld3 CLI requires extra dependencies.\n"
            "Install them with: pip install pyworld3[app]",
            file=sys.stderr,
        )
        sys.exit(1)
    app()
