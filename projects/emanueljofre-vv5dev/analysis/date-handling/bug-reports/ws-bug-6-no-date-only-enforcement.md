# WS-BUG-6: Date-only fields accept and store time components, breaking queries

## Metadata

- **Environment:** EmanuelJofre on vv5dev — https://vv5dev.visualvault.com
- **Build / platform version:** progVersion `6.1.20260416.1` · formViewerBuild `20260418.1` · dbVersion `3041` (fingerprint `f36b65dd`)
- **Calendar pipeline:** Server-side bug; not affected by V1/V2 forms toggle. Active on V2.
- **Browser / OS:** N/A — server-side storage layer.
- **User role:** Any developer or integration writing to the VV REST API for a date-only field.
- **Timezone:** Different write paths produce different time components based on TZ (see table).
- **Frequency:** Always (deterministic per write path).
- **Severity:** **MEDIUM.** Silent inconsistency — same date-only field accumulates rows with different time components. Exact-match queries miss records.

## Summary

When a calendar field is configured as "date-only" (no time picker in the UI), the database column is still SQL Server `datetime` — there is no enforcement that the time component must be 00:00:00. Different write paths produce different time components for the same logical date:

| Write path | Stored value for "March 15, 2026" |
|---|---|
| User popup click on BRT browser | `2026-03-15 00:00:00.000` (midnight local) |
| "Current Date" default at form save (8 PM BRT) | `2026-03-15 23:01:57.000` (actual save time) |
| Preset default `03/01/2026` (BRT browser) | `2026-03-01 03:00:00.000` (BRT-midnight in UTC) |
| API `"2026-03-15"` (date-only string) | `2026-03-15 00:00:00.000` (midnight UTC) |
| API `"2026-03-15T14:30:00"` (with time) | `2026-03-15 14:30:00.000` (time accepted!) |
| User in Mumbai (IST) popup click | `2026-03-14 00:00:00.000` (wrong day per [FORM-BUG-7](bug-7-wrong-day-utc-plus.md)) |

All six rows are in the same date-only field. All represent "March 15" (or intend to). They have five different time components and one wrong date entirely.

A query like `[Field7] eq '2026-03-15'` cannot reliably find all of them. SQL `WHERE Field7 = '2026-03-15 00:00:00'` finds only the user-popup and ISO-date-only rows.

## Steps to Reproduce

### Preconditions

- A script execution context with `vvClient` access.
- The Date Test Harness with date-only Configs A or B.

### Test data

| Variant | API input | Stored |
|---|---|---|
| Date-only ISO | `"2026-03-15"` | `2026-03-15T00:00:00.000Z` |
| ISO with time | `"2026-03-15T14:30:00"` | `2026-03-15T14:30:00.000Z` (accepted!) |
| ISO with time + Z | `"2026-03-15T14:30:00Z"` | `2026-03-15T14:30:00.000Z` |
| Datetime offset | `"2026-03-15T14:30:00-03:00"` | `2026-03-15T17:30:00.000Z` (converted to UTC) |

### How to read Expected vs Actual

- **Expected:** Date-only fields accept only date inputs, OR strip the time component before storing.
- **Actual:** Server accepts arbitrary time components and stores them verbatim. The "date-only" concept exists in the Forms UI but not at the storage layer.

## Reproductions

### Reproduction A — Time component accepted on date-only field

1. WS test harness:

```bash
node tools/runners/run-ws-test.js --action WS-1 --configs A --input-date "2026-03-15T14:30:00" --template-name "Date Test Harness"
```

2. **Observed:** Record created. Field A's stored value: `2026-03-15T14:30:00.000Z` — time component preserved despite Config A being date-only.

### Reproduction B — Query mismatch

1. After Reproduction A, query for the date:

```javascript
vvClient.forms.getForms({ q: `[Field7] eq '2026-03-15'`, expand: true })
```

2. **Observed:** Behavior depends on the query layer's normalization. Date-only equality may match; exact-time equality (`[Field7] eq '2026-03-15T00:00:00.000Z'`) misses the row.

### Reproduction C — TZ-offset converted

1. Input: `"2026-03-15T14:30:00-03:00"` (BRT explicit offset).
2. **Observed:** Stored as `2026-03-15T17:30:00.000Z` — converted to UTC.

## Concrete values by timezone

The TZ component of stored values varies by write path; the bug is not directly TZ-dependent on the API side, but the **interaction** with TZ-aware fields produces inconsistent storage. See the summary table at the top.

## Workaround

1. **Always normalize date-only inputs to `YYYY-MM-DD`** at the integration boundary, before calling the API. Strip any time component.
2. **Server-side validation script.** A pre-save hook can detect date-only field writes with non-midnight time components and either reject or normalize.
3. **Use a date-range query** instead of equality. `[Field7] ge '2026-03-15' AND [Field7] lt '2026-03-16'` matches all rows for that date regardless of time component.
4. **Audit existing date-only field data.** Run a scan to identify records with non-zero time components — these may be migration artifacts or integration bugs.

## Status / Test evidence

- **Confirmed on V2** via WS-1, WS-5 regression on `f36b65dd` (2026-05-04).
- **Test slots:** various WS-1 entries with DateTime-formatted inputs into date-only configs.
- **Research doc:** [`research/date-handling/web-services/analysis/ws-bug-6-no-date-only-enforcement.md`](../../../../research/date-handling/web-services/analysis/ws-bug-6-no-date-only-enforcement.md) + [fix recommendations](../../../../research/date-handling/web-services/analysis/ws-bug-6-fix-recommendations.md).

## References

- Catalog entry: [v2-bugs-catalog.md § C.6](../v2-bugs-catalog.md)
- Related TZ-shift bug: [bug-7-wrong-day-utc-plus.md](bug-7-wrong-day-utc-plus.md) — UTC+ users compound this with day shifts on date-only fields
- Related Forms parallel: [v2-utcmidnight.md](v2-utcmidnight.md) — Forms-side date-only fields gained `T00:00:00.000Z` storage in V2
