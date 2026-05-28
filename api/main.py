"""FastAPI application entry point.

T-0.1 ships a minimal app with a single `/healthz` route so the api service
can boot under docker compose. Real routers (auth, weeks, dishes, signups,
summary, metrics) are added per their respective epics.
"""

from __future__ import annotations

import os

from fastapi import FastAPI

app = FastAPI(title="jidelnicek api", version="0.1.0")


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


def cli() -> None:
    """Entry point used by `uv run api`. Local dev only."""
    import uvicorn

    uvicorn.run(
        "api.main:app",
        host=os.getenv("API_HOST", "0.0.0.0"),
        port=int(os.getenv("API_PORT", "8000")),
        reload=True,
    )
