# TC-DB-2-D — Config D, Date Accuracy: dashboard matches stored DateTime+ignoreTZ value

## Environment Specs

| Parameter           | Value                                                                         |
| ------------------- | ----------------------------------------------------------------------------- |
| **Browser**         | Google Chrome, latest stable                                                  |
| **Dashboard URL**   | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25` |
| **Grid Component**  | Telerik RadGrid (server-rendered, ASP.NET)                                    |
| **TZ Relevance**    | None — server-rendered values are TZ-independent                              |
| **Target Field**    | `Field5` — Config D (`enableTime=true, ignoreTZ=true, useLegacy=false`)       |
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
| 2   | Read Field5 grid cell | DateTest-000890, column "Field5" | `3/15/2026 2:30 PM` — server renders stored UTC value `2026-03-15T14:30:00Z` directly | ☐   |

## Fail Conditions

1. **FAIL-1 (Wrong time):** Field5 shows a different time than `2:30 PM`.
    - Interpretation: Server applying TZ conversion or `ignoreTZ` flag affecting server-side rendering (should not — `ignoreTZ` is client-side only).

2. **FAIL-2 (Wrong date):** Field5 shows a date other than `3/15/2026`.
    - Interpretation: Server-side date extraction error from stored value.

## Related

| Reference              | Location                                      |
| ---------------------- | --------------------------------------------- |
| Matrix row             | `matrix.md` — row `db-2-D`                    |
| Run history            | `summaries/tc-db-2-D.md`                      |
| Bug analysis           | `analysis.md` § 3 (Bug Surface in Dashboards) |
| WS stored value source | `../web-services/matrix.md` — WS-1 Config D   |
| Cross-reference (DB-1) | `test-cases/tc-db-1-D.md` — format verified   |
