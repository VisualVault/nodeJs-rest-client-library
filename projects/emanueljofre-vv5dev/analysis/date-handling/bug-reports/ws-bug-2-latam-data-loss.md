# WS-BUG-2: Dates in DD/MM/YYYY format silently discarded by the API

## Metadata

- **Environment:** EmanuelJofre on vv5dev — https://vv5dev.visualvault.com
- **Build / platform version:** progVersion `6.1.20260416.1` · formViewerBuild `20260418.1` · dbVersion `3041` (fingerprint `f36b65dd`)
- **Calendar pipeline:** Server-side bug; not affected by V1/V2 forms toggle. Active on V2.
- **Browser / OS:** N/A — bug is in the server's API parser.
- **User role:** Any developer or integration writing to the VV REST API.
- **Timezone:** Not TZ-dependent.
- **Frequency:** Always (deterministic when the input is DD/MM/YYYY with day ≥ 13).
- **Severity:** **HIGH.** Silent data loss — API returns 200, record is created, date field is `null`. No error is logged.

## Summary

When a developer script sends a date in day-first format with day ≥ 13 — for example `"15/03/2026"` for March 15, 2026 — the VV REST API parser fails to recognize the format. The HTTP response is 200 OK, the record is created with all non-date fields intact, but the date column is `null`. No error is returned to the caller, no warning is logged.

This affects all three common DD/MM separator variants: slashes (`"15/03/2026"`), dashes (`"15-03-2026"`), and dots (`"15.03.2026"`). Day-first dates with a spelled-out month name (`"15 March 2026"`, `"15-Mar-2026"`) are NOT affected — the parser handles those.

The companion bug [WS-BUG-3](ws-bug-3-ambiguous-dates.md) covers the case where day ≤ 12: the parser silently misinterprets the input as MM/DD and stores the wrong date instead of `null`.

The bug is server-side (the parser inside `postForms`), so it applies identically on V1 and V2 environments.

## Steps to Reproduce

### Preconditions

- A script execution context with `vvClient` access (Node.js or the WS test harness on vv5dev).
- A form with a date or DateTime field. The Date Test Harness is used here; both date-only (Configs A, B) and DateTime (Configs C, D) fields exhibit identical behavior for this bug.

### Test data

| Slot | Config | API input | Stored | Notes |
|---|---|---|---|---|
| WS-5 LATAM1 | A | `"15/03/2026"` | `null` | Slashes — silently discarded |
| WS-5 LATAM2 | A | `"15-03-2026"` | `null` | Dashes — same |
| WS-5 LATAM3 | A | `"15.03.2026"` | `null` | Dots — same |

### How to read Expected vs Actual

- **Expected:** API rejects the request with a parse error (HTTP 400) OR successfully parses as DD/MM and stores March 15.
- **Actual:** API returns 200 with `null` stored for the date field. Caller has no signal that anything went wrong.

## Reproductions

### Reproduction A — DD/MM via `postForms`

1. Run the WS test harness:

```bash
node tools/runners/run-ws-test.js --action WS-5 --configs A --input-date "15/03/2026" --template-name "Date Test Harness"
```

2. **Observed response:** `"status": "Success"`, record created, but the field's stored value is `null`.

### Reproduction B — Equivalent valid input

1. Same harness, but with `--input-date "2026-03-15"` (ISO).
2. **Observed:** Field correctly stores March 15.

### Reproduction C — Spelled month is parsed correctly (control)

1. `--input-date "15 March 2026"` or `"15-Mar-2026"`.
2. **Observed:** Field stores March 15. Day-first with spelled month is fine.

## Concrete values by timezone

Not TZ-dependent. Same null result in any TZ.

## Workaround

1. **Always use ISO format for API writes.** `"2026-03-15"` parses unambiguously and is server-time-zone-stable.
2. **Pre-validate before sending.** Reject DD/MM-formatted strings at the integration boundary before they reach `postForms`.
3. **Audit existing scripts.** Search for any code path that constructs dates from user input or external CSVs without normalizing to ISO first — these are vulnerable.
4. **For LATAM/EU customers**, document the API write contract clearly so integration partners don't lose data silently.

## Status / Test evidence

- **Confirmed on V2** via WS-5 regression on `f36b65dd` (2026-05-04). All three separator variants stored `null`.
- **Test slots:** `ws-5-a-latam1`, `ws-5-a-latam2`, `ws-5-a-latam3`, `ws-5-c-latam1`, `ws-5-c-latam2` (and parallel C/D config siblings).
- **WS regression baseline:** 33 WS-5 slots PASS — V2 expected encodes the bug behavior.
- **Research doc:** [`research/date-handling/web-services/analysis/ws-bug-2-latam-data-loss.md`](../../../../research/date-handling/web-services/analysis/ws-bug-2-latam-data-loss.md) + [fix recommendations](../../../../research/date-handling/web-services/analysis/ws-bug-2-fix-recommendations.md).

## References

- Catalog entry: [v2-bugs-catalog.md § C.2](../v2-bugs-catalog.md)
- Companion bug: [ws-bug-3-ambiguous-dates.md](ws-bug-3-ambiguous-dates.md) — DD/MM with day ≤ 12 silently swaps to MM/DD instead of nulling
- Related: [ws-bug-5-silent-null-formats.md](ws-bug-5-silent-null-formats.md) — other formats also stored as `null` without error
