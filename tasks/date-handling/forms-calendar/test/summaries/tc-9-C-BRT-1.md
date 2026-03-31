# TC-9-C-BRT-1 — Summary

**Spec**: [tc-2-3-roundtrip-brt.md](../tc-2-3-roundtrip-brt.md)
**Current status**: PASS — last run 2026-03-27 (BRT)
**Bug surface**: none — control/passing scenario

## Run History

| Run | Date       | TZ  | Outcome | File                                   |
| --- | ---------- | --- | ------- | -------------------------------------- |
| 1   | 2026-03-27 | BRT | PASS    | [run-1](../runs/tc-9-C-BRT-1-run-1.md) |

## Current Interpretation

Config C (`enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`) in BRT is stable across a `SetFieldValue(GetFieldValue())` round-trip. The raw stored value `"2026-03-15T00:00:00"` is returned unchanged after the round-trip. `GetFieldValue` does not append a fake Z for Config C — the `ignoreTimezone=false` branch in `getCalendarFieldValue()` applies the correct UTC offset conversion rather than the fake-Z appending path that affects Config D. Zero drift confirms Config C as the correct control for DateTime fields: it stores local time, and GFV applies the timezone offset on read without corrupting the stored value on write-back. Bug #5 is isolated to `ignoreTimezone=true` configurations (Config D and H).

## Next Action

No further BRT round-trip runs needed for Config C — it is confirmed stable. Run 9-C-IST-1 to verify that Config C is also stable in IST (predicted: PASS; GFV for ignoreTimezone=false correctly offsets rather than fake-Z appending).
