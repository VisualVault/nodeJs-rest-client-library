# TC-15-vv-core — Run 1 | 2026-04-13 | BRT | PASS

**Spec**: [tc-15-vv-core.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-15-vv-core.md) | **Summary**: [summary](../summaries/tc-15-vv-core.md)

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
| `VV.Form.FormId` | `undefined` |
| `VV.Form.useUpdatedCalendarValueLogic` | `false` |
| calendarValueService methods | 1 (`useUpdatedCalendarValueLogic` only) |
| `VV.Form.LocalizationResources` | `undefined` |
| `VV.Form` property count | 26 |

## Cross-Env Comparison

| Property | vvdemo (v1) | vv5dev (v2) | Match |
|---|---|---|---|
| FormId | `undefined` | `undefined` | IDENTICAL |
| V1 flag | `false` | `false` | IDENTICAL |
| calendarValueService methods | 1 | 4 | DIFFERS — v2 adds 3 extra methods |
| LocalizationResources | `undefined` | `{}` (empty object) | DIFFERS — v2 has property, v1 does not |
| Property count | 26 | 28 | DIFFERS — v2 has 2 extra properties |

## Outcome

**PASS** — Both environments share formId=undefined and V1=false. Differences are Kendo version structural (method count, localization props, property count) — not behavioral for date handling.
