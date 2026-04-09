# TC-8B-A-IST — Run 2 | 2026-04-09 | IST | PASS

**Spec**: [tc-8B-A-IST.md](../test-cases/tc-8B-A-IST.md) | **Summary**: [summary](../summaries/tc-8B-A-IST.md)

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
| raw    | `"2026-03-14"` | `"2026-03-14"` | PASS  |
| api    | `"2026-03-14"` | `"2026-03-14"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-8B-A-IST
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: EXPECTED FAIL: Bug #7 upstream stores "2026-03-14" instead of "2026-03-15". GDOC correctly reads the corrupted value. Failure is in SetFieldValue, not GDOC.
