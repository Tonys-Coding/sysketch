import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'playwright-report/**', 'test-results/**', 'bench/.runs/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['scripts/**', 'bench/**'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly' } },
  },
);
