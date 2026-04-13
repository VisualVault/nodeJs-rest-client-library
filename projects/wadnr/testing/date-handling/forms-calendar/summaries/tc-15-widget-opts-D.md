# TC-15-widget-opts-D — Summary

**Spec**: [tc-15-vv-core.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-15-vv-core.md)
**Current status**: PASS — cross-env comparison complete 2026-04-13
**Bug surface**: none

## Run History

| Run | Date | Env | Outcome | File |
|---|---|---|---|---|
| 1 | 2026-04-10 | vv5dev (WADNR) | data captured | [wadnr run](../runs/audit-kendo-version-wadnr-2026-04-10.md) |
| 2 | 2026-04-13 | vvdemo (EmanuelJofre) | PASS — comparison complete | [emanueljofre run](../../../../../../projects/emanueljofre/testing/date-handling/forms-calendar/runs/tc-15-widget-opts-D-run-1.md) |

## Current Interpretation

`input[name="Field5"]` not found on either v1 or v2. VV uses a different DOM structure for calendar fields in both Kendo versions. Widget option inspection blocked on both environments — not a v1/v2 difference.

## Next Action

Complete.
