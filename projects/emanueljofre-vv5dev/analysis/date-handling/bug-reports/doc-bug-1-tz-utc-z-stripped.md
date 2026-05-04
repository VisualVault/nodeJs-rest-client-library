# DOC-BUG-1: Document Library index field — TZ offset converted to UTC, Z stripped

## Metadata

- **Environment:** EmanuelJofre on vv5dev — https://vv5dev.visualvault.com
- **Build / platform version:** progVersion `6.1.20260416.1` · formViewerBuild `20260418.1` · dbVersion `3041` (fingerprint `f36b65dd`)
- **Calendar pipeline:** Document Library API; not affected by V1/V2 forms toggle. Active on V2.
- **Browser / OS:** N/A — server-side.
- **User role:** Any developer or integration writing dates to document index fields via the API.
- **Timezone:** Inputs with explicit TZ offsets affected; magnitude of conversion = offset value.
- **Frequency:** Always (deterministic when input has a TZ marker).
- **Severity:** **HIGH.** Stored value is timezone-ambiguous — consumers cannot tell whether `"2026-03-15T17:30:00"` is UTC or local. No metadata signals that conversion happened.

## Summary

When a script writes a TZ-aware datetime to a document library index field — e.g., `"2026-03-15T14:30:00-03:00"` (BRT 14:30) — the document API does two things silently:

1. Converts to UTC: `14:30 - (-03:00) = 17:30`
2. Strips the Z suffix from the result

The stored value is `2026-03-15T17:30:00` — a timezone-ambiguous local-looking string that's actually UTC. Scripts reading this value have no way to know it represents UTC. If they treat it as local time, they display the wrong time. If they convert from UTC, they're correct — but only if every value was written with an offset. Values written as naive datetimes (`"2026-03-15T14:30:00"`) are stored as-is, with no conversion. The same column accumulates UTC-without-Z and local-without-Z values mixed together.

Index field configuration has no per-field TZ flags (no `ignoreTimezone`, no `useLegacy`) — there is no way to opt out of the conversion or signal which storage convention each row uses.

The bug also extends to query semantics (confirmed 2026-04-24 via DOC-7): consumers must filter on the server-converted UTC value, not the original offset they wrote. Filtering on the original offset misses records.

## Steps to Reproduce

### Preconditions

- An authenticated user account on EmanuelJofre / vv5dev.
- The vv5dev test folder `/zzz-date-tests` with a `Date` index field assigned (provisioned via `node tools/admin/setup-doc-test-assets.js --project emanueljofre-vv5dev`).
- A test document `zzz-date-test-doc` (documentId `3b0b0f37-e83f-f111-8313-9bb7e317217d`).

### Test data

| Slot | API input | Stored | Notes |
|---|---|---|---|
| `doc-2-brt-offset` | `"2026-03-15T14:30:00-03:00"` | `2026-03-15T17:30:00` | Converted UTC, Z stripped |
| `doc-2-ist-offset` | `"2026-03-15T14:30:00+05:30"` | `2026-03-15T09:00:00` | Converted UTC, Z stripped |
| `doc-2-z-strip` | `"2026-03-15T14:30:00Z"` | `2026-03-15T14:30:00` | Z stripped |
| `doc-2-no-z-resp` | `"2026-03-15T14:30:00"` | `2026-03-15T14:30:00` | Stored as-is (no marker — ambiguous storage) |
| `doc-7-query-offset-val` | Query with offset value | Misses records | Filter must use server's converted UTC |

### How to read Expected vs Actual

- **Expected:** Either the API returns the value with its Z suffix preserved (so consumers know it's UTC), or it preserves the input format with offset, so consumers know the source.
- **Actual:** All TZ-aware inputs are silently converted to UTC and stored without any marker. Naive inputs are stored as-is. The same column ends up with UTC-without-Z values next to local-without-Z values, indistinguishable.

## Reproductions

### Reproduction A — Offset converted, Z stripped

1. Set the `Date` index field on `zzz-date-test-doc` to `"2026-03-15T14:30:00-03:00"` via:

```javascript
vvClient.docs.putDocumentIndexFields({
  documentId: '3b0b0f37-e83f-f111-8313-9bb7e317217d',
  indexFields: JSON.stringify({ 'Date': '2026-03-15T14:30:00-03:00' })
});
```

2. Read back: `vvClient.docs.getDocumentIndexFields(documentId)`.
3. **Observed:** `"value": "2026-03-15T17:30:00"` — converted to UTC (added 3 hours), Z stripped.

### Reproduction B — Z input loses Z

1. Same setup, write `"2026-03-15T14:30:00Z"`.
2. **Observed:** `"value": "2026-03-15T14:30:00"` — Z is gone. The value is UTC but consumers can't tell.

### Reproduction C — Mixed storage in the same field

1. Write `"2026-03-15T14:30:00-03:00"` to one document → stored `"2026-03-15T17:30:00"` (UTC).
2. Write `"2026-03-15T14:30:00"` to another document → stored `"2026-03-15T14:30:00"` (local-as-is).
3. Both rows in the same column. They look identical (`2026-03-15T...`). They mean different things.

### Reproduction D — Query with offset misses records

1. After Reproduction A, query for the offset-input value: `q: "[Date] eq '2026-03-15T14:30:00-03:00'"`.
2. **Observed:** No match. The stored value is `2026-03-15T17:30:00` (UTC) — the offset form doesn't match.
3. Query with `[Date] eq '2026-03-15T17:30:00'` finds it.

## Concrete values by timezone

| Input | Stored |
|---|---|
| `"2026-03-15T14:30:00-03:00"` (BRT) | `"2026-03-15T17:30:00"` |
| `"2026-03-15T14:30:00+05:30"` (IST) | `"2026-03-15T09:00:00"` |
| `"2026-03-15T14:30:00Z"` (UTC) | `"2026-03-15T14:30:00"` |
| `"2026-03-15T14:30:00"` (naive) | `"2026-03-15T14:30:00"` (stored as local) |
| `"2026-03-15"` (date-only ISO) | `"2026-03-15T00:00:00"` (T00:00:00 appended) |

## Workaround

1. **Always write naive datetimes.** Strip the offset before sending: store local time without TZ marker. Document the storage convention so all consumers interpret it the same way.
2. **Always write Z-suffixed UTC.** Convert all inputs to UTC at the integration boundary. The Z is stripped on storage, but at least the convention is uniform.
3. **Use DateTime + write-time-converted approach.** Queries must use the server-converted form.
4. **Audit existing data.** If both naive-local and converted-UTC values coexist in the same field, run a one-time migration to normalize.

## Status / Test evidence

- **Confirmed on V2** via DOC-1, DOC-2, DOC-7 baselines on `f36b65dd` — 40/40 PASS.
- **Test slots:** `doc-1-*`, `doc-2-*`, `doc-7-*`. DOC-7 (2026-04-24) extended the bug coverage to query semantics.
- **Research doc:** [`research/date-handling/document-library/analysis/overview.md § DOC-BUG-1`](../../../../research/date-handling/document-library/analysis/overview.md#doc-bug-1-timezone-offset-silently-converted--z-stripped).

## References

- Catalog entry: [v2-bugs-catalog.md § C.8](../v2-bugs-catalog.md)
- Companion: [doc-bug-2-cannot-clear.md](doc-bug-2-cannot-clear.md) — separate issue with clearing the field
