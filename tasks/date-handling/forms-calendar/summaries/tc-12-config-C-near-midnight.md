# TC-12-config-C-near-midnight — Summary

**Spec**: [tc-12-config-C-near-midnight.md](../test-cases/tc-12-config-C-near-midnight.md)
**Current status**: PASS — last run 2026-04-08 (BRT)
**Bug surface**: none — control/passing scenario

## Run History

| Run | Date       | TZ  | Outcome | File                                                   |
| --- | ---------- | --- | ------- | ------------------------------------------------------ |
| 1   | 2026-04-08 | BRT | PASS    | [run-1](../runs/tc-12-config-C-near-midnight-run-1.md) |

## Current Interpretation

Config C round-trip at near-midnight is perfectly stable — 0 drift. GFV returns real UTC (`"2026-03-16T02:00:00.000Z"`), SFV parses real UTC back to same local time (`"2026-03-15T23:00:00"`). This proves FORM-BUG-5 drift is caused specifically by `ignoreTimezone=true` (fake Z in GFV), not by `enableTime=true` alone. Config C (`enableTime=true, ignoreTimezone=false`) is immune because it uses `new Date(value).toISOString()` for real UTC conversion.

## Next Action

No further action — closed PASS. Control test confirms FORM-BUG-5 is D-specific (ignoreTimezone=true required).
