# TC-9-GDOC-A-IST-1 — Run 1 | 2026-04-08 | IST | FAIL

**Spec**: [tc-9-GDOC-A-IST-1.md](../test-cases/tc-9-GDOC-A-IST-1.md) | **Summary**: [summary](../summaries/tc-9-GDOC-A-IST-1.md)

## Environment

| Parameter   | Value                                        |
| ----------- | -------------------------------------------- |
| Date        | 2026-04-08                                   |
| Tester TZ   | Asia/Calcutta — UTC+5:30 (IST)               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)  |
| Platform    | VisualVault FormViewer                       |
| Test Method | Playwright CLI (`timezoneId: Asia/Calcutta`) |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                            |
| ------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                     | `"Thu Apr 09 2026 01:04:21 GMT+0530 (India Standard Time)"` — contains GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                             |
| Field lookup | Config A filter                                             | `["Field7"]` ✓                                                                    |

## Step Results

| Step # | Expected                     | Actual                       | Match    |
| ------ | ---------------------------- | ---------------------------- | -------- |
| 3      | `"2026-03-15"`               | `"2026-03-14"`               | **FAIL** |
| 4      | `"2026-03-14T18:30:00.000Z"` | `"2026-03-13T18:30:00.000Z"` | **FAIL** |
| 6      | `"2026-03-15"`               | `"2026-03-12"`               | **FAIL** |
| 7      | `"2026-03-15"`               | `"2026-03-12"`               | **FAIL** |

## Outcome

**FAIL** — Double FORM-BUG-7. Initial SFV stores "2026-03-14" (-1 day from FORM-BUG-7). Then GDOC reads Mar 14 IST → ISO "2026-03-13T18:30:00.000Z" → SFV strips to "2026-03-13" → FORM-BUG-7 again → stores "2026-03-12". Net -3 days from intended Mar 15.

## Findings

- Matrix prediction of "-1 day" was incomplete — actual is -3 days (compound double Bug #7)
- FORM-BUG-7 fires on the initial SFV too (not just the GDOC round-trip), making baseRaw already "2026-03-14"
- GDOC itself returns a correct Date (Mar 14 00:00 IST for stored "2026-03-14") — the bug is in normalizeCalValue's handling of the ISO Z string for date-only fields
- The ISO Z date "2026-03-13" (UTC date) gets stripped and re-parsed as IST local → shifted again
- Contrast: 9-GDOC-A-BRT-1 was PASS (0 drift) because BRT midnight = same UTC day
- GDOC round-trip on date-only fields is UNSAFE in UTC+ timezones
- Matrix Expected should be corrected from "-1 day" to "-3 days (compound)"
