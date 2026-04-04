# TC-7-C-usFormat — Summary

**Spec**: [tc-7-C-usFormat.md](../test-cases/tc-7-C-usFormat.md)
**Current status**: PASS — last run 2026-04-03 (BRT, Chromium)
**Bug surface**: none — Config C control, US format input

## Run History

| Run | Date       | TZ  | Outcome | File                                      |
| --- | ---------- | --- | ------- | ----------------------------------------- |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-7-C-usFormat-run-1.md) |

## Current Interpretation

US format `"03/15/2026"` parsed as local BRT midnight, stored as `"2026-03-15T00:00:00"`, GFV returns real UTC. Identical to date-only string and ISO-without-Z. Config C is input-format-agnostic.

## Next Action

No further action — behavior characterized.
