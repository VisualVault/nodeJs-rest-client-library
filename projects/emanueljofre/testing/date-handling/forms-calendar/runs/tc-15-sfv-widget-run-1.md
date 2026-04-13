# TC-15-sfv-widget — Run 1 | 2026-04-13 | BRT | PASS

**Spec**: [tc-15-vv-core.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-15-vv-core.md) | **Summary**: [summary](../summaries/tc-15-sfv-widget.md)

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
| VV raw (`getFieldValue`) | `"2026-03-15T14:30:00"` |
| VV api (FormData) | `"2026-03-15T14:30:00.000Z"` (Bug #5) |
| Widget value | `null` (DOM selector failed) |

## Cross-Env Comparison

| Property | vvdemo (v1) | vv5dev (v2) | Match |
|---|---|---|---|
| VV raw | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00"` | IDENTICAL |
| VV api | `"2026-03-15T14:30:00.000Z"` | `"2026-03-15T14:30:00.000Z"` | IDENTICAL |
| Widget value | `null` | `null` | IDENTICAL |

## Outcome

**PASS** — VV-level values identical across environments. Bug #5 (spurious Z suffix on API read) confirmed on both v1 and v2. Widget-level access blocked on both due to DOM structure.
