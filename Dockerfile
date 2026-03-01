FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:0.10.2 /uv /uvx /bin/

WORKDIR /app

COPY pyproject.toml README.md ./
COPY pyworld3/__init__.py pyworld3/__init__.py
RUN uv sync --no-dev --extra app

COPY pyworld3/ pyworld3/
COPY app/ app/

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "pyworld3.adapters.api:app", "--host", "0.0.0.0", "--port", "8000"]
