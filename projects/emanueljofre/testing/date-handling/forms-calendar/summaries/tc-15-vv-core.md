# TC-15-vv-core — Summary

**Spec**: [tc-15-vv-core.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-15-vv-core.md)
**Current status**: PASS — cross-env comparison complete 2026-04-13
**Bug surface**: none — framework property audit

## Run History

| Run | Date | TZ | Outcome | File |
|---|---|---|---|---|
| 1 | 2026-04-13 | BRT | PASS (vvdemo) | [run-1](../runs/tc-15-vv-core-run-1.md) |

## Current Interpretation

Cross-env comparison complete. Both share formId=undefined and V1=false. Differences are structural: v1 has 1 calendarValueService method vs v2's 4, v1 has LocalizationResources=undefined vs v2's {}, v1 has 26 VV.Form properties vs v2's 28. These are Kendo version structural differences, not behavioral for the date handling pipeline.

## Next Action

Complete.
