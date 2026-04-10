# TC-6-A-IST — Run 3 | 2026-04-09 | IST | PASS

**Spec**: [tc-6-A-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-6-A-IST.md) | **Summary**: [summary](../summaries/tc-6-A-IST.md)

## Environment

| Parameter   | Value                                                                        |
| ----------- | ---------------------------------------------------------------------------- |
| Date        | 2026-04-09                                                                   |
| Browser     | Chromium (Playwright headless)                                               |
| Tester TZ   | Asia/Kolkata — UTC+5:30 (IST)                                                |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                                  |
| Platform    | VisualVault FormViewer                                                       |
| Test Method | Playwright regression (`timezoneId: Asia/Kolkata`, `--project IST-chromium`) |

## Step Results

| Step # | Expected    | Actual      | Match |
| ------ | ----------- | ----------- | ----- |
| raw    | `"dynamic"` | `"dynamic"` | PASS  |
| api    | `"dynamic"` | `"dynamic"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-6-A-IST
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Current Date auto-populates correctly in IST. Uses new Date() → UTC timestamp, skipping Bug #7 moment parsing. Stored as Date object. Cross-midnight edge: if tested 00:00-05:30 IST, UTC date may be previous day.
