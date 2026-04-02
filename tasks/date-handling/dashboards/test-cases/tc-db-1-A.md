# TC-DB-1-A — Config A, Display Format: date-only shows M/D/YYYY without time

## Environment Specs

| Parameter           | Value                                                                         |
| ------------------- | ----------------------------------------------------------------------------- |
| **Browser**         | Google Chrome, latest stable                                                  |
| **Dashboard URL**   | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25` |
| **Grid Component**  | Telerik RadGrid (server-rendered, ASP.NET)                                    |
| **TZ Relevance**    | None — server-rendered values are TZ-independent                              |
| **Target Field**    | `Field7` — Config A (`enableTime=false, ignoreTZ=false, useLegacy=false`)     |
| **Expected Format** | `M/D/YYYY`                                                                    |

## Preconditions

P1 — Open the DateTest Dashboard in any browser (TZ does not matter):

```
https://vvdemo.visualvault.com/app/EmanuelJofre/Main/FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25
```

P2 — Verify the RadGrid is loaded: the page title should be "VisualVault: Form Data" and column headers (Form ID, Field1, ...) should be visible.

P3 — Set page size to 200 (if not already) to see most records on one page.

P4 — Identify a record with a non-empty Field7 value (e.g., DateTest-001071).

## Test Steps

| #   | Action                      | Test Data                        | Expected Result                                                      | ✓   |
| --- | --------------------------- | -------------------------------- | -------------------------------------------------------------------- | --- |
| 1   | Complete setup              | See Preconditions P1–P4          | Dashboard loaded, target record visible                              | ☐   |
| 2   | Read Field7 grid cell       | DateTest-001071, column "Field7" | `3/15/2026` — format `M/D/YYYY`, no time component, no leading zeros | ☐   |
| 3   | Verify format on 2nd record | DateTest-001067, column "Field7" | `3/15/2026` — same `M/D/YYYY` format                                 | ☐   |

## Fail Conditions

1. **FAIL-1 (Time component present):** Field7 shows a value like `3/15/2026 12:00 AM` with a time component. enableTime=false fields should never display time.
    - Interpretation: Server-side formatter is not respecting the enableTime=false flag.

2. **FAIL-2 (Leading zeros):** Field7 shows `03/15/2026` instead of `3/15/2026`.
    - Interpretation: Server uses `MM/dd/yyyy` format instead of `M/d/yyyy`.

3. **FAIL-3 (Non-US format):** Field7 shows `15/3/2026` (day-first) or `2026-03-15` (ISO).
    - Interpretation: Server locale or format string misconfiguration.

## Related

| Reference               | Location                                      |
| ----------------------- | --------------------------------------------- |
| Matrix row              | `matrix.md` — row `db-1-A`                    |
| Run history             | `summaries/tc-db-1-A.md`                      |
| Bug analysis            | `analysis.md` § 2 (Date Display Format Rules) |
| Cross-reference (Forms) | `../forms-calendar/matrix.md` — Config A rows |
| Cross-reference (WS)    | `../web-services/matrix.md` — Config A rows   |
