# API Date Patterns — Correct DateTime Handling for Web Services

How to send date and datetime values through the VV REST API so they display correctly in Forms for users in any timezone.

> Based on confirmed test results from the [WS date-handling investigation](../../tasks/date-handling/web-services/analysis/overview.md) (148 tests, WS-1 through WS-10).

---

## The Problem

When a web service creates or updates a form record with a datetime value, the time displayed in the browser depends on the user's local timezone. The VV server stores datetime values in SQL Server `datetime` columns (timezone-unaware). **The server does not uniformly store UTC** — it stores whatever value the client sends. Different FormViewer code paths send different timezone representations: `toISOString()` sends UTC, `getSaveValue()` sends local-time-without-timezone-marker. For web service imports, values without timezone context are stored as-is — and every user sees a different local time.

```
Import sends:   "2026-03-15T14:30:00"     (no timezone — server treats as UTC)
Server stores:  "2026-03-15T14:30:00Z"    (UTC)

User in New York (EST, UTC-5):  sees 9:30 AM
User in Chicago (CST, UTC-6):   sees 8:30 AM
User in Denver (MST, UTC-7):    sees 7:30 AM
User in LA (PST, UTC-8):        sees 6:30 AM
User in São Paulo (BRT, UTC-3): sees 11:30 AM
```

If the CSV time `14:30` was meant as "2:30 PM Eastern", only the New York user would see the right time — everyone else gets a shifted value. The import process and server work correctly; the question is **what timezone does the source data represent?**

---

## Decision Tree for CSV/API DateTime Imports

Before writing the import script, answer one question:

### Q: What does the time in the source data represent?

**A) The time is already in UTC** (e.g., database export, API response, system log)
→ Send with `Z` suffix. Users see their local equivalent. This is correct UTC behavior.

```javascript
{
    Field6: `${row.datetime}Z`;
}
// "2026-03-15T14:30:00Z" → stored as-is
// EST user sees 9:30 AM, CST sees 8:30 AM — each sees their local time ✓
```

**B) The time is local to a specific timezone** (e.g., "appointment at 2:30 PM Eastern")
→ Send with the source timezone's UTC offset. The server converts to UTC, and each user sees their local equivalent.

```javascript
// Source timezone: US Eastern (EST = -05:00, EDT = -04:00)
{
    Field6: `${row.date}T${row.time}-05:00`;
}
// "2026-03-15T14:30:00-05:00" → stored as "2026-03-15T19:30:00Z"
// EST user sees 2:30 PM ✓, CST sees 1:30 PM, PST sees 11:30 AM
```

**C) The time should display identically for ALL users regardless of their timezone** (e.g., "deadline is 2:30 PM — same wall clock for everyone")
→ This requires `ignoreTZ=true` fields (Config D/H). Send with `Z` — the display ignores timezone conversion.

```javascript
// Field must have ignoreTZ=true in form designer
{
    Field5: '2026-03-15T14:30:00Z';
}
// Display shows "2:30 PM" for ALL users regardless of timezone
// ⚠ rawValue in the form will shift per user TZ (CB-8) — but display is stable
```

**D) The time has no timezone context** (CSV just has `"14:30"` with no indication of what TZ)
→ You need to determine the source timezone from context. Without it, the server will treat it as UTC and users will see shifted times. There is no safe default — ask the data provider.

---

## UTC Offset Reference

If the source data has a known timezone, use these offsets. **US timezones observe DST** — the offset changes seasonally.

| Timezone           | Standard |      DST       | DST Period (approx.) |
| ------------------ | :------: | :------------: | -------------------- |
| US Eastern (ET)    | `-05:00` | `-04:00` (EDT) | Mar–Nov              |
| US Central (CT)    | `-06:00` | `-05:00` (CDT) | Mar–Nov              |
| US Mountain (MT)   | `-07:00` | `-06:00` (MDT) | Mar–Nov              |
| US Pacific (PT)    | `-08:00` | `-07:00` (PDT) | Mar–Nov              |
| Arizona (no DST)   | `-07:00` |    `-07:00`    | —                    |
| São Paulo (BRT)    | `-03:00` |    `-03:00`    | No DST               |
| Buenos Aires (ART) | `-03:00` |    `-03:00`    | No DST               |
| Colombia (COT)     | `-05:00` |    `-05:00`    | No DST               |
| India (IST)        | `+05:30` |    `+05:30`    | No DST               |

**DST complication**: If your CSV spans dates across DST transitions (early March or early November for US), some rows may need `-05:00` and others `-04:00` for the same timezone. Use a library like `luxon` or `moment-timezone` to compute the correct offset per date.

---

## Date-Only Fields (No Time Component)

Date-only fields are **not affected** by this issue. All these formats work correctly and display the same date for all users:

```javascript
{
    Field7: '2026-03-15';
} // ISO — recommended
{
    Field7: '03/15/2026';
} // US format — works
{
    Field7: 'March 15, 2026';
} // English — works
```

---

## Script-Computed Dates

When your script calculates dates (due dates, deadlines, offsets), use TZ-safe patterns:

```javascript
// SAFE: ISO string parse + string output
const baseDate = new Date('2026-03-15'); // UTC midnight (TZ-safe)
baseDate.setUTCDate(baseDate.getUTCDate() + 30); // UTC arithmetic (TZ-safe)
const dateOnly = baseDate.toISOString().split('T')[0]; // "2026-04-14"
const dateTime = baseDate.toISOString(); // "2026-04-14T00:00:00.000Z"

// SAFE: Explicit UTC construction
const utcDate = new Date(Date.UTC(2026, 2, 15, 14, 30, 0));
const value = utcDate.toISOString(); // "2026-03-15T14:30:00.000Z"

// UNSAFE — avoid these:
new Date('03/15/2026'); // Local midnight — different UTC per server TZ
new Date(2026, 2, 15); // Local midnight — same problem
d.toLocaleDateString('en-US'); // Wrong date in UTC- timezones
d.setDate(d.getDate() + 30); // Local arithmetic — may vary per TZ
```

---

## Quick Reference: What to Send

| Field Type                | Source Data     | Send This                      | Example                 | Endpoint            |
| ------------------------- | --------------- | ------------------------------ | ----------------------- | ------------------- |
| Date-only                 | Any date string | ISO date                       | `"2026-03-15"`          | Either              |
| DateTime (any `ignoreTZ`) | Time value      | ISO datetime (no Z, no offset) | `"2026-03-15T14:30:00"` | **`forminstance/`** |

**Why `forminstance/` for all DateTime fields**: The `postForms` endpoint appends Z to datetime values, which triggers a timezone shift when users open the record in Forms (WS-BUG-1). The `forminstance/` endpoint stores in US format without Z — no shift occurs. Empirically verified: `getSaveValue()` stores identical values for `ignoreTZ=true` and `ignoreTZ=false` — the flag affects display only, not DB storage. See [WS-BUG-1](../../tasks/date-handling/web-services/analysis/ws-bug-1-cross-layer-shift.md).

**Cross-TZ note**: `forminstance/` stores local time without TZ context. This is consistent with how the Forms UI itself saves records. Two users in different timezones entering "2:30 PM" both store `T14:30:00` — the VV platform does not preserve timezone context through any `forminstance/` write path.

---

## What NOT to Send

| Input                                                       | Problem                                                                                                                                              |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"2026-03-15T14:30:00"` (no offset, no Z) via **postForms** | Controls serializes with Z → V1 treats as UTC → wrong display. Use `forminstance/` instead, or add an offset (e.g., `"-03:00"`) for UTC-aware fields |
| `"15/03/2026"` (DD/MM/YYYY)                                 | Silently stored as null — complete data loss (Bug #8)                                                                                                |
| `"05/03/2026"` (ambiguous)                                  | Interpreted as May 3 (MM/DD), not March 5 — wrong date silently                                                                                      |
| `1773532800000` (epoch ms)                                  | Silently stored as null — numeric timestamps not supported                                                                                           |
| `"1773532800000"` (epoch string)                            | Silently stored as null — numeric strings not parsed as dates                                                                                        |
| `new Date("03/15/2026")` (Date object)                      | Serialized as local midnight → different UTC per server TZ                                                                                           |

---

## Query Patterns for Date-Only Fields

Date-only fields (`enableTime=false`) are stored as full datetime values in the database. The time component varies depending on the write path (Forms popup → UTC midnight, Forms preset → BRT midnight = `T03:00:00Z`, Current Date → actual timestamp, API → whatever was sent). This causes **exact-equality queries to miss records** with non-midnight time components.

```javascript
// UNRELIABLE — misses records with non-midnight time components
const params = { q: "[Field7] eq '2026-03-15'" };
// Only matches records stored as "2026-03-15T00:00:00Z"
// Misses "2026-03-15T03:00:00Z" (preset), "2026-03-15T14:30:00Z" (API datetime), etc.

// RELIABLE — catches all March 15 records regardless of time component
const params = { q: "[Field7] ge '2026-03-15' AND [Field7] lt '2026-03-16'" };
```

**Rule of thumb:** Always use range queries (`ge` + `lt`) instead of exact equality (`eq`) when filtering on date-only fields. This is necessary because the VV server does not enforce date-only semantics — it stores whatever datetime value was provided, and the "date-only" concept only exists in the Forms client-side JS.

Empirically verified: [WS-BUG-6 audit](../../tasks/date-handling/web-services/analysis/ws-bug-6-no-date-only-enforcement.md) — exact equality returned 1 of 2 March 15 records; range query returned both.

---

## How to Fix Existing Records

If records were created with times that lack timezone context (no offset, no Z), the stored values are treated as UTC. To correct them, compute the intended UTC value and update:

```javascript
// Example: stored "2026-03-15T14:30:00Z" but was actually US Eastern (EDT, -04:00)
// Correct UTC = 14:30 + 4h = 18:30 UTC
const record = await vvClient.forms.getForms(
    { q: "[instanceName] eq 'MyRecord-000123'", expand: true },
    'MyFormTemplate'
);

// Compute corrected value: original_local_time + abs(offset) = correct_UTC
// 14:30 Eastern (EDT) = 14:30 + 04:00 = 18:30 UTC
const corrected = '2026-03-15T18:30:00Z';

await vvClient.forms.postFormRevision(null, { Field6: corrected }, 'MyFormTemplate', record.data[0].revisionId);
```

For batch corrections, you need to know the original source timezone to compute the right offset. If the source timezone is unknown, there's no way to determine the correct UTC value programmatically.

---

## Endpoint Serialization Warning (CB-29)

Both `postForms` (core API) and `forminstance/` (FormsAPI) store **identical SQL `datetime` values** in the database (confirmed via DB dump and SSMS schema inspection, 2026-04-06). However, the FormsAPI's `FormInstance/Controls` endpoint **serializes its HTTP response differently** depending on which write endpoint created the record:

| Write Method                                 | DB Value (identical)      | `FormInstance/Controls` Response    | Forms V1 Interpretation                    |
| -------------------------------------------- | ------------------------- | ----------------------------------- | ------------------------------------------ |
| `vvClient.forms.postForms()`                 | `2026-03-15 14:30:00.000` | `"2026-03-15T14:30:00Z"` (ISO+Z)    | UTC → converts to local (**shifted**)      |
| `vvClient.formsApi.formInstances.postForm()` | `2026-03-15 14:30:00.000` | `"03/15/2026 14:30:00"` (US format) | Local time → no conversion (**preserved**) |

**Impact:** Records created via `postForms` have their DateTime values shifted by the user's timezone offset on first form open (CB-8) — not because the DB value differs, but because `FormInstance/Controls` serializes it as ISO+Z, which Forms V1 interprets as UTC. Records created via `forminstance/` are immune because the serialized US format is parsed as local time.

**Workaround:** Use `forminstance/` for **all** DateTime fields that users will view in Forms. Empirically verified (2026-04-06): `getSaveValue()` stores identical values for `ignoreTZ=true` and `ignoreTZ=false` — the flag affects display only, not DB storage. The `forminstance/` endpoint requires the template **revision ID** (not template ID), JWT auth, and a different payload format: `{ fields: [{ key: "FieldN", value: "..." }] }`. See [FormsAPI Service](../architecture/visualvault-platform.md#formsapi-service).

**Confirmed in:** Freshdesk #124697 (WADNR-10407), WS-10 test batch, DB dump + SSMS schema (2026-04-06).

---

## Evidence

| Test   | Finding                                                 | Reference                                                                                |
| ------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| WS-1   | Server TZ irrelevant for API writes (H-4)               | [matrix.md WS-1](../../tasks/date-handling/web-services/matrix.md)                       |
| WS-4   | API Z normalization → Forms TZ-dependent display (CB-8) | [ws-4-batch-run-1.md](../../tasks/date-handling/web-services/runs/ws-4-batch-run-1.md)   |
| WS-5   | Server converts TZ offsets to UTC correctly (CB-12)     | [ws-5-batch-run-1.md](../../tasks/date-handling/web-services/runs/ws-5-batch-run-1.md)   |
| WS-5   | DD/MM/YYYY silently stored as null — Bug #8             | [ws-5-batch-run-1.md](../../tasks/date-handling/web-services/runs/ws-5-batch-run-1.md)   |
| WS-9   | TZ-safe vs unsafe Date patterns (CB-24–CB-28)           | [ws-9-batch-run-1.md](../../tasks/date-handling/web-services/runs/ws-9-batch-run-1.md)   |
| Cat 10 | Epoch silent null, midnight-crossing                    | [cat10-gaps-run-1.md](../../tasks/date-handling/web-services/runs/cat10-gaps-run-1.md)   |
| WS-10  | postForms vs forminstance/ serialization format (CB-29) | [ws-10-batch-run-1.md](../../tasks/date-handling/web-services/runs/ws-10-batch-run-1.md) |
