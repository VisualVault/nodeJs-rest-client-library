# TC-15-widget-opts-D — Summary

**Spec**: [tc-15-vv-core.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-15-vv-core.md)
**Current status**: PASS — cross-env comparison complete 2026-04-13
**Bug surface**: none

## Run History

| Run | Date | TZ | Outcome | File |
|---|---|---|---|---|
| 1 | 2026-04-13 | BRT | PASS (vvdemo) | [run-1](../runs/tc-15-widget-opts-D-run-1.md) |

## Current Interpretation

Corrects assumption that v1 DOM would have name attributes. `input[name="Field5"]` not found on either v1 or v2. VV uses a different DOM structure for calendar fields in both Kendo versions. Widget option inspection blocked on both.

## Next Action

Complete.
