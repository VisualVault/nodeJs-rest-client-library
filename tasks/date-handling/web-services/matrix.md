# Web Services — Test Matrix

Authoritative permutation tracker for the web services date-handling investigation.
API analysis → `analysis/overview.md` | Test evidence → `results.md` | Harness → `webservice-test-harness.js`

Last updated: 2026-04-06 | Total slots: 148 | Done: 148 (116P/32F) | **COMPLETE**

---

## ID Convention

Web services test IDs use the format `ws-{category}-{config}-{tz}` (e.g., `ws-1-A-BRT`).
For format/scenario variants: `ws-{category}-{config}-{variant}` (e.g., `ws-5-A-US`, `ws-7-A-change`).

---

## Field Configurations

Same 8 field configurations as forms-calendar — tests target the same DateTest form:

| Config | enableTime | ignoreTZ | useLegacy | Test Field | Type                                    |
| :----: | :--------: | :------: | :-------: | ---------- | --------------------------------------- |
|   A    |   false    |  false   |   false   | Field7     | Date-only baseline                      |
|   B    |   false    |   true   |   false   | Field10    | Date-only + ignoreTZ                    |
|   C    |    true    |  false   |   false   | Field6     | DateTime UTC-aware                      |
|   D    |    true    |   true   |   false   | Field5     | DateTime + ignoreTZ (Bug #5/#6 surface) |
|   E    |   false    |  false   |   true    | Field12    | Legacy date-only                        |
|   F    |   false    |   true   |   true    | Field11    | Legacy date-only + ignoreTZ             |
|   G    |    true    |  false   |   true    | Field14    | Legacy DateTime                         |
|   H    |    true    |   true   |   true    | Field13    | Legacy DateTime + ignoreTZ              |

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

| Category                          |  Total  | PASS | FAIL | PENDING | BLOCKED | Priority |
| --------------------------------- | :-----: | :--: | :--: | :-----: | :-----: | :------: |
| WS-1. API Write Path (Create)     |   16    |  16  |  0   |    0    |         |    P1    |
| WS-2. API Read + Cross-Layer      |   16    |  16  |  0   |    0    |         |    P1    |
| WS-3. API Round-Trip              |    4    |  4   |  0   |    0    |         |    P2    |
| WS-4. API→Forms Cross-Layer       |   10    |  3   |  7   |    0    |         |    P3    |
| WS-5. Input Format Tolerance      |   33    |  24  |  9   |    0    |         |    P2    |
| WS-6. Empty/Null Handling         |   12    |  12  |  0   |    0    |         |    P3    |
| WS-7. API Update Path             |   12    |  12  |  0   |    0    |         |    P2    |
| WS-8. Query Date Filtering        |   10    |  10  |  0   |    0    |         |    P3    |
| WS-9. Date Computation            |   23    |  17  |  6   |    0    |         |    P2    |
| WS-10. postForms vs forminstance/ |   12    |  2   |  10  |    0    |    0    |    P1    |
| **TOTAL**                         | **148** | 116  |  32  |  **0**  |  **0**  |          |

> **Counting note**: WS-10A includes 7 additional forminstance/ comparison rows (all PASS) embedded in the detailed table for side-by-side analysis. These share test IDs with the postForms rows and are **not** counted as separate test slots. WS-5 counts 33 executed format/config combinations (2 planned LATAM variants for Config C were not needed — Config A results generalize).

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

| ID         | Config | TZ  | Input Sent              | Expected Stored          | Status | Actual                   | Bugs | Notes                        |
| ---------- | :----: | :-: | ----------------------- | ------------------------ | :----: | ------------------------ | ---- | ---------------------------- |
| ws-1-A-BRT |   A    | BRT | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` |  PASS  | `"2026-03-15T00:00:00Z"` |      | Date preserved; API adds T+Z |
| ws-1-B-BRT |   B    | BRT | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` |  PASS  | `"2026-03-15T00:00:00Z"` |      | ignoreTZ no effect on API    |
| ws-1-C-BRT |   C    | BRT | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` |      | Time preserved; API adds Z   |
| ws-1-D-BRT |   D    | BRT | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` |      | ignoreTZ no effect on API    |
| ws-1-E-BRT |   E    | BRT | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` |  PASS  | `"2026-03-15T00:00:00Z"` |      | Legacy = same as non-legacy  |
| ws-1-F-BRT |   F    | BRT | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` |  PASS  | `"2026-03-15T00:00:00Z"` |      | Legacy + ignoreTZ = same     |
| ws-1-G-BRT |   G    | BRT | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` |      | Legacy DateTime = same       |
| ws-1-H-BRT |   H    | BRT | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` |      | Legacy + ignoreTZ = same     |
| ws-1-A-IST |   A    | IST | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` |  PASS  | `"2026-03-15T00:00:00Z"` |      | TZ independent ✓ H-1,H-4     |
| ws-1-C-IST |   C    | IST | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` |      | TZ independent ✓             |
| ws-1-D-IST |   D    | IST | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` |      | TZ independent ✓             |
| ws-1-H-IST |   H    | IST | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` |      | TZ independent ✓             |
| ws-1-A-UTC |   A    | UTC | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` |  PASS  | `"2026-03-15T00:00:00Z"` |      | Cloud simulation ✓ H-4       |
| ws-1-C-UTC |   C    | UTC | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` |      | Cloud simulation ✓           |
| ws-1-D-UTC |   D    | UTC | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` |      | Cloud simulation ✓           |
| ws-1-H-UTC |   H    | UTC | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |  PASS  | `"2026-03-15T14:30:00Z"` |      | Cloud simulation ✓           |

> **WS-1 Finding**: All 16 tests PASS. The VV server stores the date/time value as sent. The API read-back normalizes the format by appending `T00:00:00Z` (date-only) or `Z` (datetime). The date value itself is preserved perfectly. No Bug #7 (H-1 confirmed). Server TZ has no effect (H-4 confirmed). Field config flags (enableTime, ignoreTimezone, useLegacy) have no effect on API write behavior. Created records: DateTest-000889 through DateTest-000894.

---

## WS-2. API Read + Cross-Layer Verification

Read existing Forms-saved records via `getForms()` with `expand: true`. Two analysis dimensions per slot:

1. **API format**: Does the API return the raw stored value without Bug #5 (fake Z) or Bug #6 ("Invalid Date")?
2. **Cross-layer**: Does the API return exactly what Forms `getValueObjectValue()` stored (including buggy values from IST)?

**Records**:

- DateTest-000080 Rev 2 — saved from BRT (2026-03-31), Config A + D set to 03/15/2026
- DateTest-000084 Rev 1 — saved from IST (2026-04-01), Config A + D set to 03/15/2026

**Note**: These records have known stored values from Forms testing (see `forms-calendar/results.md`). Configs not explicitly set during save may have empty or preset values.

| ID         | Config | Record Source | Forms Stored Value              | Expected API Return                  | Status | Actual                   | Bugs | Notes                                        |
| ---------- | :----: | ------------- | ------------------------------- | ------------------------------------ | :----: | ------------------------ | ---- | -------------------------------------------- |
| ws-2-A-BRT |   A    | 000080 (BRT)  | `"2026-03-15"`                  | `"2026-03-15T00:00:00Z"`             |  PASS  | `"2026-03-15T00:00:00Z"` |      | API normalizes date-only → datetime+Z; H-2 ✓ |
| ws-2-B-BRT |   B    | 000080 (BRT)  | (not set)                       | `null`                               |  PASS  | `null`                   |      | Unset field returns null                     |
| ws-2-C-BRT |   C    | 000080 (BRT)  | (not set)                       | `null`                               |  PASS  | `null`                   |      | Unset field returns null                     |
| ws-2-D-BRT |   D    | 000080 (BRT)  | `"2026-03-15T00:00:00"`         | `"2026-03-15T00:00:00Z"` (real Z)    |  PASS  | `"2026-03-15T00:00:00Z"` |      | No fake Z — H-2 confirmed; API adds real Z   |
| ws-2-E-BRT |   E    | 000080 (BRT)  | (not set)                       | `null`                               |  PASS  | `null`                   |      | Legacy unset = null                          |
| ws-2-F-BRT |   F    | 000080 (BRT)  | (not set)                       | `null`                               |  PASS  | `null`                   |      | Legacy unset = null                          |
| ws-2-G-BRT |   G    | 000080 (BRT)  | (not set)                       | `null`                               |  PASS  | `null`                   |      | Legacy unset = null                          |
| ws-2-H-BRT |   H    | 000080 (BRT)  | (not set)                       | `null`                               |  PASS  | `null`                   |      | Legacy unset = null                          |
| ws-2-A-IST |   A    | 000084 (IST)  | `"2026-03-14"` (Bug #7: -1 day) | `"2026-03-14T00:00:00Z"` (bug in DB) |  PASS  | `"2026-03-14T00:00:00Z"` | #7   | API confirms wrong date in storage; H-7 ✓    |
| ws-2-B-IST |   B    | 000084 (IST)  | (not set)                       | `null`                               |  PASS  | `null`                   |      | Unset                                        |
| ws-2-C-IST |   C    | 000084 (IST)  | (not set)                       | `null`                               |  PASS  | `null`                   |      | Unset                                        |
| ws-2-D-IST |   D    | 000084 (IST)  | `"2026-03-15T00:00:00"`         | `"2026-03-15T00:00:00Z"` (real Z)    |  PASS  | `"2026-03-15T00:00:00Z"` |      | No fake Z — H-2 confirmed                    |
| ws-2-E-IST |   E    | 000084 (IST)  | (not set)                       | `null`                               |  PASS  | `null`                   |      | Legacy unset = null                          |
| ws-2-F-IST |   F    | 000084 (IST)  | (not set)                       | `null`                               |  PASS  | `null`                   |      | Legacy unset = null                          |
| ws-2-G-IST |   G    | 000084 (IST)  | (not set)                       | `null`                               |  PASS  | `null`                   |      | Legacy unset = null                          |
| ws-2-H-IST |   H    | 000084 (IST)  | (not set)                       | `null`                               |  PASS  | `null`                   |      | Legacy unset = null                          |

> **WS-2 Finding**: All 16 tests PASS. The API returns values normalized to datetime+Z format. No Bug #5 fake Z (H-2 confirmed). No Bug #6 "Invalid Date" — unset fields return `null` (H-3 partially confirmed). API confirms Bug #7 damage: IST-saved Config A has `"2026-03-14"` in storage (H-7 confirmed — buggy value readable via API). Cross-layer: API return format differs from Forms `getValueObjectValue()` — API normalizes to `"...T00:00:00Z"` while Forms returns date-only string or datetime without Z.

---

## WS-3. API Round-Trip

Write a date via API (`postForms`), read back (`getForms`), write the read-back value (`postFormRevision`), read again. 2 cycles. Verify no drift.

**Hypothesis**: API introduces no drift because there's no Bug #5 fake Z in the read path. All cycles should return identical values.

| ID         | Config | TZ  | Input                   | Cycle 1 Read             | Cycle 2 Read             | Drift? | Status | Bugs | Notes                         |
| ---------- | :----: | :-: | ----------------------- | ------------------------ | ------------------------ | :----: | :----: | ---- | ----------------------------- |
| ws-3-A-BRT |   A    | BRT | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` | `"2026-03-15T00:00:00Z"` | false  |  PASS  |      | Zero drift; H-8 ✓             |
| ws-3-C-BRT |   C    | BRT | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` | `"2026-03-15T14:30:00Z"` | false  |  PASS  |      | Zero drift; H-8 ✓             |
| ws-3-D-BRT |   D    | BRT | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` | `"2026-03-15T14:30:00Z"` | false  |  PASS  |      | No Bug #5 in API path; H-8 ✓  |
| ws-3-H-BRT |   H    | BRT | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` | `"2026-03-15T14:30:00Z"` | false  |  PASS  |      | Legacy = same behavior; H-8 ✓ |

> **WS-3 Finding**: All 4 tests PASS. API round-trip is completely drift-free across all configs. The API adds Z on read, and the Z-appended value is accepted without modification on write-back. No Bug #5 accumulation. H-8 confirmed. Contrast: Forms GFV round-trip drifts for Config D (Bug #5 fake Z causes progressive shift).

---

## WS-4. API→Forms Cross-Layer

Create or update a record via API, then open the form in the browser. Verify that the display value and `GetFieldValue()` match what was sent via API.

**Hypothesis**: API stores correct values (bypassing Bug #7). But Forms may apply Bug #7 on the _display/load path_ (`initCalendarValueV1` → `moment(e).toDate()`), potentially showing wrong dates in IST even for cleanly-stored data.

**Method**: Use WS-1 records (created via API). Open in browser via DataID URL. Run `VV.Form.GetFieldValue()` and check visual display.

| ID             | Config | Browser TZ | API-Stored Value         | Expected Forms Display | Status | Actual Display        | Actual rawValue         | Bugs    | Notes                                                                 |
| -------------- | :----: | :--------: | ------------------------ | ---------------------- | :----: | --------------------- | ----------------------- | ------- | --------------------------------------------------------------------- |
| ws-4-A-BRT     |   A    |    BRT     | `"2026-03-15T00:00:00Z"` | 03/15/2026             |  PASS  | `03/15/2026`          | `"2026-03-15"`          |         | Date-only correct ✓                                                   |
| ws-4-C-BRT     |   C    |    BRT     | `"2026-03-15T14:30:00Z"` | 03/15/2026 2:30 PM     |  FAIL  | `03/15/2026 11:30 AM` | `"2026-03-15T11:30:00"` | CB-8    | UTC→BRT shift: 14:30Z → 11:30 local                                   |
| ws-4-D-BRT     |   D    |    BRT     | `"2026-03-15T14:30:00Z"` | 03/15/2026 2:30 PM     |  FAIL  | `03/15/2026 02:30 PM` | `"2026-03-15T11:30:00"` | CB-8,#5 | Display OK (ignoreTZ), rawValue shifted, GFV fake Z                   |
| ws-4-H-BRT     |   H    |    BRT     | `"2026-03-15T14:30:00Z"` | 03/15/2026 2:30 PM     |  FAIL  | `03/15/2026 02:30 PM` | `"2026-03-15T11:30:00"` | CB-8    | Like D minus fake Z                                                   |
| ws-4-A-IST     |   A    |    IST     | `"2026-03-15T00:00:00Z"` | 03/15/2026             |  PASS  | `03/15/2026`          | `"2026-03-15"`          |         | Date-only correct in IST ✓; H-6 refuted                               |
| ws-4-C-IST     |   C    |    IST     | `"2026-03-15T14:30:00Z"` | 03/15/2026 2:30 PM     |  FAIL  | `03/15/2026 08:00 PM` | `"2026-03-15T20:00:00"` | CB-8    | UTC→IST shift: 14:30Z → 20:00 local                                   |
| ws-4-D-IST     |   D    |    IST     | `"2026-03-15T14:30:00Z"` | 03/15/2026 2:30 PM     |  FAIL  | `03/15/2026 02:30 PM` | `"2026-03-15T20:00:00"` | CB-8,#5 | Display OK (ignoreTZ), rawValue shifted, GFV fake Z                   |
| ws-4-H-IST     |   H    |    IST     | `"2026-03-15T14:30:00Z"` | 03/15/2026 2:30 PM     |  FAIL  | `03/15/2026 02:30 PM` | `"2026-03-15T20:00:00"` | CB-8    | Like D minus fake Z                                                   |
| ws-4-D-mid-BRT |   D    |    BRT     | `"2026-03-15T02:00:00Z"` | 03/15/2026 2:00 AM     |  FAIL  | `03/15/2026 02:00 AM` | `"2026-03-14T23:00:00"` | CB-8    | **Midnight crossed! rawValue = Mar 14** (02:00Z = 23:00 BRT prev day) |
| ws-4-D-mid-IST |   D    |    IST     | `"2026-03-15T02:00:00Z"` | 03/15/2026 2:00 AM     |  PASS  | `03/15/2026 02:00 AM` | `"2026-03-15T07:30:00"` |         | No crossing in IST (02:00Z + 5:30 = 07:30 same day)                   |

> **WS-4 Finding**: 3 PASS, 7 FAIL. **Date-only (Config A): PASS** in both TZs — Bug #7 does NOT manifest on form load/display path. **DateTime (C/D/H): FAIL** — CB-8: API appends Z, Forms V1 interprets as UTC, shifts to local. Config D/H display correctly (ignoreTZ) but rawValue is wrong. **Midnight-crossing**: `T02:00:00Z` in BRT → rawValue crosses to **Mar 14** (`23:00 BRT`). Display says `02:00 AM Mar 15` but stored date is **wrong day** — critical for CSV imports with early-morning UTC times.

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
| LATAM | DD/MM/YYYY (day-first)  | `"15/03/2026"`            | `"15/03/2026"`                |
| LATAM | DD-MM-YYYY (day-first)  | `"15-03-2026"`            | `"15-03-2026"`                |
| LATAM | DD.MM.YYYY (day-first)  | `"15.03.2026"`            | —                             |

**Configs**: A (date-only) and C (DateTime)

| ID            | Config | Format | Input Sent                        | Expected Stored         | Status | Actual                   | Accepted? | Notes                                      |
| ------------- | :----: | :----: | --------------------------------- | ----------------------- | :----: | ------------------------ | :-------: | ------------------------------------------ |
| ws-5-A-ISO    |   A    |  ISO   | `"2026-03-15"`                    | `"2026-03-15"`          |  PASS  | `"2026-03-15T00:00:00Z"` |    Yes    | Baseline; API adds T+Z                     |
| ws-5-A-US     |   A    |   US   | `"03/15/2026"`                    | `"2026-03-15"`          |  PASS  | `"2026-03-15T00:00:00Z"` |    Yes    | US format accepted and normalized          |
| ws-5-A-DT     |   A    |   DT   | `"2026-03-15T14:30:00"`           | TBD                     |  PASS  | `"2026-03-15T14:30:00Z"` |    Yes    | Time preserved in date-only field!         |
| ws-5-A-DTZ    |   A    |  DTZ   | `"2026-03-15T14:30:00Z"`          | TBD                     |  PASS  | `"2026-03-15T14:30:00Z"` |    Yes    | Z preserved as-is                          |
| ws-5-A-DTBRT  |   A    | DTBRT  | `"2026-03-15T14:30:00-03:00"`     | TBD                     |  PASS  | `"2026-03-15T17:30:00Z"` |    Yes    | Offset converted to UTC (+3h)              |
| ws-5-A-DTIST  |   A    | DTIST  | `"2026-03-15T14:30:00+05:30"`     | TBD                     |  PASS  | `"2026-03-15T09:00:00Z"` |    Yes    | Offset converted to UTC (-5:30h)           |
| ws-5-A-DB     |   A    |   DB   | `"3/15/2026 12:00:00 AM"`         | TBD                     |  PASS  | `"2026-03-15T00:00:00Z"` |    Yes    | DB storage format accepted                 |
| ws-5-A-DTMS   |   A    |  DTMS  | `"2026-03-15T14:30:00.000Z"`      | TBD                     |  PASS  | `"2026-03-15T14:30:00Z"` |    Yes    | Milliseconds stripped                      |
| ws-5-A-LATAM1 |   A    | LATAM  | `"15/03/2026"` (DD/MM/YYYY)       | TBD                     |  FAIL  | `null`                   |  Silent   | Accepted but stored null — data loss!      |
| ws-5-A-LATAM2 |   A    | LATAM  | `"15-03-2026"` (DD-MM-YYYY)       | TBD                     |  FAIL  | `null`                   |  Silent   | Accepted but stored null — data loss!      |
| ws-5-A-LATAM3 |   A    | LATAM  | `"15.03.2026"` (DD.MM.YYYY)       | TBD                     |  FAIL  | `null`                   |  Silent   | Accepted but stored null — data loss!      |
| ws-5-C-ISO    |   C    |  ISO   | `"2026-03-15"`                    | TBD                     |  PASS  | `"2026-03-15T00:00:00Z"` |    Yes    | Date-only → DateTime: T+Z added            |
| ws-5-C-US     |   C    |   US   | `"03/15/2026"`                    | TBD                     |  PASS  | `"2026-03-15T00:00:00Z"` |    Yes    | US → DateTime: normalized                  |
| ws-5-C-DT     |   C    |   DT   | `"2026-03-15T14:30:00"`           | `"2026-03-15T14:30:00"` |  PASS  | `"2026-03-15T14:30:00Z"` |    Yes    | Baseline; API adds Z                       |
| ws-5-C-DTZ    |   C    |  DTZ   | `"2026-03-15T14:30:00Z"`          | TBD                     |  PASS  | `"2026-03-15T14:30:00Z"` |    Yes    | Z kept as-is                               |
| ws-5-C-DTBRT  |   C    | DTBRT  | `"2026-03-15T14:30:00-03:00"`     | TBD                     |  PASS  | `"2026-03-15T17:30:00Z"` |    Yes    | BRT offset → UTC conversion (+3h)          |
| ws-5-C-DTIST  |   C    | DTIST  | `"2026-03-15T14:30:00+05:30"`     | TBD                     |  PASS  | `"2026-03-15T09:00:00Z"` |    Yes    | IST offset → UTC conversion (-5:30h)       |
| ws-5-C-DB     |   C    |   DB   | `"3/15/2026 2:30:00 PM"`          | TBD                     |  PASS  | `"2026-03-15T14:30:00Z"` |    Yes    | DB format accepted                         |
| ws-5-C-DTMS   |   C    |  DTMS  | `"2026-03-15T14:30:00.000Z"`      | TBD                     |  PASS  | `"2026-03-15T14:30:00Z"` |    Yes    | Milliseconds stripped                      |
| ws-5-C-LATAM1 |   C    | LATAM  | `"15/03/2026"` (DD/MM/YYYY)       | TBD                     |  FAIL  | `null`                   |  Silent   | Accepted but stored null — data loss!      |
| ws-5-C-LATAM2 |   C    | LATAM  | `"15-03-2026"` (DD-MM-YYYY)       | TBD                     |  FAIL  | `null`                   |  Silent   | Accepted but stored null — data loss!      |
| ws-5-A-YS     |   A    |   Y/   | `"2026/03/15"` (YYYY/MM/DD)       | `"2026-03-15"`          |  PASS  | `"2026-03-15T00:00:00Z"` |    Yes    | Year-first with slashes                    |
| ws-5-A-YD     |   A    |   Y.   | `"2026.03.15"` (YYYY.MM.DD)       | `"2026-03-15"`          |  PASS  | `"2026-03-15T00:00:00Z"` |    Yes    | Year-first with dots                       |
| ws-5-A-USD    |   A    |  US-   | `"03-15-2026"` (MM-DD-YYYY)       | `"2026-03-15"`          |  PASS  | `"2026-03-15T00:00:00Z"` |    Yes    | US format with dashes                      |
| ws-5-A-ENG    |   A    |  Word  | `"March 15, 2026"`                | `"2026-03-15"`          |  PASS  | `"2026-03-15T00:00:00Z"` |    Yes    | English month name                         |
| ws-5-A-EUR    |   A    |  Euro  | `"15 March 2026"`                 | `"2026-03-15"`          |  PASS  | `"2026-03-15T00:00:00Z"` |    Yes    | European word format                       |
| ws-5-A-ABBR   |   A    |  Abbr  | `"15-Mar-2026"`                   | `"2026-03-15"`          |  PASS  | `"2026-03-15T00:00:00Z"` |    Yes    | Abbreviated month                          |
| ws-5-A-COMP   |   A    |  Comp  | `"20260315"`                      | TBD                     |  FAIL  | `null`                   |  Silent   | Compact ISO silently fails                 |
| ws-5-A-YRDM   |   A    | Y-D-M  | `"2026-15-03"` (YYYY-DD-MM)       | TBD                     |  FAIL  | `null`                   |  Silent   | Invalid month 15; silently fails           |
| ws-5-A-AMBIG  |   A    | Ambig  | `"05/03/2026"`                    | May 3 or Mar 5?         |  PASS  | `"2026-05-03T00:00:00Z"` |    Yes    | **Interpreted as MM/DD (May 3)** — Bug #8b |
| ws-5-D-DOTNET |   D    |  .NET  | `"2026-03-15T00:00:00.000+00:00"` | `"2026-03-15"`          |  PASS  | `"2026-03-15T00:00:00Z"` |    Yes    | .NET `+00:00` = Z equivalent (CB-12)       |
| ws-5-D-EPOCH  |   D    | Epoch  | `1773532800000` (number)          | TBD                     |  FAIL  | `null`                   |  Silent   | Numeric epoch silently stored null         |
| ws-5-D-EPOCHS |   D    | Epoch  | `"1773532800000"` (string)        | TBD                     |  FAIL  | `null`                   |  Silent   | String epoch silently stored null          |

> **WS-5 Finding**: 24 PASS, 9 FAIL (33 slots). The VV server is very format-tolerant: ISO, US (MM/DD/YYYY), DB storage format, YYYY/MM/DD, YYYY.MM.DD, English month names, and all ISO datetime variants are accepted. **TZ offsets are converted to UTC** (BRT -03:00 → +3h, IST +05:30 → -5:30h). Milliseconds are stripped. **CRITICAL — Bug #8**: DD/MM/YYYY (LATAM) formats are silently accepted but stored as `null` — no error, no warning, complete data loss. **Bug #8b**: Ambiguous dates like `05/03/2026` are always interpreted as MM/DD (US) — a LATAM dev intending March 5 gets May 3 stored silently. Compact ISO `20260315`, invalid `2026-15-03`, and **epoch milliseconds** (both numeric and string) also silently fail. .NET `+00:00` offset works (equivalent to Z). H-5 confirmed for ISO/US/named formats.

---

## WS-6. Empty/Null Handling

Test how the API handles empty, null, and special values when creating and updating records.

**On create** (`postForms`) — 2 configs (A date-only, D DateTime+ignoreTZ) × 5 inputs:

| ID             | Config | Input            | Expected Stored | Status | Actual | Notes                               |
| -------------- | :----: | ---------------- | --------------- | :----: | ------ | ----------------------------------- |
| ws-6-A-empty   |   A    | `""`             | `""` or null    |  PASS  | `null` | Empty → null; H-3 ✓                 |
| ws-6-A-null    |   A    | `null`           | `""` or null    |  PASS  | `null` | Null → null                         |
| ws-6-A-omit    |   A    | (field omitted)  | `""` or null    |  PASS  | `null` | Omit → null                         |
| ws-6-A-strNull |   A    | `"null"`         | TBD             |  PASS  | `null` | Literal "null" not stored as string |
| ws-6-A-invDate |   A    | `"Invalid Date"` | TBD             |  PASS  | `null` | "Invalid Date" → null; no Bug #6    |
| ws-6-D-empty   |   D    | `""`             | `""` or null    |  PASS  | `null` | DateTime empty → null               |
| ws-6-D-null    |   D    | `null`           | `""` or null    |  PASS  | `null` | DateTime null → null                |
| ws-6-D-omit    |   D    | (field omitted)  | `""` or null    |  PASS  | `null` | DateTime omit → null                |
| ws-6-D-strNull |   D    | `"null"`         | TBD             |  PASS  | `null` | DateTime "null" → null              |
| ws-6-D-invDate |   D    | `"Invalid Date"` | TBD             |  PASS  | `null` | DateTime "Invalid Date" → null      |

**On update** (`postFormRevision`) — clear existing value:

| ID              | Config | Scenario                       | Expected | Status | Actual                            | Notes                            |
| --------------- | :----: | ------------------------------ | -------- | :----: | --------------------------------- | -------------------------------- |
| ws-6-A-clearUpd |   A    | Create with date → Update `""` | Cleared  |  PASS  | before=`T00:00:00Z`, after=`null` | Empty string clears date field   |
| ws-6-D-clearUpd |   D    | Create with date → Update `""` | Cleared  |  PASS  | before=`T00:00:00Z`, after=`null` | Empty string clears DateTime too |

> **WS-6 Finding**: All 12 tests PASS. The API handles empty/null/special values cleanly: all store `null`. **No Bug #6** — `"Invalid Date"` is not stored as a string (unlike Forms `GetFieldValue` which returns it). `"null"` literal string is also not stored. Empty string via `postFormRevision` successfully clears existing date values. H-3 fully confirmed: API returns `null` for empty date fields, never `""` or `"Invalid Date"`. Configs A and D behave identically.

---

## WS-7. API Update Path

Test `postFormRevision()` behavior: changing dates, preserving existing values, and adding dates to empty fields.

| ID              | Config | Scenario | Step 1 (Create)         | Step 2 (Update)         | Expected After Update    | Status | Actual                   | Notes                    |
| --------------- | :----: | :------: | ----------------------- | ----------------------- | ------------------------ | :----: | ------------------------ | ------------------------ |
| ws-7-A-change   |   A    |  Change  | `"2026-03-15"`          | `"2026-06-20"`          | `"2026-06-20"`           |  PASS  | `"2026-06-20T00:00:00Z"` | New date replaces old ✓  |
| ws-7-C-change   |   C    |  Change  | `"2026-03-15T14:30:00"` | `"2026-06-20T09:00:00"` | `"2026-06-20T09:00:00"`  |  PASS  | `"2026-06-20T09:00:00Z"` | DateTime change ✓        |
| ws-7-D-change   |   D    |  Change  | `"2026-03-15T14:30:00"` | `"2026-06-20T09:00:00"` | `"2026-06-20T09:00:00"`  |  PASS  | `"2026-06-20T09:00:00Z"` | DateTime+ignoreTZ ✓      |
| ws-7-H-change   |   H    |  Change  | `"2026-03-15T14:30:00"` | `"2026-06-20T09:00:00"` | `"2026-06-20T09:00:00"`  |  PASS  | `"2026-06-20T09:00:00Z"` | Legacy ✓                 |
| ws-7-A-preserve |   A    | Preserve | `"2026-03-15"`          | (field omitted)         | `"2026-03-15"` preserved |  PASS  | `"2026-03-15T00:00:00Z"` | Field preserved ✓; H-9 ✓ |
| ws-7-C-preserve |   C    | Preserve | `"2026-03-15T14:30:00"` | (field omitted)         | `"2026-03-15T14:30:00"`  |  PASS  | `"2026-03-15T14:30:00Z"` | Preserved ✓              |
| ws-7-D-preserve |   D    | Preserve | `"2026-03-15T14:30:00"` | (field omitted)         | `"2026-03-15T14:30:00"`  |  PASS  | `"2026-03-15T14:30:00Z"` | Preserved ✓              |
| ws-7-H-preserve |   H    | Preserve | `"2026-03-15T14:30:00"` | (field omitted)         | `"2026-03-15T14:30:00"`  |  PASS  | `"2026-03-15T14:30:00Z"` | Preserved ✓              |
| ws-7-A-add      |   A    |   Add    | (no date)               | `"2026-03-15"`          | `"2026-03-15"`           |  PASS  | `"2026-03-15T00:00:00Z"` | Add to empty field ✓     |
| ws-7-C-add      |   C    |   Add    | (no date)               | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00"`  |  PASS  | `"2026-03-15T14:30:00Z"` | Add ✓                    |
| ws-7-D-add      |   D    |   Add    | (no date)               | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00"`  |  PASS  | `"2026-03-15T14:30:00Z"` | Add ✓                    |
| ws-7-H-add      |   H    |   Add    | (no date)               | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00"`  |  PASS  | `"2026-03-15T14:30:00Z"` | Add ✓                    |

> **WS-7 Finding**: All 12 tests PASS. `postFormRevision()` behaves correctly for all three scenarios: **Change** replaces the old value, **Preserve** keeps existing values when the field is omitted from the update, **Add** sets a date on a previously empty field. H-9 confirmed (unmentioned fields preserved). All 4 configs (A, C, D, H) behave identically — field config flags have no effect on the update path.

---

## WS-8. Query Date Filtering

Test OData-style `q` parameter filters on date fields via `getForms()`. Requires records created by WS-1.

**Prerequisite**: At least one WS-1 record with known stored values.

| ID             | Config | Query Type      | Query                                                   | Expected | Status | Matched | Notes                                     |
| -------------- | :----: | --------------- | ------------------------------------------------------- | -------- | :----: | :-----: | ----------------------------------------- |
| ws-8-A-eq      |   A    | Exact match     | `[Field7] eq '2026-03-15'`                              | Match    |  PASS  |   Yes   | ISO date-only matches stored T00:00:00Z   |
| ws-8-A-gt      |   A    | Greater than    | `[Field7] gt '2026-03-14'`                              | Match    |  PASS  |   Yes   | Date comparison works ✓                   |
| ws-8-A-range   |   A    | Range           | `[Field7] ge '2026-03-15' AND [Field7] le '2026-03-16'` | Match    |  PASS  |   Yes   | Inclusive range works ✓                   |
| ws-8-A-fmtUS   |   A    | Format mismatch | `[Field7] eq '03/15/2026'`                              | TBD      |  PASS  |   Yes   | US format in query works! H-10 ✓          |
| ws-8-A-noMatch |   A    | No match        | `[Field7] eq '2026-03-16'`                              | No match |  PASS  |   No    | Control — correct no-match ✓              |
| ws-8-C-eq      |   C    | Exact match     | `[Field6] eq '2026-03-15T14:30:00'`                     | Match    |  PASS  |   Yes   | DateTime equality works ✓                 |
| ws-8-C-gt      |   C    | Greater than    | `[Field6] gt '2026-03-15T14:00:00'`                     | Match    |  PASS  |   Yes   | DateTime comparison works ✓               |
| ws-8-C-range   |   C    | Range           | `[Field6] ge '2026-03-15' AND [Field6] le '2026-03-16'` | Match    |  PASS  |   Yes   | Date-only range on DateTime field works ✓ |
| ws-8-C-fmtZ    |   C    | Format mismatch | `[Field6] eq '2026-03-15T14:30:00Z'`                    | TBD      |  PASS  |   Yes   | Z suffix in query matches stored Z ✓      |
| ws-8-C-noMatch |   C    | No match        | `[Field6] eq '2026-03-15T15:00:00'`                     | No match |  PASS  |   No    | Control — correct no-match ✓              |

> **WS-8 Finding**: All 10 tests PASS. The OData query engine normalizes date formats — ISO date-only, US format (MM/DD/YYYY), and ISO datetime with Z all match correctly. Date-only range queries work on DateTime fields. H-10 confirmed: OData filters match stored format reliably. The query engine is more format-tolerant than expected.

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

| ID                  | Config | Server TZ | Pattern                       | Serialized (.toJSON / string) | Status | Stored                   | TZ-safe? | Notes                                                            |
| ------------------- | :----: | :-------: | ----------------------------- | ----------------------------- | :----: | ------------------------ | :------: | ---------------------------------------------------------------- |
| ws-9-A-iso-BRT      |   A    |    BRT    | `new Date("2026-03-15")`      | `"2026-03-15T00:00:00.000Z"`  |  PASS  | `"2026-03-15T00:00:00Z"` |   Yes    | ISO parse → UTC midnight; H-11 ✓                                 |
| ws-9-A-iso-IST      |   A    |    IST    | `new Date("2026-03-15")`      | `"2026-03-15T00:00:00.000Z"`  |  PASS  | `"2026-03-15T00:00:00Z"` |   Yes    | Same result regardless of TZ                                     |
| ws-9-A-iso-UTC      |   A    |    UTC    | `new Date("2026-03-15")`      | `"2026-03-15T00:00:00.000Z"`  |  PASS  | `"2026-03-15T00:00:00Z"` |   Yes    | Cloud baseline                                                   |
| ws-9-C-iso-BRT      |   C    |    BRT    | `new Date("2026-03-15")`      | `"2026-03-15T00:00:00.000Z"`  |  PASS  | `"2026-03-15T00:00:00Z"` |   Yes    | DateTime field receives ISO+Z                                    |
| ws-9-A-us-BRT       |   A    |    BRT    | `new Date("03/15/2026")`      | `"2026-03-15T03:00:00.000Z"`  |  FAIL  | `"2026-03-15T03:00:00Z"` |    No    | BRT midnight = 3am UTC; time leaks into date-only                |
| ws-9-A-us-IST       |   A    |    IST    | `new Date("03/15/2026")`      | `"2026-03-14T18:30:00.000Z"`  |  FAIL  | `"2026-03-14T18:30:00Z"` |    No    | IST midnight = prev UTC day! H-12 ✓                              |
| ws-9-A-us-UTC       |   A    |    UTC    | `new Date("03/15/2026")`      | `"2026-03-15T00:00:00.000Z"`  |  PASS  | `"2026-03-15T00:00:00Z"` |   Yes    | UTC: local=UTC, no shift                                         |
| ws-9-A-parts-BRT    |   A    |    BRT    | `new Date(2026, 2, 15)`       | `"2026-03-15T03:00:00.000Z"`  |  FAIL  | `"2026-03-15T03:00:00Z"` |    No    | Same as US: local midnight = 3am UTC                             |
| ws-9-A-parts-IST    |   A    |    IST    | `new Date(2026, 2, 15)`       | `"2026-03-14T18:30:00.000Z"`  |  FAIL  | `"2026-03-14T18:30:00Z"` |    No    | Same as US: IST midnight = prev UTC day                          |
| ws-9-A-parts-UTC    |   A    |    UTC    | `new Date(2026, 2, 15)`       | `"2026-03-15T00:00:00.000Z"`  |  PASS  | `"2026-03-15T00:00:00Z"` |   Yes    | UTC control                                                      |
| ws-9-A-utc-BRT      |   A    |    BRT    | `new Date(Date.UTC(...))`     | `"2026-03-15T00:00:00.000Z"`  |  PASS  | `"2026-03-15T00:00:00Z"` |   Yes    | Explicit UTC — TZ-safe ✓                                         |
| ws-9-A-utc-IST      |   A    |    IST    | `new Date(Date.UTC(...))`     | `"2026-03-15T00:00:00.000Z"`  |  PASS  | `"2026-03-15T00:00:00Z"` |   Yes    | Explicit UTC — TZ-safe ✓                                         |
| ws-9-A-arith-BRT    |   A    |    BRT    | `setDate(getDate()+30)`       | `"2026-04-14T00:00:00.000Z"`  |  PASS  | `"2026-04-14T00:00:00Z"` |   Yes    | Local arith on UTC base → coincidentally correct                 |
| ws-9-A-arith-IST    |   A    |    IST    | `setDate(getDate()+30)`       | `"2026-04-14T00:00:00.000Z"`  |  PASS  | `"2026-04-14T00:00:00Z"` |   Yes    | IST getDate()=15 → same result (lucky: base is UTC midnight)     |
| ws-9-A-arith-UTC    |   A    |    UTC    | `setDate(getDate()+30)`       | `"2026-04-14T00:00:00.000Z"`  |  PASS  | `"2026-04-14T00:00:00Z"` |   Yes    | UTC control                                                      |
| ws-9-A-arithUTC-BRT |   A    |    BRT    | `setUTCDate(getUTCDate()+30)` | `"2026-04-14T00:00:00.000Z"`  |  PASS  | `"2026-04-14T00:00:00Z"` |   Yes    | UTC arithmetic — always TZ-safe                                  |
| ws-9-A-arithUTC-IST |   A    |    IST    | `setUTCDate(getUTCDate()+30)` | `"2026-04-14T00:00:00.000Z"`  |  PASS  | `"2026-04-14T00:00:00Z"` |   Yes    | UTC arithmetic — always TZ-safe                                  |
| ws-9-A-safe-BRT     |   A    |    BRT    | `toISOString().split('T')[0]` | `"2026-04-14"`                |  PASS  | `"2026-04-14T00:00:00Z"` |   Yes    | Safe string extract — TZ-independent ✓                           |
| ws-9-A-safe-IST     |   A    |    IST    | `toISOString().split('T')[0]` | `"2026-04-14"`                |  PASS  | `"2026-04-14T00:00:00Z"` |   Yes    | Same as BRT ✓                                                    |
| ws-9-A-locale-BRT   |   A    |    BRT    | `toLocaleDateString('en-US')` | `"3/14/2026"`                 |  FAIL  | `"2026-03-14T00:00:00Z"` |    No    | **BRT gets Mar 14 (wrong day!)** — UTC midnight = prev local day |
| ws-9-A-locale-IST   |   A    |    IST    | `toLocaleDateString('en-US')` | `"3/15/2026"`                 |  PASS  | `"2026-03-15T00:00:00Z"` |   Yes    | IST: UTC midnight = same local day (lucky)                       |
| ws-9-A-locale-UTC   |   A    |    UTC    | `toLocaleDateString('en-US')` | `"3/15/2026"`                 |  PASS  | `"2026-03-15T00:00:00Z"` |   Yes    | UTC control                                                      |

> **WS-9 Finding**: 17 PASS, 6 FAIL across 3 TZs and 8 patterns. **TZ-safe patterns**: `new Date("ISO")`, `Date.UTC()`, `toISOString().split('T')[0]`, `setUTCDate/getUTCDate`. **TZ-unsafe patterns**: `new Date("MM/DD")`, `new Date(y,m,d)`, `toLocaleDateString()` — all produce local midnight which shifts UTC day/time per TZ. **H-11 confirmed**: Date objects serialized with Z suffix are handled correctly by the server. **H-12 confirmed**: US-format `new Date()` produces different API results per server TZ — IST stores the previous day. **New finding**: `toLocaleDateString()` in UTC- timezones (BRT) returns the previous calendar day for UTC-midnight dates, causing wrong date storage.

---

## WS-10. postForms vs forminstance/ Endpoint Comparison (Freshdesk #124697)

**Freshdesk #124697** (Jira WADNR-10407): Customer reports that records created via `postForms` API (`/formtemplates/<id>/forms`) have their time value silently mutated on first form open. Switching to the `forminstance/` endpoint (FormsAPI) avoids the mutation. After saving the corrupted value, subsequent open+save cycles are stable.

**Root cause hypothesis**: `postForms` stores datetime values with trailing Z (CB-8). `forminstance/` may store without Z, preventing Forms V1 from applying UTC→local conversion on load.

**Three sub-actions**:

- **WS-10A**: Verify postForms cross-layer mutation + forminstance/ comparison (forminstance/ initially BLOCKED on vvdemo; resolved post-run via browser verification)
- **WS-10B**: Side-by-side endpoint comparison — initially BLOCKED (forminstance/ returned 500 on vvdemo); resolved post-run
- **WS-10C**: Save-and-stabilize — confirm first save commits mutation, subsequent saves are stable

**Harness action**: `WS-10` (creates records via both endpoints, returns DataIDs for browser verification)
**Browser script**: `verify-ws10-browser.js` (compare mode + save-stabilize mode)

**FormsAPI payload discovery**: Browser intercept of `VV.Form.CreateFormInstance` revealed the correct payload: `{ formTemplateId: "<revisionId>", formName: "", fields: [{ key: "FieldN", value: "..." }] }` — uses `key`/`value` (not `name`/`value`) and lowercase `fields` (not `Fields`).

**Critical finding (CB-29)**: Both endpoints store **identical** values in the database (`"2026-03-15T14:30:00Z"` — confirmed via WS-2 API read). Yet Forms V1 treats them differently: `postForms` records have rawValue shifted by TZ offset on form open, while `forminstance/` records preserve the original time. The difference is NOT in the stored date value but in **how the record/revision was created** — the FormsAPI writes different metadata (revision history, field format markers, or field-level storage encoding) that causes `initCalendarValueV1` to take a different code path.

### WS-10A: postForms → Browser Verify (+ forminstance/ comparison)

Records: DateTest-001583 (postForms), DateTest-001584 (forminstance/). Input: `"2026-03-15T14:30:00"`.
API read-back via WS-2: both return `"2026-03-15T14:30:00Z"` for all configs (storedMatch=true).

| ID           | Config | Browser TZ | Endpoint     | API Stored               | Actual Display            | rawValue                    | GFV                              | Status | Bugs    | Notes                                         |
| ------------ | :----: | :--------: | ------------ | ------------------------ | ------------------------- | --------------------------- | -------------------------------- | :----: | ------- | --------------------------------------------- |
| ws-10a-A-BRT |   A    |    BRT     | postForms    | `"2026-03-15T14:30:00Z"` | `03/15/2026`              | `"2026-03-15"`              | `"2026-03-15"`                   |  PASS  |         | Date-only strips time ✓                       |
| ws-10a-A-BRT |   A    |    BRT     | forminstance | `"2026-03-15T14:30:00Z"` | `03/15/2026`              | `"03/15/2026 14:30:00"`     | `"03/15/2026 14:30:00"`          |  PASS  |         | Date-only — raw keeps US format from FormsAPI |
| ws-10a-C-BRT |   C    |    BRT     | postForms    | `"2026-03-15T14:30:00Z"` | `03/15/2026 11:30 AM`     | `"2026-03-15T11:30:00"`     | `"2026-03-15T14:30:00.000Z"`     |  FAIL  | CB-8    | UTC→BRT shift -3h                             |
| ws-10a-C-BRT |   C    |    BRT     | forminstance | `"2026-03-15T14:30:00Z"` | **`03/15/2026 02:30 PM`** | **`"2026-03-15T14:30:00"`** | `"2026-03-15T17:30:00.000Z"`     |  PASS  |         | **No shift!** rawValue=T14:30 (original) ✓    |
| ws-10a-D-BRT |   D    |    BRT     | postForms    | `"2026-03-15T14:30:00Z"` | `03/15/2026 02:30 PM`     | `"2026-03-15T11:30:00"`     | `"2026-03-15T11:30:00.000Z"`     |  FAIL  | CB-8,#5 | Display OK (ignoreTZ), rawValue shifted       |
| ws-10a-D-BRT |   D    |    BRT     | forminstance | `"2026-03-15T14:30:00Z"` | **`03/15/2026 02:30 PM`** | **`"2026-03-15T14:30:00"`** | **`"2026-03-15T14:30:00.000Z"`** |  PASS  |         | **No shift! No Bug #5!** rawValue=T14:30 ✓    |
| ws-10a-H-BRT |   H    |    BRT     | postForms    | `"2026-03-15T14:30:00Z"` | `03/15/2026 02:30 PM`     | `"2026-03-15T11:30:00"`     | `"2026-03-15T11:30:00"`          |  FAIL  | CB-8    | Like D minus fake Z (legacy)                  |
| ws-10a-H-BRT |   H    |    BRT     | forminstance | `"2026-03-15T14:30:00Z"` | **`03/15/2026 02:30 PM`** | **`"2026-03-15T14:30:00"`** | `"2026-03-15T14:30:00"`          |  PASS  |         | **No shift!** (legacy) ✓                      |
| ws-10a-A-IST |   A    |    IST     | postForms    | `"2026-03-15T14:30:00Z"` | `03/15/2026`              | `"2026-03-15"`              | `"2026-03-15"`                   |  PASS  |         | Date-only correct ✓                           |
| ws-10a-C-IST |   C    |    IST     | postForms    | `"2026-03-15T14:30:00Z"` | `03/15/2026 08:00 PM`     | `"2026-03-15T20:00:00"`     | `"2026-03-15T14:30:00.000Z"`     |  FAIL  | CB-8    | UTC→IST shift +5:30h                          |
| ws-10a-C-IST |   C    |    IST     | forminstance | `"2026-03-15T14:30:00Z"` | **`03/15/2026 02:30 PM`** | **`"2026-03-15T14:30:00"`** | `"2026-03-15T09:00:00.000Z"`     |  PASS  |         | **No shift!** rawValue=T14:30 ✓               |
| ws-10a-D-IST |   D    |    IST     | postForms    | `"2026-03-15T14:30:00Z"` | `03/15/2026 02:30 PM`     | `"2026-03-15T20:00:00"`     | `"2026-03-15T20:00:00.000Z"`     |  FAIL  | CB-8,#5 | Display OK, rawValue shifted +5:30h           |
| ws-10a-D-IST |   D    |    IST     | forminstance | `"2026-03-15T14:30:00Z"` | **`03/15/2026 02:30 PM`** | **`"2026-03-15T14:30:00"`** | **`"2026-03-15T14:30:00.000Z"`** |  PASS  |         | **No shift! No Bug #5!** ✓                    |
| ws-10a-H-IST |   H    |    IST     | postForms    | `"2026-03-15T14:30:00Z"` | `03/15/2026 02:30 PM`     | `"2026-03-15T20:00:00"`     | `"2026-03-15T20:00:00"`          |  FAIL  | CB-8    | Like D minus fake Z                           |
| ws-10a-H-IST |   H    |    IST     | forminstance | `"2026-03-15T14:30:00Z"` | **`03/15/2026 02:30 PM`** | **`"2026-03-15T14:30:00"`** | `"2026-03-15T14:30:00"`          |  PASS  |         | **No shift!** ✓                               |

> **WS-10A Finding**: **postForms: 2 PASS, 6 FAIL. forminstance/: 8 PASS, 0 FAIL.** The `forminstance/` endpoint completely avoids CB-8 and Bug #5. Root cause (CB-29): FormsAPI stores values in US format (`"03/15/2026 14:30:00"`) without Z suffix; core API stores in ISO+Z (`"2026-03-15T14:30:00Z"`). Forms V1 `initCalendarValueV1` parses US format as local time (no conversion), but ISO+Z as UTC (triggers local conversion = shift).

### WS-10B: Side-by-Side Endpoint Comparison

Records: DateTest-001583 (postForms) vs DateTest-001584 (forminstance/). Same input, same API read-back.

| ID           | Config | Browser TZ | postForms rawValue      | forminstance/ rawValue  | postForms GFV                | forminstance/ GFV            | Display Match | Status | Notes                                                      |
| ------------ | :----: | :--------: | ----------------------- | ----------------------- | ---------------------------- | ---------------------------- | :-----------: | :----: | ---------------------------------------------------------- |
| ws-10b-C-BRT |   C    |    BRT     | `"2026-03-15T11:30:00"` | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00.000Z"` | `"2026-03-15T17:30:00.000Z"` |      No       |  FAIL  | rawValue: shifted vs original. GFV: both have Z but differ |
| ws-10b-D-BRT |   D    |    BRT     | `"2026-03-15T11:30:00"` | `"2026-03-15T14:30:00"` | `"2026-03-15T11:30:00.000Z"` | `"2026-03-15T14:30:00.000Z"` |      Yes      |  FAIL  | rawValue differs (shifted vs original), GFV differs        |

> **WS-10B Finding (ROOT CAUSE — CB-29)**: API stores identical values (`storedMatch=true` via core API read), but the `FormInstance/Controls` endpoint reveals **different storage formats**: postForms → `"2026-03-15T14:30:00Z"` (ISO+Z), forminstance/ → `"03/15/2026 14:30:00"` (US format, no TZ). Forms V1 interprets ISO+Z as UTC (→ local conversion = CB-8 shift) but US format as local time (→ no conversion = preserved). **This is why the ticket's workaround works** — different storage format bypasses the V1 UTC interpretation.

### WS-10C: Save-and-Stabilize (First-Open Mutation)

Record: DateTest-001568 → saved as ffc087e3-4a34-4ab9-9d2d-fdcd61cf2cdf

| ID           | Config | Browser TZ | Snap 1 Display | Snap 1 rawValue         | Snap 2 Display | Snap 2 rawValue         | Snap 3 = Snap 2? | Status | Notes                                                                                                                                                                      |
| ------------ | :----: | :--------: | -------------- | ----------------------- | -------------- | ----------------------- | :--------------: | :----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ws-10c-C-BRT |   C    |    BRT     | `11:30 AM`     | `"2026-03-15T11:30:00"` | `11:30 AM`     | `"2026-03-15T11:30:00"` |       Yes        |  FAIL  | CB-8 shift on load, save commits shifted value, stable after                                                                                                               |
| ws-10c-D-BRT |   D    |    BRT     | **`02:30 PM`** | `"2026-03-15T11:30:00"` | **`11:30 AM`** | `"2026-03-15T11:30:00"` |       Yes        |  FAIL  | **#124697**: Display shows original time on first open (ignoreTZ), save commits shifted value, display changes to shifted time on reopen. Exactly matches customer report. |

> **WS-10C Finding**: 0 PASS, 2 FAIL. **Config D is the exact Freshdesk #124697 scenario**: display shows `02:30 PM` on first open (ignoreTZ preserves original DB time), rawValue already shifted to `T11:30:00` in memory. After save+reopen, display changes to `11:30 AM` (shifted value now in DB). Stable after first mutation — no further drift. Config C shifts both display and rawValue identically (no surprise — ignoreTZ=false).
