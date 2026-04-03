# TC-6-G-BRT — Summary

**Spec**: [tc-6-G-BRT.md](../test-cases/tc-6-G-BRT.md)
**Current status**: PASS — last run 2026-04-03 (BRT)
**Bug surface**: none — legacy DateTime current date correct

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-6-G-BRT-run-1.md) |

## Current Interpretation

Config G legacy DateTime Current Date stores correct UTC timestamp. GFV returns the raw Date object (no string formatting). Init path identical to non-legacy Config C (6-C-BRT) — only GFV output format differs (Date object vs ISO string), both correct.

## Next Action

Test 6-G-IST when expanding IST coverage for legacy configs.
