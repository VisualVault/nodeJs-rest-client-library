# Form Templates — XML Export Analysis & Generation

Analysis of VV form template XML exports to understand the format, document field structures, and generate improved templates for testing.

## Key Files

- `datetest-v2.xml` — Redesigned DateTest template with descriptive field names and labels
- `generate-datetest-v2.js` — Generator script producing `datetest-v2.xml`
- `datetest-original.xml` — Original DateTest template export (reference)
- `subscription-pack.xml` — Production form export (reference for non-calendar field types)

## Regenerating

```bash
node tasks/form-templates/generate-datetest-v2.js > tasks/form-templates/datetest-v2.xml
```

See `README.md` in this folder for full field naming conventions, config key, and layout details. See `docs/reference/form-template-xml.md` for the XML format reference.
