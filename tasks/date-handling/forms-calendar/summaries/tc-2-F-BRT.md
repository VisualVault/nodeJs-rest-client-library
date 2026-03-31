# TC-2-F-BRT — Summary

**Spec**: [tc-2-F-BRT.md](../test-cases/tc-2-F-BRT.md)
**Current status**: PASS — last run 2026-03-31 (BRT)
**Bug surface**: Bug #2 (popup vs typed format inconsistency) — confirmed by cross-reference with tc-1-F-BRT

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | BRT | PASS    | [run-1](../runs/tc-2-F-BRT-run-1.md) |

## Current Interpretation

Config F typed input in BRT stores `"2026-03-15"` correctly — no date shift (Bug #7 inactive at UTC-3). Behavior is identical to Config E (2-E-BRT), confirming `ignoreTimezone` has no effect on the legacy date-only typed input path. Bug #2 is confirmed by comparing with the popup result (1-F-BRT stores `"2026-03-15T03:00:00.000Z"`): same intended date, different storage format depending on input method.

## Next Action

No further action — closed PASS. Bug #2 format inconsistency is already documented. Remaining legacy typed input BRT slots (2-G-BRT, 2-H-BRT) are the DateTime variants.
