# WS-BUG-1: API-written records shift by browser TZ on first form open

## Metadata

- **Environment:** EmanuelJofre on vv5dev — https://vv5dev.visualvault.com
- **Build / platform version:** progVersion `6.1.20260416.1` · formViewerBuild `20260418.1` · dbVersion `3041` (fingerprint `f36b65dd`)
- **Calendar pipeline:** Bug is server-side; not affected by V1/V2 forms toggle. Active on V2.
- **Browser / OS:** Browser-agnostic on the API side; the shift is observed on any browser that opens the affected record.
- **User role:** Any authenticated user opening a record that was created via the standard `postForms` API.
- **Timezone:** Magnitude of shift = browser UTC offset. UTC users see no shift.
- **Frequency:** Always (deterministic on first form open of an API-created record).
- **Severity:** **HIGH.** Silent data corruption — first form open shifts the value; saving from that form (even without touching the field) commits the shifted value, overwriting the API-written original.

## Summary

A developer script writes a date+time value via `vvClient.forms.postForms()` — for example `"2026-03-15T14:30:00"` (2:30 PM, March 15). The database stores `2026-03-15 14:30:00.000`. When a user opens this record in the Forms UI on a BRT browser, the form displays **11:30 AM** instead of 2:30 PM — a 3-hour backward shift. If the user saves the form (even without touching the date field), the shifted 11:30 AM permanently overwrites the original 2:30 PM in the database. The original is gone.

The shift is in how the server serializes API-written values for the Forms UI's GET request. Records created via `postForms` are serialized with a Z suffix that the form's `parseDateString()` strips and reinterprets as local time. Records created via the alternative `forminstance/` endpoint are serialized identically to UI-saved records and display correctly.

This bug is the production trigger documented in Freshdesk #124697 / Jira WADNR-10407 — hundreds of thousands of migrated records had their times silently corrupted after users opened them in Forms.

## Steps to Reproduce

### Preconditions

- An authenticated user account on EmanuelJofre / vv5dev.
- A `Date Test Harness` form template available with at least one DateTime field (Configs C, D, G, H).
- A script execution context with `vvClient` access (Node.js or the WS test harness).
- Browser system timezone set to any non-UTC zone.

### Test data

| Slot | Config | Browser TZ | API write | First form open shows |
|---|---|---|---|---|
| `10-D-ws-isoZ.V2` | D | BRT | `2026-03-15T14:30:00Z` via postForms | `2026-03-15T11:30:00` (-3h shift) |
| `10-D-ws-isoNoZ.V2` | D | BRT | `2026-03-15T14:30:00` | `2026-03-15T11:30:00` |
| `10-D-ws-dateOnly.V2` | D | BRT | `2026-03-15` | `2026-03-14T21:00:00` (date+time interpretation) |
| `10-D-ws-midnight-cross.V2` | D | BRT | `2026-03-14T23:00:00` | `2026-03-14T20:00:00` (crosses midnight) |
| `10-C-ws-isoZ.V2` | C | BRT | `2026-03-15T14:30:00Z` | `2026-03-15T11:30:00` |

### How to read Expected vs Actual

- **Expected:** Form displays the same instant the API wrote (2:30 PM if the user is in any TZ; UTC equivalent matches DB).
- **Actual:** Form displays the API value shifted by the browser's UTC offset. Save commits the shifted value.

## Reproductions

### Reproduction A — `postForms` write, BRT browser open

1. Run the WS test harness in `--action WS-1 --configs D --input-date 2026-03-15T14:30:00 --tz BRT`. The script writes via `vvClient.forms.postForms()`.
2. Note the returned `instanceName` (e.g., `Date Tes-NNNNNN`).
3. Open the record in the Forms UI on a BRT browser: `https://vv5dev.visualvault.com/FormViewer/app?formid=...&DataID=...`.
4. **Observed in form display:** `03/15/2026 11:30 AM` (3 hours earlier than the API wrote).
5. Click Save (no field changes). The save commits 11:30 AM to the database, overwriting 2:30 PM.

### Reproduction B — `forminstance/` write produces correct display (control)

1. Use the `forminstance/` endpoint via direct HTTP POST (no SDK wrapper). See [`research/forminstance-pattern/`](../../../../research/forminstance-pattern/) for the canonical pattern.
2. Write the same value: `2026-03-15T14:30:00`.
3. Open in Forms UI on the same BRT browser.
4. **Observed:** `03/15/2026 02:30 PM` (correct). The form does not shift on this endpoint.

### Reproduction C — Cross-TZ confirmation

1. `postForms` write of `2026-03-15T14:30:00`.
2. Open on an IST browser (system TZ = Asia/Calcutta).
3. **Observed in form display:** `03/15/2026 08:00 PM` — shifted forward by 5.5 hours.

## Concrete values by timezone

| Browser TZ | UTC offset | API write | First form open | Save commits |
|---|---|---|---|---|
| BRT | UTC-3 | `2026-03-15T14:30:00` | 11:30 AM | `2026-03-15T11:30:00.000Z` |
| IST | UTC+5:30 | `2026-03-15T14:30:00` | 8:00 PM | `2026-03-15T20:00:00.000Z` |
| UTC | UTC+0 | `2026-03-15T14:30:00` | 2:30 PM (correct) | `2026-03-15T14:30:00.000Z` |

## Workaround

1. **Use `forminstance/` endpoint for API writes that produce records users will open in Forms.** This is the [`research/forminstance-pattern/`](../../../../research/forminstance-pattern/) pattern.
2. **Document the exposed forms.** Audit existing customer scripts using `postForms` against DateTime fields and migrate them to `forminstance/` where the records are user-edited downstream.
3. **Educate users.** If `forminstance/` migration is not feasible immediately, instruct users not to save the form on first open if they only need to view the value — saving commits the shift.

## Status / Test evidence

- **Confirmed on V2.** The forms toggle does not affect this bug — it is server-side. Confirmed via Cat-10 (cross-layer) entries on the V2 baseline.
- **Test slots:** `10-D-ws-isoZ.V2`, `10-D-ws-isoNoZ.V2`, `10-D-ws-dateOnly.V2`, `10-D-ws-dotnet.V2`, `10-D-ws-midnight-cross.V2`, `10-C-ws-isoZ.V2` — all PASS V2 regression.
- **WS regression evidence:** WS-1 + WS-2 + WS-3 baselines on `f36b65dd` (2026-05-04) — 32 slots, all PASS.
- **Research doc:** [`research/date-handling/web-services/analysis/ws-bug-1-cross-layer-shift.md`](../../../../research/date-handling/web-services/analysis/ws-bug-1-cross-layer-shift.md) + [fix recommendations](../../../../research/date-handling/web-services/analysis/ws-bug-1-fix-recommendations.md).
- **Production reference:** Freshdesk ticket #124697 / Jira WADNR-10407 — production manifestation that triggered this investigation. Hundreds of thousands of records affected.

## References

- Catalog entry: [v2-bugs-catalog.md § C.1](../v2-bugs-catalog.md)
- Architectural detail: [ws-bug-4-endpoint-format-mismatch.md](ws-bug-4-endpoint-format-mismatch.md) — explains why the two endpoints diverge despite writing identical DB values
- Forms-side trigger: [bug-1-timezone-stripping.md](bug-1-timezone-stripping.md) — the form's `parseDateString()` is what strips and shifts the API-served value
