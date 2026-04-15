# TC-DB-3-F — Config F, Wrong Date Detection: Bug #7 ignores both ignoreTZ and useLegacy

## Environment Specs

| Parameter          | Value                                                                         |
| ------------------ | ----------------------------------------------------------------------------- |
| **Browser**        | Google Chrome, latest stable                                                  |
| **Dashboard URL**  | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25` |
| **Grid Component** | Telerik RadGrid (server-rendered, ASP.NET)                                    |
| **TZ Relevance**   | None — server-rendered values are TZ-independent                              |
| **Target Field**   | `Field11` — Config F (`enableTime=false, ignoreTZ=true, useLegacy=true`)      |
| **Bug Under Test** | Bug #7 — neither `ignoreTZ` nor `useLegacy` protect date-only fields          |

## Preconditions

P1 — Create a test record via WS-1 API with Bug #7 simulated value:

```bash
node testing/scripts/run-ws-test.js --action WS-1 --configs F --input-date "2026-03-14"
```

P2 — Open the DateTest Dashboard and verify the record appears.

## Test Steps

| #   | Action                 | Test Data                         | Expected Result                             | ✓   |
| --- | ---------------------- | --------------------------------- | ------------------------------------------- | --- |
| 1   | Complete setup         | See Preconditions P1–P2           | Dashboard loaded, test record visible       | ☐   |
| 2   | Read Field11 grid cell | DateTest-001077, column "Field11" | `3/14/2026` — shifted date, all flags inert | ☐   |

## Fail Conditions

1. **FAIL-1 (Correct date shown):** Field11 shows `3/15/2026`.
    - Interpretation: Bug #7 fixed, or flag combination now provides protection.

## Related

| Reference                | Location                                           |
| ------------------------ | -------------------------------------------------- |
| Matrix row               | `matrix.md` — row `db-3-F`                         |
| Run history              | `summaries/tc-db-3-F.md`                           |
| Bug analysis             | `analysis.md` § 3 (Bug #7)                         |
| Cross-reference (DB-3-B) | `test-cases/tc-db-3-B.md` — same flags, non-legacy |
