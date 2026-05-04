# V2 Date-Handling Impact Analysis — EmanuelJofre-vv5dev

| Field | Value |
|---|---|
| **Prepared by** | Emanuel Jofré — Solution Architecture |
| **Date** | 2026-05-04 |
| **Phase** | Step 3 of the V2 documentation track (catalog → bug reports → impact analysis) |
| **Audience** | VV Engineering, Solution Architecture, Customer Success, integration partners |
| **Distribution** | Internal. Section 7 (recommendations) suitable to ship to VV Product / Engineering. |
| **Environment** | vv5dev / EmanuelJofre / Main · `progVersion 6.1.20260416.1` · `formViewerBuild 20260418.1` · `dbVersion 3041` · build fingerprint `f36b65dd` |
| **Calendar code path** | V2 (`useUpdatedCalendarValueLogic = true`, Database scope; pushed via `setUserInfo()`) |
| **Investigation** | [`research/date-handling/`](../../../../research/date-handling/) — root-cause analysis · [`v2-bugs-catalog.md`](v2-bugs-catalog.md) — bug catalog · [`bug-reports/`](bug-reports/) — 21 per-bug dossiers |
| **Companion docs** | Step 1: [`v2-bugs-catalog.md`](v2-bugs-catalog.md) · Step 2: [`bug-reports/`](bug-reports/) · Step 3: this document |

---

## How to read this document

- **Part 0** is the executive summary — 5 minutes.
- **Part 1** is the severity matrix — every bug ranked by weighted real impact, with the reasoning.
- **Part 2** is the customer-impact scenario walkthrough — six concrete production patterns and how the bugs manifest in each.
- **Part 3** is the V1 → V2 migration risk map — what changes for a customer crossing the toggle, what stays, what gets worse.
- **Part 4** is the compound-bug interaction matrix — places where bugs amplify each other.
- **Part 5** is the data-integrity audit summary — quantified picture of what V2 stored values look like in practice.
- **Part 6** is the gap and unknown register — what's not yet measured and the effect on this analysis.
- **Part 7** is the recommendations — per stakeholder (Engineering, Customer Success, integration partners, customer admins).
- **Appendices** hold the per-bug index, the full V1→V2 differential audit reference, the test-evidence build timeline, and a glossary.

All cross-references are relative paths from this file.

---

# Part 0 — Executive Summary

**21 date-handling defects are confirmed reproducing on V2** in this environment (build `f36b65dd`, fingerprint stable since 2026-04-22). The V2 calendar pipeline introduces 9 new defects, retains 3 V1 forms-calendar defects, and inherits 8 server-side / cross-component defects that the V1/V2 toggle does not affect. One V1 defect appears partially fixed in V2 and is queued for verification.

**The headline finding for V2-adopter customers**: V2 *fixes* three V1 forms-calendar defects (FORM-BUG-4 save-format strip, FORM-BUG-5 fake-Z drift, FORM-BUG-6 Invalid Date for empty fields) but introduces three of equal or higher severity in the typed-input path:

| Net change V1 → V2 | Bug | Severity |
|---|---|---|
| ✅ V2 fixes | FORM-BUG-5 fake-Z drift | High |
| ✅ V2 fixes | FORM-BUG-4 save-format strip | Medium |
| ✅ V2 fixes | FORM-BUG-6 GFV Invalid Date | High |
| ❌ V2 introduces | FORM-BUG-V2-TYPED-MM-OVERFLOW (silent data corruption) | **High** |
| ❌ V2 introduces | FORM-BUG-V2-CONFIG-D-TYPED-EMPTY (silent data loss) | Medium |
| ❌ V2 introduces | FORM-BUG-8 SFV-null hang | Medium |

V2 is not a strict improvement on V1 for date handling. The script-API and script-driven workflow paths are demonstrably better; the **typed-input** and **preset-init** paths are demonstrably worse.

## Top-5 risks ordered by weighted real impact

Real-impact ranking combines severity × likelihood × detectability. "Detectability" is critical — silent failures (no error, plausible-looking output) outrank loud failures (hang, crash, error).

| # | Bug | Severity | Likelihood | Detectability | Real impact |
|---|---|---|---|---|---|
| 1 | **WS-BUG-1** (cross-layer shift API → Forms) | High | High — every `postForms` write of a DateTime value | Low — first form open silently shifts; save commits | **HIGH — active in production for any customer with API-driven DateTime workflows.** Workaround (`forminstance/`) requires non-trivial migration. |
| 2 | **FORM-BUG-V2-TYPED-MM-OVERFLOW** | High | Medium-High — any LATAM/EU user typing into a V2 enUS-Culture form | Very Low — input shows what the user typed; storage silently differs | **HIGH — Culture-mismatched users silently corrupt data.** Magnifies for customers with mixed-locale user populations. |
| 3 | **WS-BUG-2 / WS-BUG-3** (DD/MM null + ambiguous swap) | High | High for LATAM/EU integrations | Low — API returns 200; no signal | **HIGH — direct silent data loss/corruption on any LATAM-fed integration.** |
| 4 | **FORM-BUG-7** (wrong day for UTC+ users on date-only fields) | High | High for any customer with a UTC+ user base | Medium — visible after reload, hidden until then | **HIGH for customers with global user bases; LOW for customers concentrated in UTC-.** |
| 5 | **DOC-BUG-1** (DocLib TZ converted to UTC, Z stripped) | High | Medium — affects any DocLib date integration | Low — stored value looks like a normal date | **HIGH for customers using DocLib date metadata in workflows or queries.** |

**Dropped from Top-5 after weighting** (lower severity, lower likelihood, or higher detectability):

- FORM-BUG-V2-LEGACY-Z and FORM-BUG-V2-UTCMIDNIGHT — low severity, format-only, no data loss
- FORM-BUG-8 (SFV-null hang) — high detectability (caller hangs, immediate signal)
- DB-BUG-1 — purely cosmetic, no data layer impact

## Headline numbers

- **21** confirmed bugs reproducing on V2
- **9** V2-only new (`FORM-BUG-V2-*` family + `FORM-BUG-3` + `FORM-BUG-8`)
- **3** V1 forms-calendar bugs persist on V2 (`FORM-BUG-1`, `-2`, `-7`)
- **8** server-side / cross-component bugs unaffected by the V1/V2 toggle (`WS-BUG-1..6`, `DB-BUG-1`, `DOC-BUG-1`)
- **1** V1 bug appears to be partially fixed on V2 (`DOC-BUG-2`) — verification pending
- **3** V1 bugs fully fixed on V2 (`FORM-BUG-4`, `-5`, `-6`)
- **499** test slots PASS the V2 baseline (forms 294, WS 129, dash 36, doc 40)
- **5** test slots show active failure on V2 (3 forms fail, 2 forms timeout)
- **45** forms-calendar test slots remain pending (Cat 14 mask, Cat 2 typed-input legacy, Cat 20 multi-user concurrency)

---

# Part 1 — Severity Matrix

Every bug, ranked by **weighted real impact**. The severity column from the bug reports is preserved; the impact column adds likelihood × detectability weighting.

| Bug | Section | Stated severity | Likelihood | Detectability | **Weighted impact** |
|---|---|---|---|---|---|
| WS-BUG-1 (cross-layer shift) | C | High | High | Low | **CRITICAL** |
| FORM-BUG-V2-TYPED-MM-OVERFLOW | A | High | Medium-High | Very Low | **CRITICAL** |
| WS-BUG-2 (DD/MM null) | C | High | High (LATAM/EU) | Low | **HIGH** |
| WS-BUG-3 (DD/MM swap) | C | High | High (LATAM/EU) | Very Low | **HIGH** |
| FORM-BUG-7 (UTC+ day shift) | B | High | High (UTC+ users) | Medium | **HIGH** |
| DOC-BUG-1 (DocLib TZ→UTC, Z strip) | C | High | Medium | Low | **HIGH** |
| FORM-BUG-V2-CONFIG-D-TYPED-EMPTY | A | Medium | Medium | Very Low | **HIGH** |
| FORM-BUG-V2-EPOCH-PRESERVED | A | Medium | Low-Medium | Medium | **MEDIUM** |
| FORM-BUG-V2-PRESET-YEAR | A | Medium | Medium | Medium | **MEDIUM** |
| FORM-BUG-1 (Z-stripping on form load) | B | Medium-High | High | Medium (V2 recovery covers most cases) | **MEDIUM** |
| FORM-BUG-3 (V2 hardcoded params) | A | Medium | High (every load) | High (downstream bugs surface) | **MEDIUM** |
| WS-BUG-4 (endpoint format mismatch) | C | Medium | Architectural | Medium | **MEDIUM** |
| FORM-BUG-8 (SFV-null hang) | A | Medium | Low (specific input) | High (caller hangs) | **MEDIUM** |
| FORM-BUG-V2-URL-PARAM-NORMALIZE | A | Low-Medium | Low (URL-driven workflows only) | Medium | **MEDIUM** |
| WS-BUG-5 (compact/epoch null) | C | Medium | Medium | Low | **MEDIUM** |
| WS-BUG-6 (date-only takes time) | C | Medium | Medium | Medium | **MEDIUM** |
| FORM-BUG-2 (popup vs typed legacy) | B | Medium | Low (legacy configs only) | High (visible difference) | **LOW-MEDIUM** |
| FORM-BUG-V2-LEGACY-Z | A | Low | High (every DateTime save) | High (format change visible) | **LOW** |
| FORM-BUG-V2-UTCMIDNIGHT | A | Low | High (every date-only save) | High | **LOW** |
| DB-BUG-1 (dashboard format) | C | Medium | High | Very High (cosmetic) | **LOW** |
| DOC-BUG-2 (cannot clear) | D | Verification needed | — | — | **(open)** |

## Real-impact distinctions

**CRITICAL** = a customer's first day on V2 produces silent data loss or corruption with no warning to user or developer.
**HIGH** = a customer's first month on V2 produces silent data loss or corruption for a significant subset of the user base or workflow set.
**MEDIUM** = the bug surfaces eventually, either via a complaint, a downstream failure, or a script timeout. The user/developer has *some* signal.
**LOW** = the bug is purely cosmetic, format-only, or so loud (hang/crash) that it's caught immediately.

The 2 CRITICAL ratings — `WS-BUG-1` and `FORM-BUG-V2-TYPED-MM-OVERFLOW` — are the bugs to fix first. Both are silent at every stage (input acceptance, storage, query) and visible only via downstream business consequences.

---

# Part 2 — Customer Impact Scenarios

Six production patterns and how the bugs manifest in each. Each scenario references real customer workflows that exist or would exist on V2.

## Scenario 2.1 — Customer migrates V1 records into V2 via API

A customer with existing V1 form data switches their database scope to V2 (`useUpdatedCalendarValueLogic = true`). Existing records were created via `postForms` over time. Users start opening these records in the Forms UI on V2.

| Step | What happens | Bug active |
|---|---|---|
| 1. User opens existing record (DateTime field) | Form displays time shifted by browser TZ offset | WS-BUG-1 |
| 2. User saves form (no edits to date field) | Shifted value commits to DB; original is lost | WS-BUG-1 |
| 3. Subsequent reads of the same record | Now consistent with the shifted value (corruption invisible after save) | (silent) |
| 4. Customer exports records to CSV for audit | Exported values contain the shifted times — but customer doesn't know which were shifted | (silent) |

**Outcome**: silent corruption of every `postForms`-created DateTime record, on first user open. Magnitude = browser TZ offset × (records opened by non-UTC users).

**Mitigation**: migrate all `postForms` callers to `forminstance/` *before* enabling V2. If V2 is already enabled, audit recently-modified records vs the API write log.

## Scenario 2.2 — Customer with LATAM-/EU-fed integrations on V2

A customer ingests records from a partner system that emits dates in DD/MM/YYYY format (Brazilian, Argentine, Spanish, French integration partners commonly do).

| Input | Outcome |
|---|---|
| `"05/03/2026"` (DD/MM intent: March 5) | Stored as **May 3** (WS-BUG-3 silent swap) |
| `"15/03/2026"` (DD/MM intent: March 15) | Stored as **null** (WS-BUG-2 silent loss) |
| `"15-Mar-2026"` (spelled month) | Stored as March 15 (correct — control) |

**Outcome**: 50% of the integrated records (those with day ≤ 12) are stored as the wrong date; 50% (day ≥ 13) are stored as null. Detection requires manual audit since the API returns 200 in both cases.

**Mitigation**: integration boundary normalization — convert all inputs to ISO `YYYY-MM-DD` before calling the API. This is non-V2-specific (the bug exists on V1 too) but worth re-confirming for V2-adopter customers since both bugs persist unchanged.

## Scenario 2.3 — Customer with global user base touching date-only fields

A customer with users in São Paulo (BRT, UTC-3), Mumbai (IST, UTC+5:30), and Tokyo (JST, UTC+9). All users edit the same date-only fields (Configs A, B, E, F).

| User location | User types `2026-03-15` | Stored value | Display after reload |
|---|---|---|---|
| BRT | `2026-03-15` | `2026-03-15T03:00:00.000Z` (Config A) or `2026-03-15T00:00:00.000Z` (Config B) | March 15 (correct) |
| IST | `2026-03-15` | `2026-03-14T18:30:00.000Z` (FORM-BUG-7 day shift) | March 14 ❌ |
| JST | `2026-03-15` | `2026-03-14T15:00:00.000Z` (predicted, FORM-BUG-7) | March 14 ❌ |

**Outcome**: UTC+ users systematically save the previous day. The form display shows their typed date until reload, masking the shift. Round-trip via SFV/GFV compounds: each cycle loses another day.

**Mitigation**: Configuration-level — switch date-only fields to `ignoreTimezone=true` (Config B/F) where the storage is TZ-naive. Operational — train users to verify the date after first save before relying on the data. Code review — block GFV→SFV round-trips on date-only fields for UTC+ users.

## Scenario 2.4 — Customer with Form Designer presets on V2

A customer configures forms with preset Initial Values (e.g., `Initial Value = 03/01/2026` for "default to first of month"). The forms open with the preset auto-populated.

| User browser TZ | Preset configured | Stored after init |
|---|---|---|
| BRT | `03/01/2026` | `2026-01-01T03:00:00.000Z` (**January 1**) — FORM-BUG-V2-PRESET-YEAR |
| IST | `03/01/2026` | `2025-12-31T18:30:00.000Z` (**December 31, 2025** — across year boundary backward) |
| UTC | `03/01/2026` | (not yet swept) |

**Outcome**: presets shift months and (at UTC- TZs) cross year boundaries. A "default to March 1" preset behaves as "default to January 1" on BRT. Customers configuring period-start defaults silently get prior-period data.

**Mitigation**: avoid presets on Config A under V2; use `Current Date` mode or apply the value via a form-load script (mind FORM-BUG-V2-LEGACY-Z and FORM-BUG-8 on the SFV path).

## Scenario 2.5 — Customer with custom scripts using SetFieldValue/GetFieldValue

A customer runs JavaScript in form templates that reads a date with `GetFieldValue` and writes with `SetFieldValue`. Common patterns:

```javascript
// Pattern 1: Conditional clear
if (someCondition) VV.Form.SetFieldValue('Field5', '');

// Pattern 2: Date-from-epoch
const due = Date.now() + (30 * 86400 * 1000);
VV.Form.SetFieldValue('Field5', due);

// Pattern 3: Round-trip
const current = VV.Form.GetFieldValue('Field5');
const updated = transformDate(current);
VV.Form.SetFieldValue('Field5', updated);
```

| Pattern | V1 behavior | V2 behavior | Bug |
|---|---|---|---|
| 1. Conditional clear | Clears or sets Invalid Date | **Hangs indefinitely** | FORM-BUG-8 |
| 2. Date-from-epoch | Stored as ISO/date string | Stored as `"<epoch>"` string; `Date.parse(gfv)` returns NaN | FORM-BUG-V2-EPOCH-PRESERVED |
| 3. Round-trip | Drifts by TZ offset (FORM-BUG-5) | Stable, no drift | (V2 fix) |

**Outcome**: pattern 1 causes UI freezes; pattern 2 causes downstream parse failures; pattern 3 actually improves on V2 — round-trips no longer drift.

**Mitigation**: audit form template scripts for empty/null SFV inputs (add Promise.race timeout) and numeric-epoch SFV inputs (stringify to ISO first). Both audits are search-and-replace style.

## Scenario 2.6 — Customer with DocLib-driven workflow

A customer attaches date metadata to documents via the Document Library API and uses those dates in workflow filters (e.g., "documents due in next 30 days").

| Write path | Stored | Workflow filter |
|---|---|---|
| `"2026-03-15T14:30:00-03:00"` (BRT offset) | `"2026-03-15T17:30:00"` (UTC, Z stripped) | Filter `[Date] eq '2026-03-15T14:30:00-03:00'` misses the record |
| `"2026-03-15T14:30:00"` (naive) | `"2026-03-15T14:30:00"` (as-is) | Filter matches if expressed identically |
| `"2026-03-15T14:30:00Z"` (UTC) | `"2026-03-15T14:30:00"` (Z stripped) | Filter `eq '2026-03-15T14:30:00Z'` misses |

**Outcome**: same column accumulates UTC-without-Z and local-without-Z values. Workflow filters miss records based on which write path the source used. DOC-BUG-2 partial fix on V2 may complicate this (some clears now work).

**Mitigation**: integration boundary — pick one storage convention (UTC strict or local strict) and convert all writes through it. Document the convention. Reconcile existing data via a one-time normalization script.

---

# Part 3 — V1 → V2 Migration Risk Map

For a customer evaluating whether to enable V2 (`useUpdatedCalendarValueLogic = true`), here's what changes.

## What V2 fixes (improvements)

| V1 bug | V2 status | Practical effect |
|---|---|---|
| FORM-BUG-4 (save format strips Z) | Fixed | DateTime stores include `.000Z` (V2-LEGACY-Z, low-impact format change) |
| FORM-BUG-5 (fake-Z GFV drift) | Fixed | Round-trip patterns no longer drift each cycle. Significant improvement for script-heavy customers. |
| FORM-BUG-6 (Invalid Date / RangeError) | Fixed | Empty DateTime fields no longer crash scripts. |

## What V2 changes for the worse (regressions)

| New bug | Practical effect |
|---|---|
| FORM-BUG-V2-TYPED-MM-OVERFLOW | LATAM/EU users typing dates silently corrupt data. **Most impactful** new bug. |
| FORM-BUG-V2-CONFIG-D-TYPED-EMPTY | Typed input on Config D fields silently lost. Forces SFV-only for Config D. |
| FORM-BUG-8 (SFV-null hang) | Scripts passing empty/null to SFV hang the UI. Caller-side timeout required. |
| FORM-BUG-V2-PRESET-YEAR | Form Designer presets shift to wrong dates. Customers must reconfigure presets. |
| FORM-BUG-V2-EPOCH-PRESERVED | Numeric epoch SFV inputs stored as unparseable strings. |

## What V2 keeps unchanged (carries V1's defects)

| V1 bug | V2 status | Practical effect |
|---|---|---|
| FORM-BUG-1 (Z stripped on load) | Persists | URL-param init and FillinAndRelate chains still affected (V2 has a recovery branch that mitigates the common DateTime-config case) |
| FORM-BUG-2 (popup vs typed legacy) | Persists | Legacy configs (E-H) still have divergent storage between popup and typed paths |
| FORM-BUG-7 (UTC+ day shift) | Persists | Date-only fields still shift previous day for UTC+ users |
| WS-BUG-1..6 | Unaffected | Server-side; toggle has no effect |
| DB-BUG-1 | Unaffected | Dashboard rendering; toggle has no effect |
| DOC-BUG-1 | Unaffected | DocLib API; toggle has no effect |

## What V2 may have partially fixed (verification queued)

| V1 bug | V2 status | Verification needed |
|---|---|---|
| DOC-BUG-2 (cannot clear) | Empty-string clear works on V2 | Sweep null, whitespace, undefined, omission, invalid-value variants on both V1 and V2 |

## Net assessment for a V2-considering customer

**Enable V2 if:**
- The customer's user base is concentrated in UTC- timezones (avoiding FORM-BUG-7's UTC+ shift)
- The customer's user input culture matches the customer Culture setting (avoiding TYPED-MM-OVERFLOW)
- Forms are populated primarily via SFV (not typed input) — so V2's better SFV behavior outweighs V2's worse typed-input behavior
- The customer doesn't rely on Form Designer presets

**Defer V2 if:**
- The customer has LATAM/EU users typing dates into enUS-Culture forms
- The customer uses Form Designer presets heavily
- The customer has Config D fields with significant typed-input usage
- The customer hasn't yet audited their `postForms` callers for migration to `forminstance/` (this is independent of V2 but matters either way)

**Either way:**
- API integrations (WS-BUG-1..6) need attention regardless of V2/V1
- Document Library workflows (DOC-BUG-1) need attention regardless
- Dashboard format inconsistency (DB-BUG-1) is cosmetic and equally present

---

# Part 4 — Compound-Bug Interactions

Bugs that amplify each other. Each row describes a chain that is worse than its parts.

| Chain | Bugs in sequence | Net effect |
|---|---|---|
| **#124697 chain** (production-confirmed) | WS-BUG-1 → FORM-BUG-1 → form save with shifted value | API-written DateTime values silently corrupted on first user open |
| **LATAM typed-input on V2** | FORM-BUG-V2-TYPED-MM-OVERFLOW → save | DD/MM input silently stored as MM/DD-overflow date |
| **UTC+ preset chain** | FORM-BUG-V2-PRESET-YEAR + FORM-BUG-7 | Preset crosses year boundary backward |
| **Round-trip without drift on V2** | (no V2 bug; FORM-BUG-5 fixed) | (improvement — V1's compounding drift gone) |
| **Empty-clear hang chain** | Conditional `SetFieldValue('', '')` → FORM-BUG-8 hang → workflow stalled | UI freezes; user has to force-close form |
| **DocLib query miss chain** | DOC-BUG-1 (TZ→UTC, Z strip) → consumer queries with original offset format → DOC-7 confirmed extension | Filter misses records that were written with explicit TZ |
| **Cross-environment data flow** | V2 DateTime saves with `.000Z` (LEGACY-Z) → V1 importer expects bare `T00:00:00` | Importer's regex/parse fails to match V2 records |
| **Mixed write-path field** | URL-param init (FORM-BUG-V2-URL-PARAM-NORMALIZE) and SFV/typed (FORM-BUG-7) on same Config A field | Two different UTC values stored for the same logical date; exact-string queries miss half |
| **enUS Culture mismatch** | FORM-BUG-V2-TYPED-MM-OVERFLOW + FORM-BUG-V2-CONFIG-D-TYPED-EMPTY on the same form | Config A field corrupts data; Config D field loses data — different failure modes on the same culture-mismatched flow |

The most expensive chains for customers are the ones where each link is silent (no error to user, no error to developer). The #124697 chain is the canonical example — one production support ticket triggered a full investigation involving hundreds of thousands of corrupted records. Other chains in the table follow the same pattern.

---

# Part 5 — Data-Integrity Audit Summary

Quantified picture of what V2 stored values look like in practice. Counts from the V1 vs V2 differential audit ([`v2-baseline-audit.md`](../../testing/date-handling/v2-baseline-audit.md)) at build `f36b65dd`:

| Verdict | Count | Meaning |
|---|---:|---|
| IDENTICAL | 29 | V2 expected matches V1 exactly. No action needed. |
| SAME_LOCAL_DATE | 122 | Same calendar date in the entry's TZ; different UTC representations. Usually benign for date-only fields. |
| KNOWN_BUG_PERSISTS | 111 | V2 differs from V1 AND V1 has a bug marker. Documented carry-over. |
| UNFLAGGED_DIFFERENCE | 0 | V2 differs without explanation. **All resolved by 2026-04-22.** |
| **Total V2 entries audited** | 271 | |

The audit captures a snapshot of the platform's actual stored values vs the V1 baseline. The 0 unflagged differences means every observable V2 behavior change has a documented explanation (either a tag or an equivalence verdict). This is a sustainability signal — new V2 differences will surface as `UNFLAGGED_DIFFERENCE` entries that block the regression baseline until reviewed.

## Stored-format distribution under V2

For 24 calendar fields × 8 configs × 3 init modes = 576 stored representations on the Date Test Harness:

| Stored shape | Configs | Trigger | Count |
|---|---|---|---|
| `YYYY-MM-DDT00:00:00.000Z` | A, B, E, F (date-only) | Typed/SFV/save on date-only field | ~96 of 192 date-only stored values (FORM-BUG-V2-UTCMIDNIGHT) |
| `YYYY-MM-DDTHH:mm:ss.000Z` | C, D, G, H (DateTime) | Typed/SFV/save on DateTime field | ~96 of 192 DateTime stored values (FORM-BUG-V2-LEGACY-Z) |
| `YYYY-MM-DD` (bare date) | (none under V2) | (V1 only) | 0 — gone in V2 |
| `YYYY-MM-DDTHH:mm:ss` (no Z, no ms) | (none under V2) | (V1 only) | 0 — gone in V2 |
| `<epoch>` (numeric string) | A, C | Numeric SFV input | 2 (FORM-BUG-V2-EPOCH-PRESERVED) |
| Empty string | D | Typed input | 5 (FORM-BUG-V2-CONFIG-D-TYPED-EMPTY) |

V2 has substantially **fewer** distinct stored-format shapes than V1 — the standardization on `.000Z`-suffixed ISO is the silver lining. But the consumer-side cost is real: any V1-aware tooling that depends on the older shapes needs an update.

---

# Part 6 — Gap and Unknown Register

What is not yet measured, and how that affects the conclusions in this document.

| Gap | Effect on conclusions |
|---|---|
| FORM-BUG-V2-PRESET-YEAR not yet swept at UTC | Cannot distinguish parse-mode error vs TZ off-by-one. Mitigation guidance is current best-effort. |
| FORM-BUG-2 popup-vs-typed legacy differential not exhaustively re-tested on V2 | Catalog assumes persistence; rare possibility that V2 fixes the popup path silently. Low risk. |
| DOC-BUG-2 V2 partial-fix not differentiated across input variants | Cannot determine whether V2 fixes empty-string only or the broader clear semantics. Recommendation: defer DOC-BUG-2 final disposition until verification sprint. |
| FORM-BUG-8 root cause not identified | Symptom mitigated via Promise.race; underlying async-continuation bug not tracked to source. Future V2 changes might affect it unpredictably. |
| FORM-BUG-V2-UTCMIDNIGHT lacks dedicated research doc | Currently audit-tagged only; behavior is well-documented in [v2-utcmidnight.md](bug-reports/v2-utcmidnight.md) but root-cause analysis is implicit (assumed identical to V2-LEGACY-Z's `getSaveValue` change). |
| Cat 14 mask Phase B/C, Cat 2 typed-input legacy E-H, Cat 20 multi-user concurrency | 45 forms-calendar test slots remain pending. May surface additional V2-specific behaviors. |
| WF (workflows) and SP (scheduled processes) baseline | 36 slots pending on this customer. WF/SP date-handling not yet swept on V2. |
| Customer-side: no real V2 customer in production | Impact analysis is based on the V2 reference environment, not observed production data. WADNR analog (vv5dev/V1) confirms V1-side scenarios; V2 production exposure is hypothetical. |

The first three gaps are queued investigation items already flagged in the catalog. The next three are catalog-deferred. The last is structural — emanueljofre-vv5dev is the only V2 environment in this investigation; cross-checking against a real V2 customer would strengthen Part 2 considerably.

---

# Part 7 — Recommendations

Per stakeholder. Each recommendation maps back to the bug ID(s) it addresses.

## 7.1 — VV Engineering (priority order)

1. **Fix FORM-BUG-V2-TYPED-MM-OVERFLOW** by adding per-segment range validation in Kendo v2's segmented `<input>`, before `new Date(Y, M-1, D)`. Bug is silent + high-likelihood for LATAM/EU customers + worsens after V1 → V2 migration. Highest ROI per fix.
2. **Fix WS-BUG-1 / WS-BUG-4** by aligning `postForms` server-side serialization with `forminstance/`. The two endpoints store identical DB values; the divergence is purely in the GET path's Z-suffixing. Single point of fix; closes the production #124697 class of bug.
3. **Fix FORM-BUG-V2-CONFIG-D-TYPED-EMPTY** by tracing the V2 blur handler for `ignoreTimezone=true + enableTime=true + useLegacy=false`. Silent data loss; specific to a config combination that's common in the field.
4. **Fix FORM-BUG-8** by ensuring V2's async pipeline resolves on empty/null input. Even though the workaround is straightforward, the bug indicates a deeper structural issue in V2's continuation logic.
5. **Document FORM-BUG-V2-LEGACY-Z and FORM-BUG-V2-UTCMIDNIGHT** as intentional migrations from V1's truncated formats. Provide a migration guide for consumers depending on the old shapes.
6. **Refactor `initCalendarValueV2()`** to remove FORM-BUG-3's hardcoded params. Read field configuration in all three call sites (URL, saved-data, preset) instead of hardcoding two of them.
7. **Investigate FORM-BUG-V2-PRESET-YEAR** — likely a different code path from FORM-BUG-3 since it's specific to presets. Sweep across all configs and TZs.

## 7.2 — Customer Success

1. **Pre-V2 readiness audit** for customers considering enabling V2. Checklist: API integrations using `postForms` (migrate to `forminstance/`), Form Designer presets (verify or replace), typed-input usage in LATAM/EU offices (validate or block), Config D typed-input flows (replace with SFV).
2. **Post-V2 monitoring** for customers who already enabled V2. Run a one-time data audit comparing recent records against pre-V2 backups; flag time-of-day shifts and incorrect-month dates.
3. **User training on UTC+ TZ exposure** for customers with global user bases. Document FORM-BUG-7 explicitly: "If your team has users outside the Americas, dates entered may save as the previous day."

## 7.3 — Integration partners

1. **Always normalize to ISO at the integration boundary.** Strip TZ offsets, use `YYYY-MM-DD` for date-only and `YYYY-MM-DDTHH:mm:ss` for DateTime. This is the single change that mitigates WS-BUG-2, WS-BUG-3, and WS-BUG-5 simultaneously.
2. **Use `forminstance/` for any record that will be opened in Forms.** If the integration produces records users will edit downstream, this is non-negotiable post-V2.
3. **Document the storage convention** for every DocLib date integration. Pick UTC-strict or local-strict; never mix.
4. **Validate at the boundary.** Reject DD/MM-only inputs, ambiguous dates, compact ISO, raw epoch values — formats the API silently fails on. Surface the error to upstream.

## 7.4 — Customer admins / form designers

1. **Avoid Form Designer presets on V2** until FORM-BUG-V2-PRESET-YEAR is fixed. Use `Current Date` mode where defaults are needed.
2. **Audit Config D fields with typed-input flows** under V2. Replace with SFV-driven flows or move to Config C.
3. **Set Customer Culture to match user input locale** in Central Admin. Most reliable mitigation against FORM-BUG-V2-TYPED-MM-OVERFLOW for typed-input users.
4. **Avoid date-only fields with `ignoreTimezone=false`** for global user bases. Use `ignoreTimezone=true` (Config B/F) — the storage is TZ-naive and FORM-BUG-7 doesn't shift the day.

## 7.5 — Anyone monitoring / operating V2 environments

1. **Track the V2 baseline audit's `UNFLAGGED_DIFFERENCE` count** as a regression signal. Run `npm run audit:v2 -- --project EmanuelJofre-vv5dev --write` weekly. Any new entry indicates a behavior change that needs review before customers are exposed.
2. **Monitor build fingerprint changes.** The V2 baseline is stable on `f36b65dd`. A new fingerprint warrants re-running the regression and the audit.
3. **Watch for the investigation queue items to land**: DOC-BUG-2 differential, FORM-BUG-V2-PRESET-YEAR root cause, FORM-BUG-2 V2 popup-vs-typed sweep, FORM-BUG-V2-UTCMIDNIGHT and CONFIG-D-TYPED-EMPTY research docs.

---

# Appendix A — Per-bug index

For navigation. All 21 bugs:

## Section A — V2-only new defects (9)

| Bug | Severity | Real impact | Dossier |
|---|---|---|---|
| FORM-BUG-V2-TYPED-MM-OVERFLOW | High | **CRITICAL** | [v2-typed-mm-overflow.md](bug-reports/v2-typed-mm-overflow.md) |
| FORM-BUG-V2-CONFIG-D-TYPED-EMPTY | Medium | **HIGH** | [v2-config-d-typed-empty.md](bug-reports/v2-config-d-typed-empty.md) |
| FORM-BUG-8 | Medium | MEDIUM | [bug-8-sfv-null-hang.md](bug-reports/bug-8-sfv-null-hang.md) |
| FORM-BUG-V2-EPOCH-PRESERVED | Medium | MEDIUM | [v2-epoch-preserved.md](bug-reports/v2-epoch-preserved.md) |
| FORM-BUG-3 | Medium | MEDIUM | [bug-3-hardcoded-params.md](bug-reports/bug-3-hardcoded-params.md) |
| FORM-BUG-V2-PRESET-YEAR | Medium | MEDIUM | [v2-preset-year.md](bug-reports/v2-preset-year.md) |
| FORM-BUG-V2-URL-PARAM-NORMALIZE | Low–Medium | MEDIUM | [v2-url-param-normalize.md](bug-reports/v2-url-param-normalize.md) |
| FORM-BUG-V2-LEGACY-Z | Low | LOW | [v2-legacy-z.md](bug-reports/v2-legacy-z.md) |
| FORM-BUG-V2-UTCMIDNIGHT | Low | LOW | [v2-utcmidnight.md](bug-reports/v2-utcmidnight.md) |

## Section B — Forms-calendar bugs active on V2 (3)

| Bug | Severity | Real impact | Dossier |
|---|---|---|---|
| FORM-BUG-1 | Medium–High | MEDIUM | [bug-1-timezone-stripping.md](bug-reports/bug-1-timezone-stripping.md) |
| FORM-BUG-2 | Medium | LOW-MEDIUM | [bug-2-inconsistent-handlers.md](bug-reports/bug-2-inconsistent-handlers.md) |
| FORM-BUG-7 | High | **HIGH** | [bug-7-wrong-day-utc-plus.md](bug-reports/bug-7-wrong-day-utc-plus.md) |

## Section C — Cross-component bugs active on V2 (8)

| Bug | Severity | Real impact | Dossier |
|---|---|---|---|
| WS-BUG-1 | High | **CRITICAL** | [ws-bug-1-cross-layer-shift.md](bug-reports/ws-bug-1-cross-layer-shift.md) |
| WS-BUG-2 | High | **HIGH** | [ws-bug-2-latam-data-loss.md](bug-reports/ws-bug-2-latam-data-loss.md) |
| WS-BUG-3 | High | **HIGH** | [ws-bug-3-ambiguous-dates.md](bug-reports/ws-bug-3-ambiguous-dates.md) |
| WS-BUG-4 | Medium | MEDIUM | [ws-bug-4-endpoint-format-mismatch.md](bug-reports/ws-bug-4-endpoint-format-mismatch.md) |
| WS-BUG-5 | Medium | MEDIUM | [ws-bug-5-silent-null-formats.md](bug-reports/ws-bug-5-silent-null-formats.md) |
| WS-BUG-6 | Medium | MEDIUM | [ws-bug-6-no-date-only-enforcement.md](bug-reports/ws-bug-6-no-date-only-enforcement.md) |
| DB-BUG-1 | Medium | LOW | [db-bug-1-format-inconsistency.md](bug-reports/db-bug-1-format-inconsistency.md) |
| DOC-BUG-1 | High | **HIGH** | [doc-bug-1-tz-utc-z-stripped.md](bug-reports/doc-bug-1-tz-utc-z-stripped.md) |

## Section D — V2 partial-fix (1)

| Bug | Severity | Status | Dossier |
|---|---|---|---|
| DOC-BUG-2 | Verification needed | Open | [doc-bug-2-cannot-clear.md](bug-reports/doc-bug-2-cannot-clear.md) |

# Appendix B — Build / run timeline

| Date | Event |
|---|---|
| 2026-04-20 | V2 baseline regression run 1 (build `20260418.1`) — 405 executed, 51 PASS / 354 FAIL — V1-baselined expected values |
| 2026-04-21 | Phase 0 rebaseline + V2 review-queue opened |
| 2026-04-22 | V2 review queue closed: `FORM-BUG-V2-EPOCH-PRESERVED`, `FORM-BUG-V2-URL-PARAM-NORMALIZE`, `FORM-BUG-V2-LEGACY-Z` tags landed; `FORM-BUG-V2-SAVE-RELOAD-EMPTY` withdrawn (helper bug) |
| 2026-04-22 | Cat-18 enUS Culture baseline → `FORM-BUG-V2-TYPED-MM-OVERFLOW` and `FORM-BUG-V2-CONFIG-D-TYPED-EMPTY` confirmed |
| 2026-04-22 | V1/V2 parity audit: vvdemo V1 `b18dbfdb` vs vv5dev V2 `f36b65dd` → 135/135 IDENTICAL on the WS layer — toggle is forms-only |
| 2026-04-24 | DOC-7, DOC-11, WS-14 baselined |
| 2026-05-04 | Full WS regression on vv5dev → 129/129 PASS. Full V2 baseline at `f36b65dd`: forms 294/3F/2T/3I, WS 129/0F, dash 36/0F, doc 40/0F |
| 2026-05-04 | Step 1 (catalog), Step 2 (21 bug reports), Step 3 (this document) authored |

# Appendix C — Glossary

- **V1 / V2** — V1 = `useUpdatedCalendarValueLogic = false`, the legacy calendar pipeline (Kendo v1, `initCalendarValueV1`). V2 = `useUpdatedCalendarValueLogic = true`, the new pipeline (Kendo v2, `initCalendarValueV2`). The toggle is at the Database scope in Central Admin and pushed to client via `setUserInfo()`. Forms-only — does not affect WS, DocLib, or Dashboard layers.
- **postForms** — the standard SDK method `vvClient.forms.postForms()` for creating form records via the main VV REST API. Triggers WS-BUG-1.
- **forminstance/** — alternative endpoint on the FormsAPI server. Same DB writes as `postForms`, different GET serialization. Workaround for WS-BUG-1.
- **Config A–H** — eight calendar field configurations covering the cross product of `enableTime` × `ignoreTimezone` × `useLegacy`. See [research/date-handling/forms-calendar/analysis/overview.md](../../../../research/date-handling/forms-calendar/analysis/overview.md).
- **Build fingerprint** — short SHA-8 of `environment + progVersion + dbVersion + formViewerBuild`. Identifies a specific platform deploy. Current: `f36b65dd`.
- **getValueObjectValue / VV.Form.VV.FormPartition** — Forms internal API for inspecting the raw stored partition value. Used in dossier reproductions to confirm what V2 actually stored vs what the user-visible display shows.
- **Real impact** — weighted assessment combining stated severity × likelihood × detectability. Used in the severity matrix to rank bugs by what they cost a real customer.
- **Detectability** — how loud the failure is. Hangs and exceptions are LOUD (high detectability — fixed quickly). Silent value corruption is QUIET (low detectability — found late, expensive).
- **`UNFLAGGED_DIFFERENCE`** — V1 vs V2 audit verdict for an entry whose V2 expected value differs from V1 with no documented bug marker. The 0-entry guarantee is the regression baseline's quality bar.

# Appendix D — Pointers to source

- **Catalog**: [`v2-bugs-catalog.md`](v2-bugs-catalog.md) — overview of all 21 bugs grouped by category
- **Per-bug dossiers**: [`bug-reports/`](bug-reports/) — 21 self-contained support-ticket-ready files
- **V1 vs V2 audit**: [`testing/date-handling/v2-baseline-audit.md`](../../testing/date-handling/v2-baseline-audit.md)
- **V2 review queue (closed)**: [`testing/date-handling/v2-review-queue.md`](../../testing/date-handling/v2-review-queue.md)
- **Central Admin V2 toggle**: [`analysis/central-admin/SCOPE-HIERARCHY.md`](central-admin/SCOPE-HIERARCHY.md)
- **Cross-component status rollup**: [`testing/date-handling/status-rollup.md`](../../testing/date-handling/status-rollup.md)
- **Platform research index**: [`research/date-handling/CLAUDE.md`](../../../../research/date-handling/CLAUDE.md)
- **Per-bug research docs (platform-truth)**: [`research/date-handling/forms-calendar/analysis/`](../../../../research/date-handling/forms-calendar/analysis/), [`web-services/analysis/`](../../../../research/date-handling/web-services/analysis/), [`dashboards/analysis/`](../../../../research/date-handling/dashboards/analysis/), [`document-library/analysis/`](../../../../research/date-handling/document-library/analysis/)
- **Form-fields known-bugs reference**: [`docs/reference/form-fields.md § Known Bugs`](../../../../docs/reference/form-fields.md#known-bugs-calendar-field)
