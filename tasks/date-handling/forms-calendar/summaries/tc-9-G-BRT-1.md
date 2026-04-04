# TC-9-G-BRT-1 — Summary

**Spec**: [tc-9-G-BRT-1.md](../test-cases/tc-9-G-BRT-1.md)
**Current status**: PASS — last run 2026-04-03 (BRT, Chromium)
**Bug surface**: None — legacy DateTime GFV returns raw, no drift

## Run History

| Run | Date       | TZ  | Outcome | File                                   |
| --- | ---------- | --- | ------- | -------------------------------------- |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-9-G-BRT-1-run-1.md) |

## Current Interpretation

Legacy DateTime Config G is stable on round-trip. GFV returns the raw stored value because useLegacy bypasses the non-legacy branch entirely. No UTC conversion occurs, no fake Z is appended. This directly contrasts Config D where the non-legacy GFV path appends fake Z and causes drift.

## Next Action

No further action.
