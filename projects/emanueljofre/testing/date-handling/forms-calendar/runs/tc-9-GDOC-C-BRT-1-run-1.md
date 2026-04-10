# TC-9-GDOC-C-BRT-1 — Run 1 | 2026-04-08 | BRT | PASS

**Spec**: [tc-9-GDOC-C-BRT-1.md](tasks/date-handling/forms-calendar/test-cases/tc-9-GDOC-C-BRT-1.md) | **Summary**: [summary](../summaries/tc-9-GDOC-C-BRT-1.md)

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
| Field lookup | Config C filter                                             | `["Field6"]` ✓                                                                       |

## Step Results

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| 3      | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00"`      | PASS  |
| 4      | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | PASS  |
| 6      | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00"`      | PASS  |
| 7      | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | PASS  |

## Outcome

**PASS** — GDOC round-trip on Config C (DateTime) in BRT produces zero drift. GDOC `.toISOString()` returns real UTC `"2026-03-15T03:00:00.000Z"` — identical to what GFV returns for Config C. Round-trip is trivially stable because Config C already uses real UTC conversion.

## Findings

- Confirmed: GDOC round-trip = GFV round-trip for Config C (both produce real UTC)
- 0 drift: real UTC → `normalizeCalValue` → same local time → same raw value
- This is expected and unsurprising — Config C has no fake Z (FORM-BUG-5 absent), so both GDOC and GFV paths produce identical real UTC strings
- Completes GDOC round-trip characterization: D-BRT PASS, D-IST PASS, A-BRT PASS, C-BRT PASS — all safe
- Remaining: A-IST expected to FAIL (FORM-BUG-7 on the SFV path, not a GDOC issue)
