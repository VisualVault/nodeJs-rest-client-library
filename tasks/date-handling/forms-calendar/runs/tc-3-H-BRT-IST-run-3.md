# TC-3-H-BRT-IST — Run 3 | 2026-04-09 | IST | PASS

**Spec**: [tc-3-H-BRT-IST.md](../test-cases/tc-3-H-BRT-IST.md) | **Summary**: [summary](../summaries/tc-3-H-BRT-IST.md)

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

| Step # | Expected                | Actual                  | Match |
| ------ | ----------------------- | ----------------------- | ----- |
| raw    | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |
| api    | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-3-H-BRT-IST
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Legacy DateTime + ignoreTZ cross-TZ reload (BRT→IST). useLegacy=true bypasses Bug #5 fake Z. Compare with 3-D-BRT-IST (non-legacy, Bug #5).
