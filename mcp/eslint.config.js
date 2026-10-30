import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { files: ['src/**/*.ts'], extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: { parserOptions: { project: './tsconfig.json', tsconfigRootDir: import.meta.dirname } } },
  { files: ['**/*.cjs'], ...js.configs.recommended,
    languageOptions: { ecmaVersion: 2025, sourceType: 'commonjs', globals: Object.fromEntries([
      'console', 'process', 'Buffer', '__dirname', 'URL', 'fetch', 'Response', 'AbortSignal',
      'setTimeout', 'clearTimeout', 'structuredClone', 'globalThis'
    ].map(name => [name, 'readonly'])) } }
);
