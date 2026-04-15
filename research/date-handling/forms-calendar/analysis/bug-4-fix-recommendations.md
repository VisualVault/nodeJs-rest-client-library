# FORM-BUG-4: Workarounds and Fix Recommendations

Companion document to [bug-4-legacy-save-format.md](bug-4-legacy-save-format.md). Read the bug report first for full context on the defect.

---

## Workarounds

### 1. Same-Offset Usage

The double-stripping pattern (FORM-BUG-4 strips on save, V1 load re-parses as local) is self-consistent when save and load happen at the same UTC offset. This is narrower than "same timezone" — DST transitions change the offset twice a year, so even a single user in a single city can trigger a 1-hour shift between winter and summer. Business travel and multi-timezone states also break the assumption. This workaround is fragile and implicit — most deployments rely on it without being aware of it.

### 2. Server-Side Date Handling

Write dates via the REST API instead of the Forms UI. The API stores values in ISO+Z format, bypassing `getSaveValue()` entirely.

### 3. Use `ignoreTimezone=true` (Config D)

For Config D, `getSaveValue` still strips Z (same behavior), but the _intent_ of `ignoreTimezone` is to store display time — so the ambiguity is by design. This doesn't fix the bug but aligns with the field's intended semantics.

### 4. Enable V2 Code Path

If `useUpdatedCalendarValueLogic` can be set to `true` (via server flag or Object View context), `getSaveValue()` preserves the Z suffix. However, V2 has its own bugs ([FORM-BUG-1](bug-1-timezone-stripping.md), [FORM-BUG-3](bug-3-hardcoded-params.md)) that must be fixed first.

---

## Proposed Fix

### Before (Current — V1 Path)

```javascript
if (enableTime) {
    const format = 'YYYY-MM-DD[T]HH:mm:ss';
    result = moment(input).format(format); // Strips Z and milliseconds
}
```

### After (Fixed)

```javascript
if (enableTime) {
    result = moment(input).toISOString(); // Preserves Z and full precision
}
```

### Key Changes

1. **Replace `moment().format(...)` with `moment().toISOString()`** — preserves Z suffix and milliseconds
2. **Remove V1/V2 branching** — both paths should preserve timezone. The `ignoreTimezone` flag should affect display formatting only, not storage.
3. **Date-only path unchanged** — extracting `"YYYY-MM-DD"` is correct for date-only fields

---

## Fix Impact Assessment

### What Changes If Fixed

- All datetime values stored with Z suffix (UTC marker preserved)
- Cross-timezone reloads produce correct dates
- Stored values are self-documenting — `"2026-03-15T00:00:00.000Z"` is unambiguously UTC
- The double-stripping pattern (FORM-BUG-4 + FORM-BUG-1) is broken — if FORM-BUG-1 is also fixed, the full save-load chain preserves timezone

### Backwards Compatibility Risk: HIGH

**This is the most significant compatibility concern across all bugs in this investigation.**

- **Existing data**: All datetime values currently in the database are stored without Z in local-time format. If FORM-BUG-4 is fixed but the V1 load path is not, the load path would receive Z-suffixed values and handle them differently than before.
- **Both bugs must be fixed together**: FORM-BUG-1 and FORM-BUG-4 form a complementary pair. Fixing one without the other creates a new inconsistency.
- **Data migration dilemma**: Existing stored values cannot be retroactively fixed — there's no way to determine which timezone they were saved from. Options:
    - **No migration**: Fix code only, old data stays wrong — users see old dates shift on display
    - **Blanket shift**: Add offset to all datetime values from known-TZ users — risks corrupting records where the stored value was intentional
    - **Accept mixed state**: Old dates wrong, new dates correct — inconsistency in the same database
- **Recommendation**: Fix the code. Do not attempt data migration. The existing stored data is self-consistent for users who have always accessed it at the same UTC offset. The fix prevents future corruption for all users regardless of timezone or DST state.

### Regression Risk: HIGH

- **High-traffic function**: `getSaveValue()` is called on every save for every calendar field. Any change affects all form saves platform-wide.
- **Format change**: Downstream systems (reports, APIs, scheduled scripts) that parse the stored format may break if they expect the Z-less format.
- **Must coordinate with FORM-BUG-1 fix**: The save and load paths must be updated in lockstep.
- **Testing scope**: All 8 configurations × datetime scenarios × multiple timezones must be regression-tested.
