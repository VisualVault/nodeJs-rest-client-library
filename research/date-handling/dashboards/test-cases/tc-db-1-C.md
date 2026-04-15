# TC-DB-1-C — Config C, Display Format: DateTime shows M/D/YYYY H:MM AM/PM

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

P4 — Identify a record with a non-empty Field6 value (e.g., DateTest-001051).

## Test Steps

| #   | Action                      | Test Data                        | Expected Result                                                                        | ✓   |
| --- | --------------------------- | -------------------------------- | -------------------------------------------------------------------------------------- | --- |
| 1   | Complete setup              | See Preconditions P1–P4          | Dashboard loaded, target record visible                                                | ☐   |
| 2   | Read Field6 grid cell       | DateTest-001051, column "Field6" | `3/15/2026 12:00 AM` — format `M/D/YYYY H:MM AM/PM`, 12-hour clock with AM/PM          | ☐   |
| 3   | Verify format on 2nd record | DateTest-001050, column "Field6" | `3/15/2026 3:00 AM` — same `M/D/YYYY H:MM AM/PM` format (different time, same pattern) | ☐   |

## Fail Conditions

1. **FAIL-1 (No time component):** Field6 shows `3/15/2026` without a time. enableTime=true fields must display the time component.
    - Interpretation: Server-side formatter is not respecting the enableTime=true flag.

2. **FAIL-2 (24-hour clock):** Field6 shows `3/15/2026 15:00` instead of `3/15/2026 3:00 PM`.
    - Interpretation: Server uses 24-hour format instead of 12-hour AM/PM.

3. **FAIL-3 (Seconds displayed):** Field6 shows `3/15/2026 12:00:00 AM` with seconds.
    - Interpretation: Server format includes seconds — unexpected for this grid.

## Related

| Reference               | Location                                      |
| ----------------------- | --------------------------------------------- |
| Matrix row              | `matrix.md` — row `db-1-C`                    |
| Run history             | `summaries/tc-db-1-C.md`                      |
| Bug analysis            | `analysis.md` § 2 (Date Display Format Rules) |
| Cross-reference (Forms) | `../forms-calendar/matrix.md` — Config C rows |
| Cross-reference (WS)    | `../web-services/matrix.md` — Config C rows   |
