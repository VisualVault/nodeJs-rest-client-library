# TC-DB-3-E — Config E, Wrong Date Detection: Bug #7 affects legacy date-only fields

## Environment Specs

| Parameter          | Value                                                                         |
| ------------------ | ----------------------------------------------------------------------------- |
| **Browser**        | Google Chrome, latest stable                                                  |
| **Dashboard URL**  | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25` |
| **Grid Component** | Telerik RadGrid (server-rendered, ASP.NET)                                    |
| **TZ Relevance**   | None — server-rendered values are TZ-independent                              |
| **Target Field**   | `Field12` — Config E (`enableTime=false, ignoreTZ=false, useLegacy=true`)     |
| **Bug Under Test** | Bug #7 — legacy date-only fields affected identically to non-legacy           |

## Preconditions

P1 — Create a test record via WS-1 API with Bug #7 simulated value:

```bash
node testing/scripts/run-ws-test.js --action WS-1 --configs E --input-date "2026-03-14"
```

P2 — Open the DateTest Dashboard and verify the record appears.

## Test Steps

| #   | Action                 | Test Data                         | Expected Result                                   | ✓   |
| --- | ---------------------- | --------------------------------- | ------------------------------------------------- | --- |
| 1   | Complete setup         | See Preconditions P1–P2           | Dashboard loaded, test record visible             | ☐   |
| 2   | Read Field12 grid cell | DateTest-001077, column "Field12" | `3/14/2026` — shifted date, identical to Config A | ☐   |

## Fail Conditions

1. **FAIL-1 (Correct date shown):** Field12 shows `3/15/2026`.
    - Interpretation: Bug #7 fixed, or `useLegacy=true` now provides protection.

## Related

| Reference                | Location                                       |
| ------------------------ | ---------------------------------------------- |
| Matrix row               | `matrix.md` — row `db-3-E`                     |
| Run history              | `summaries/tc-db-3-E.md`                       |
| Bug analysis             | `analysis.md` § 3 (Bug #7)                     |
| Cross-reference (DB-3-A) | `test-cases/tc-db-3-A.md` — same bug, Config A |
