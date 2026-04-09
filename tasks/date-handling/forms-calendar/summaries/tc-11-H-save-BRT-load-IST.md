# TC-11-H-save-BRT-load-IST — Summary

**Spec**: [tc-11-H-save-BRT-load-IST.md](../test-cases/tc-11-H-save-BRT-load-IST.md)
**Current status**: PASS — last run 2026-04-09 (IST, Playwright CLI)
**Bug surface**: none — useLegacy=true bypasses FORM-BUG-5

## Run History

| Run | Date       | TZ  | Outcome | File                                                |
| --- | ---------- | --- | ------- | --------------------------------------------------- |
| 1   | 2026-04-09 | IST | PASS    | [run-1](../runs/tc-11-H-save-BRT-load-IST-run-1.md) |

## Current Interpretation

Passes consistently — Config H (legacy DateTime + ignoreTZ) raw preserved, GFV returns raw without fake Z. Direct counterpart to Config D which FAILs with FORM-BUG-5. Confirms `useLegacy=true` as the differentiator: same flags (enableTime+ignoreTZ) but legacy bypass prevents fake Z. Cross-TZ load does not alter this immunity.

## Next Action

No further action — closed PASS.
