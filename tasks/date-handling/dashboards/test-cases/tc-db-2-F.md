# TC-DB-2-F — Config F, Date Accuracy: dashboard matches stored legacy date-only+ignoreTZ value

## Environment Specs

| Parameter           | Value                                                                         |
| ------------------- | ----------------------------------------------------------------------------- |
| **Browser**         | Google Chrome, latest stable                                                  |
| **Dashboard URL**   | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25` |
| **Grid Component**  | Telerik RadGrid (server-rendered, ASP.NET)                                    |
| **TZ Relevance**    | None — server-rendered values are TZ-independent                              |
| **Target Field**    | `Field11` — Config F (`enableTime=false, ignoreTZ=true, useLegacy=true`)      |
| **Expected Format** | `M/D/YYYY`                                                                    |

## Preconditions

P1 — Open the DateTest Dashboard in any browser (TZ does not matter):

```
https://vvdemo.visualvault.com/app/EmanuelJofre/Main/FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25
```

P2 — Verify the RadGrid is loaded: the page title should be "VisualVault: Form Data" and column headers (Form ID, Field1, ...) should be visible.

P3 — Set page size to 200 (if not already) to see most records on one page.

P4 — Identify record DateTest-000889 (created via WS-1 BRT API test with known input `"2026-03-15"`).

## Test Steps

| #   | Action                 | Test Data                         | Expected Result                                                     | ✓   |
| --- | ---------------------- | --------------------------------- | ------------------------------------------------------------------- | --- |
| 1   | Complete setup         | See Preconditions P1–P4           | Dashboard loaded, target record visible                             | ☐   |
| 2   | Read Field11 grid cell | DateTest-000889, column "Field11" | `3/15/2026` — matches stored value `2026-03-15T00:00:00Z` date part | ☐   |

## Fail Conditions

1. **FAIL-1 (Wrong date):** Field11 shows a date other than `3/15/2026`.
    - Interpretation: Server-side formatter error. `ignoreTZ=true` + `useLegacy=true` should not affect server-side rendering.

## Related

| Reference              | Location                                      |
| ---------------------- | --------------------------------------------- |
| Matrix row             | `matrix.md` — row `db-2-F`                    |
| Run history            | `summaries/tc-db-2-F.md`                      |
| Bug analysis           | `analysis.md` § 3 (Bug Surface in Dashboards) |
| WS stored value source | `../web-services/matrix.md` — WS-1 Config F   |
| Cross-reference (DB-1) | `test-cases/tc-db-1-F.md` — format verified   |
