# TC-DB-3-B — Config B, Wrong Date Detection: Bug #7 ignores ignoreTZ flag

## Environment Specs

| Parameter          | Value                                                                         |
| ------------------ | ----------------------------------------------------------------------------- |
| **Browser**        | Google Chrome, latest stable                                                  |
| **Dashboard URL**  | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25` |
| **Grid Component** | Telerik RadGrid (server-rendered, ASP.NET)                                    |
| **TZ Relevance**   | None — server-rendered values are TZ-independent                              |
| **Target Field**   | `Field10` — Config B (`enableTime=false, ignoreTZ=true, useLegacy=false`)     |
| **Bug Under Test** | Bug #7 — `ignoreTZ=true` provides no protection for date-only fields          |

## Preconditions

P1 — Create a test record via WS-1 API with Bug #7 simulated value:

```bash
node tasks/date-handling/web-services/run-ws-test.js --action WS-1 --configs B --input-date "2026-03-14"
```

P2 — Open the DateTest Dashboard and verify the record appears.

## Test Steps

| #   | Action                 | Test Data                         | Expected Result                                  | ✓   |
| --- | ---------------------- | --------------------------------- | ------------------------------------------------ | --- |
| 1   | Complete setup         | See Preconditions P1–P2           | Dashboard loaded, test record visible            | ☐   |
| 2   | Read Field10 grid cell | DateTest-001077, column "Field10" | `3/14/2026` — shifted date identical to Config A | ☐   |

## Fail Conditions

1. **FAIL-1 (Correct date shown):** Field10 shows `3/15/2026`.
    - Interpretation: Bug #7 fixed, or `ignoreTZ=true` now protects date-only fields.

## Related

| Reference                | Location                                       |
| ------------------------ | ---------------------------------------------- |
| Matrix row               | `matrix.md` — row `db-3-B`                     |
| Run history              | `summaries/tc-db-3-B.md`                       |
| Bug analysis             | `analysis.md` § 3 (Bug #7)                     |
| Cross-reference (DB-3-A) | `test-cases/tc-db-3-A.md` — same bug, Config A |
