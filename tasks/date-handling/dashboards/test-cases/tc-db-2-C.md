# TC-DB-2-C — Config C, Date Accuracy: dashboard matches stored DateTime UTC value

## Environment Specs

| Parameter           | Value                                                                         |
| ------------------- | ----------------------------------------------------------------------------- |
| **Browser**         | Google Chrome, latest stable                                                  |
| **Dashboard URL**   | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25` |
| **Grid Component**  | Telerik RadGrid (server-rendered, ASP.NET)                                    |
| **TZ Relevance**    | None — server-rendered values are TZ-independent                              |
| **Target Field**    | `Field6` — Config C (`enableTime=true, ignoreTZ=false, useLegacy=false`)      |
| **Expected Format** | `M/D/YYYY H:MM AM/PM`                                                         |

## Preconditions

P1 — Open the DateTest Dashboard in any browser (TZ does not matter):

```
https://vvdemo.visualvault.com/app/EmanuelJofre/Main/FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25
```

P2 — Verify the RadGrid is loaded: the page title should be "VisualVault: Form Data" and column headers (Form ID, Field1, ...) should be visible.

P3 — Set page size to 200 (if not already) to see most records on one page.

P4 — Identify record DateTest-000890 (created via WS-1 BRT API test with known input `"2026-03-15T14:30:00"`).

## Test Steps

| #   | Action                | Test Data                        | Expected Result                                                                       | ✓   |
| --- | --------------------- | -------------------------------- | ------------------------------------------------------------------------------------- | --- |
| 1   | Complete setup        | See Preconditions P1–P4          | Dashboard loaded, target record visible                                               | ☐   |
| 2   | Read Field6 grid cell | DateTest-000890, column "Field6" | `3/15/2026 2:30 PM` — server renders stored UTC value `2026-03-15T14:30:00Z` directly | ☐   |

## Fail Conditions

1. **FAIL-1 (Wrong time):** Field6 shows `3/15/2026 11:30 AM` or another time (TZ conversion applied).
    - Interpretation: Server is applying a timezone offset when formatting the DateTime value instead of rendering UTC directly.

2. **FAIL-2 (Wrong date):** Field6 shows a date other than `3/15/2026`.
    - Interpretation: Server-side date extraction error from `2026-03-15T14:30:00Z`.

3. **FAIL-3 (Missing time):** Field6 shows `3/15/2026` without time despite `enableTime=true`.
    - Interpretation: Server not respecting `enableTime=true` (DB-1 already ruled this out).

## Related

| Reference              | Location                                      |
| ---------------------- | --------------------------------------------- |
| Matrix row             | `matrix.md` — row `db-2-C`                    |
| Run history            | `summaries/tc-db-2-C.md`                      |
| Bug analysis           | `analysis.md` § 3 (Bug Surface in Dashboards) |
| WS stored value source | `../web-services/matrix.md` — WS-1 Config C   |
| Cross-reference (DB-1) | `test-cases/tc-db-1-C.md` — format verified   |
