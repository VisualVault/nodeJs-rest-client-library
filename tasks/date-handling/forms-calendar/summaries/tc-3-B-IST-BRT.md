# TC-3-B-IST-BRT — Summary

**Spec**: [tc-3-B-IST-BRT.md](../test-cases/tc-3-B-IST-BRT.md)
**Current status**: FAIL-3 — last run 2026-04-02 (BRT)
**Bug surface**: Bug #7 — wrong day permanently stored during IST save

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-04-02 | BRT | FAIL-3  | [run-1](../runs/tc-3-B-IST-BRT-run-1.md) |

## Current Interpretation

Bug #7 corrupted Config B field during IST save: `"03/15/2026"` stored as `"2026-03-14"` (-1 day). BRT reload sees the corrupted value unchanged. Identical to Config A (3-A-IST-BRT, FAIL) — `ignoreTimezone=true` is inert for date-only fields and does not prevent Bug #7. This completes Category 3: 14 PASS, 4 FAIL (A-IST-BRT, B-IST-BRT, C-IST-BRT, C-BRT-IST).

## Next Action

No further action — Bug #7 behavior characterized for Config B IST→BRT. Category 3 fully complete.
