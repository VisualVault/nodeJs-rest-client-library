# TC-8B-A-BRT — Summary

**Spec**: [tc-8B-A-BRT.md](../test-cases/tc-8B-A-BRT.md)
**Current status**: PASS — last run 2026-04-03 (BRT, Chromium)
**Bug surface**: none — date-only GDOC returns correct Date

## Run History

| Run | Date       | TZ  | Outcome | File                                  |
| --- | ---------- | --- | ------- | ------------------------------------- |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-8B-A-BRT-run-1.md) |

## Current Interpretation

Date-only Config A GDOC creates Date at local BRT midnight from "2026-03-15". toISOString returns real UTC (+3h). Identical to Config E (legacy).

## Next Action

No further action — behavior characterized.
