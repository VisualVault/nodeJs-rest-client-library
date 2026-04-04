# TC-8-H-IST — Summary

**Spec**: [tc-8-H-IST.md](../test-cases/tc-8-H-IST.md)
**Current status**: PASS — last run 2026-04-03 (IST, Chromium)
**Bug surface**: none — legacy DateTime + ignoreTZ, TZ-invariant raw return

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | IST | PASS    | [run-1](../runs/tc-8-H-IST-run-1.md) |

## Current Interpretation

Config H GFV returns raw unchanged in IST, confirming TZ-invariance (same as H-BRT). `useLegacy=true` bypasses both Bug #5 and UTC conversion. Config H is the safest DateTime config for round-trip operations.

## Next Action

No further action — TZ-invariance confirmed.
