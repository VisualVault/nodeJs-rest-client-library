import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const fixture = fileURLToPath(new URL('./fixtures/call-route.js', import.meta.url));

function callRoute(route, request) {
    const run = spawnSync(process.execPath, [fixture, route, JSON.stringify(request)], { encoding: 'utf8' });
    const result = run.stdout.split('\n').find((line) => line.indexOf('RESULT:') === 0);

    if (!result) {
        throw new Error('The route fixture wrote no RESULT line. stdout: ' + run.stdout + ' stderr: ' + run.stderr);
    }

    // exitCode is non-zero when an uncaught throw ended the process, as it would end the server.
    return Object.assign(JSON.parse(result.slice('RESULT:'.length)), { exitCode: run.status });
}

const unloadableScripts = {
    'a missing module': 'var gone = require("./no-such-module-anywhere");\nexports.main = function () {};',
    'a syntax error': 'exports.main = function ( {;',
    'a top-level throw': 'throw new Error("thrown while loading");'
};

describe.each(['scripts', 'scheduledscripts'])('the %s route', (route) => {
    it.each(Object.keys(unloadableScripts))('answers 500 and keeps running when the script has %s', (kind) => {
        const called = callRoute(route, {
            query: { id: 'unloadable-' + route + '-' + kind.replace(/\W/g, '-') },
            body: { script: unloadableScripts[kind], baseUrl: 'https://example.com/', token: 't' }
        });

        expect(called.exitCode).toBe(0);
        expect(called.responses).toHaveLength(1);
        expect(called.responses[0].status).toBe(200);
        expect(called.responses[0].body.code).toBe(500);
        expect(called.responses[0].body.error).toMatch(/^Unable to load script: /);
        expect(called.logins).toEqual([]);
    });
});

describe('the scripts route, localScript branch', () => {
    it('answers 500 and keeps running when the named local script cannot load', () => {
        const called = callRoute('scripts', {
            query: { id: 'localScript' },
            localScripts: { 'unloadable-local': unloadableScripts['a missing module'] },
            body: { script: 'unloadable-local', baseUrl: 'https://example.com/' }
        });

        expect(called.exitCode).toBe(0);
        expect(called.responses[0].body.code).toBe(500);
        expect(called.responses[0].body.error).toMatch(/^Unable to load script: /);
    });
});

describe('the ../VVRestApi compatibility module', () => {
    // Legacy scripts load the server's former embedded v1 client by relative path from files/.
    it('exports the keys the v1 module exported, from the visualvault-api package', () => {
        const legacy = require('../lib/VVRestApi/VVRestApiNodeJs/VVRestApi');
        const pkg = require('visualvault-api');

        expect(legacy).toBe(pkg.default);
        expect(legacy.authorize).toBe(pkg.Authorize);
        expect(legacy.vvClient).toBeTypeOf('function');
        expect(legacy.forms.formFieldCollection).toBeTypeOf('function');
    });
});
