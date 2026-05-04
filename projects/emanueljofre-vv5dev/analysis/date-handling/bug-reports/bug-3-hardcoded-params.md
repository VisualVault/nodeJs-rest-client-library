# FORM-BUG-3: Form load uses hardcoded parameters instead of field configuration

## Metadata

- **Environment:** EmanuelJofre on vv5dev — https://vv5dev.visualvault.com
- **Build / platform version:** progVersion `6.1.20260416.1` · formViewerBuild `20260418.1` · dbVersion `3041` (fingerprint `f36b65dd`)
- **Calendar pipeline:** V2 (`useUpdatedCalendarValueLogic = true`, Database scope) — `initCalendarValueV2()` is the affected function
- **Browser / OS:** Browser-agnostic.
- **User role:** Any authenticated user opening a form with calendar fields that load saved values or preset defaults.
- **Timezone:** Not TZ-dependent at the bug's root, but interacts with TZ-sensitive logic downstream.
- **Frequency:** Every form load with saved data or preset default — deterministic.
- **Severity:** **MEDIUM.** All field configurations are affected, but the user-visible impact varies by which downstream logic the wrong parameters trigger.

## Summary

When the V2 form load processes a saved value or a preset default, it calls `parseDateString()` with **hardcoded** parameters instead of reading the actual field configuration. Two of the three V2 `parseDateString` call sites pass wrong values:

| Load scenario | `enableTime` passed | `ignoreTimezone` passed | Correct? |
|---|---|---|---|
| URL query string | (from field config) | (from field config) | ✅ Correct |
| Saved data | **Hardcoded `true`** | (from field config) | ❌ Wrong `enableTime` |
| Preset default | **Hardcoded `false`** | **Hardcoded `true`** | ❌ Both wrong |

A date-only field loading saved data is told the field has time enabled — so the time component from the database value leaks through instead of being collapsed. A date+time field loading a preset default is told the field is date-only with `ignoreTimezone` on — so the preset's time is discarded and TZ semantics are wrong.

## Steps to Reproduce

### Preconditions

- An authenticated user account on EmanuelJofre / vv5dev.
- A form template with at least one calendar field containing saved data or a preset Initial Value.
- The Date Test Harness covers all 8 configs (A–H); use any DateTime config for the `enableTime`-mismatch scenario or any date-only Config A field with a preset for the preset scenario.

### Test data

| Scenario | Field config | Trigger | Expected behavior | Observed behavior |
|---|---|---|---|---|
| Saved-data, date-only field | A or B (`enableTime=false`) | Open record where Field7 was previously saved | Time stripped on read; raw = `2026-03-15` | Time component preserved (e.g., `2026-03-15T00:00:00.000Z` — partly the same effect that produces [V2-UTCMIDNIGHT](v2-utcmidnight.md)) |
| Preset, DateTime field | C or D (`enableTime=true`) | Form opens with preset Initial Value `2026-03-15T14:30:00` | Preset stored as-configured | Preset time portion discarded; field initialized to date-only |
| URL param | Any config | `?Field7=...` URL parameter | Correct (uses field config) | ✅ Works correctly |

### How to read Expected vs Actual

- **Expected:** `parseDateString()` receives the field's actual `enableTime` and `ignoreTimezone` values from the form template configuration.
- **Actual:** Two of the three call sites override these with hardcoded constants. The field's intended semantics are silently overridden during init.

## Reproductions

### Reproduction A — Saved-data init forces `enableTime=true`

1. Open the Date Test Harness on https://vv5dev.visualvault.com.
2. Save a record with `Field7` (Config A, date-only) set to `2026-03-15`. The DB stores `2026-03-15 00:00:00.000`.
3. Reopen the saved record.
4. Console: `VV.Form.VV.FormPartition.getValueObjectValue('Field7')`
5. **Observed:** `"2026-03-15T00:00:00.000Z"` — time portion was kept because init was told `enableTime=true`. A field with `enableTime=false` would normally drop the time.

### Reproduction B — Preset DateTime field loses its time portion

1. Configure a Config C field (DateTime) with an Initial Value of `03/15/2026 14:30` (a preset DateTime).
2. Open the form (no saved record — fresh template load triggers preset init).
3. Console: `VV.Form.GetFieldValue(<configCField>)`
4. **Observed:** Preset shows the date portion only; the `14:30` time is discarded because init forces `enableTime=false` for presets.

### Reproduction C — URL param works correctly (control)

1. Navigate to a form URL with a value parameter: `/FormViewer/app?...&Field7=03/15/2026`.
2. **Observed:** Field reads with correct `enableTime`/`ignoreTimezone` from config — URL param init does not have the hardcoding.

## Concrete values by timezone

The bug is config-driven, not TZ-driven. The same hardcoded parameters override any browser TZ:

| Browser TZ | Preset value | Observed (V2) |
|---|---|---|
| BRT (UTC-3) | `03/15/2026 14:30` (Config C) | Time portion lost |
| IST (UTC+5:30) | `03/15/2026 14:30` (Config C) | Time portion lost |
| UTC | `03/15/2026 14:30` (Config C) | Time portion lost |

## Workaround

1. **No script-layer workaround for the saved-data path.** Once the form is loaded with the wrong parameters, downstream logic has already received the malformed value.
2. **Use SFV after load to restore intent.** For preset fields, follow form load with an explicit `SetFieldValue` that re-applies the configured value with the correct semantics — but be aware of [FORM-BUG-V2-LEGACY-Z](v2-legacy-z.md) and [FORM-BUG-8](bug-8-sfv-null-hang.md) on the SFV path.
3. **Avoid presets on Config A under V2.** See [FORM-BUG-V2-PRESET-YEAR](v2-preset-year.md) — preset init has further problems beyond the hardcoded params.

## Status / Test evidence

- **Code-confirmed.** The hardcoded parameter values are in `initCalendarValueV2()` source. Test evidence is indirect (the downstream bugs that depend on this — V2-UTCMIDNIGHT, V2-PRESET-YEAR, V2-LEGACY-Z — all reproduce on V2 build `f36b65dd`).
- **Spec coverage:** Cat-1 (saved-data load), Cat-5 (preset-date), Cat-4 (URL param) all touch the affected paths.
- **Research doc:** [`research/date-handling/forms-calendar/analysis/bug-3-hardcoded-params.md`](../../../../research/date-handling/forms-calendar/analysis/bug-3-hardcoded-params.md) + [fix recommendations](../../../../research/date-handling/forms-calendar/analysis/bug-3-fix-recommendations.md).
- **Documentation:** [`docs/reference/form-fields.md § Known Bugs`](../../../../docs/reference/form-fields.md#known-bugs-calendar-field).

## References

- Catalog entry: [v2-bugs-catalog.md § A.1](../v2-bugs-catalog.md)
- Downstream bugs that share this root cause: [v2-utcmidnight.md](v2-utcmidnight.md), [v2-preset-year.md](v2-preset-year.md), [v2-legacy-z.md](v2-legacy-z.md)
