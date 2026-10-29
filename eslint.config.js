import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'playwright-report/**', 'test-results/**', 'bench/.runs/**', '.shots/**', '_site/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['scripts/**', 'bench/**', 'packages/*/scripts/**', 'docs/**/generators/**'],
    languageOptions: {
      globals: Object.fromEntries(
        ['process', 'console', 'URL', 'fetch', 'AbortSignal', 'Buffer'].map((g) => [g, 'readonly']),
      ),
    },
  },
  {
    // the showcase site's script runs in the browser
    files: ['site/**'],
    languageOptions: {
      globals: Object.fromEntries(
        [
          'document', 'window', 'navigator', 'fetch', 'setTimeout', 'clearTimeout', 'URL',
          'Image', 'Blob', 'Response', 'TextEncoder', 'CompressionStream', 'btoa',
          'matchMedia', 'localStorage', 'IntersectionObserver', 'DOMParser',
        ].map((g) => [g, 'readonly']),
      ),
    },
  },
);
