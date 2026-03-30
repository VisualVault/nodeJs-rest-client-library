const js = require('@eslint/js');
const prettier = require('eslint-config-prettier');
const globals = require('globals');

module.exports = [
    {
        ignores: ['node_modules/', 'scripts/test-scripts/', 'tasks/**/main.js'],
    },
    js.configs.recommended,
    prettier,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                ...globals.node,
            },
        },
        rules: {
            'no-var': 'off',
            'no-prototype-builtins': 'off',
            'no-unused-vars': ['warn', { args: 'none' }],
            'no-empty': ['error', { allowEmptyCatch: true }],
        },
    },
    {
        files: ['scripts/**/*.js'],
        languageOptions: {
            globals: {
                VV: 'readonly',
            },
        },
    },
];
