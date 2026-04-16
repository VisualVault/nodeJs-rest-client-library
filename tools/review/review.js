#!/usr/bin/env node

/**
 * review.js
 *
 * Unified standards review tool for VV components.
 * Dispatches to the appropriate parser and rules based on --component.
 *
 * Usage:
 *   node tools/review/review.js --component form-templates --project wadnr
 *   node tools/review/review.js --component form-templates --project wadnr --template Appeal
 *   node tools/review/review.js --component form-templates --project wadnr --rule field-naming
 *   node tools/review/review.js --component form-templates --project wadnr --severity error
 *   node tools/review/review.js --component form-templates --project wadnr --print
 *
 * When --component is omitted, defaults to 'form-templates'.
 *
 * Adding a new component:
 *   1. Create a parser in lib/ (e.g., parse-script.js)
 *   2. Add rules with component: '<name>' in rules/
 *   3. Add an entry to COMPONENT_CONFIG below
 */

const fs = require('fs');
const path = require('path');
const { parseTemplate } = require('./lib/parse-template');
const { writeReports, generateTemplateReport, generateSummaryReport } = require('./lib/report');
const { rulesForComponent, fieldTypeMatrix } = require('./rules');

// ---------- Component configuration ----------

const COMPONENT_CONFIG = {
    'form-templates': {
        extractDir: 'form-templates',
        filePattern: ['.xml', '.json'],
        parser: parseTemplate,
        outputDir: 'standards-review',
        itemLabel: 'template',
    },
    // Future components:
    // 'web-services': {
    //     extractDir: 'web-services/scripts',
    //     filePattern: '.js',
    //     parser: require('./lib/parse-script').parseScript,
    //     outputDir: 'standards-review-ws',
    //     itemLabel: 'script',
    // },
};

// ---------- Parse CLI args ----------

function parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {};

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--component':
                parsed.component = args[++i];
                break;
            case '--project':
                parsed.project = args[++i];
                break;
            case '--template':
                parsed.template = args[++i];
                break;
            case '--rule':
                parsed.rule = args[++i];
                break;
            case '--severity':
                parsed.severity = args[++i];
                break;
            case '--print':
                parsed.print = true;
                break;
            case '--matrix':
                parsed.matrix = true;
                break;
            case '--help':
                console.log(`
Standards Review Tool

Options:
  --component <type>    Component type to review (default: form-templates).
                        Available: ${Object.keys(COMPONENT_CONFIG).join(', ')}
  --project <name>      Required. Customer project to review.
  --template <name>     Review a single item (filename without extension).
  --rule <id>           Only run a specific rule (e.g., field-naming).
  --severity <level>    Only show findings at this severity or above (error, warning, info).
  --print               Print to stdout only (no file output).
  --matrix              Show which standards apply to which field types, then exit.
  --help                Show this help.

Examples:
  node tools/review/review.js --project wadnr
  node tools/review/review.js --component form-templates --project wadnr --print
  node tools/review/review.js --project wadnr --template Appeal --rule accessibility
  node tools/review/review.js --matrix
`);
                process.exit(0);
                break;
            default:
                console.error(`Unknown argument: ${args[i]}`);
                process.exit(1);
        }
    }

    return parsed;
}

// ---------- Severity filter ----------

const SEVERITY_LEVELS = { error: 0, warning: 1, info: 2 };

function filterBySeverity(findings, minSeverity) {
    if (!minSeverity) return findings;
    const threshold = SEVERITY_LEVELS[minSeverity];
    if (threshold === undefined) {
        console.error(`Unknown severity: ${minSeverity}. Use: error, warning, info`);
        process.exit(1);
    }
    return findings.filter((f) => (SEVERITY_LEVELS[f.severity] ?? 9) <= threshold);
}

// ---------- Main ----------

// ---------- Matrix display ----------

function printMatrix(componentName) {
    const rules = rulesForComponent(componentName);
    const matrix = fieldTypeMatrix();
    const allFieldTypes = Object.keys(matrix).sort();

    // Wildcard rules (apply to all fields)
    const wildcardRules = rules.filter((r) => r.appliesTo === '*');
    // Template-level rules
    const templateRules = rules.filter((r) => r.appliesTo === 'template');

    console.log(`\nField Type → Standards Matrix [${componentName}]\n`);

    // Per-field-type table
    if (allFieldTypes.length > 0) {
        const maxType = Math.max(...allFieldTypes.map((t) => t.length), 'Field Type'.length);
        const header = `| ${'Field Type'.padEnd(maxType)} | Standards |`;
        const sep = `| ${'-'.repeat(maxType)} | --------- |`;
        console.log(header);
        console.log(sep);
        for (const ft of allFieldTypes) {
            const ruleIds = matrix[ft].join(', ');
            console.log(`| ${ft.padEnd(maxType)} | ${ruleIds} |`);
        }
    }

    if (wildcardRules.length > 0) {
        console.log(`\nAll fields: ${wildcardRules.map((r) => r.id).join(', ')}`);
    }
    if (templateRules.length > 0) {
        console.log(`Template-level: ${templateRules.map((r) => r.id).join(', ')}`);
    }

    console.log(`\nTotal: ${rules.length} standards across ${allFieldTypes.length} field types`);
}

// ---------- Main ----------

function main() {
    const opts = parseArgs();
    const componentName = opts.component || 'form-templates';

    if (opts.matrix) {
        printMatrix(componentName);
        return;
    }

    if (!opts.project) {
        console.error('Error: --project is required');
        process.exit(1);
    }

    const config = COMPONENT_CONFIG[componentName];
    if (!config) {
        console.error(`Unknown component: ${componentName}. Available: ${Object.keys(COMPONENT_CONFIG).join(', ')}`);
        process.exit(1);
    }

    const extractsDir = path.resolve(__dirname, `../../projects/${opts.project}/extracts/${config.extractDir}`);
    const outputDir = path.resolve(__dirname, `../../projects/${opts.project}/analysis/${config.outputDir}`);

    if (!fs.existsSync(extractsDir)) {
        console.error(`Extracts directory not found: ${extractsDir}`);
        console.error(`Run extract first: node tools/extract/extract.js --output projects/${opts.project}/extracts`);
        process.exit(1);
    }

    // Discover files (filePattern can be a string or array of extensions)
    const patterns = Array.isArray(config.filePattern) ? config.filePattern : [config.filePattern];
    let files = fs
        .readdirSync(extractsDir)
        .filter((f) => patterns.some((p) => f.endsWith(p)))
        .sort();

    if (opts.template) {
        files = files.filter((f) => f.replace(/\.[^.]+$/, '') === opts.template);
        if (files.length === 0) {
            console.error(`Item not found: ${opts.template} in ${extractsDir}`);
            process.exit(1);
        }
    }

    // Filter rules by component, then by --rule flag
    let rules = rulesForComponent(componentName);
    if (opts.rule) {
        rules = rules.filter((r) => r.id === opts.rule);
        if (rules.length === 0) {
            const available = rulesForComponent(componentName).map((r) => r.id);
            console.error(`Unknown rule: ${opts.rule}. Available for ${componentName}: ${available.join(', ')}`);
            process.exit(1);
        }
    }

    console.log(`Reviewing ${files.length} ${config.itemLabel}(s) with ${rules.length} rule(s) [${componentName}]...`);

    // Process items
    const templateResults = [];
    let errors = 0;

    for (const file of files) {
        const filePath = path.join(extractsDir, file);
        const itemName = file.replace(/\.[^.]+$/, '');

        try {
            const context = config.parser(filePath);
            let findings = [];

            for (const rule of rules) {
                const ruleFindings = rule.check(context);
                findings.push(...ruleFindings);
            }

            findings = filterBySeverity(findings, opts.severity);
            templateResults.push({ templateName: itemName, findings });
        } catch (err) {
            errors++;
            console.error(`  Error parsing ${itemName}: ${err.message}`);
            templateResults.push({
                templateName: itemName,
                findings: [
                    {
                        ruleId: 'parse-error',
                        severity: 'error',
                        field: '—',
                        page: '—',
                        message: `Failed to parse: ${err.message}`,
                    },
                ],
            });
        }
    }

    // Output
    const ruleCount = rules.length;
    const totalFindings = templateResults.reduce((sum, t) => sum + t.findings.length, 0);
    const withIssues = templateResults.filter((t) => t.findings.length > 0).length;

    if (opts.print) {
        for (const result of templateResults) {
            if (result.findings.length === 0) continue;
            console.log(`\n${'='.repeat(60)}`);
            console.log(generateTemplateReport(result.templateName, result.findings, ruleCount));
        }
        console.log(`\n${'='.repeat(60)}`);
        console.log(generateSummaryReport(templateResults, ruleCount));
    } else {
        const { summaryPath, matrixPath, metadataPath } = writeReports(outputDir, templateResults, rules, opts);
        console.log(`\nReports written to: ${path.relative(process.cwd(), outputDir)}/`);
        console.log(`  Summary:  ${path.relative(process.cwd(), summaryPath)}`);
        console.log(`  Matrix:   ${path.relative(process.cwd(), matrixPath)}`);
        console.log(`  Metadata: ${path.relative(process.cwd(), metadataPath)}`);
    }

    console.log(
        `\nDone: ${templateResults.length} ${config.itemLabel}(s), ${totalFindings} findings, ${withIssues} with issues`
    );
    if (errors > 0) console.log(`  ${errors} ${config.itemLabel}(s) failed to parse`);
}

main();
