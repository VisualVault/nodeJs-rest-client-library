# FORMDASHBOARD-BUG-1: Dashboard and Forms Display Dates in Different Formats

## What Happens

When a user views a record in the VisualVault Dashboard and then opens the same record in the Forms UI, the dates look different — even though the underlying value is identical. The dashboard shows `3/15/2026` while the form shows `03/15/2026`. The dashboard shows `2:30 PM` while the form shows `02:30 PM`.

The difference is in leading zeros and minor formatting — the actual date and time values are the same. No data is wrong, no values are shifted. But users comparing the two views see mismatched text and may question which one is correct.

This happens because the dashboard and the form are built on two completely different technology stacks that each apply their own date formatting rules. Neither component is aware of the other's format.

---

## Severity: LOW

Cosmetic formatting difference only. No data integrity impact. Both views show the correct date and time — they just format them differently.

---

## Who Is Affected

- **Users** who view the same record in both the dashboard grid and the Forms UI — they see slightly different date text and may report it as a discrepancy
- **Support staff** investigating data accuracy complaints — they need to know this is a formatting difference, not a data difference
- **All 8 field configurations** are affected — the format mismatch applies to both date-only and date+time fields

This is distinct from the time-shift issue documented in [WEBSERVICE-BUG-1](../../web-services/analysis/ws-bug-1-cross-layer-shift.md), where the dashboard shows the correct time (e.g., 2:30 PM) but the form shows a shifted time (e.g., 11:30 AM). That is a data-layer problem. This formatting bug is purely cosmetic.

---

## Background

### Two Technology Stacks, Two Format Rules

The VisualVault platform uses two different rendering engines for displaying form data:

**Dashboard** — Server-side rendered by **Telerik RadGrid** (ASP.NET WebForms / .NET):

- The server reads the SQL `datetime` value, formats it using .NET date format strings, and sends pre-rendered HTML to the browser
- Browser timezone has zero effect — the server does all formatting

**Forms UI** — Client-side rendered by **Angular + Kendo** (JavaScript):

- The browser receives the raw date value, parses it in JavaScript, and formats it using Kendo date picker format rules
- Browser timezone affects some DateTime fields (see [FORM-BUG-4](../../forms-calendar/analysis/bug-4-legacy-save-format.md), [FORM-BUG-5](../../forms-calendar/analysis/bug-5-fake-z-drift.md))

Each stack has its own default date format string, and they don't agree on leading zeros.

---

## The Problem in Detail

### The Format Difference

| Component        | Technology      | Date Format  | DateTime Format      | Leading Zeros |
| ---------------- | --------------- | ------------ | -------------------- | :-----------: |
| Dashboard (.NET) | Telerik/ASP.NET | `M/d/yyyy`   | `M/d/yyyy h:mm tt`   |      No       |
| Forms (Angular)  | Kendo/Angular   | `MM/dd/yyyy` | `MM/dd/yyyy hh:mm a` |      Yes      |

### What Users See

**Date-only fields** (all configs with `enableTime=false`):

| Same Record, Same Field | Dashboard Shows | Forms Shows  | Difference            |
| ----------------------- | --------------- | ------------ | --------------------- |
| March 5, 2026           | `3/5/2026`      | `03/05/2026` | Leading zeros         |
| March 15, 2026          | `3/15/2026`     | `03/15/2026` | Leading zero on month |
| December 1, 2026        | `12/1/2026`     | `12/01/2026` | Leading zero on day   |

**Date+time fields** (all configs with `enableTime=true`):

| Same Record, Same Field | Dashboard Shows      | Forms Shows           | Difference            |
| ----------------------- | -------------------- | --------------------- | --------------------- |
| 2:30 PM, March 15       | `3/15/2026 2:30 PM`  | `03/15/2026 02:30 PM` | Leading zeros + hour  |
| 12:00 AM, March 15      | `3/15/2026 12:00 AM` | `03/15/2026 12:00 AM` | Leading zero on month |

### Why This Is Confusing

A user looking at the dashboard grid sees `3/15/2026`. They click through to the form and see `03/15/2026`. If they're investigating a data issue (especially one of the other date bugs), the format difference adds noise — they may wonder if the values are actually different, when they're not.

For date+time fields with `ignoreTimezone=false`, this formatting difference compounds with [WEBSERVICE-BUG-1](../../web-services/analysis/ws-bug-1-cross-layer-shift.md)'s time shift — the user sees BOTH a format change AND a time change, making it harder to isolate which difference matters.

---

## Test Evidence

All 8 field configurations were tested in the DB-6 (Cross-Layer) test category. Every single configuration showed the format mismatch — 8/8 FAIL for exact string match.

### Date-Only Configurations

| Config | Dashboard Display | Forms Display | Match? | Failure Mode  |
| :----: | ----------------- | ------------- | :----: | ------------- |
|   A    | `3/15/2026`       | `03/15/2026`  |   No   | Leading zeros |
|   B    | `3/15/2026`       | `03/15/2026`  |   No   | Leading zeros |
|   E    | `3/15/2026`       | `03/15/2026`  |   No   | Leading zeros |
|   F    | `3/15/2026`       | `03/15/2026`  |   No   | Leading zeros |

### Date+Time Configurations

| Config | Dashboard Display   | Forms Display         | Match? | Failure Mode                                      |
| :----: | ------------------- | --------------------- | :----: | ------------------------------------------------- |
|   C    | `3/15/2026 2:30 PM` | `03/15/2026 11:30 AM` |   No   | Leading zeros **+ time shift** (WEBSERVICE-BUG-1) |
|   D    | `3/15/2026 2:30 PM` | `03/15/2026 02:30 PM` |   No   | Leading zeros + hour format                       |
|   G    | `3/15/2026 2:30 PM` | `03/15/2026 11:30 AM` |   No   | Leading zeros **+ time shift** (WEBSERVICE-BUG-1) |
|   H    | `3/15/2026 2:30 PM` | `03/15/2026 02:30 PM` |   No   | Leading zeros + hour format                       |

Configs C and G show BOTH the format mismatch AND the WEBSERVICE-BUG-1 time shift. Configs D and H show only the format mismatch (the `ignoreTimezone=true` flag preserves the display time but the formatting still differs).

---

## Workarounds

There is no user-side workaround — the formatting is controlled by the platform's server-side and client-side rendering engines respectively.

**For support staff**: When a user reports "the dashboard shows a different date than the form," first check whether it's only a leading-zero difference (this bug, cosmetic) or an actual time shift (WEBSERVICE-BUG-1, data issue). If the date and time values are the same and only the format differs, reassure the user that the data is correct.

---

## Proposed Fix

Change one format string to match the other. The VV platform team needs to decide which format is canonical:

**Option A — Align dashboard to Forms format** (add leading zeros to .NET):

```
Current:  M/d/yyyy h:mm tt     → "3/15/2026 2:30 PM"
Fixed:    MM/dd/yyyy hh:mm tt  → "03/15/2026 02:30 PM"
```

**Option B — Align Forms to dashboard format** (remove leading zeros from Angular):

```
Current:  MM/dd/yyyy hh:mm a   → "03/15/2026 02:30 PM"
Fixed:    M/d/yyyy h:mm a      → "3/15/2026 2:30 PM"
```

Either option is a single format-string change in the respective component's configuration.

---

## Fix Impact Assessment

### What Changes If Fixed

- Dashboard and Forms display identical date text for the same record
- Users comparing the two views see consistent formatting
- Support investigations of date discrepancies have one less variable to account for

### Backwards Compatibility Risk: NONE

This is a display-only change. No stored values are affected. The date and time values remain identical — only the text representation changes.

### Regression Risk: LOW

A single format string change in either the Telerik RadGrid column configuration (.NET) or the Kendo date picker format (Angular). No logic change, no data flow change. Visual regression testing should verify the new format renders correctly across all date field types.
