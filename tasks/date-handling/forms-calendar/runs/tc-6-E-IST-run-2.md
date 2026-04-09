# TC-6-E-IST — Run 2 | 2026-04-09 | IST | PASS

**Spec**: [tc-6-E-IST.md](../test-cases/tc-6-E-IST.md) | **Summary**: [summary](../summaries/tc-6-E-IST.md)

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

- Chromium verification for TC-6-E-IST
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Legacy date-only Current Date in IST. No Bug #7 — new Date() bypasses moment parsing. Compare: preset 5-E-IST FAILS with Bug #7. Cross-midnight edge active.
