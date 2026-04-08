# TC-9-GDOC-A-BRT-1 — Summary

**Spec**: [tc-9-GDOC-A-BRT-1.md](../test-cases/tc-9-GDOC-A-BRT-1.md)
**Current status**: PASS — last run 2026-04-08 (BRT)
**Bug surface**: none — control/passing scenario

## Run History

| Run | Date       | TZ  | Outcome | File                                        |
| --- | ---------- | --- | ------- | ------------------------------------------- |
| 1   | 2026-04-08 | BRT | PASS    | [run-1](../runs/tc-9-GDOC-A-BRT-1-run-1.md) |

## Current Interpretation

GDOC round-trip is safe for Config A (date-only) in BRT. Real UTC from `.toISOString()` is correctly parsed by `normalizeCalValue` back to the same local date. No FORM-BUG-7 because BRT (UTC-3) midnight falls on the same UTC day. IST sibling (`9-GDOC-A-IST-1`) is expected to fail due to FORM-BUG-7 on the SFV path.

## Next Action

No further action for BRT — closed PASS. Run `9-GDOC-A-IST-1` to verify the expected -1 day shift in UTC+ timezone.
