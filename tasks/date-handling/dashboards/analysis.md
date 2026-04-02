# Dashboards — Analysis

Server-side rendering analysis for the DateTest Dashboard.

Last updated: 2026-04-02

---

## 1. Architecture: Server-Side Rendering

The VV Dashboard uses **Telerik RadGrid** (ASP.NET WebForms), which renders HTML on the server. The server queries the SQL database, formats date values using .NET `DateTime` formatting, and sends pre-rendered HTML to the browser.

**Implications:**

- Browser timezone has **zero effect** on displayed values (confirmed BRT ≡ IST)
- No JavaScript date parsing occurs — `moment.js`, `calendarValueService`, and all Angular-side bugs are irrelevant
- The displayed value is a direct reflection of what the .NET server reads from SQL and formats
- Any incorrect dates visible in the dashboard were stored incorrectly at write time (Forms, API, etc.)

---

## 2. Date Display Format Rules

The server applies different formats based on the field's `enableTime` flag:

| enableTime | Server Format      | Example Output      |
| :--------: | ------------------ | ------------------- |
|  `false`   | `M/d/yyyy`         | `3/15/2026`         |
|   `true`   | `M/d/yyyy h:mm tt` | `3/15/2026 3:00 AM` |

The `ignoreTZ` and `useLegacy` flags do **not** affect the server-side display format. They only affect client-side behavior in the Forms Angular SPA.

### Format Observations

- US date format (`M/D/YYYY`) — month first, no leading zeros
- 12-hour clock with AM/PM for DateTime fields
- No seconds displayed
- No timezone indicator in the display

---

## 3. Bug Surface in Dashboards

### Bug #7 — Wrong Date (VISIBLE)

Records created with Bug #7 (date-only field, UTC+ timezone, wrong day stored) display the wrong date in the dashboard. This is expected — the dashboard shows what's in the database.

**Evidence (2026-04-02 exploratory):**

- Several records show Field7 = `4/14/2026` where `3/15/2026` was intended
- These are records created from IST (UTC+5:30) where Bug #7 stored the previous day
- Dates showing `3/14/2026` and `4/14/2026` instead of `3/15/2026` and `4/15/2026`

### Mixed Time Components (VISIBLE)

Records created via different write paths store different time components for the same intended date. The dashboard exposes this inconsistency:

**Field6 (Config C — DateTime, enableTime=true, ignoreTZ=false):**

- Some records: `3/15/2026 12:00 AM` (midnight UTC, stored as `2026-03-15T00:00:00Z`)
- Other records: `3/15/2026 3:00 AM` (3AM = BRT midnight in UTC, stored as `2026-03-15T03:00:00Z`)
- Other records: `3/14/2026 12:00 AM` (wrong date — Bug #7 variant for DateTime)

**Field5 (Config D — DateTime, enableTime=true, ignoreTZ=true):**

- Some records: `3/15/2026 12:00 AM`
- Other records: `3/15/2026 2:00 AM`

### Bug #5 — Fake Z (NOT DIRECTLY VISIBLE)

Bug #5 (GetFieldValue returns fake Z suffix) is a client-side Forms bug. It does not affect what's stored in the database or displayed in the dashboard. However, if a script reads via `GetFieldValue` and writes back via `SetFieldValue`, the resulting drift **is** stored and becomes visible in the dashboard.

### Bug #6 — Invalid Date for Empty Fields (NOT APPLICABLE)

Bug #6 is a client-side Forms bug (`GetFieldValue` returns `"Invalid Date"` for empty Config D fields). The dashboard shows empty cells for empty fields — no issue.

---

## 4. SQL Query Behavior

### How the Dashboard Queries Dates

The RadGrid likely uses a SQL query like:

```sql
SELECT FormID, Field1, Field2, ..., Field28
FROM FormData
WHERE TemplateID = '...'
ORDER BY FormID DESC
```

Date filtering (via the SQL filter builder) translates user input to SQL `WHERE` clauses. The exact behavior depends on:

- Whether SQL compares date strings or datetime values
- How the server handles the time component in "date-only" fields
- Whether `BETWEEN` and `=` operators account for time components

### Potential Filter Issues

Given mixed timezone storage, a filter like `Field7 = '2026-03-15'` should match all date-only records with that date. But if the underlying SQL column stores datetime values (not just dates), the time component could cause mismatches:

- `2026-03-15T00:00:00Z` — matches `= '2026-03-15'`? Depends on SQL cast behavior
- `2026-03-15T03:00:00Z` — matches `= '2026-03-15'`? Same question

This needs testing (DB-5).

---

## 5. Cross-Layer Comparison

The dashboard shows dates as formatted by the .NET server. The Forms Angular SPA shows dates as processed by client-side JavaScript. These can differ:

| Scenario            | Dashboard Shows      | Form Shows                             | Why                                            |
| ------------------- | -------------------- | -------------------------------------- | ---------------------------------------------- |
| Date-only, correct  | `3/15/2026`          | `03/15/2026`                           | Format difference (leading zero)               |
| Date-only, Bug #7   | `3/14/2026`          | `3/14/2026` (IST) or `3/15/2026` (BRT) | Dashboard shows DB value; form may re-parse    |
| DateTime, UTC-aware | `3/15/2026 3:00 AM`  | Depends on browser TZ                  | Dashboard = server format; form = local format |
| DateTime, ignoreTZ  | `3/15/2026 12:00 AM` | `3/15/2026 12:00 AM`                   | Should match if no bugs                        |

This comparison is the focus of DB-6 tests.

---

## 6. Initial Observations (Exploratory, 2026-04-02)

### Records Examined

- **267 total records** across 2 pages (page size 200)
- Most recent records (DateTest-001076 to DateTest-001047) have only 1-2 fields populated per record (from targeted WS/forms tests)
- Older records (DateTest-000472 and below) have many fields populated (from comprehensive test runs)

### Confirmed Behaviors

1. **TZ independence**: BRT and IST dashboard views are byte-identical for the same records
2. **Format consistency**: Date-only fields always show `M/D/YYYY`, DateTime fields always show `M/D/YYYY H:MM AM/PM`
3. **Bug #7 visible**: Field7 shows `4/14/2026` on multiple records (expected `3/15/2026`)
4. **Mixed storage visible**: Field6 shows `3:00 AM` vs `12:00 AM` for same intended date across different records
5. **Empty fields**: Displayed as empty cells (no "Invalid Date" or placeholder)
6. **Column sort**: All 33 columns are sortable (header links present)
7. **Search**: SQL filter builder available via toolbar toggle
8. **Export**: Excel, Word, XML export available via toolbar
