# TC-11-D-concurrent-IST-edit — Summary

**Spec**: [tc-11-D-concurrent-IST-edit.md](../test-cases/tc-11-D-concurrent-IST-edit.md)
**Current status**: FAIL — last run 2026-04-08 (IST+BRT)
**Bug surface**: FORM-BUG-5 (concurrent multi-user drift)

## Run History

| Run | Date       | TZ      | Outcome | File                                                  |
| --- | ---------- | ------- | ------- | ----------------------------------------------------- |
| 1   | 2026-04-08 | IST+BRT | FAIL    | [run-1](../runs/tc-11-D-concurrent-IST-edit-run-1.md) |

## Current Interpretation

Concurrent edit scenario confirms same compound drift pattern as `11-roundtrip-cross`. Two users in different timezones both trigger Bug #5 independently, and the shifts accumulate. This is the production scenario that WADNR and similar multi-TZ organizations face — silent datetime corruption proportional to the TZ offset difference between editing users.

## Next Action

No further action — FAIL confirmed. Links to WADNR impact analysis.
