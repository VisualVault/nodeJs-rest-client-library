# TC-3-C-BRT-IST — Summary

**Spec**: [tc-3-C-BRT-IST.md](../test-cases/tc-3-C-BRT-IST.md)
**Current status**: FAIL-3, FAIL-4 — last run 2026-04-01 (IST)
**Bug surface**: Bug #1 + Bug #4 (timezone marker stripping causes cross-TZ reinterpretation of DateTime values)

## Run History

| Run | Date       | TZ  | Outcome        | File                                     |
| --- | ---------- | --- | -------------- | ---------------------------------------- |
| 1   | 2026-04-01 | IST | FAIL-3, FAIL-4 | [run-1](../runs/tc-3-C-BRT-IST-run-1.md) |

## Current Interpretation

Bug #1 + Bug #4 interaction confirmed for Config C (`enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`) cross-TZ reload. The stored DateTime string `"2026-03-15T00:00:00"` lacks timezone info (Bug #4 stripped Z on save). When loaded in IST, `parseDateString()` + `new Date()` reinterpret it as IST midnight instead of BRT midnight. GFV shifts from `"2026-03-15T03:00:00.000Z"` (correct) to `"2026-03-14T18:30:00.000Z"` (8.5h shift = BRT→IST offset). Display shows `12:00 AM` instead of `8:30 AM`. The raw stored string is unchanged (`PASS`) but its semantic meaning has silently shifted — a deceptive "pass" that masks data corruption. This confirms that Config C is NOT a safe "control" for cross-TZ scenarios as the matrix originally predicted.

## Next Action

Run 3-C-IST-BRT (reverse direction) to verify bidirectional bug. Consider 3-C-BRT-UTC0 to confirm shift scales with TZ offset.
