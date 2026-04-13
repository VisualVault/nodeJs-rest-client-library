# TC-16-C-controls — Run 1 | 2026-04-13 | BRT | PASS

**Spec**: [tc-16-C-controls.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-16-C-controls.md) | **Summary**: [summary](../summaries/tc-16-C-controls.md)

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
| Fields | C=Field6 |

## Cross-Env Comparison

| Measure | vv5dev (PDT) | vvdemo (BRT) | Match |
|---|---|---|---|
| Reload raw | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | IDENTICAL |
| Reload api | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | IDENTICAL |

## Outcome
**PASS** — Server TZ does not affect form save pipeline for Config C.

## Findings
- vvdemo result identical to vv5dev — server UTC offset is irrelevant
- Form load pipeline does not mutate DateTime values regardless of server timezone
- GetFieldValue BRT->UTC conversion consistent across both servers
