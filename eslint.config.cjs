const js = require('@eslint/js');
module.exports = [
  { ignores: ['node_modules/**', 'artifacts/**'] },
  { files: ['**/*.cjs'], ...js.configs.recommended,
    languageOptions: { ecmaVersion: 2025, sourceType: 'commonjs', globals: Object.fromEntries([
      'console', 'process', 'Buffer', '__dirname', 'URL', 'fetch', 'Response', 'AbortSignal',
      'setTimeout', 'clearTimeout', 'structuredClone', 'globalThis'
    ].map(name => [name, 'readonly'])) } },
  { files: ['mockups/tests/browser-check.cjs'], languageOptions: { globals: { document: 'readonly', innerWidth: 'readonly' } } }
];
