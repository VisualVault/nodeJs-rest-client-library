# WEBSERVICE-BUG-2: Fix Recommendations

## Workarounds

### Always Use ISO 8601 Format for API Input

The only reliable workaround is to format all dates as `YYYY-MM-DD` before sending to the API. This format is unambiguous and always accepted.

```javascript
// SAFE: ISO 8601 — always works
const date = new Date(2026, 2, 15); // March 15, 2026
const isoDate = date.toISOString().split('T')[0]; // "2026-03-15"
const data = { Field7: isoDate };

// SAFE: explicit UTC construction (avoids timezone edge cases)
const utcDate = new Date(Date.UTC(2026, 2, 15));
const safe = utcDate.toISOString().split('T')[0]; // "2026-03-15"

// SAFE: manual formatting
const y = date.getFullYear();
const m = String(date.getMonth() + 1).padStart(2, '0');
const d = String(date.getDate()).padStart(2, '0');
const manual = `${y}-${m}-${d}`; // "2026-03-15"
```

### Convert External DD/MM Data Before Sending

```javascript
// Convert DD/MM/YYYY to ISO before API call
function ddmmToIso(ddmm) {
    const parts = ddmm.split(/[\/\-\.]/);
    if (parts.length !== 3) return null;
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

ddmmToIso('15/03/2026'); // → "2026-03-15"
ddmmToIso('15-03-2026'); // → "2026-03-15"
ddmmToIso('15.03.2026'); // → "2026-03-15"
```

### Never Use `toLocaleDateString()` for API Input

`toLocaleDateString()` produces locale-dependent output. In non-US locales, the output is in DD/MM format, which triggers this bug:

```javascript
// Locale-dependent — output format varies
date.toLocaleDateString('es-AR'); // "15/3/2026" → null (WEBSERVICE-BUG-2)
date.toLocaleDateString('pt-BR'); // "15/03/2026" → null (WEBSERVICE-BUG-2)
date.toLocaleDateString('en-US'); // "3/15/2026" → works (US format)

// SAFE — always use toISOString() for API input
date.toISOString().split('T')[0]; // "2026-03-15" → always works
```

---

## Proposed Fix

### Option A: Return a Validation Error for Unparseable Dates (Minimum Fix)

The server should return an error when a date string cannot be parsed, instead of silently storing null:

```
Current:  POST { Field7: "15/03/2026" } → 200 OK, Field7 = null
Fixed:    POST { Field7: "15/03/2026" } → 400 Bad Request
          { "error": "Invalid date format for Field7: '15/03/2026'.
            Use ISO 8601 (YYYY-MM-DD) or MM/DD/YYYY." }
```

Prevents silent data loss. Scripts fail immediately — developers discover the issue during development, not after deployment.

### Option B: Add DD/MM/YYYY Support to the Parser

Extend the server's date parser to recognize day-first formats:

- If first component > 12: must be DD/MM (unambiguous) — parse as day-first
- If first component ≤ 12: ambiguous — requires a tiebreaker policy (see [WEBSERVICE-BUG-3](ws-bug-3-ambiguous-dates.md))

Enables natural date formats for non-US developers, but ambiguous cases (day 1–12) still need a policy decision.

### Option C: Both — Validation + Extended Support (Recommended)

1. Add DD/MM support for unambiguous cases (day > 12)
2. Return a validation error for ambiguous all-numeric dates where the intent cannot be determined
3. Always accept ISO 8601 and US format without restriction
4. Optionally support a locale hint header for ambiguous cases

```
"15/03/2026" → parsed as March 15 (day > 12, unambiguous DD/MM)
"05/03/2026" → 400 error: "Ambiguous date format. Use ISO 8601 (YYYY-MM-DD)."
"2026-03-15" → parsed as March 15 (ISO 8601, always unambiguous)
"03/15/2026" → parsed as March 15 (MM/DD, current behavior preserved)
```

---

## Fix Impact Assessment

### What Changes If Fixed

- Scripts sending DD/MM dates with day > 12 either work correctly (Option B/C) or fail immediately with a clear error (Option A/C) — no more silent data loss
- Existing records are unaffected — null values already stored cannot be recovered
- API documentation should be updated to list supported date formats and recommended practices

### Backwards Compatibility Risk: LOW

There is no existing correct data to break. DD/MM dates are currently silently stored as null. Any fix either makes them work or makes them fail explicitly — both are improvements over silent data loss.

The only risk is scripts that have inadvertently adapted to the null behavior (e.g., checking for null dates and having a fallback). These scripts would see different behavior after the fix, but the original intent was clearly to store a date, not null.

### Regression Risk: LOW

The date parser change is isolated to the server's input normalization. The 20+ currently-accepted formats should be regression-tested to verify they still work identically. No other date processing is affected.
