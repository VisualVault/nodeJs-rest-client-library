const js = require('@eslint/js');
const prettier = require('eslint-config-prettier');
const globals = require('globals');

module.exports = [
    {
        ignores: [
            'node_modules/',
            'scripts/test-scripts/',
            'tasks/**/main.js',
            'tasks/**/bug-analysis/',
            'tasks/**/web-services/scripts/',
            'tasks/**/global-functions/',
            'tasks/**/schedules/',
            'lib/VVRestApi/',
        ],
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
    {
        files: ['tests/**/*.js'],
        languageOptions: {
            globals: {
                VV: 'readonly',
            },
        },
    },
    {
        files: ['testing/**/*.js'],
        languageOptions: {
            globals: {
                VV: 'readonly',
                document: 'readonly',
            },
        },
    },
];
