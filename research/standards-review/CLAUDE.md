# Standards Review — Deterministic standards compliance tool for VV components

## What This Is

A rule-based review system that scans VV component artifacts (starting with form template XML) to check standards compliance and produce reports. Standards are defined in `docs/standards/` and enforced by the tool in `tools/review/`.

## Scope

| Component      | Status      | Notes                                             |
| -------------- | ----------- | ------------------------------------------------- |
| Form Templates | In Progress | 6 rules, report-only. Fix capability coming later |
| Web Services   | Planned     |                                                   |
| Dashboards     | Planned     |                                                   |

## Folder Structure

```
research/standards-review/
  analysis/       # Investigation findings, rule design notes
```

## Key References

- **Standards document**: `docs/standards/form-template-standard.md`
- **Review tool**: `tools/review/review-forms.js`
- **Rule modules**: `tools/review/rules/`
- **XML format reference**: `docs/reference/form-template-xml.md`
- **Prior art**: `/Users/visualvault/Repos/xml-fixer/` (original prototype)

## Running

```bash
node tools/review/review-forms.js --project <name>           # Full review
node tools/review/review-forms.js --project <name> --print   # Stdout only
npm run review:forms -- --project <name>                      # Via npm
```

## Next Steps

1. Review initial rule results and calibrate severity/thresholds
2. Define additional rules based on findings
3. Add auto-fix capability (report + fix mode)
4. Extend to web services and dashboards
