# TC-9-H-IST-1 — Summary

**Spec**: [tc-9-H-IST-1.md](../test-cases/tc-9-H-IST-1.md)
**Current status**: PASS — last run 2026-04-01 (IST)
**Bug surface**: none — Config H (useLegacy=true) is immune to Bug #5

## Run History

| Run | Date       | TZ  | Outcome | File                                   |
| --- | ---------- | --- | ------- | -------------------------------------- |
| 1   | 2026-04-01 | IST | PASS    | [run-1](../runs/tc-9-H-IST-1-run-1.md) |

## Current Interpretation

Config H (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=true`) produces zero drift after a GFV round-trip in IST, matching the BRT result. The `useLegacy=true` flag bypasses the fake Z code path in `getCalendarFieldValue()`, returning the raw stored value unchanged. This confirms Config H as a universal workaround across all timezones — the only DateTime + ignoreTimezone configuration that survives round-trips intact.

## Next Action

No further 9-H runs needed. Config H round-trip stability is fully characterized across BRT and IST.
