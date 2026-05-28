# syntax=docker/dockerfile:1.7
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

COPY --from=ghcr.io/astral-sh/uv:0.9.11 /uv /usr/local/bin/uv

WORKDIR /app

COPY pyproject.toml uv.lock ./
COPY api/__init__.py api/__init__.py
COPY worker/__init__.py worker/__init__.py
COPY shared/__init__.py shared/__init__.py
COPY shared/scripts/__init__.py shared/scripts/__init__.py
RUN uv sync --frozen --no-dev

COPY worker/ worker/
COPY shared/ shared/

# T-0.2 placeholder: real arq settings/tasks come in EP-8.
CMD ["uv", "run", "worker"]
