# TC-8-V2 — Summary

**Spec**: [tc-8-V2.md](../test-cases/tc-8-V2.md)
**Current status**: PASS — last run 2026-04-03 (IST, Chromium)
**Bug surface**: V2 code path — Bug #5 absent, UTC conversion also absent

## Run History

| Run | Date       | TZ  | Outcome | File                              |
| --- | ---------- | --- | ------- | --------------------------------- |
| 1   | 2026-04-03 | IST | PASS    | [run-1](../runs/tc-8-V2-run-1.md) |

## Current Interpretation

V2 GFV bypasses all transformations — returns raw partition value for both Config C (no UTC conversion) and Config D (no fake Z). Bug #5 is resolved under V2, but Config C loses its legitimate UTC reconstruction. V2 treats GFV as a raw passthrough. Successfully activated by setting the flag directly via console — no ObjectID URL parameter needed.

## Next Action

No further action — V2 GFV behavior characterized. Note: V2 activation via `?ObjectID=` or server flag should be tested separately to confirm natural activation path behaves identically.
