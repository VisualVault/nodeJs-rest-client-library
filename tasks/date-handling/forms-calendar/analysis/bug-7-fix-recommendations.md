# FORM-BUG-7: Workarounds and Fix Recommendations

Companion document to [bug-7-wrong-day-utc-plus.md](bug-7-wrong-day-utc-plus.md). Read the bug report first for full context on the defect.

---

## Workarounds

### 1. Use Date+Time Fields Instead of Date-Only

Switch the field configuration to `enableTime=true` (Config C or D). Date+time fields bypass the date-only branch in `normalizeCalValue()` and store the full datetime string correctly.

**Tradeoff**: Users see a time picker they don't need. Config D introduces [FORM-BUG-5](bug-5-fake-z-drift.md) (progressive drift on GetFieldValue round-trips). Config C (`enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`) is the safest date+time option — format-agnostic, no literal Z issue.

### 2. Compute Dates Server-Side

Use the REST API (`postFormRevision` or `forminstance/`) to write date values instead of client-side `SetFieldValue`. The API bypasses `normalizeCalValue()` entirely and stores the string as-is.

```javascript
// Instead of (client-side — triggers FORM-BUG-7):
VV.Form.SetFieldValue('dateField', '2026-03-15');

// Use server-side write via vvClient:
vvClient.forms.postFormRevision(null, { Field7: '2026-03-15' }, formId, revisionId);
```

**Tradeoff**: Requires server-side script execution context. Not available in client-side form button scripts.

### 3. Noon Time Anchor — DOES NOT WORK for Date-Only Fields

Appending a noon time to avoid the midnight boundary:

```javascript
VV.Form.SetFieldValue('Field7', '2026-03-15T12:00:00');
```

**This does not work.** For date-only fields (`enableTime=false`), `normalizeCalValue()` strips the time portion and re-parses the date: `"2026-03-15T12:00:00"` → strip to `"2026-03-15"` → `moment("2026-03-15").toDate()` → local midnight again → same bug.

### 4. Pre-Shift by +1 Day — Not Recommended

```javascript
// Mumbai user wants March 15:
VV.Form.SetFieldValue('Field7', '2026-03-16'); // +1 day → stored as "2026-03-15"
```

Requires knowing the user's timezone. Produces incorrect results for UTC- and UTC+0 users. Not suitable for shared forms or production code.

### 5. Avoid Date-Only Fields in UTC+ Deployments

If the deployment serves UTC+ users and date accuracy is critical, use Config C for all date fields. Config C is the safest configuration — no FORM-BUG-5, no FORM-BUG-7, correct across all timezones.

---

## Proposed Fix

### Before (Current)

```javascript
// Date-only branch in normalizeCalValue():
if (n && typeof n === 'string' && n.indexOf('T') > 0) t = moment(n.substring(0, n.indexOf('T'))).toDate();
//      ↑ LOCAL midnight — wrong for UTC+
```

### After (Fixed)

```javascript
if (!this.data.enableTime) {
    let n = e;
    if ('[object Date]' === Object.prototype.toString.call(n)) n = n.toISOString();
    if (n && typeof n === 'string') {
        if (n.indexOf('T') > 0) n = n.substring(0, n.indexOf('T'));
        n = n.replace('Z', '');
        // FIX: Parse as UTC midnight — not local midnight
        return new Date(n + 'T00:00:00.000Z');
    }
    return null;
}
```

### Key Change

**Replace `moment(dateStr).toDate()`** (local midnight) **with `new Date(dateStr + "T00:00:00.000Z")`** (UTC midnight).

This ensures that `"2026-03-15"` always becomes March 15 00:00 UTC — regardless of the user's timezone. When `calChange()` subsequently calls `.toISOString()`, it gets `"2026-03-15T00:00:00.000Z"`, and `getSaveValue()` extracts `"2026-03-15"` — correct in every timezone.

**Why native `new Date()` instead of `moment.utc()`**: `new Date("2026-03-15T00:00:00.000Z")` is native JavaScript with no library dependency. The explicit `T00:00:00.000Z` suffix is unambiguous ISO 8601. `moment.utc("2026-03-15").toDate()` would also work but adds unnecessary moment dependency.

---

## Fix Impact Assessment

### What Changes If Fixed

- UTC+ users get correct dates stored for all date-only fields
- São Paulo and London users see no change (the fix produces the same result for UTC- and UTC+0)
- Popup, typed, SetFieldValue, and preset paths all store correct dates
- Round-trip compounding eliminated
- Year and month boundary crossing eliminated

### Backwards Compatibility Risk: HIGH

All date-only values stored by UTC+ users are currently -1 day from the intended date. If FORM-BUG-7 is fixed:

- **New saves** are correct (`"2026-03-15"` for March 15)
- **Old data** remains wrong (`"2026-03-14"` for what was intended to be March 15)
- **There is no way to identify which records are affected** — the stored value `"2026-03-14"` is indistinguishable from a user who legitimately entered March 14

### Data Migration Dilemma

| Option             | Approach                                          | Risk                                                             |
| ------------------ | ------------------------------------------------- | ---------------------------------------------------------------- |
| No migration       | Fix code only, old data stays as-is               | Old -1 day values persist; display unchanged on reload           |
| Blanket +1 day     | Add 1 day to all date-only values from UTC+ users | Corrupts records where the stored date was intentionally entered |
| Per-user migration | Shift only records from known UTC+ sessions       | Requires session timezone logging that doesn't exist             |
| Accept mixed state | Old dates -1 day, new dates correct               | Inconsistency in the same database                               |

**Recommendation**: Fix the code. Do not attempt data migration. The existing -1 day data is consistently wrong — users have been seeing the "correct" display (local Date object) all along. The fix prevents future corruption. On reload after the fix, old records go through the fixed `normalizeCalValue()` → `"2026-03-14"` parsed as UTC midnight → displayed as March 14 (which was always the stored value). No change to existing display behavior.

### Regression Risk

**High-traffic function**: `normalizeCalValue()` runs on every `SetFieldValue` call for every calendar field — date-only and date+time. The fix modifies only the `!enableTime` branch, so date+time fields are completely unaffected.

**Testing scope required:**

- All 4 date-only configs (A, B, E, F) × 3 timezones (São Paulo, Mumbai, London) × all input methods
- Verify date+time configs (C, D, G, H) are completely unaffected
- Verify form load path for saved records (same-TZ and cross-TZ reload)
- Verify preset date load
- Verify round-trip idempotency: `SetFieldValue(GetFieldValue())` should no longer shift

**Coordinated fix**: FORM-BUG-7 (`normalizeCalValue`) and [FORM-BUG-1](bug-1-timezone-stripping.md) (`parseDateString`) operate on different code paths but share the same root cause (local-midnight parsing). Fixing both simultaneously ensures consistent UTC-anchored behavior. [FORM-BUG-3](bug-3-hardcoded-params.md) must also be fixed simultaneously — its hardcoded `enableTime=true` currently masks FORM-BUG-7 on the V2 load path.
