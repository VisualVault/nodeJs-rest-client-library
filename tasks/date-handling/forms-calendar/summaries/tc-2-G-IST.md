# TC-2-G-IST — Summary

**Spec**: [tc-2-G-IST.md](../test-cases/tc-2-G-IST.md)
**Current status**: PASS — last run 2026-03-31 (IST)
**Bug surface**: Bug #2 (inconsistent popup vs typed handlers) — typed input stores correctly; popup does not

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | IST | PASS    | [run-1](../runs/tc-2-G-IST-run-1.md) |

## Current Interpretation

Typed input on legacy DateTime Config G stores `"2026-03-15T00:00:00"` — local midnight formatted without Z suffix via `getSaveValue()`. This is the correct calendar date. However, the popup path (tc-1-G-IST) stores `"2026-03-14T18:30:00.000Z"` — raw UTC `toISOString()` bypassing `getSaveValue()`. Bug #2 is confirmed for legacy DateTime in IST: the two input methods produce structurally different stored values. The typed path is correct; the popup path is buggy. Bug #4 is also present — the Z suffix is stripped, making the stored value timezone-ambiguous on reload.

## Next Action

Run 2-H-IST to confirm `ignoreTimezone` is a no-op for legacy typed DateTime (expected same result). Then run 2-C-IST and 2-D-IST to confirm non-legacy typed DateTime also stores local midnight in IST.
