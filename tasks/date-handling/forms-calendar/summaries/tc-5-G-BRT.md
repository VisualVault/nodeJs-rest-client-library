# TC-5-G-BRT — Summary

**Spec**: [tc-5-G-BRT.md](../test-cases/tc-5-G-BRT.md)
**Current status**: PASS — last run 2026-04-03 (BRT)
**Bug surface**: none — legacy DateTime preset stores raw Date unchanged

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-5-G-BRT-run-1.md) |

## Current Interpretation

Legacy Config G preset (DateTime, ignoreTZ=false, useLegacy=true) loads correctly in BRT. DateTime presets bypass `parseDateString` truncation — raw Date preserves `initialDate` exactly. GFV returns raw Date unchanged (legacy path). Same behavior as non-legacy Config C at the value level, though return type differs (Date object vs string).

## Next Action

No further action — behavior characterized.
