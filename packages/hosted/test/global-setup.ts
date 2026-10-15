import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// The server imports the bundled viewer (src/viewer.generated.ts); build it before the tests.
export default function setup() {
  execFileSync(
    process.execPath,
    [fileURLToPath(new URL('../scripts/build-viewer.mjs', import.meta.url))],
    {
      stdio: 'ignore',
    },
  );
}
