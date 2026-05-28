"""FastAPI HTTP client fixtures.

`client` is a `TestClient` over the real app with its DB-session dependency
overridden to the per-test `db_session`, so a request sees exactly the rows a
test set up via factories and writes them into the same rolled-back transaction.

Tests-first note: the api currently exposes only `/healthz`. The session
dependency contract for EP-3+ is `api.deps.get_session`; until that module
exists the override is a no-op (HTTP feature tests xfail on 404 until the
endpoints land). `login` / `claim` / `get_me` are thin cookie-session helpers
returning the raw `Response` for the caller to assert on.
"""

from __future__ import annotations

import importlib
from collections.abc import Callable, Iterator

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

#: Import path of the api's DB-session dependency (the seam EP-3 must provide).
_SESSION_DEPENDENCY_PATHS = ("api.deps.get_session",)


def _override_session_dependency(app: FastAPI, session: Session) -> None:
    for path in _SESSION_DEPENDENCY_PATHS:
        module_name, _, attr = path.rpartition(".")
        try:
            module = importlib.import_module(module_name)
            dependency = getattr(module, attr)
        except (ImportError, AttributeError):
            continue
        app.dependency_overrides[dependency] = lambda: session


@pytest.fixture
def app(db_session: Session) -> Iterator[FastAPI]:
    from api.main import app as fastapi_app

    _override_session_dependency(fastapi_app, db_session)
    try:
        yield fastapi_app
    finally:
        fastapi_app.dependency_overrides.clear()


@pytest.fixture
def client(app: FastAPI) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def login(client: TestClient) -> Callable[[str, str], httpx.Response]:
    def _login(name: str, password: str) -> httpx.Response:
        return client.post("/auth/login", json={"name": name, "password": password})

    return _login


@pytest.fixture
def claim(client: TestClient) -> Callable[[str, str, str], httpx.Response]:
    def _claim(token: str, name: str, password: str) -> httpx.Response:
        return client.post(
            "/auth/claim",
            json={"token": token, "name": name, "password": password},
        )

    return _claim


@pytest.fixture
def get_me(client: TestClient) -> Callable[[], httpx.Response]:
    def _get_me() -> httpx.Response:
        return client.get("/me")

    return _get_me
