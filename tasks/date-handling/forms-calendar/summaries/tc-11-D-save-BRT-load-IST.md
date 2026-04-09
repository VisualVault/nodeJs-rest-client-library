# TC-11-D-save-BRT-load-IST — Summary

**Spec**: [tc-11-D-save-BRT-load-IST.md](../test-cases/tc-11-D-save-BRT-load-IST.md)
**Current status**: FAIL-1 — last run 2026-04-09 (IST, Playwright CLI)
**Bug surface**: FORM-BUG-5 (fake Z on GetFieldValue)

## Run History

| Run | Date       | TZ  | Outcome | File                                                |
| --- | ---------- | --- | ------- | --------------------------------------------------- |
| 1   | 2026-04-09 | IST | FAIL-1  | [run-1](../runs/tc-11-D-save-BRT-load-IST-run-1.md) |

## Current Interpretation

FORM-BUG-5 confirmed on cross-TZ load. Raw value `"2026-03-15T00:00:00"` is preserved (storage path safe), but `GetFieldValue` appends `.000Z` making the local value appear as UTC. Config D is the only config among A-H where cross-TZ load produces a deceptive GFV — all other configs either return raw (legacy) or correct UTC (Config C). The bug is in the GFV output path, not the storage/load path.

## Next Action

Re-run after FORM-BUG-5 fix deployed. Config H (tc-11-H-save-BRT-load-IST) serves as the control — same flags with `useLegacy=true` bypasses the bug.
