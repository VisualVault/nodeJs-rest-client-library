# TC-4-E-isoT-IST — Run 1 | 2026-04-08 | IST | PASS

**Spec**: [tc-4-E-isoT-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-4-E-isoT-IST.md) | **Summary**: [summary](../summaries/tc-4-E-isoT-IST.md)

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
| raw    | `"2026-03-15"` | `"2026-03-15"` | PASS  |
| api    | `"2026-03-15"` | `"2026-03-15"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-4-E-isoT-IST
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Legacy date-only in IST. Correct — no FORM-BUG-7. Legacy display empty but value stored.
