const js = require('@eslint/js');
const ts = require('typescript-eslint');
module.exports = [
  { ignores: ['node_modules/**', 'artifacts/**', '**/dist/**'] },
  { files: ['**/*.cjs'], ...js.configs.recommended,
    languageOptions: { ecmaVersion: 2025, sourceType: 'commonjs', globals: Object.fromEntries([
      'console', 'process', 'Buffer', '__dirname', 'URL', 'fetch', 'Response', 'AbortSignal',
      'setTimeout', 'clearTimeout', 'structuredClone', 'globalThis'
    ].map(name => [name, 'readonly'])) } },
  ...ts.configs.recommended.map(config => ({ ...config, files: ['backend/src/**/*.ts'] })),
  { files: ['web/mockups/tests/browser-check.cjs'], languageOptions: { globals: { document: 'readonly', innerWidth: 'readonly' } } }
];
