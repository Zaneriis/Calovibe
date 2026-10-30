const js = require('@eslint/js');
module.exports = [
  ...require('./web/eslint.config.cjs').filter(config => config.files?.some(pattern => pattern.startsWith('src/'))).map(config => ({ ...config, files: config.files.map(pattern => 'web/' + pattern) })),
  { ignores: ['node_modules/**', 'artifacts/**', '**/dist/**'] },
  { files: ['**/*.cjs'], ...js.configs.recommended,
    languageOptions: { ecmaVersion: 2025, sourceType: 'commonjs', globals: Object.fromEntries([
      'console', 'process', 'Buffer', '__dirname', 'URL', 'fetch', 'Response', 'AbortSignal',
      'setTimeout', 'clearTimeout', 'structuredClone', 'globalThis'
    ].map(name => [name, 'readonly'])) } },
  { files: ['mockups/tests/browser-check.cjs', 'web/tests/browser.cjs'], languageOptions: { globals: { document: 'readonly', innerWidth: 'readonly', localStorage: 'readonly', sessionStorage: 'readonly' } } }
];

