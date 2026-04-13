# TC-15-mask-scan — Summary

**Spec**: [tc-15-vv-core.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-15-vv-core.md)
**Current status**: PASS — cross-env comparison complete 2026-04-13
**Bug surface**: template-level difference (not Kendo version)

## Run History

| Run | Date | Env | Outcome | File |
|---|---|---|---|---|
| 1 | 2026-04-10 | vv5dev (WADNR) | data captured | [wadnr run](../runs/audit-kendo-version-wadnr-2026-04-10.md) |
| 2 | 2026-04-13 | vvdemo (EmanuelJofre) | PASS — comparison complete | [emanueljofre run](../../../../../../projects/emanueljofre/testing/date-handling/forms-calendar/runs/tc-15-mask-scan-run-1.md) |

## Current Interpretation

26 fields scanned on both environments. EmanuelJofre has ALL masks empty (including Field3/4). WADNR has Field3/4 with mask="MM/dd/yyyy" (Config A duplicates, residual from template configuration). This is a template-level difference, not a Kendo version difference. All other fields match.

## Next Action

Complete.
