# FORM-BUG-V2-CONFIG-D-TYPED-EMPTY: Config D fields silently lose typed input

## Metadata

- **Environment:** EmanuelJofre on vv5dev — https://vv5dev.visualvault.com
- **Build / platform version:** progVersion `6.1.20260416.1` · formViewerBuild `20260418.1` · dbVersion `3041` (fingerprint `f36b65dd`)
- **Calendar pipeline:** V2 (`useUpdatedCalendarValueLogic = true`, Database scope)
- **Browser / OS:** Confirmed on Chromium under macOS (Playwright). Likely all browsers — the failure is in Kendo v2's blur-handler write-through.
- **User role:** Any authenticated user with permission to type into a calendar field.
- **Customer Culture:** enUS confirmed (Cat-18 baseline). Independent of Culture per the failure mode (commit fails regardless of parser outcome).
- **Timezone:** BRT confirmed; bug is not TZ-dependent.
- **Frequency:** Always (deterministic when the trigger conditions are met).
- **Severity:** **MEDIUM — silent data loss.** The field appears to accept the input but stores nothing.

## Summary

When a user types a date+time value into a Config D calendar field on the V2 platform, the value never commits to the form's internal partition. After the user tabs off the field, `getValueObjectValue()` returns `""`. The form shows what the user typed in the visible input, but the underlying value is empty. On save, the database receives no value for that field — silent data loss.

The bug is specific to Config D: `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`. Other DateTime configurations (C, G, H) are not affected. Same-shaped fields with `useLegacy=true` (Config H) commit normally. Same date-only configs that go through the same MM/DD/YYYY mask (Config A) commit normally — but trigger a different bug, [FORM-BUG-V2-TYPED-MM-OVERFLOW](v2-typed-mm-overflow.md).

The interaction is mechanical: vv5dev renders all calendar fields with a date-only mask (`<Mask>MM/dd/yyyy</Mask>`) regardless of `enableTime`. For Config D, the blur handler that should write the masked input through to the partition fails silently. The `SetFieldValue()` script API is unaffected — calling SFV with the same value commits normally.

## Steps to Reproduce

### Preconditions

- An authenticated user account on EmanuelJofre / vv5dev.
- The `Date Test Harness` form open with a Config D field exposed (e.g., `dateTimeLocalV2Empty` — DateTime, ignoreTZ, non-legacy).
- Mask auto-population active on the form (vv5dev default — fields render as `MM/DD/YYYY` segments).

### Test data

| Slot | Input typed | Expected behavior | Observed (V2) |
|---|---|---|---|
| `18-D-enUS-mmdd` | `03/15/2026 14:30` | Field commits with March 15 14:30 | `raw=""`, `api=""` |
| `18-D-enUS-iso` | `2026-03-15T14:30:00` | Either rejects or commits | `raw=""`, `api=""` |
| `18-D-enUS-ambiguous` | `03/04/2026 14:30` | Commits per Culture | `raw=""`, `api=""` |
| `18-D-enUS-ddmm` | `15/03/2026 14:30` | Commits or rejects with error | `raw=""`, `api=""` |
| `18-D-enUS-invalid` | `31/02/2026 14:30` | Rejects with validation error | `raw=""`, `api=""` |

### How to read Expected vs Actual

- **Expected:** Either the platform parses the input and commits a value, or it rejects with a validation error visible to the user.
- **Actual:** The visible input keeps showing what the user typed, but the underlying partition value is `""`. On save, the field comes back from the API as `null`.

## Reproductions

### Reproduction A — Plain typed date+time silently lost

1. Open the Date Test Harness form on https://vv5dev.visualvault.com.
2. Click into the Config D field — `Field5` / `dateTimeLocalV2Empty`.
3. Type `03/15/2026 14:30` and press Tab.
4. Open browser console: `VV.Form.VV.FormPartition.getValueObjectValue('Field5')`
5. **Stored value:** `""` (empty string). The user-visible input may still show `03/15/2026` (the masked portion).
6. Save the form. Read back via `vvClient.forms.getForms()`. **API returns:** `null` for `Field5`.

### Reproduction B — SFV path is unaffected (control)

1. Same form, same Config D field.
2. In the browser console: `VV.Form.SetFieldValue('Field5', '2026-03-15T14:30:00')`.
3. Read back: `VV.Form.VV.FormPartition.getValueObjectValue('Field5')`
4. **Stored value:** `"2026-03-15T14:30:00.000Z"` (committed normally per [FORM-BUG-V2-LEGACY-Z](v2-legacy-z.md)).
5. Save and read via API: returns the committed value.

### Reproduction C — Config A on the same form commits (control)

1. Same form, Config A field (`Field7` / `dateTzAwareV2Empty`).
2. Type `03/15/2026` (date-only — Config A doesn't have a time portion).
3. Tab off and read: `getValueObjectValue('Field7')`
4. **Stored value:** `"2026-03-15T00:00:00.000Z"`. The commit succeeded — but separately triggers [FORM-BUG-V2-TYPED-MM-OVERFLOW](v2-typed-mm-overflow.md) for non-MM/DD inputs.

The differential between Config A (commits) and Config D (silent loss) under the *same* mask + the *same* parser is the diagnostic signal pointing at the `ignoreTimezone=true + enableTime=true + useLegacy=false` blur-handler path.

## Concrete values by timezone

The bug is not TZ-dependent — every TZ produces empty stored values for Config D typed input:

| Browser TZ | Input | Stored (V2) |
|---|---|---|
| BRT (UTC-3) | `03/15/2026 14:30` | `""` |
| IST (UTC+5:30) | `03/15/2026 14:30` | `""` |
| UTC | `03/15/2026 14:30` | `""` |

## Workaround

1. **Use `SetFieldValue()` instead of typed input on Config D.** SFV writes through the partition correctly even on V2.
2. **Re-evaluate the field configuration.** If the field doesn't actually need TZ-naive storage (`ignoreTimezone=true`), switch to Config C (`ignoreTimezone=false`) — Config C's typed-input commit path is unaffected by this bug.
3. **Untested:** Clear the mask auto-population in Form Designer to restore the default DateTimePicker time-segment rendering. May fix the commit path; not yet verified.

## Status / Test evidence

- **First confirmed:** 2026-04-22 on build `20260418.1` (vv5dev cat-18 enUS Culture baseline).
- **Test slots:** `18-D-enUS-mmdd`, `18-D-enUS-iso`, `18-D-enUS-ambiguous`, `18-D-enUS-ddmm`, `18-D-enUS-invalid` — all PASS the regression with `expectedRaw=""` / `expectedApi=""` (PASS = bug confirmed reproducing).
- **Spec:** [`testing/specs/date-handling/cat-18-culture.spec.js`](../../../../testing/specs/date-handling/cat-18-culture.spec.js)
- **Test data:** [`testing/fixtures/test-data.js:10776-10864`](../../../../testing/fixtures/test-data.js#L10776-L10864)
- **Research doc:** None yet — entry only in [`docs/reference/form-fields.md § Known Bugs`](../../../../docs/reference/form-fields.md#known-bugs-calendar-field).
- **Investigation needed:** Trace the V2 blur handler for `ignoreTimezone=true + enableTime=true + useLegacy=false` — identify why the partition write-through fails, while Config A's same code path succeeds.

## References

- Catalog entry: [v2-bugs-catalog.md § A.9](../v2-bugs-catalog.md)
- Related typed-input bug: [v2-typed-mm-overflow.md](v2-typed-mm-overflow.md) — Config A's parser misparses MM/DD overflow (the commit succeeds, but with wrong values)
- Related SFV bug: [bug-8-sfv-null-hang.md](bug-8-sfv-null-hang.md) — Config D's SFV path also has its own V2-only failure mode
