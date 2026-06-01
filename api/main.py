"""FastAPI application entry point.

Routers are added per epic. EP-3 wires the auth/account endpoints (FR-A).
"""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from api.routers import auth, dishes, signups, summary, weeks
from shared.config import get_settings
from shared.db import get_engine
from shared.schema_version import verify_schema_up_to_date


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
    return app


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
