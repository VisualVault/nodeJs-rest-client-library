import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

describe('the script server client library', () => {
    // The routes call the lowercase namespace (authorize, vvClient, forms), which the
    // package exposes on its default export; the root export holds classes instead.
    it('comes from the visualvault-api package', () => {
        const client = require('visualvault-api').default;

        expect(client.authorize).toBeTypeOf('function');
        expect(client.forms.formFieldCollection).toBeTypeOf('function');
    });

    // The script routes call this method on the authenticated client, so a rename in the package
    // fails here rather than part-way through a script run.
    it('takes a completion target on the authenticated client', () => {
        expect(require('visualvault-api').VVClient.prototype.setCompletionTarget).toBeTypeOf('function');
    });
});
