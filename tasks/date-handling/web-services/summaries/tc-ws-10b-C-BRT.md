# TC-WS-10B-C-BRT — Summary

**Spec**: [tc-ws-10b-C-BRT.md](../test-cases/tc-ws-10b-C-BRT.md)
**Current status**: BLOCKED — `forminstance/` returns 500 on vvdemo

## Run History

| Run | Date       | TZ  | Outcome | File                                              |
| --- | ---------- | --- | ------- | ------------------------------------------------- |
| 1   | 2026-04-06 | BRT | BLOCKED | [ws-10-batch-run-1](../runs/ws-10-batch-run-1.md) |

## Current Interpretation

Cannot compare `forminstance/` API response against `postForms` stored value. The DateTest template is not registered in FormsAPI on vvdemo, causing HTTP 500.

## Next Action

Retry when template is registered in FormsAPI, or test on a different environment.
