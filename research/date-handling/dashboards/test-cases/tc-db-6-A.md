# TC-DB-6-A — Config A, Cross-Layer: dashboard M/D vs form MM/DD format mismatch

## Environment Specs

| Parameter          | Value                                                                         |
| ------------------ | ----------------------------------------------------------------------------- |
| **Browser**        | Google Chrome, latest stable (BRT timezone)                                   |
| **Dashboard URL**  | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25` |
| **Form URL**       | `FormViewer/app?DataID=f85a0b92-b12e-f111-ba23-0e3ceb11fc25`                  |
| **Grid Component** | Telerik RadGrid (server-rendered, ASP.NET)                                    |
| **Form Component** | Angular SPA with VV.Form (V1 code path)                                       |
| **Target Field**   | `Field7` — Config A (`enableTime=false, ignoreTZ=false, useLegacy=false`)     |
| **Record**         | DateTest-000889                                                               |

## Preconditions

P1 — Open the DateTest Dashboard. Identify DateTest-000889 in the grid.

P2 — Note the dashboard grid value for Field7.

P3 — Navigate to the form for DateTest-000889 via FormViewer URL.

P4 — Wait for VV.Form to load (V1 code path expected).

## Test Steps

| #   | Action                   | Test Data                       | Expected Result                              | ✓   |
| --- | ------------------------ | ------------------------------- | -------------------------------------------- | --- |
| 1   | Read dashboard grid cell | DateTest-000889, Field7         | `3/15/2026` — server M/D/YYYY format         | ☐   |
| 2   | Open form, read display  | FormViewer, Field7 input        | `3/15/2026` — should match dashboard exactly | ☐   |
| 3   | Capture form raw value   | `getValueObjectValue('Field7')` | `2026-03-15` — ISO stored value              | ☐   |
| 4   | Capture form GFV         | `GetFieldValue('Field7')`       | `2026-03-15` — same as raw for date-only     | ☐   |

## Fail Conditions

1. **FAIL-1 (Format mismatch):** Dashboard shows `3/15/2026` but form shows `03/15/2026` (leading zeros).
    - Interpretation: Server uses `M/d/yyyy` (no leading zeros), Forms Angular SPA uses `MM/dd/yyyy`. The DATE is identical but the FORMAT is inconsistent across layers.

## Related

| Reference            | Location                                   |
| -------------------- | ------------------------------------------ |
| Matrix row           | `matrix.md` — row `db-6-A`                 |
| Run history          | `summaries/tc-db-6-A.md`                   |
| Cross-layer analysis | `analysis.md` § 5 (Cross-Layer Comparison) |
| Dashboard accuracy   | `test-cases/tc-db-2-A.md` — DB-2 baseline  |
