# DOC-BUG-2: Cannot clear date index field once set (V2 partial fix — verification needed)

## Metadata

- **Environment:** EmanuelJofre on vv5dev — https://vv5dev.visualvault.com
- **Build / platform version:** progVersion `6.1.20260416.1` · formViewerBuild `20260418.1` · dbVersion `3041` (fingerprint `f36b65dd`)
- **Calendar pipeline:** Document Library API; not affected by V1/V2 forms toggle.
- **Browser / OS:** N/A — server-side.
- **User role:** Any developer or integration writing dates to document index fields via the API.
- **Timezone:** Not TZ-dependent.
- **Frequency:** **State on V2 differs from V1** — verification required (see below).
- **Severity:** **MEDIUM (V1 baseline) → potentially RESOLVED on V2.** Investigation queued.

## Summary

Originally documented on V1 (vvdemo): writing an empty string (`""`) to a date index field failed silently — the previous value was retained. Writing an invalid value (`"2026"`) also failed silently. There was no way to clear a date index field once set.

**On V2 (this environment), the empty-string clear *works*.** The DOC-3 baseline on vv5dev (40/40 PASS, 2026-04-24) shows that empty-string PUT now clears the field. This is flagged in [`research/date-handling/CLAUDE.md`](../../../../research/date-handling/CLAUDE.md) as: "DOC-BUG-2 may be a partial fix vs. vvdemo; flagged for follow-up."

The investigation queue items:

1. Does the fix apply only to empty-string, or also to `null`, `undefined`, omission of the field, whitespace?
2. Does the fix apply uniformly to all `fieldType=4` (Date Time) index fields, or only specific configurations?
3. Is this a platform-version difference (vv5dev runs newer build) or an environment difference (different Document Library config flag)?
4. Are there side effects? Does the cleared value re-populate from `defaultValue` if one is configured (DOC-11 would expose this)?

Until verified, this dossier documents the V2 behavior delta. The bug as described in the V1 research doc may no longer be active on this environment — but a partial-fix story (some clear paths work, others don't) is plausible and would explain the "may be a partial fix" hedge.

## Steps to Reproduce

### Preconditions

- An authenticated user account on EmanuelJofre / vv5dev.
- The vv5dev test folder `/zzz-date-tests` with a `Date` index field assigned (provisioned via `setup-doc-test-assets.js`).
- A test document with the index field populated.

### Test data

| Variant | API input | V1 (vvdemo) result | V2 (vv5dev) result |
|---|---|---|---|
| Empty string | `""` | Previous value retained | **Field cleared** ✅ |
| Null | `null` | (V1 baseline doesn't separate; treated as no-op) | (not yet swept on V2) |
| Whitespace | `" "` | (untested) | (not yet swept on V2) |
| Invalid value | `"2026"` | Previous value retained | (not yet swept on V2) |
| Field omitted from PUT body | (omit `Date` key) | Field unchanged | (not yet swept on V2) |

### How to read Expected vs Actual

- **Expected:** A documented mechanism exists to clear a populated date index field (typically empty string or null).
- **Actual on V1:** No mechanism worked.
- **Actual on V2:** Empty string clears. Other variants need verification.

## Reproductions

### Reproduction A — V2 empty-string clear

1. Pre-populate the `Date` index field on `zzz-date-test-doc` with `"2026-03-15T00:00:00"`.
2. Send PUT with `indexFields = JSON.stringify({ 'Date': '' })`.
3. Read back via `vvClient.docs.getDocumentIndexFields()`.
4. **Observed on V2:** Field is cleared (value is `null` or empty in the response).

### Reproduction B — V1 baseline (vvdemo, for comparison)

1. Repeat Reproduction A on vvdemo (V1).
2. **Observed on V1:** Field retains the original `"2026-03-15T00:00:00"` value.

### Reproduction C — Default-value interaction (DOC-11)

1. Configure the `Date With Preset` index field with a `defaultValue` of `"2026-01-01T00:00:00"`.
2. Save a document with `Date With Preset` populated to `"2026-03-15"`.
3. Send PUT clearing it: `{ 'Date With Preset': '' }`.
4. **Observed:** Per DOC-11 baseline (37/37 PASS, 2026-04-24), clear fallback behavior works on V2 — the field returns to `null` (or to the configured default, depending on configuration).

## Concrete values by timezone

Not TZ-dependent.

## Workaround

V1 (no longer relevant): no workaround — field could not be cleared.

V2 (current): empty-string clear works for the common case. For edge variants (null, whitespace, omission, invalid value) that haven't been swept yet, prefer the empty-string path until verified.

## Status / Test evidence

- **V1 baseline:** Documented as a known bug on vvdemo (DOC-2 Cat-3 entries showed clear failure).
- **V2 baseline (vv5dev, 2026-04-24):** DOC-3 entries 40/40 PASS — empty-string clearing succeeds.
- **DOC-11 baseline (2026-04-24):** 37/37 PASS — default-value interaction confirmed working.
- **Investigation status:** **OPEN.** Need to sweep null, whitespace, undefined, omission, invalid-value variants on both V1 and V2 to determine the full fix scope. Decision needed: upgrade to dedicated `DOC-BUG-2-V2-PARTIAL-FIX` tag, or close as fixed.
- **Research doc:** [`research/date-handling/document-library/analysis/overview.md § DOC-BUG-2`](../../../../research/date-handling/document-library/analysis/overview.md#doc-bug-2-cannot-clear-a-date-index-field).
- **CLAUDE.md flag:** [`research/date-handling/CLAUDE.md`](../../../../research/date-handling/CLAUDE.md) — "DOC-BUG-2 may be a partial fix vs. vvdemo; flagged for follow-up."

## References

- Catalog entry: [v2-bugs-catalog.md § D.1](../v2-bugs-catalog.md)
- Companion: [doc-bug-1-tz-utc-z-stripped.md](doc-bug-1-tz-utc-z-stripped.md) — separate DOC-BUG that does still happen on V2
- Investigation method: write a differential spec that runs DOC-3-clear scenarios on both vvdemo (V1) and vv5dev (V2) with the full input variant matrix
