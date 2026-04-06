# Web Services — Bug Analysis

Individual root-cause analysis documents for each confirmed issue in the VisualVault REST API date handling layer. Each document is structured for direct conversion into a product bug ticket.

## Overview

See [`overview.md`](overview.md) for the comprehensive analysis including executive summary, all confirmed behaviors (CB-1 through CB-32), hypothesis resolution, developer guidance, and design observations.

## Bug Documents

| Bug #    | Document                                                                       | Severity | Title                                              | Evidence   |
| -------- | ------------------------------------------------------------------------------ | -------- | -------------------------------------------------- | ---------- |
| WS-BUG-1 | [`ws-bug-1-cross-layer-shift.md`](ws-bug-1-cross-layer-shift.md)               | **HIGH** | postForms Z suffix causes datetime shift in Forms  | `[LIVE]`   |
| WS-BUG-2 | [`ws-bug-2-latam-data-loss.md`](ws-bug-2-latam-data-loss.md)                   | **HIGH** | DD/MM/YYYY formats silently stored as null         | `[LIVE]`   |
| WS-BUG-3 | [`ws-bug-3-ambiguous-dates.md`](ws-bug-3-ambiguous-dates.md)                   | MEDIUM   | Ambiguous dates interpreted as MM/DD (US bias)     | `[LIVE]`   |
| WS-BUG-4 | [`ws-bug-4-endpoint-format-mismatch.md`](ws-bug-4-endpoint-format-mismatch.md) | **HIGH** | postForms vs forminstance/ store different formats | `[LIVE]`   |
| WS-BUG-5 | [`ws-bug-5-silent-null-formats.md`](ws-bug-5-silent-null-formats.md)           | LOW      | Compact/epoch formats silently stored as null      | `[LIVE]`   |
| WS-BUG-6 | [`ws-bug-6-no-date-only-enforcement.md`](ws-bug-6-no-date-only-enforcement.md) | MEDIUM   | No server-side date-only type enforcement          | `[DESIGN]` |

## Additional Findings

| Finding                        | Location                                                                       | Description                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Node.js library passthrough    | [overview.md § Infrastructure Baseline](overview.md#3-infrastructure-baseline) | Zero date transformation in the client library — all behavior is server-side or Forms-side |
| TZ-safe/unsafe script patterns | [overview.md § Developer Guidance](overview.md#7-developer-guidance)           | 4 safe and 7 unsafe date patterns for production scripts                                   |

## Evidence Tags

- `[LIVE]` — Confirmed via API test execution across BRT, IST, UTC + browser verification
- `[CODE]` — Confirmed via source code analysis of upstream Node.js client library
- `[DESIGN]` — Systemic design inconsistency confirmed across multiple test categories
