# TC-5-E-BRT — Summary

**Spec**: [tc-5-E-BRT.md](../test-cases/tc-5-E-BRT.md)
**Current status**: PASS — last run 2026-04-03 (BRT)
**Bug surface**: none — legacy date-only preset correct in BRT

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-5-E-BRT-run-1.md) |

## Current Interpretation

Legacy Config E preset (date-only, ignoreTZ=false, useLegacy=true) loads correctly in BRT. Behavior identical to non-legacy Config A — `useLegacy` has no effect on the date-only preset init path. BRT midnight March 1 = UTC March 1 03:00, so Bug #7 does not fire. No bugs active.

## Next Action

No further action — behavior characterized.
