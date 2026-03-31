# TC-3-C-BRT-BRT — Summary

**Spec**: [tc-2-1-form-load-brt.md](../tc-2-1-form-load-brt.md)
**Current status**: PASS — last run 2026-03-27 (BRT)
**Bug surface**: none — control/passing scenario

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-03-27 | BRT | PASS    | [run-1](../runs/tc-3-C-BRT-BRT-run-1.md) |

## Current Interpretation

Config C (`enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`) saved in BRT and reloaded in BRT shows no date drift. The raw stored value `"2026-03-15T00:00:00"` is returned unchanged from the server. `GetFieldValue` correctly returns `"2026-03-15T03:00:00.000Z"` — this is the expected UTC conversion for a `ignoreTimezone=false` DateTime field, not Bug #5 (Bug #5 affects `ignoreTimezone=true` fields only). Display remains `03/15/2026 12:00 AM`. Config C is the UTC control configuration — it stores local time but GFV applies the proper timezone offset on read. The BRT-saved → BRT-reload cycle for Config C is stable.

## Next Action

Run 3-C-IST-BRT if a cross-TZ reload test is desired (save from IST, reload in BRT). Config C cross-TZ reload should also be stable since the stored value is in local time and GFV applies the reader's offset.
