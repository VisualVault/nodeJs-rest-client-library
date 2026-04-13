# TC-16-A-typed — Run 1 | 2026-04-13 | BRT | PASS

**Spec**: [tc-16-A-typed.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-16-A-typed.md) | **Summary**: [summary](../summaries/tc-16-A-typed.md)

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
| Fields | A=Field7 |

## Cross-Env Comparison

| Measure | vv5dev (PDT) | vvdemo (BRT) | Match |
|---|---|---|---|
| API response field7 | `"2026-03-15T00:00:00Z"` | `"2026-03-15T00:00:00Z"` | IDENTICAL |

## Outcome
**PASS** — Server TZ does not affect form save pipeline for Config A.

## Findings
- vvdemo result identical to vv5dev — server UTC offset is irrelevant
- Date-only pipeline appends `T00:00:00Z` uniformly regardless of server timezone
