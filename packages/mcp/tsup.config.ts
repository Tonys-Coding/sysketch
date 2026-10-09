import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts', 'src/cli.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'node20',
});
