# TC-7-A-epoch — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-7-A-epoch.md](../test-cases/tc-7-A-epoch.md) | **Summary**: [summary](../summaries/tc-7-A-epoch.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-03                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer                           |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                               |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                     | `"Fri Apr 03 2026 19:25:04 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                                |
| Field lookup | filter snippet                                              | `["Field7"]` ✓                                                                       |

## Step Results

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| raw    | `"2026-03-15"`               | `"2026-03-15"`               | PASS  |
| api    | `"2026-03-15"`               | `"2026-03-15"`               | PASS  |
| isoRef | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | PASS  |

## Outcome

**PASS** — Unix epoch `1773543600000` (BRT midnight March 15, 2026) stored correctly. Epoch is inherently timezone-aware — `new Date(epoch)` gives the correct local date regardless of TZ.

## Findings

- Epoch input is the most unambiguous format — it represents an absolute point in time.
- `normalizeCalValue()` creates `new Date(1773543600000)` → local midnight March 15 in BRT → `getSaveValue()` extracts `"2026-03-15"`.
- Unlike string formats, epoch input bypasses `moment()` parsing ambiguity — it always resolves to the same instant.
- Same result as all other Config A BRT format variants — completes the full format matrix for Config A BRT.
