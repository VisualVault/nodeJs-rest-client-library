# TC-11-H-BRT-roundtrip — Summary

**Spec**: [tc-11-H-BRT-roundtrip.md](../test-cases/tc-11-H-BRT-roundtrip.md)
**Current status**: PASS — last run 2026-04-08 (BRT)
**Bug surface**: none — control/passing scenario (confirms useLegacy=true immunity)

## Run History

| Run | Date       | TZ  | Outcome | File                                            |
| --- | ---------- | --- | ------- | ----------------------------------------------- |
| 1   | 2026-04-08 | BRT | PASS    | [run-1](../runs/tc-11-H-BRT-roundtrip-run-1.md) |

## Current Interpretation

Config H (`useLegacy=true`) shows zero drift after 3 GFV round-trips in BRT. The legacy code path returns raw stored values without transformation, making SFV(GFV()) an identity operation. This confirms `useLegacy=true` as a viable mitigation for FORM-BUG-5 in production cross-timezone scenarios where Config D fields experience progressive drift.

## Next Action

No further action — closed PASS. Consider running IST multi-trip (`11-H-IST-roundtrip`) to confirm TZ-independence, though `9-H-IST-1` already covers the single-trip case.
