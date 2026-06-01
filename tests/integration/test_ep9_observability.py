"""EP-9 · Observability (FR-O) — T-9.1 /metrics.

Implements FR-O1: the api exposes `/metrics` in Prometheus text format with
request count, a latency histogram, and in-flight requests. Error rate is
derivable from the per-status request counter (5xx).
"""

from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

_INFRA = Path(__file__).resolve().parents[2] / "infra"
_DATASOURCES = _INFRA / "grafana" / "provisioning" / "datasources" / "datasources.yml"
_SAMPLE_DASHBOARD = _INFRA / "grafana" / "provisioning" / "dashboards" / "sample.json"


def test_metrics_endpoint_is_prometheus_text_FR_O1(client: TestClient) -> None:
    """FR-O1: `/metrics` returns Prometheus exposition format (not JSON)."""
    resp = client.get("/metrics")

    assert resp.status_code == 200
    # Prometheus exposition is text/plain with a version parameter.
    assert resp.headers["content-type"].startswith("text/plain")
    body = resp.text
    # `# HELP` / `# TYPE` lines are the hallmark of the exposition format.
    assert "# HELP" in body
    assert "# TYPE" in body


def test_metrics_exposes_required_series_FR_O1(client: TestClient) -> None:
    """FR-O1: request count, latency histogram, and in-flight gauge are present.

    A prior request must be recorded so the per-handler series materialise.
    """
    assert client.get("/healthz").status_code == 200

    body = client.get("/metrics").text

    # Request count (also yields error rate via the `status` label).
    assert "http_requests_total" in body
    # Latency histogram (buckets + _count + _sum).
    assert "http_request_duration_seconds" in body
    # In-flight requests gauge.
    assert "http_requests_inprogress" in body


def test_metrics_uses_templated_route_label_not_high_cardinality_FR_O1(
    client: TestClient,
) -> None:
    """Skill rule 2: labels are the templated route, method, status — never a raw
    per-request path. Hitting `/healthz` must label the series as `/healthz`."""
    client.get("/healthz")

    body = client.get("/metrics").text

    assert 'handler="/healthz"' in body


def test_grafana_has_prometheus_and_postgres_datasources_FR_O3() -> None:
    """FR-O3: provisioning ships both datasources, and the Postgres one uses a
    read-only role with its password sourced from the environment (skill rule 3)."""
    text = _DATASOURCES.read_text(encoding="utf-8")

    assert "type: prometheus" in text
    assert "type: postgres" in text
    # Read-only role, not the app/admin user; secret comes from env interpolation.
    assert "grafana_ro" in text
    assert "${GRAFANA_DB_PASSWORD}" in text


def test_sample_dashboard_has_api_health_and_business_panels_FR_O3() -> None:
    """FR-O3: one sample dashboard with Prometheus API-health panels and a
    business panel that queries the `signups` table over the Postgres datasource."""
    dashboard = json.loads(_SAMPLE_DASHBOARD.read_text(encoding="utf-8"))

    panels = dashboard["panels"]
    datasource_types = {
        t["datasource"]["type"]
        for p in panels
        for t in p.get("targets", [])
        if isinstance(t.get("datasource"), dict)
    }
    assert "prometheus" in datasource_types
    assert "postgres" in datasource_types

    # The business panel runs a real query against `signups` (DoD T-9.3).
    sql = "\n".join(
        t.get("rawSql", "")
        for p in panels
        for t in p.get("targets", [])
    )
    assert "signups" in sql
