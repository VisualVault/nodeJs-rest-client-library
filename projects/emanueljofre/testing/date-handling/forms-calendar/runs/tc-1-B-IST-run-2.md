# TC-1-B-IST — Run 2 | 2026-04-03 | IST | FAIL

**Spec**: [tc-1-B-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-1-B-IST.md) | **Summary**: [summary](../summaries/tc-1-B-IST.md)

## Environment

| Parameter   | Value                                                                       |
| ----------- | --------------------------------------------------------------------------- |
| Date        | 2026-04-03                                                                  |
| Browser     | Firefox (Playwright headless)                                               |
| Tester TZ   | Asia/Kolkata — UTC+5:30 (IST)                                               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                                 |
| Platform    | VisualVault FormViewer                                                      |
| Test Method | Playwright regression (`timezoneId: Asia/Kolkata`, `--project IST-firefox`) |

## Step Results

| Step # | Expected       | Actual           | Match    |
| ------ | -------------- | ---------------- | -------- |
| raw    | `"2026-03-15"` | `"2026-03-14"`   | **FAIL** |
| api    | `"2026-03-15"` | `"not captured"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #7. See TC spec for fail condition details.

## Findings

- Firefox verification for TC-1-B-IST
- Expected failure — Bug #7
- Test context: EXPECTED FAIL: Same as 1-A-IST. ignoreTZ no-op. Bug #7 -1 day.
