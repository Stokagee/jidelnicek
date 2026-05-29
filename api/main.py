"""FastAPI application entry point.

Routers are added per epic. EP-3 wires the auth/account endpoints (FR-A).
"""

from __future__ import annotations

import os

from fastapi import FastAPI

from api.routers import auth


def create_app() -> FastAPI:
    app = FastAPI(title="jidelnicek api", version="0.1.0")

    @app.get("/healthz")
    def healthz() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(auth.router)
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
