# TC-9-D-IST-1 — Run 2 | 2026-04-03 | IST | FAIL

**Spec**: [tc-9-D-IST-1.md](tasks/date-handling/forms-calendar/test-cases/tc-9-D-IST-1.md) | **Summary**: [summary](../summaries/tc-9-D-IST-1.md)

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

| Step # | Expected                | Actual                  | Match    |
| ------ | ----------------------- | ----------------------- | -------- |
| raw    | `"2026-03-15T00:00:00"` | `"2026-03-15T05:30:00"` | **FAIL** |
| api    | `"2026-03-15T00:00:00"` | `"not captured"`        | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #5. See TC spec for fail condition details.

## Findings

- Firefox verification for TC-9-D-IST-1
- Expected failure — Bug #5
- Test context: EXPECTED FAIL: Bug #5 in IST causes +5:30h forward drift after 1 trip. Opposite direction from BRT (-3h). Stored "2026-03-15T05:30:00".
