# TC-DB-1-B — Config B, Display Format: date-only ignoreTZ shows M/D/YYYY without time

## Environment Specs

| Parameter           | Value                                                                         |
| ------------------- | ----------------------------------------------------------------------------- |
| **Browser**         | Google Chrome, latest stable                                                  |
| **Dashboard URL**   | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25` |
| **Grid Component**  | Telerik RadGrid (server-rendered, ASP.NET)                                    |
| **TZ Relevance**    | None — server-rendered values are TZ-independent                              |
| **Target Field**    | `Field10` — Config B (`enableTime=false, ignoreTZ=true, useLegacy=false`)     |
| **Expected Format** | `M/D/YYYY`                                                                    |

## Preconditions

P1 — Open the DateTest Dashboard in any browser (TZ does not matter):

```
https://vvdemo.visualvault.com/app/EmanuelJofre/Main/FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25
```

P2 — Verify the RadGrid is loaded: the page title should be "VisualVault: Form Data" and column headers (Form ID, Field1, ...) should be visible.

P3 — Set page size to 200 (if not already) to see most records on one page.

P4 — Identify a record with a non-empty Field10 value (e.g., DateTest-000897).

## Test Steps

| #   | Action                      | Test Data                         | Expected Result                                                      | ✓   |
| --- | --------------------------- | --------------------------------- | -------------------------------------------------------------------- | --- |
| 1   | Complete setup              | See Preconditions P1–P4           | Dashboard loaded, target record visible                              | ☐   |
| 2   | Read Field10 grid cell      | DateTest-000897, column "Field10" | `3/15/2026` — format `M/D/YYYY`, no time component, no leading zeros | ☐   |
| 3   | Verify format on 2nd record | DateTest-000889, column "Field10" | `3/15/2026` — same `M/D/YYYY` format                                 | ☐   |

## Fail Conditions

1. **FAIL-1 (Time component present):** Field10 shows a value like `3/15/2026 12:00 AM` with a time component. enableTime=false fields should never display time.
    - Interpretation: Server-side formatter is not respecting the enableTime=false flag for ignoreTZ fields.

2. **FAIL-2 (Leading zeros):** Field10 shows `03/15/2026` instead of `3/15/2026`.
    - Interpretation: Server uses `MM/dd/yyyy` format instead of `M/d/yyyy`.

3. **FAIL-3 (ignoreTZ affects format):** Format differs from Config A (Field7) despite both being date-only.
    - Interpretation: ignoreTZ flag is incorrectly influencing server-side display format.

## Related

| Reference               | Location                                      |
| ----------------------- | --------------------------------------------- |
| Matrix row              | `matrix.md` — row `db-1-B`                    |
| Run history             | `summaries/tc-db-1-B.md`                      |
| Bug analysis            | `analysis.md` § 2 (Date Display Format Rules) |
| Cross-reference (Forms) | `../forms-calendar/matrix.md` — Config B rows |
| Cross-reference (WS)    | `../web-services/matrix.md` — Config B rows   |
