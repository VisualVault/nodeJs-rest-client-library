# FORMDASHBOARD-BUG-1: Dashboard and Forms Display Dates in Different Formats

## What Happens

When a user views a record in the VisualVault Dashboard and then opens the same record in the Forms UI, the dates look different — even though the underlying value is identical. The dashboard shows `3/15/2026` while the form shows `03/15/2026`. The dashboard shows `2:30 PM` while the form shows `02:30 PM`.

The difference is in leading zeros and minor formatting — the actual date and time values are the same. No data is wrong, no values are shifted. But users comparing the two views see mismatched text and may question which one is correct.

---

## When This Applies

Two conditions must be true for this formatting inconsistency to be visible:

### 1. The user views the same record in both the dashboard and the Forms UI

The dashboard grid and the Forms UI are built on two different technology stacks — the dashboard uses a .NET server-side rendering engine (Telerik RadGrid) while the Forms UI uses a client-side JavaScript framework (Angular + Kendo). Each stack applies its own default date format string, and they do not agree on leading zeros (see [Background](#background)).

The inconsistency is only visible when a user compares the same record across both views. Users who only interact with one view (dashboard only or Forms only) see a consistent format within that view.

### 2. The date includes a single-digit month, day, or hour

When the month, day, and hour are all two digits (e.g., December 15 at 12:30 PM), the two formats produce visually identical output. The difference only appears when a component has a single digit — the Forms UI pads it with a leading zero while the dashboard does not.

All 8 field configurations are affected — the format mismatch applies to both date-only and date+time fields, and to both legacy and non-legacy configurations.

---

## Severity: LOW

Cosmetic formatting difference only. No data integrity impact. Both views show the correct date and time — they format them differently. Users may report this as a data discrepancy, but the underlying values are identical.

This is distinct from the time-shift described in [WEBSERVICE-BUG-1](../../web-services/analysis/ws-bug-1-cross-layer-shift.md), where the dashboard shows the correct time (e.g., 2:30 PM) but the form shows a shifted time (e.g., 11:30 AM). That is a data-layer problem. This formatting difference is purely visual.

---

## How to Reproduce

1. Open the VisualVault Dashboard that displays the DateTest form's records
2. Locate a record with a date value that has a single-digit month or day (e.g., March 5 or March 15)
3. Note the date format in the dashboard grid — e.g., `3/15/2026` (no leading zeros)
4. Click through to open the same record in the Forms UI
5. Note the date format in the form's calendar field — e.g., `03/15/2026` (leading zeros)
6. **Expected**: Both views display the same format for the same value
7. **Actual**: The dashboard omits leading zeros; the Forms UI includes them

For date+time fields, also compare the time format: the dashboard shows `2:30 PM` while the form shows `02:30 PM`.

### Automated

This bug report is backed by a supporting test repository containing Playwright automation scripts that capture dashboard grid values and Forms field values for cross-layer comparison. Access can be requested from the Solution Architecture team.

---

## Background

### Two Technology Stacks, Two Format Rules

The VisualVault platform uses two different rendering engines for displaying form data:

**Dashboard** — Server-side rendered by **Telerik RadGrid** (ASP.NET WebForms / .NET):

- The server reads the SQL `datetime` value, formats it using .NET date format strings, and sends pre-rendered HTML to the browser
- Browser timezone has zero effect — the server does all formatting

**Forms UI** — Client-side rendered by **Angular + Kendo** (JavaScript):

- The browser receives the raw date value, parses it in JavaScript, and formats it using Kendo date picker format rules
- Browser timezone affects some DateTime fields (see [FORM-BUG-1](../../forms-calendar/analysis/bug-1-timezone-stripping.md), [FORM-BUG-5](../../forms-calendar/analysis/bug-5-fake-z-drift.md))

Each stack has its own default date format string, and they do not agree on leading zeros.

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

### Interaction With WEBSERVICE-BUG-1

For date+time fields with `ignoreTimezone=false` (Configs C and G), this formatting difference compounds with [WEBSERVICE-BUG-1](../../web-services/analysis/ws-bug-1-cross-layer-shift.md)'s time shift — the user sees both a format change and a time change when moving from dashboard to form. This makes it harder to isolate which difference is cosmetic (this bug) and which is a data issue (WEBSERVICE-BUG-1).

---

## Verification

Verified via Playwright automation on the demo environment at `vvdemo.visualvault.com`. All 8 field configurations were tested in the DB-6 (Cross-Layer) test category, comparing dashboard grid display values against Forms UI display values for the same record. Every configuration showed the format mismatch — 8/8 FAIL for exact string match. Date-only configs (A, B, E, F) showed leading-zero differences only. Date+time configs with `ignoreTimezone=false` (C, G) showed both the format mismatch and the WEBSERVICE-BUG-1 time shift. Date+time configs with `ignoreTimezone=true` (D, H) showed the format mismatch plus leading-zero hour difference, but no time shift.

**Limitations**: Testing was performed on the demo environment only. The dashboard's .NET format string and the Forms UI's Kendo format string were identified through output observation, not code inspection — the server-side .NET code is not available in this repository. Other environments have not been verified.

This bug report is backed by a supporting test repository containing automation scripts, additional per-bug analysis documents, raw test data, and test case specifications. Access can be requested from the Solution Architecture team.

---

## Technical Root Cause

The dashboard and Forms UI use different date format strings in their respective rendering engines:

- **Dashboard (.NET)**: Telerik RadGrid formats dates using the .NET format pattern `M/d/yyyy` (date) and `M/d/yyyy h:mm tt` (datetime). The single `M`, `d`, and `h` tokens omit leading zeros.
- **Forms UI (Angular)**: Kendo date picker formats dates using the pattern `MM/dd/yyyy` (date) and `MM/dd/yyyy hh:mm a` (datetime). The double `MM`, `dd`, and `hh` tokens include leading zeros.

**File locations**: The dashboard format string is in the Telerik RadGrid column configuration in the .NET server-side code (not available in this repository). The Forms UI format string is in the Kendo date picker configuration within the FormViewer Angular application (`main.js`). Neither format string references the other — the two components have no shared format configuration.

The inconsistency is a consequence of the platform's dual-stack architecture. The .NET dashboard and Angular Forms UI were developed independently and each adopted their framework's default format conventions.

---

## Appendix: Field Configuration Reference

| Config | Field   | enableTime | ignoreTimezone | Description                 | Dashboard-Forms Mismatch               |
| ------ | ------- | ---------- | -------------- | --------------------------- | -------------------------------------- |
| A      | Field7  | —          | —              | Date-only baseline          | Leading zeros only                     |
| B      | Field10 | —          | ✅             | Date-only + ignoreTZ        | Leading zeros only                     |
| C      | Field6  | ✅         | —              | DateTime UTC (control)      | Leading zeros + WEBSERVICE-BUG-1 shift |
| D      | Field5  | ✅         | ✅             | DateTime + ignoreTZ         | Leading zeros + hour format            |
| E      | Field12 | —          | —              | Legacy date-only            | Leading zeros only                     |
| F      | Field11 | —          | ✅             | Legacy date-only + ignoreTZ | Leading zeros only                     |
| G      | Field14 | ✅         | —              | Legacy DateTime             | Leading zeros + WEBSERVICE-BUG-1 shift |
| H      | Field13 | ✅         | ✅             | Legacy DateTime + ignoreTZ  | Leading zeros + hour format            |

---

## Workarounds and Fix Recommendations

See [formdashboard-bug-1-fix-recommendations.md](formdashboard-bug-1-fix-recommendations.md) for workarounds, proposed fix options, and impact assessment.
