import { cpSync } from 'node:fs';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/app.ts', 'src/serve.ts'],
  format: ['esm'],
  clean: true,
  target: 'node20',
  // The landing page uses the logo from docs/brand (copied, not committed twice).
  onSuccess: async () => {
    for (const f of ['sysketch-logo.svg', 'sysketch-logo-dark.svg', 'sysketch-icon.svg']) {
      cpSync(`../../docs/brand/${f}`, `public/brand/${f}`);
    }
  },
});
