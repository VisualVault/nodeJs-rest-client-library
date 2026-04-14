/**
 * Calendar configuration rules (atomic)
 *
 * Exports 3 rules: calendar-name-match, calendar-legacy, calendar-valid-config
 */

const CONFIG_MAP = {
    'false|false|false': { id: 'A', label: 'Date-only' },
    'false|true|false': { id: 'B', label: 'Date-only + IgnoreTZ' },
    'true|false|false': { id: 'C', label: 'DateTime' },
    'true|true|false': { id: 'D', label: 'DateTime + IgnoreTZ' },
    'false|false|true': { id: 'E', label: 'Date-only + Legacy' },
    'false|true|true': { id: 'F', label: 'Date-only + IgnoreTZ + Legacy' },
    'true|false|true': { id: 'G', label: 'DateTime + Legacy' },
    'true|true|true': { id: 'H', label: 'DateTime + IgnoreTZ + Legacy' },
};

function getConfig(enableTime, ignoreTimezone, useLegacy) {
    const key = `${enableTime}|${ignoreTimezone}|${useLegacy}`;
    return CONFIG_MAP[key] || null;
}

module.exports = [
    {
        id: 'calendar-name-match',
        name: 'Calendar Config Matches Field Name',
        severity: 'warning',

        check(context) {
            const findings = [];
            for (const field of context.fields) {
                if (field.type !== 'FieldCalendar3') continue;
                const config = getConfig(field.enableTime, field.ignoreTimezone, field.useLegacy);
                if (!config) continue; // unknown config handled by calendar-valid-config

                // Name explicitly says "time" or "datetime"
                const explicitTime =
                    /and\s*time/i.test(field.name) ||
                    /date\s*time/i.test(field.name.toLowerCase()) ||
                    /\btimestamp\b/i.test(field.name.toLowerCase());

                if (explicitTime && !field.enableTime) {
                    findings.push({
                        ruleId: 'calendar-name-match',
                        severity: 'warning',
                        field: field.name,
                        page: field.pageName,
                        message: `Name suggests datetime but enableTime is OFF (Config ${config.id}: ${config.label})`,
                    });
                    continue;
                }

                // Strong date-only indicators with enableTime ON
                const strongDateOnly = [
                    /\bdue\s+date\b/i,
                    /\bexpiration\s+date\b/i,
                    /\beffective\s+date\b/i,
                    /\bdate\s+of\s+\w+/i,
                    /\b(receipt|received|issued|sent|filed|closed)\s+date\b/i,
                    /\bdate\s+(received|issued|sent|filed|created|closed)\b/i,
                    /\brenewal\s+date\b/i,
                    /\b(start|end)\s+date\b/i,
                ];

                if (strongDateOnly.some((p) => p.test(field.name)) && field.enableTime) {
                    findings.push({
                        ruleId: 'calendar-name-match',
                        severity: 'info',
                        field: field.name,
                        page: field.pageName,
                        message: `Name suggests date-only but enableTime is ON (Config ${config.id}: ${config.label}) — verify time component is needed`,
                    });
                }
            }
            return findings;
        },
    },

    {
        id: 'calendar-legacy',
        name: 'Calendar Legacy Datepicker',
        severity: 'info',

        check(context) {
            const findings = [];
            for (const field of context.fields) {
                if (field.type !== 'FieldCalendar3') continue;
                if (field.useLegacy) {
                    const config = getConfig(field.enableTime, field.ignoreTimezone, field.useLegacy);
                    const configLabel = config ? `Config ${config.id}: ${config.label}` : 'Unknown config';
                    findings.push({
                        ruleId: 'calendar-legacy',
                        severity: 'info',
                        field: field.name,
                        page: field.pageName,
                        message: `Using legacy datepicker (${configLabel})`,
                    });
                }
            }
            return findings;
        },
    },

    {
        id: 'calendar-valid-config',
        name: 'Calendar Valid Configuration',
        severity: 'warning',

        check(context) {
            const findings = [];
            for (const field of context.fields) {
                if (field.type !== 'FieldCalendar3') continue;
                const config = getConfig(field.enableTime, field.ignoreTimezone, field.useLegacy);
                if (!config) {
                    findings.push({
                        ruleId: 'calendar-valid-config',
                        severity: 'warning',
                        field: field.name,
                        page: field.pageName,
                        message: `Unknown calendar config: enableTime=${field.enableTime}, ignoreTZ=${field.ignoreTimezone}, useLegacy=${field.useLegacy}`,
                    });
                }
            }
            return findings;
        },
    },
];
