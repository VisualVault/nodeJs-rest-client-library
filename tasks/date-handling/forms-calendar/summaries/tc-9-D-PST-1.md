# TC-9-D-PST-1 — Summary

**Spec**: [tc-9-D-PST-1.md](../test-cases/tc-9-D-PST-1.md)
**Current status**: FAIL — last run 2026-04-03 (PST, Chromium)
**Bug surface**: Bug #5 — fake Z on GFV causes -7h/trip drift (PDT, DST active)

## Run History

| Run | Date       | TZ  | Outcome | File                                   |
| --- | ---------- | --- | ------- | -------------------------------------- |
| 1   | 2026-04-03 | PST | FAIL    | [run-1](../runs/tc-9-D-PST-1-run-1.md) |

## Current Interpretation

PDT (UTC-7, DST active since Mar 8) produces -7h drift per trip, not -8h (PST). Matrix prediction corrected. 3 trips at PDT would lose -21h, nearly a full day. This confirms that Bug #5 drift follows the actual observed offset (PDT vs PST) rather than the standard offset.

## Next Action

No further action.
