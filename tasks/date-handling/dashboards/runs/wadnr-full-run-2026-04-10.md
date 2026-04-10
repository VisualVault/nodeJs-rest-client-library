# WADNR Dashboard Full Test Run — 2026-04-10

**Environment**: vv5dev / WADNR / fpOnline
**Dashboard**: `FormDataDetails?Mode=ReadOnly&ReportID=09c84a6b-de34-f111-8333-99973bb0d2ea`
**Dashboard Name**: zzzDate Test Harness (created 2026-04-10)
**Grid Component**: Telerik RadGrid (server-rendered, ASP.NET)
**Execution**: Playwright headless Chrome, BRT timezone
**Date**: 2026-04-10
**Records in grid**: 136 (10 pages × 15, last page 1)

---

## Results Summary

| Category                     | Slots  |  PASS  | FAIL  | BLOCKED | Notes                                       |
| ---------------------------- | :----: | :----: | :---: | :-----: | ------------------------------------------- |
| **DB-1** Display Format      |   8    |   8    |       |         | All formats match expectations              |
| **DB-2** Date Accuracy       |   8    |   8    |       |         | Dashboard = stored DB values                |
| **DB-3** Wrong Date          |   8    |   3    |       |    5    | A/B/C confirmed; D-H no IST browser data    |
| **DB-4** Column Sort         |   4    |   4    |       |         | Empties sort to front (asc), data correct   |
| **DB-5** Search/SQL Filter   |   4    |        |       |    4    | Filter toolbar not enabled on new dashboard |
| **DB-6** Cross-Layer         |   8    |        |   8   |         | Same FAIL pattern as EmanuelJofre           |
| **DB-7** Export Verification |   3    |   3    |       |         | Excel/Word/XML all export correctly         |
| **DB-8** TZ Independence     |   1    |   1    |       |         | 0 mismatches across BRT/IST/UTC             |
| **TOTAL**                    | **44** | **27** | **8** |  **9**  | Matches EmanuelJofre platform behavior      |

---

## DB-8: TZ Independence

**Method**: Loaded dashboard in 3 browser contexts (BRT, IST, UTC0). Compared 15 records × 8 base fields.

| TZ Pair    | Mismatches | Status |
| ---------- | :--------: | :----: |
| BRT ≡ IST  |     0      |  PASS  |
| BRT ≡ UTC0 |     0      |  PASS  |

**Conclusion**: Server-rendered dashboard is TZ-independent on WADNR. Identical to EmanuelJofre result.

---

## DB-1: Display Format Verification

| Config | Field   | Record             | Actual Value         | Expected Format       | Status |
| :----: | ------- | ------------------ | -------------------- | --------------------- | :----: |
|   A    | Field7  | zzzDATETEST-000504 | `3/14/2026`          | `M/D/YYYY`            |  PASS  |
|   B    | Field10 | zzzDATETEST-000505 | `3/14/2026`          | `M/D/YYYY`            |  PASS  |
|   C    | Field6  | zzzDATETEST-000499 | `3/15/2026 12:00 AM` | `M/D/YYYY H:MM AM/PM` |  PASS  |
|   D    | Field5  | zzzDATETEST-000504 | `3/15/2026 12:00 AM` | `M/D/YYYY H:MM AM/PM` |  PASS  |
|   E    | Field12 | zzzDATETEST-000502 | `3/15/2026`          | `M/D/YYYY`            |  PASS  |
|   F    | Field11 | zzzDATETEST-000502 | `3/15/2026`          | `M/D/YYYY`            |  PASS  |
|   G    | Field14 | zzzDATETEST-000501 | `3/15/2026 12:00 AM` | `M/D/YYYY H:MM AM/PM` |  PASS  |
|   H    | Field13 | zzzDATETEST-000503 | `3/15/2026 12:00 AM` | `M/D/YYYY H:MM AM/PM` |  PASS  |

---

## DB-2: Date Accuracy

All records created via WS-1 API (`postForms`) with known input values.

| Config | Field   | Record             | DB Stored (from WS)    | Dashboard Shows     | Match? | Status |
| :----: | ------- | ------------------ | ---------------------- | ------------------- | :----: | :----: |
|   A    | Field7  | zzzDATETEST-000392 | `2026-03-15T00:00:00Z` | `3/15/2026`         |   ✓    |  PASS  |
|   B    | Field10 | zzzDATETEST-000392 | `2026-03-15T00:00:00Z` | `3/15/2026`         |   ✓    |  PASS  |
|   C    | Field6  | zzzDATETEST-000475 | `2026-03-15T14:30:00Z` | `3/15/2026 2:30 PM` |   ✓    |  PASS  |
|   D    | Field5  | zzzDATETEST-000475 | `2026-03-15T14:30:00Z` | `3/15/2026 2:30 PM` |   ✓    |  PASS  |
|   E    | Field12 | zzzDATETEST-000502 | `2026-03-15T00:00:00Z` | `3/15/2026`         |   ✓    |  PASS  |
|   F    | Field11 | zzzDATETEST-000502 | `2026-03-15T00:00:00Z` | `3/15/2026`         |   ✓    |  PASS  |
|   G    | Field14 | zzzDATETEST-000393 | `2026-03-15T14:30:00Z` | `3/15/2026 2:30 PM` |   ✓    |  PASS  |
|   H    | Field13 | zzzDATETEST-000393 | `2026-03-15T14:30:00Z` | `3/15/2026 2:30 PM` |   ✓    |  PASS  |

---

## DB-3: Wrong Date Detection

| Config | Field   | Bug | Record             | Intended    | Dashboard Shows     | Shifted? | Status  |
| :----: | ------- | --- | ------------------ | ----------- | ------------------- | :------: | :-----: |
|   A    | Field7  | #7  | zzzDATETEST-000504 | `3/15/2026` | `3/14/2026`         |   Yes    |  PASS   |
|   B    | Field10 | #7  | zzzDATETEST-000505 | `3/15/2026` | `3/14/2026`         |   Yes    |  PASS   |
|   C    | Field6  | #7v | (2 records)        | `3/15/2026` | `3/14/2026 6:30 PM` |   Yes    |  PASS   |
|   D    | Field5  | —   | —                  | —           | —                   |    —     | BLOCKED |
|   E    | Field12 | —   | —                  | —           | —                   |    —     | BLOCKED |
|   F    | Field11 | —   | —                  | —           | —                   |    —     | BLOCKED |
|   G    | Field14 | —   | —                  | —           | —                   |    —     | BLOCKED |
|   H    | Field13 | —   | —                  | —           | —                   |    —     | BLOCKED |

**Note**: DB-3 D-H BLOCKED because no IST-browser-created records exist for these configs on WADNR. The WS test run created records via API (no FORM-BUG-7), and Playwright IST tests only targeted configs A and D (datetime). To unblock: create records via browser in IST for configs D-H.

- 9 records total show `3/14/2026` in Field7 (Config A shifted)
- 3 records show `3/14/2026` in Field10 (Config B shifted)
- 2 records show `3/14/2026 6:30 PM` in Field6 (Config C shifted — IST+5:30 offset on midnight = previous day 6:30 PM)

---

## DB-4: Column Sort

| Variant      | Column | Direction  | Empties Position |   Non-Empty Order   | Cross-Page | Status |
| ------------ | ------ | ---------- | :--------------: | :-----------------: | :--------: | :----: |
| db-4-f7-asc  | Field7 | Ascending  |      Front       |    Chronological    |     OK     |  PASS  |
| db-4-f7-desc | Field7 | Descending |       End        | 6/20→5/3→4/14→3/15  |     OK     |  PASS  |
| db-4-f6-asc  | Field6 | Ascending  |      Front       |    Chronological    |     OK     |  PASS  |
| db-4-f6-desc | Field6 | Descending |       End        | 6/20→4/14→3/15→3/14 |     OK     |  PASS  |

---

## DB-5: Search / SQL Filter — BLOCKED

The newly created WADNR dashboard does not have the filter toolbar enabled. The RadGrid filter row and search toggle are absent. No `rgFilterRow` inputs, no `ctrlFilter`, no `FilterButtonAddRemove` elements found.

**To unblock**: Edit the dashboard in VV Admin and enable the filtering/search toolbar feature.

---

## DB-6: Cross-Layer Comparison

Records opened via `FormDetails?DataID={guid}&hidemenu=true` popup URLs extracted from dashboard Edit links.

| Config | Field   | Dashboard Value     | Form Display          | Form Raw              | Form API                   | Status |
| :----: | ------- | ------------------- | --------------------- | --------------------- | -------------------------- | :----: |
|   A    | Field7  | `3/15/2026`         | (not found)\*         | `2026-03-15`          | `2026-03-15`               | FAIL-1 |
|   B    | Field10 | `3/15/2026`         | (not found)\*         | `2026-03-15`          | `2026-03-15`               | FAIL-1 |
|   C    | Field6  | `3/15/2026 2:30 PM` | (not found)\*         | `2026-03-15T11:30:00` | `2026-03-15T14:30:00.000Z` | FAIL-2 |
|   D    | Field5  | `3/15/2026 2:30 PM` | (not found)\*         | `2026-03-15T11:30:00` | `2026-03-15T11:30:00.000Z` | FAIL-1 |
|   E    | Field12 | `3/15/2026`         | `03/15/2026`          | `2026-03-15`          | `2026-03-15`               | FAIL-1 |
|   F    | Field11 | `3/15/2026`         | `03/15/2026`          | `2026-03-15`          | `2026-03-15`               | FAIL-1 |
|   G    | Field14 | `3/15/2026 2:30 PM` | `03/15/2026 11:30 AM` | `2026-03-15T11:30:00` | `2026-03-15T11:30:00`      | FAIL-2 |
|   H    | Field13 | `3/15/2026 2:30 PM` | `03/15/2026 02:30 PM` | `2026-03-15T11:30:00` | `2026-03-15T11:30:00`      | FAIL-1 |

\*Non-legacy configs (A-D): `[aria-label="FieldN"]` selector returns undefined for the Kendo date input. Legacy configs (E-H) use standard input elements and return the display value correctly.

### FAIL Interpretations

- **FAIL-1 (format mismatch)**: Dashboard uses `M/D/YYYY`, form uses `MM/DD/YYYY` (leading zeros). Cosmetic only — same date value.
- **FAIL-2 (time shift)**: Dashboard shows stored UTC value (`2:30 PM` = `14:30:00Z`), form displays BRT-adjusted value (`11:30 AM` = `14:30 - 3h`). Config C and G (`ignoreTZ=false`) apply timezone conversion on the form side; the dashboard shows the raw stored value.

**Conclusion**: Identical failure pattern to EmanuelJofre. Confirms DB-BUG-1 (format inconsistency) and WS-BUG-1 (cross-layer shift) are platform-level.

---

## DB-7: Export Verification

| Variant    | Format        | File Size |          Dates Match Grid?          | Format                      | Status |
| ---------- | ------------- | --------: | :---------------------------------: | --------------------------- | :----: |
| db-7-excel | `.xls` (HTML) |  83,012 B | Yes (adds 12:00:00 AM to date-only) | M/D/YYYY H:MM:SS AM/PM      |  PASS  |
| db-7-word  | `.doc` (HTML) |  82,955 B |         Yes (same as Excel)         | M/D/YYYY H:MM:SS AM/PM      |  PASS  |
| db-7-xml   | `.xml`        |  68,059 B |           Yes (ISO 8601)            | `2026-03-15T00:00:00+00:00` |  PASS  |

Export samples:

- Excel/Word: `3/14/2026 12:00:00 AM`, `3/15/2026 2:30:00 PM` — adds seconds to time component
- XML: `<Field7>2026-03-14T00:00:00+00:00</Field7>` — ISO 8601 with +00:00 offset

---

## Cross-Environment Comparison

| Category | EmanuelJofre (2026-04-02) | WADNR (2026-04-10) | Platform Consistent?  |
| -------- | :-----------------------: | :----------------: | :-------------------: |
| DB-1     |          8 PASS           |       8 PASS       |           ✓           |
| DB-2     |          8 PASS           |       8 PASS       |           ✓           |
| DB-3     |          8 PASS           | 3 PASS / 5 BLOCKED |   ✓ (where tested)    |
| DB-4     |          4 PASS           |       4 PASS       |           ✓           |
| DB-5     |          4 PASS           |     4 BLOCKED      | — (dashboard config)  |
| DB-6     |          8 FAIL           |       8 FAIL       | ✓ (same FAIL pattern) |
| DB-7     |          3 PASS           |       3 PASS       |           ✓           |
| DB-8     |          1 PASS           |       1 PASS       |           ✓           |

**Conclusion**: All tested categories produce identical results across vvdemo and vv5dev environments. Dashboard date handling behavior is confirmed platform-level, not environment-specific.

---

## Blocked Items

| Item               | Reason                                                              | To Unblock                                                 |
| ------------------ | ------------------------------------------------------------------- | ---------------------------------------------------------- |
| DB-3 D-H           | No IST-browser-created records for legacy/ignoreTZ configs on WADNR | Create records via browser in IST timezone for configs D-H |
| DB-5 (all 4 tests) | Filter toolbar not enabled on newly created dashboard               | Edit dashboard settings to enable filter/search toolbar    |
