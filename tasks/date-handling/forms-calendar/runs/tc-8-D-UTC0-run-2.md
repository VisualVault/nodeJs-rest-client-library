# TC-8-D-UTC0 — Run 2 | 2026-04-09 | UTC0 | PASS

**Spec**: [tc-8-D-UTC0.md](../test-cases/tc-8-D-UTC0.md) | **Summary**: [summary](../summaries/tc-8-D-UTC0.md)

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
| raw    | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00"`      | PASS  |
| api    | `"2026-03-15T00:00:00.000Z"` | `"2026-03-15T00:00:00.000Z"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-8-D-UTC0
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: EXPECTED FAIL: Bug #5 fake Z at UTC+0 — coincidentally correct (0h drift). Structurally present but invisible.
