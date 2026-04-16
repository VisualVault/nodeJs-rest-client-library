/**
 * Shared sync, manifest, and README generation for VV admin component extractions.
 *
 * Used by the unified extract framework (extract.js) and individual
 * component scripts. Provides manifest-based change detection and consistent
 * output formatting across all components.
 */
const fs = require('fs');
const path = require('path');

/**
 * Sanitize a name for use as a filename.
 */
function sanitizeFilename(name) {
    return name
        .replace(/[^a-zA-Z0-9_\-. ]/g, '_')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

/**
 * Simple glob-style filter match.
 */
function matchesFilter(name, filterPattern) {
    if (!filterPattern) return true;
    const p = filterPattern.replace(/\*/g, '.*').replace(/\?/g, '.');
    return new RegExp(`^${p}$`, 'i').test(name);
}

/**
 * Load a manifest.json from disk.
 * @returns {object|null}
 */
function loadManifest(manifestPath) {
    if (!fs.existsSync(manifestPath)) return null;
    try {
        return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch {
        return null;
    }
}

/**
 * Save a manifest.json to disk.
 * @param {string} manifestPath
 * @param {object} opts - { environment, component, items }
 */
function saveManifest(manifestPath, { environment, component, items }) {
    const manifest = {
        generatedAt: new Date().toISOString(),
        environment,
        component,
        totalItems: items.length,
        [component]: items,
    };
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
}

/**
 * Compute sync changes between API/grid items and existing manifest.
 *
 * @param {Array<object>} allItems - Current items from API/grid
 * @param {object|null} manifest - Existing manifest (or null for first run)
 * @param {object} opts
 * @param {string} opts.idField - Field name used as unique ID (e.g., 'id' or 'name')
 * @param {string} [opts.dateField] - Field name for change detection (e.g., 'modifyDate'). If null, always refresh.
 * @param {string} [opts.fileDir] - Directory to check for existing extracted files
 * @param {string} [opts.fileExt] - File extension (e.g., '.js')
 * @param {boolean} [opts.force] - Force re-extract everything
 * @param {function} [opts.filterFn] - Filter function(item) → boolean
 * @param {string} [opts.component] - Component key in manifest (e.g., 'scripts', 'schedules')
 * @returns {{ toExtract: Array, added: number, modified: number, unchanged: number, deleted: Array }}
 */
function computeChanges(allItems, manifest, opts = {}) {
    const {
        idField = 'id',
        dateField = null,
        hashField = null,
        fileDir = null,
        fileExt = '.js',
        force = false,
        filterFn = () => true,
        component = 'items',
    } = opts;

    const filtered = allItems.filter(filterFn);

    if (!manifest || force) {
        return {
            toExtract: filtered,
            added: filtered.length,
            modified: 0,
            unchanged: 0,
            deleted: [],
        };
    }

    const existingItems = manifest[component] || manifest.scripts || manifest.items || [];
    const existMap = new Map(existingItems.map((s) => [s[idField], s]));

    const toExtract = [];
    let added = 0;
    let modified = 0;
    let unchanged = 0;

    for (const item of filtered) {
        const existing = existMap.get(item[idField]);

        // Check if file exists on disk (if fileDir provided)
        let fileExists = true;
        if (fileDir) {
            const baseName = sanitizeFilename(item.name || item[idField]);
            const extensions = Array.isArray(fileExt) ? fileExt : [fileExt];
            fileExists = extensions.some((ext) => fs.existsSync(path.join(fileDir, baseName + ext)));
        }

        if (!existing || !fileExists) {
            toExtract.push(item);
            added++;
        } else if (dateField && existing[dateField] !== item[dateField]) {
            toExtract.push(item);
            modified++;
        } else if (!dateField && hashField && existing[hashField] && existing[hashField] === item[hashField]) {
            // Hash match — content unchanged, skip extraction
            unchanged++;
        } else if (!dateField) {
            // No date field and no hash match = re-extract
            toExtract.push(item);
            modified++;
        } else {
            unchanged++;
        }
    }

    // Deleted: items in manifest but not in current data
    const currentIds = new Set(allItems.map((s) => s[idField]));
    const deleted = existingItems.filter((s) => !currentIds.has(s[idField]));

    return { toExtract, added, modified, unchanged, deleted };
}

/**
 * Generate a README.md for a component's output directory.
 *
 * @param {string} outputDir
 * @param {object} opts
 * @param {string} opts.title - e.g., 'WADNR Scheduled Services'
 * @param {string} [opts.subtitle] - e.g., 'Extracted from scheduleradmin on vv5dev'
 * @param {Array<object>} opts.items - All items
 * @param {string} [opts.groupByField] - Field to group by (e.g., 'category', 'enabled')
 * @param {Array<{header: string, field: string, width?: string, transform?: function}>} opts.columns
 * @param {function} [opts.linkFn] - (item) => 'markdown link' or null for no link
 */
function generateReadme(outputDir, opts) {
    const today = new Date().toISOString().split('T')[0];
    const lines = [`# ${opts.title}`, '', `${opts.subtitle || ''}. Generated: ${today}`, ''];

    const items = opts.items;
    const groups = {};

    if (opts.groupByField) {
        for (const item of items) {
            const key = String(item[opts.groupByField] ?? 'Other');
            (groups[key] = groups[key] || []).push(item);
        }
    } else {
        groups['All'] = [...items];
    }

    for (const [groupName, groupItems] of Object.entries(groups).sort()) {
        if (opts.groupByField) {
            lines.push(`## ${groupName} (${groupItems.length})`, '');
        }

        // Table header
        const headers = opts.columns.map((c) => c.header);
        lines.push(`| # | ${headers.join(' | ')} |`);
        lines.push(`| --: | ${headers.map(() => ':---').join(' | ')} |`);

        groupItems.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
        groupItems.forEach((item, i) => {
            const cells = opts.columns.map((col) => {
                let val = item[col.field];
                if (col.transform) val = col.transform(item);
                return val ?? '';
            });
            lines.push(`| ${i + 1} | ${cells.join(' | ')} |`);
        });
        lines.push('');
    }

    lines.push(`**Total**: ${items.length} items`, '');

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'README.md'), lines.join('\n'), 'utf8');
}

module.exports = {
    sanitizeFilename,
    matchesFilter,
    loadManifest,
    saveManifest,
    computeChanges,
    generateReadme,
};
