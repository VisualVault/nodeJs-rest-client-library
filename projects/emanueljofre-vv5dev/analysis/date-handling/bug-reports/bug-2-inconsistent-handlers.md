# FORM-BUG-2: Popup and typed input store different values for legacy fields

## Metadata

- **Environment:** EmanuelJofre on vv5dev — https://vv5dev.visualvault.com
- **Build / platform version:** progVersion `6.1.20260416.1` · formViewerBuild `20260418.1` · dbVersion `3041` (fingerprint `f36b65dd`)
- **Calendar pipeline:** V2 (`useUpdatedCalendarValueLogic = true`, Database scope) — bug applies on the legacy code path which V2 reuses largely unchanged
- **Browser / OS:** Browser-agnostic.
- **User role:** Any authenticated user entering values into legacy calendar fields.
- **Timezone:** All TZs affected.
- **Frequency:** Always (deterministic when input is via popup).
- **Severity:** **MEDIUM.** Same field, same date, two stored values depending on which input path the user chose.

## Summary

For legacy calendar fields (`useLegacy=true` — Configs E, F, G, H), the popup-input code path and the typed-input code path produce different stored values for the same logical date. The popup path stores a full UTC datetime (`"2026-03-15T03:00:00.000Z"` on BRT — UTC of local midnight). The typed-input path stores a date-only string (`"2026-03-15"` — collapsed to the date portion).

The divergence is in `calChangeSetValue()` (popup) vs `calChange()` (typed) on legacy fields. Typed input is the **correct** path — it stores the expected legacy format consistently across configs and timezones. The popup path is the buggy one.

The bug is not unique to V2 — V1 has it too. But V2 inherits the legacy code path largely unchanged, so this defect persists in the V2 environment.

## Steps to Reproduce

### Preconditions

- An authenticated user account on EmanuelJofre / vv5dev.
- A legacy calendar field exposed (Configs E, F, G, H — `useLegacy=true`).
- The Date Test Harness covers all 4 legacy configs.

### Test data

| Variant | Config | Input method | Stored |
|---|---|---|---|
| Popup | E (legacy date-only TZ-aware) | Calendar popup → click March 15 | `"2026-03-15T03:00:00.000Z"` (BRT-midnight UTC) |
| Typed | E | Type `03/15/2026` | `"2026-03-15"` |
| Popup | H (legacy DateTime ignoreTZ) | Calendar popup → click March 15 | `"2026-03-15T03:00:00.000Z"` |
| Typed | H | Type `03/15/2026 14:30` | `"2026-03-15T14:30:00.000Z"` (per [FORM-BUG-V2-LEGACY-Z](v2-legacy-z.md)) |

### How to read Expected vs Actual

- **Expected:** Popup and typed input produce equivalent stored values for the same field.
- **Actual:** Popup stores a UTC datetime; typed stores per-config legacy format. The difference is detectable as a stored-string mismatch and breaks exact-string queries.

## Reproductions

### Reproduction A — Config E popup vs typed differential

1. Open the Date Test Harness on https://vv5dev.visualvault.com.
2. **Popup path:** Click into the Config E field, click the calendar icon, click March 15, 2026. Tab off.
3. Console: `getValueObjectValue(<Config E field>)`
4. **Observed (popup):** `"2026-03-15T03:00:00.000Z"` (BRT)
5. **Typed path:** Clear the field. Type `03/15/2026`. Tab off.
6. **Observed (typed):** `"2026-03-15"` (legacy date-only)

### Reproduction B — Cross-TZ confirmation

1. Repeat Reproduction A on an IST browser.
2. **Popup path:** stores UTC of IST-midnight: `"2026-03-14T18:30:00.000Z"` (with FORM-BUG-7 day shift).
3. **Typed path:** stores `"2026-03-15"` consistently.

### Reproduction C — Query divergence

1. Save records via both paths.
2. Query `[Field<E>] eq '2026-03-15'` — finds only the typed-input record (date-only filtering).
3. Query `[Field<E>] eq '2026-03-15T03:00:00.000Z'` — finds only the popup record.

## Concrete values by timezone

| Browser TZ | Popup stored | Typed stored |
|---|---|---|
| BRT (UTC-3) | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15"` |
| IST (UTC+5:30) | `"2026-03-14T18:30:00.000Z"` | `"2026-03-15"` |
| UTC | `"2026-03-15T00:00:00.000Z"` | `"2026-03-15"` |

## Workaround

1. **Standardize on one input path per workflow.** Train users to either always use the popup or always type the date — don't mix.
2. **Server-side normalization.** A pre-save hook can detect both shapes and normalize to one canonical format.
3. **Avoid legacy configs.** New form templates should use non-legacy configs (A–D) where the popup/typed divergence is less pronounced.

## Status / Test evidence

- **Confirmed on V2.** Cat-2 BRT 8/8 PASS suggests typed input is correct on V2 too. Popup behavior on legacy under V2 not yet swept exhaustively — investigation queued.
- **Test slots:** Cat-1 (popup) and Cat-2 (typed) entries for Configs E, F, G, H.
- **Spec:** [`testing/specs/date-handling/cat-1-legacy-popup.spec.js`](../../../../testing/specs/date-handling/cat-1-legacy-popup.spec.js) and [`cat-2-typed-input.spec.js`](../../../../testing/specs/date-handling/cat-2-typed-input.spec.js).
- **Research doc:** [`research/date-handling/forms-calendar/analysis/bug-2-inconsistent-handlers.md`](../../../../research/date-handling/forms-calendar/analysis/bug-2-inconsistent-handlers.md) + [fix recommendations](../../../../research/date-handling/forms-calendar/analysis/bug-2-fix-recommendations.md).
- **Documentation:** [`docs/reference/form-fields.md § Known Bugs`](../../../../docs/reference/form-fields.md#known-bugs-calendar-field).

## References

- Catalog entry: [v2-bugs-catalog.md § B.2](../v2-bugs-catalog.md)
- Related V2 typed-input bugs: [v2-typed-mm-overflow.md](v2-typed-mm-overflow.md), [v2-config-d-typed-empty.md](v2-config-d-typed-empty.md)
