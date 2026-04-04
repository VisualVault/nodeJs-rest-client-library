# TC-7-C-dateOnly — Summary

**Spec**: [tc-7-C-dateOnly.md](../test-cases/tc-7-C-dateOnly.md)
**Current status**: PASS — last run 2026-04-03 (BRT, Chromium)
**Bug surface**: none — Config C control, date-only string input

## Run History

| Run | Date       | TZ  | Outcome | File                                      |
| --- | ---------- | --- | ------- | ----------------------------------------- |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-7-C-dateOnly-run-1.md) |

## Current Interpretation

Date-only string `"2026-03-15"` parsed as local BRT midnight, stored as `"2026-03-15T00:00:00"`, GFV returns real UTC `"2026-03-15T03:00:00.000Z"`. Identical behavior to ISO-without-Z (tc-7-C-isoNoZ). Config C is format-agnostic for all local-midnight-resolving inputs.

## Next Action

No further action — behavior characterized.
