import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Renders must not depend on logos installed on the developer's machine.
process.env.SYSKETCH_HOME = mkdtempSync(join(tmpdir(), 'sysketch-home-'));
