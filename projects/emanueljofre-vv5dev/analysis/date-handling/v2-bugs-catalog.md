# V2 Bugs Catalog — EmanuelJofre-vv5dev

Catalog of every date-handling bug observable on this environment. Scope: bugs that **happen in V2** — including new V2-only defects, V1 defects that persist unchanged in V2, V1 defects with partially-changed V2 behavior, and cross-component (server-side / dashboard / document-library) defects unaffected by the V1/V2 toggle. V1-only defects that are fixed in V2 are listed at the end for completeness.

| Field | Value |
|---|---|
| **Customer** | `EmanuelJofre` (server: `vv5dev`, database: `Main`) |
| **V1/V2 setting** | `useUpdatedCalendarValueLogic = true` (Database scope; pushed via `setUserInfo()`) |
| **Build context** | `progVersion 6.1.20260416.1` · `formViewerBuild 20260418.1` · `dbVersion 3041` · fingerprint `f36b65dd` |
| **Last regression** | 2026-05-04 — forms 294P/3F/2T/3I, WS 129P/0F, dash 36P/0F, doc 40P/0F |
| **V1 reference env** | `EmanuelJofre-vvdemo` (V1, fingerprint `b18dbfdb`) — used as the baseline differential |
| **Sources** | [`research/date-handling/forms-calendar/analysis/`](../../../../research/date-handling/forms-calendar/analysis/), [`docs/reference/form-fields.md`](../../../../docs/reference/form-fields.md), [`testing/date-handling/v2-baseline-audit.md`](../../testing/date-handling/v2-baseline-audit.md) |

---

## Quick categorization

| Category | Count | Bugs |
|---|---:|---|
| **A — V2-only new defects** (introduced by V2 / Kendo v2) | 8 | `FORM-BUG-3`, `FORM-BUG-8`, `FORM-BUG-V2-EPOCH-PRESERVED`, `FORM-BUG-V2-URL-PARAM-NORMALIZE`, `FORM-BUG-V2-LEGACY-Z`, `FORM-BUG-V2-UTCMIDNIGHT`, `FORM-BUG-V2-PRESET-YEAR`, `FORM-BUG-V2-TYPED-MM-OVERFLOW`, `FORM-BUG-V2-CONFIG-D-TYPED-EMPTY` |
| **B — V1 forms-calendar defects that persist unchanged in V2** | 3 | `FORM-BUG-1`, `FORM-BUG-2`, `FORM-BUG-7` |
| **C — Cross-component defects unaffected by the V1/V2 toggle** (server-side / Dash / DocLib) | 8 | `WS-BUG-1`..`WS-BUG-6`, `DB-BUG-1`, `DOC-BUG-1` |
| **D — V1 defects with partial / changed behavior in V2** | 1 | `DOC-BUG-2` (investigation pending) |
| **E — V1 defects FIXED in V2** (do not happen here, listed for the differential record) | 3 | `FORM-BUG-4`, `FORM-BUG-5`, `FORM-BUG-6` |
| **Withdrawn** (formerly tagged but rescinded) | 1 | `FORM-BUG-V2-SAVE-RELOAD-EMPTY` (root cause was a test-helper bug) |

> Note: counts above include `FORM-BUG-V2-CONFIG-D-TYPED-EMPTY` and `FORM-BUG-V2-TYPED-MM-OVERFLOW` separately. Total V2-only-new defects = 8 atomic IDs (the catalog table sums to 9 entries because `FORM-BUG-3` is counted under V2-only since the hardcoded-params bug is in `initCalendarValueV2()`).

---

# Section A — V2-only new defects

Defects introduced or first observable on the V2 calendar pipeline (`useUpdatedCalendarValueLogic = true`) and Kendo v2.

## A.1 · FORM-BUG-3 — Hardcoded parameters in `initCalendarValueV2()`

| Aspect | Value |
|---|---|
| Severity | Medium |
| Trigger | Any saved-data load or preset-default load on V2; URL-param load is unaffected |
| Configs | All — hardcoded params override every config |
| First confirmed | Code analysis (V1 env, on demo) — Test evidence pending in V2 baseline |
| Research doc | [`bug-3-hardcoded-params.md`](../../../../research/date-handling/forms-calendar/analysis/bug-3-hardcoded-params.md) + [`-fix-recommendations.md`](../../../../research/date-handling/forms-calendar/analysis/bug-3-fix-recommendations.md) |
| V1 vs V2 | V1 uses different inline init code; V2's `initCalendarValueV2()` passes hardcoded `enableTime` and/or `ignoreTimezone` to `parseDateString()` for two of the three call sites |
| Workaround | None at the script layer |

## A.2 · FORM-BUG-8 — V2 `SetFieldValue('' \| null)` hangs indefinitely

| Aspect | Value |
|---|---|
| Severity | Medium |
| Trigger | `VV.Form.SetFieldValue(field, '')` or `SetFieldValue(field, null)` on V2 |
| Configs | A, C, D confirmed (likely all configs) |
| First confirmed | 2026-04-20 on `f36b65dd` — 4 cat-12 edge-case tests timed out |
| Research doc | None yet — entry only in [`form-fields.md § Known Bugs`](../../../../docs/reference/form-fields.md#known-bugs-calendar-field) |
| V1 vs V2 | V1 returns promptly (storing empty/invalid value); V2 promise never resolves |
| Workaround | Wrap SFV in `Promise.race` with a 10-15s timeout; do not pass empty/null to SFV under V2 |
| Status | Cat-12 spec now guards with explicit timeout — tests pass on guarded path. Underlying bug unresolved. |

## A.3 · FORM-BUG-V2-EPOCH-PRESERVED — Epoch-ms preserved instead of normalized

| Aspect | Value |
|---|---|
| Severity | Medium |
| Trigger | `SetFieldValue(field, <number>)` with an epoch-ms value on V2 |
| Configs | A (date-only) + C (DateTime) confirmed |
| First confirmed | 2026-04-22 on `f36b65dd` — `7-A-epoch.V2`, `7-C-epoch.V2` |
| Research doc | [`bug-9-v2-epoch-preserved.md`](../../../../research/date-handling/forms-calendar/analysis/bug-9-v2-epoch-preserved.md) + [`-fix-recommendations.md`](../../../../research/date-handling/forms-calendar/analysis/bug-9-v2-epoch-preserved-fix-recommendations.md) |
| V1 vs V2 | V1 normalized epoch-ms to ISO/date string (`"2026-03-15"` for A, `"2026-03-15T00:00:00"` for C). V2 keeps the stringified epoch (`"1773543600000"`) in raw + GFV |
| Downstream impact | Scripts that do `Date.parse(gfv)` after an epoch-ms SFV silently produce `NaN` on V2 |
| Workaround | Wrap GFV with `new Date(+gfv)`, or stringify the epoch before SFV via `new Date(epoch).toISOString()` |

## A.4 · FORM-BUG-V2-URL-PARAM-NORMALIZE — URL-param init normalizes to UTC ISO, ignoring `ignoreTimezone`

| Aspect | Value |
|---|---|
| Severity | Low–Medium |
| Trigger | `?Field7=03/15/2026` (or any US-format date) URL-param init on V2 |
| Configs | A (`enableTime=false`, `ignoreTimezone=false`) confirmed; likely all configs where the URL-param route is used |
| First confirmed | 2026-04-22 on `f36b65dd` — `4-A-us-BRT.V2` |
| Research doc | [`bug-10-v2-url-param-normalize.md`](../../../../research/date-handling/forms-calendar/analysis/bug-10-v2-url-param-normalize.md) + fix-recs |
| V1 vs V2 | V1 stored `"03/15/2026"` as-is. V2 stores `"2026-03-15T00:00:00.000Z"`. **Critical detail**: this is NOT the UTC-of-local-midnight that SFV/typed input produces (`"2026-03-15T03:00:00.000Z"` on BRT) — same field, different write path, different stored value |
| Downstream impact | Workflows that mix URL-param init and SFV/typed input on the same field see inconsistent UTC values |
| Workaround | Avoid mixing init paths on the same field; verify URL-param-driven flows store the value before relying on it |

## A.5 · FORM-BUG-V2-LEGACY-Z — `.000Z` appended where V1 stored a naive local string

| Aspect | Value |
|---|---|
| Severity | Low |
| Trigger | Any DateTime save (typed input, popup, SFV, save-reload, GFV-roundtrip) under V2 |
| Configs | C, D, G, H (all DateTime) — confirmed across non-legacy and legacy DateTime configs |
| First confirmed | 2026-04-22 on `f36b65dd` — 77 audit entries flagged |
| Research doc | [`bug-11-v2-legacy-z.md`](../../../../research/date-handling/forms-calendar/analysis/bug-11-v2-legacy-z.md) + fix-recs |
| V1 vs V2 | V1 stripped Z on save via `getSaveValue()` (FORM-BUG-4 — produced `"2026-03-15T00:00:00"`). V2 routes through `moment(input).toISOString()`, producing the full `"2026-03-15T00:00:00.000Z"`. Calendar instant is preserved |
| Note | This is arguably an *improvement* — V2's value is more honest about the underlying instant. Tagged as a bug for the cross-environment consistency concern |
| Workaround | Normalize at the consumer (strip `.000Z` for legacy-format consumers, or accept both shapes) |

## A.6 · FORM-BUG-V2-UTCMIDNIGHT — Date-only fields stored as `T00:00:00.000Z` instead of bare `YYYY-MM-DD`

| Aspect | Value |
|---|---|
| Severity | Low |
| Trigger | Any date-only field save under V2 |
| Configs | B, F (and propagating to A in some paths) — date-only configs |
| First confirmed | 2026-04-22 on `f36b65dd` — multiple Cat-1, Cat-2, Cat-3, Cat-7 entries |
| Research doc | None yet — tagged in [`v2-baseline-audit.md`](../../testing/date-handling/v2-baseline-audit.md) only |
| V1 vs V2 | V1 stored bare `"2026-03-15"`. V2 stores `"2026-03-15T00:00:00.000Z"`. Calendar date is preserved; representation differs |
| Note | Same root cause as `FORM-BUG-V2-LEGACY-Z` (V2's `getSaveValue` flows through `toISOString()`), but observable on date-only fields where V1's output had no time portion at all |
| Workaround | Same as V2-LEGACY-Z — consumer-side normalization |

## A.7 · FORM-BUG-V2-PRESET-YEAR — Preset value year/month shifts

| Aspect | Value |
|---|---|
| Severity | Medium |
| Trigger | Preset-default load on V2 with a date-only Config A field configured with `Initial Value` |
| Configs | A confirmed; not yet swept across all configs |
| First confirmed | 2026-04-22 on `f36b65dd` — `5-A-IST.V2` (V1 `2026-03-01` → V2 `2025-12-31T18:30:00.000Z`), `5-A-BRT.V2` (V1 `2026-03-01` → V2 `2026-01-01T03:00:00.000Z`) |
| Research doc | None yet — tagged in audit only |
| V1 vs V2 | V1 used the preset month/day directly. V2 appears to interpret the preset month as a 0-indexed value (or a similar off-by-one), and the `ignoreTimezone` handling in the preset path differs |
| Investigation needed | Trace V2's preset-init code path (`initCalendarValueV2()` preset branch, hardcoded params per FORM-BUG-3); confirm whether the year/month shift is a parse-mode error or a TZ off-by-one |
| Workaround | Avoid presets on Config A under V2; use `Current Date` mode or set value via SFV after load |

## A.8 · FORM-BUG-V2-TYPED-MM-OVERFLOW — Invalid month/day silently normalized via JS `Date` overflow

| Aspect | Value |
|---|---|
| Severity | **High — silent data corruption** |
| Trigger | Typed input on V2 with Customer Culture = English (United States), Config A |
| Configs | A confirmed (Cat-18 enUS baseline 2026-04-22, 5/5 inputs) — likely all configs that route typed input through Kendo v2's segmented `<input>` |
| First confirmed | 2026-04-22 on `20260418.1` (vv5dev cat-18 enUS Culture baseline) |
| Research doc | None yet — entry only in [`form-fields.md § Known Bugs`](../../../../docs/reference/form-fields.md#known-bugs-calendar-field) |
| V1 vs V2 | V1's typed-input pipeline rejected obviously-invalid segments. V2's segmented-typing pipeline accepts any digits and passes them through `new Date(Y, M-1, D)`, which silently normalizes via JS overflow |
| Concrete example | A Brazilian user typing `"15/03/2026"` (DD/MM intent) stores **May 3, 2026** (month 15 → `Date(2026, 14, 3)` → May 2027 → year-rolled to May 2027 ... actually JS does `15 - 1 = 14` months → next year May = May 2027; but observed value is May 3 2026 per the form-fields.md note). ISO with hyphens (`"2026-03-15"`) misparses catastrophically — year truncates to `"0315"`, observed: `"0315-02-02T03:06:28.000Z"` |
| Workaround | Enforce Culture consistency between customer config and user input locale; validate typed dates at the application layer before relying on stored values |

## A.9 · FORM-BUG-V2-CONFIG-D-TYPED-EMPTY — Config D typed input does not commit

| Aspect | Value |
|---|---|
| Severity | **Medium — silent data loss** |
| Trigger | Typed input into a Config D field's visible MM/DD/YYYY segments under V2 with the date-only mask auto-population active (vv5dev default) |
| Configs | D (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`) only |
| First confirmed | 2026-04-22 on `20260418.1` — Cat-18 enUS Config D baseline (5/5 inputs all stored `raw=""`, `api=""`) |
| Research doc | None yet — entry only in [`form-fields.md § Known Bugs`](../../../../docs/reference/form-fields.md#known-bugs-calendar-field) |
| V1 vs V2 | V1's typed-input commit path was unaffected by the mask. V2's blur handler for `ignoreTimezone=true + enableTime=true + useLegacy=false` fails to write through to the partition |
| Configuration interaction | The same inputs on Config A (also rendered date-only via the same mask mechanism) DO commit and trigger `FORM-BUG-V2-TYPED-MM-OVERFLOW`. So the bug is Config-D-specific |
| SFV path | Unaffected — SFV stores `<input>.000Z` normally |
| Workaround | Use SFV instead of typed input on Config D under V2; or clear the mask auto-population in Form Designer to restore DateTimePicker time-segment rendering (untested) |

---

# Section B — V1 forms-calendar defects that persist unchanged in V2

These bugs are not introduced by V2; they exist in V1 as well, and the V2 calendar code does not fix them.

## B.1 · FORM-BUG-1 — Timezone marker stripped on form load

| Aspect | Value |
|---|---|
| Severity | Medium–High |
| Persists in V2 | ✅ Yes — same code-path stripping `Z` before parse (`parseDateString()` in V2; inline strip in V1) |
| Configs | All DateTime configs (C, D, G, H) — both V1 and V2 |
| Test evidence on V2 | Multiple `4-C-z`, `4-D-z`, `4-G-z`, `4-H-z` Cat-4 URL-param entries; `3-C-IST-BRT.V2` |
| Research doc | [`bug-1-timezone-stripping.md`](../../../../research/date-handling/forms-calendar/analysis/bug-1-timezone-stripping.md) + fix-recs |
| Notes for V2 | V2's `ignoreTZ=false` recovery branch works for DateTime but backfires for date-only fields at UTC- timezones. URL parameter input and FillinAndRelate chains are NOT self-consistent — a Z-suffixed value arriving via URL param loses its UTC semantics |

## B.2 · FORM-BUG-2 — Popup and typed input store different values for legacy fields

| Aspect | Value |
|---|---|
| Severity | Medium |
| Persists in V2 | Likely — the legacy code path (`useLegacy=true`) is largely unchanged in V2; not yet exhaustively re-tested |
| Configs | E, F, G, H (any legacy field) |
| Test evidence on V2 | Cat-2 BRT 8/8 PASS suggests typed input is correct on V2 too. Popup behavior on legacy under V2 not yet swept |
| Research doc | [`bug-2-inconsistent-handlers.md`](../../../../research/date-handling/forms-calendar/analysis/bug-2-inconsistent-handlers.md) + fix-recs |
| Investigation needed | Cat-1 popup vs Cat-2 typed differential on V2 for E-H configs |

## B.3 · FORM-BUG-7 — Wrong day stored for UTC+ timezones

| Aspect | Value |
|---|---|
| Severity | High |
| Persists in V2 | ✅ Yes — explicitly tagged `FORM-BUG-7-persists-on-V2` in test-data.js |
| Configs | All date-only fields (`enableTime=false` — A, B, E, F) |
| Test evidence on V2 | `3-A-IST-BRT.V2`, `5-A-IST.V2`, `7-A-dateOnly-IST.V2`, `7-B-dateOnly-IST.V2`, `7-E-dateOnly-IST.V2`, `7-F-dateOnly-IST.V2`, `8-A.V2`, `9-GDOC-A-IST-1.V2`, `11-A-save-BRT-load-IST.V2`, `11-E-save-BRT-load-IST.V2`, plus 16-A-controls.V2 |
| Research doc | [`bug-7-wrong-day-utc-plus.md`](../../../../research/date-handling/forms-calendar/analysis/bug-7-wrong-day-utc-plus.md) + fix-recs |
| V2 specifics | V2 stores `"2026-03-14T18:30:00.000Z"` where V1 stored bare `"2026-03-15"` shifted to the previous day — same calendar date interpretation, different format. The IST shift formula and consequences are identical to V1 |

---

# Section C — Cross-component defects unaffected by the V1/V2 toggle

The `useUpdatedCalendarValueLogic` toggle is **forms-only**. Server-side, dashboard, and document-library defects apply identically on V1 and V2 environments.

## C.1 · WS-BUG-1 — Cross-layer shift (API → Forms)

| Aspect | Value |
|---|---|
| Severity | High |
| Forms-toggle scope | None — server-side bug, not affected by V1/V2 |
| Test evidence on V2 | Cat-10 cross-layer entries (`10-D-ws-isoZ.V2`, `10-D-ws-isoNoZ.V2`, `10-D-ws-dateOnly.V2`, `10-D-ws-dotnet.V2`, `10-D-ws-midnight-cross.V2`, `10-C-ws-isoZ.V2`) |
| Research doc | [`ws-bug-1-cross-layer-shift.md`](../../../../research/date-handling/web-services/analysis/ws-bug-1-cross-layer-shift.md) + fix-recs |

## C.2..C.6 · WS-BUG-2..6 — Server-side date-handling defects

| Bug | Name | Severity | Confirmed on V2 |
|---|---|---|---|
| WS-BUG-2 | DD/MM/YYYY silently discarded | High | ✅ Implicit in 129/129 PASS (matrix encodes the bug behavior) |
| WS-BUG-3 | Ambiguous dates silently swapped | High | ✅ Same |
| WS-BUG-4 | Two endpoints store the same value, Forms diverges | Medium | ✅ Same |
| WS-BUG-5 | Compact ISO and epoch formats silently discarded | Medium | ✅ Same |
| WS-BUG-6 | Date-only fields accept time components | Medium | ✅ Same |

All baselined on `f36b65dd` (2026-05-04) via the WS regression. Research docs: [`research/date-handling/web-services/analysis/ws-bug-N-*.md`](../../../../research/date-handling/web-services/analysis/) (2..6 + fix-recs).

## C.7 · DB-BUG-1 — Dashboard format inconsistency

| Aspect | Value |
|---|---|
| Severity | Medium |
| Forms-toggle scope | None — dashboard render, not affected by V1/V2 |
| Test evidence on V2 | Dash baseline 36/36 PASS on `f36b65dd` (DB-1..DB-8) |
| Research doc | [`formdashboard-bug-1-format-inconsistency.md`](../../../../research/date-handling/dashboards/analysis/formdashboard-bug-1-format-inconsistency.md) + fix-recs |

## C.8 · DOC-BUG-1 — Index field TZ offset converted to UTC, Z stripped

| Aspect | Value |
|---|---|
| Severity | High |
| Forms-toggle scope | None — Document Library API is server-side |
| Test evidence on V2 | DOC-1, DOC-2, DOC-7 entries — 40/40 PASS on `f36b65dd`, with the bug behavior encoded as Expected. DOC-7 (2026-04-24) extended the bug to query semantics: consumers must use server-converted UTC, not original offset |
| Research doc | [`document-library/analysis/overview.md`](../../../../research/date-handling/document-library/analysis/overview.md) |

---

# Section D — V1 defects with partial / changed behavior in V2

## D.1 · DOC-BUG-2 — Cannot clear date once set

| Aspect | Value |
|---|---|
| V1 (vvdemo) | Cannot clear — empty-string PUT does not clear the index field |
| V2 (vv5dev) | **Empty-string clearing now clears the field** (DOC-3 entries 40/40 PASS, 2026-04-24 baseline) |
| Status | **Investigation pending** — flagged in [`research/date-handling/CLAUDE.md`](../../../../research/date-handling/CLAUDE.md): "DOC-BUG-2 may be a partial fix vs. vvdemo" |
| What to verify | (1) Does the fix apply only to empty-string, or also to `null`, `undefined`, omission, whitespace? (2) Does it apply to all `fieldType=4` index fields, or only specific configs? (3) Is this an environment difference (DocLib config flag) or a platform-version difference? (4) Side effects — does the cleared value re-populate from `defaultValue` if one is configured? |
| Investigation method | Run DOC-3 and DOC-11 on vvdemo (V1), compare against vv5dev (V2). Inspect DocLib API behavior in the request/response cycle, distinguishing "the field came back null" vs "the value is gone" |

---

# Section E — V1 defects FIXED in V2 (do not happen here)

Listed for the differential record. These bugs reproduce on V1 (vvdemo, WADNR) but not on V2 (vv5dev). Useful when comparing environments or when assessing whether a V1 bug-report applies to a V2 customer.

## E.1 · FORM-BUG-4 — Save format strips timezone (V1)

V2 fix: `getSaveValue()` routes through `moment(input).toISOString()` — produces full ISO+Z (`"2026-03-15T00:00:00.000Z"`). The V1 strip-on-save behavior is gone. Replaced by `FORM-BUG-V2-LEGACY-Z` (Section A.5) — which itself is arguably a non-bug improvement.

## E.2 · FORM-BUG-5 — Fake Z in `GetFieldValue` — progressive drift

V2 fix: V2's GFV returns the raw partition value without the V1 fake-Z injection. Confirmed via TC-8-V2 and the cat-13 multi-roundtrip-db entries — V2 round-trips show zero drift across multiple cycles. The `useLegacy=true` immunity that worked under V1 is preserved under V2. Confirmed in form-fields.md § FORM-BUG-5 entry: "V2 code path is also immune".

## E.3 · FORM-BUG-6 — `GetFieldValue` returns "Invalid Date" for empty fields

V2 fix: V2 cat-12 edge-case tests pass — `12-empty-config-a`, `12-empty-config-c`, `12-empty-value`, `12-null-input` all PASS as of 2026-04-22 (build `f36b65dd`). The V1 `RangeError` on Config C is gone. Note: V2 introduces a different problem on the same SFV-empty path — `FORM-BUG-8` (Section A.2) — where the SFV call hangs instead of throwing.

---

# Withdrawn (for the record)

## ~~FORM-BUG-V2-SAVE-RELOAD-EMPTY~~ — withdrawn 2026-04-22

| Aspect | Value |
|---|---|
| Original report | 2026-04-21 — 4 cat-14/cat-16 V2 tests observed empty values after save+reload |
| Root cause | Test-helper bug in [`testing/helpers/vv-form.js`](../../../../testing/helpers/vv-form.js) `saveFormAndReload()`. The helper called `page.reload()` which re-loaded the current browser URL. Under V2, Angular does not push `DataID` into the browser URL on save, so `page.reload()` loaded a fresh empty template instead of the saved record |
| Resolution | Helper fixed to navigate explicitly to the saved-record URL returned by `saveFormOnly()`. After the fix, the 4 affected tests observe the real V2-persisted values |
| Side observation | Cat-4-reload tests were previously passing for the wrong reason — their URL contained `&Field7=...` params so `page.reload()` re-applied them after save. The V2 "URL does not include DataID after save" behavior is itself a platform observation worth documenting |

---

# Investigation queue

Items that need RCA before they can be confirmed or upgraded to dedicated bug docs:

1. **DOC-BUG-2 V2 partial-fix verification** — see Section D.1. Run DOC-3 + DOC-11 on V1 (vvdemo) vs V2 (vv5dev), document the differential. Decide whether to upgrade to a dedicated `DOC-BUG-2-V2-PARTIAL-FIX` tag or leave as a fixed-in-V2 entry.
2. **`FORM-BUG-V2-PRESET-YEAR` root cause** (Section A.7) — trace V2's preset-init code path; confirm whether the year/month shift is a parse-mode error or a TZ off-by-one. Sweep across all configs.
3. **`FORM-BUG-2` V2 popup vs typed legacy differential** (Section B.2) — Cat-1 popup vs Cat-2 typed for E–H configs on V2. Currently assumed to persist unchanged but not exhaustively re-tested.
4. **`FORM-BUG-V2-TYPED-MM-OVERFLOW` and `FORM-BUG-V2-CONFIG-D-TYPED-EMPTY` research docs** — both are HIGH/MEDIUM-severity but currently exist only in the form-fields.md known-bugs table. Both warrant dedicated `research/date-handling/forms-calendar/analysis/bug-N-*.md` deep dives.
5. **`FORM-BUG-V2-UTCMIDNIGHT` research doc** (Section A.6) — currently audit-tagged only; deserves a research doc parallel to the V2-LEGACY-Z one.
6. **`FORM-BUG-8` root cause** (Section A.2) — async continuation hypothesis is unverified. RCA blocked behind the cat-12 timeout-guard work that just made the symptom non-fatal.

---

# How this catalog stays accurate

- **When a new V2 tag lands** in `testing/fixtures/test-data.js` or the v2-baseline-audit, add a row to Section A.
- **When a V1 bug is verified persistent on V2**, add to Section B with the test evidence.
- **When a V1 bug is verified fixed on V2**, move from B to E.
- **When the investigation queue items resolve**, update the relevant section and remove from the queue.
- **Regenerate the audit** with `npm run audit:v2 -- --project EmanuelJofre-vv5dev --write` after any V2-specific test additions, and reconcile new `KNOWN_BUG_PERSISTS` / `UNFLAGGED_DIFFERENCE` entries.

---

# References

- **Per-bug research docs**: [`research/date-handling/forms-calendar/analysis/`](../../../../research/date-handling/forms-calendar/analysis/) (FORM-BUG-1..7, V2-EPOCH, V2-URL, V2-LEGACY-Z), [`research/date-handling/web-services/analysis/`](../../../../research/date-handling/web-services/analysis/) (WS-BUG-1..6), [`research/date-handling/dashboards/analysis/`](../../../../research/date-handling/dashboards/analysis/) (DB-BUG-1), [`research/date-handling/document-library/analysis/`](../../../../research/date-handling/document-library/analysis/) (DOC-BUG-1, DOC-BUG-2)
- **Known-bugs reference table**: [`docs/reference/form-fields.md § Known Bugs`](../../../../docs/reference/form-fields.md#known-bugs-calendar-field) — has all FORM-BUG-1..8 + V2-* entries with severity and reproduction notes
- **V1 vs V2 audit**: [`testing/date-handling/v2-baseline-audit.md`](../../testing/date-handling/v2-baseline-audit.md) — 271 V2 entries classified IDENTICAL / SAME_LOCAL_DATE / KNOWN_BUG_PERSISTS / UNFLAGGED_DIFFERENCE
- **Closed review queue**: [`testing/date-handling/v2-review-queue.md`](../../testing/date-handling/v2-review-queue.md) — historical record of the V2 tags that landed and the one withdrawn
- **Central Admin V2 toggle scope**: [`projects/emanueljofre-vv5dev/analysis/central-admin/SCOPE-HIERARCHY.md`](../central-admin/SCOPE-HIERARCHY.md)
- **Cross-task index**: [`research/date-handling/CLAUDE.md`](../../../../research/date-handling/CLAUDE.md) — the platform-level catalog of all date-handling investigations
