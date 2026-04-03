# TC-DB-6-B — Config B, Cross-Layer: format mismatch identical to Config A

## Environment Specs

| Parameter         | Value                                                                         |
| ----------------- | ----------------------------------------------------------------------------- |
| **Browser**       | Google Chrome, latest stable (BRT timezone)                                   |
| **Dashboard URL** | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25` |
| **Form URL**      | `FormViewer/app?DataID=f85a0b92-b12e-f111-ba23-0e3ceb11fc25`                  |
| **Target Field**  | `Field10` — Config B (`enableTime=false, ignoreTZ=true, useLegacy=false`)     |
| **Record**        | DateTest-000889                                                               |

## Test Steps

| #   | Action                   | Test Data                 | Expected Result                      | ✓   |
| --- | ------------------------ | ------------------------- | ------------------------------------ | --- |
| 1   | Read dashboard grid cell | DateTest-000889, Field10  | `3/15/2026`                          | ☐   |
| 2   | Open form, read display  | FormViewer, Field10 input | `3/15/2026` — should match dashboard | ☐   |

## Fail Conditions

1. **FAIL-1 (Format mismatch):** Dashboard `3/15/2026` vs form `03/15/2026`. ignoreTZ flag has no effect on format.

## Related

| Reference    | Location                                       |
| ------------ | ---------------------------------------------- |
| Matrix row   | `matrix.md` — row `db-6-B`                     |
| Same pattern | `test-cases/tc-db-6-A.md` — identical behavior |
