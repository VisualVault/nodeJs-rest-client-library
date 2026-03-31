# TC-1-E-BRT — Summary

**Spec**: [tc-1-E-BRT.md](../tc-1-E-BRT.md)
**Current status**: FAIL-1 — last run 2026-03-31 (BRT)
**Bug surface**: Legacy format — useLegacy=true popup stores full UTC datetime instead of date-only string

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | BRT | FAIL-1  | [run-1](../runs/tc-1-E-BRT-run-1.md) |

## Current Interpretation

Config E (date-only, ignoreTZ=false, useLegacy=true) in BRT stores `"2026-03-15T03:00:00.000Z"` — a full UTC datetime string — rather than the date-only `"2026-03-15"` produced by modern Configs A/B. This is an inherent characteristic of the legacy popup path: it stores the UTC datetime of local midnight regardless of `enableTime=false`. For BRT (UTC-3), the UTC date portion is still March 15 (same calendar day), so the date itself is not shifted — only the format differs. GetFieldValue returns the same UTC datetime string unchanged. The FAIL-1 outcome reflects the format mismatch: code consuming this field and expecting `"2026-03-15"` will receive `"2026-03-15T03:00:00.000Z"`, which has different parsing semantics and downstream behavior.

## Next Action

Format failure documented for all BRT legacy configs (E, F, G, H all FAIL-1 with same UTC datetime format). Run tc-1-E-IST.md to see the IST case where the UTC date portion crosses midnight backward (already done — see tc-1-E-IST.md summary).
