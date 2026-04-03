# TC-5-F-BRT — Summary

**Spec**: [tc-5-F-BRT.md](../test-cases/tc-5-F-BRT.md)
**Current status**: PASS — last run 2026-04-03 (BRT)
**Bug surface**: none — ignoreTZ + useLegacy both inert on preset path

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-5-F-BRT-run-1.md) |

## Current Interpretation

Legacy Config F preset (date-only, ignoreTZ=true, useLegacy=true) loads correctly in BRT. Identical to E-BRT — `ignoreTZ=true` is inert on the preset path because Bug #3 hardcodes it. Both `ignoreTZ` and `useLegacy` flags have no effect on date-only preset initialization.

## Next Action

No further action — behavior characterized.
