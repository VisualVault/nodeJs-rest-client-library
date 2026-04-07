# FORM-BUG-3: Workarounds and Fix Recommendations

Companion document to [bug-3-hardcoded-params.md](bug-3-hardcoded-params.md). Read the bug report first for full context on the defect.

---

## Workarounds

V2 is not active on the demo environment. If V2 is active in another environment:

- **Avoid Object View for date-critical forms**: Open forms in standard mode (no `?ObjectID=` URL parameter) to use V1, which bypasses the defective function
- **Do not enable the V2 server flag** until this bug and FORM-BUG-7 are both fixed

---

## Proposed Fix

### Before (Current)

```javascript
// Saved data — hardcodes enableTime
parseDateString(this.data.value, true, this.data.ignoreTimezone);

// Preset — hardcodes both
parseDateString(this.data.initialDate, false, true);
```

### After (Fixed)

```javascript
// Saved data — use actual settings
parseDateString(this.data.value, this.data.enableTime, this.data.ignoreTimezone);

// Preset — use actual settings
parseDateString(this.data.initialDate, this.data.enableTime, this.data.ignoreTimezone);
```

The fix is straightforward: replace the hardcoded values with the field's actual configuration properties at both call sites.

### Key Changes

1. Saved data call site: replace hardcoded `true` with `this.data.enableTime`
2. Preset call site: replace hardcoded `false` with `this.data.enableTime`, hardcoded `true` with `this.data.ignoreTimezone`

### Fix Ordering Constraint

**This fix must not be deployed before [FORM-BUG-7](bug-7-wrong-day-utc-plus.md) is fixed.** The hardcoded `enableTime=true` on the saved data path currently prevents FORM-BUG-7 from appearing on the V2 load path. With the "fixed" parameter `enableTime=false` for date-only fields, `parseDateString` would trigger FORM-BUG-7's local-midnight parsing, storing the wrong day for UTC+ users.

**Required fix order:**

1. Fix FORM-BUG-7 (date-only local-midnight parsing) first
2. Then fix FORM-BUG-3 (hardcoded parameters) — now safe because the underlying parsing is correct

---

## Fix Impact Assessment

### What Changes If Fixed

- Date-only fields loading saved data correctly apply `.startOf("day")` (midnight collapse)
- Date+time presets retain their time component
- Preset dates respect the field's `ignoreTimezone` setting
- All three `parseDateString` call sites in V2 use consistent, correct parameters

### Backwards Compatibility Risk: MEDIUM

- **Saved data path**: The fix makes parsing match the field's actual type, which aligns with how the value was originally saved — low risk
- **Preset path**: Changing preset parsing could produce different initial values for existing form templates. Templates with presets would need regression testing.

### Regression Risk: MODERATE

- `initCalendarValueV2()` runs on every V2 form load for every calendar field
- Must test all 8 field configurations with saved data reload and preset date load under V2
- Must verify V1 behavior is completely unaffected (V1 uses a separate function)
- **Must coordinate with FORM-BUG-7 fix** — deploying this fix alone would introduce date-only wrong-day errors on V2
