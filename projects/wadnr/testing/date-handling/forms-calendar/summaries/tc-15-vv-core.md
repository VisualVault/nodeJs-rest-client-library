# TC-15-vv-core — Summary

**Spec**: [tc-15-vv-core.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-15-vv-core.md)
**Current status**: PASS — cross-env comparison complete 2026-04-13
**Bug surface**: none — framework property audit

## Run History

| Run | Date | Env | Outcome | File |
|---|---|---|---|---|
| 1 | 2026-04-10 | vv5dev (WADNR) | data captured | [wadnr run](../runs/audit-kendo-version-wadnr-2026-04-10.md) |
| 2 | 2026-04-13 | vvdemo (EmanuelJofre) | PASS — comparison complete | [emanueljofre run](../../../../../../projects/emanueljofre/testing/date-handling/forms-calendar/runs/tc-15-vv-core-run-1.md) |

## Current Interpretation

Cross-env comparison complete. Both share formId=undefined and V1=false. Structural differences: v1 has 1 calendarValueService method vs v2's 4, v1 has LocalizationResources=undefined vs v2's {}, v1 has 26 VV.Form properties vs v2's 28. These are Kendo version structural differences — not behavioral for the date handling pipeline.

## Next Action

Complete.
