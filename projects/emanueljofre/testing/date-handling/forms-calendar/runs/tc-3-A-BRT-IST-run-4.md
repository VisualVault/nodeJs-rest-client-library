# TC-3-A-BRT-IST — Run 4 | 2026-04-09 | IST | PASS

**Spec**: [tc-3-A-BRT-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-3-A-BRT-IST.md) | **Summary**: [summary](../summaries/tc-3-A-BRT-IST.md)

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

| Step # | Expected       | Actual         | Match |
| ------ | -------------- | -------------- | ----- |
| raw    | `"2026-03-15"` | `"2026-03-15"` | PASS  |
| api    | `"2026-03-15"` | `"2026-03-15"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-3-A-BRT-IST
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Date-only cross-TZ (BRT→IST). Value survives — date-only strings not affected by TZ on reload.
