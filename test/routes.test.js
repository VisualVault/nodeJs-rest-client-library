import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const loader = fileURLToPath(new URL('./fixtures/load-routes.js', import.meta.url));

describe('the script server routes', () => {
    it('load and expose their request handlers', () => {
        const loaded = JSON.parse(execFileSync(process.execPath, [loader], { encoding: 'utf8' }));

        expect(loaded).toEqual({
            testsite: 'function',
            scripts: 'function',
            processRequest: 'function',
            testProcessRequest: 'function'
        });
    });
});
