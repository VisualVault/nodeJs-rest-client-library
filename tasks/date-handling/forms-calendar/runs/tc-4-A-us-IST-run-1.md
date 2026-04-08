# TC-4-A-us-IST — Run 1 | 2026-04-08 | IST | PASS

**Spec**: [tc-4-A-us-IST.md](../test-cases/tc-4-A-us-IST.md) | **Summary**: [summary](../summaries/tc-4-A-us-IST.md)

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
| raw    | `"03/15/2026"` | `"03/15/2026"` | PASS  |
| api    | `"03/15/2026"` | `"03/15/2026"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-4-A-us-IST
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: US format in IST. Stored as-is, same as BRT.
