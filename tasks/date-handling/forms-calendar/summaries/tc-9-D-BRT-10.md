# TC-9-D-BRT-10 — Summary

**Spec**: [tc-9-D-BRT-10.md](../test-cases/tc-9-D-BRT-10.md)
**Current status**: FAIL — last run 2026-04-09 (BRT, Chromium)
**Bug surface**: Bug #5 (fake Z in GetFieldValue), Bug #5 consequence (−3h drift per round-trip, −30h at 10 trips in BRT)

## Run History

| Run | Date       | TZ  | Outcome | File                                    |
| --- | ---------- | --- | ------- | --------------------------------------- |
| 1   | 2026-03-27 | BRT | FAIL-1  | [run-1](../runs/tc-9-D-BRT-10-run-1.md) |
| 2   | 2026-04-03 | BRT | FAIL    | [run-2](../runs/tc-9-D-BRT-10-run-2.md) |
| 3   | 2026-04-09 | BRT | FAIL    | [run-3](../runs/tc-9-D-BRT-10-run-3.md) |

## Current Interpretation

Run 3 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

No fix available until Bug #5 is patched. This 10-trip evidence reinforces the high-severity blocker classification. The companion IST tests (9-D-IST-1, 9-D-IST-5) confirm the forward drift in UTC+ environments.
