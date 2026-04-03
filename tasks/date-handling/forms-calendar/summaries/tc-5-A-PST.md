# TC-5-A-PST — Summary

**Spec**: [tc-5-A-PST.md](../test-cases/tc-5-A-PST.md)
**Current status**: PASS — last run 2026-04-03 (PST)
**Bug surface**: none — UTC-8 confirms Bug #7 absent in negative-offset timezones

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | PST | PASS    | [run-1](../runs/tc-5-A-PST-run-1.md) |

## Current Interpretation

Config A date-only preset loads correctly at PST (UTC-8). Deepest UTC- control tested for presets. PST midnight March 1 = UTC 08:00 March 1 — negative offset guarantees the UTC date ≥ local date, so Bug #7 cannot fire. Combined with BRT (UTC-3, PASS) and UTC0 (PASS), this confirms Bug #7 is strictly a UTC+ phenomenon.

**Note**: No Playwright project exists for PST. This test was verified via Playwright CLI but cannot be included in headless regression until `playwright.config.js` is updated.

## Next Action

No further action — PST control complete. Consider adding a PST project to `playwright.config.js` for regression coverage.
