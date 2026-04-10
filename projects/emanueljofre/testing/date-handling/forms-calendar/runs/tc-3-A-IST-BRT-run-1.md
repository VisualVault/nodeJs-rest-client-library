# TC-3-A-IST-BRT — Run 1 | 2026-04-01 | BRT | FAIL-3

**Spec**: [tc-3-A-IST-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-3-A-IST-BRT.md) | **Summary**: [summary](../summaries/tc-3-A-IST-BRT.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-01                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer, Build 20260304.1         |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                               |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                     | `"Wed Apr 01 2026 12:26:00 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                                |
| Field lookup | Config A filter                                             | `["DataField7"]` ✓                                                                   |

## Step Results

| Step # | Expected                     | Actual                       | Match    |
| ------ | ---------------------------- | ---------------------------- | -------- |
| 2      | `DateTest-000084 Rev 1`      | `"DateTest-000084 Rev 1"`    | PASS     |
| 3      | `03/15/2026`                 | `03/14/2026`                 | **FAIL** |
| 4      | `"2026-03-15"`               | `"2026-03-14"`               | **FAIL** |
| 5      | `"2026-03-15"`               | `"2026-03-14"`               | **FAIL** |
| 6      | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | PASS     |

## Outcome

**FAIL-3** — Bug #7 wrong day baked in during IST save. The DB stores `"2026-03-14"` instead of `"2026-03-15"`. BRT reload faithfully renders the corrupted value with no additional shift.

## Findings

- **Actual matches matrix prediction**: Yes — the matrix predicted `"2026-03-14"` (Bug #7 baked in during IST save), and that is exactly what was observed.
- **Bug #7 confirmed on save path in IST**: The date shifted -1 day during the IST save (`normalizeCalValue()` → `moment("03/15/2026").toDate()` → IST midnight → previous UTC day). The corruption is permanent in the DB.
- **BRT reload path is clean**: No additional shift on BRT reload. Raw and API values both return `"2026-03-14"` — the same corrupted value from the DB. This is consistent with TC-3-A-BRT-BRT and TC-3-A-BRT-IST, which both proved the reload path preserves the stored value without re-parsing.
- **GFV unchanged**: `GetFieldValue()` returns the same value as `getValueObjectValue()` — no output transformation for Config A date-only fields. Bug #5 (fake Z) does not apply here.
- **Sibling implications**: TC-3-B-IST-BRT (Config B, same direction) should produce identical results — `ignoreTZ` is inert for date-only fields. TC-3-A-BRT-IST (reverse direction, PASS) already proved the load path is clean; this test confirms the asymmetry is save-path only.
- **Recommended next action**: Run TC-3-B-IST-BRT to confirm `ignoreTZ` inertness for date-only fields in the IST→BRT direction.
