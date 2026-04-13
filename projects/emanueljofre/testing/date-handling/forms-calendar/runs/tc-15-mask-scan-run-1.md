# TC-15-mask-scan — Run 1 | 2026-04-13 | BRT | PASS

**Spec**: [tc-15-vv-core.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-15-vv-core.md) | **Summary**: [summary](../summaries/tc-15-mask-scan.md)

## Environment

| Parameter | Value |
|---|---|
| Date | 2026-04-13 |
| Server | vvdemo (EmanuelJofre) — Kendo v1 (progVersion 5.1) |
| Tester TZ | America/Sao_Paulo — UTC-3 (BRT) |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |
| Form | DateTest-001954 |

## Captures

| Property | Value |
|---|---|
| Calendar fields scanned | 26 |
| Fields with mask | 0 (ALL masks empty) |
| Field3 mask | `""` |
| Field4 mask | `""` |

## Cross-Env Comparison

| Property | vvdemo (v1) | vv5dev (v2) | Match |
|---|---|---|---|
| Field count | 26 | 26 | IDENTICAL |
| Field3 mask | `""` | `"MM/dd/yyyy"` | DIFFERS |
| Field4 mask | `""` | `"MM/dd/yyyy"` | DIFFERS |
| Other field masks | all empty | all empty | IDENTICAL |

## Outcome

**PASS** — Key difference found: EmanuelJofre has no masks on any field, while WADNR has masks on Field3/4 (Config A duplicates, not cleared). This is a template-level difference, not a Kendo version difference. The mask presence on WADNR is residual from template configuration.
