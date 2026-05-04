# FORM-BUG-V2-UTCMIDNIGHT: Date-only fields stored as `T00:00:00.000Z` instead of bare `YYYY-MM-DD`

## Metadata

- **Environment:** EmanuelJofre on vv5dev — https://vv5dev.visualvault.com
- **Build / platform version:** progVersion `6.1.20260416.1` · formViewerBuild `20260418.1` · dbVersion `3041` (fingerprint `f36b65dd`)
- **Calendar pipeline:** V2 (`useUpdatedCalendarValueLogic = true`, Database scope)
- **Browser / OS:** Browser-agnostic.
- **User role:** Any authenticated user touching date-only calendar fields.
- **Timezone:** All TZs affected; the `T00:00:00.000Z` suffix appears regardless of browser TZ.
- **Frequency:** Always (every date-only field save under V2).
- **Severity:** **LOW.** No data loss; calendar date is preserved. Stored representation differs from legacy `YYYY-MM-DD` shape.

## Summary

Date-only fields (Configs A, B, E, F — all with `enableTime=false`) on V2 store full ISO-with-time-and-Z values (`"2026-03-15T00:00:00.000Z"`) where legacy storage was bare `YYYY-MM-DD` strings (`"2026-03-15"`). Same calendar date interpretation; different stored representation.

This is the date-only sibling of [FORM-BUG-V2-LEGACY-Z](v2-legacy-z.md). Both stem from the same V2 `getSaveValue()` change — the function routes through `moment(input).toISOString()` for all calendar fields, regardless of whether the field has `enableTime` enabled. For date-only fields, the result is "midnight UTC of the user's local date" — `T00:00:00.000Z`. The bare-date format is gone entirely.

The "bug" is the cross-environment-consistency concern: consumers (regex matchers, substring parsers, exact-string comparators) that expected `"2026-03-15"` get `"2026-03-15T00:00:00.000Z"` and may misbehave.

## Steps to Reproduce

### Preconditions

- An authenticated user account on EmanuelJofre / vv5dev.
- A date-only calendar field (Config A, B, E, or F) on the Date Test Harness.

### Test data

| Slot | Config | Input | Stored (V2) |
|---|---|---|---|
| `1-B-BRT.V2` | B (BRT, ignoreTZ, date-only) | `2026-03-15` typed/SFV | `"2026-03-15T00:00:00.000Z"` |
| `2-B-BRT.V2` | B (BRT) | `2026-03-15` typed | `"2026-03-15T00:00:00.000Z"` |
| `2-F-BRT.V2` | F (BRT, legacy date-only ignoreTZ) | `2026-03-15` typed | `"2026-03-15T00:00:00.000Z"` |
| `3-B-BRT-BRT.V2` | B (BRT save+reload) | `2026-03-15` | `"2026-03-15T00:00:00.000Z"` |
| `3-F-BRT-BRT.V2` | F (BRT save+reload) | `2026-03-15` | `"2026-03-15T00:00:00.000Z"` |
| `11-B-save-BRT-load-IST.V2` | B (cross-TZ) | `2026-03-15` BRT save → IST load | `"2026-03-15T00:00:00.000Z"` |
| `11-F-save-BRT-load-IST.V2` | F (cross-TZ) | `2026-03-15` BRT save → IST load | `"2026-03-15T00:00:00.000Z"` |

### How to read Expected vs Actual

- **Expected:** Stored representation matches the legacy convention — bare `"2026-03-15"`.
- **Actual:** Full ISO-with-Z — `"2026-03-15T00:00:00.000Z"`.

## Reproductions

### Reproduction A — Config B typed input

1. Open the Date Test Harness on https://vv5dev.visualvault.com.
2. Type `03/15/2026` into the Config B field — `Field4` / `dateLocalV2Empty` (date-only, `ignoreTimezone=true`).
3. Tab off and save.
4. Console: `VV.Form.VV.FormPartition.getValueObjectValue('Field4')`
5. **Observed:** `"2026-03-15T00:00:00.000Z"`.

### Reproduction B — Config F (legacy) typed input

1. Same form, Config F field — `dateLocalLegacyEmpty` (date-only, ignoreTZ, `useLegacy=true`).
2. Type `03/15/2026` and save.
3. Console: `getValueObjectValue(<Config F field>)`
4. **Observed:** `"2026-03-15T00:00:00.000Z"`. Even legacy date-only configs are affected by the V2 stored-format change.

### Reproduction C — Cross-TZ load

1. Save a Config B record on a BRT browser with `2026-03-15`.
2. Open the same record on an IST browser (system TZ = Asia/Calcutta).
3. Console: `getValueObjectValue(<Config B field>)`
4. **Observed:** `"2026-03-15T00:00:00.000Z"` — same stored value across browsers.

## Concrete values by timezone

The stored value is TZ-agnostic for date-only fields under V2 (always `T00:00:00.000Z`):

| Browser TZ | Field config | Input | Stored (V2) |
|---|---|---|---|
| BRT (UTC-3) | Config B | `2026-03-15` | `"2026-03-15T00:00:00.000Z"` |
| IST (UTC+5:30) | Config B | `2026-03-15` | `"2026-03-15T00:00:00.000Z"` |
| UTC | Config B | `2026-03-15` | `"2026-03-15T00:00:00.000Z"` |

> Note: this is for `ignoreTimezone=true` configs (B, F). For `ignoreTimezone=false` date-only configs (A, E) at UTC+ TZs, [FORM-BUG-7](bug-7-wrong-day-utc-plus.md) shifts the calendar date by one day on the date-only path.

## Workaround

1. **Normalize at the consumer.** Strip `T00:00:00.000Z` from the stored value to get the legacy shape: `gfv.replace(/T00:00:00\.000Z$/, '')`.
2. **Accept both shapes.** Update parse logic to accept `2026-03-15` and `2026-03-15T00:00:00.000Z` as equivalent.
3. **Date-prefix filter.** For queries, use a prefix or range filter: `[Field4] ge '2026-03-15' AND [Field4] lt '2026-03-16'`.

## Status / Test evidence

- **First confirmed:** 2026-04-22 on build `20260418.1` — multiple Cat-1, Cat-2, Cat-3, Cat-7, Cat-11 entries flagged in the audit.
- **Test slots:** spread across the V2 baseline; see [`v2-baseline-audit.md`](../../testing/date-handling/v2-baseline-audit.md) under the `FORM-BUG-V2-UTCMIDNIGHT` tag.
- **Specs:** All date-only-touching specs in `testing/specs/date-handling/` (cat-1, cat-2, cat-3, cat-7, cat-11).
- **Research doc:** None yet — tagged in audit only. **Investigation queued** to write a parallel research doc to [bug-11-v2-legacy-z.md](../../../../research/date-handling/forms-calendar/analysis/bug-11-v2-legacy-z.md).
- **Documentation:** Tagged in [`v2-baseline-audit.md`](../../testing/date-handling/v2-baseline-audit.md) only; not yet in `docs/reference/form-fields.md`.

## References

- Catalog entry: [v2-bugs-catalog.md § A.6](../v2-bugs-catalog.md)
- Sibling bug (DateTime fields): [v2-legacy-z.md](v2-legacy-z.md) — same root cause for `enableTime=true` fields
- Related root cause: [bug-3-hardcoded-params.md](bug-3-hardcoded-params.md) — V2's saved-data load forces `enableTime=true`, contributing to the time-portion preservation
