/** @type {import('jest').Config} */
module.exports = {
    // Only match *.test.js files under tests/
    testMatch: ['<rootDir>/tests/**/*.test.js'],

    // Exclude Playwright specs and node_modules
    testPathIgnorePatterns: ['/node_modules/', '/testing/', '/tools/explore/specs/'],
};
