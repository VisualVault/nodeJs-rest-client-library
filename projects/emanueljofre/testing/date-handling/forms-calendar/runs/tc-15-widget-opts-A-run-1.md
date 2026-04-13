# TC-15-widget-opts-A — Run 1 | 2026-04-13 | BRT | PASS

**Spec**: [tc-15-vv-core.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-15-vv-core.md) | **Summary**: [summary](../summaries/tc-15-widget-opts-A.md)

## Environment

| Parameter | Value |
|---|---|
| Date | 2026-04-13 |
| Server | vvdemo (EmanuelJofre) — Kendo v1 (progVersion 5.1) |
| Tester TZ | America/Sao_Paulo — UTC-3 (BRT) |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |
| Form | DateTest-001954 |
| Field | Field7 (Config A) |

## Captures

| Property | Value |
|---|---|
| `input[name="Field7"]` | not found |

## Cross-Env Comparison

| Property | vvdemo (v1) | vv5dev (v2) | Match |
|---|---|---|---|
| DOM selector `[name="Field7"]` | not found | not found | IDENTICAL |

## Outcome

**PASS** — Same as widget-opts-D. Neither v1 nor v2 renders name attributes on calendar inputs. Widget-level option inspection blocked on both environments.
