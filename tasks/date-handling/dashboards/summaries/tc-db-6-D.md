# TC-DB-6-D — Summary

**Spec**: [tc-db-6-D.md](../test-cases/tc-db-6-D.md)
**Current status**: FAIL-1 — last run 2026-04-02
**Bug surface**: Format mismatch only — ignoreTZ preserves display time. Bug #5 fake Z confirmed in GFV.

## Run History

| Run | Date       | Outcome | File                                |
| --- | ---------- | ------- | ----------------------------------- |
| 1   | 2026-04-02 | FAIL-1  | [run-1](../runs/tc-db-6-D-run-1.md) |

## Current Interpretation

Display time matches across layers (`2:30 PM` ≡ `02:30 PM`) thanks to `ignoreTZ=true`. But format has leading zeros. Internally, V1 converted UTC to BRT (raw = `T11:30:00` not `T14:30:00`), and Bug #5 adds fake Z to GFV (`T11:30:00.000Z`). The display is consistent but the internal state is diverged.

## Next Action

No re-run needed.
