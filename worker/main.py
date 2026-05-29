"""arq worker entry point.

Run via arq: `arq worker.runtime.WorkerSettings`. The `cli()` below (wired to
`uv run worker`) runs the same settings programmatically for local dev.
"""

from __future__ import annotations


def cli() -> None:
    from arq import run_worker

    from worker.runtime import WorkerSettings

    run_worker(WorkerSettings)
