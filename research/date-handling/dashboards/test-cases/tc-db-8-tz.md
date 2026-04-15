# TC-DB-8-TZ — TZ Independence: BRT ≡ IST ≡ UTC0 confirmed for all date fields

## Environment Specs

| Parameter          | Value                                                                         |
| ------------------ | ----------------------------------------------------------------------------- |
| **Browser**        | Google Chrome, latest stable                                                  |
| **Dashboard URL**  | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25` |
| **Grid Component** | Telerik RadGrid (server-rendered, ASP.NET)                                    |
| **TZ Tested**      | BRT (America/Sao_Paulo), IST (Asia/Calcutta), UTC0 (Etc/GMT)                  |
| **Target Fields**  | All 28 date fields (Field1–Field28)                                           |

## Preconditions

P1 — Auth state must be valid (`testing/config/auth-state-pw.json`).

P2 — Dashboard accessible with 200+ records containing date values across multiple fields.

P3 — Test uses `explore-dashboard.js --compare` which loads the dashboard 3 times (once per TZ context) and compares values.

## Test Steps

| #   | Action                         | Test Data                       | Expected Result                            | ✓   |
| --- | ------------------------------ | ------------------------------- | ------------------------------------------ | --- |
| 1   | Load dashboard in BRT context  | `timezoneId: America/Sao_Paulo` | Grid loaded with date values               | ☐   |
| 2   | Load dashboard in IST context  | `timezoneId: Asia/Calcutta`     | Grid loaded with date values               | ☐   |
| 3   | Load dashboard in UTC0 context | `timezoneId: Etc/GMT`           | Grid loaded with date values               | ☐   |
| 4   | Compare first 10 records       | All date fields across 3 TZs    | All values identical: BRT ≡ IST ≡ UTC0     | ☐   |
| 5   | Verify no mismatches           | Field-by-field comparison       | 0 mismatches across all fields and records | ☐   |

## Fail Conditions

1. **FAIL-1 (TZ-dependent values):** Any date field shows a different value in one TZ context vs another.
    - Interpretation: Server-side rendering has a timezone dependency — either the .NET formatter or the SQL query is incorporating the client's timezone info from the request. This would invalidate the assumption that dashboard tests need only 1 TZ.

## Related

| Reference             | Location                                      |
| --------------------- | --------------------------------------------- |
| Matrix row            | `matrix.md` — row `db-8-tz`                   |
| Run history           | `summaries/tc-db-8-tz.md`                     |
| Preliminary result    | `results.md` — 2026-04-02 exploratory session |
| Architecture analysis | `analysis.md` § 1 (Server-Side Rendering)     |
