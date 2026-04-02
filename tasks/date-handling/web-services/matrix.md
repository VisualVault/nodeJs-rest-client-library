# Web Services — Test Matrix

Authoritative permutation tracker for the web services date-handling investigation.
API analysis → `analysis.md` | Test evidence → `results.md` | Harness → `webservice-test-harness.js`

Last updated: 2026-04-02 | Total slots: ~118 | Done: 0 | Blocked: 0

---

## ID Convention

Web services test IDs use the format `ws-{category}-{config}-{tz}` (e.g., `ws-1-A-BRT`).
For format/scenario variants: `ws-{category}-{config}-{variant}` (e.g., `ws-5-A-US`, `ws-7-A-change`).

---

## Field Configurations

Same 8 field configurations as forms-calendar — tests target the same DateTest form:

| Config | enableTime | ignoreTZ | useLegacy | Test Field  | Type                                    |
| :----: | :--------: | :------: | :-------: | ----------- | --------------------------------------- |
|   A    |   false    |  false   |   false   | DataField7  | Date-only baseline                      |
|   B    |   false    |   true   |   false   | DataField10 | Date-only + ignoreTZ                    |
|   C    |    true    |  false   |   false   | DataField6  | DateTime UTC-aware                      |
|   D    |    true    |   true   |   false   | DataField5  | DateTime + ignoreTZ (Bug #5/#6 surface) |
|   E    |   false    |  false   |   true    | DataField12 | Legacy date-only                        |
|   F    |   false    |   true   |   true    | DataField11 | Legacy date-only + ignoreTZ             |
|   G    |    true    |  false   |   true    | DataField14 | Legacy DateTime                         |
|   H    |    true    |   true   |   true    | DataField13 | Legacy DateTime + ignoreTZ              |

---

## TZ Dimension — Different from Forms

The Node.js library sends date **strings** to the VV server — no local timezone interpretation occurs (confirmed via upstream analysis: `docs/guides/scripting.md`). Therefore:

- **API-only tests** (WS-1, WS-3, WS-5, WS-6, WS-7, WS-8): BRT primary, IST spot-check to confirm TZ independence.
- **Cross-layer tests** (WS-2, WS-4): Browser TZ matters for the Forms side → BRT + IST.

If IST spot-checks confirm TZ independence, no need for full 3-TZ expansion on API-only categories.

### Server TZ Simulation

The Node.js server's process timezone can be controlled via the `TZ` environment variable without changing the macOS system timezone or restarting Chrome:

```bash
TZ=UTC node app.js                    # Simulates AWS/cloud (production)
TZ=America/Sao_Paulo node app.js      # Simulates BRT dev machine (default)
TZ=Asia/Calcutta node app.js          # Simulates IST dev machine
```

WS-1 includes UTC spot-checks (ws-1-{A,C,D,H}-UTC) to prove that the cloud environment produces identical results to local development. If all three TZs (BRT, IST, UTC) produce identical stored values, server TZ is confirmed irrelevant for API string passthrough.

---

## Coverage Summary

`PASS` = ran, no issue. `FAIL` = ran, unexpected behavior. `PENDING` = not yet run. `BLOCKED` = requires setup not available.

| Category                      |  Total  | PASS | FAIL | PENDING | BLOCKED | Priority |
| ----------------------------- | :-----: | :--: | :--: | :-----: | :-----: | :------: |
| WS-1. API Write Path (Create) |   16    |      |      |   16    |         |    P1    |
| WS-2. API Read + Cross-Layer  |   16    |      |      |   16    |         |    P1    |
| WS-3. API Round-Trip          |    4    |      |      |    4    |         |    P2    |
| WS-4. API→Forms Cross-Layer   |    8    |      |      |    8    |         |    P3    |
| WS-5. Input Format Tolerance  |   16    |      |      |   16    |         |    P2    |
| WS-6. Empty/Null Handling     |   12    |      |      |   12    |         |    P3    |
| WS-7. API Update Path         |   12    |      |      |   12    |         |    P2    |
| WS-8. Query Date Filtering    |   10    |      |      |   10    |         |    P3    |
| WS-9. Date Computation        |   12    |      |      |   12    |         |    P2    |
| **TOTAL**                     | **118** |      |      | **118** |         |          |

---

## Execution Order

| Step | Category | Rationale                                                                                     |
| :--: | -------- | --------------------------------------------------------------------------------------------- |
|  1   | WS-2     | Read existing records — no setup needed, uses DateTest-000080 (BRT) and DateTest-000084 (IST) |
|  2   | WS-1     | Create records — produces test data reusable by WS-3, WS-4, WS-8                              |
|  3   | WS-3     | Round-trip — uses WS-1 records                                                                |
|  4   | WS-5     | Format tolerance — independent                                                                |
|  5   | WS-7     | Update path — independent                                                                     |
|  6   | WS-4     | API→Forms — needs browser, uses WS-1 records                                                  |
|  7   | WS-6     | Empty/null — edge cases                                                                       |
|  8   | WS-8     | Query filtering — uses WS-1 records                                                           |
|  9   | WS-9     | Date computation — tests JS Date patterns across server TZs, requires `TZ=` env var switching |

---

## WS-1. API Write Path (Create)

Create a new form record via `postForms()` with a date value in each target config field. Read back via `getForms()` and compare sent vs stored.

**Hypothesis**: The VV server stores the string as-is. No Bug #7 (client-side only). Field config flags may or may not affect server-side storage format.

**Test date**: `"2026-03-15"` for date-only configs (A/B/E/F), `"2026-03-15T14:30:00"` for DateTime configs (C/D/G/H). Using non-midnight time (14:30) to distinguish from date-only.

| ID         | Config | TZ  | Input Sent              | Expected Stored         | Status  | Actual | Bugs | Notes                       |
| ---------- | :----: | :-: | ----------------------- | ----------------------- | :-----: | ------ | ---- | --------------------------- |
| ws-1-A-BRT |   A    | BRT | `"2026-03-15"`          | `"2026-03-15"`          | PENDING |        |      | Date-only baseline          |
| ws-1-B-BRT |   B    | BRT | `"2026-03-15"`          | `"2026-03-15"`          | PENDING |        |      | Date-only + ignoreTZ        |
| ws-1-C-BRT |   C    | BRT | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00"` | PENDING |        |      | DateTime UTC-aware          |
| ws-1-D-BRT |   D    | BRT | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00"` | PENDING |        |      | DateTime + ignoreTZ         |
| ws-1-E-BRT |   E    | BRT | `"2026-03-15"`          | `"2026-03-15"`          | PENDING |        |      | Legacy date-only            |
| ws-1-F-BRT |   F    | BRT | `"2026-03-15"`          | `"2026-03-15"`          | PENDING |        |      | Legacy date-only + ignoreTZ |
| ws-1-G-BRT |   G    | BRT | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00"` | PENDING |        |      | Legacy DateTime             |
| ws-1-H-BRT |   H    | BRT | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00"` | PENDING |        |      | Legacy DateTime + ignoreTZ  |
| ws-1-A-IST |   A    | IST | `"2026-03-15"`          | `"2026-03-15"`          | PENDING |        |      | TZ independence check       |
| ws-1-C-IST |   C    | IST | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00"` | PENDING |        |      | TZ independence check       |
| ws-1-D-IST |   D    | IST | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00"` | PENDING |        |      | TZ independence check       |
| ws-1-H-IST |   H    | IST | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00"` | PENDING |        |      | TZ independence check       |
| ws-1-A-UTC |   A    | UTC | `"2026-03-15"`          | `"2026-03-15"`          | PENDING |        |      | Cloud/AWS simulation        |
| ws-1-C-UTC |   C    | UTC | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00"` | PENDING |        |      | Cloud/AWS simulation        |
| ws-1-D-UTC |   D    | UTC | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00"` | PENDING |        |      | Cloud/AWS simulation        |
| ws-1-H-UTC |   H    | UTC | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00"` | PENDING |        |      | Cloud/AWS simulation        |

---

## WS-2. API Read + Cross-Layer Verification

Read existing Forms-saved records via `getForms()` with `expand: true`. Two analysis dimensions per slot:

1. **API format**: Does the API return the raw stored value without Bug #5 (fake Z) or Bug #6 ("Invalid Date")?
2. **Cross-layer**: Does the API return exactly what Forms `getValueObjectValue()` stored (including buggy values from IST)?

**Records**:

- DateTest-000080 Rev 2 — saved from BRT (2026-03-31), Config A + D set to 03/15/2026
- DateTest-000084 Rev 1 — saved from IST (2026-04-01), Config A + D set to 03/15/2026

**Note**: These records have known stored values from Forms testing (see `forms-calendar/results.md`). Configs not explicitly set during save may have empty or preset values.

| ID         | Config | Record Source | Forms Stored Value              | Expected API Return                 | Status  | Actual | Bugs | Notes                                |
| ---------- | :----: | ------------- | ------------------------------- | ----------------------------------- | :-----: | ------ | ---- | ------------------------------------ |
| ws-2-A-BRT |   A    | 000080 (BRT)  | `"2026-03-15"`                  | `"2026-03-15"`                      | PENDING |        |      | Date-only, set via popup             |
| ws-2-B-BRT |   B    | 000080 (BRT)  | TBD                             | Same as stored                      | PENDING |        |      | May be empty                         |
| ws-2-C-BRT |   C    | 000080 (BRT)  | TBD                             | Same as stored                      | PENDING |        |      | May be empty                         |
| ws-2-D-BRT |   D    | 000080 (BRT)  | `"2026-03-15T00:00:00"`         | `"2026-03-15T00:00:00"` (no fake Z) | PENDING |        |      | Bug #5 only in Forms GFV             |
| ws-2-E-BRT |   E    | 000080 (BRT)  | TBD                             | Same as stored                      | PENDING |        |      | Legacy                               |
| ws-2-F-BRT |   F    | 000080 (BRT)  | TBD                             | Same as stored                      | PENDING |        |      | Legacy                               |
| ws-2-G-BRT |   G    | 000080 (BRT)  | TBD                             | Same as stored                      | PENDING |        |      | Legacy                               |
| ws-2-H-BRT |   H    | 000080 (BRT)  | TBD                             | Same as stored                      | PENDING |        |      | Legacy                               |
| ws-2-A-IST |   A    | 000084 (IST)  | `"2026-03-14"` (Bug #7: -1 day) | `"2026-03-14"` (confirms bug in DB) | PENDING |        |      | API should confirm wrong date stored |
| ws-2-B-IST |   B    | 000084 (IST)  | TBD                             | Same as stored                      | PENDING |        |      | May have Bug #7 value                |
| ws-2-C-IST |   C    | 000084 (IST)  | TBD                             | Same as stored                      | PENDING |        |      |                                      |
| ws-2-D-IST |   D    | 000084 (IST)  | `"2026-03-15T00:00:00"`         | `"2026-03-15T00:00:00"` (no fake Z) | PENDING |        |      | Bug #5 only in Forms GFV             |
| ws-2-E-IST |   E    | 000084 (IST)  | TBD                             | Same as stored                      | PENDING |        |      | Legacy — may have UTC datetime       |
| ws-2-F-IST |   F    | 000084 (IST)  | TBD                             | Same as stored                      | PENDING |        |      | Legacy                               |
| ws-2-G-IST |   G    | 000084 (IST)  | TBD                             | Same as stored                      | PENDING |        |      | Legacy                               |
| ws-2-H-IST |   H    | 000084 (IST)  | TBD                             | Same as stored                      | PENDING |        |      | Legacy                               |

---

## WS-3. API Round-Trip

Write a date via API (`postForms`), read back (`getForms`), write the read-back value (`postFormRevision`), read again. 2 cycles. Verify no drift.

**Hypothesis**: API introduces no drift because there's no Bug #5 fake Z in the read path. All cycles should return identical values.

| ID         | Config | TZ  | Input                   | Cycle 1 Read | Cycle 2 Read | Drift? | Status  | Bugs | Notes                                    |
| ---------- | :----: | :-: | ----------------------- | ------------ | ------------ | :----: | :-----: | ---- | ---------------------------------------- |
| ws-3-A-BRT |   A    | BRT | `"2026-03-15"`          |              |              |        | PENDING |      | Date-only                                |
| ws-3-C-BRT |   C    | BRT | `"2026-03-15T14:30:00"` |              |              |        | PENDING |      | DateTime control                         |
| ws-3-D-BRT |   D    | BRT | `"2026-03-15T14:30:00"` |              |              |        | PENDING |      | Bug #5 surface — should be clean via API |
| ws-3-H-BRT |   H    | BRT | `"2026-03-15T14:30:00"` |              |              |        | PENDING |      | Legacy control                           |

---

## WS-4. API→Forms Cross-Layer

Create or update a record via API, then open the form in the browser. Verify that the display value and `GetFieldValue()` match what was sent via API.

**Hypothesis**: API stores correct values (bypassing Bug #7). But Forms may apply Bug #7 on the _display/load path_ (`initCalendarValueV1` → `moment(e).toDate()`), potentially showing wrong dates in IST even for cleanly-stored data.

**Method**: Use WS-1 records (created via API). Open in browser via DataID URL. Run `VV.Form.GetFieldValue()` and check visual display.

| ID         | Config | Browser TZ | API-Stored Value        | Expected Forms Display        | Status  | Actual | Bugs | Notes                                   |
| ---------- | :----: | :--------: | ----------------------- | ----------------------------- | :-----: | ------ | ---- | --------------------------------------- |
| ws-4-A-BRT |   A    |    BRT     | `"2026-03-15"`          | 03/15/2026                    | PENDING |        |      | Should display correctly                |
| ws-4-C-BRT |   C    |    BRT     | `"2026-03-15T14:30:00"` | 03/15/2026 2:30 PM            | PENDING |        |      | DateTime display                        |
| ws-4-D-BRT |   D    |    BRT     | `"2026-03-15T14:30:00"` | 03/15/2026 2:30 PM            | PENDING |        |      | GFV will add fake Z (Bug #5)            |
| ws-4-H-BRT |   H    |    BRT     | `"2026-03-15T14:30:00"` | TBD                           | PENDING |        |      | Legacy display path                     |
| ws-4-A-IST |   A    |    IST     | `"2026-03-15"`          | 03/14/2026? (Bug #7 on load?) | PENDING |        |      | Key test: does Bug #7 affect load path? |
| ws-4-C-IST |   C    |    IST     | `"2026-03-15T14:30:00"` | TBD                           | PENDING |        |      | DateTime in IST                         |
| ws-4-D-IST |   D    |    IST     | `"2026-03-15T14:30:00"` | TBD                           | PENDING |        |      | Bug #5 + IST                            |
| ws-4-H-IST |   H    |    IST     | `"2026-03-15T14:30:00"` | TBD                           | PENDING |        |      | Legacy + IST                            |

---

## WS-5. Input Format Tolerance

Send various date string formats via `postForms()`. Verify which are accepted, rejected, or normalized.

**Formats tested** (using base date 2026-03-15):

| Key   | Format                  | Date-Only Input           | DateTime Input                |
| ----- | ----------------------- | ------------------------- | ----------------------------- |
| ISO   | ISO 8601 date-only      | `"2026-03-15"`            | `"2026-03-15"`                |
| US    | US format (MM/DD/YYYY)  | `"03/15/2026"`            | `"03/15/2026"`                |
| DT    | ISO datetime no offset  | —                         | `"2026-03-15T14:30:00"`       |
| DTZ   | ISO datetime UTC        | —                         | `"2026-03-15T14:30:00Z"`      |
| DTMS  | ISO datetime ms UTC     | —                         | `"2026-03-15T14:30:00.000Z"`  |
| DTBRT | ISO datetime BRT offset | —                         | `"2026-03-15T14:30:00-03:00"` |
| DTIST | ISO datetime IST offset | —                         | `"2026-03-15T14:30:00+05:30"` |
| DB    | DB storage format       | `"3/15/2026 12:00:00 AM"` | `"3/15/2026 2:30:00 PM"`      |

**Configs**: A (date-only) and C (DateTime)

| ID           | Config | Format | Input Sent                    | Expected Stored         | Status  | Actual | Accepted? | Notes                           |
| ------------ | :----: | :----: | ----------------------------- | ----------------------- | :-----: | ------ | :-------: | ------------------------------- |
| ws-5-A-ISO   |   A    |  ISO   | `"2026-03-15"`                | `"2026-03-15"`          | PENDING |        |           | Baseline                        |
| ws-5-A-US    |   A    |   US   | `"03/15/2026"`                | TBD                     | PENDING |        |           | VV-native format?               |
| ws-5-A-DT    |   A    |   DT   | `"2026-03-15T14:30:00"`       | TBD                     | PENDING |        |           | DateTime → date-only field      |
| ws-5-A-DTZ   |   A    |  DTZ   | `"2026-03-15T14:30:00Z"`      | TBD                     | PENDING |        |           | UTC marker on date-only         |
| ws-5-A-DTBRT |   A    | DTBRT  | `"2026-03-15T14:30:00-03:00"` | TBD                     | PENDING |        |           | Offset on date-only             |
| ws-5-A-DTIST |   A    | DTIST  | `"2026-03-15T14:30:00+05:30"` | TBD                     | PENDING |        |           | IST offset on date-only         |
| ws-5-A-DB    |   A    |   DB   | `"3/15/2026 12:00:00 AM"`     | TBD                     | PENDING |        |           | DB storage format               |
| ws-5-A-DTMS  |   A    |  DTMS  | `"2026-03-15T14:30:00.000Z"`  | TBD                     | PENDING |        |           | Milliseconds + Z                |
| ws-5-C-ISO   |   C    |  ISO   | `"2026-03-15"`                | TBD                     | PENDING |        |           | Date-only → DateTime field      |
| ws-5-C-US    |   C    |   US   | `"03/15/2026"`                | TBD                     | PENDING |        |           | US format → DateTime field      |
| ws-5-C-DT    |   C    |   DT   | `"2026-03-15T14:30:00"`       | `"2026-03-15T14:30:00"` | PENDING |        |           | Baseline DateTime               |
| ws-5-C-DTZ   |   C    |  DTZ   | `"2026-03-15T14:30:00Z"`      | TBD                     | PENDING |        |           | Does server strip or convert Z? |
| ws-5-C-DTBRT |   C    | DTBRT  | `"2026-03-15T14:30:00-03:00"` | TBD                     | PENDING |        |           | Does server convert to UTC?     |
| ws-5-C-DTIST |   C    | DTIST  | `"2026-03-15T14:30:00+05:30"` | TBD                     | PENDING |        |           | Does server convert to UTC?     |
| ws-5-C-DB    |   C    |   DB   | `"3/15/2026 2:30:00 PM"`      | TBD                     | PENDING |        |           | DB format → DateTime field      |
| ws-5-C-DTMS  |   C    |  DTMS  | `"2026-03-15T14:30:00.000Z"`  | TBD                     | PENDING |        |           | Milliseconds + Z                |

---

## WS-6. Empty/Null Handling

Test how the API handles empty, null, and special values when creating and updating records.

**On create** (`postForms`) — 2 configs (A date-only, D DateTime+ignoreTZ) × 5 inputs:

| ID             | Config | Input            | Expected Stored | Status  | Actual | Notes                            |
| -------------- | :----: | ---------------- | --------------- | :-----: | ------ | -------------------------------- |
| ws-6-A-empty   |   A    | `""`             | `""` or null    | PENDING |        | Empty string                     |
| ws-6-A-null    |   A    | `null`           | `""` or null    | PENDING |        | Null value                       |
| ws-6-A-omit    |   A    | (field omitted)  | `""` or null    | PENDING |        | Field not in data object         |
| ws-6-A-strNull |   A    | `"null"`         | TBD             | PENDING |        | Literal string "null"            |
| ws-6-A-invDate |   A    | `"Invalid Date"` | TBD             | PENDING |        | The Bug #6 string from Forms GFV |
| ws-6-D-empty   |   D    | `""`             | `""` or null    | PENDING |        | DateTime empty                   |
| ws-6-D-null    |   D    | `null`           | `""` or null    | PENDING |        | DateTime null                    |
| ws-6-D-omit    |   D    | (field omitted)  | `""` or null    | PENDING |        | DateTime omitted                 |
| ws-6-D-strNull |   D    | `"null"`         | TBD             | PENDING |        | DateTime literal "null"          |
| ws-6-D-invDate |   D    | `"Invalid Date"` | TBD             | PENDING |        | DateTime "Invalid Date"          |

**On update** (`postFormRevision`) — clear existing value:

| ID              | Config | Scenario                       | Expected | Status  | Actual | Notes                    |
| --------------- | :----: | ------------------------------ | -------- | :-----: | ------ | ------------------------ |
| ws-6-A-clearUpd |   A    | Create with date → Update `""` | Cleared  | PENDING |        | Does "" clear the field? |
| ws-6-D-clearUpd |   D    | Create with date → Update `""` | Cleared  | PENDING |        | DateTime clear           |

---

## WS-7. API Update Path

Test `postFormRevision()` behavior: changing dates, preserving existing values, and adding dates to empty fields.

| ID              | Config | Scenario | Step 1 (Create)         | Step 2 (Update)         | Expected After Update    | Status  | Actual | Notes                            |
| --------------- | :----: | :------: | ----------------------- | ----------------------- | ------------------------ | :-----: | ------ | -------------------------------- |
| ws-7-A-change   |   A    |  Change  | `"2026-03-15"`          | `"2026-06-20"`          | `"2026-06-20"`           | PENDING |        | New date replaces old            |
| ws-7-C-change   |   C    |  Change  | `"2026-03-15T14:30:00"` | `"2026-06-20T09:00:00"` | `"2026-06-20T09:00:00"`  | PENDING |        | DateTime change                  |
| ws-7-D-change   |   D    |  Change  | `"2026-03-15T14:30:00"` | `"2026-06-20T09:00:00"` | `"2026-06-20T09:00:00"`  | PENDING |        | DateTime+ignoreTZ                |
| ws-7-H-change   |   H    |  Change  | `"2026-03-15T14:30:00"` | `"2026-06-20T09:00:00"` | `"2026-06-20T09:00:00"`  | PENDING |        | Legacy                           |
| ws-7-A-preserve |   A    | Preserve | `"2026-03-15"`          | (field omitted)         | `"2026-03-15"` preserved | PENDING |        | Omitting field should keep value |
| ws-7-C-preserve |   C    | Preserve | `"2026-03-15T14:30:00"` | (field omitted)         | `"2026-03-15T14:30:00"`  | PENDING |        |                                  |
| ws-7-D-preserve |   D    | Preserve | `"2026-03-15T14:30:00"` | (field omitted)         | `"2026-03-15T14:30:00"`  | PENDING |        |                                  |
| ws-7-H-preserve |   H    | Preserve | `"2026-03-15T14:30:00"` | (field omitted)         | `"2026-03-15T14:30:00"`  | PENDING |        |                                  |
| ws-7-A-add      |   A    |   Add    | (no date)               | `"2026-03-15"`          | `"2026-03-15"`           | PENDING |        | Add date to empty field          |
| ws-7-C-add      |   C    |   Add    | (no date)               | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00"`  | PENDING |        |                                  |
| ws-7-D-add      |   D    |   Add    | (no date)               | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00"`  | PENDING |        |                                  |
| ws-7-H-add      |   H    |   Add    | (no date)               | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00"`  | PENDING |        |                                  |

---

## WS-8. Query Date Filtering

Test OData-style `q` parameter filters on date fields via `getForms()`. Requires records created by WS-1.

**Prerequisite**: At least one WS-1 record with known stored values.

| ID             | Config | Query Type      | Query                                                           | Expected | Status  | Actual | Notes                             |
| -------------- | :----: | --------------- | --------------------------------------------------------------- | -------- | :-----: | ------ | --------------------------------- |
| ws-8-A-eq      |   A    | Exact match     | `[DataField7] eq '2026-03-15'`                                  | Match    | PENDING |        | Basic equality                    |
| ws-8-A-gt      |   A    | Greater than    | `[DataField7] gt '2026-03-14'`                                  | Match    | PENDING |        | Date comparison                   |
| ws-8-A-range   |   A    | Range           | `[DataField7] ge '2026-03-15' AND [DataField7] le '2026-03-16'` | Match    | PENDING |        | Inclusive range                   |
| ws-8-A-fmtUS   |   A    | Format mismatch | `[DataField7] eq '03/15/2026'`                                  | TBD      | PENDING |        | US format in query                |
| ws-8-A-noMatch |   A    | No match        | `[DataField7] eq '2026-03-16'`                                  | No match | PENDING |        | Control — wrong date              |
| ws-8-C-eq      |   C    | Exact match     | `[DataField6] eq '2026-03-15T14:30:00'`                         | Match    | PENDING |        | DateTime equality                 |
| ws-8-C-gt      |   C    | Greater than    | `[DataField6] gt '2026-03-15T14:00:00'`                         | Match    | PENDING |        | DateTime comparison               |
| ws-8-C-range   |   C    | Range           | `[DataField6] ge '2026-03-15' AND [DataField6] le '2026-03-16'` | Match    | PENDING |        | Date-only range on DateTime field |
| ws-8-C-fmtZ    |   C    | Format mismatch | `[DataField6] eq '2026-03-15T14:30:00Z'`                        | TBD      | PENDING |        | Z suffix in query                 |
| ws-8-C-noMatch |   C    | No match        | `[DataField6] eq '2026-03-15T15:00:00'`                         | No match | PENDING |        | Control — wrong time              |

---

## WS-9. Date Computation in Scripts

Test what gets stored when scripts perform date arithmetic or create JavaScript `Date` objects before sending to the API. This simulates real production patterns where scripts compute due dates, deadlines, or offsets before creating/updating records.

**Why this matters**: `JSON.stringify()` serializes `Date` objects via `.toJSON()` → ISO 8601 with Z suffix (e.g., `"2026-04-14T00:00:00.000Z"`). The `Date` constructor and arithmetic methods are TZ-sensitive. A script running in BRT may produce different results from the same script in UTC (cloud).

**Server TZ simulation**: Use `TZ=` env var to run the Node.js server in different timezones without changing macOS system TZ.

**Patterns tested**:

| Pattern                     | Code                                          | Risk                                                                                                              |
| --------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Date obj from ISO**       | `new Date("2026-03-15")` → send to API        | Always UTC midnight → `"2026-03-15T00:00:00.000Z"`. TZ-safe for serialization, but `getDate()` returns local day. |
| **Date obj from US format** | `new Date("03/15/2026")` → send to API        | LOCAL midnight → different UTC per TZ. BRT: `T03:00:00.000Z`, IST: prev-day `T18:30:00.000Z`.                     |
| **Local arithmetic**        | `d.setDate(d.getDate() + 30)` → send Date     | `getDate()` is local-TZ-dependent. For ISO-parsed dates, local day may differ from UTC day.                       |
| **Safe string pattern**     | `d.toISOString().split('T')[0]` → send string | Always extracts UTC date → TZ-independent. Recommended pattern.                                                   |

| ID               | Config | Server TZ | Pattern              | Computed Value Sent                                          | Expected Stored       | Status  | Actual | Notes                                                                     |
| ---------------- | :----: | :-------: | -------------------- | ------------------------------------------------------------ | --------------------- | :-----: | ------ | ------------------------------------------------------------------------- |
| ws-9-A-iso-BRT   |   A    |    BRT    | Date obj from ISO    | `new Date("2026-03-15")` → Date                              | TBD (Z in date-only?) | PENDING |        | `.toJSON()` = `"2026-03-15T00:00:00.000Z"`                                |
| ws-9-A-iso-IST   |   A    |    IST    | Date obj from ISO    | `new Date("2026-03-15")` → Date                              | Same as BRT (TZ-safe) | PENDING |        | Same UTC midnight regardless of TZ                                        |
| ws-9-A-iso-UTC   |   A    |    UTC    | Date obj from ISO    | `new Date("2026-03-15")` → Date                              | Same as BRT (control) | PENDING |        | Cloud baseline                                                            |
| ws-9-C-iso-BRT   |   C    |    BRT    | Date obj from ISO    | `new Date("2026-03-15")` → Date                              | TBD                   | PENDING |        | DateTime field receives ISO+Z                                             |
| ws-9-A-us-BRT    |   A    |    BRT    | Date obj from US fmt | `new Date("03/15/2026")` → Date                              | TBD                   | PENDING |        | `.toJSON()` = `"2026-03-15T03:00:00.000Z"` (BRT midnight)                 |
| ws-9-A-us-IST    |   A    |    IST    | Date obj from US fmt | `new Date("03/15/2026")` → Date                              | TBD                   | PENDING |        | `.toJSON()` = `"2026-03-14T18:30:00.000Z"` (IST midnight = prev UTC day!) |
| ws-9-A-us-UTC    |   A    |    UTC    | Date obj from US fmt | `new Date("03/15/2026")` → Date                              | TBD                   | PENDING |        | `.toJSON()` = `"2026-03-15T00:00:00.000Z"`                                |
| ws-9-A-arith-BRT |   A    |    BRT    | Local arith +30 days | `d=new Date("2026-03-15"); d.setDate(d.getDate()+30)` → Date | TBD                   | PENDING |        | BRT: getDate()=14 → setDate(44) → Apr 13 21:00 BRT → Apr 14 UTC           |
| ws-9-A-arith-IST |   A    |    IST    | Local arith +30 days | same code                                                    | TBD                   | PENDING |        | IST: getDate()=15 → setDate(45) → Apr 14 05:30 IST → Apr 14 UTC           |
| ws-9-A-arith-UTC |   A    |    UTC    | Local arith +30 days | same code                                                    | TBD                   | PENDING |        | UTC: getDate()=15 → setDate(45) → Apr 14 00:00 UTC (control)              |
| ws-9-A-safe-BRT  |   A    |    BRT    | Safe string extract  | `d.toISOString().split('T')[0]` → `"2026-04-14"`             | `"2026-04-14"`        | PENDING |        | TZ-independent string                                                     |
| ws-9-A-safe-IST  |   A    |    IST    | Safe string extract  | same code → `"2026-04-14"`                                   | `"2026-04-14"`        | PENDING |        | Should match BRT exactly                                                  |
