# VisualVault Platform — Date Handling Known Issues

**Audience**: Product management, engineering leadership, customer success
**Last updated**: 2026-04-13
**Validation**: 742 test executions across 2 environments with different platform versions (5.x and 6.x), UI generations, and server timezones. All issues confirmed as platform-level — identical behavior across environments.

---

## Background

### Date field types

VV forms use **date fields** to capture calendar dates and timestamps. These fields come in three types, configured in Form Designer:

- **Date-only** — captures a calendar date like "March 15, 2026" with no time component. Used for deadlines, filing dates, receipt dates. The simplest and lowest-risk configuration.

- **Date-time (timezone-aware)** — captures a date and time like "March 15, 2026 2:30 PM". The system converts the value to UTC for storage and converts back to local time for display. This means a user in Pacific Time and a user in Mumbai both see the correct local time for the same stored value.

- **Date-time (local time)** — captures a date and time, but the system stores the value as-is without any timezone conversion. "2:30 PM" is stored literally as "2:30 PM" regardless of where the user is. This is the highest-risk configuration — most of the known issues affect this field type.

The difference between the last two is a single configuration flag in Form Designer called "ignore timezone." When enabled, the field becomes **date-time (local time)**; when disabled, it becomes **date-time (timezone-aware)**.

A fourth variant exists: **legacy fields**, which use an older code path for date processing. Legacy fields behave similarly to the above three types but with some differences in how automations read and write values. They are not common in current deployments.

### How data enters and leaves date fields

Forms can have two kinds of custom code that interact with date fields:

- **Form-level scripts** — code that runs **in the browser** when a user clicks a button, changes a field, or loads a form. These scripts read and write field values directly from the form's internal state. They run while the user is interacting with the form.

- **Web services and integrations** — code that runs **on the server** or from external systems. These create, read, and update records through the REST API. They operate independently of the form UI — the user may not be involved at all (e.g., bulk imports, scheduled processes, system integrations).

**Records can be created** through the form UI (a user fills out the form in the browser) or through REST APIs. The platform has two different API endpoints for creating records — the **standard endpoint** (`postForms`) and an **alternative endpoint** (`forminstance/`) — which handle dates differently. This distinction matters for Issue #2.

---

## Part 1: Known Issues

### Issue 1 — Form-level scripts receive incorrect dates when reading field values

**What happens**: When a form-level script (a button click handler, field change handler, or form load script running in the browser) reads a date from a **date-time (local time)** field, the value it receives has a false UTC timezone marker. The actual value is local time, but the marker tells the script it's UTC. If the script uses this value in a calculation (e.g., computing a deadline) or passes it to a standard date-processing function, the result shifts by the user's timezone offset. If the script writes the shifted value to any field — the same field, a different field on the same form, or a field on another form — the wrong value is stored. Writing back to the same field is the worst case: the corruption compounds on each read-write cycle, drifting further with every interaction.

Additionally, empty **date-time (local time)** fields return the text "Invalid Date" instead of an empty value, which can break script logic that checks whether a date has been entered.

**Trigger conditions**:

- Field type: **date-time (local time)**
- Entry method: **form-level script** reading the field value (in the browser, while the user interacts with the form)
- Timezone: **any non-UTC timezone** — shift equals the user's UTC offset (7 hours for UTC-7, 5.5 hours for UTC+5:30)

**Cross-form data transfer amplifies this issue**: VV has a platform function (`FillinAndRelateForm`) that copies field values from one form to another via URL parameters. When a date-time (local time) value passes through this chain, the false UTC marker from the source form's read combines with the target form's date parsing in a way that **compounds the shift rather than canceling it**. All 9 cross-form transfer scenarios tested produced shifted or wrong dates. Any form template that uses this function to transfer date-time (local time) values is exposed.

**Consequence**: Wrong calculations (deadlines, durations, comparisons). Wrong values written to other fields or forms. Cross-form transfers propagate and amplify the shift. If the script writes back to the same field, cumulative drift — the date shifts further on each read-write cycle.

---

### Issue 2 — Records created through the API display shifted dates when opened in forms

**What happens**: When a web service, integration, or bulk import creates a record through the standard API endpoint (`postForms`) and a user later opens that record in the browser, **date-time (local time)** fields display with a time shift equal to the user's timezone offset. If the user saves the form — even without editing — the shifted value permanently overwrites the correct one.

The mechanism: the standard endpoint (`postForms`) adds a UTC timezone marker to **all** date values when it serializes them — regardless of how the field is configured. It does not distinguish between date-only, date-time (timezone-aware), or date-time (local time) fields. For timezone-aware fields, this marker is correct (the value actually is UTC). For date-time (local time) fields, the marker is false — the value is local time, not UTC. The form load process strips this marker and reinterprets the value, which causes the shift only on date-time (local time) fields.

The alternative endpoint (`forminstance/`) does not add this marker, which resolves the issue for date-time (local time) fields — but creates the opposite problem for timezone-aware fields, which lose the UTC context they need. **Neither endpoint handles all field types correctly.** A form with both timezone-aware and local time fields has no single API endpoint that produces correct results for all its date fields.

**Trigger conditions**:

- Field type: **date-time (local time)**
- Entry method: **record created via the standard API endpoint**, then opened in the form UI by a user
- Timezone: **any non-UTC timezone** — shift equals the user's UTC offset

**Consequence**: Records created by integrations, imports, or web services have their date-time values silently corrupted the first time a user opens the form. The corruption is permanent after save.

---

### Issue 3 — The same date appears differently across Forms, Dashboards, and API responses

**What happens**: A single stored date value is displayed in different formats — and in some cases different actual dates or times — depending on which part of the platform renders it. Forms, Dashboards, API responses, and the Document Library each use different display logic.

For date-only fields, the difference is cosmetic (leading zeros: Forms shows `03/15/2026`, Dashboard shows `3/15/2026`). For **date-time (timezone-aware)** fields, the difference is functional: Forms converts to local time while the Dashboard shows the raw stored UTC value, producing different displayed times for the same record.

**Trigger conditions**:

- Formatting difference (cosmetic): **all date field types**, all timezones, all entry methods
- Time display mismatch: **date-time (timezone-aware)** — Forms converts to local time, Dashboard shows raw UTC

**Consequence**: Cosmetic confusion for most fields. For date-time (timezone-aware) fields, users comparing a form record to a dashboard or report may see different times and assume the data is wrong.

---

### Issue 4 — Non-US date formats are silently discarded or reinterpreted

**What happens**: When a date is sent in day-first format (DD/MM/YYYY) through the Forms API:

- Days 13-31: the date is **silently discarded** (stored as empty). The API returns success.
- Days 1-12: the month and day are **silently swapped** (March 5 becomes May 3). No error.

The Document Library API correctly parses the same DD/MM/YYYY format.

**Trigger conditions**:

- Date format: **DD/MM/YYYY or similar day-first formats**
- Entry method: **API only** (form UI uses a date picker)
- Field type: all date field types

**Consequence**: Silent data loss (days 13-31) or silent data corruption (days 1-12). No error message, no warning. The API reports success.

---

### Issue 5 — Users east of UTC get the wrong calendar day stored on date-only fields

**What happens**: When a user in a timezone east of UTC enters a date in a date-only field, the system stores the previous calendar day. The form displays the correct date, but the database, every report, every dashboard, and every API query returns the wrong day.

The mechanism: the system converts "March 15 at midnight local time" to UTC. For timezones east of UTC, midnight local is still the previous day in UTC (e.g., midnight in Paris is 11:00 PM UTC on March 14). The system stores the UTC date — March 14 — instead of the intended March 15.

**Trigger conditions**:

- Field type: **date-only**
- Timezone: **east of UTC** (UTC+1 or higher) — includes Central Europe, UK during summer time, Eastern Europe, Africa, Middle East, India, Southeast Asia, China, Japan, Australia, Pacific Islands
- Entry method: **all methods** — no workaround exists

**Consequence**: The stored date is the wrong calendar day. Compliance deadlines, filing dates, and regulatory timelines are all off by one day. The error is invisible to the user entering the date (the form shows the correct day on screen).

---

### Issue 6 — Date-only fields accumulate inconsistent data from different entry paths

**What happens**: Date-only fields still accept and store time components when values come through the REST API. The API does not enforce the date-only constraint — it stores whatever is sent, including time components. By contrast, the form-side save pipeline (both user input and form-level scripts using SetFieldValue) always strips the time and normalizes to midnight. This means records created through the API can have non-midnight internal values, while records created through the form UI always have midnight values. Over time, a single database column contains a mix of representations for the same calendar date. Exact-match queries may return incomplete results.

**Trigger conditions**:

- Field type: **date-only**
- Entry method: **REST API** sending a date-time string (e.g., `2026-03-15T14:30:00`) to a date-only field. Form UI and SetFieldValue always normalize to midnight.
- Risk is cumulative — increases over time as records enter through both API and form paths

**Consequence**: Query and report accuracy degrades silently. Exact-match date filters return incomplete results. The issue is invisible until someone notices a count discrepancy between two reports or missing records in a filtered view.

---

### Issue 7 — Document index field dates lose timezone information and cannot be cleared

**What happens**: When a date with timezone information is written to a document index field (metadata attached to documents in the Document Library), the system converts it to UTC and removes the UTC indicator. The stored value becomes ambiguous — there is no way to tell whether "2:30 PM" means local time or UTC.

The Forms API and Document Library API handle the same date input differently: the Forms API discards the timezone but keeps the original time, while the Document Library converts to UTC. The same input produces different stored values.

Additionally, once a date is set on a document index field, it cannot be cleared. All clearing attempts fail silently.

**Trigger conditions**:

- Timezone conversion: input includes **explicit timezone information** (e.g., "2026-03-15T14:30:00-07:00")
- Clearing failure: **always** — any attempt to clear a date index field once set
- Entry method: **Document Library API**
- Cross-environment validation pending — Document API service configuration differs between environments

**Consequence**: Timezone ambiguity in stored values — automations cannot reliably interpret dates that were written with timezone offsets. Inability to clear dates forces workarounds (storing a sentinel value instead of actually clearing).

---

### Issue Summary

| Issue | Affected Field Types                                              | Key Trigger                                                                                   | Consequence                                                                                  |
| :---: | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
|  #1   | Date-time (local time)                                            | Form-level script reads value + any non-UTC timezone. Cross-form transfers amplify the shift. | Wrong calculations; cumulative drift if written back; wrong values propagated to other forms |
|  #2   | Date-time (local time)                                            | Record created via standard API, then opened in form + any non-UTC timezone                   | Silent corruption on first form open after API creation                                      |
|  #3   | Date-time (timezone-aware) for functional; all types for cosmetic | Viewing same record in Forms vs Dashboard                                                     | Display confusion; different times shown for same value                                      |
|  #4   | All types                                                         | DD/MM/YYYY format sent via API                                                                | Silent data loss or month/day swap                                                           |
|  #5   | Date-only                                                         | Any timezone east of UTC                                                                      | Wrong calendar day stored (off by 1 day)                                                     |
|  #6   | Date-only                                                         | Same field populated via multiple entry paths                                                 | Inconsistent internal storage; query accuracy degrades                                       |
|  #7   | Document index fields                                             | Timezone offset in input; or any attempt to clear                                             | Timezone ambiguity; cannot clear once set                                                    |

---

## Part 2: WADNR Impact Assessment

### WADNR Profile

| Parameter                                              | Value                                           |
| ------------------------------------------------------ | ----------------------------------------------- |
| Server timezone                                        | UTC-7 (Pacific Time, fixed — no DST adjustment) |
| Total date fields                                      | 137 across 35 form templates                    |
| Date-only fields                                       | 122 (89%)                                       |
| Date-time (local time) fields                          | 12 (9%)                                         |
| Date-time (timezone-aware) fields                      | 3 (2%)                                          |
| Legacy field configurations                            | 0                                               |
| Form scripts interacting with date fields              | 49 out of 3,560 total                           |
| Form scripts reading date-time (local time) fields     | 3                                               |
| Form script read-write round-trips on date-time fields | 0                                               |
| Date format in use                                     | US (MM/DD/YYYY) exclusively                     |
| Date formats observed in extracted scripts             | US (MM/DD/YYYY)                                 |

### Issue-by-Issue Assessment

| Issue | Trigger Conditions                                 |                                  WADNR Meets Conditions?                                   |  WADNR Impact  |
| :---: | -------------------------------------------------- | :----------------------------------------------------------------------------------------: | :------------: |
|  #1   | Date-time (local time) + form script + non-UTC     |          **Partially**: 12 fields exist, 3 form scripts read them, 0 round-trips           |  **Moderate**  |
|  #2   | Date-time (local time) + standard API + non-UTC    |     **Partially**: 12 fields exposed, but a workaround (alternative endpoint) is known     | **Mitigated**  |
|  #3   | Date-time (timezone-aware) for functional mismatch |                        **Minimally**: only 3 timezone-aware fields                         | **Negligible** |
|  #4   | DD/MM/YYYY input via API                           | **Not observed**: extracted scripts use US format only. External integrations not audited. |    **Low**     |
|  #5   | Date-only + east of UTC                            |                                **No**: UTC-7 is west of UTC                                |    **Zero**    |
|  #6   | Date-only + multiple entry paths                   |      **Marginally**: 122 date-only fields, but entry paths produce consistent values       |  **Very low**  |
|  #7   | Document Library API + timezone data               |        **Unknown**: 1 automation writes index fields; code review shows no TZ data         |  **Unknown**   |

### The 12 Date-Time (Local Time) Fields — WADNR's Primary Exposure

All of WADNR's meaningful risk concentrates in 12 date-time (local time) fields. These are the only fields exposed to Issues #1 and #2.

| Form Template                                | Field Name           |
| -------------------------------------------- | -------------------- |
| Forest-Practices-Aerial-Chemical-Application | Received Date        |
| Forest-Practices-Application-Notification    | Date of Receipt      |
| FPAN-Amendment-Request                       | Date of Receipt      |
| FPAN-Renewal                                 | Date of Receipt      |
| Long-Term-Application-5-Day-Notice           | Date of Receipt      |
| Multi-purpose                                | Date of Violation    |
| Step-1-Long-Term-FPA                         | Date of Receipt      |
| Task                                         | Date Created         |
| Informal-Conference-Note                     | Meeting Date         |
| Informal-Conference-Note-SUPPORT-COPY        | Meeting Date         |
| Notice-to-Comply                             | ViolationDateAndTime |
| Task                                         | Date Completed       |

### Form Script Exposure Detail

| Metric                                             | Count | Significance                                                                                                                                                                                     |
| -------------------------------------------------- | :---: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Total form scripts analyzed                        | 3,560 | Across 77 form templates                                                                                                                                                                         |
| Form scripts interacting with date fields          |  49   | 1.4% of total                                                                                                                                                                                    |
| Form scripts reading date-time (local time) fields |   3   | **Actual Issue #1 exposure** — may get shifted values in calculations                                                                                                                            |
| Date-time (local time) read-write round-trips      |   0   | **No compounding drift actively occurring**                                                                                                                                                      |
| Form scripts writing to date fields                |  42   | General write exposure (no active risk without round-trips)                                                                                                                                      |
| Templates using cross-form data transfer           |  36   | Platform-level function — if any transfers include date-time (local time) fields, Issue #1's shift is amplified (see above). Date handling in this function has not been individually inspected. |

---

## Recommendations

### For WADNR (Customer-side)

**Recommendation #1 — Verify whether 8 date-time (local time) fields need the time component**

8 of WADNR's 12 high-risk date-time (local time) fields have names that suggest date-only usage ("Date of Receipt", "Date of Violation", "Date Created"). If WADNR confirms these fields do not need the time component, reconfiguring them to date-only would:

- Eliminate their exposure to Issues #1 and #2 entirely
- Reduce high-risk field count from 12 to 2-4
- Require no platform changes — Form Designer configuration change only

**Steps**:

1. Confirm with WADNR whether these 8 fields use the time component in practice
2. Query existing records to check whether any stored values contain non-midnight times
3. If confirmed as date-only usage, reconfigure in Form Designer

### For the Platform

**Priority 1 — Fix automation date values (Issue #1)**

Correct the value returned by the automation API for date-time (local time) fields — remove the false UTC marker, return empty string for empty fields. Low-risk fix that eliminates wrong calculations for all customers.

**Priority 2 — Fix API-to-Forms shift (Issue #2)**

Make the standard API endpoint reliable for date-time (local time) fields. Currently every developer must know to use the alternative endpoint — a fragile dependency on institutional knowledge.

**Priority 3 — Fix wrong calendar day east of UTC (Issue #5)**

Does not affect WADNR, but is the **most severe issue for any customer east of UTC**. Every date-only field stores the wrong day on every write, with no workaround. Prioritize based on the overall customer base — if any customer has users in Europe, Africa, the Middle East, Asia, or Australia, this is critical.

**Priority 4 — Fix silent date format failures (Issue #4)**

Zero current impact for US-based customers. Important for internationalization — blocks any customer with non-US date formats in integrations.

**Deferred**

| Issue                      | Reason to defer                                                                                                                         |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| #3 (display differences)   | Cosmetic for most fields. Functional mismatch limited to date-time (timezone-aware) fields — typically a small number per project.      |
| #6 (mixed date storage)    | Theoretical risk. Only manifests if the same date-only field receives data through multiple entry paths with different format handling. |
| #7 (document index fields) | Pending cross-environment validation.                                                                                                   |

---

## Appendix: Technical Reference

For engineering tracking. Each issue maps to internal identifiers used in the detailed investigation.

| Issue | Internal IDs                                   | Cross-Layer Codes              |
| :---: | ---------------------------------------------- | ------------------------------ |
|  #1   | FORM-BUG-5, FORM-BUG-6, FORM-BUG-1, FORM-BUG-4 | XLAYER-5, XLAYER-8             |
|  #2   | WS-BUG-1, WS-BUG-4                             | XLAYER-4, XLAYER-9, XLAYER-10  |
|  #3   | DB-BUG-1, FORM-BUG-2                           | XLAYER-3, XLAYER-7, XLAYER-14  |
|  #4   | WS-BUG-2, WS-BUG-3                             | XLAYER-12                      |
|  #5   | FORM-BUG-7                                     | XLAYER-2                       |
|  #6   | WS-BUG-5, WS-BUG-6, FORM-BUG-3                 | XLAYER-6                       |
|  #7   | DOC-BUG-1, DOC-BUG-2                           | XLAYER-9, XLAYER-11, XLAYER-13 |

### Field type to configuration mapping

| Field Type (this document) | Form Designer Settings              |        Internal Config Code         |
| -------------------------- | ----------------------------------- | :---------------------------------: |
| Date-only                  | enableTime: OFF                     | A (ignoreTZ OFF) or B (ignoreTZ ON) |
| Date-time (timezone-aware) | enableTime: ON, ignoreTimezone: OFF |    C (non-legacy) or G (legacy)     |
| Date-time (local time)     | enableTime: ON, ignoreTimezone: ON  |    D (non-legacy) or H (legacy)     |
| Legacy date-only           | enableTime: OFF, useLegacy: ON      | E (ignoreTZ OFF) or F (ignoreTZ ON) |

Detailed investigation: `research/date-handling/`
Test matrices: `forms-calendar/matrix.md` (269 slots), `web-services/matrix.md` (148 slots), `dashboards/matrix.md` (44 slots), `document-library/matrix.md` (52 slots)
Cross-layer analysis: `analysis/consistency-matrix.md`
Root cause and fix strategy: `analysis/temporal-models.md`, `analysis/fix-strategy.md`

---

## Methodology

- **742 automated test executions** across 2 VV environments with different platform versions (5.x and 6.x), UI generations, and server timezones (UTC-3 and UTC-7)
- **Automated field inventory** of 77 WADNR form templates — 137 date fields classified by type, configuration, and risk
- **Automated script inventory** of 3,560 WADNR automations — 49 with date field interactions mapped to specific issue exposure
- **Support ticket analysis** with root causes traced to platform-level issues
- **Cross-environment validation** confirming all issues exist in shared platform services
