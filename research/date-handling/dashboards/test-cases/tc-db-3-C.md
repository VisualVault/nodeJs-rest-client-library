# TC-DB-3-C — Config C, Wrong Date Detection: Bug #7 variant shifts DateTime to wrong day

## Environment Specs

| Parameter          | Value                                                                         |
| ------------------ | ----------------------------------------------------------------------------- |
| **Browser**        | Google Chrome, latest stable                                                  |
| **Dashboard URL**  | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25` |
| **Grid Component** | Telerik RadGrid (server-rendered, ASP.NET)                                    |
| **TZ Relevance**   | None — server-rendered values are TZ-independent                              |
| **Target Field**   | `Field6` — Config C (`enableTime=true, ignoreTZ=false, useLegacy=false`)      |
| **Bug Under Test** | Bug #7 variant — DateTime field set with date-only string from UTC+ timezone  |

## Preconditions

P1 — Create a test record via WS-1 API with Bug #7 variant simulated value:

```bash
node testing/scripts/run-ws-test.js --action WS-1 --configs C --input-date "2026-03-14T00:00:00"
```

This simulates: a script calls `SetFieldValue('Field6', '2026-03-15')` from IST. `normalizeCalValue()` parses as IST midnight → `2026-03-14T18:30:00Z` → stored as `2026-03-14T00:00:00` after format processing. The intended date was 3/15 but midnight UTC of 3/14 was stored.

P2 — Open the DateTest Dashboard and verify the record appears.

## Test Steps

| #   | Action                | Test Data                        | Expected Result                                            | ✓   |
| --- | --------------------- | -------------------------------- | ---------------------------------------------------------- | --- |
| 1   | Complete setup        | See Preconditions P1–P2          | Dashboard loaded, test record visible                      | ☐   |
| 2   | Read Field6 grid cell | DateTest-001078, column "Field6" | `3/14/2026 12:00 AM` — wrong day (intended 3/15), midnight | ☐   |

## Fail Conditions

1. **FAIL-1 (Correct date shown):** Field6 shows `3/15/2026` with any time.
    - Interpretation: Bug #7 variant fixed for DateTime fields, or server corrects the stored value.

## Related

| Reference                | Location                                      |
| ------------------------ | --------------------------------------------- |
| Matrix row               | `matrix.md` — row `db-3-C`                    |
| Run history              | `summaries/tc-db-3-C.md`                      |
| Bug analysis             | `analysis.md` § 3 (Mixed Time Components)     |
| Cross-reference (DB-2-C) | `test-cases/tc-db-2-C.md` — accuracy baseline |
