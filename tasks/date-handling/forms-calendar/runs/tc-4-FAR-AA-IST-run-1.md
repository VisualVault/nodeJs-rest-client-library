# TC-4-FAR-AA-IST — Run 1 | 2026-04-08 | IST | PASS

**Spec**: [tc-4-FAR-AA-IST.md](../test-cases/tc-4-FAR-AA-IST.md) | **Summary**: [summary](../summaries/tc-4-FAR-AA-IST.md)

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

- Chromium verification for TC-4-FAR-AA-IST
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: A→A IST: FORM-BUG-7 at source shifts to Mar 14. Target receives and preserves the wrong date. URL path itself is safe — damage is upstream.
