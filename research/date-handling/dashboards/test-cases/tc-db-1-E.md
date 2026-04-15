# TC-DB-1-E — Config E, Display Format: legacy date-only shows M/D/YYYY without time

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

P4 — Identify a record with a non-empty Field12 value (e.g., DateTest-000899).

## Test Steps

| #   | Action                      | Test Data                         | Expected Result                                                      | ✓   |
| --- | --------------------------- | --------------------------------- | -------------------------------------------------------------------- | --- |
| 1   | Complete setup              | See Preconditions P1–P4           | Dashboard loaded, target record visible                              | ☐   |
| 2   | Read Field12 grid cell      | DateTest-000899, column "Field12" | `3/15/2026` — format `M/D/YYYY`, no time component, no leading zeros | ☐   |
| 3   | Verify format on 2nd record | DateTest-000889, column "Field12" | `3/15/2026` — same `M/D/YYYY` format                                 | ☐   |

## Fail Conditions

1. **FAIL-1 (Time component present):** Field12 shows a value with a time component. enableTime=false fields should never display time regardless of useLegacy.
    - Interpretation: Legacy flag is incorrectly causing time display on date-only fields.

2. **FAIL-2 (Legacy format differs):** Format differs from Config A (Field7) despite both being date-only with enableTime=false.
    - Interpretation: useLegacy flag is incorrectly influencing server-side display format.

3. **FAIL-3 (ISO or raw format):** Field12 shows `2026-03-15T00:00:00` or similar raw/ISO format.
    - Interpretation: Legacy fields may store in a different format that the server renders as-is.

## Related

| Reference               | Location                                      |
| ----------------------- | --------------------------------------------- |
| Matrix row              | `matrix.md` — row `db-1-E`                    |
| Run history             | `summaries/tc-db-1-E.md`                      |
| Bug analysis            | `analysis.md` § 2 (Date Display Format Rules) |
| Cross-reference (Forms) | `../forms-calendar/matrix.md` — Config E rows |
| Cross-reference (WS)    | `../web-services/matrix.md` — Config E rows   |
