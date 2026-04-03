# TC-DB-6-H — Config H, Cross-Layer: legacy ignoreTZ preserves display time, format differs

## Environment Specs

| Parameter        | Value                                                                   |
| ---------------- | ----------------------------------------------------------------------- |
| **Browser**      | Google Chrome, latest stable (BRT timezone)                             |
| **Form URL**     | `FormViewer/app?DataID=2b5e7795-b12e-f111-ba23-0afff212cc87`            |
| **Target Field** | `Field13` — Config H (`enableTime=true, ignoreTZ=true, useLegacy=true`) |
| **Record**       | DateTest-000890 (stored `2026-03-15T14:30:00Z`)                         |

## Test Steps

| #   | Action                   | Test Data                 | Expected Result                    | ✓   |
| --- | ------------------------ | ------------------------- | ---------------------------------- | --- |
| 1   | Read dashboard grid cell | DateTest-000890, Field13  | `3/15/2026 2:30 PM` (UTC)          | ☐   |
| 2   | Open form, read display  | FormViewer, Field13 input | `3/15/2026 2:30 PM` — should match | ☐   |

## Fail Conditions

1. **FAIL-1 (Format mismatch):** Dashboard `3/15/2026 2:30 PM` vs form `03/15/2026 02:30 PM`. Time matches (2:30 PM), format has leading zeros. Same as Config D.

## Related

| Reference    | Location                   |
| ------------ | -------------------------- |
| Matrix row   | `matrix.md` — row `db-6-H` |
| Same pattern | `test-cases/tc-db-6-D.md`  |
