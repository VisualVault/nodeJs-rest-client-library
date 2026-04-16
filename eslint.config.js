const js = require('@eslint/js');
const prettier = require('eslint-config-prettier');
const globals = require('globals');

module.exports = [
    {
        ignores: [
            'node_modules/',
            'scripts/test-scripts/',
            'scripts/examples/',
            'research/**/main.js',
            'research/**/bug-analysis/',
            'projects/',
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
        files: ['tests/**/*.js', '.claude/**/tests/**/*.js'],
        languageOptions: {
            globals: {
                ...globals.jest,
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
    {
        files: ['tools/**/*.js'],
        languageOptions: {
            globals: {
                VV: 'readonly',
                document: 'readonly',
                window: 'readonly',
                HTMLElement: 'readonly',
                Window: 'readonly',
                Document: 'readonly',
                NodeFilter: 'readonly',
            },
        },
    },
];
