# TC-5-D-BRT — Summary

**Spec**: [tc-5-D-BRT.md](../test-cases/tc-5-D-BRT.md)
**Current status**: FAIL — last run 2026-04-03 (BRT)
**Bug surface**: Bug #5 — fake Z on preset DateTime field at form load (-3h shift in BRT)

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | BRT | FAIL-3  | [run-1](../runs/tc-5-D-BRT-run-1.md) |

## Current Interpretation

Bug #5 confirmed for Config D preset in BRT. Raw Date preserves `initialDate` correctly (`"2026-03-01T11:28:54.627Z"`), but GFV returns `"2026-03-01T08:28:54.627Z"` — BRT local time (08:28) with fake Z. The -3h shift matches the BRT UTC offset. Complements 5-D-IST where the shift is +5:30h (IST offset). Bug #5 fires at form load before any user interaction.

## Next Action

Test 5-D-UTC0 to confirm that Bug #5 is harmless at UTC+0 (fake Z coincidentally correct when local = UTC).
