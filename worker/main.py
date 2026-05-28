"""arq worker entry point.

T-0.1 ships a placeholder that blocks forever so the `worker` container stays
up under docker compose. The real arq settings, tasks, and scheduler live in
EP-8.
"""

from __future__ import annotations

import asyncio
import logging


async def _placeholder() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    log = logging.getLogger("worker")
    log.info("worker placeholder — real tasks land in EP-8")
    while True:
        await asyncio.sleep(3600)


def cli() -> None:
    asyncio.run(_placeholder())
