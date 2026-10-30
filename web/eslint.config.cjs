const js = require('@eslint/js');
const ts = require('typescript-eslint');
const hooks = require('eslint-plugin-react-hooks');
module.exports = [
  { ignores: ['dist/**', 'prototype-dist/**', 'mockups/**', 'page.cjs', 'checks/**'] },
  { files: ['**/*.cjs'], ...js.configs.recommended, languageOptions: { sourceType: 'commonjs', globals: Object.fromEntries(['require', 'module', '__dirname', 'console', 'process', 'URL', 'setTimeout', 'document', 'innerWidth'].map(name => [name, 'readonly'])) } },
  ...ts.configs.recommended.map(config => ({ ...config, files: ['src/**/*.ts', 'src/**/*.tsx'] })),
  { files: ['src/**/*.ts', 'src/**/*.tsx'], plugins: { 'react-hooks': hooks }, rules: { ...hooks.configs.recommended.rules }, languageOptions: { globals: Object.fromEntries(['document', 'fetch', 'matchMedia', 'AbortSignal'].map(name => [name, 'readonly'])) } }
];
