# FORM-BUG-4: Timezone Marker Stripped When Saving Date+Time Fields

## What Happens

When a user saves a form with a date+time calendar field, the system permanently removes the UTC timezone marker (`Z`) from the value before storing it. The result is a datetime string like `"2026-03-15T00:00:00"` — there is no way to determine from this stored value alone whether it represents midnight UTC, midnight São Paulo, or midnight Mumbai. The timezone context is irrecoverably lost.

The bug is masked when a value is saved and loaded at the same UTC offset — the save path strips the marker, and the load path re-parses as local time, producing the correct display. But any change in UTC offset between save and load — a different timezone, business travel, or even a DST transition in the same city — causes the date to shift.

---

## When This Applies

Three conditions must all be true:

### 1. The field must be date+time (`enableTime=true`)

Date-only fields are unaffected — their save path extracts just the `"YYYY-MM-DD"` portion, which is timezone-unambiguous. All four date+time configs (C, D, G, H) are affected regardless of `ignoreTimezone` or `useLegacy`:

| Config | enableTime | ignoreTimezone | useLegacy | Affected?                       |
| ------ | ---------- | -------------- | --------- | ------------------------------- |
| C      | ✅         | —              | —         | ✅ **Yes** — Z stripped on save |
| D      | ✅         | ✅             | —         | ✅ **Yes** — Z stripped on save |
| G      | ✅         | —              | ✅        | ✅ **Yes** — Z stripped on save |
| H      | ✅         | ✅             | ✅        | ✅ **Yes** — Z stripped on save |
| A      | —          | —              | —         | ❌ No — date-only               |
| B      | —          | ✅             | —         | ❌ No — date-only               |
| E      | —          | —              | ✅        | ❌ No — date-only               |
| F      | —          | ✅             | ✅        | ❌ No — date-only               |

### 2. The form is running the V1 code path (the default)

The FormViewer's calendar initialization has two versions. **V1** is the default — it ran during all testing on the demo environment. **V2** is an updated version that activates under specific conditions. The V2 save path correctly preserves the Z suffix; this bug is V1-only.

### 3. The impact depends on whether the saved value is read from a different timezone

- **Same UTC offset at save and load**: The save path strips Z and converts to local time; the load path re-parses as local time. The two operations cancel out — the date displays correctly. Note: "same timezone" is not sufficient — DST transitions change the UTC offset (e.g., EST UTC-5 → EDT UTC-4), so a value saved in winter and loaded in summer shifts by 1 hour even for the same user in the same city.
- **Different UTC offset**: A value saved from São Paulo (`"2026-03-15T00:00:00"` = São Paulo midnight) loaded from Mumbai is reinterpreted as Mumbai midnight — an 8.5-hour shift that crosses a day boundary. This also applies to business travel, remote work across timezones, and multi-timezone states (e.g., Indiana, Texas, Florida).
- **SQL queries, reports, dashboards, REST API**: These read the raw database value. The stored `"2026-03-15T00:00:00"` has no timezone context — any consumer that adds a Z or assumes UTC will misinterpret it.

---

## Severity: MEDIUM

The self-consistent double-stripping pattern (FORM-BUG-4 strips on save, V1 load re-parses as local) masks the bug only when save and load happen in the exact same UTC offset. This is narrower than "same timezone" — DST transitions change the offset twice a year (e.g., EST UTC-5 → EDT UTC-4), so a value saved in winter and loaded in summer shifts by 1 hour even for the same user in the same city. Business travel, remote work from a different timezone, and multi-timezone states (e.g., Indiana, Texas, Florida, Tennessee) also break the assumption. Any downstream consumer that reads the raw database value (SQL queries, reports, REST API) is affected regardless of timezone — the stored value has no timezone context.

---

## How to Reproduce

1. Set system timezone to `America/Sao_Paulo` (BRT, UTC-3) and restart the browser
2. Open the DateTest form template URL
3. On **Field6** (Config C: DateTime, ignoreTZ=false), type `03/15/2026 12:00 AM` and press Tab
4. In the browser console, check the stored value:
    ```javascript
    VV.Form.VV.FormPartition.getValueObjectValue('Field6');
    // Returns: "2026-03-15T00:00:00"  — no Z suffix
    ```
5. **Expected**: `"2026-03-15T03:00:00.000Z"` (UTC representation of midnight São Paulo, with Z)
6. **Actual**: `"2026-03-15T00:00:00"` — Z stripped, timezone context lost

**Cross-timezone reproduction:**

1. Save the form from São Paulo — Config C stores `"2026-03-15T00:00:00"`
2. Switch system timezone to Mumbai (`Asia/Calcutta`) and restart browser
3. Reload the same record
4. The load path interprets `"2026-03-15T00:00:00"` as Mumbai local time → internally becomes `"2026-03-14T18:30:00.000Z"` — a different UTC instant from what was saved

This bug report is backed by a supporting test repository containing Playwright automation scripts, additional per-bug analysis documents, raw test data, and test case specifications. Access can be requested from the Solution Architecture team.

---

## The Problem in Detail

### The Save Chain

When a user enters a date+time value, the value flows through this chain before being stored:

```text
User enters date
    ↓
Handler converts to Date object → .toISOString()
    → "2026-03-15T03:00:00.000Z" (correct UTC, with Z)
    ↓
getSaveValue() formats for storage
    → moment("...Z").format("YYYY-MM-DD[T]HH:mm:ss")
    → "2026-03-15T00:00:00" (Z STRIPPED, milliseconds removed)
    ↓
Stored in form partition and sent to server
    ↓
SQL Server stores as datetime: 2026-03-15 00:00:00.000 (timezone-unaware)
```

The critical step is `getSaveValue()`. Its format string `'YYYY-MM-DD[T]HH:mm:ss'` deliberately excludes `Z` (or any timezone designator) and milliseconds. The `moment(input)` call also implicitly converts from UTC to local time before formatting — so `"2026-03-15T00:00:00.000Z"` (UTC midnight) becomes `"2026-03-14T21:00:00"` in São Paulo (UTC-3).

### getSaveValue() Input/Output

**São Paulo (UTC-3):**

| Input                                       | Output                  | Z Present? |
| ------------------------------------------- | ----------------------- | ---------- |
| `"2026-03-15T00:00:00.000Z"` (UTC midnight) | `"2026-03-14T21:00:00"` | **No**     |
| `"2026-03-15T03:00:00.000Z"` (BRT midnight) | `"2026-03-15T00:00:00"` | **No**     |
| `"2026-03-15T00:00:00"` (no Z)              | `"2026-03-15T00:00:00"` | **No**     |

**Mumbai (UTC+5:30):**

| Input                                       | Output                  | Z Present? |
| ------------------------------------------- | ----------------------- | ---------- |
| `"2026-03-15T00:00:00.000Z"` (UTC midnight) | `"2026-03-15T05:30:00"` | **No**     |

Every output is Z-less. The Z is always stripped, regardless of input format.

### What the Stored Value Means — Or Doesn't

After Z is stripped, the value `"2026-03-15T00:00:00"` is ambiguous:

| If saved from...  | The value means...      | UTC equivalent       |
| ----------------- | ----------------------- | -------------------- |
| São Paulo (UTC-3) | Midnight São Paulo time | 2026-03-15 03:00 UTC |
| Mumbai (UTC+5:30) | Midnight Mumbai time    | 2026-03-14 18:30 UTC |
| London (UTC+0)    | Midnight UTC            | 2026-03-15 00:00 UTC |

All three users intended midnight March 15 local time. All three produce the same stored string. But these represent three different moments in time, and the database cannot distinguish between them.

### The Double-Stripping Pattern

FORM-BUG-4 and [FORM-BUG-1](bug-1-timezone-stripping.md) form a complementary pair:

```text
SAVE PATH (FORM-BUG-4):
  Date object → .toISOString() → "...Z" → getSaveValue() → strips Z → stored as "..."

LOAD PATH (FORM-BUG-1 / V1 equivalent):
  Stored "..." → parseDateString() or inline code → strips Z (no-op, already gone) → parses as local
```

**Same-offset round-trip**: São Paulo saves `"2026-03-15T00:00:00"` (local midnight) during BRT (UTC-3). São Paulo reloads during BRT → parses as São Paulo local midnight → displays March 15 00:00. **Correct** — but only because the UTC offset hasn't changed between save and load. A DST transition or timezone change would break this.

**Cross-timezone round-trip**: São Paulo saves `"2026-03-15T00:00:00"` (São Paulo midnight = 03:00 UTC). Mumbai reloads → parses as Mumbai local midnight (= 18:30 UTC on March 14). **Wrong** — the date has shifted 8.5 hours and crossed a day boundary.

### Downstream Effect on GetFieldValue

The Z-less stored value is also misinterpreted by `GetFieldValue()`:

| Config | GetFieldValue Output         | Changed from Raw? | Effect                                                                               |
| ------ | ---------------------------- | ----------------- | ------------------------------------------------------------------------------------ |
| C      | `"2026-03-15T03:00:00.000Z"` | **Yes**           | Applies `new Date(value).toISOString()` — reinterprets local as UTC, adds +3h offset |
| D      | `"2026-03-15T00:00:00.000Z"` | **Yes**           | Adds literal Z to local time (FORM-BUG-5)                                            |
| G      | `"2026-03-15T00:00:00"`      | No                | Legacy passthrough — returns raw value                                               |
| H      | `"2026-03-15T00:00:00"`      | No                | Legacy passthrough — returns raw value                                               |

Config C's `GetFieldValue` applies a real UTC conversion to the stored local-time value — producing a shifted result. This is a direct downstream consequence of FORM-BUG-4: because the stored value has no timezone marker, any function that assumes or adds one will misinterpret it.

### Relationship to Other Bugs

| Bug        | Relationship                                                                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FORM-BUG-1 | Complementary pair: FORM-BUG-4 strips Z on save, FORM-BUG-1 strips Z on load. Self-consistent for same-TZ, breaks for cross-TZ. Both must be fixed together.   |
| FORM-BUG-5 | Config D: `GetFieldValue` adds literal Z to the Z-less stored value. Different manifestation but same root pattern — the stored value has no timezone context. |
| FORM-BUG-3 | V2 hardcoded params feed into `getSaveValue()` which would preserve Z under V2 — FORM-BUG-3 affects the parse but not the save format.                         |

---

## Verification

Verified on the demo environment at `vvdemo.visualvault.com` across São Paulo/BRT (UTC-3) and Mumbai/IST (UTC+5:30) using direct `getSaveValue()` invocation, end-to-end typed input verification, and automated Playwright regression. Z-stripping confirmed for all date+time configs (C, D, G, H) in both timezones. Cross-timezone reload shift confirmed end-to-end (São Paulo save → Mumbai reload produces 8.5-hour shift on Config C).

`getSaveValue()` source code confirmed at line ~104106 — format string `'YYYY-MM-DD[T]HH:mm:ss'` visibly lacks Z. V2 path correctly preserves Z in the same function.

Playwright regression: Category 2 (typed input) 16/16 complete — 11 PASS, 5 FAIL; Category 3 (server reload) 18/18 complete — 10 PASS, 8 FAIL. FORM-BUG-4 failures confirmed via automated assertion on Config C.

This bug report is backed by a supporting test repository containing Playwright automation scripts, per-test results, and raw test data. Access can be requested from the Solution Architecture team.

---

## Technical Root Cause

The defective code is shown in [The Save Chain](#the-save-chain) above. This section adds file locations.

**File**: `main.js` (bundled FormViewer application)
**Function**: `CalendarValueService.getSaveValue()` — line ~104100

The V1 path uses `moment(input).format('YYYY-MM-DD[T]HH:mm:ss')` which:

1. Strips the Z suffix (format string doesn't include it)
2. Converts UTC to local time implicitly (`moment(input)` parses Z as UTC, `.format()` outputs local)

The V2 path in the same function uses `moment(input).toISOString()` — preserving Z and full precision. Both paths coexist in the same function, gated by `useUpdatedCalendarValueLogic`.

`getSaveValue()` is called on every save operation for every calendar field — it is the final transformation before the value is sent to the server.

---

## Appendix: Field Configuration Reference

The test form has 8 field configurations referred to by letter throughout this document:

| Config | Field   | enableTime | ignoreTimezone | useLegacy | Description                 |
| ------ | ------- | ---------- | -------------- | --------- | --------------------------- |
| A      | Field7  | —          | —              | —         | Date-only baseline          |
| B      | Field10 | —          | ✅             | —         | Date-only + ignoreTZ        |
| C      | Field6  | ✅         | —              | —         | DateTime UTC (control)      |
| D      | Field5  | ✅         | ✅             | —         | DateTime + ignoreTZ         |
| E      | Field12 | —          | —              | ✅        | Legacy date-only            |
| F      | Field11 | —          | ✅             | ✅        | Legacy date-only + ignoreTZ |
| G      | Field14 | ✅         | —              | ✅        | Legacy DateTime             |
| H      | Field13 | ✅         | ✅             | ✅        | Legacy DateTime + ignoreTZ  |

---

## Workarounds and Fix Recommendations

See [bug-4-fix-recommendations.md](bug-4-fix-recommendations.md) for workarounds, proposed code fix, backwards compatibility analysis, and fix impact assessment.
