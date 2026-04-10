# TC-13-B-storage — Summary

**Spec**: [tc-13-B-storage.md](tasks/date-handling/forms-calendar/test-cases/tc-13-B-storage.md)
**Current status**: PASS — last run 2026-04-08 (BRT)
**Bug surface**: none — confirms ignoreTZ has no effect on date-only storage

## Run History

| Run | Date       | TZ  | Outcome | File                                      |
| --- | ---------- | --- | ------- | ----------------------------------------- |
| 1   | 2026-04-08 | BRT | PASS    | [run-1](../runs/tc-13-B-storage-run-1.md) |

## Current Interpretation

Config B stores identically to Config A via the API write path. The `ignoreTimezone` flag has no observable effect on date-only fields (`enableTime=false`). This confirms that the mixed timezone storage problem is exclusive to DateTime fields where `ignoreTimezone` changes the `getSaveValue()` behavior.

## Next Action

No further action — closed PASS. The A/B equivalence is architectural (date-only fields have no time component for the flag to affect).
