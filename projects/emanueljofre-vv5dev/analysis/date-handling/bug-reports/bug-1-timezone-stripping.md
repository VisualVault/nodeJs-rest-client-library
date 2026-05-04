# FORM-BUG-1: Timezone marker stripped on form load

## Metadata

- **Environment:** EmanuelJofre on vv5dev — https://vv5dev.visualvault.com
- **Build / platform version:** progVersion `6.1.20260416.1` · formViewerBuild `20260418.1` · dbVersion `3041` (fingerprint `f36b65dd`)
- **Calendar pipeline:** V2 (`useUpdatedCalendarValueLogic = true`, Database scope)
- **Browser / OS:** Browser-agnostic.
- **User role:** Any authenticated user opening a form whose calendar field receives a Z-suffixed value.
- **Timezone:** All non-UTC TZs affected; magnitude of shift = browser UTC offset.
- **Frequency:** Always (deterministic when a Z-suffixed value enters the form via URL parameter or FillinAndRelate chain).
- **Severity:** **MEDIUM–HIGH.** Z-suffix is unconditionally stripped before parsing, losing UTC semantics. Save-reload is self-consistent if `getSaveValue()` strips Z back; URL-param init and cross-form chains are not.

## Summary

When the V2 form load receives a date string with a `Z` UTC suffix — e.g., `"2026-03-15T14:30:00Z"` — `parseDateString()` strips the Z **before** parsing the value. The Date object is constructed without UTC context, so the result is interpreted as local time. On a BRT browser, `2026-03-15T14:30:00Z` becomes `2026-03-15T11:30:00` (3-hour backward shift); on an IST browser it becomes `2026-03-15T20:00:00` (5.5-hour forward shift, or in some configs prev-day).

V2 has a recovery branch that restores correct UTC handling for DateTime fields with `ignoreTimezone=false` — but the recovery does not cover all configurations, and date-only fields at UTC- timezones can be additionally affected by an interaction with [FORM-BUG-7](bug-7-wrong-day-utc-plus.md).

The bug is most visible in two flows:
1. **URL parameter init**: a record URL contains `?Field6=2026-03-15T14:30:00Z` — the form opens with a 3-hour-shifted display.
2. **FillinAndRelate chain**: a form copies a Z-suffixed value from a parent form. The Z is stripped during the copy, then re-stripped during the destination form's parse.

## Steps to Reproduce

### Preconditions

- An authenticated user account on EmanuelJofre / vv5dev.
- A DateTime field exposed (e.g., `Field6` / `dateTimeUtcV2Empty` — Config C).
- Browser system timezone set to any non-UTC zone (BRT used in the per-TZ table below).

### Test data

| Slot | Config | TZ | URL param | Stored after load |
|---|---|---|---|---|
| `4-C-z-BRT.V2` | C | BRT | `Field6=2026-03-15T14:30:00Z` | `"2026-03-15T14:30:00.000Z"` (V2 recovery active) |
| `4-D-z-BRT.V2` | D | BRT | `Field5=2026-03-15T14:30:00Z` | `"2026-03-15T14:30:00.000Z"` |
| `4-G-z-BRT.V2` | G | BRT | `Field14=2026-03-15T14:30:00Z` | `"2026-03-15T14:30:00.000Z"` |
| `4-H-z-BRT.V2` | H | BRT | `Field13=2026-03-15T14:30:00Z` | `"2026-03-15T14:30:00.000Z"` |

### How to read Expected vs Actual

- **Expected:** Z-suffixed input is parsed with UTC semantics — the Date object reflects the absolute instant.
- **Actual:** Z is stripped before parsing; the resulting Date is interpreted as browser-local time. Display and stored value shift by the user's UTC offset.

## Reproductions

### Reproduction A — URL-param Z input on BRT

1. Open the Date Test Harness with a Z URL parameter: `?Field6=2026-03-15T14:30:00Z` on a BRT browser.
2. Console: `VV.Form.VV.FormPartition.getValueObjectValue('Field6')`
3. **Observed (V2 recovery active):** `"2026-03-15T14:30:00.000Z"` — the V2 recovery branch restores the UTC value.
4. **On configs without recovery (legacy, date-only at UTC-):** Display shifts by the user's offset; stored value loses UTC semantics.

### Reproduction B — Cross-TZ behavior

1. Same URL on an IST browser.
2. **Observed:** `"2026-03-15T14:30:00.000Z"` for Configs C/D/G/H — the recovery branch handles IST too.
3. **For non-recovered date-only configs:** behavior interacts with [FORM-BUG-7](bug-7-wrong-day-utc-plus.md) — the day shifts to March 14.

### Reproduction C — Cross-form chain (FillinAndRelate)

1. Configure a parent form to populate a child form's Config D field with a Z-suffixed value.
2. Trigger the FillinAndRelate flow.
3. **Observed:** the child form's stored value shifts by the user's offset relative to the parent's stored UTC instant.

## Concrete values by timezone

| Browser TZ | URL param | Stored (V2 with recovery) | Stored (non-recovered path) |
|---|---|---|---|
| BRT (UTC-3) | `2026-03-15T14:30:00Z` | `"2026-03-15T14:30:00.000Z"` | shifted -3h |
| IST (UTC+5:30) | `2026-03-15T14:30:00Z` | `"2026-03-15T14:30:00.000Z"` | shifted +5.5h |
| UTC | `2026-03-15T14:30:00Z` | `"2026-03-15T14:30:00.000Z"` | unchanged (offset = 0) |

## Workaround

1. **Avoid Z-suffixed values in URL parameters.** Use Z-less ISO with explicit local time.
2. **Use `forminstance/` endpoint for API writes.** [WS-BUG-1](ws-bug-1-cross-layer-shift.md) describes how `postForms` produces values that trigger this bug; `forminstance/` uses a different serialization that does not.
3. **Verify cross-form chains.** If a workflow copies values across forms, log the values at each hop and check for Z-strip-and-shift effects.

## Status / Test evidence

- **Confirmed on V2** via Cat-4 URL parameter tests across BRT, IST, UTC (2026-04-22 and earlier).
- **Test slots:** `4-C-z-*`, `4-D-z-*`, `4-G-z-*`, `4-H-z-*` — V2 siblings.
- **Spec:** [`testing/specs/date-handling/cat-4-url-params.spec.js`](../../../../testing/specs/date-handling/cat-4-url-params.spec.js)
- **Research doc:** [`research/date-handling/forms-calendar/analysis/bug-1-timezone-stripping.md`](../../../../research/date-handling/forms-calendar/analysis/bug-1-timezone-stripping.md) + [fix recommendations](../../../../research/date-handling/forms-calendar/analysis/bug-1-fix-recommendations.md).
- **Documentation:** [`docs/reference/form-fields.md § Known Bugs`](../../../../docs/reference/form-fields.md#known-bugs-calendar-field).

## References

- Catalog entry: [v2-bugs-catalog.md § B.1](../v2-bugs-catalog.md)
- Related: [ws-bug-1-cross-layer-shift.md](ws-bug-1-cross-layer-shift.md) — `postForms`-written records hit this bug on first form open
- Related: [bug-7-wrong-day-utc-plus.md](bug-7-wrong-day-utc-plus.md) — interacts with date-only fields at UTC+ TZs
