# TC-9-GDOC-A-BRT-1 — Run 1 | 2026-04-08 | BRT | PASS

**Spec**: [tc-9-GDOC-A-BRT-1.md](../test-cases/tc-9-GDOC-A-BRT-1.md) | **Summary**: [summary](../summaries/tc-9-GDOC-A-BRT-1.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-08                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer                           |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                               |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                     | `"Wed Apr 08 2026 16:13:49 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                                |
| Field lookup | Config A filter                                             | `["Field7"]` ✓                                                                       |

## Step Results

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| 3      | `"2026-03-15"`               | `"2026-03-15"`               | PASS  |
| 4      | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | PASS  |
| 6      | `"2026-03-15"`               | `"2026-03-15"`               | PASS  |
| 7      | `"2026-03-15"`               | `"2026-03-15"`               | PASS  |

## Outcome

**PASS** — GDOC round-trip on Config A (date-only) in BRT produces zero drift. Real UTC `"2026-03-15T03:00:00.000Z"` is correctly parsed by `normalizeCalValue` back to BRT midnight Mar 15 → same date stored.

## Findings

- Confirmed: GDOC round-trip is safe for Config A in BRT (0 drift)
- GDOC returns real UTC `"T03:00:00.000Z"` (Mar 15 midnight BRT = Mar 15 03:00 UTC) — correct Date object
- `normalizeCalValue` parses ISO Z correctly via `moment()` → BRT midnight → same day
- Key contrast: In IST this would fail (-1 day) because IST midnight = previous UTC day → FORM-BUG-7 on the SFV path
- GDOC itself is not the issue — the vulnerability is in `normalizeCalValue`'s date-only handling for UTC+ TZs
