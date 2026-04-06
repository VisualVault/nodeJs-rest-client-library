# Bug #2: Inconsistent User Input Handlers

## Classification

| Field                  | Value                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| **Severity**           | Medium (upgraded from Low — DB stores `datetime`, format difference = data difference)   |
| **Evidence**           | `[LEGACY]` — NOT REPRODUCED for non-legacy configs. Confirmed only for `useLegacy=true`. |
| **Component**          | FormViewer → Calendar Component → `calChangeSetValue()` vs `calChange()`                 |
| **Code Path**          | V1 (default) — both handlers exist in V1                                                 |
| **Affected Configs**   | E, F, G, H (`useLegacy=true` only)                                                       |
| **Affected TZs**       | All                                                                                      |
| **Affected Scenarios** | 1 (Calendar Popup), 2 (Typed Input)                                                      |
| **Related Bugs**       | Format difference is distinct from Bug #7 (wrong day) which also affects these scenarios |

---

## Summary

The calendar popup and the typed input field use **different handler functions** with different save logic. The popup handler (`calChangeSetValue`) stores the raw `toISOString()` output directly, bypassing `getSaveValue()`. The typed input handler (`calChange`) routes through `getSaveValue()` which reformats the value. For non-legacy configs, the `normalizeCalValue()` step upstream makes the two paths converge to the same stored value. For legacy configs (`useLegacy=true`), the two paths produce **different stored formats for the same intended date**.

---

## Who Is Affected

- **Legacy config users only** (fields with `useLegacy=true` — Configs E, F, G, H)
- Affects all timezones equally (the inconsistency is format-based, not timezone-based)
- Non-legacy configs (A–D) are NOT affected — both handlers produce identical stored values

---

## Root Cause

### The Two Handlers

**Popup Handler** — `calChangeSetValue()` (line ~102824):

```javascript
calChangeSetValue(e) {
    let t = e && !isNaN(e.getDate()) ? e.toISOString() : "";
    this.value = e;
    this.data.text = this.data.value = t;
    this.updateFormValueSubject(this.data.name, t);  // ← Stores raw toISOString()
    // ...
}
```

**Typed Input Handler** — `calChange()` (line ~102824):

```javascript
calChange(e, t = true, n = false) {
    let i = e && !isNaN(e.getDate()) ? e.toISOString() : "";
    // ...
    this.data.text = this.data.value = i;
    let r = this.calendarValueService.getSaveValue(
        this.data.value,
        this.data.enableTime,
        this.data.ignoreTimezone
    );
    this.updateFormValueSubject(this.data.name, r, true, t, n);  // ← Stores getSaveValue() output
    // ...
}
```

### Why This Is Wrong

Both handlers receive the same `Date` object from the UI. They both convert it to ISO via `toISOString()`. But only `calChange` passes the result through `getSaveValue()`, which:

- For DateTime: reformats to `"YYYY-MM-DDTHH:mm:ss"` (strips Z, strips milliseconds)
- For Date-only: extracts `"YYYY-MM-DD"` portion

The popup handler skips this step entirely, storing the raw `toISOString()` output (e.g., `"2026-03-15T03:00:00.000Z"`).

### What Should Happen

Both handlers should produce identical stored values for the same selected date. The popup handler should route through `getSaveValue()` just like the typed handler does.

---

## Expected vs Actual Behavior

**Config E (date-only, legacy) — user selects March 15 in BRT (UTC-3):**

| Input Method   | Expected Stored Value | Actual Stored Value          | Correct?     |
| -------------- | --------------------- | ---------------------------- | ------------ |
| Calendar Popup | `"2026-03-15"`        | `"2026-03-15T03:00:00.000Z"` | Wrong format |
| Typed Input    | `"2026-03-15"`        | `"2026-03-15"`               | Correct      |

**Config G (DateTime, legacy) — user selects March 15 12:00 AM in BRT:**

| Input Method   | Expected Stored Value                                   | Actual Stored Value          | Correct?                              |
| -------------- | ------------------------------------------------------- | ---------------------------- | ------------------------------------- |
| Calendar Popup | `"2026-03-15T00:00:00"` or `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | Ambiguous — format differs from typed |
| Typed Input    | Same as popup                                           | `"2026-03-15T00:00:00"`      | Different format                      |

Both display the same date to the user, but the stored representation differs. This becomes a problem on reload or when comparing values programmatically.

---

## Steps to Reproduce

1. Open a form with a `useLegacy=true` calendar field (Config E, F, G, or H)
2. Select March 15, 2026 via the **calendar popup**
3. In DevTools console: `VV.Form.VV.FormPartition.getValueObjectValue('Field12')` — note the stored value
4. Clear the field
5. **Type** `03/15/2026` in the input field and press Tab
6. Check the stored value again — it will be in a different format

---

## Test Evidence

- **Non-legacy NOT REPRODUCED**: Tests 1-A-BRT vs 2-A-BRT, 1-A-IST vs 2-A-IST — both produce identical values. `[LIVE]`
- **Legacy CONFIRMED**: Tests 1-E-BRT vs 2-E-BRT show different stored formats for popup vs typed. `[LIVE]`
- Category 1 (popup): 20/20 complete — 7P, 13F
- Category 2 (typed): 16/16 complete — 11P, 5F

### Playwright Audit (2026-04-06)

**Dual-method verification achieved.** See [bug-2-audit.md](bug-2-audit.md) for full report.

- Created `selectDateViaLegacyPopup()` helper in `testing/helpers/vv-calendar.js`
- Created `testing/date-handling/cat-1-legacy-popup.spec.js` formal Playwright spec
- All 4 BRT legacy configs (E/F/G/H) independently confirmed via automated Playwright — values match manual run-1 exactly
- Cat 2 typed input re-verified via Playwright — all 4 legacy configs PASS
- Config A control: popup = typed (no Bug #2)

---

## Impact Analysis

### Data Integrity

- The two handlers produce different strings for the same intended date — and since all fields are SQL Server `datetime` (no `date` type), the format difference translates to an **actual data difference** in the database:
    - Popup: `"2026-03-15T03:00:00.000Z"` → server stores as `2026-03-15 03:00:00.000` (3 AM)
    - Typed: `"2026-03-15"` → server stores as `2026-03-15 00:00:00.000` (midnight)
    - **3-hour difference** in the actual `datetime` column (equals BRT UTC-3 offset)
- Reload behavior differs: `parseDateString()` handles Z-suffixed vs non-Z strings differently
- SQL queries like `WHERE Field12 = '2026-03-15'` match typed but NOT popup values
- The magnitude of the DB difference varies by timezone (3h for BRT, 5.5h for IST, etc.)

### Scope Limitation

- Only affects legacy configs (`useLegacy=true`)
- Non-legacy configs are unaffected because `normalizeCalValue()` in the popup path normalizes the Date object before it reaches the divergent handlers
- Medium severity — while legacy configs are the older code path, the DB stores `datetime` (not strings), so the format difference translates to actual data differences (3h offset in BRT, 5.5h in IST). See [bug-2-audit.md](bug-2-audit.md) DB Evidence section.

---

## Workarounds

1. **Don't mix input methods**: If a field uses `useLegacy=true`, establish a convention (popup only or typed only) to ensure consistent format
2. **Use non-legacy configs**: Setting `useLegacy=false` eliminates this bug entirely (but introduces Bug #5 exposure for Config D)
3. **Normalize on read**: When reading values via scripts, parse through `new Date()` before comparing — handles both formats

---

## Proposed Fix

### Before (Current — calChangeSetValue)

```javascript
calChangeSetValue(e) {
    let t = e && !isNaN(e.getDate()) ? e.toISOString() : "";
    this.value = e;
    this.data.text = this.data.value = t;
    this.updateFormValueSubject(this.data.name, t);  // ← Raw value, no getSaveValue()
    // ...
}
```

### After (Fixed)

```javascript
calChangeSetValue(e) {
    let t = e && !isNaN(e.getDate()) ? e.toISOString() : "";
    this.value = e;
    this.data.text = this.data.value = t;

    // Route through getSaveValue() for consistency with calChange()
    let saveValue = this.calendarValueService.getSaveValue(
        this.data.value,
        this.data.enableTime,
        this.data.ignoreTimezone
    );

    this.updateFormValueSubject(this.data.name, saveValue);
    // ...
}
```

### Key Change

- Add `getSaveValue()` call in `calChangeSetValue()` to match `calChange()` behavior

---

## Fix Impact Assessment

### What Changes If Fixed

- Popup and typed input produce identical stored values for all configs
- Legacy popup no longer stores raw `toISOString()` with Z suffix and milliseconds
- Reload behavior becomes consistent regardless of how the date was originally entered

### Backwards Compatibility Risk

- **LOW**: Existing data stored via legacy popup in raw format would still load correctly (parseDateString handles both formats)
- The change only affects future saves — existing records retain their stored format until edited

### Regression Risk

- Low — the change is additive (adding a transformation step to the popup path)
- Must verify that `getSaveValue()` produces correct results for all legacy config combinations
- Must verify popup display is not affected (the visual date/time selection itself doesn't change)
