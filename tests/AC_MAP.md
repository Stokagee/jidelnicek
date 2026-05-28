# AC-* → test mapping

Every acceptance scenario from spec §6 (`AC-1` … `AC-12`) maps to at least one test
case. Tests are written **before** the implementation (tests-first); until the owning
epic's implementation ticket lands, each is a **skipped skeleton** (T-2.3) and then a
fully-written **`xfail`** body (the per-epic `T-x.1` ticket), flipping to passing when the
implementation (`T-x.2`+) is merged.

Status legend: `skeleton` = pending placeholder (skip) · `xfail` = full body, awaiting
impl · `pass` = green.

| AC | Scenario (§6) | Owning epic | pytest | Robot | Status |
|----|---------------|-------------|--------|-------|--------|
| AC-1 | Signup day outside dish block is rejected (BR-2) | EP-6 | `integration/test_ep6_signups.py::TestSignupApi::test_signup_day_outside_block_is_rejected_AC1` | `acceptance/suites/ep6_signups.robot` | xfail (T-6.1) |
| AC-2 | Portions must be ≥ 1 (BR-4) | EP-6 | `integration/test_ep6_signups.py::TestSignupApi::test_signup_portions_below_one_is_rejected_AC2` (+ DB-level `TestSignupDbConstraints::test_db_rejects_portions_below_one_BR4`, green) | — | xfail (T-6.1) |
| AC-3 | Re-signup updates existing row, no duplicate (BR-3) | EP-6 | `integration/test_ep6_signups.py::TestSignupApi::test_resignup_same_day_updates_existing_AC3` (+ DB-level `TestSignupDbConstraints::test_db_unique_active_signup_per_dish_user_day_BR3`, green) | — | xfail (T-6.1) |
| AC-4 | Day summary includes admin's own portions (FR-K1/K2) | EP-7 | `integration/test_ep7_summary.py::test_day_summary_includes_admin_own_portions_AC4` | — | skeleton |
| AC-5 | Non-chooser member cannot create a dish (FR-W4) | EP-4 | `integration/test_ep4_week_chooser.py::test_non_chooser_member_cannot_create_dish_AC5` | `acceptance/suites/ep4_week_chooser.robot` | xfail (T-4.1) |
| AC-6 | Member signs up to a chooser-proposed dish (FR-S3) | EP-6 | `integration/test_ep6_signups.py::TestSignupApi::test_member_signs_up_to_chooser_proposed_dish_AC6` | — | xfail (T-6.1) |
| AC-7 | Cancel → `signup_cancelled` outbox row, same txn (FR-N1/N2) | EP-8 | `integration/test_ep8_notifications.py::test_cancel_signup_writes_signup_cancelled_outbox_row_AC7` | — | skeleton |
| AC-8 | Increase portions → `signup_increased` outbox row, same txn (FR-N1/N2) | EP-8 | `integration/test_ep8_notifications.py::test_increase_portions_writes_signup_increased_outbox_row_AC8` | — | skeleton |
| AC-9 | Worker catch-up sends missed digest on startup (FR-N4) | EP-8 | `integration/test_ep8_notifications.py::test_worker_catch_up_sends_missed_digest_on_startup_AC9` | — | skeleton |
| AC-10 | Failed Discord delivery is retried (FR-N6) | EP-8 | `integration/test_ep8_notifications.py::test_failed_discord_delivery_is_retried_AC10` | — | skeleton |
| AC-11 | Valid claim token activates account, not reusable (FR-A3) | EP-3 | `integration/test_ep3_auth.py::test_claim_sets_name_password_then_token_reuse_fails_AC11` | `acceptance/suites/ep3_auth.robot` | xfail (T-3.1) |
| AC-12 | Non-creator/non-admin cannot delete a dish (FR-D5, BR-5) | EP-5 | `integration/test_ep5_dishes.py::test_non_creator_non_admin_member_cannot_delete_dish_AC12` | — | xfail (T-5.1) |

Robot acceptance suites exist for the AC marked end-to-end in the `testing` skill
(AC-1, AC-5, AC-11); the rest are covered at integration level.
