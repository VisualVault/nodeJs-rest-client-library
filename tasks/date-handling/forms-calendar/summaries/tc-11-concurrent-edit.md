# TC-11-concurrent-edit — Summary

**Spec**: [tc-11-concurrent-edit.md](../test-cases/tc-11-concurrent-edit.md)
**Current status**: FAIL — last run 2026-04-08 (BRT+IST)
**Bug surface**: Bug #5 — compound drift across two users in different timezones

## Run History

| Run | Date       | TZ      | Outcome | File                                            |
| --- | ---------- | ------- | ------- | ----------------------------------------------- |
| 1   | 2026-04-08 | BRT+IST | FAIL    | [run-1](../runs/tc-11-concurrent-edit-run-1.md) |

## Current Interpretation

FORM-BUG-5 compound drift confirmed in the BRT→IST direction — the reverse of tc-11-D-concurrent-IST-edit (IST→BRT). Net drift is +2:30h in both directions, proving commutativity. The BRT-first variant is more dramatic visually: the intermediate state crosses a day boundary (March 15 → March 14 at T21:00:00), creating a window where any system reading the record sees the wrong calendar day. This is the worst-case production scenario: a BRT admin sets a date, an IST helpdesk user reviews and round-trips it, and the date silently shifts +2:30h with a transient wrong-day state between edits.

## Next Action

Re-run after FORM-BUG-5 fix deployed. Both concurrent-edit variants (BRT→IST and IST→BRT) should show 0 drift.
