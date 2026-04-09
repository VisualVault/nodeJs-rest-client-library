# TC-5-A-UTC0 — Run 2 | 2026-04-09 | UTC0 | PASS

**Spec**: [tc-5-A-UTC0.md](../test-cases/tc-5-A-UTC0.md) | **Summary**: [summary](../summaries/tc-5-A-UTC0.md)

## Environment

| Parameter   | Value                                                                |
| ----------- | -------------------------------------------------------------------- |
| Date        | 2026-04-09                                                           |
| Browser     | Chromium (Playwright headless)                                       |
| Tester TZ   | UTC — UTC+0 (UTC0)                                                   |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                          |
| Platform    | VisualVault FormViewer                                               |
| Test Method | Playwright regression (`timezoneId: UTC`, `--project UTC0-chromium`) |

## Step Results

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| raw    | `"2026-03-01T00:00:00.000Z"` | `"2026-03-01T00:00:00.000Z"` | PASS  |
| api    | `"2026-03-01T00:00:00.000Z"` | `"2026-03-01T00:00:00.000Z"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-5-A-UTC0
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Config A preset at UTC+0. Bug #7 boundary control: local midnight = UTC midnight, no date shift. Save extraction "2026-03-01" correct. Deepest boundary where Bug #7 transitions from safe (UTC-) to destructive (UTC+).
