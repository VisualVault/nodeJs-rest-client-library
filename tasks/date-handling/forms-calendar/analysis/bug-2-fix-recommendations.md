# FORM-BUG-2: Workarounds and Fix Recommendations

Companion document to [bug-2-inconsistent-handlers.md](bug-2-inconsistent-handlers.md). Read the bug report first for full context on the defect.

---

## Workarounds

### 1. Standardize Input Method

If a field uses legacy mode, establish a convention (popup only or typed only) to ensure consistent format across all records. This doesn't fix existing data but prevents future inconsistency.

### 2. Switch to Non-Legacy Mode

Setting `useLegacy=false` eliminates this bug entirely — both input methods produce identical stored values. However, non-legacy mode with `enableTime=true` and `ignoreTimezone=true` introduces [FORM-BUG-5](bug-5-fake-z-drift.md) (progressive drift on GetFieldValue round-trips).

### 3. Normalize on Read

When reading values via scripts, parse through `new Date()` before comparing — this handles both formats:

```javascript
const raw = VV.Form.VV.FormPartition.getValueObjectValue('Field12');
const normalized = raw ? new Date(raw).toISOString() : '';
```

---

## Proposed Fix

Both handlers should produce identical stored values. The popup handler should route through `getSaveValue()` just like the typed handler:

**Before:**

```javascript
calChangeSetValue(e) {
    let t = e && !isNaN(e.getDate()) ? e.toISOString() : "";
    this.value = e;
    this.data.text = this.data.value = t;
    this.updateFormValueSubject(this.data.name, t);  // Stores raw toISOString()
}
```

**After:**

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
}
```

### Key Changes

1. Added a `getSaveValue()` call in `calChangeSetValue` before storing — aligns the popup path with the typed input path

---

## Fix Impact Assessment

### What Changes If Fixed

- Popup and typed input produce identical stored values for all legacy configs
- Legacy popup no longer stores raw `toISOString()` with Z suffix and milliseconds
- Reload behavior becomes consistent regardless of how the date was originally entered
- SQL queries return consistent results for the same date regardless of input method

### Backwards Compatibility Risk: LOW

- Existing data stored via legacy popup in raw format still loads correctly (the V1 init path handles both formats on reload)
- The change only affects future saves — existing records retain their stored format until edited
- No change to the visual date selection experience

### Regression Risk: LOW

- The change is additive (adding a `getSaveValue()` call to the popup path)
- Must verify that `getSaveValue()` produces correct results for all legacy config combinations
- Must verify popup display is not affected (the visual selection itself doesn't change)
- Non-legacy configs are completely unaffected (they already converge through `normalizeCalValue()`)
