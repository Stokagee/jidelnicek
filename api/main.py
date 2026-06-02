"""FastAPI application entry point.

Routers are added per epic. EP-3 wires the auth/account endpoints (FR-A).
"""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator, metrics

from api.routers import auth, dishes, settings, signups, summary, weeks
from shared.config import get_settings
from shared.db import get_engine
from shared.schema_version import verify_schema_up_to_date

# FR-O1: LAN traffic is fast, so the histogram buckets cluster at the low end
# (5ms..1s) instead of Prometheus' web-scale defaults.
_LATENCY_BUCKETS = (0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    # Issue #69: refuse to serve against a database that is behind the code's
    # migrations, so drift surfaces as one clear startup error instead of a
    # cryptic UndefinedColumn 500 on a random request.
    if get_settings().verify_schema_on_startup:
        verify_schema_up_to_date(get_engine())
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="jidelnicek api", version="0.1.0", lifespan=lifespan)

    @app.get("/healthz")
    def healthz() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(auth.router)
    app.include_router(weeks.router)
    app.include_router(dishes.router)
    app.include_router(signups.router)
    app.include_router(summary.router)
    app.include_router(settings.router)

    _instrument(app)
    return app


def _instrument(app: FastAPI) -> None:
    """FR-O1: expose `/metrics` in Prometheus format.

    Labels are the templated route (`handler`), `method`, and `status` only —
    no per-request paths or domain ids — so cardinality stays bounded (skill
    rule 2). Business cardinality lives in the Grafana Postgres datasource, not
    here. Series exposed: request count, latency histogram, in-flight gauge.
    """
    instrumentator = Instrumentator(
        should_group_status_codes=False,
        should_instrument_requests_inprogress=True,
        inprogress_labels=True,
        excluded_handlers=["/metrics"],
    )
    instrumentator.add(metrics.requests())
    instrumentator.add(metrics.latency(buckets=_LATENCY_BUCKETS))
    instrumentator.instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)


app = create_app()


def cli() -> None:
    """Entry point used by `uv run api`. Local dev only."""
    import uvicorn

    uvicorn.run(
        "api.main:app",
        host=os.getenv("API_HOST", "0.0.0.0"),
        port=int(os.getenv("API_PORT", "8000")),
        reload=True,
    )
