# TC-3-D-BRT-BRT — Summary

**Spec**: [tc-3-D-BRT-BRT.md](../tc-3-D-BRT-BRT.md)
**Current status**: PASS (FAIL-3) — last run 2026-03-31 (BRT)
**Bug surface**: Bug #5 (fake Z in GetFieldValue) — confirmed active on reload path in Run 2

## Run History

| Run | Date       | TZ  | Outcome       | File                                     |
| --- | ---------- | --- | ------------- | ---------------------------------------- |
| 1   | 2026-03-27 | BRT | PASS          | [run-1](../runs/tc-3-D-BRT-BRT-run-1.md) |
| 2   | 2026-03-31 | BRT | PASS (FAIL-3) | [run-2](../runs/tc-3-D-BRT-BRT-run-2.md) |
| 3   | 2026-03-31 | BRT | PASS (FAIL-3) | [run-3](../runs/tc-3-D-BRT-BRT-run-3.md) |

## Current Interpretation

Config D (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`) raw stored value survives BRT reload consistently across three runs. Run 3 (2026-03-31) performed a full save-then-reload cycle on a fresh form (DateTest-000079, current template) confirming: save does not corrupt Config D values; raw `"2026-03-15T00:00:00"` is preserved. Bug #5 (fake Z in GFV) is confirmed active in both pre-save AND post-reload GFV calls (Runs 2 and 3), establishing it as a persistent GFV-layer defect — not reload-specific. Run 1 (2026-03-27) reported clean GFV, likely a different observation method. Current template produces same results as DateTest-000004.

## Next Action

No further BRT-BRT runs needed. Run 3-D-BRT-IST to verify Config D cross-TZ behavior.
