# FORM-BUG-V2-EPOCH-PRESERVED: Epoch-ms input preserved as numeric string instead of normalized to date

## Metadata

- **Environment:** EmanuelJofre on vv5dev — https://vv5dev.visualvault.com
- **Build / platform version:** progVersion `6.1.20260416.1` · formViewerBuild `20260418.1` · dbVersion `3041` (fingerprint `f36b65dd`)
- **Calendar pipeline:** V2 (`useUpdatedCalendarValueLogic = true`, Database scope)
- **Browser / OS:** Browser-agnostic. Confirmed on Chromium under macOS via Playwright.
- **User role:** Any authenticated context that runs script with access to `VV.Form.SetFieldValue`.
- **Timezone:** Confirmed BRT; not TZ-dependent at the bug's root.
- **Frequency:** Always (deterministic when SFV input is a numeric epoch).
- **Severity:** **MEDIUM.** The stored value parses as `NaN` in downstream consumers, breaking date arithmetic and display logic.

## Summary

When a script calls `VV.Form.SetFieldValue(field, <epoch-ms>)` — e.g., `SetFieldValue('Field7', 1773543600000)` — the V2 calendar pipeline preserves the stringified numeric epoch (`"1773543600000"`) as the stored value. Both the partition raw value and `GetFieldValue()` return that epoch string. Downstream code that does `Date.parse(gfv)` produces `NaN`, because `Date.parse` does not accept numeric epoch strings as input.

Production scripts that compute a date with `Date.now()` or `someDate.getTime()` and pass the resulting number to SFV — without an explicit `new Date(epoch).toISOString()` conversion — silently break under V2. The Form Designer accepts the input, the field's display may render as Invalid Date or empty, and the API returns the epoch string instead of a parseable date.

## Steps to Reproduce

### Preconditions

- An authenticated user account on EmanuelJofre / vv5dev.
- The `Date Test Harness` form open with Config A (`dateTzAwareV2Empty`) and Config C (`dateTimeUtcV2Empty`) fields.
- Browser console open.

### Test data

| Slot | Config | SFV input (number) | Stored raw (V2) | Stored API (V2) |
|---|---|---|---|---|
| `7-A-epoch.V2` | A (date-only) | `1773543600000` | `"1773543600000"` | `"1773543600000"` |
| `7-C-epoch.V2` | C (DateTime) | `1773543600000` | `"1773543600000"` | `"1773543600000"` |

`1773543600000` is the Unix milliseconds value for BRT-midnight on March 15, 2026.

### How to read Expected vs Actual

- **Expected:** SFV with a numeric epoch normalizes to a parseable date string (`"2026-03-15"` for date-only, or `"2026-03-15T03:00:00.000Z"` for DateTime BRT-midnight).
- **Actual:** The stringified epoch is preserved verbatim in the partition and through the API. `Date.parse(gfv)` returns `NaN`. `new Date(gfv)` returns Invalid Date.

## Reproductions

### Reproduction A — Config A epoch SFV produces unparseable string

1. Open the Date Test Harness on https://vv5dev.visualvault.com.
2. Console: `await VV.Form.SetFieldValue('Field7', 1773543600000)`
3. Read back: `VV.Form.GetFieldValue('Field7')`
4. **Returned:** `"1773543600000"` (string).
5. Save the form. Read via API: `vvClient.forms.getForms({ q: "[instanceName] eq '<name>'", expand: true })`.
6. **API value:** `"1773543600000"`. Not a parseable date.
7. Downstream: `Date.parse("1773543600000")` → `NaN`. `new Date("1773543600000")` → `Invalid Date`.

### Reproduction B — Config C exhibits the same behavior

1. Same form, Config C field — `Field6` / `dateTimeUtcV2Empty`.
2. Console: `await VV.Form.SetFieldValue('Field6', 1773543600000)`
3. **Stored:** `"1773543600000"` (raw and API).

### Reproduction C — Workaround verified

1. Same form, Config A.
2. Console: `await VV.Form.SetFieldValue('Field7', new Date(1773543600000).toISOString())`
3. **Stored:** `"2026-03-15T00:00:00.000Z"` (normalized — V2 handles ISO strings correctly).

## Concrete values by timezone

The epoch-ms input is TZ-agnostic (a fixed instant in UTC). The stored value is the same string regardless of browser TZ:

| Browser TZ | SFV input | Stored (V2) |
|---|---|---|
| BRT (UTC-3) | `1773543600000` | `"1773543600000"` |
| IST (UTC+5:30) | `1773543600000` | `"1773543600000"` |
| UTC | `1773543600000` | `"1773543600000"` |

## Workaround

1. **Stringify before SFV.** Convert numeric epoch to ISO before passing: `SetFieldValue(field, new Date(epoch).toISOString())`. V2 accepts ISO strings correctly.
2. **Defensive GFV parsing.** If a script may receive an epoch-string from a V2 GFV, wrap with `new Date(+gfv)` instead of `new Date(gfv)` — the `+` coerces the numeric string back to a number, which `new Date` accepts.
3. **Audit existing scripts.** Search code paths that pass `Date.now()`, `Date.UTC(...)`, or `someDate.getTime()` directly to `SetFieldValue` — these are vulnerable to this regression.

## Status / Test evidence

- **First confirmed:** 2026-04-22 on build `20260418.1` — `7-A-epoch.V2` and `7-C-epoch.V2` (during the V2 review-queue closure sweep).
- **Test slots:** `7-A-epoch.V2`, `7-C-epoch.V2` — both PASS the regression with the V2 expected values encoding the bug behavior.
- **Spec:** [`testing/specs/date-handling/cat-7-setfieldvalue.spec.js`](../../../../testing/specs/date-handling/cat-7-setfieldvalue.spec.js)
- **Test data:** [`testing/fixtures/test-data.js:6552-6580`](../../../../testing/fixtures/test-data.js#L6552-L6580) (and `7-C-epoch.V2` nearby)
- **Research doc:** [`research/date-handling/forms-calendar/analysis/bug-9-v2-epoch-preserved.md`](../../../../research/date-handling/forms-calendar/analysis/bug-9-v2-epoch-preserved.md) + [fix recommendations](../../../../research/date-handling/forms-calendar/analysis/bug-9-v2-epoch-preserved-fix-recommendations.md).
- **Documentation:** [`docs/reference/form-fields.md § Known Bugs`](../../../../docs/reference/form-fields.md#known-bugs-calendar-field).

## References

- Catalog entry: [v2-bugs-catalog.md § A.3](../v2-bugs-catalog.md)
- Related script-API V2 bug: [bug-8-sfv-null-hang.md](bug-8-sfv-null-hang.md)
