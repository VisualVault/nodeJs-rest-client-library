# TC-8-V2 — Run 1 | 2026-04-03 | IST | PASS

**Spec**: [tc-8-V2.md](tasks/date-handling/forms-calendar/test-cases/tc-8-V2.md) | **Summary**: [summary](../summaries/tc-8-V2.md)

## Environment

| Parameter   | Value                                                                          |
| ----------- | ------------------------------------------------------------------------------ |
| Date        | 2026-04-03                                                                     |
| Browser     | Chromium (Playwright headless)                                                 |
| Tester TZ   | Asia/Calcutta — UTC+5:30 (IST)                                                 |
| Code path   | V1 for SetFieldValue, **V2 for GetFieldValue** (flag set manually via console) |
| Platform    | VisualVault FormViewer                                                         |
| Test Method | Playwright CLI (`timezoneId: Asia/Calcutta`)                                   |

## Preconditions Verified

| Check         | Command                                                            | Result                                             |
| ------------- | ------------------------------------------------------------------ | -------------------------------------------------- |
| TZ            | `new Date().toString()`                                            | `"...GMT+0530 (India Standard Time)"` — GMT+0530 ✓ |
| V1/V2 initial | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`        | `false` → V1 active ✓                              |
| V2 activation | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic = true` | `true` → V2 activated ✓                            |
| Field lookup  | Config C: Field6, Config D: Field5                                 | Both found ✓                                       |

## Step Results

Values set under V1 (`"2026-03-15T00:00:00"` via SFV), then GFV read under both V1 and V2:

| Step # | Config | Code Path | Expected                     | Actual                       | Match         |
| ------ | ------ | --------- | ---------------------------- | ---------------------------- | ------------- |
| V1-C   | C      | V1        | `"2026-03-14T18:30:00.000Z"` | `"2026-03-14T18:30:00.000Z"` | PASS          |
| V1-D   | D      | V1        | `"2026-03-15T00:00:00.000Z"` | `"2026-03-15T00:00:00.000Z"` | PASS (Bug #5) |
| V2-C   | C      | V2        | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00"`      | PASS          |
| V2-D   | D      | V2        | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00"`      | PASS          |

## Outcome

**PASS** — V2 GFV returns raw value unchanged for both Config C and Config D. Bug #5 is absent under V2. V2 also removes Config C's legitimate UTC conversion.

## Findings

- **V2 bypasses all GFV transformations**: both the real UTC conversion (Config C) and the fake Z (Config D) are absent under V2
- V2 GFV behavior is equivalent to `getValueObjectValue()` — returns the raw partition value
- **Bug #5 resolution**: V2 eliminates Bug #5, but at the cost of also removing Config C's correct UTC reconstruction
- V2 was successfully activated by directly setting `calendarValueService.useUpdatedCalendarValueLogic = true` via console — no ObjectID or server flag needed
- V1 baseline confirms expected behavior: Config C real UTC (-5:30h shift), Config D fake Z (Bug #5)
- **Architecture implication**: V2 treats GFV as a raw passthrough. This means consumers of `GetFieldValue()` under V2 must handle timezone interpretation themselves, rather than receiving pre-converted UTC
