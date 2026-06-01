# syntax=docker/dockerfile:1.7
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

# uv (pinned upstream; floats fine for a private home app)
COPY --from=ghcr.io/astral-sh/uv:0.9.11 /uv /usr/local/bin/uv

WORKDIR /app

# Install deps first (cached) using only the lockfile + pyproject.
# README.md is required: hatchling reads `readme` from pyproject when it builds
# the local `jidelnicek` package during `uv sync`.
COPY pyproject.toml uv.lock README.md ./
COPY api/__init__.py api/__init__.py
COPY worker/__init__.py worker/__init__.py
COPY shared/__init__.py shared/__init__.py
COPY shared/scripts/__init__.py shared/scripts/__init__.py
RUN uv sync --frozen --no-dev

# Copy source last so iterating on code doesn't bust the deps layer.
COPY api/ api/
COPY worker/ worker/
COPY shared/ shared/

EXPOSE 8000
# --frozen --no-dev: don't re-resolve at runtime and skip dev deps, otherwise uv
# tries to install the dev-only editable TalosForge path that isn't in the image.
CMD ["uv", "run", "--frozen", "--no-dev", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
