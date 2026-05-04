# FORM-BUG-V2-URL-PARAM-NORMALIZE: URL-param init normalizes to UTC ISO, ignoring `ignoreTimezone`

## Metadata

- **Environment:** EmanuelJofre on vv5dev — https://vv5dev.visualvault.com
- **Build / platform version:** progVersion `6.1.20260416.1` · formViewerBuild `20260418.1` · dbVersion `3041` (fingerprint `f36b65dd`)
- **Calendar pipeline:** V2 (`useUpdatedCalendarValueLogic = true`, Database scope)
- **Browser / OS:** Browser-agnostic.
- **User role:** Any authenticated user opening a form via a URL with calendar field query parameters.
- **Timezone:** BRT confirmed; the stored value's UTC offset reflects browser TZ.
- **Frequency:** Always (deterministic).
- **Severity:** **LOW–MEDIUM.** No data loss; calendar date is preserved. The bug surfaces as a divergence from the field's `ignoreTimezone` config and from other write paths.

## Summary

When a form is opened with a URL parameter containing a US-format date — e.g., `?Field7=03/15/2026` — on a Config A field (date-only, `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`), the V2 init pipeline normalizes the value to UTC ISO midnight: `"2026-03-15T00:00:00.000Z"`. This stored value is **TZ-naive** — it does not reflect the field's `ignoreTimezone=false` setting.

The interesting detail: this is **not** the same UTC value that `SetFieldValue()` or typed input would produce on the same field. Both of those paths apply [FORM-BUG-7](bug-7-wrong-day-utc-plus.md) at UTC- offsets — on a BRT browser they would store `"2026-03-15T03:00:00.000Z"` (UTC of BRT-midnight). The URL-param init path stores plain UTC midnight, effectively behaving as if `ignoreTimezone=true`, even when the field config says otherwise.

The result: the same form field has different UTC values depending on whether it was populated via URL param vs. SFV/typed input. Workflows that mix init paths see the divergence and break exact-match queries that filter on the stored UTC string.

## Steps to Reproduce

### Preconditions

- An authenticated user account on EmanuelJofre / vv5dev.
- A Config A field exposed (e.g., `Field7` / `dateTzAwareV2Empty` — `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`).
- The Date Test Harness URL with a calendar field query parameter — see [`testing/fixtures/vv-config.js`](../../../../testing/fixtures/vv-config.js) for the form's URL builder.

### Test data

| Slot | TZ | URL param | Stored after URL-param init |
|---|---|---|---|
| `4-A-us-BRT.V2` | BRT (UTC-3) | `Field7=03/15/2026` | `"2026-03-15T00:00:00.000Z"` |

### How to read Expected vs Actual

- **Expected:** URL-param init stores the value consistently with the field config (`ignoreTimezone=false`). On BRT this would be `"2026-03-15T03:00:00.000Z"` (matching SFV/typed-input behavior under FORM-BUG-7).
- **Actual:** Stored as `"2026-03-15T00:00:00.000Z"` — TZ-naive UTC midnight. The `ignoreTimezone=false` flag is silently ignored on this path.

## Reproductions

### Reproduction A — URL param produces TZ-naive UTC

1. Construct a form URL with the calendar field as a query parameter: `https://vv5dev.visualvault.com/FormViewer/app?formid=378b683e-f36b-1410-85ef-001e45e95bc5&xcid=EmanuelJofre&xcdid=Main&Field7=03/15/2026`.
2. Open the URL on a BRT browser (system TZ = America/Sao_Paulo).
3. Console: `VV.Form.VV.FormPartition.getValueObjectValue('Field7')`
4. **Observed:** `"2026-03-15T00:00:00.000Z"` — UTC midnight, not BRT-midnight UTC.
5. Save the form. API value: same — `2026-03-15T00:00:00.000Z`.

### Reproduction B — SFV on the same field produces a different UTC

1. Same form, open without URL params.
2. Console: `await VV.Form.SetFieldValue('Field7', '03/15/2026')`
3. Console: `getValueObjectValue('Field7')`
4. **Observed:** `"2026-03-15T03:00:00.000Z"` — UTC of BRT-midnight (FORM-BUG-7 active on the SFV path).
5. The two paths produce **different** stored values for the same logical date.

### Reproduction C — Query divergence

1. Save records via both paths (Reproductions A and B).
2. Query `[Field7] eq '2026-03-15T00:00:00.000Z'` — finds only the URL-param record.
3. Query `[Field7] eq '2026-03-15T03:00:00.000Z'` — finds only the SFV record.
4. Query `[Field7] eq '2026-03-15'` — finds both (date-only filtering normalizes).

## Concrete values by timezone

| Browser TZ | URL param | URL-param stored | SFV stored (same input) |
|---|---|---|---|
| BRT (UTC-3) | `03/15/2026` | `2026-03-15T00:00:00.000Z` | `2026-03-15T03:00:00.000Z` |
| IST (UTC+5:30) | `03/15/2026` | `2026-03-15T00:00:00.000Z` (predicted; not yet swept) | `2026-03-14T18:30:00.000Z` (FORM-BUG-7) |
| UTC | `03/15/2026` | `2026-03-15T00:00:00.000Z` (predicted) | `2026-03-15T00:00:00.000Z` |

## Workaround

1. **Avoid mixing URL-param init with SFV/typed input on the same field.** Choose one path consistently for any given workflow.
2. **Use ISO format in URL params if possible.** `?Field7=2026-03-15` may produce different normalization than `?Field7=03/15/2026` (not yet swept; investigate).
3. **Filter queries by date only, not exact UTC.** `[Field7] eq '2026-03-15'` matches both representations because the query layer normalizes date-only filtering.

## Status / Test evidence

- **First confirmed:** 2026-04-22 on build `20260418.1` — `4-A-us-BRT.V2` (during the V2 review-queue closure).
- **Test slots:** `4-A-us-BRT.V2` — PASS the regression with V2 expected encoding the bug behavior.
- **Spec:** [`testing/specs/date-handling/cat-4-url-params.spec.js`](../../../../testing/specs/date-handling/cat-4-url-params.spec.js)
- **Test data:** [`testing/fixtures/test-data.js:7188-7203`](../../../../testing/fixtures/test-data.js#L7188-L7203)
- **Research doc:** [`research/date-handling/forms-calendar/analysis/bug-10-v2-url-param-normalize.md`](../../../../research/date-handling/forms-calendar/analysis/bug-10-v2-url-param-normalize.md) + [fix recommendations](../../../../research/date-handling/forms-calendar/analysis/bug-10-v2-url-param-normalize-fix-recommendations.md).
- **Documentation:** [`docs/reference/form-fields.md § Known Bugs`](../../../../docs/reference/form-fields.md#known-bugs-calendar-field).

## References

- Catalog entry: [v2-bugs-catalog.md § A.4](../v2-bugs-catalog.md)
- Related: [bug-7-wrong-day-utc-plus.md](bug-7-wrong-day-utc-plus.md) — FORM-BUG-7 active on SFV/typed paths produces the divergent value
- Related: [bug-3-hardcoded-params.md](bug-3-hardcoded-params.md) — URL-param init is the **one** V2 path that *correctly* uses field config (the other paths are hardcoded)
