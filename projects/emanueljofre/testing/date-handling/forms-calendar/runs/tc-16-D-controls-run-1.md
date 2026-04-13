# TC-16-D-controls — Run 1 | 2026-04-13 | BRT | PASS (FAIL-3 Bug #5)

**Spec**: [tc-16-D-controls.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-16-D-controls.md) | **Summary**: [summary](../summaries/tc-16-D-controls.md)

## Environment

| Parameter | Value |
|---|---|
| Date | 2026-04-13 |
| Server | vvdemo (EmanuelJofre) — server BRT |
| Tester TZ | America/Sao_Paulo — UTC-3 (BRT) |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform | VisualVault FormViewer, progVersion 5.1 |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |
| Form | DateTest-001953 |
| DataID | 8b35e060-95dc-4959-a733-f5994c41bfd8 |
| Fields | D=Field5 |

## Cross-Env Comparison

| Measure | vv5dev (PDT) | vvdemo (BRT) | Match |
|---|---|---|---|
| Reload raw | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00"` | IDENTICAL |
| Reload api | `"2026-03-15T14:30:00.000Z"` | `"2026-03-15T14:30:00.000Z"` | IDENTICAL |

## Outcome
**PASS (FAIL-3 Bug #5)** — Server TZ does not affect form save pipeline for Config D.

## Findings
- vvdemo result identical to vv5dev — server UTC offset is irrelevant
- FORM-BUG-5 (fake Z in GetFieldValue) consistent across both environments
- ignoreTimezone=true load path is server-TZ-independent
