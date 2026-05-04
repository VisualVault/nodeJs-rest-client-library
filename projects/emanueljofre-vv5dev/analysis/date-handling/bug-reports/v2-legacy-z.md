# FORM-BUG-V2-LEGACY-Z: DateTime values stored with `.000Z` suffix

## Metadata

- **Environment:** EmanuelJofre on vv5dev — https://vv5dev.visualvault.com
- **Build / platform version:** progVersion `6.1.20260416.1` · formViewerBuild `20260418.1` · dbVersion `3041` (fingerprint `f36b65dd`)
- **Calendar pipeline:** V2 (`useUpdatedCalendarValueLogic = true`, Database scope)
- **Browser / OS:** Browser-agnostic.
- **User role:** Any authenticated user touching DateTime calendar fields.
- **Timezone:** All TZs affected; the `.000Z` suffix appears regardless of browser TZ.
- **Frequency:** Always (every DateTime save under V2).
- **Severity:** **LOW.** No data loss; calendar instant is preserved. Tagged for cross-environment consistency concerns.

## Summary

Under V2, every DateTime field save (Configs C, D, G, H — both legacy and non-legacy) routes through `moment(input).toISOString()`, producing a full ISO-with-milliseconds-and-Z representation: `"2026-03-15T00:00:00.000Z"`. The user-visible form display is identical to legacy environments; the divergence is observable only in the stored raw string (partition value, API response, database cell).

This is the most widespread V2 stored-format change — 77 audit entries carry this tag. It applies to typed input, popup input, `SetFieldValue`, save-reload, and GFV round-trip.

The "bug" status reflects:
1. Cross-environment data flows that compare raw strings (regex matches, substring strips) break when they encounter the `.000Z` suffix.
2. Reports filtering on exact-string equality miss records that were saved on V2.
3. The change was introduced without a documented migration path.

## Steps to Reproduce

### Preconditions

- An authenticated user account on EmanuelJofre / vv5dev.
- The Date Test Harness with DateTime fields exposed (Configs C, D, G, H).

### Test data

| Slot | Config | Input | Stored (V2) |
|---|---|---|---|
| `1-D-BRT.V2` | D (BRT) | `2026-03-15T00:00:00` (typed/SFV) | `"2026-03-15T00:00:00.000Z"` |
| `2-H-BRT.V2` | H (BRT, legacy) | `2026-03-15T00:00:00` (typed) | `"2026-03-15T00:00:00.000Z"` |
| `3-D-BRT-BRT.V2` | D (BRT save+reload) | `2026-03-15T00:00:00` | `"2026-03-15T00:00:00.000Z"` |
| `8-H-BRT.V2` | H (BRT GFV-roundtrip) | `2026-03-15T00:00:00` | `"2026-03-15T00:00:00.000Z"` (stable, no drift) |
| `11-C-save-BRT-load-IST.V2` | C (cross-TZ) | `2026-03-15T00:00:00` BRT save → IST load | `"2026-03-15T00:00:00.000Z"` |

### How to read Expected vs Actual

- **Expected:** Stored representation matches the legacy convention — `"2026-03-15T00:00:00"` (no Z, no `.000` ms).
- **Actual:** Full ISO-with-Z — `"2026-03-15T00:00:00.000Z"`. Same calendar instant, different string.

## Reproductions

### Reproduction A — Typed input on Config H (legacy DateTime + ignoreTZ)

1. Open the Date Test Harness on https://vv5dev.visualvault.com.
2. Type `03/15/2026 12:00 AM` into the Config H field — `Field13` / `dateTimeLocalLegacyEmpty`.
3. Tab off and save.
4. Console: `VV.Form.VV.FormPartition.getValueObjectValue('Field13')`
5. **Observed:** `"2026-03-15T00:00:00.000Z"`.

### Reproduction B — Save-reload on Config C

1. Save the form with Config C field (`Field6` / `dateTimeUtcV2Empty`) set to `2026-03-15T00:00:00`.
2. Reload the saved record.
3. Console: `getValueObjectValue('Field6')`
4. **Observed:** `"2026-03-15T00:00:00.000Z"`.

### Reproduction C — GFV-roundtrip stability on Config H

1. Same form, Config H — `Field13`.
2. Save with `2026-03-15T00:00:00`. Reload.
3. Console: `await VV.Form.SetFieldValue('Field13', VV.Form.GetFieldValue('Field13'))`
4. Console: `getValueObjectValue('Field13')`
5. **Observed:** `"2026-03-15T00:00:00.000Z"` — stable, zero drift across multiple round-trips. (V1's FORM-BUG-5 fake-Z drift is fixed in V2.)

## Concrete values by timezone

| Browser TZ | Field config | Input | Stored (V2) |
|---|---|---|---|
| BRT | Config C | `2026-03-15T00:00:00` typed | `"2026-03-15T00:00:00.000Z"` |
| IST | Config C | `2026-03-15T00:00:00` typed | `"2026-03-15T00:00:00.000Z"` (V2 stores the local-as-UTC value) |
| UTC | Config C | `2026-03-15T00:00:00` typed | `"2026-03-15T00:00:00.000Z"` |

## Workaround

1. **Normalize at the consumer.** If downstream code requires the legacy `T00:00:00` shape, strip `.000Z` after read: `gfv.replace(/\.\d{3}Z$/, '')`.
2. **Accept both shapes.** Update any regex/parse logic to accept `T00:00:00`, `T00:00:00.000`, `T00:00:00Z`, and `T00:00:00.000Z` as equivalent.
3. **Filter queries by ISO-prefix.** Instead of `[Field6] eq '2026-03-15T00:00:00'`, use a date-range query: `[Field6] ge '2026-03-15' AND [Field6] lt '2026-03-16'` — this matches both representations.

## Status / Test evidence

- **First confirmed:** 2026-04-22 on build `20260418.1` — 77 audit entries flagged across multiple categories.
- **Test slots:** Spread across cat-1 through cat-14, V2 siblings — see [`v2-baseline-audit.md`](../../testing/date-handling/v2-baseline-audit.md) for the full list.
- **Specs:** All DateTime-touching specs in `testing/specs/date-handling/`.
- **Research doc:** [`research/date-handling/forms-calendar/analysis/bug-11-v2-legacy-z.md`](../../../../research/date-handling/forms-calendar/analysis/bug-11-v2-legacy-z.md) + [fix recommendations](../../../../research/date-handling/forms-calendar/analysis/bug-11-v2-legacy-z-fix-recommendations.md).
- **Documentation:** [`docs/reference/form-fields.md § Known Bugs`](../../../../docs/reference/form-fields.md#known-bugs-calendar-field).

## References

- Catalog entry: [v2-bugs-catalog.md § A.5](../v2-bugs-catalog.md)
- Related: [v2-utcmidnight.md](v2-utcmidnight.md) — same root cause (V2's `getSaveValue` flows through `toISOString()`) but observable on date-only fields where V1 stored a bare date with no time portion at all
- Note: This change arguably *fixes* the legacy "save format strips timezone" defect (V1's `getSaveValue()` deliberately stripped Z) — but introduces cross-environment-consistency concerns for any consumer hard-coded to the legacy shape
