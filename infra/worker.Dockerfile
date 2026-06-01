# syntax=docker/dockerfile:1.7
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

COPY --from=ghcr.io/astral-sh/uv:0.9.11 /uv /usr/local/bin/uv

WORKDIR /app

# README.md is required by hatchling when `uv sync` builds the local package.
COPY pyproject.toml uv.lock README.md ./
COPY api/__init__.py api/__init__.py
COPY worker/__init__.py worker/__init__.py
COPY shared/__init__.py shared/__init__.py
COPY shared/scripts/__init__.py shared/scripts/__init__.py
RUN uv sync --frozen --no-dev

COPY worker/ worker/
COPY shared/ shared/

# --frozen --no-dev: skip runtime re-resolve and the dev-only editable TalosForge
# path (absent from the image); see api.Dockerfile.
CMD ["uv", "run", "--frozen", "--no-dev", "worker"]
