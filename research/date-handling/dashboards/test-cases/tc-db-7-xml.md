# TC-DB-7-XML — XML Export: dates match grid in ISO 8601 format

## Environment Specs

| Parameter           | Value                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------- |
| **Browser**         | Google Chrome, latest stable                                                              |
| **Dashboard URL**   | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25`             |
| **Grid Component**  | Telerik RadGrid (server-rendered, ASP.NET)                                                |
| **TZ Relevance**    | None — server-rendered values are TZ-independent                                          |
| **Export Format**   | XML (.xml) — proper XML with `<VisualVault><DateTest>` structure                          |
| **Expected Format** | ISO 8601: `YYYY-MM-DDTHH:MM:SS+00:00` (UTC offset). Field names use `_x0020_` for spaces. |

## Preconditions

**P1** — Open the DateTest Dashboard. **P2** — Verify grid loaded. **P3** — Expand Export panel. **P4** — Identify reference record.

## Test Steps

| #   | Action                  | Test Data                                       | Expected Result                                                                                      | ✓   |
| --- | ----------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --- |
| 1   | Complete setup          | See Preconditions P1–P4                         | Dashboard loaded, export panel visible                                                               | ☐   |
| 2   | Click "Export to XML"   | Click the XML export button                     | Browser downloads `DateTest Dashboard.xml` file                                                      | ☐   |
| 3   | Inspect XML structure   | Open `.xml` in text editor                      | Well-formed XML with `<VisualVault>` root, `<DateTest>` row elements, XSD schema                     | ☐   |
| 4   | Compare date-only field | Find reference record, check `<Field7>` element | ISO 8601 date matching grid calendar date (e.g., grid `3/15/2026` → XML `2026-03-15T00:00:00+00:00`) | ☐   |
| 5   | Compare DateTime field  | Check DateTime element                          | ISO 8601 datetime matching grid value                                                                | ☐   |
| 6   | Verify record count     | Count `<DateTest>` elements                     | All grid records present (432 records)                                                               | ☐   |

> **Format note**: XML exports use ISO 8601 with `+00:00` offset — the canonical format for machine-readable date exchange. Grid shows `M/D/YYYY` display format. These represent the same dates in different formats. Field names in XML use `_x0020_` encoding for spaces (e.g., `Form_x0020_ID`).

## Fail Conditions

**FAIL-1 (Download fails):** No file downloaded.

**FAIL-2 (Calendar date mismatch):** The date portion of the ISO string does not match the grid display date (e.g., grid shows `3/15/2026` but XML shows `2026-03-14T...` or `2026-03-16T...`).

- Interpretation: The server may be applying a timezone conversion during XML export that shifts the date. This would indicate a Bug #7-like issue in the export layer.

**FAIL-3 (Missing records):** Fewer `<DateTest>` elements than grid records.

**FAIL-4 (Malformed XML):** File is not well-formed XML.

- Interpretation: The Telerik RadGrid XML export failed. Check server logs.

## Related

| Reference     | Location                               |
| ------------- | -------------------------------------- |
| Matrix row    | `matrix.md` — row `db-7-xml`           |
| Summary       | [summary](../summaries/tc-db-7-xml.md) |
| Test script   | `test-export-v1.js`                    |
| Excel sibling | [tc-db-7-excel.md](tc-db-7-excel.md)   |
| Word sibling  | [tc-db-7-word.md](tc-db-7-word.md)     |
