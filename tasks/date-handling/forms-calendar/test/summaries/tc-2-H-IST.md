# TC-2-H-IST — Summary

**Spec**: [tc-2-H-IST.md](../tc-2-H-IST.md)
**Current status**: PASS — last run 2026-04-01 (IST)
**Bug surface**: Bug #2 (popup vs typed format inconsistency) — typed stores correct format; popup stores buggy UTC format

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-01 | IST | PASS    | [run-1](../runs/tc-2-H-IST-run-1.md) |

## Current Interpretation

Typed input for Config H in IST stores `"2026-03-15T00:00:00"` — local midnight without Z, which is the correct/intended format. Bug #2 is confirmed by comparison with popup (tc-1-H-IST stored `"2026-03-14T18:30:00.000Z"`): same logical datetime, different format. The typed path goes through `getSaveValue()` which formats as local time; the popup bypasses it and stores raw `toISOString()`. GetFieldValue returns the raw value unchanged — no fake Z (useLegacy=true bypasses Bug #5). Matrix prediction corrected from `"2026-03-14T18:30:00"` to `"2026-03-15T00:00:00"`.

## Next Action

Run 2-G-IST to verify Config G typed path also stores local midnight (confirming `ignoreTimezone` is a no-op on typed path).
