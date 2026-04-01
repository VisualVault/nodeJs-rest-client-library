# TC-3-D-IST-BRT — Summary

**Spec**: [tc-3-D-IST-BRT.md](../test-cases/tc-3-D-IST-BRT.md)
**Current status**: PASS (FAIL-3) — last run 2026-04-01 (BRT)
**Bug surface**: Bug #5 — fake Z on GetFieldValue

## Run History

| Run | Date       | TZ  | Outcome       | File                                     |
| --- | ---------- | --- | ------------- | ---------------------------------------- |
| 1   | 2026-04-01 | BRT | PASS (FAIL-3) | [run-1](../runs/tc-3-D-IST-BRT-run-1.md) |

## Current Interpretation

Config D raw value is fully TZ-invariant: `"2026-03-15T00:00:00"` saved in IST survives BRT reload unchanged. Display is correct (`03/15/2026 12:00 AM`). Bug #5 (fake Z on GFV) is active and consistent with the reverse direction (3-D-BRT-IST). This completes the bidirectional cross-TZ verification for Config D — the storage layer is reliable, but the developer API (`GetFieldValue`) is broken in both directions.

## Next Action

No further action — closed PASS (FAIL-3). Config D cross-TZ reload is fully characterized in both IST→BRT and BRT→IST directions.
