# TC-DB-3-G — Config G, Wrong Date Detection: legacy popup stores UTC datetime from IST

## Environment Specs

| Parameter          | Value                                                                         |
| ------------------ | ----------------------------------------------------------------------------- |
| **Browser**        | Google Chrome, latest stable                                                  |
| **Dashboard URL**  | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25` |
| **Grid Component** | Telerik RadGrid (server-rendered, ASP.NET)                                    |
| **TZ Relevance**   | None — server-rendered values are TZ-independent                              |
| **Target Field**   | `Field14` — Config G (`enableTime=true, ignoreTZ=false, useLegacy=true`)      |
| **Bug Under Test** | Legacy popup stores full UTC datetime — IST midnight becomes previous UTC day |

## Preconditions

P1 — Create a test record via WS-1 API with legacy IST popup simulated value:

```bash
node tasks/date-handling/web-services/run-ws-test.js --action WS-1 --configs G --input-date "2026-03-14T18:30:00"
```

This simulates: IST (UTC+5:30) user selects March 15 via legacy popup. Popup stores full UTC datetime: `new Date(2026,2,15,0,0,0)` at IST midnight = `2026-03-14T18:30:00Z`. The entire datetime shifts to the previous UTC day.

P2 — Open the DateTest Dashboard and verify the record appears.

## Test Steps

| #   | Action                 | Test Data                         | Expected Result                                                 | ✓   |
| --- | ---------------------- | --------------------------------- | --------------------------------------------------------------- | --- |
| 1   | Complete setup         | See Preconditions P1–P2           | Dashboard loaded, test record visible                           | ☐   |
| 2   | Read Field14 grid cell | DateTest-001081, column "Field14" | `3/14/2026 6:30 PM` — UTC rendering of IST midnight (wrong day) | ☐   |

## Fail Conditions

1. **FAIL-1 (Correct date shown):** Field14 shows `3/15/2026` with any time.
    - Interpretation: Legacy popup behavior changed, or server applies timezone correction.

## Related

| Reference          | Location                                      |
| ------------------ | --------------------------------------------- |
| Matrix row         | `matrix.md` — row `db-3-G`                    |
| Run history        | `summaries/tc-db-3-G.md`                      |
| Bug analysis       | `analysis.md` § 3 (Bug Surface in Dashboards) |
| Forms IST evidence | `../forms-calendar/` — TC-1-G-IST (FAIL-1)    |
