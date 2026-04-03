# TC-DB-6-D — Config D, Cross-Layer: format mismatch only — ignoreTZ preserves display time

## Environment Specs

| Parameter         | Value                                                                         |
| ----------------- | ----------------------------------------------------------------------------- |
| **Browser**       | Google Chrome, latest stable (BRT timezone)                                   |
| **Dashboard URL** | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25` |
| **Form URL**      | `FormViewer/app?DataID=2b5e7795-b12e-f111-ba23-0afff212cc87`                  |
| **Target Field**  | `Field5` — Config D (`enableTime=true, ignoreTZ=true, useLegacy=false`)       |
| **Record**        | DateTest-000890 (stored `2026-03-15T14:30:00Z`)                               |

## Test Steps

| #   | Action                   | Test Data                       | Expected Result                                   | ✓   |
| --- | ------------------------ | ------------------------------- | ------------------------------------------------- | --- |
| 1   | Read dashboard grid cell | DateTest-000890, Field5         | `3/15/2026 2:30 PM` — server renders UTC directly | ☐   |
| 2   | Open form, read display  | FormViewer, Field5 input        | `3/15/2026 2:30 PM` — should match dashboard      | ☐   |
| 3   | Capture form raw value   | `getValueObjectValue('Field5')` | Internal stored value                             | ☐   |
| 4   | Capture form GFV         | `GetFieldValue('Field5')`       | Bug #5: fake Z suffix expected                    | ☐   |

## Fail Conditions

1. **FAIL-1 (Format mismatch):** Dashboard `3/15/2026 2:30 PM` vs form `03/15/2026 02:30 PM`. Time matches but format has leading zeros.
    - Interpretation: The display TIME is consistent (`2:30 PM` ≡ `02:30 PM`) thanks to `ignoreTZ=true`. Only the date format and time format differ cosmetically.

2. **FAIL-2 (Raw value divergence):** Form raw = `2026-03-15T11:30:00` (BRT local, 3h behind UTC). Form display shows `02:30 PM` (correct stored time) but raw is `11:30` (V1 converted UTC→BRT internally).
    - Interpretation: V1 stores the BRT-converted value internally. `ignoreTZ` forces the DISPLAY to show the original time. But raw storage and GFV reflect the local conversion. Bug #5 adds fake Z to GFV.

## Related

| Reference  | Location                                 |
| ---------- | ---------------------------------------- |
| Matrix row | `matrix.md` — row `db-6-D`               |
| Bug #5     | `../forms-calendar/analysis.md` § Bug #5 |
