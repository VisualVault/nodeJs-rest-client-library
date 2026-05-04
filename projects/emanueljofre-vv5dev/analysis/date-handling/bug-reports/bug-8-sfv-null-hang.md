# FORM-BUG-8: `SetFieldValue(field, '' | null)` hangs indefinitely

## Metadata

- **Environment:** EmanuelJofre on vv5dev — https://vv5dev.visualvault.com
- **Build / platform version:** progVersion `6.1.20260416.1` · formViewerBuild `20260418.1` · dbVersion `3041` (fingerprint `f36b65dd`)
- **Calendar pipeline:** V2 (`useUpdatedCalendarValueLogic = true`, Database scope)
- **Browser / OS:** Browser-agnostic. Confirmed on Chromium under macOS via Playwright.
- **User role:** Any authenticated context that runs script with access to `VV.Form.SetFieldValue`.
- **Timezone:** Bug is not TZ-dependent.
- **Frequency:** Always (deterministic when SFV is called with `''` or `null`).
- **Severity:** **MEDIUM.** No data corruption, but the calling script stalls indefinitely. In production this manifests as a frozen form, a stuck workflow, or a never-resolving Promise that prevents subsequent script logic from executing.

## Summary

Calling `VV.Form.SetFieldValue(fieldName, '')` or `VV.Form.SetFieldValue(fieldName, null)` on the V2 calendar pipeline never returns. The browser `page.evaluate` (or in-form async script) remains pending forever — there is no error, no timeout from the platform, no return value. The only escape is the caller's own deadline.

This is a regression in V2's async continuation logic. The setter waits for a non-empty transformed value that never arrives, and the awaited promise resolves only when a real value enters the pipeline. Empty-string and null inputs short-circuit the transform but don't signal completion, leaving the awaited promise hanging.

The bug manifests in three production patterns:

1. Form scripts that conditionally clear a date field: `if (someCondition) SetFieldValue(date, '')` — the script stalls.
2. Workflow steps that "reset" a calendar field after copying its value elsewhere.
3. URL-driven flows that pass empty query parameters which a form-init script then forwards to SFV.

## Steps to Reproduce

### Preconditions

- An authenticated user account on EmanuelJofre / vv5dev.
- The `Date Test Harness` form open with one or more calendar fields. Configs A, C, and D are confirmed; the bug likely affects all configs.
- Browser console open (or any script-execution context).

### Test data

| Variant | SFV input | Expected | Observed |
|---|---|---|---|
| Empty string | `''` | Field cleared, SFV resolves | Promise never resolves |
| Null | `null` | Field cleared, SFV resolves | Promise never resolves |
| Whitespace | `' '` | Field cleared, SFV resolves | (not yet swept; expected to hang) |

### How to read Expected vs Actual

- **Expected:** `await VV.Form.SetFieldValue(field, '')` resolves promptly (within tens of milliseconds), leaving the field with an empty/cleared value.
- **Actual:** The await never completes. From the script's perspective, the call hangs indefinitely.

## Reproductions

### Reproduction A — Empty string SFV on Config A

1. Open the Date Test Harness on https://vv5dev.visualvault.com.
2. In the browser console: `(async () => { console.time('sfv'); await VV.Form.SetFieldValue('Field7', ''); console.timeEnd('sfv'); })()`
3. **Observed:** No `sfv:` timing log appears. The promise stays pending.
4. To unblock the console, manually navigate away or close the form.

### Reproduction B — Null SFV on Config D

1. Same form, Config D field — `Field5` / `dateTimeLocalV2Empty`.
2. Console: `(async () => { console.time('sfv'); await VV.Form.SetFieldValue('Field5', null); console.timeEnd('sfv'); })()`
3. **Observed:** Same as Reproduction A — never resolves.

### Reproduction C — Productionized guard with `Promise.race`

1. The cat-12 spec demonstrates the workaround pattern. From the spec:

```javascript
const result = await Promise.race([
    VV.Form.SetFieldValue(field, ''),
    new Promise(resolve => setTimeout(() => resolve({sfvHung: true}), 8000))
]);
```

2. **Observed:** `result === {sfvHung: true}` — the timeout fires; the underlying SFV promise is still pending in the background.

## Concrete values by timezone

Not TZ-dependent. Hangs identically across BRT, IST, UTC.

## Workaround

1. **Guard SFV calls with a deadline.** Use `Promise.race` against a `setTimeout` for any code path that may pass empty/null. Recommended deadline: 10–15 seconds.
2. **Avoid empty/null inputs entirely.** If a field needs to be cleared, use a non-SFV mechanism — direct partition write (`VV.Form.VV.FormPartition.setValueObjectValue(field, '')`) or DOM clearing.
3. **Defensive pre-check.** Before calling SFV, validate that the value is non-empty: `if (val == null || val === '') return; await SetFieldValue(field, val);`

## Status / Test evidence

- **First confirmed:** 2026-04-20 on build `20260418.1` — 4 cat-12 edge-case tests timed out before the spec was instrumented with a guard.
- **Test slots:** `12-empty-config-a`, `12-empty-config-c`, `12-empty-value`, `12-null-input` — all now PASS via the guard pattern (the V2-sibling expected values are `__FORM-BUG-8__` sentinels, so the guarded outcome is a deterministic bug-confirmed PASS).
- **Spec:** [`testing/specs/date-handling/cat-12-edge-cases.spec.js:53-83`](../../../../testing/specs/date-handling/cat-12-edge-cases.spec.js#L53-L83) — guard documentation in code.
- **Research doc:** None yet — entry only in [`docs/reference/form-fields.md § Known Bugs`](../../../../docs/reference/form-fields.md#known-bugs-calendar-field).
- **Root cause:** Hypothesized async-continuation in the V2 pipeline waiting for a transformed non-empty value. RCA blocked behind the cat-12 guard work that made the symptom non-fatal.

## References

- Catalog entry: [v2-bugs-catalog.md § A.2](../v2-bugs-catalog.md)
- Related: [v2-config-d-typed-empty.md](v2-config-d-typed-empty.md) — Config D typed input has its own V2 silent-loss bug, distinct from this SFV hang.
- Note: A previous bug also called `FORM-BUG-8` (a `getCalendarFieldValue()` `RangeError` on Config C via URL params) was withdrawn 2026-04-10 after the root cause was traced to a missing `enableQListener=true` template flag — not a platform bug. The current `FORM-BUG-8` is the SFV-null hang documented here.
