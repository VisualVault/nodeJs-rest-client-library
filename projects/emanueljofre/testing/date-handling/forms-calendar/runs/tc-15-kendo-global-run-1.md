# TC-15-kendo-global — Run 1 | 2026-04-13 | BRT | PASS

**Spec**: [tc-15-vv-core.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-15-vv-core.md) | **Summary**: [summary](../summaries/tc-15-kendo-global.md)

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
| `typeof kendo` | ReferenceError — `kendo` is not defined |

## Cross-Env Comparison

| Property | vvdemo (v1) | vv5dev (v2) | Match |
|---|---|---|---|
| kendo global | NOT defined (ReferenceError) | NOT defined (ReferenceError) | IDENTICAL |

## Outcome

**PASS** — Corrects preliminary assumption that v1 would have a kendo global. Neither v1 nor v2 exposes kendo as a global variable. Kendo loads as a module in both environments.
