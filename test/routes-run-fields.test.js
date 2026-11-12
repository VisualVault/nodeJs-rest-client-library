import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const fixture = fileURLToPath(new URL('./fixtures/call-route.js', import.meta.url));

function callRoute(route, request) {
    const run = spawnSync(process.execPath, [fixture, route, JSON.stringify(request)], { encoding: 'utf8' });
    const result = run.stdout.split('\n').find((line) => line.indexOf('RESULT:') === 0);

    if (!result) {
        throw new Error('The route fixture wrote no RESULT line. stdout: ' + run.stdout + ' stderr: ' + run.stderr);
    }

    // winston writes info lines to stdout and error lines to stderr; a log check needs both.
    return Object.assign(JSON.parse(result.slice('RESULT:'.length)), { log: run.stdout + run.stderr });
}

describe('the scheduledscripts route', () => {
    it('acknowledges the studioapi completion target', () => {
        const called = callRoute('scheduledscripts', {
            body: { script: 'exports.main = function () {};', baseUrl: 'https://example.com/', token: 'run-1', completionTarget: 'studioapi' }
        });

        expect(called.headers['vv-completion-target']).toBe('studioapi');
        expect(called.error).toBe(null);
    });

    it('acknowledges the target in a Key/Value array body', () => {
        const called = callRoute('scheduledscripts', {
            body: [
                { Key: 'script', Value: 'exports.main = function () {};' },
                { Key: 'baseUrl', Value: 'https://example.com/' },
                { Key: 'token', Value: 'run-1' },
                { Key: 'completionTarget', Value: 'studioapi' }
            ]
        });

        expect(called.headers['vv-completion-target']).toBe('studioapi');
        expect(called.error).toBe(null);
    });

    it('sets no header for a request that names no target', () => {
        const called = callRoute('scheduledscripts', {
            body: { script: 'exports.main = function () {};', baseUrl: 'https://example.com/', token: 'run-1' }
        });

        expect(called.headers).toEqual({});
    });

    it('ignores and logs a target it does not know', () => {
        const called = callRoute('scheduledscripts', {
            body: { script: 'exports.main = function () {};', baseUrl: 'https://example.com/', token: 'run-1', completionTarget: 'not-a-known-target' }
        });

        expect(called.headers).toEqual({});
        expect(called.log).toContain('not-a-known-target');
    });

    it('keeps an unreadable runContext out of the log', () => {
        const called = callRoute('scheduledscripts', {
            body: {
                script: 'exports.main = function () {};',
                baseUrl: 'https://example.com/',
                token: 'run-1',
                runContext: '{"secrets":{"clientSecret":"not-in-the-log"'
            }
        });

        expect(called.log).not.toContain('not-in-the-log');
        expect(called.error).toBe(null);
    });

    it('acknowledges the target before it answers a body it cannot read', () => {
        const called = callRoute('scheduledscripts', { body: { completionTarget: 'studioapi' } });

        expect(called.headers['vv-completion-target']).toBe('studioapi');
        expect(called.error).toBe(null);
    });
});

describe('the scripts route', () => {
    it('acknowledges the studioapi completion target', () => {
        const called = callRoute('scripts', {
            body: { script: 'exports.main = function () {};', baseUrl: 'https://example.com/', completionTarget: 'studioapi' }
        });

        expect(called.headers['vv-completion-target']).toBe('studioapi');
    });

    it('acknowledges the target in a Key/Value array body', () => {
        const called = callRoute('scripts', {
            body: [
                { Key: 'script', Value: 'exports.main = function () {};' },
                { Key: 'baseUrl', Value: 'https://example.com/' },
                { Key: 'completionTarget', Value: 'studioapi' }
            ]
        });

        expect(called.headers['vv-completion-target']).toBe('studioapi');
    });

    it('sets no header for a request that names no target', () => {
        const called = callRoute('scripts', {
            body: { script: 'exports.main = function () {};', baseUrl: 'https://example.com/' }
        });

        expect(called.headers).toEqual({});
    });
});
