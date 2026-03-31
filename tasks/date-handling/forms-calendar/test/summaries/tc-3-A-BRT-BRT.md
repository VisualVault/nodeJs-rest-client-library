# TC-3-A-BRT-BRT — Summary

**Spec**: [tc-2-1-form-load-brt.md](../tc-2-1-form-load-brt.md)
**Current status**: PASS — last run 2026-03-27 (BRT)
**Bug surface**: none — control/passing scenario

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-03-27 | BRT | PASS    | [run-1](../runs/tc-3-A-BRT-BRT-run-1.md) |

## Current Interpretation

Config A (`enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`) with initial values saved in BRT and reloaded in BRT shows no date drift. On server reload, the raw stored type changes from a Date object (present before save) to a `"MM/dd/yyyy HH:mm:ss"` string (returned by the server), but the date portion — and thus the display — is preserved correctly. CurrentDate fields display `03/27/2026` and Preset fields display `03/01/2026`, identical to what was entered before save. Config A is outside the Bug #5 surface (`enableTime=false`), so no fake-Z risk affects GetFieldValue. The BRT-saved → BRT-reload cycle for Config A is stable.

## Next Action

No further action needed for this scenario. Run 3-A-IST-BRT if a cross-TZ reload test is desired (save from IST, reload in BRT — would exercise Bug #1 risk for Preset fields, which store UTC offset of the IST timezone).
