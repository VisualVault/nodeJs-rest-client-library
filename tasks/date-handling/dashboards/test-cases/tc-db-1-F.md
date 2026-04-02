# TC-DB-1-F — Config F, Display Format: legacy date-only ignoreTZ shows M/D/YYYY without time

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

P4 — Identify a record with a non-empty Field11 value (e.g., DateTest-000899).

## Test Steps

| #   | Action                      | Test Data                         | Expected Result                                                      | ✓   |
| --- | --------------------------- | --------------------------------- | -------------------------------------------------------------------- | --- |
| 1   | Complete setup              | See Preconditions P1–P4           | Dashboard loaded, target record visible                              | ☐   |
| 2   | Read Field11 grid cell      | DateTest-000899, column "Field11" | `3/15/2026` — format `M/D/YYYY`, no time component, no leading zeros | ☐   |
| 3   | Verify format on 2nd record | DateTest-000889, column "Field11" | `3/15/2026` — same `M/D/YYYY` format                                 | ☐   |

## Fail Conditions

1. **FAIL-1 (Time component present):** Field11 shows a value with a time component. enableTime=false fields should never display time.
    - Interpretation: Legacy + ignoreTZ combination is incorrectly causing time display.

2. **FAIL-2 (Format differs from A/B/E):** Format differs from other date-only configs despite all having enableTime=false.
    - Interpretation: The combination of useLegacy=true + ignoreTZ=true is influencing server-side display format.

## Related

| Reference               | Location                                      |
| ----------------------- | --------------------------------------------- |
| Matrix row              | `matrix.md` — row `db-1-F`                    |
| Run history             | `summaries/tc-db-1-F.md`                      |
| Bug analysis            | `analysis.md` § 2 (Date Display Format Rules) |
| Cross-reference (Forms) | `../forms-calendar/matrix.md` — Config F rows |
| Cross-reference (WS)    | `../web-services/matrix.md` — Config F rows   |
