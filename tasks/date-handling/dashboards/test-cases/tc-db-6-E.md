# TC-DB-6-E — Config E, Cross-Layer: legacy date-only format mismatch

## Environment Specs

| Parameter        | Value                                                                     |
| ---------------- | ------------------------------------------------------------------------- |
| **Browser**      | Google Chrome, latest stable (BRT timezone)                               |
| **Form URL**     | `FormViewer/app?DataID=f85a0b92-b12e-f111-ba23-0e3ceb11fc25`              |
| **Target Field** | `Field12` — Config E (`enableTime=false, ignoreTZ=false, useLegacy=true`) |
| **Record**       | DateTest-000889                                                           |

## Test Steps

| #   | Action                   | Test Data                 | Expected Result            | ✓   |
| --- | ------------------------ | ------------------------- | -------------------------- | --- |
| 1   | Read dashboard grid cell | DateTest-000889, Field12  | `3/15/2026`                | ☐   |
| 2   | Open form, read display  | FormViewer, Field12 input | `3/15/2026` — should match | ☐   |

## Fail Conditions

1. **FAIL-1 (Format mismatch):** Dashboard `3/15/2026` vs form `03/15/2026`. Legacy flag has no effect on format.

## Related

| Reference    | Location                   |
| ------------ | -------------------------- |
| Matrix row   | `matrix.md` — row `db-6-E` |
| Same pattern | `test-cases/tc-db-6-A.md`  |
