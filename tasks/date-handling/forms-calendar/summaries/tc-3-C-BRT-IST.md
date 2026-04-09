# TC-3-C-BRT-IST — Summary

**Spec**: [tc-3-C-BRT-IST.md](../test-cases/tc-3-C-BRT-IST.md)
**Current status**: FAIL — last run 2026-04-09 (IST, Chromium)
**Bug surface**: Bug #1 + Bug #4 (timezone marker stripping causes cross-TZ reinterpretation of DateTime values)

## Run History

| Run | Date       | TZ  | Outcome        | File                                     |
| --- | ---------- | --- | -------------- | ---------------------------------------- |
| 1   | 2026-04-01 | IST | FAIL-3, FAIL-4 | [run-1](../runs/tc-3-C-BRT-IST-run-1.md) |
| 2   | 2026-04-03 | IST | FAIL           | [run-2](../runs/tc-3-C-BRT-IST-run-2.md) |
| 3   | 2026-04-09 | IST | FAIL           | [run-3](../runs/tc-3-C-BRT-IST-run-3.md) |

## Current Interpretation

Run 3 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

Run 3-C-IST-BRT (reverse direction) to verify bidirectional bug. Consider 3-C-BRT-UTC0 to confirm shift scales with TZ offset.
