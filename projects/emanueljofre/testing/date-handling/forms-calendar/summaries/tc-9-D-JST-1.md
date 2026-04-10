# TC-9-D-JST-1 — Summary

**Spec**: [tc-9-D-JST-1.md](tasks/date-handling/forms-calendar/test-cases/tc-9-D-JST-1.md)
**Current status**: FAIL — last run 2026-04-03 (JST, Chromium)
**Bug surface**: Bug #5 — fake Z on GFV causes +9h/trip drift (most extreme positive)

## Run History

| Run | Date       | TZ  | Outcome | File                                   |
| --- | ---------- | --- | ------- | -------------------------------------- |
| 1   | 2026-04-03 | JST | FAIL    | [run-1](../runs/tc-9-D-JST-1-run-1.md) |

## Current Interpretation

JST (UTC+9) produces the most extreme single-trip positive drift at +9h. 3 trips would gain +27h, crossing a full day boundary. Confirms drift is directly proportional to TZ offset magnitude and that positive offsets produce forward drift.

## Next Action

No further action.
