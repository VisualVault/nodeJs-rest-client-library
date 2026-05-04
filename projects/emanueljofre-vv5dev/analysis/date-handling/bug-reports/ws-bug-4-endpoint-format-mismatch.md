# WS-BUG-4: Two API endpoints store the same DB value but produce different Forms behavior

## Metadata

- **Environment:** EmanuelJofre on vv5dev — https://vv5dev.visualvault.com
- **Build / platform version:** progVersion `6.1.20260416.1` · formViewerBuild `20260418.1` · dbVersion `3041` (fingerprint `f36b65dd`)
- **Calendar pipeline:** Server-side architectural bug; not affected by V1/V2 forms toggle. Active on V2.
- **Browser / OS:** N/A on the API side; the divergence is observable when records are opened in any Forms UI browser.
- **User role:** Any developer or integration writing to the VV REST API + any user opening the resulting record.
- **Timezone:** Magnitude of shift = browser UTC offset on the form-open side.
- **Frequency:** Always (deterministic — endpoint choice is the trigger).
- **Severity:** **MEDIUM.** No data loss at the database layer. The architectural divergence is the root cause of [WS-BUG-1](ws-bug-1-cross-layer-shift.md) — `postForms` produces values that trigger the form's TZ shift; `forminstance/` does not.

## Summary

VisualVault provides two REST API endpoints for creating form records:

- **`postForms`** — the standard SDK endpoint (`vvClient.forms.postForms()`). Most scripts use this.
- **`forminstance/`** — an alternative endpoint on a separate FormsAPI server. No SDK wrapper; requires direct HTTP calls + separate FormsAPI registration of the form template.

Both endpoints accept identical inputs and write byte-for-byte identical values to the database — confirmed via column-by-column SQL comparison. The architectural difference is in how the server **serializes** the value when the Forms UI later requests it. `postForms`-written records come back with a Z suffix that the form's `parseDateString()` strips and re-interprets as local time (the [WS-BUG-1](ws-bug-1-cross-layer-shift.md) shift). `forminstance/`-written records come back without the Z suffix and display correctly.

Choosing which endpoint to use should be a developer preference — but it silently determines whether date+time values will be correct in the Forms UI.

## Steps to Reproduce

### Preconditions

- A script execution context with `vvClient` access.
- The Date Test Harness with FormsAPI registration (vv5dev EmanuelJofre has this).
- Browser system timezone set to any non-UTC zone (BRT used below).

### Test data

| Endpoint | Input | DB-stored | Forms-displayed (BRT) |
|---|---|---|---|
| `postForms` | `2026-03-15T14:30:00` | `2026-03-15 14:30:00.000` | 11:30 AM (shifted) |
| `forminstance/` | `2026-03-15T14:30:00` | `2026-03-15 14:30:00.000` (identical) | 02:30 PM (correct) |

### How to read Expected vs Actual

- **Expected:** Both endpoints produce records that display correctly in Forms (since they store the same DB value).
- **Actual:** Only `forminstance/` produces correct Forms display. `postForms` triggers [WS-BUG-1](ws-bug-1-cross-layer-shift.md) on first form open.

## Reproductions

### Reproduction A — Both endpoints, same DB value

1. Write via `postForms`:

```bash
node tools/runners/run-ws-test.js --action WS-1 --configs D --input-date 2026-03-15T14:30:00 --tz BRT --template-name "Date Test Harness"
```

2. Record A created. Note instanceName.
3. Write via `forminstance/` using the canonical pattern from [`research/forminstance-pattern/`](../../../../research/forminstance-pattern/) — same input.
4. Record B created. Different instanceName.
5. Compare DB rows via SQL or via the Custom Query `DateTest - All Records`.
6. **Observed:** Both rows have `Field5 = '2026-03-15 14:30:00.000'` — identical bytes.

### Reproduction B — Open both in Forms (BRT)

1. Open record A (postForms) in Forms UI. **Display:** 11:30 AM.
2. Open record B (forminstance/) in Forms UI. **Display:** 02:30 PM.

### Reproduction C — Inspect server response

1. Open browser DevTools Network tab. Open record A.
2. **Server response shows:** `"2026-03-15T14:30:00Z"` (Z suffix) for record A's field.
3. Open record B. **Server response shows:** `"2026-03-15T14:30:00"` (no Z) for record B's field.

## Concrete values by timezone

| Browser TZ | postForms display | forminstance/ display |
|---|---|---|
| BRT (UTC-3) | 11:30 AM | 02:30 PM |
| IST (UTC+5:30) | 8:00 PM | 02:30 PM |
| UTC | 02:30 PM | 02:30 PM |

`forminstance/` is correct in all TZs. `postForms` is correct only at UTC.

## Workaround

1. **Use `forminstance/` for any record that will be opened in Forms.** This is the canonical workaround for [WS-BUG-1](ws-bug-1-cross-layer-shift.md). See [`research/forminstance-pattern/`](../../../../research/forminstance-pattern/) for the implementation pattern.
2. **Audit existing `postForms` callers** that target DateTime fields. Migrate to `forminstance/` where the records are user-edited downstream.
3. **For new integrations**, default to `forminstance/` for any form template that will be opened in the UI.

## Status / Test evidence

- **Confirmed on V2** via differential testing of the two endpoints + Cat-10 cross-layer entries.
- **WS regression baseline (2026-05-04):** WS-1 (postForms) and WS-3 (round-trip) baselined; `forminstance/` differential covered in `research/forminstance-pattern/`.
- **Research doc:** [`research/date-handling/web-services/analysis/ws-bug-4-endpoint-format-mismatch.md`](../../../../research/date-handling/web-services/analysis/ws-bug-4-endpoint-format-mismatch.md) + [fix recommendations](../../../../research/date-handling/web-services/analysis/ws-bug-4-fix-recommendations.md).
- **Forminstance pattern**: [`research/forminstance-pattern/`](../../../../research/forminstance-pattern/) — full implementation + testing infrastructure.

## References

- Catalog entry: [v2-bugs-catalog.md § C.4](../v2-bugs-catalog.md)
- Direct user-visible impact: [ws-bug-1-cross-layer-shift.md](ws-bug-1-cross-layer-shift.md) — the form-side shift this architectural divergence triggers
- Forms-side trigger: [bug-1-timezone-stripping.md](bug-1-timezone-stripping.md) — `parseDateString()` strips Z from `postForms`-served values
