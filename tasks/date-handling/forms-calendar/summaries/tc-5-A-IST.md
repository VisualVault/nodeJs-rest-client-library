# TC-5-A-IST — Summary

**Spec**: [tc-5-A-IST.md](../test-cases/tc-5-A-IST.md)
**Current status**: FAIL-3 — last run 2026-04-01 (IST)
**Bug surface**: Bug #7 — preset Date object has wrong UTC date in IST

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-01 | IST | FAIL-3  | [run-1](../runs/tc-5-A-IST-run-1.md) |

## Current Interpretation

Bug #7 confirmed on the preset/form-init path — a major scope expansion. `initCalendarValueV1()` constructs the preset Date via `moment("2026-03-01").toDate()` → IST midnight (Feb 28 18:30 UTC). The display shows `03/01/2026` (correct local date), masking the bug, but saving would permanently store `"2026-02-28"`. This resolves the 3-A-BRT-IST mystery: saved records survive reload as strings (no Date construction), while presets trigger Date construction (Bug #7 fires). Every form instance created in UTC+ with date-only presets silently carries the wrong internal UTC date.

## Next Action

Run 8-A-empty (Bug #6 scope) or 8B-D-BRT (GDOC safe API) to continue closing assessment gaps. After assessment, re-run after Bug #7 fix deployed to verify preset path is fixed.
