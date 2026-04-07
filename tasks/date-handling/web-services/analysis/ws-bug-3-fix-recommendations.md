# WEBSERVICE-BUG-3: Fix Recommendations

## Workarounds

### Always Use ISO 8601 Format for API Input

Identical to [WEBSERVICE-BUG-2](ws-bug-2-latam-data-loss.md): **always use ISO 8601 (`YYYY-MM-DD`)** for API input. This format is unambiguous — there is no month/day swap possible.

```javascript
// SAFE: ISO 8601 — March 5 is always "2026-03-05"
const data = { Field7: '2026-03-05' };

// SAFE: construct from components explicitly
const y = 2026,
    m = 3,
    d = 5;
const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
// → "2026-03-05"

// SAFE: from Date object
const date = new Date(Date.UTC(2026, 2, 5));
const safe = date.toISOString().split('T')[0]; // "2026-03-05"
```

### Convert External DD/MM Data Before Sending

For DD/MM data from external sources, convert to ISO before sending:

```javascript
function ddmmToIso(input) {
    const [day, month, year] = input.split(/[\/\-\.]/);
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}
// ddmmToIso("05/03/2026") → "2026-03-05"
```

### Avoid Locale-Dependent Date Formatting

```javascript
// Locale-dependent — output format varies, may trigger month/day swap
new Date(2026, 2, 5).toLocaleDateString('es-AR'); // "5/3/2026" → server reads as May 3
new Date(2026, 2, 5).toLocaleDateString('pt-BR'); // "05/03/2026" → server reads as May 3

// SAFE — always use toISOString() for API input
date.toISOString().split('T')[0]; // "2026-03-05" → always correct
```

---

## Proposed Fix

This bug should be addressed together with [WEBSERVICE-BUG-2](ws-bug-2-latam-data-loss.md) since they share the same root cause (the parser always interprets the first numeric component as the month). The recommended approach from WEBSERVICE-BUG-2 handles both:

1. **Day > 12** (WEBSERVICE-BUG-2): Parse as DD/MM — the only valid interpretation. Eliminates silent null.
2. **Day ≤ 12** (this bug): Three options:

### Option A: Reject Ambiguous Dates (Safest)

```
"05/03/2026" → 400 error: "Ambiguous date format. Use ISO 8601 (YYYY-MM-DD)."
```

Forces developers to be explicit. No silent misinterpretation.

### Option B: Accept a Locale Hint Header (Most Flexible)

```
POST with header X-Date-Locale: DD/MM
"05/03/2026" → stored as March 5
```

Without the header, default to current MM/DD behavior for backwards compatibility.

### Option C: Keep Current MM/DD Default but Document It (Minimum)

No code change. Add clear documentation that all-numeric dates are always interpreted as MM/DD. Does not prevent future misinterpretation but sets clear expectations.

### Recommended

Option A (reject ambiguous dates) for all-numeric inputs where both components are ≤ 12, combined with DD/MM support for unambiguous cases (day > 12). ISO 8601 and US format always accepted without restriction.

---

## Fix Impact Assessment

### What Changes If Fixed

- Ambiguous DD/MM dates either fail with a clear error (Option A) or are parsed correctly with a locale hint (Option B)
- Developers discover the issue during development, not after production data is corrupted
- Combined with the WEBSERVICE-BUG-2 fix, all DD/MM inputs have clear, predictable behavior

### Backwards Compatibility Risk: MEDIUM

Unlike WEBSERVICE-BUG-2 (where the result is null — clearly wrong), this bug stores a valid date. Changing the interpretation could:

- Fix records that were previously wrong (month/day swapped)
- Change behavior for scripts that adapted to the MM/DD interpretation (unlikely but possible)
- Change query results for existing data if the interpretation changes retroactively

**Mitigation**: Only change behavior for new writes. Existing stored data is not reinterpreted. Document the change clearly.

### Regression Risk: LOW

The parser change is isolated to server input normalization. All currently-accepted unambiguous formats (ISO, US with month > 12, named months, etc.) are unaffected. The change only impacts the ambiguous case where both components are ≤ 12.

### Data Recovery

Existing records with swapped month/day values cannot be automatically corrected — the server has no record of the original input format. Correcting them requires re-importing from the original source data with proper ISO formatting.
