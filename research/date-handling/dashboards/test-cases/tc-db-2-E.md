# TC-DB-2-E — Config E, Date Accuracy: dashboard matches stored legacy date-only value

## Environment Specs

| Parameter           | Value                                                                         |
| ------------------- | ----------------------------------------------------------------------------- |
| **Browser**         | Google Chrome, latest stable                                                  |
| **Dashboard URL**   | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25` |
| **Grid Component**  | Telerik RadGrid (server-rendered, ASP.NET)                                    |
| **TZ Relevance**    | None — server-rendered values are TZ-independent                              |
| **Target Field**    | `Field12` — Config E (`enableTime=false, ignoreTZ=false, useLegacy=true`)     |
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
| 2   | Read Field12 grid cell | DateTest-000889, column "Field12" | `3/15/2026` — matches stored value `2026-03-15T00:00:00Z` date part | ☐   |

## Fail Conditions

1. **FAIL-1 (Wrong date):** Field12 shows a date other than `3/15/2026`.
    - Interpretation: Server-side formatter error. `useLegacy=true` should not affect server-side rendering.

2. **FAIL-2 (Different format):** Field12 shows a different format than non-legacy Config A.
    - Interpretation: `useLegacy` flag is unexpectedly affecting server-side display format.

## Related

| Reference              | Location                                      |
| ---------------------- | --------------------------------------------- |
| Matrix row             | `matrix.md` — row `db-2-E`                    |
| Run history            | `summaries/tc-db-2-E.md`                      |
| Bug analysis           | `analysis.md` § 3 (Bug Surface in Dashboards) |
| WS stored value source | `../web-services/matrix.md` — WS-1 Config E   |
| Cross-reference (DB-1) | `test-cases/tc-db-1-E.md` — format verified   |
