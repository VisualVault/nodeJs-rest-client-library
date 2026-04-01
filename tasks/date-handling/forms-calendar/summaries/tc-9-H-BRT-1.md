# TC-9-H-BRT-1 — Summary

**Spec**: [tc-9-H-BRT-1.md](../test-cases/tc-9-H-BRT-1.md)
**Current status**: PASS — last run 2026-04-01 (BRT)
**Bug surface**: none — useLegacy=true prevents Bug #5 round-trip drift

## Run History

| Run | Date       | TZ  | Outcome | File                                   |
| --- | ---------- | --- | ------- | -------------------------------------- |
| 1   | 2026-04-01 | BRT | PASS    | [run-1](../runs/tc-9-H-BRT-1-run-1.md) |

## Current Interpretation

Config H GFV round-trip produces zero drift in BRT. `useLegacy=true` means GFV returns the raw value without fake Z, so `SetFieldValue(GetFieldValue())` is an identity operation. This contrasts sharply with Config D (same flags, `useLegacy=false`) which drifts -3h per trip due to Bug #5. The legacy flag provides complete protection against both the fake-Z GFV issue and the resulting round-trip drift.

## Next Action

Run 9-H-IST-1 to confirm zero drift is TZ-independent.
