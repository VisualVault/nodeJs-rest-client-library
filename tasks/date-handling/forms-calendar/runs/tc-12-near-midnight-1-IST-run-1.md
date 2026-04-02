# TC-12-near-midnight-1-IST — Run 1 | 2026-04-02 | IST | FAIL-1

**Spec**: [tc-12-near-midnight-1-IST.md](../test-cases/tc-12-near-midnight-1-IST.md) | **Summary**: [summary](../summaries/tc-12-near-midnight-1-IST.md)

## Environment

| Parameter   | Value                                        |
| ----------- | -------------------------------------------- |
| Date        | 2026-04-02                                   |
| Tester TZ   | Asia/Calcutta — UTC+5:30 (IST)               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)  |
| Platform    | VisualVault FormViewer, Build 20260304.1     |
| Test Method | Playwright CLI (`timezoneId: Asia/Calcutta`) |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                            |
| ------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                     | `"Thu Apr 02 2026 19:29:07 GMT+0530 (India Standard Time)"` — contains GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                             |
| Field lookup | filter Config D flags                                       | `["DataField5"]` ✓                                                                |

## Step Results

| Step # | Expected                              | Actual                       | Match    |
| ------ | ------------------------------------- | ---------------------------- | -------- |
| 3      | `"2026-03-15T06:00:00"` (raw)         | `"2026-03-15T06:00:00"`      | PASS     |
| 4      | `"2026-03-15T06:00:00"` (GFV)         | `"2026-03-15T06:00:00.000Z"` | **FAIL** |
| 5      | `"2026-03-14T18:30:00.000Z"` (TZ ref) | `"2026-03-14T18:30:00.000Z"` | PASS     |

## Outcome

**FAIL-1** — Bug #5 fake Z confirmed on GFV. Raw stored value is correct (`"2026-03-15T06:00:00"` — no day crossing, as predicted). GFV appends fake `.000Z` suffix.

## Findings

- Actual matches matrix prediction: "IST = Mar 15 06:00 — no day cross on input"
- **Key contrast with BRT**: BRT stores `"2026-03-14T21:30:00"` (day crossed to Mar 14). IST stores `"2026-03-15T06:00:00"` (stays Mar 15). Same UTC input, opposite day-crossing outcome — determined by TZ offset sign
- Bug #5 confirmed: GFV returns `"2026-03-15T06:00:00.000Z"` with fake Z. Same bug surface as BRT variant
- The fake Z creates "double jeopardy" potential: if round-tripped, the `.000Z` would shift by +5:30h on each trip (06:00 → 11:30 → 17:00 → 22:30 → 04:00 next day...)
- No further action — Bug #5 behavior characterized for IST
