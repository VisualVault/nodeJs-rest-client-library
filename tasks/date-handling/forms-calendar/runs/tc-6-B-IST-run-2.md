# TC-6-B-IST — Run 2 | 2026-04-09 | IST | PASS

**Spec**: [tc-6-B-IST.md](../test-cases/tc-6-B-IST.md) | **Summary**: [summary](../summaries/tc-6-B-IST.md)

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

- Chromium verification for TC-6-B-IST
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Config B Current Date in IST. ignoreTZ inert on new Date() path. Cross-midnight edge: IST April 4 while UTC April 3 — local date interpretation correctly shows IST today.
