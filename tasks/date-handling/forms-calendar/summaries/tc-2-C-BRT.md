# TC-2-C-BRT — Summary

**Spec**: [tc-2-C-BRT.md](../test-cases/tc-2-C-BRT.md)
**Current status**: PASS — last run 2026-03-27 (BRT)
**Bug surface**: none

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-27 | BRT | PASS    | [run-1](../runs/tc-2-C-BRT-run-1.md) |

## Current Interpretation

Config C (`enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`) typed datetime input in BRT stores `"2026-03-15T00:00:00"` — the local midnight string — with no shift. Config C is the UTC control field; BRT midnight typed as `03/15/2026 12:00 AM` is stored correctly as local midnight. `GetFieldValue` returned the raw value unchanged — Bug #5 did not activate on the typed input path in BRT for Config C in this session. Result matches the calendar popup (1-C-BRT) — Bug #2 absent. Covered under the same tc-1-2 multi-config BRT typed-input session.

## Next Action

Run 2-C-IST to observe DateTime typed input behavior under UTC+ offset. Pending — IST DateTime typed input prediction revised to expect `"2026-03-15T00:00:00"` based on confirmed 1-C-IST behavior (getSaveValue formats local time).
