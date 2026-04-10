# TC-13-after-roundtrip — Run 1 | 2026-04-08 | BRT | FAIL

**Spec**: [tc-13-after-roundtrip.md](tasks/date-handling/forms-calendar/test-cases/tc-13-after-roundtrip.md) | **Summary**: [summary](../summaries/tc-13-after-roundtrip.md)

## Environment

| Parameter   | Value                                                   |
| ----------- | ------------------------------------------------------- |
| Date        | 2026-04-08                                              |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                         |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)             |
| Platform    | VisualVault FormViewer, Build 20260304.1 + REST API     |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) + WS-2 |

## Preconditions Verified

| Check        | Command                                                     | Result                |
| ------------ | ----------------------------------------------------------- | --------------------- |
| TZ           | `new Date().toString()`                                     | Contains `GMT-0300` ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓ |
| Field lookup | Config D filter                                             | `["Field5"]` ✓        |
| Form         | DateTest-001919                                             | Fresh instance ✓      |

## Step Results

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| 2      | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00"`      | PASS  |
| 3      | `"2026-03-15T00:00:00.000Z"` | `"2026-03-15T00:00:00.000Z"` | PASS  |
| 4      | `"2026-03-14T21:00:00"`      | `"2026-03-14T21:00:00"`      | PASS  |
| 6      | `"2026-03-14T21:00:00Z"`     | `"2026-03-14T21:00:00Z"`     | PASS  |

> All steps match predictions, but step 6 is the critical one: the API read confirms the drifted value persists in the database.

## Outcome

**FAIL** — Bug #5 drift (-3h after 1 BRT round-trip) persists to the database. API returns `"2026-03-14T21:00:00Z"` for a value that should be `"2026-03-15T00:00:00Z"`.

## Findings

- **Drift is permanent**: The -3h shift from `SetFieldValue(GetFieldValue())` is saved to the database, not just held in client-side state. Any subsequent API read, dashboard display, or report query will see the corrupted value.
- **Verification record**: DateTest-001919 (created and saved 2026-04-08 from BRT via Playwright CLI)
- **Production impact**: Scripts that read a date field and write it back (e.g., for field synchronization, formatting, or conditional logic) will silently corrupt the stored date by -3h per invocation in BRT.
