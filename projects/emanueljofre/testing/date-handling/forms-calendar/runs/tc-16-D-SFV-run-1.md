# TC-16-D-SFV — Run 1 | 2026-04-13 | BRT | PASS (FAIL-3 Bug #5)

**Spec**: [tc-16-D-SFV.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-16-D-SFV.md) | **Summary**: [summary](../summaries/tc-16-D-SFV.md)

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
| API response field5 | `"2026-03-15T14:30:00Z"` | `"2026-03-15T14:30:00Z"` | IDENTICAL |

## Outcome
**PASS (FAIL-3 Bug #5 on client)** — Server TZ does not affect form save pipeline for Config D.

## Findings
- vvdemo result identical to vv5dev — server UTC offset is irrelevant
- Client FORM-BUG-5 (fake Z in GetFieldValue) present on both environments
- ignoreTimezone=true path preserves local time value without conversion on both servers
