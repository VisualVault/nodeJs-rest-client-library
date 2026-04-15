# TC-13-preset-vs-user-input — DB Storage: preset stores UTC, user-input stores local; mixed timezone in same record

## Environment Specs

| Parameter          | Required Value                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| **Browser**        | N/A — REST API verification                                                                                                |
| **Platform**       | VisualVault REST API (`getForms` endpoint)                                                                                 |
| **VV Code Path**   | N/A — API read-only; original save was via Forms V1 from BRT and IST browsers                                              |
| **Target Records** | DateTest-000080 (BRT-saved) and DateTest-000084 (IST-saved)                                                                |
| **Scope**          | Preset field (Field2, `enableInitialValue=true`) vs User-input field (Field7, no initial value), both Config A (date-only) |

---

## Preconditions

**P1 — Ensure VV REST API access** via `run-ws-test.js` with valid `.env.json` credentials.

**P2 — Read test records** via `run-ws-test.js --action WS-2 --record-id DateTest-000080 --configs A --debug` (includes rawRecord with all fields). Same for DateTest-000084.

**P3 — Note field mapping**: Field2 = preset Config A (`enableInitialValue=true`, preset date March 1, 2026). Field7 = user-input Config A (`enableInitialValue=false`).

---

## Test Steps

| #   | Action                                | Test Data               | Expected Result                                                         | ✓   |
| --- | ------------------------------------- | ----------------------- | ----------------------------------------------------------------------- | --- |
| 1   | Complete setup                        | See Preconditions P1–P3 | Both records readable via API                                           | ☐   |
| 2   | BRT record: preset field (field2)     | 000080 rawRecord.field2 | `"2026-03-01T00:00:00Z"` — preset March 1 stored as local midnight      | ☐   |
| 3   | BRT record: user-input field (field7) | 000080 rawRecord.field7 | `"2026-03-15T00:00:00Z"` — user-input March 15 stored as local midnight | ☐   |
| 4   | Compare time components (BRT)         | —                       | Same T00:00:00Z format — both stored via local midnight path            | ☐   |
| 5   | IST record: preset field (field2)     | 000084 rawRecord.field2 | `"2026-03-01T00:00:00Z"` — same as BRT preset                           | ☐   |
| 6   | IST record: user-input field (field7) | 000084 rawRecord.field7 | `"2026-03-15T00:00:00Z"` — same as BRT user-input                       | ☐   |

---

## Fail Conditions

**FAIL-1 (Preset stores UTC offset, user-input stores midnight — mixed paths):**
BRT preset (field2) returns `"2026-03-01T03:00:00Z"` (UTC for BRT midnight) while user-input (field7) returns `"2026-03-15T00:00:00Z"` (local midnight as-is).

- Interpretation: The preset code path in `initCalendarValueV1()` creates a `new Date()` → `toISOString()` → strips Z → stores UTC. The user-input code path goes through `getSaveValue()` → `moment().format()` → stores local time without UTC conversion. Two different storage semantics for the same field config within the same record. SQL queries comparing or joining these fields will get inconsistent results.

**FAIL-2 (IST preset shifts to previous day):**
IST preset (field2) returns `"2026-02-28T18:30:00Z"` instead of a March value. IST midnight March 1 = Feb 28 18:30 UTC — the preset stores the UTC equivalent, pushing the date to the previous calendar day.

- Interpretation: The UTC storage path faithfully records the UTC moment. But for date-only fields, users expect "March 1" to be stored as March 1, not February 28. The UTC storage is technically correct but semantically wrong for date-only fields — the time component shouldn't matter when `enableTime=false`.

---

## Related

| Reference                 | Location                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| Matrix row                | `../matrix.md` — row `13-preset-vs-user-input`                                           |
| Companion: initial-values | [`tc-13-initial-values.md`](tc-13-initial-values.md) — confirmed UTC storage for presets |
| Companion: user-input     | [`tc-13-user-input.md`](tc-13-user-input.md) — confirmed local storage for user input    |
| Analysis                  | `../analysis/overview.md` — mixed timezone storage section                               |
