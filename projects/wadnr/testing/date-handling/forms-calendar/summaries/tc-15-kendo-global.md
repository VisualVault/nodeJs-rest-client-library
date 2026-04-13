# TC-15-kendo-global — Summary

**Spec**: [tc-15-vv-core.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-15-vv-core.md)
**Current status**: PASS — cross-env comparison complete 2026-04-13
**Bug surface**: none

## Run History

| Run | Date | Env | Outcome | File |
|---|---|---|---|---|
| 1 | 2026-04-10 | vv5dev (WADNR) | data captured | [wadnr run](../runs/audit-kendo-version-wadnr-2026-04-10.md) |
| 2 | 2026-04-13 | vvdemo (EmanuelJofre) | PASS — comparison complete | [emanueljofre run](../../../../../../projects/emanueljofre/testing/date-handling/forms-calendar/runs/tc-15-kendo-global-run-1.md) |

## Current Interpretation

Corrects preliminary assumption that v1 would have a kendo global. kendo is NOT defined on either v1 or v2 (both throw ReferenceError). Kendo loads as a module in both environments. No v1/v2 difference here.

## Next Action

Complete.
