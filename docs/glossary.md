# Glossary — CZ → EN authoritative mapping

The spec (`jidelnicek-docs-v1.md`) is written in Czech. The code, DB, endpoints, file names, commit messages, and skills are **English**. This file is the canonical translation. Use these names exactly — do not invent alternatives.

If you encounter a Czech identifier from the spec that is not listed here, **add it to this file first**, then use the new English form in code. The spec ID anchors (`FR-*`, `BR-*`, `AC-*`, `DM-*`, `EP-*`, `T-*`) are **never** translated — they are stable anchors.

---

## Roles and domain terms

| Spec (CZ) | Code / DB (EN) | Notes |
|---|---|---|
| kuchař / admin | cook / admin | The single `is_cook = true` user — also the only admin in V1. |
| člen | member | The other 3 users. |
| volitel | chooser | The member who proposes dishes for a given week. |
| blok | block | A dish's `start_date`–`end_date` range. |
| slot `obed` | slot `lunch` | V1 default and only used value. |
| slot `vecere` | slot `dinner` | Present in enum for forward-compat; no logic in V1. |
| porce | portion | Per-day count, ≥ 1 (BR-4). |
| outbox | outbox | The `notifications` table — also the durability mechanism (FR-N2). |
| catch-up | catch-up | Recovering a missed 6h digest after PC wake (FR-N4). |

## Tables

| Spec (CZ) | Code / DB (EN) |
|---|---|
| uživatelé | `users` |
| týdny | `weeks` |
| jídla | `dishes` |
| přihlášky | `signups` |
| notifikace | `notifications` |
| stav plánovače | `scheduler_state` |

## Columns

### `users` (DM-users)

| Spec (CZ) | Code / DB (EN) |
|---|---|
| `jmeno` | `name` |
| `heslo_hash` | `password_hash` |
| `je_kuchar` | `is_cook` |
| `claim_token_hash` | `claim_token_hash` |
| `claimed_at` | `claimed_at` |

### `weeks` (DM-weeks)

| Spec (CZ) | Code / DB (EN) |
|---|---|
| `datum_od` | `start_date` |
| `volitel_id` | `chooser_id` |

### `dishes` (DM-dishes)

| Spec (CZ) | Code / DB (EN) |
|---|---|
| `tyden_id` | `week_id` |
| `nazev` | `name` |
| `navrhl_id` | `proposed_by_id` |
| `cook_id` | `cook_id` |
| `slot` | `slot` |
| `datum_od` | `start_date` |
| `datum_do` | `end_date` |
| `cena_za_porci` | `price_per_portion` |
| `deleted_at` | `deleted_at` |

### `signups` (DM-signups)

| Spec (CZ) | Code / DB (EN) |
|---|---|
| `jidlo_id` | `dish_id` |
| `user_id` | `user_id` |
| `den` | `day` |
| `pocet_porci` | `portions` |
| `deleted_at` | `deleted_at` |

### `notifications` (DM-notifications)

| Spec (CZ) | Code / DB (EN) |
|---|---|
| `typ` | `type` |
| `payload` | `payload` |
| `kanal` | `channel` |
| `stav` | `status` |
| `pokusy` | `attempts` |
| `posledni_chyba` | `last_error` |
| `odeslano_at` | `sent_at` |

### `scheduler_state` (DM-scheduler_state)

| Spec (CZ) | Code / DB (EN) |
|---|---|
| `klic` | `key` |
| `last_run_at` | `last_run_at` |

---

## Enum values (already English in the spec — kept as-is)

- notification `type`: `signup_created` | `signup_increased` | `signup_decreased` | `signup_cancelled` | `dish_proposed` | `digest`
- notification `channel`: `discord` | `telegram`
- notification `status`: `pending` | `sent` | `failed`
- dish `slot`: `lunch` | `dinner` (CZ `obed`/`vecere` → EN above)

---

## Endpoints

Spec §9 paths are mostly already English. The single translation is:

| Spec | Code |
|---|---|
| `PUT /weeks/{id}/volitel` | `PUT /weeks/{id}/chooser` |

All other paths (`/auth/claim`, `/auth/login`, `/me`, `/admin/users/{id}/claim-token`, `/weeks/current`, `/dishes`, `/signups`, `/summary`, `/metrics`) are used verbatim.
