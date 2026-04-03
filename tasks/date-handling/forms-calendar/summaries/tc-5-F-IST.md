# TC-5-F-IST — Summary

**Spec**: [tc-5-F-IST.md](../test-cases/tc-5-F-IST.md)
**Current status**: FAIL — last run 2026-04-03 (IST)
**Bug surface**: Bug #7 — preset date stores Feb 28; ignoreTZ + useLegacy both inert

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | IST | FAIL-3  | [run-1](../runs/tc-5-F-IST-run-1.md) |

## Current Interpretation

Bug #7 confirmed for legacy Config F in IST. Neither `ignoreTZ=true` nor `useLegacy=true` protects the preset init path from Bug #7. All 4 date-only preset configs (A, B, E, F) show identical Bug #7 behavior in IST — the bug is completely config-independent for date-only fields. `parseDateString` path is shared and produces IST midnight = UTC Feb 28 for all of them.

## Next Action

No further action — Bug #7 fully characterized across all date-only presets in IST.
