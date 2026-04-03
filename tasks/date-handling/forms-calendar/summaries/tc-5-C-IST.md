# TC-5-C-IST — Summary

**Spec**: [tc-5-C-IST.md](../test-cases/tc-5-C-IST.md)
**Current status**: PASS — last run 2026-04-03 (IST)
**Bug surface**: none — DateTime preset preserves UTC timestamp identically to BRT

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | IST | PASS    | [run-1](../runs/tc-5-C-IST-run-1.md) |

## Current Interpretation

Config C DateTime preset is timezone-independent. Raw = `"2026-03-31T11:29:14.181Z"` and API = `"2026-03-31T11:29:14.181Z"` — identical to tc-5-C-BRT. The UTC Date from `initialDate` passes through without any timezone-dependent transformation. Config C (`ignoreTZ=false`) uses `new Date(value).toISOString()` for GFV — a real UTC conversion, not the Bug #5 fake Z path. This confirms Config C is safe for cross-timezone DateTime presets.

## Next Action

Test 5-C-UTC0 as a UTC+0 control to complete the timezone matrix for Config C presets.
