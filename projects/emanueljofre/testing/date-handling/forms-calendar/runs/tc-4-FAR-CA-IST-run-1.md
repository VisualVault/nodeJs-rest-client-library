# TC-4-FAR-CA-IST — Run 1 | 2026-04-08 | IST | PASS

**Spec**: [tc-4-FAR-CA-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-4-FAR-CA-IST.md) | **Summary**: [summary](../summaries/tc-4-FAR-CA-IST.md)

## Environment

| Parameter   | Value                                                                        |
| ----------- | ---------------------------------------------------------------------------- |
| Date        | 2026-04-08                                                                   |
| Browser     | Chromium (Playwright headless)                                               |
| Tester TZ   | Asia/Kolkata — UTC+5:30 (IST)                                                |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                                  |
| Platform    | VisualVault FormViewer                                                       |
| Test Method | Playwright regression (`timezoneId: Asia/Kolkata`, `--project IST-chromium`) |

## Step Results

| Step # | Expected       | Actual         | Match |
| ------ | -------------- | -------------- | ----- |
| raw    | `"2026-03-14"` | `"2026-03-14"` | PASS  |
| api    | `"2026-03-14"` | `"2026-03-14"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-4-FAR-CA-IST
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: C→A IST: Source C returns "2026-03-14T18:30:00.000Z" (real UTC of IST midnight). Target A truncates at T → "2026-03-14". Wrong date — the UTC date portion is previous day. Not a URL bug — the UTC representation correctly has Mar 14.
