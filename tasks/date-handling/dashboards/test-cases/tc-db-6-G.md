# TC-DB-6-G — Config G, Cross-Layer: legacy DateTime shows UTC vs BRT time shift

## Environment Specs

| Parameter        | Value                                                                    |
| ---------------- | ------------------------------------------------------------------------ |
| **Browser**      | Google Chrome, latest stable (BRT timezone, UTC-3)                       |
| **Form URL**     | `FormViewer/app?DataID=2b5e7795-b12e-f111-ba23-0afff212cc87`             |
| **Target Field** | `Field14` — Config G (`enableTime=true, ignoreTZ=false, useLegacy=true`) |
| **Record**       | DateTest-000890 (stored `2026-03-15T14:30:00Z`)                          |

## Test Steps

| #   | Action                   | Test Data                 | Expected Result                    | ✓   |
| --- | ------------------------ | ------------------------- | ---------------------------------- | --- |
| 1   | Read dashboard grid cell | DateTest-000890, Field14  | `3/15/2026 2:30 PM` (UTC)          | ☐   |
| 2   | Open form, read display  | FormViewer, Field14 input | `3/15/2026 2:30 PM` — should match | ☐   |

## Fail Conditions

1. **FAIL-2 (Time shift):** Dashboard `2:30 PM` (UTC) vs form `11:30 AM` (BRT). Same behavior as Config C.
    - Interpretation: Legacy DateTime with ignoreTZ=false converts UTC to local, identical to non-legacy Config C.

## Related

| Reference    | Location                   |
| ------------ | -------------------------- |
| Matrix row   | `matrix.md` — row `db-6-G` |
| Same pattern | `test-cases/tc-db-6-C.md`  |
