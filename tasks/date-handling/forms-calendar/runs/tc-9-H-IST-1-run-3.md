# TC-9-H-IST-1 — Run 3 | 2026-04-09 | IST | PASS

**Spec**: [tc-9-H-IST-1.md](../test-cases/tc-9-H-IST-1.md) | **Summary**: [summary](../summaries/tc-9-H-IST-1.md)

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

- Chromium verification for TC-9-H-IST-1
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Config H legacy control in IST: 0 drift confirmed. useLegacy=true skips fake-Z branch regardless of timezone. Universal protection against Bug #5 — confirmed in BRT (9-H-BRT-1) and now IST.
