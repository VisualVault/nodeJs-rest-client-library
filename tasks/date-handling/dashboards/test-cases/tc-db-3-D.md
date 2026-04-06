# TC-DB-3-D — Config D, Wrong Date Detection: Bug #5 drift shifts DateTime backward

## Environment Specs

| Parameter          | Value                                                                         |
| ------------------ | ----------------------------------------------------------------------------- |
| **Browser**        | Google Chrome, latest stable                                                  |
| **Dashboard URL**  | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25` |
| **Grid Component** | Telerik RadGrid (server-rendered, ASP.NET)                                    |
| **TZ Relevance**   | None — server-rendered values are TZ-independent                              |
| **Target Field**   | `Field5` — Config D (`enableTime=true, ignoreTZ=true, useLegacy=false`)       |
| **Bug Under Test** | Bug #5 — fake Z in GetFieldValue causes -3h drift per round-trip (BRT)        |

## Preconditions

P1 — Create a test record via WS-1 API with Bug #5 drift simulated value:

```bash
node testing/scripts/run-ws-test.js --action WS-1 --configs D --input-date "2026-03-14T21:00:00"
```

This simulates: a BRT script does `SetFieldValue('Field5', GetFieldValue('Field5'))` once. Original value was `"2026-03-15T00:00:00"` (midnight). Bug #5 adds fake Z → `"2026-03-15T00:00:00.000Z"` → parsed as UTC midnight → BRT is UTC-3 → stored as `"2026-03-14T21:00:00"`. The date shifts from 3/15 to 3/14 after one round-trip.

P2 — Open the DateTest Dashboard and verify the record appears.

## Test Steps

| #   | Action                | Test Data                        | Expected Result                                                        | ✓   |
| --- | --------------------- | -------------------------------- | ---------------------------------------------------------------------- | --- |
| 1   | Complete setup        | See Preconditions P1–P2          | Dashboard loaded, test record visible                                  | ☐   |
| 2   | Read Field5 grid cell | DateTest-001079, column "Field5" | `3/14/2026 9:00 PM` — drifted time (intended 3/15 midnight, -3h drift) | ☐   |

## Fail Conditions

1. **FAIL-1 (Original value shown):** Field5 shows `3/15/2026 12:00 AM`.
    - Interpretation: Bug #5 fake Z fixed, round-trip no longer causes drift.

## Related

| Reference                | Location                                      |
| ------------------------ | --------------------------------------------- |
| Matrix row               | `matrix.md` — row `db-3-D`                    |
| Run history              | `summaries/tc-db-3-D.md`                      |
| Bug #5 analysis          | `../forms-calendar/analysis.md` § Bug #5      |
| Cross-reference (DB-2-D) | `test-cases/tc-db-2-D.md` — accuracy baseline |
