# TC-DB-6-C — Config C, Cross-Layer: dashboard 2:30 PM (UTC) vs form 11:30 AM (BRT)

## Environment Specs

| Parameter         | Value                                                                         |
| ----------------- | ----------------------------------------------------------------------------- |
| **Browser**       | Google Chrome, latest stable (BRT timezone, UTC-3)                            |
| **Dashboard URL** | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25` |
| **Form URL**      | `FormViewer/app?DataID=2b5e7795-b12e-f111-ba23-0afff212cc87`                  |
| **Target Field**  | `Field6` — Config C (`enableTime=true, ignoreTZ=false, useLegacy=false`)      |
| **Record**        | DateTest-000890 (stored `2026-03-15T14:30:00Z`)                               |

## Test Steps

| #   | Action                   | Test Data                       | Expected Result                                   | ✓   |
| --- | ------------------------ | ------------------------------- | ------------------------------------------------- | --- |
| 1   | Read dashboard grid cell | DateTest-000890, Field6         | `3/15/2026 2:30 PM` — server renders UTC directly | ☐   |
| 2   | Open form, read display  | FormViewer, Field6 input        | `3/15/2026 2:30 PM` — should match dashboard      | ☐   |
| 3   | Capture form raw value   | `getValueObjectValue('Field6')` | Stored value after V1 processing                  | ☐   |
| 4   | Capture form GFV         | `GetFieldValue('Field6')`       | API return value                                  | ☐   |

## Fail Conditions

1. **FAIL-1 (Format mismatch):** Dashboard `3/15/2026` vs form `03/15/2026` (leading zeros).

2. **FAIL-2 (Time shift):** Dashboard `2:30 PM` vs form `11:30 AM`. Server displays UTC time (14:30Z). Forms V1 converts UTC to BRT local (14:30 - 3h = 11:30).
    - Interpretation: Dashboard and Forms interpret the stored Z-suffixed value differently. Dashboard renders UTC literally. Forms V1 applies timezone conversion. Both are "correct" in their own framework but inconsistent with each other.

## Related

| Reference         | Location                                              |
| ----------------- | ----------------------------------------------------- |
| Matrix row        | `matrix.md` — row `db-6-C`                            |
| V1 UTC conversion | `../forms-calendar/analysis.md` — initCalendarValueV1 |
