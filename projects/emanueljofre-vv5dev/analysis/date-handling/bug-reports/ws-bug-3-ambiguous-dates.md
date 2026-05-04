# WS-BUG-3: Ambiguous dates silently stored with month and day swapped

## Metadata

- **Environment:** EmanuelJofre on vv5dev — https://vv5dev.visualvault.com
- **Build / platform version:** progVersion `6.1.20260416.1` · formViewerBuild `20260418.1` · dbVersion `3041` (fingerprint `f36b65dd`)
- **Calendar pipeline:** Server-side bug; not affected by V1/V2 forms toggle. Active on V2.
- **Browser / OS:** N/A — server-side parser.
- **User role:** Any developer or integration writing to the VV REST API.
- **Timezone:** Not TZ-dependent.
- **Frequency:** Always (deterministic when the input is DD/MM with day ≤ 12).
- **Severity:** **HIGH.** Silent wrong-data — record is created with a plausible-but-incorrect date.

## Summary

When a script sends a date like `"05/03/2026"` to the VV REST API, intending **March 5** (DD/MM convention used in Latin America and Europe), the server silently stores **May 3** (reading it as MM/DD, US convention). No error is returned. No warning is logged.

This is the companion to [WS-BUG-2](ws-bug-2-latam-data-loss.md). Together they cover the full range of outcomes when a non-US date format is sent to the API:

| Day in date | DD/MM input example | Server behavior | Bug |
|---|---|---|---|
| 13–31 | `"15/03/2026"` | Cannot parse → `null` | WS-BUG-2 |
| 1–12 | `"05/03/2026"` | Parses as MM/DD → **wrong date** (May 3) | **This bug** |

WS-BUG-3 is the more dangerous of the two because the record looks complete and the date looks valid — only someone who knows the original intended value can spot the error. Detection requires manual review.

## Steps to Reproduce

### Preconditions

- A script execution context with `vvClient` access (Node.js or the WS test harness on vv5dev).
- A form with a date or DateTime field — Date Test Harness suffices.

### Test data

| Slot | API input | Intended | Stored |
|---|---|---|---|
| WS-5 ambig 1 | `"05/03/2026"` (DD/MM intent: March 5) | March 5 | May 3 |
| WS-5 ambig 2 | `"05-03-2026"` | March 5 | May 3 |
| WS-5 ambig 3 | `"05.03.2026"` | March 5 | May 3 |
| Control | `"5 March 2026"` (spelled month) | March 5 | March 5 (correct) |

### How to read Expected vs Actual

- **Expected:** API rejects the ambiguous input OR uses customer-Culture-aware parsing.
- **Actual:** API always reads as MM/DD regardless of customer Culture, silently misinterpreting any DD/MM value with day ≤ 12.

## Reproductions

### Reproduction A — DD/MM with day ≤ 12 silently swaps

1. Run the WS test harness:

```bash
node tools/runners/run-ws-test.js --action WS-5 --configs A --input-date "05/03/2026" --template-name "Date Test Harness"
```

2. **Observed:** `"status": "Success"`, record created. Stored value: `2026-05-03` (May 3) instead of `2026-03-05` (March 5).

### Reproduction B — Boundary verification

1. Vary the day across 1–12 (all swap) and 13–31 (all become null per [WS-BUG-2](ws-bug-2-latam-data-loss.md)).
2. **Observed:** Day 1–12 always parses as month; day 13–31 always nulls. Boundary is at 13.

### Reproduction C — Spelled month works (control)

1. `--input-date "5 March 2026"`.
2. **Observed:** Stores March 5 correctly.

## Concrete values by timezone

Not TZ-dependent.

## Workaround

1. **Always use ISO format for API writes.** `"2026-03-05"` is unambiguous.
2. **Spelled month names** also work: `"5 March 2026"`, `"05-Mar-2026"`.
3. **Pre-validate at the integration boundary.** Detect ambiguous DD/MM inputs and convert to ISO before calling the API.
4. **For LATAM/EU customer integrations** with day-first source data, normalize to ISO at the import step — never pass DD/MM directly through.

## Status / Test evidence

- **Confirmed on V2** via WS-5 regression on `f36b65dd` (2026-05-04).
- **Test slots:** `ws-5-a-latam1` through `ws-5-a-latam3`, `ws-5-c-latam1`, `ws-5-c-latam2` — encoded with the silently-swapped expected values.
- **Research doc:** [`research/date-handling/web-services/analysis/ws-bug-3-ambiguous-dates.md`](../../../../research/date-handling/web-services/analysis/ws-bug-3-ambiguous-dates.md) + [fix recommendations](../../../../research/date-handling/web-services/analysis/ws-bug-3-fix-recommendations.md).

## References

- Catalog entry: [v2-bugs-catalog.md § C.3](../v2-bugs-catalog.md)
- Companion: [ws-bug-2-latam-data-loss.md](ws-bug-2-latam-data-loss.md) — DD/MM with day ≥ 13 nulls instead of swapping
- Related: [v2-typed-mm-overflow.md](v2-typed-mm-overflow.md) — Forms layer has its own MM-overflow bug for typed input
