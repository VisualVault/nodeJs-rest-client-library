# TC-3-A-BRT-BRT — Summary

**Spec**: [tc-3-A-BRT-BRT.md](../test-cases/tc-3-A-BRT-BRT.md)
**Current status**: PASS — last run 2026-04-01 (BRT, Chromium via Playwright CLI)
**Bug surface**: none — control/passing scenario

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-03-27 | BRT | PASS    | [run-1](../runs/tc-3-A-BRT-BRT-run-1.md) |
| 2   | 2026-03-31 | BRT | PASS    | [run-2](../runs/tc-3-A-BRT-BRT-run-2.md) |
| 3   | 2026-03-31 | BRT | PASS    | [run-3](../runs/tc-3-A-BRT-BRT-run-3.md) |
| 4   | 2026-04-01 | BRT | PASS    | [run-4](../runs/tc-3-A-BRT-BRT-run-4.md) |

## Current Interpretation

Config A (`enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`) passes consistently across four runs including both Chrome MCP and Playwright CLI. Run 4 (2026-04-01) used Playwright CLI with BRT timezone simulation, loading saved record DateTest-000080 (saved from BRT 2026-03-31). Post-reload raw `"2026-03-15"` and GFV `"2026-03-15"` are identical to pre-save values. Config A in BRT is outside Bug #5 and Bug #7 surfaces.

## Next Action

No further BRT runs needed. Sibling cross-TZ test (tc-3-A-BRT-IST.md) already confirms date-only strings survive cross-TZ reload.
