# TC-12-leap-day-IST — Summary

**Spec**: [tc-12-leap-day-IST.md](../test-cases/tc-12-leap-day-IST.md)
**Current status**: FAIL-2 — last run 2026-04-02 (IST)
**Bug surface**: Bug #5 — +5:30h drift preserves leap day (opposite of BRT leap day loss)

## Run History

| Run | Date       | TZ  | Outcome | File                                         |
| --- | ---------- | --- | ------- | -------------------------------------------- |
| 1   | 2026-04-02 | IST | FAIL-2  | [run-1](../runs/tc-12-leap-day-IST-run-1.md) |

## Current Interpretation

Feb 29 midnight IST drifts +5:30h to 05:30 AM — stays on Feb 29 (leap day preserved). Opposite of BRT which loses the leap day (drifts to Feb 28). Bug #5 still corrupts the time (+5:30h shift) but the date remains correct after 1 trip. Takes ~5 trips for IST drift to cross to Mar 1. Demonstrates Bug #5 leap day impact is TZ-dependent.

## Next Action

No further action — IST leap day behavior characterized.
