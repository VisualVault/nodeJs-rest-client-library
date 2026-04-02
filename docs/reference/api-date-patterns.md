# API Date Patterns — Correct DateTime Handling for Web Services

How to send date and datetime values through the VV REST API so they display correctly in Forms.

> Based on confirmed test results from the [WS date-handling investigation](../../tasks/date-handling/web-services/analysis.md) (145 tests, WS-1 through WS-9).

---

## The Problem

When a web service creates or updates a form record with a datetime value, the time displayed in the browser may not match the time sent by the script. This happens because:

1. **API appends Z**: The VV server adds a `Z` (UTC indicator) to all stored datetimes. Sending `"2026-03-15T14:30:00"` stores `"2026-03-15T14:30:00Z"`.
2. **Forms interprets Z as UTC**: When a user opens the form, the V1 calendar component treats the `Z` as real UTC and converts to the user's local timezone.
3. **Result**: A BRT (UTC-3) user sees 11:30 AM instead of 2:30 PM. An IST (UTC+5:30) user sees 8:00 PM.

```
Script sends:   "2026-03-15T14:30:00"     (intended: 2:30 PM local)
Server stores:  "2026-03-15T14:30:00Z"    (treated as 2:30 PM UTC)
BRT user sees:  "11:30 AM"               (14:30 UTC - 3h = 11:30 local)
IST user sees:  "8:00 PM"                (14:30 UTC + 5:30 = 20:00 local)
```

---

## Solutions by Scenario

### Scenario 1: CSV Import — Times are local to a known timezone

If the CSV contains times in a known timezone (e.g., the client is in BRT), append the correct UTC offset before sending:

```javascript
// CSV row: { date: "2026-03-15", time: "14:30:00" }
// Client timezone: BRT (UTC-3)

// WRONG — server treats as UTC:
const wrong = `${row.date}T${row.time}`;
// → "2026-03-15T14:30:00" → stored as "T14:30:00Z" → BRT sees 11:30 AM

// CORRECT — include the offset:
const correct = `${row.date}T${row.time}-03:00`;
// → "2026-03-15T14:30:00-03:00" → stored as "T17:30:00Z" → BRT sees 2:30 PM ✓
```

**Offset reference for common VV client timezones:**

| Timezone           | Offset (standard) |   Offset (DST)    | Example           |
| ------------------ | :---------------: | :---------------: | ----------------- |
| BRT (São Paulo)    |     `-03:00`      | `-03:00` (no DST) | `T14:30:00-03:00` |
| ART (Buenos Aires) |     `-03:00`      | `-03:00` (no DST) | `T14:30:00-03:00` |
| COT (Colombia)     |     `-05:00`      | `-05:00` (no DST) | `T14:30:00-05:00` |
| EST (US East)      |     `-05:00`      |  `-04:00` (EDT)   | `T14:30:00-05:00` |
| CST (US Central)   |     `-06:00`      |  `-05:00` (CDT)   | `T14:30:00-06:00` |
| PST (US Pacific)   |     `-08:00`      |  `-07:00` (PDT)   | `T14:30:00-08:00` |
| IST (India)        |     `+05:30`      | `+05:30` (no DST) | `T14:30:00+05:30` |

### Scenario 2: CSV Import — Times are already UTC

If the source data is in UTC (e.g., from a database export), send with `Z`:

```javascript
// CSV: { datetime: "2026-03-15T14:30:00" } — known to be UTC
const value = `${row.datetime}Z`;
// → "2026-03-15T14:30:00Z" — stored as-is, displayed as local time in Forms
```

### Scenario 3: Date-only fields (no time component)

Date-only fields are unaffected by this issue. All these formats work correctly:

```javascript
// All of these store "2026-03-15T00:00:00Z" and display as "03/15/2026"
{
    DataField7: '2026-03-15';
} // ISO — recommended
{
    DataField7: '03/15/2026';
} // US format — works
{
    DataField7: 'March 15, 2026';
} // English — works
```

### Scenario 4: Script computes dates/times dynamically

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

| Field Type | Source Data           | Send This       | Example                       |
| ---------- | --------------------- | --------------- | ----------------------------- |
| Date-only  | Any date string       | ISO date        | `"2026-03-15"`                |
| DateTime   | Local time (known TZ) | ISO + offset    | `"2026-03-15T14:30:00-03:00"` |
| DateTime   | UTC time              | ISO + Z         | `"2026-03-15T14:30:00Z"`      |
| DateTime   | Computed              | `toISOString()` | `"2026-03-15T14:30:00.000Z"`  |

---

## What NOT to Send

| Input                                  | Problem                                                         |
| -------------------------------------- | --------------------------------------------------------------- |
| `"2026-03-15T14:30:00"` (no offset)    | Server adds Z → treated as UTC → wrong local display            |
| `"15/03/2026"` (DD/MM/YYYY)            | Silently stored as null — complete data loss (Bug #8)           |
| `"05/03/2026"` (ambiguous)             | Interpreted as May 3 (MM/DD), not March 5 — wrong date silently |
| `1773532800000` (epoch ms)             | Silently stored as null — numeric timestamps not supported      |
| `"1773532800000"` (epoch string)       | Silently stored as null — numeric strings not parsed as dates   |
| `new Date("03/15/2026")` (Date object) | Serialized as local midnight → different UTC per server TZ      |

---

## How to Fix Existing Records

If records were already created with incorrect times (no offset), you can correct them via `postFormRevision()`:

```javascript
// Read the record
const record = await vvClient.forms.getForms(
    { q: "[instanceName] eq 'MyRecord-000123'", expand: true },
    'MyFormTemplate'
);
const stored = record.data[0].dataField6; // "2026-03-15T14:30:00Z" (wrong — was local, not UTC)

// The stored value "T14:30:00Z" was actually BRT local (T14:30:00-03:00 = T17:30:00Z)
// Correct it by replacing with the right UTC value:
const corrected = '2026-03-15T17:30:00Z'; // or compute from original + offset

await vvClient.forms.postFormRevision(null, { DataField6: corrected }, 'MyFormTemplate', record.data[0].revisionId);
```

---

## Evidence

| Test | Finding                                                  | Reference                                                                              |
| ---- | -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| WS-4 | API Z normalization causes cross-layer time shift (CB-8) | [ws-4-batch-run-1.md](../../tasks/date-handling/web-services/runs/ws-4-batch-run-1.md) |
| WS-5 | Server converts TZ offsets to UTC correctly (CB-12)      | [ws-5-batch-run-1.md](../../tasks/date-handling/web-services/runs/ws-5-batch-run-1.md) |
| WS-5 | DD/MM/YYYY silently stored as null — Bug #8              | [ws-5-batch-run-1.md](../../tasks/date-handling/web-services/runs/ws-5-batch-run-1.md) |
| WS-9 | TZ-safe vs unsafe Date patterns (CB-24–CB-28)            | [ws-9-batch-run-1.md](../../tasks/date-handling/web-services/runs/ws-9-batch-run-1.md) |
