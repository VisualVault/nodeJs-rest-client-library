# Standards Review — Deterministic standards compliance tool for VV components

## What This Is

A rule-based review system that scans VV component artifacts to check standards compliance and produce reports. Standards are defined in `docs/standards/` and enforced by the tool in `tools/review/`.

## Scope

| Component      | Status      | Notes                                              |
| -------------- | ----------- | -------------------------------------------------- |
| Form Templates | In Progress | 40 rules, report-only. Fix capability coming later |
| Web Services   | Planned     | Extract infrastructure ready, rules TBD            |
| Dashboards     | Planned     |                                                    |

## Architecture

The review system is **component-aware**. Each rule declares `component` (which component type it targets) and `appliesTo` (which field types or `'template'` for template-level checks). The unified CLI (`tools/review/review.js`) dispatches to the appropriate parser and rules based on `--component`.

Adding a new component type requires: (1) a parser in `tools/review/lib/`, (2) rules with `component: '<name>'`, (3) a config entry in `review.js`.

## Folder Structure

```
research/standards-review/
  analysis/       # Investigation findings, rule design notes
```

## Key References

- **Standards document**: `docs/standards/form-template-standard.md`
- **Unified CLI**: `tools/review/review.js`
- **Form-specific CLI**: `tools/review/review-forms.js`
- **Rule modules**: `tools/review/rules/`
- **Rule registry + query helpers**: `tools/review/rules/index.js`
- **XML format reference**: `docs/reference/form-template-xml.md`
- **Prior art**: `/Users/visualvault/Repos/xml-fixer/` (original prototype)

## Running

```bash
node tools/review/review.js --project <name>                              # Unified (defaults to form-templates)
node tools/review/review.js --component form-templates --project <name>   # Explicit component
node tools/review/review.js --matrix                                      # Field type → standards mapping
node tools/review/review-forms.js --project <name>                        # Form-specific shortcut
npm run review -- --project <name>                                        # Via npm (unified)
npm run review -- --matrix                                                # Via npm (matrix)
npm run review:forms -- --project <name>                                  # Via npm (forms)
```

## Next Steps

1. Calibrate each rule: Draft → Under Review → Approved (severity, exceptions, false positives)
2. Add auto-fix capability (report + fix mode)
3. Extend to web services and dashboards
4. Define client-side script code standards (async patterns, error handling, validation order)
