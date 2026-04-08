# TC-9-GDOC-C-BRT-1 — Summary

**Spec**: [tc-9-GDOC-C-BRT-1.md](../test-cases/tc-9-GDOC-C-BRT-1.md)
**Current status**: PASS — last run 2026-04-08 (BRT)
**Bug surface**: none — control/passing scenario

## Run History

| Run | Date       | TZ  | Outcome | File                                        |
| --- | ---------- | --- | ------- | ------------------------------------------- |
| 1   | 2026-04-08 | BRT | PASS    | [run-1](../runs/tc-9-GDOC-C-BRT-1-run-1.md) |

## Current Interpretation

GDOC round-trip on Config C is trivially stable — GDOC `.toISOString()` produces the same real UTC as `GetFieldValue()` for Config C. Both paths are mathematically equivalent for `ignoreTimezone=false` configs. No bugs apply. Completes GDOC round-trip characterization for non-IST scenarios.

## Next Action

No further action — closed PASS. GDOC round-trip is confirmed safe for all tested config/TZ combinations except the expected A-IST FORM-BUG-7 failure.
