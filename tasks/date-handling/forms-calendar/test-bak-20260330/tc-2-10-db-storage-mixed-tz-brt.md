# TC-2.10 — Configs A/C/D, Database Query, BRT: initial-value fields store UTC; user-input fields store local BRT (mixed timezone storage)

---

## Environment Specs

| Parameter                | Value                                                                                                                                                                                                                                                                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Browser**              | Google Chrome, latest stable (V8 engine)                                                                                                                                                                                                                                                                                                       |
| **System Timezone**      | Not required — direct database query; timezone does not affect SQL results                                                                                                                                                                                                                                                                     |
| **Platform**             | VisualVault ConnectionQueryAdmin (Database Query Manager)                                                                                                                                                                                                                                                                                      |
| **VV Code Path**         | N/A — this TC queries database storage directly, not the FormViewer code path                                                                                                                                                                                                                                                                  |
| **Target Field Configs** | Config A w/ `enableInitialValue=true`: `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`; Config C: `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`; Config D: `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`; Config A w/o initial value: `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false` |
| **Scenario**             | DateTest-000004 saved 2026-03-27 from BRT (UTC-3); target date set to 2026-03-15 BRT midnight — `2026-03-15T00:00:00-03:00` = `2026-03-15T03:00:00Z` UTC                                                                                                                                                                                       |

---

## Preconditions

**P1 — Access the VisualVault Database Query Manager** (ConnectionQueryAdmin):

Open the following URL in Chrome. Sign in if prompted.

```text
https://vvdemo.visualvault.com/app/EmanuelJofre/Main/ConnectionQueryAdmin?CcID=00000001-0000-0000-0000-c0000000f002
```

> The `CcID=00000001-0000-0000-0000-c0000000f002` parameter selects the form data database connection. This is the connection that stores all form field values. Using a different `CcID` will query a different database and return no results.

**P2 — Verify the DateTest-000004 record exists:**

The record `DateTest-000004` must exist as a saved form — it is used as the evidence source. It was saved on 2026-03-27 from BRT (UTC-3) with target date fields set to 2026-03-15. If the record has since been modified or deleted, the field values in the test steps below will not match.

> **No timezone setup required**: This TC reads raw database values via SQL. The timezone of the machine running the browser does not affect the SQL query results. Values are displayed exactly as stored.

---

---

## Test Steps

| #   | Action                                                                             | Test Data                                                                                                                                            | Expected Result                                                                                                         | ✓   |
| --- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --- |
| 1   | Complete setup                                                                     | See Preconditions P1–P2                                                                                                                              | ConnectionQueryAdmin loads; form data connection is active                                                              | ☐   |
| 2   | Click **New** (or the add button) to create a new query                            | —                                                                                                                                                    | Query editor opens with empty Name, Description, and SQL fields                                                         | ☐   |
| 3   | Enter query name                                                                   | `TC-2-10 DateTest DB Evidence`                                                                                                                       | Name field shows `TC-2-10 DateTest DB Evidence` — note: periods are not allowed in query names; use hyphens             | ☐   |
| 4   | Enter description                                                                  | `DB evidence for date handling TC-2.10`                                                                                                              | Description field populated                                                                                             | ☐   |
| 5   | Enter SQL query                                                                    | `SELECT DhDocID, DataField1, DataField2, DataField3, DataField4, DataField5, DataField6, DataField7 FROM DateTest WHERE DhDocID = 'DateTest-000004'` | SQL field populated                                                                                                     | ☐   |
| 6   | Click **Preview**                                                                  | —                                                                                                                                                    | Preview Query Data panel opens; one row appears for `DateTest-000004`                                                   | ☐   |
| 7   | Verify DhDocID                                                                     | Read `DhDocID` column                                                                                                                                | `DateTest-000004`                                                                                                       | ☐   |
| 8   | Verify DataField1 — Config A, CurrentDate, stored value                            | Read `DataField1` column                                                                                                                             | `3/27/2026 8:02:51 PM` — UTC timestamp; the "current date" was captured at save time and stored as UTC                  | ☐   |
| 9   | Verify DataField2 — Config A, Preset (March 1), stored value                       | Read `DataField2` column                                                                                                                             | `3/1/2026 3:00:00 AM` — UTC equivalent of BRT midnight on March 1: `2026-03-01T00:00:00-03:00` = `2026-03-01T03:00:00Z` | ☐   |
| 10  | Verify DataField3 — Config A, CurrentDate (duplicate), stored value                | Read `DataField3` column                                                                                                                             | `3/27/2026 8:02:51 PM` — same as DataField1; both are CurrentDate fields saved in the same save action                  | ☐   |
| 11  | Verify DataField4 — Config A, Preset (duplicate), stored value                     | Read `DataField4` column                                                                                                                             | `3/1/2026 3:00:00 AM` — same as DataField2; both are Preset fields for March 1                                          | ☐   |
| 12  | Verify DataField5 — Config D (enableTime=true, ignoreTimezone=true), stored value  | Read `DataField5` column                                                                                                                             | `3/15/2026 12:00:00 AM` — local BRT midnight; stored as-is without UTC conversion                                       | ☐   |
| 13  | Verify DataField6 — Config C (enableTime=true, ignoreTimezone=false), stored value | Read `DataField6` column                                                                                                                             | `3/15/2026 12:00:00 AM` — local BRT midnight; stored as-is without UTC conversion                                       | ☐   |
| 14  | Verify DataField7 — Config A, no initial value, stored value                       | Read `DataField7` column                                                                                                                             | `3/15/2026 12:00:00 AM` — local BRT midnight; stored as-is without UTC conversion                                       | ☐   |

> **Mixed timezone storage pattern**: Steps 8–11 (DataField1–4, `enableInitialValue=true`) return UTC timestamps; steps 12–14 (DataField5–7, user-input fields) return local BRT times. Both groups show a `12:00:00 AM` time component for DataField2/4 and DataField5–7, but they represent different absolute moments:
>
> - `DataField2/4`: `3/1/2026 3:00:00 AM` = `2026-03-01T03:00:00Z` = BRT midnight March 1 expressed as UTC
> - `DataField5–7`: `3/15/2026 12:00:00 AM` = local BRT midnight March 15, stored without any timezone offset
>
> A SQL query filtering `WHERE DataField5 = '3/15/2026 12:00:00 AM'` from a UTC+5:30 system would return a match, but the stored value has no timezone context — the database does not record that it is a BRT-local value. Queries or reports that join or compare dates across field types will silently produce incorrect results.
>
> **DataField1/3 have no time-of-midnight structure**: The current-date initial value captured the actual timestamp at save time (`8:02:51 PM` UTC on 2026-03-27), not midnight. This confirms `initCalendarValueV1()` for CurrentDate mode creates a live `new Date()` snapshot, not a date-only value.

---

## Fail Conditions

**FAIL-1 (No rows returned — record not found):**
Step 6 Preview shows 0 rows or an empty result set.

- Interpretation: DateTest-000004 does not exist in this environment, or the wrong `CcID` was used in the URL. Verify the `CcID=00000001-0000-0000-0000-c0000000f002` is present in the ConnectionQueryAdmin URL. If the CcID is correct, the record may have been deleted or renamed — check the FormViewer for a record matching "DateTest-000004".

**FAIL-2 (Initial-value fields return local BRT values — UTC storage absent):**
Steps 8–11 return `3/27/2026 5:02:51 PM` (BRT equivalent) instead of `3/27/2026 8:02:51 PM` (UTC), or DataField2/4 return `3/1/2026 12:00:00 AM` instead of `3/1/2026 3:00:00 AM`.

- Interpretation: The `initCalendarValueV1()` initial-value path no longer stores UTC. In build `20260304.1`, `getSaveValue()` for initial-value Date objects applies `.toISOString()` and strips the Z, resulting in UTC values stored without a timezone suffix. If the values now reflect local BRT, the save path has changed or the record was re-saved under a modified code path.

**FAIL-3 (User-input fields return UTC values — local storage absent):**
Steps 12–14 return `3/15/2026 3:00:00 AM` (UTC equivalent of BRT midnight) instead of `3/15/2026 12:00:00 AM`.

- Interpretation: The user-input save path now converts to UTC before storing. This would mean the mixed-timezone storage bug has been partially fixed for user-input fields. Verify the build number. If so, re-run TC-2.2 and TC-2.3 to verify whether the GetFieldValue behavior has also changed.

**FAIL-4 (DataField5–7 values differ from DataField2/4 in the wrong direction):**
Steps 12–14 return `3/14/2026 9:00:00 PM` or another shifted value instead of `3/15/2026 12:00:00 AM`.

- Interpretation: Bug #5 drift has affected the stored value before this TC was run. If `SetFieldValue(GetFieldValue())` was called on these fields (e.g., via a script or workflow), the fake-Z round-trip drift would have shifted the stored value by -3h per trip. Verify the record has not been modified since it was saved from BRT on 2026-03-27.

**FAIL-5 (Query name validation error — period rejected):**
Entering a query name with a period (e.g., `TC-2.10 DateTest DB Evidence`) triggers a validation error: "Query name must contain alphanumeric characters only. Hyphens, underscores, spaces, and commas are allowed."

- Interpretation: This is expected VV behavior — periods are not allowed in query names. Replace the period with a hyphen: `TC-2-10 DateTest DB Evidence`. This is not a test failure; it is a UI input constraint.

---

## Related

| Reference                                                     | Location                                                                                                                               |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Source test block                                             | `tasks/date-handling/forms-calendar/test/results.md` — Test 2.10 (Database Evidence — Actual Stored Values)                            |
| Mixed timezone storage finding                                | `tasks/date-handling/forms-calendar/analysis.md` — "Database Mixed Timezone Storage" section                                           |
| Bug #5 analysis                                               | `tasks/date-handling/forms-calendar/analysis.md` — Bug #5: Inconsistent Developer API Behavior (`getCalendarFieldValue()` line 104114) |
| Field config reference                                        | `tasks/date-handling/CLAUDE.md` — Test Form Fields table                                                                               |
| ConnectionQueryAdmin URL                                      | `docs/architecture/visualvault-platform.md` — Enterprise Tools section                                                                 |
| Sibling TC (form-level view of these same values post-reload) | `tasks/date-handling/forms-calendar/test/tc-2-9-form-load-server-reload-brt.md`                                                        |
| Sibling TC (Bug #5 drift that would corrupt DataField5)       | `tasks/date-handling/forms-calendar/test/tc-2-3-roundtrip-brt.md`                                                                      |
