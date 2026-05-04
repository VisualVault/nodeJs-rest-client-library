# DB-BUG-1: Dashboard and Forms display dates in different formats

## Metadata

- **Environment:** EmanuelJofre on vv5dev — https://vv5dev.visualvault.com
- **Build / platform version:** progVersion `6.1.20260416.1` · formViewerBuild `20260418.1` · dbVersion `3041` (fingerprint `f36b65dd`)
- **Calendar pipeline:** Server-side dashboard render (Telerik RadGrid) vs Forms UI (Angular + Kendo). Not affected by V1/V2 forms toggle. Active on V2.
- **Browser / OS:** Browser-agnostic.
- **User role:** Any authenticated user comparing dashboard data to a form.
- **Timezone:** Not TZ-dependent for the format-mismatch portion (a separate, more severe issue is documented in [WS-BUG-1](ws-bug-1-cross-layer-shift.md)).
- **Frequency:** Always (deterministic when the date has a single-digit month, day, or hour).
- **Severity:** **MEDIUM (cosmetic).** No data integrity impact — both views show the same underlying value. Format mismatch is visually inconsistent.

## Summary

When a user views a record in the VV Dashboard and then opens the same record in the Forms UI, the dates look different even though the underlying value is identical. The dashboard shows `3/15/2026` while the form shows `03/15/2026`. The dashboard shows `2:30 PM` while the form shows `02:30 PM`.

The difference is in leading zeros and minor formatting — the actual date and time values are the same. No data is wrong. But users comparing the two views see mismatched text and may file the discrepancy as a bug.

The root cause is two different rendering stacks: the dashboard uses Telerik RadGrid (.NET server-side) with one default format string; the Forms UI uses Angular + Kendo (client-side) with a different one. They do not agree on leading zeros.

This bug is purely cosmetic. A separate, more severe issue exists where dashboard and form show **different times** for the same record — that's [WS-BUG-1](ws-bug-1-cross-layer-shift.md), a data-layer problem, not this format issue.

## Steps to Reproduce

### Preconditions

- An authenticated user account on EmanuelJofre / vv5dev.
- A record in the Date Test Harness with a date that has a single-digit component (e.g., March 5 or March 15 with single-digit hour).
- Dashboard configured to display the form template's records (DataDetails on vv5dev).

### Test data

| Field type | DB value | Dashboard renders | Form renders |
|---|---|---|---|
| Date-only | `2026-03-15` | `3/15/2026` | `03/15/2026` |
| DateTime | `2026-03-15 14:30:00` | `3/15/2026 2:30 PM` | `03/15/2026 02:30 PM` |
| DateTime (single-digit hour) | `2026-03-15 02:30:00` | `3/15/2026 2:30 AM` | `03/15/2026 02:30 AM` |

### How to read Expected vs Actual

- **Expected:** Both views display the same format for the same value.
- **Actual:** Dashboard omits leading zeros; Forms UI includes them.

## Reproductions

### Reproduction A — Date-only

1. Open the dashboard configured to show Date Test Harness records on vv5dev.
2. Locate a record with `Field4` (Config B, date-only, ignoreTZ) set to `2026-03-15`.
3. **Dashboard renders:** `3/15/2026` (no leading zeros).
4. Click through to open the record in the Forms UI.
5. **Form renders:** `03/15/2026` (with leading zero).

### Reproduction B — DateTime, single-digit month

1. Same dashboard, record with Config C field set to `2026-03-05T02:30:00`.
2. **Dashboard renders:** `3/5/2026 2:30 AM`.
3. Form renders: `03/05/2026 02:30 AM`.

### Reproduction C — Both two-digit components (no visible difference)

1. Date `12/15/2026 14:30`.
2. **Both views render:** `12/15/2026 2:30 PM` (dashboard, no leading zero on day) vs `12/15/2026 02:30 PM` (form). The hour difference still appears.
3. Only when month, day, AND hour are all two digits does the visual mismatch disappear.

## Concrete values by timezone

The format mismatch is TZ-independent. The displayed value depends on TZ for [WS-BUG-1](ws-bug-1-cross-layer-shift.md) reasons but the format of the rendered string is consistent across TZs within each view.

## Workaround

1. **Document the format difference for users.** When users report the discrepancy, explain it's cosmetic.
2. **Override the dashboard column format.** Telerik RadGrid columns accept a `DataFormatString` attribute — set it to match the Forms UI's format (`MM/dd/yyyy hh:mm tt`).
3. **Override the Forms UI format.** The Kendo DateTimePicker accepts a format string — set it to match the dashboard (`M/d/yyyy h:mm tt`).
4. **Server-side normalization.** A custom column format on the dashboard that explicitly emits `MM/dd/yyyy hh:mm tt` provides a consistent display.

## Status / Test evidence

- **Confirmed on V2** via the dashboard regression baseline on `f36b65dd` — DB-1 through DB-8 all PASS.
- **Test slots:** Cat-44 dashboard slots (36/36 PASS).
- **Research doc:** [`research/date-handling/dashboards/analysis/formdashboard-bug-1-format-inconsistency.md`](../../../../research/date-handling/dashboards/analysis/formdashboard-bug-1-format-inconsistency.md) + [fix recommendations](../../../../research/date-handling/dashboards/analysis/formdashboard-bug-1-fix-recommendations.md).

## References

- Catalog entry: [v2-bugs-catalog.md § C.7](../v2-bugs-catalog.md)
- Distinct from: [ws-bug-1-cross-layer-shift.md](ws-bug-1-cross-layer-shift.md) — a different cross-layer issue where dashboard and form show **different times** for the same record (data-layer bug, not formatting)
