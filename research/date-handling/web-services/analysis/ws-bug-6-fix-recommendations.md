# WEBSERVICE-BUG-6: Fix Recommendations

## Workarounds

### For API Writes: Always Send Date-Only Strings to Date-Only Fields

```javascript
// RECOMMENDED: date-only string — server normalizes to T00:00:00Z
const data = { Field7: '2026-03-15' };

// ALSO SAFE: explicit midnight
const data2 = { Field7: '2026-03-15T00:00:00' };

// AVOID: datetime with non-midnight time in a date-only field
const data3 = { Field7: '2026-03-15T14:30:00' };
// Server accepts this without error, creating query inconsistency
```

### For Queries: Always Use Range Instead of Exact Equality

```javascript
// UNRELIABLE for date-only fields:
const params = { q: "[Field7] eq '2026-03-15'" };
// Misses records with non-midnight time components

// RELIABLE for date-only fields:
const params2 = { q: "[Field7] ge '2026-03-15' AND [Field7] lt '2026-03-16'" };
// Catches all March 15 records regardless of time component
```

### For Scripts Reading Date-Only Fields: Extract Date Portion Only

```javascript
const apiValue = result.data.datafield7; // "2026-03-15T14:30:00Z"
const dateOnly = apiValue ? apiValue.split('T')[0] : null; // "2026-03-15"
// Use dateOnly for display, comparison, and write-back
```

### Accept That Forms-Created Records Have Mixed Time Components

Records created via the Forms popup, preset defaults, and "Current Date" will always have different time components. This is a client-side behavior that cannot be fixed through the API. The workarounds above ensure API-created records are consistent and that queries account for the existing inconsistency.

---

## Proposed Fix

### Option A: Server-Side Normalization for Date-Only Fields (Recommended Long-Term)

When writing to a field with `enableTime=false`, the server normalizes the stored value to UTC midnight, stripping any time component:

```
Input: "2026-03-15T14:30:00"  → field has enableTime=false
Stored: "2026-03-15T00:00:00Z"  (time stripped, normalized to midnight)
```

**Requirement**: The API layer must have access to field configuration metadata. Currently it does not — field properties are stored in the form template but not consulted during write operations. This is an architectural change.

**Pros**: Eliminates time-component inconsistency for all future API writes. Exact-equality queries become reliable.
**Cons**: Requires the API to read field metadata before writing. Does not fix existing records or Forms-created records with non-midnight times.

### Option B: Query-Layer Normalization (Pragmatic Short-Term)

Instead of fixing storage, fix the query layer. When filtering on a date-only field, the query engine compares only the date portion:

```sql
-- Current: compares full datetime (misses non-midnight records)
WHERE Field7 = '2026-03-15'

-- Fixed: compares date portion only for date-only fields
WHERE CAST(Field7 AS DATE) = '2026-03-15'
```

**Pros**: Fixes queries without changing storage. Works for existing data.
**Cons**: Requires query engine awareness of field metadata. May impact index performance. Does not fix the semantic ambiguity for API consumers.

### Option C: Both (Recommended)

1. **New writes**: Server normalizes date-only fields to midnight (Option A)
2. **Existing data**: Query layer compares date portion only for date-only fields (Option B)
3. **Forms-side**: The Forms UI already normalizes popup-entered dates to midnight — no change needed there

### Option D: Documentation Only (Minimum)

Document that date-only fields may contain arbitrary time components. Recommend range queries. No code change.

---

## Fix Impact Assessment

### What Changes If Fixed

- Date-only fields written via API always have a midnight time component
- Exact-equality queries work reliably on date-only fields (for new data; Option B for existing data)
- Scripts reading date-only fields always see midnight — no ambiguity about whether the time is meaningful

### Backwards Compatibility Risk

**HIGH for Option A**: Existing records have mixed time components. If the server normalizes new writes but queries are not updated, old and new records behave differently.

**LOW for Option B**: Query normalization is additive — it makes more records match, not fewer.

### Implementation Complexity

This is the most architecturally involved fix across the six web services bugs. It requires:

- Exposing field configuration metadata to the API write layer (currently isolated)
- Modifying the write path to consult field metadata per field
- Potentially modifying the query engine for date-only field awareness
- Regression testing across all components that read/write date fields

### No Practical Migration Path for Existing Data

The time components in existing records are artifacts of different write paths. The correct midnight value cannot be determined retroactively without knowing which path wrote each record. The recommended approach is to normalize going forward and use range queries for existing data.
