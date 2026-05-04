# FORM-BUG-7: Wrong day stored for UTC+ timezones on date-only fields

## Metadata

- **Environment:** EmanuelJofre on vv5dev — https://vv5dev.visualvault.com
- **Build / platform version:** progVersion `6.1.20260416.1` · formViewerBuild `20260418.1` · dbVersion `3041` (fingerprint `f36b65dd`)
- **Calendar pipeline:** V2 (`useUpdatedCalendarValueLogic = true`, Database scope)
- **Browser / OS:** Browser-agnostic.
- **User role:** Any authenticated user in a UTC+ timezone (e.g., India, UAE, Australia, China, Japan) entering values into date-only calendar fields.
- **Timezone:** All UTC+ TZs affected (any `tzOffset > 0`). UTC- TZs are not affected on the date-only path.
- **Frequency:** Always (deterministic on UTC+ browsers for date-only fields).
- **Severity:** **HIGH.** UTC+ users store the previous day on every save. Cumulative across round-trips: each GFV→SFV cycle loses another day.

## Summary

When a user in a UTC+ timezone enters a date into a date-only calendar field (Configs A, B, E, F — all `enableTime=false`), the form stores the **previous day** in the database. The form's display shows the user-typed date correctly, masking the shift until the form is reloaded. On reload, the field comes back as the previous day.

The shift is not specific to `ignoreTimezone=false` — it affects all date-only configs equally, including those with `ignoreTimezone=true`. The bug is in the parsing path: `parseDateString()` produces a Date object that, when converted to UTC, falls into the previous calendar day for UTC+ users.

The bug also fires on the preset-init path (`5-A-IST.V2`) — preset values store as the previous day. And it accumulates across GFV→SFV round-trips: after one trip, the IST user's "2026-03-15" becomes "2026-03-14"; after two trips, "2026-03-13"; and so on.

V2 inherited this bug from V1 — the test-data tag is `FORM-BUG-7-persists-on-V2` to make the persistence explicit. The shift mechanism is identical to V1's; only the stored format differs (V2 stores `"2026-03-14T18:30:00.000Z"` where V1 stored `"2026-03-14"`).

## Steps to Reproduce

### Preconditions

- An authenticated user account on EmanuelJofre / vv5dev.
- macOS system timezone set to a UTC+ zone (e.g., Asia/Calcutta for IST UTC+5:30).
- Chrome restarted after TZ change so JS `Date` reflects the new TZ. Verify with: `new Date().toString()`.
- The Date Test Harness with date-only fields (Configs A, B, E, F).

### Test data

| Slot | Config | TZ | Input | Stored |
|---|---|---|---|---|
| `7-A-dateOnly-IST.V2` | A | IST | `2026-03-15` SFV | `"2026-03-14T18:30:00.000Z"` |
| `7-B-dateOnly-IST.V2` | B | IST | `2026-03-15` SFV | `"2026-03-15T00:00:00.000Z"` (B uses ignoreTZ; stored value is correct date but FORM-BUG-7 still fires elsewhere) |
| `7-E-dateOnly-IST.V2` | E | IST | `2026-03-15` SFV | `"2026-03-14T18:30:00.000Z"` |
| `7-F-dateOnly-IST.V2` | F | IST | `2026-03-15` SFV | `"2026-03-15T00:00:00.000Z"` |
| `5-A-IST.V2` | A | IST | Preset `03/01/2026` | `"2025-12-31T18:30:00.000Z"` (preset additionally hits [FORM-BUG-V2-PRESET-YEAR](v2-preset-year.md)) |

### How to read Expected vs Actual

- **Expected:** UTC+ users save March 15 and the database stores a value whose date portion is March 15.
- **Actual:** The stored value's UTC date portion is March 14 (one day earlier). Display shows March 15 until reload.

## Reproductions

### Reproduction A — IST user types March 15

1. Set macOS TZ to Asia/Calcutta. Restart Chrome. Verify with `new Date().toString()` — should show `+0530`.
2. Open the Date Test Harness on https://vv5dev.visualvault.com.
3. Type `03/15/2026` into the Config A field — `Field7` / `dateTzAwareV2Empty`.
4. Tab off. **Display shows:** `03/15/2026`.
5. Save the form. Reload the saved record.
6. Console: `VV.Form.GetFieldValue('Field7')`
7. **Observed (after reload):** `"2026-03-14"` (previous day) or `"2026-03-14T18:30:00.000Z"` in raw.

### Reproduction B — Round-trip accumulates

1. Same form, same field.
2. Console:
```javascript
const initial = VV.Form.GetFieldValue('Field7');  // "2026-03-15"
await VV.Form.SetFieldValue('Field7', initial);   // SFV with the GFV value
const trip1 = VV.Form.GetFieldValue('Field7');    // "2026-03-14" — lost a day
await VV.Form.SetFieldValue('Field7', trip1);
const trip2 = VV.Form.GetFieldValue('Field7');    // "2026-03-13"
```
3. **Observed:** Each cycle loses another day.

### Reproduction C — UTC- TZ control (BRT, no shift)

1. Switch macOS to America/Sao_Paulo. Restart Chrome.
2. Repeat Reproduction A. **Observed:** Stored value reflects March 15 correctly. UTC- TZs do not trigger this bug.

## Concrete values by timezone

| Browser TZ | UTC offset | Input | Stored (V2) |
|---|---|---|---|
| IST | UTC+5:30 | `2026-03-15` | `"2026-03-14T18:30:00.000Z"` (UTC-5h30 from local midnight) |
| Asia/Tokyo | UTC+9 | `2026-03-15` | `"2026-03-14T15:00:00.000Z"` (predicted, not yet swept) |
| Pacific/Auckland | UTC+13 | `2026-03-15` | `"2026-03-14T11:00:00.000Z"` (predicted) |
| UTC | UTC+0 | `2026-03-15` | `"2026-03-15T00:00:00.000Z"` (no shift) |
| BRT | UTC-3 | `2026-03-15` | `"2026-03-15T03:00:00.000Z"` (no day shift) |

## Workaround

1. **Use `ignoreTimezone=true` configs (B, F) for date-only fields** — these store a TZ-naive value that doesn't shift.
2. **Use `Current Date` mode for presets** — `new Date()` bypasses the parse path and is unaffected.
3. **Server-side day-correction.** A pre-save hook can detect UTC+ user input and correct the day.
4. **Avoid round-trip patterns on Config A/E for UTC+ users.** Each GFV→SFV cycle compounds the shift.

## Status / Test evidence

- **Confirmed persisting on V2** — explicitly tagged `FORM-BUG-7-persists-on-V2` in test-data.js for clarity.
- **Test slots:** `3-A-IST-BRT.V2`, `5-A-IST.V2`, `7-A-dateOnly-IST.V2`, `7-B-dateOnly-IST.V2`, `7-E-dateOnly-IST.V2`, `7-F-dateOnly-IST.V2`, `8-A.V2`, `9-GDOC-A-IST-1.V2`, `11-A-save-BRT-load-IST.V2`, `11-E-save-BRT-load-IST.V2`, `16-A-controls.V2` — all PASS the regression with V2 expected encoding the bug.
- **Spec:** [`testing/specs/date-handling/cat-7-setfieldvalue.spec.js`](../../../../testing/specs/date-handling/cat-7-setfieldvalue.spec.js), `cat-5`, `cat-3`, `cat-9`, `cat-11`.
- **Research doc:** [`research/date-handling/forms-calendar/analysis/bug-7-wrong-day-utc-plus.md`](../../../../research/date-handling/forms-calendar/analysis/bug-7-wrong-day-utc-plus.md) + [fix recommendations](../../../../research/date-handling/forms-calendar/analysis/bug-7-fix-recommendations.md).
- **Documentation:** [`docs/reference/form-fields.md § Known Bugs`](../../../../docs/reference/form-fields.md#known-bugs-calendar-field).

## References

- Catalog entry: [v2-bugs-catalog.md § B.3](../v2-bugs-catalog.md)
- Related preset bug: [v2-preset-year.md](v2-preset-year.md) — preset path additionally shifts months/years
- Related TZ bug: [bug-1-timezone-stripping.md](bug-1-timezone-stripping.md) — DateTime fields hit a different shift on Z-suffix paths
