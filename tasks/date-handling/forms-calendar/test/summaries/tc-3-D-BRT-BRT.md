# TC-3-D-BRT-BRT — Summary

**Spec**: [tc-2-9-form-load-server-reload-brt.md](../tc-2-9-form-load-server-reload-brt.md)
**Current status**: PASS — last run 2026-03-27 (BRT)
**Bug surface**: Bug #5 (fake Z in GetFieldValue) — present but not triggered on reload path; no extra drift on reload

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-03-27 | BRT | PASS    | [run-1](../runs/tc-3-D-BRT-BRT-run-1.md) |

## Current Interpretation

Config D (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`) saved in BRT and reloaded in BRT shows no additional drift from the reload path. The server returns the raw stored value `"2026-03-15T00:00:00"` unchanged, and the display remains `03/15/2026 12:00 AM`. GFV returned the clean value in this run — Bug #5 (fake Z appended by `getCalendarFieldValue()`) is structurally present on the Config D GFV path but was not observed to append the fake Z during this specific reload observation. The reload itself is safe; drift only occurs when `SetFieldValue(GetFieldValue())` is subsequently executed, as confirmed by the 9-D-BRT-\* tests.

## Next Action

No further BRT-BRT reload runs needed. Run 3-D-IST-BRT (save from IST, reload in BRT) when an IST-saved record is available — that scenario is currently untested and would combine the Config D TZ-invariant storage with a reader in a different timezone.
