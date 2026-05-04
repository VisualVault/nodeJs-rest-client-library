# FORM-BUG-V2-PRESET-YEAR: Preset date Initial Value shifts year/month on form init

## Metadata

- **Environment:** EmanuelJofre on vv5dev — https://vv5dev.visualvault.com
- **Build / platform version:** progVersion `6.1.20260416.1` · formViewerBuild `20260418.1` · dbVersion `3041` (fingerprint `f36b65dd`)
- **Calendar pipeline:** V2 (`useUpdatedCalendarValueLogic = true`, Database scope)
- **Browser / OS:** Browser-agnostic. Confirmed on Chromium under macOS via Playwright.
- **User role:** Any authenticated user opening a form whose calendar field has a preset Initial Value.
- **Timezone:** Both BRT and IST confirmed; bug interacts with TZ.
- **Frequency:** Always (deterministic when a Config A field with `Enable Initial Value=true` and `Initial Value=03/01/2026` is opened).
- **Severity:** **MEDIUM.** The preset value is silently shifted to a different real date, often crossing a year boundary.

## Summary

When a form opens with a Config A (date-only, TZ-aware, non-legacy) field configured with an Initial Value preset like `03/01/2026`, the V2 init pipeline does not produce the configured date. Instead it produces a date that has shifted by months — and at UTC- timezones, into the previous year.

Two confirmed cases:

| Browser TZ | Preset configured | Stored after init |
|---|---|---|
| BRT (UTC-3) | `03/01/2026` (March 1) | `2026-01-01T03:00:00.000Z` (**January 1**, 2026) |
| IST (UTC+5:30) | `03/01/2026` (March 1) | `2025-12-31T18:30:00.000Z` (**December 31**, 2025) |

The IST case crosses a year boundary backward — a record configured to start on March 1, 2026 stores December 31, 2025 instead. The BRT case shifts March → January (an off-by-two-months pattern that suggests month indexing confusion in the parse path).

The bug is not the same as [FORM-BUG-7](bug-7-wrong-day-utc-plus.md) — FORM-BUG-7 shifts UTC+ users by one day on date-only fields. This bug shifts months and (at UTC-) years, on a different code path (preset init in V2's `initCalendarValueV2()` vs. SFV/typed in FORM-BUG-7).

## Steps to Reproduce

### Preconditions

- An authenticated user account on EmanuelJofre / vv5dev.
- A form with a Config A field (date-only, `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`).
- The field configured in the Form Designer with `Enable Initial Value = true` and `Initial Value = 03/01/2026` (Mar 1, 2026 — a "round" date for diagnostic clarity).
- The Date Test Harness on vv5dev includes such a field via the `dateTzAwareV2Preset` slot in `FIELD_MAP_BY_CUSTOMER['EmanuelJofre-vv5dev']`.

### Test data

| Slot | TZ | Preset configured | Stored after preset init |
|---|---|---|---|
| `5-A-BRT.V2` | BRT (UTC-3) | `03/01/2026` | `2026-01-01T03:00:00.000Z` |
| `5-A-IST.V2` | IST (UTC+5:30) | `03/01/2026` | `2025-12-31T18:30:00.000Z` |

### How to read Expected vs Actual

- **Expected:** Preset `03/01/2026` initializes to March 1, 2026 in the field's stored representation.
- **Actual:** Stored representation is January 1, 2026 (BRT) or December 31, 2025 (IST). The display may show the user-configured date but the underlying value differs.

## Reproductions

### Reproduction A — BRT browser, preset shifts to January 1

1. Set the macOS system TZ to America/Sao_Paulo (BRT, UTC-3) and restart Chrome.
2. Open the Date Test Harness on https://vv5dev.visualvault.com.
3. The Config A preset field (`Field20` / `dateTzAwareV2Preset`) initializes from its preset.
4. Console: `VV.Form.VV.FormPartition.getValueObjectValue('Field20')`
5. **Observed:** `"2026-01-01T03:00:00.000Z"` — January 1, 2026 (BRT-midnight UTC), not March 1.
6. Save the form. API value: same — `2026-01-01T03:00:00.000Z`. The preset is gone.

### Reproduction B — IST browser, preset shifts to December 31, 2025

1. Set the macOS system TZ to Asia/Calcutta (IST, UTC+5:30) and restart Chrome.
2. Open the same form.
3. Console: `getValueObjectValue('Field20')`
4. **Observed:** `"2025-12-31T18:30:00.000Z"` — December 31, 2025. The preset crossed the year boundary backward.

### Reproduction C — UTC browser (control needed)

The bug has not been swept at UTC. Open question: does UTC produce `2026-03-01T00:00:00.000Z` (correct) or some other shift? Investigation queued.

## Concrete values by timezone

| Browser TZ | UTC offset | Preset stored |
|---|---|---|
| BRT | UTC-3 | `2026-01-01T03:00:00.000Z` |
| IST | UTC+5:30 | `2025-12-31T18:30:00.000Z` |
| UTC | UTC+0 | (not yet swept) |

## Workaround

1. **Avoid `Initial Value` presets on Config A under V2.** Use `Current Date` mode instead, which initializes via `new Date()` and bypasses the preset code path.
2. **Initialize via SFV after load.** Bind a form-load script that sets the field value explicitly: `await VV.Form.SetFieldValue(field, '2026-03-01')`. Be aware of [FORM-BUG-V2-LEGACY-Z](v2-legacy-z.md) and [FORM-BUG-8](bug-8-sfv-null-hang.md) on the SFV path, but neither produces a year-shift.
3. **Re-evaluate field configuration.** If the preset was intended to provide a default that users would commonly override, consider whether the preset is needed at all.

## Status / Test evidence

- **First confirmed:** 2026-04-22 on build `20260418.1` — `5-A-BRT.V2` and `5-A-IST.V2` (during the V2 baseline audit sweep).
- **Test slots:** `5-A-BRT.V2`, `5-A-IST.V2` — both PASS the regression with the V2 expected values encoding the bug behavior.
- **Spec:** [`testing/specs/date-handling/cat-5-preset-date.spec.js`](../../../../testing/specs/date-handling/cat-5-preset-date.spec.js)
- **Test data:** [`testing/fixtures/test-data.js:1547-1562`](../../../../testing/fixtures/test-data.js#L1547-L1562) (BRT) and `1513-1528` (IST).
- **Audit entry:** [`v2-baseline-audit.md`](../../testing/date-handling/v2-baseline-audit.md) — flagged `KNOWN_BUG_PERSISTS` with `FORM-BUG-V2-PRESET-YEAR` tag.
- **Research doc:** None yet. **Investigation queued** to identify the parse/index-error in V2's preset init.
- **Hypothesis:** V2's preset path may treat the configured Initial Value's month as 0-indexed (so `03` becomes April for one calendar interpretation, then off-by-one elsewhere) and combine that with an `ignoreTimezone` mishandling. UTC sweep is needed to disambiguate.

## References

- Catalog entry: [v2-bugs-catalog.md § A.7](../v2-bugs-catalog.md)
- Related preset issue: [bug-3-hardcoded-params.md](bug-3-hardcoded-params.md) — V2's preset code path passes hardcoded `enableTime=false, ignoreTimezone=true`, which may interact with this year-shift
- Differential: [bug-7-wrong-day-utc-plus.md](bug-7-wrong-day-utc-plus.md) — FORM-BUG-7 shifts by 1 day; this bug shifts by months/years
