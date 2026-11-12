import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

const { readRunFields, routeCompletionsTo } = require('../lib/VVRestApi/VVRestApiNodeJs/routes/runRequest');

describe('reading the run fields', () => {
    it('reads completionTarget and runContext from a Key/Value array body', () => {
        const fields = readRunFields([
            { Key: 'script', Value: 'exports.main = function () {};' },
            { Key: 'completionTarget', Value: 'studioapi' },
            { Key: 'runContext', Value: '{"version":1}' }
        ]);

        expect(fields).toEqual({ completionTarget: 'studioapi', runContext: { version: 1 } });
    });

    it('reads both fields from an object body', () => {
        const fields = readRunFields({
            script: 'exports.main = function () {};',
            baseUrl: 'https://example.com/',
            completionTarget: 'studioapi',
            runContext: '{"version":1}'
        });

        expect(fields).toEqual({ completionTarget: 'studioapi', runContext: { version: 1 } });
    });

    it('reports no fields for a legacy body', () => {
        const fields = readRunFields({ script: 'exports.main = function () {};', baseUrl: 'https://example.com/' });

        expect(fields).toEqual({ completionTarget: null, runContext: null });
    });

    it('ignores a completion target it does not know', () => {
        const fields = readRunFields({ completionTarget: 'other', runContext: { version: 1 } });

        expect(fields.completionTarget).toBe(null);
    });

    it('keeps a runContext that arrives already parsed', () => {
        const fields = readRunFields({ completionTarget: 'studioapi', runContext: { version: 1 } });

        expect(fields.runContext).toEqual({ version: 1 });
    });

    it('reports no runContext when it cannot read the one the body carries', () => {
        const fields = readRunFields({ completionTarget: 'studioapi', runContext: '{"version":1' });

        expect(fields).toEqual({ completionTarget: 'studioapi', runContext: null });
    });
});

describe('routing the completions of a run', () => {
    it('points the client at the completion target', () => {
        const targets = [];

        routeCompletionsTo({ setCompletionTarget: (target) => targets.push(target) }, 'studioapi');

        expect(targets).toEqual(['studioapi']);
    });

    it('leaves the client on its own route when the request named no target', () => {
        const targets = [];

        routeCompletionsTo({ setCompletionTarget: (target) => targets.push(target) }, null);

        expect(targets).toEqual([]);
    });
});
