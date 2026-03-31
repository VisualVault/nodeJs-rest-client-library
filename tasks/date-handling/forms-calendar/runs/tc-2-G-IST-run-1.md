# TC-2-G-IST — Run 1 | 2026-03-31 | IST | PASS

**Spec**: [tc-2-G-IST.md](../test-cases/tc-2-G-IST.md) | **Summary**: [summary](../summaries/tc-2-G-IST.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-31                                  |
| Tester TZ | Asia/Calcutta — UTC+5:30 (IST)              |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                            |
| ------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                     | `"Tue Mar 31 2026 23:21:59 GMT+0530 (India Standard Time)"` — contains GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                             |
| Field lookup | filter snippet                                              | `["DataField14"]` ✓                                                               |

## Step Results

| Step # | Expected                       | Actual                       | Match |
| ------ | ------------------------------ | ---------------------------- | ----- |
| 4      | Display: `03/15/2026 12:00 AM` | `"03/15/2026 12:00 AM"`      | PASS  |
| 5      | `"2026-03-15T00:00:00"`        | `"2026-03-15T00:00:00"`      | PASS  |
| 6      | `"2026-03-15T00:00:00"`        | `"2026-03-15T00:00:00"`      | PASS  |
| 7      | `"2026-03-14T18:30:00.000Z"`   | `"2026-03-14T18:30:00.000Z"` | PASS  |

## Outcome

**PASS** — All steps match expected values. Typed input on legacy DateTime Config G stores local midnight correctly as `"2026-03-15T00:00:00"` (no Z, no date shift).

## Findings

- **Matrix prediction was wrong**: predicted `"2026-03-14T18:30:00"` (UTC-equivalent), actual is `"2026-03-15T00:00:00"` (local time). The prediction assumed `getSaveValue()` would not convert back to local, but `moment(isoString).format()` outputs in local time.
- **Bug #2 confirmed for legacy DateTime in IST**: popup (1-G-IST) stored `"2026-03-14T18:30:00.000Z"` (raw `toISOString()`, bypassing `getSaveValue()`); typed input stores `"2026-03-15T00:00:00"` (via `getSaveValue()`, local time format). Two completely different stored representations of the same intended date — different format (with/without Z), different time portion (UTC vs local), but the typed path preserves the correct calendar date while the popup shifts to the previous UTC day.
- **GetFieldValue returns raw value unchanged**: Config G (`useLegacy=true`) falls through to `return value` in `getCalendarFieldValue()` — no Bug #5 fake Z, no `new Date().toISOString()` conversion.
- **Bug #4 confirmed**: `getSaveValue()` strips Z from DateTime values in V1 mode — the stored value `"2026-03-15T00:00:00"` has no Z suffix, making it ambiguous (could be local or UTC on reload).
- **Knock-on correction**: 2-H-IST prediction updated from `"2026-03-14T18:30:00"` to `"2026-03-15T00:00:00"` — same `getSaveValue()` path, `ignoreTimezone` has no effect on storage.
- **Legacy typed input observation**: Config G's legacy Kendo DateTimePicker does not use segment-by-segment editing — it accepts the full date-time string as plain text input, parsed on blur.
- Recommended next action: Run 2-H-IST to confirm ignoreTZ is no-op for legacy typed DateTime, then 2-C-IST / 2-D-IST to confirm non-legacy typed DateTime also stores local midnight.
