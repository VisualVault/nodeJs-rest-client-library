# TC-12-year-boundary-IST — Summary

**Spec**: [tc-12-year-boundary-IST.md](../test-cases/tc-12-year-boundary-IST.md)
**Current status**: FAIL-2 — last run 2026-04-02 (IST)
**Bug surface**: Bug #5 — +5:30h drift at year boundary stays in 2026 (opposite of BRT year crossing)

## Run History

| Run | Date       | TZ  | Outcome | File                                              |
| --- | ---------- | --- | ------- | ------------------------------------------------- |
| 1   | 2026-04-02 | IST | FAIL-2  | [run-1](../runs/tc-12-year-boundary-IST-run-1.md) |

## Current Interpretation

Jan 1 midnight IST drifts +5:30h to 05:30 AM — stays in 2026. Opposite of BRT which crosses to 2025 (fiscal year corruption). Bug #5 drift still corrupts data (+5:30h shift per trip) but does not cross the year boundary from IST. Demonstrates that Bug #5 severity is TZ-dependent: destructive at year boundaries for UTC- users, less destructive for UTC+ users.

## Next Action

No further action — IST year boundary behavior characterized.
