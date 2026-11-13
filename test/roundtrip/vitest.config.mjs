// Opt-in round-trip suites: real server processes on fixed local ports. Not part of `npm test`.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    root: fileURLToPath(new URL('../..', import.meta.url)),
    test: {
        include: ['test/roundtrip/**/*.rt.js'],
        fileParallelism: false,
        testTimeout: 30000,
        hookTimeout: 30000
    }
});
