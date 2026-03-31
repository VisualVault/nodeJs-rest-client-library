# TC-3-A-BRT-BRT — Summary

**Spec**: [tc-3-A-BRT-BRT.md](../test-cases/tc-3-A-BRT-BRT.md)
**Current status**: PASS — last run 2026-03-31 (BRT)
**Bug surface**: none — control/passing scenario

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-03-27 | BRT | PASS    | [run-1](../runs/tc-3-A-BRT-BRT-run-1.md) |
| 2   | 2026-03-31 | BRT | PASS    | [run-2](../runs/tc-3-A-BRT-BRT-run-2.md) |
| 3   | 2026-03-31 | BRT | PASS    | [run-3](../runs/tc-3-A-BRT-BRT-run-3.md) |

## Current Interpretation

Config A (`enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`) passes consistently across three runs. Run 3 (2026-03-31) performed a full save-then-reload cycle on a fresh form (DateTest-000079, current template) — set value via SetFieldValue, saved, loaded saved record via DataID URL. Pre-save and post-reload values are identical: raw `"2026-03-15"`, GFV `"2026-03-15"`. This confirms the save itself does not corrupt Config A date-only values, and the current template produces the same results as DateTest-000004. Config A in BRT is outside Bug #5 and Bug #7 surfaces.

## Next Action

Run 3-A-BRT-IST to verify Bug #7 on the IST load path for saved date-only values.
