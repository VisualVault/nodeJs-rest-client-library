# WS-BUG-5: Compact ISO and epoch timestamp formats silently discarded by the API

## Metadata

- **Environment:** EmanuelJofre on vv5dev — https://vv5dev.visualvault.com
- **Build / platform version:** progVersion `6.1.20260416.1` · formViewerBuild `20260418.1` · dbVersion `3041` (fingerprint `f36b65dd`)
- **Calendar pipeline:** Server-side bug; not affected by V1/V2 forms toggle. Active on V2.
- **Browser / OS:** N/A — server-side parser.
- **User role:** Any developer or integration writing to the VV REST API.
- **Timezone:** Not TZ-dependent.
- **Frequency:** Always (deterministic for the four affected formats).
- **Severity:** **MEDIUM.** Silent data loss — API returns 200, record created, date field is `null`. No error.

## Summary

Several technically-valid or widely-used date representations are silently accepted by the VV REST API (HTTP 200, record created) but stored as `null` for the date field. The API returns success, the record is created with all non-date fields intact, and the date field is empty. No error, no warning.

The affected formats:

| Format | Example | Common source |
|---|---|---|
| Compact ISO 8601 | `"20260315"` | Machine-generated IDs, log timestamps, healthcare (HL7), banking APIs |
| Inverted ISO | `"2026-15-03"` | Malformed input, copy-paste errors |
| Epoch milliseconds (number) | `1773532800000` | JavaScript `Date.getTime()`, Unix systems, message queues |
| Epoch milliseconds (string) | `"1773532800000"` | JSON serialization of epoch values |

## Steps to Reproduce

### Preconditions

- A script execution context with `vvClient` access.
- A form with a date or DateTime field (Date Test Harness suffices).

### Test data

| Slot | API input | Stored |
|---|---|---|
| `ws-5-a-comp` | `"20260315"` (compact ISO) | `null` |
| `ws-5-a-yd` (or `iso-yd`) | `"2026-15-03"` (inverted) | `null` |
| `ws-5-d-epoch` | `1773543600000` (number) | `null` |
| `ws-5-d-epochs` | `"1773543600000"` (string) | `null` |
| `ws-5-d-dotnet` | `/Date(1773543600000)/` (.NET) | (varies — sometimes parsed, sometimes null) |

### How to read Expected vs Actual

- **Expected:** API rejects the format with a parse error OR successfully parses to the equivalent date.
- **Actual:** API returns 200; field stored as `null`. Caller has no signal.

## Reproductions

### Reproduction A — Compact ISO

1. WS test harness:

```bash
node tools/runners/run-ws-test.js --action WS-5 --configs A --input-date "20260315" --template-name "Date Test Harness"
```

2. **Observed:** Record created with `Field7 = null`.

### Reproduction B — Epoch number

1. Same harness, but pass an epoch:

```bash
node tools/runners/run-ws-test.js --action WS-5 --configs D --input-date "1773543600000" --template-name "Date Test Harness"
```

2. **Observed:** Record created with `Field5 = null`.

### Reproduction C — Equivalent normalized format works

1. ISO with separators: `"2026-03-15"` → stores correctly.
2. ISO from epoch: `"new Date(1773543600000).toISOString()"` → produces `"2026-03-15T00:00:00.000Z"` → stores correctly.

## Concrete values by timezone

Not TZ-dependent. Same `null` result in any TZ.

## Workaround

1. **Always normalize inputs to ISO before sending.** Convert epoch with `new Date(epoch).toISOString()`. Convert compact ISO with `\`${str.slice(0,4)}-${str.slice(4,6)}-${str.slice(6,8)}\``.
2. **Pre-validate at the integration boundary.** Reject the four affected formats and surface the error to the caller.
3. **Audit data pipelines that emit machine-formatted dates** (log timestamps, message queue payloads) — they likely use one of the affected formats.

## Status / Test evidence

- **Confirmed on V2** via WS-5 regression on `f36b65dd` (2026-05-04).
- **Test slots:** `ws-5-a-comp`, `ws-5-a-iso` variants, `ws-5-d-epoch`, `ws-5-d-epochs`, `ws-5-d-dotnet` — encoded with `null` expected values.
- **Research doc:** [`research/date-handling/web-services/analysis/ws-bug-5-silent-null-formats.md`](../../../../research/date-handling/web-services/analysis/ws-bug-5-silent-null-formats.md) + [fix recommendations](../../../../research/date-handling/web-services/analysis/ws-bug-5-fix-recommendations.md).

## References

- Catalog entry: [v2-bugs-catalog.md § C.5](../v2-bugs-catalog.md)
- Companion: [ws-bug-2-latam-data-loss.md](ws-bug-2-latam-data-loss.md), [ws-bug-3-ambiguous-dates.md](ws-bug-3-ambiguous-dates.md) — other classes of silent API parse failures
- Forms-side parallel: [v2-epoch-preserved.md](v2-epoch-preserved.md) — the Forms `SetFieldValue` API has its own epoch-handling regression in V2
