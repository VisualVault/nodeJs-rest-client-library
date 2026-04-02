# TC-12-near-midnight-1-IST — Summary

**Spec**: [tc-12-near-midnight-1-IST.md](../test-cases/tc-12-near-midnight-1-IST.md)
**Current status**: FAIL-1 — last run 2026-04-02 (IST)
**Bug surface**: Bug #5 — GFV appends fake Z to stored value

## Run History

| Run | Date       | TZ  | Outcome | File                                                |
| --- | ---------- | --- | ------- | --------------------------------------------------- |
| 1   | 2026-04-02 | IST | FAIL-1  | [run-1](../runs/tc-12-near-midnight-1-IST-run-1.md) |

## Current Interpretation

ISO+Z input near midnight (`"2026-03-15T00:30:00.000Z"`) correctly stored as IST local time (`"2026-03-15T06:00:00"`) — no day crossing (contrast: BRT crosses to Mar 14). Bug #5 fake Z confirmed on GFV (`"2026-03-15T06:00:00.000Z"`). Storage is correct; API output is misleading.

## Next Action

No further action — IST near-midnight storage behavior characterized. Bug #5 mitigation tracked separately.
