# TC-DB-6-A — Summary

**Spec**: [tc-db-6-A.md](../test-cases/tc-db-6-A.md)
**Current status**: FAIL-1 — last run 2026-04-02
**Bug surface**: Format mismatch — server `M/d/yyyy` vs client `MM/dd/yyyy`

## Run History

| Run | Date       | Outcome | File                                |
| --- | ---------- | ------- | ----------------------------------- |
| 1   | 2026-04-02 | FAIL-1  | [run-1](../runs/tc-db-6-A-run-1.md) |

## Current Interpretation

Dashboard shows `3/15/2026` (no leading zeros), form shows `03/15/2026` (leading zeros). The date is identical — only the display format differs. This is a cosmetic inconsistency between the .NET server-side formatter and the Angular SPA client-side formatter.

## Next Action

No re-run needed. Format inconsistency documented. Fix requires aligning .NET and Angular format strings.
