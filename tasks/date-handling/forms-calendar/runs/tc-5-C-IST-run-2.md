# TC-5-C-IST — Run 2 | 2026-04-09 | IST | PASS

**Spec**: [tc-5-C-IST.md](../test-cases/tc-5-C-IST.md) | **Summary**: [summary](../summaries/tc-5-C-IST.md)

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

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| raw    | `"2026-03-31T11:29:14.181Z"` | `"2026-03-31T11:29:14.181Z"` | PASS  |
| api    | `"2026-03-31T11:29:14.181Z"` | `"2026-03-31T11:29:14.181Z"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-5-C-IST
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Config C preset in IST. DateTime + ignoreTZ=false. Identical raw and API to tc-5-C-BRT — DateTime presets store raw Date from initialDate, which is TZ-independent. Confirms Config C preset is safe across timezones.
