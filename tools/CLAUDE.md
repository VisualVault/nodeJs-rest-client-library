# Tools — General-Purpose Workspace Tooling

Standalone CLI utilities for working with VV environments. Not tied to Playwright test execution — used for development, analysis, debugging, reviews, and workflow automation.

## Subfolders

| Folder        | Purpose                                       | Example usage                                                                 |
| ------------- | --------------------------------------------- | ----------------------------------------------------------------------------- |
| `export/`     | Extract data from any VV environment          | `node tools/export/export.js --output projects/wadnr/exports`                 |
| `runners/`    | Execute workflows, WS harness, debug          | `node tools/runners/run-ws-test.js --action WS-2`                             |
| `audit/`      | Verify platform behaviors in browser          | `node tools/audit/audit-bug5-fake-z.js`                                       |
| `inventory/`  | Analyze exported project data                 | `node tools/inventory/inventory-fields.js`                                    |
| `generators/` | Create structured artifacts from test results | `node tools/generators/generate-artifacts.js`                                 |
| `explore/`    | Platform exploration + version monitoring     | `npm run explore:headed`, `npm run version:snapshot`                          |
| `helpers/`    | Shared libraries used by tools                | `vv-admin.js`, `vv-sync.js`, `ws-api.js`, `vv-explore.js`, `build-context.js` |

## Explore Commands

```bash
npm run explore              # Run exploration specs (headless)
npm run explore:headed       # Run with visible browser
npm run explore:report       # Open HTML report with artifacts
npm run version:snapshot     # Capture current platform version state
npm run version:diff         # Compare two most recent snapshots
npm run version:list         # List available snapshots
```

## Conventions

1. **Environment-agnostic.** Tools work for any VV customer/environment, not just WADNR. Customer-specific references belong in `projects/`, not here.
2. **Parameterized output.** Export and inventory tools accept `--output` flags to direct results to the appropriate `projects/{customer}/` folder.
3. **Shared.** All tools are committed to the team repo — they benefit every developer.
4. **Helpers split.** `tools/helpers/` has libraries used by tools (vv-admin, vv-sync, ws-api, ws-log). Test-specific helpers (vv-form, vv-calendar) stay in `testing/helpers/`.
