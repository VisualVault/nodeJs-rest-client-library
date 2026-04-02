# TC-DB-1-G — Config G, Display Format: legacy DateTime shows M/D/YYYY H:MM AM/PM

## Environment Specs

| Parameter           | Value                                                                         |
| ------------------- | ----------------------------------------------------------------------------- |
| **Browser**         | Google Chrome, latest stable                                                  |
| **Dashboard URL**   | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25` |
| **Grid Component**  | Telerik RadGrid (server-rendered, ASP.NET)                                    |
| **TZ Relevance**    | None — server-rendered values are TZ-independent                              |
| **Target Field**    | `Field14` — Config G (`enableTime=true, ignoreTZ=false, useLegacy=true`)      |
| **Expected Format** | `M/D/YYYY H:MM AM/PM`                                                         |

## Preconditions

P1 — Open the DateTest Dashboard in any browser (TZ does not matter):

```
https://vvdemo.visualvault.com/app/EmanuelJofre/Main/FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25
```

P2 — Verify the RadGrid is loaded: the page title should be "VisualVault: Form Data" and column headers (Form ID, Field1, ...) should be visible.

P3 — Set page size to 200 (if not already) to see most records on one page.

P4 — Identify a record with a non-empty Field14 value (e.g., DateTest-000898).

## Test Steps

| #   | Action                      | Test Data                         | Expected Result                                                                        | ✓   |
| --- | --------------------------- | --------------------------------- | -------------------------------------------------------------------------------------- | --- |
| 1   | Complete setup              | See Preconditions P1–P4           | Dashboard loaded, target record visible                                                | ☐   |
| 2   | Read Field14 grid cell      | DateTest-000898, column "Field14" | `3/15/2026 12:00 AM` — format `M/D/YYYY H:MM AM/PM`, 12-hour clock with AM/PM          | ☐   |
| 3   | Verify format on 2nd record | DateTest-000890, column "Field14" | `3/15/2026 2:30 PM` — same `M/D/YYYY H:MM AM/PM` format (different time, same pattern) | ☐   |

## Fail Conditions

1. **FAIL-1 (No time component):** Field14 shows `3/15/2026` without a time. enableTime=true fields must display the time component.
    - Interpretation: Server-side formatter is not respecting enableTime=true for legacy fields.

2. **FAIL-2 (Legacy format differs from C/D):** DateTime format differs from non-legacy DateTime configs.
    - Interpretation: useLegacy flag is influencing server-side DateTime display format.

3. **FAIL-3 (Raw ISO or legacy format):** Field14 shows `2026-03-15T00:00:00.000` or similar raw format.
    - Interpretation: Legacy DateTime fields may store in a different format that the server renders as-is.

## Related

| Reference               | Location                                      |
| ----------------------- | --------------------------------------------- |
| Matrix row              | `matrix.md` — row `db-1-G`                    |
| Run history             | `summaries/tc-db-1-G.md`                      |
| Bug analysis            | `analysis.md` § 2 (Date Display Format Rules) |
| Cross-reference (Forms) | `../forms-calendar/matrix.md` — Config G rows |
| Cross-reference (WS)    | `../web-services/matrix.md` — Config G rows   |
