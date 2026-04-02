# Web Services — Test Matrix

Authoritative permutation tracker for the web services date-handling investigation.
API analysis → `analysis.md` | Test evidence → `results.md`

Last updated: 2026-04-01 | Total slots: TBD | Done: 0 | Blocked: 0

---

## ID Convention

Web services test IDs use the format `ws-{category}-{config}-{tz}` (e.g., `ws-1-A-BRT`).
Category numbers start at WS-1 to avoid collision with forms-calendar categories (1–13).

---

## Field Configurations

Same 8 field configurations as forms-calendar — tests target the same DateTest form:

| Config | enableTime | ignoreTZ | useLegacy | Test Field  |
| :----: | :--------: | :------: | :-------: | ----------- |
|   A    |   false    |  false   |   false   | DataField7  |
|   B    |   false    |   true   |   false   | DataField10 |
|   C    |    true    |  false   |   false   | DataField6  |
|   D    |    true    |   true   |   false   | DataField5  |
|   E    |   false    |  false   |   true    | DataField12 |
|   F    |   false    |   true   |   true    | DataField11 |
|   G    |    true    |  false   |   true    | DataField14 |
|   H    |    true    |   true   |   true    | DataField13 |

---

## Coverage Summary

| Category                           | Total | PASS | FAIL | PENDING | BLOCKED |
| ---------------------------------- | :---: | :--: | :--: | :-----: | :-----: |
| WS-1. API Set Date                 |       |      |      |         |         |
| WS-2. API Get Date                 |       |      |      |         |         |
| WS-3. API Round-Trip (set→get→set) |       |      |      |         |         |
| WS-4. API→Forms Cross-Layer        |       |      |      |         |         |
| WS-5. Forms→API Cross-Layer        |       |      |      |         |         |
| WS-6. Input Format Tolerance       |       |      |      |         |         |
| WS-7. Empty/Null Field Handling    |       |      |      |         |         |
| **TOTAL**                          |       |      |      |         |         |

---

## Category Definitions

### WS-1. API Set Date

Create a new form record via `postForms()` with date values in each config field. Verify the stored value matches what was sent.

**Permutations**: 8 configs × 3 TZs = 24 slots

| ID          | Config |  TZ  | Input                 | Expected Stored | Status  | Actual | Bugs | Notes                        |
| ----------- | :----: | :--: | --------------------- | --------------- | :-----: | ------ | ---- | ---------------------------- |
| ws-1-A-BRT  |   A    | BRT  | `2026-03-15`          | `2026-03-15`    | PENDING |        |      | Date-only baseline           |
| ws-1-A-IST  |   A    | IST  | `2026-03-15`          | `2026-03-15`    | PENDING |        |      | WS-1: no client-side Bug #7? |
| ws-1-A-UTC0 |   A    | UTC0 | `2026-03-15`          | `2026-03-15`    | PENDING |        |      | Control                      |
| ws-1-B-BRT  |   B    | BRT  | `2026-03-15`          | `2026-03-15`    | PENDING |        |      | ignoreTZ date-only           |
| ws-1-C-BRT  |   C    | BRT  | `2026-03-15T00:00:00` | TBD             | PENDING |        |      | DateTime UTC-aware           |
| ws-1-C-IST  |   C    | IST  | `2026-03-15T00:00:00` | TBD             | PENDING |        |      | DateTime in UTC+             |
| ws-1-D-BRT  |   D    | BRT  | `2026-03-15T00:00:00` | TBD             | PENDING |        |      | Primary bug surface          |
| ws-1-D-IST  |   D    | IST  | `2026-03-15T00:00:00` | TBD             | PENDING |        |      | DateTime + ignoreTZ in UTC+  |

<!-- Expand with remaining configs and TZs as testing begins -->

### WS-2. API Get Date

Read existing form records (created via Forms UI with known values) via `getForms()`. Compare API return value against the raw stored value and the Forms `GetFieldValue()` return.

**Permutations**: 8 configs × 3 TZs = 24 slots

| ID         | Config | TZ  | Record Source | Expected API Return | Status  | Actual | Bugs | Notes                   |
| ---------- | :----: | :-: | ------------- | ------------------- | :-----: | ------ | ---- | ----------------------- |
| ws-2-A-BRT |   A    | BRT | UI-saved, BRT | `2026-03-15`        | PENDING |        |      | Baseline read           |
| ws-2-D-BRT |   D    | BRT | UI-saved, BRT | TBD                 | PENDING |        |      | WS-2: no Bug #5 fake Z? |

<!-- Expand as testing begins -->

### WS-3. API Round-Trip (set→get→set)

Set a date via API, read it back via API, set it again. Verify no drift occurs across N cycles.

### WS-4. API→Forms Cross-Layer

Set a date via API, open the form in the browser, verify `GetFieldValue()` and display value match.

### WS-5. Forms→API Cross-Layer

Set a date via Forms UI (popup/typed), read the record via API, verify the returned value matches what was stored.

### WS-6. Input Format Tolerance

Test various date input formats via `postForms()`:

- `2026-03-15` (ISO date-only)
- `03/15/2026` (US format)
- `2026-03-15T00:00:00` (ISO datetime, no offset)
- `2026-03-15T00:00:00Z` (ISO datetime, UTC)
- `2026-03-15T00:00:00-03:00` (ISO datetime, with offset)
- `2026-03-15T00:00:00+05:30` (ISO datetime, IST offset)

### WS-7. Empty/Null Field Handling

Test empty string, null, undefined, and missing field in API calls. Verify round-trip for cleared fields.
