# TC-15-widget-opts-D — Run 1 | 2026-04-13 | BRT | PASS

**Spec**: [tc-15-vv-core.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-15-vv-core.md) | **Summary**: [summary](../summaries/tc-15-widget-opts-D.md)

## Environment

| Parameter | Value |
|---|---|
| Date | 2026-04-13 |
| Server | vvdemo (EmanuelJofre) — Kendo v1 (progVersion 5.1) |
| Tester TZ | America/Sao_Paulo — UTC-3 (BRT) |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |
| Form | DateTest-001954 |
| Field | Field5 (Config D) |

## Captures

| Property | Value |
|---|---|
| `input[name="Field5"]` | not found |

## Cross-Env Comparison

| Property | vvdemo (v1) | vv5dev (v2) | Match |
|---|---|---|---|
| DOM selector `[name="Field5"]` | not found | not found | IDENTICAL |

## Outcome

**PASS** — Corrects assumption that v1 DOM would have name attributes. Neither v1 nor v2 renders `input[name="Field5"]` — VV uses a different DOM structure for calendar fields in both Kendo versions.
