# Domácí jídelníček

Private home meal-planner for 4 housemates. One of them is the cook (and sole admin); the others sign up for portions per day. Every week, one member ("chooser") is allowed to propose dishes for that week. The cook gets near-immediate notifications on signup changes and a 6-hour digest of what to cook.

This is **not a public service**. It runs on the owner's home PC behind the household LAN — no internet exposure.

The locked product spec (single source of truth) lives in [`jidelnicek-docs-v1.md`](./jidelnicek-docs-v1.md). The operating manual for every coding session is [`CLAUDE.md`](./CLAUDE.md). The CZ→EN naming map is [`docs/glossary.md`](./docs/glossary.md).

---

## Stack

| Area | Choice |
|---|---|
| Backend | Python 3.12+ · FastAPI · uv |
| ORM / migrations | SQLAlchemy 2.x · Alembic |
| Worker / scheduler | Redis · arq |
| Frontend | React · Vite · pnpm |
| DB | PostgreSQL |
| Notifications | Discord (webhook) |
| Observability | Prometheus · Grafana |
| Tests | pytest (unit/integration) · Robot Framework (acceptance/API) |
| Orchestration | docker-compose |

---

## Repo layout

```
.
├── jidelnicek-docs-v1.md     # locked spec (CZ)
├── docs/glossary.md           # CZ → EN authoritative mapping
├── pyproject.toml             # uv workspace root
├── api/                       # FastAPI service
├── worker/                    # arq notifications worker
├── shared/                    # SQLAlchemy models, Alembic, config, channels
│   └── alembic/
├── web/                       # React + Vite + pnpm
├── infra/                     # docker-compose, prometheus, grafana
└── tests/                     # pytest + Robot Framework
```

---

## Prerequisites

- **uv** (Python package manager) — install: <https://docs.astral.sh/uv/getting-started/installation/>
- **pnpm** ≥ 9 and **Node** ≥ 20
- **Docker** + **docker compose** v2
- A shell that can run the documented commands. Windows (PowerShell), macOS, and Linux all work.

---

## First-time local setup

1. **Clone and enter the repo.**

   ```sh
   git clone https://github.com/Stokagee/jidelnicek.git
   cd jidelnicek
   ```

2. **Copy and fill `.env`.**

   ```sh
   cp .env.example .env
   # Edit .env. At minimum set: POSTGRES_PASSWORD, SESSION_SECRET,
   # ADMIN_NAME, ADMIN_PASSWORD, DISCORD_WEBHOOK_URL.
   ```

3. **Install backend deps** (Python 3.12+ via uv).

   ```sh
   uv sync
   ```

4. **Install frontend deps.**

   ```sh
   cd web
   pnpm install
   cd ..
   ```

5. **Start the stack.**

   ```sh
   docker compose -f infra/docker-compose.yml --env-file .env up -d
   ```

6. **Run migrations.**

   ```sh
   uv run alembic -c shared/alembic.ini upgrade head
   ```

7. **Seed the database** (creates admin from `.env` + 3 unclaimed members + this week's row; prints claim tokens for the 3 members to stdout — copy them and share with the housemates).

   ```sh
   uv run seed
   ```

> **Migrations are not optional.** The API verifies at startup that the database
> is on the latest Alembic revision and refuses to start otherwise (issue #69) —
> so after pulling changes that add a migration, run step 6 again before starting
> the api, or you'll get a clear `Database schema is out of date` error instead of
> a confusing 500 mid-request.

The web app is at <http://localhost:5173>, the API at <http://localhost:8000>, Prometheus at <http://localhost:9090>, and Grafana at <http://localhost:3000>.

---

## Day-to-day commands

### Backend (api / worker / shared)

```sh
# Lint + format check
uv run ruff check .
uv run ruff format --check .

# Auto-fix
uv run ruff check . --fix
uv run ruff format .

# Migrations
uv run alembic -c shared/alembic.ini revision -m "describe change" --autogenerate
uv run alembic -c shared/alembic.ini upgrade head
uv run alembic -c shared/alembic.ini downgrade -1   # local rollback only

# Tests (unit + integration)
uv run pytest
```

### Tests

Unit and integration tests use **pytest** against a **dedicated, disposable Postgres
database** — never the dev DB. The suite creates the database if missing, runs the Alembic
migrations into it, and rolls back each test in its own transaction.

Prerequisites: the `db` service running (`docker compose … up -d db`) and a `.env` (the suite
loads it automatically). The test DB URL is taken from `TEST_DATABASE_URL`, or derived from
`DATABASE_URL` (host `db`→`localhost`, name suffixed `_test`).

```sh
uv run pytest                 # unit + integration
uv run pytest -m "not slow"   # fast loop
uv run pytest -rx             # show xfail list = the tests-first backlog
```

Feature tests are written **before** their implementation (BDD / tests-first); until the
owning epic lands they are marked `xfail`, so a green run is expected.

**Acceptance / API tests (Robot Framework).** These drive the cookie-session flow exactly as
the browser does and use [TalosForge](../robotframework-talosforge) (a sibling repo, wired as a
uv path dependency) for schema-driven request payloads and strict response validation. They
need a **running api**:

```sh
uv run uvicorn api.main:app --host 127.0.0.1 --port 8000   # in one shell
uv run robot --outputdir results/robot tests/acceptance/suites   # in another
```

`${API_BASE_URL}` defaults to `http://127.0.0.1:8000` (override with
`robot -v API_BASE_URL:<url> …`). Shared keywords live in
`tests/acceptance/resources/`, request schemas in `tests/acceptance/schemas/`.

Tests-first AC suites whose endpoints aren't implemented yet are tagged `notready`.
Run with `--skiponfailure notready` so they report as **skipped** (not failed) until
the owning epic lands:

```sh
uv run robot --skiponfailure notready --outputdir results/robot tests/acceptance/suites
```

### Frontend (web)

```sh
cd web
pnpm dev               # Vite dev server at :5173
pnpm lint              # ESLint
pnpm format            # Prettier write
pnpm format:check      # Prettier check
pnpm build             # production build
pnpm test              # vitest (unit/component) — pinned to Europe/Prague (BR-9)
pnpm test:watch        # vitest watch mode
pnpm test:cov          # vitest with v8 coverage
pnpm typecheck         # tsc against tests + src
```

Unit/component tests use **vitest + React Testing Library** (jsdom), co-located as
`*.test.ts(x)` next to the source. Shared harness (frozen Prague clock, builders, a
`mockFetch` that enforces the cookies-only rule) lives in `web/src/test/`.

**Frontend acceptance (Robot Framework + Browser Library).** The `fe_*` suites under
`tests/acceptance/suites/` drive the real UI on a 360px mobile context: they **seed over
HTTP** (`resources/api_session.resource`) and **drive over the browser**
(`resources/browser_session.resource` + `resources/pages/*.resource`). One-time setup
(downloads the Playwright browsers):

```sh
uv sync --extra dev          # installs robotframework-browser
uv run rfbrowser init        # downloads the browser binaries (one-time)
```

Then, with **both** api (:8000) and web (:5173) running:

```sh
uv run robot --skiponfailure notready --outputdir results/robot tests/acceptance/suites/fe_*.robot
```

Like the API suites, screen suites are tagged `notready` until the owning `T-x.3` ships
(`${WEB_BASE_URL}` defaults to `http://127.0.0.1:5173`).

### Stack control

```sh
docker compose -f infra/docker-compose.yml --env-file .env up -d
docker compose -f infra/docker-compose.yml --env-file .env logs -f api
docker compose -f infra/docker-compose.yml --env-file .env down
```

---

## Conventions

- **Single source of truth:** the spec in `jidelnicek-docs-v1.md`. Don't invent requirements not in it.
- **Stable IDs:** `FR-*`, `BR-*`, `AC-*`, `DM-*`, `EP-*`, `T-*` are anchors — never renumbered.
- **Additive schema only:** new things are nullable columns / side tables / new endpoints. Never edit a shipped migration.
- **Tests first:** from EP-3 onward, tests come before the implementation.
- **English everywhere:** code, DB columns, endpoints, commit messages, file names. Map CZ → EN via `docs/glossary.md`.
- **Times and dates in `Europe/Prague`** (BR-9).
- **Branch per ticket:** `feat/t-<n>.<m>`, one PR per ticket.

---

## License

This is a **private project** intended only for use by the owner's household. No public license is granted.
