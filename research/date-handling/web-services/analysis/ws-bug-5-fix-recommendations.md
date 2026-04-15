# WEBSERVICE-BUG-5: Fix Recommendations

## Workarounds

### Convert to ISO 8601 Before Sending

All affected formats can be converted to ISO 8601 (which the parser accepts) before sending to the API:

```javascript
// Compact ISO → ISO with separators
const compact = '20260315';
const iso = `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
// → "2026-03-15" (now accepted)

// Epoch → ISO date string
const epoch = 1773532800000;
const isoFromEpoch = new Date(epoch).toISOString().split('T')[0];
// → "2026-03-15" (now accepted)

// Epoch → full ISO datetime
const isoFull = new Date(epoch).toISOString();
// → "2026-03-15T00:00:00.000Z" (also accepted)

// Always send as a string, never as a number
const data = { Field7: isoFromEpoch };
```

### Validate Format Before Sending

```javascript
function isVvAcceptedFormat(value) {
    if (typeof value !== 'string') return false; // numbers not accepted
    if (/^\d{8}$/.test(value)) return false; // compact ISO
    if (/^\d{10,13}$/.test(value)) return false; // epoch
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return true; // ISO date
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(value)) return true; // US format
    return true; // let other formats through — server is flexible
}
```

---

## Proposed Fix

### Minimum: Return Validation Errors for Unrecognized Formats

Same approach as [WEBSERVICE-BUG-2](ws-bug-2-latam-data-loss.md) — the server should return a clear error instead of silently storing null:

```
Current:  POST { Field7: "20260315" }      → 200 OK, Field7 = null
Fixed:    POST { Field7: "20260315" }      → 400 Bad Request
          { "error": "Unrecognized date format for Field7. Use ISO 8601 (YYYY-MM-DD)." }
```

### Optional: Add Compact ISO and Epoch Support

If there is demand, the server parser could be extended to recognize:

- **Compact ISO** (`"20260315"`) → parse as `YYYYMMDD` → `"2026-03-15T00:00:00Z"`
- **Epoch milliseconds** (number or string) → `new Date(value).toISOString()` → ISO+Z

This is lower priority than [WEBSERVICE-BUG-2](ws-bug-2-latam-data-loss.md) (DD/MM support) because the affected population is smaller. The minimum viable fix is validation errors for unrecognized formats.

### Testing Recommendation

After the fix, verify all four formats either return an error or store correctly. If epoch support is added, test edge cases: negative epoch, epoch 0 (Unix epoch), epoch in seconds vs milliseconds, string epoch with leading zeros.

---

## Fix Impact Assessment

### What Changes If Fixed

- Scripts sending compact ISO or epoch values get an explicit error instead of silent data loss
- Optional: these formats become accepted inputs

### Backwards Compatibility Risk: NONE

These formats are currently silently discarded. There is no existing correct data created through them — only null values. Any change (error or acceptance) is an improvement.

### Regression Risk: LOW

The parser change only affects formats that currently produce null. All 20+ accepted formats are unaffected. Standard regression testing of the format tolerance matrix would verify no accepted format changed behavior.
