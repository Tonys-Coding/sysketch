import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importLogos } from 'sysketch';
import { REDIS_SVG } from './fixtures.js';

// Renders must not depend on logos installed on the developer's machine.
process.env.SYSKETCH_HOME = mkdtempSync(join(tmpdir(), 'sysketch-home-'));

// The hosted logo home: one stand-in "redis" mark, as the build would install from Simple Icons.
const brand = mkdtempSync(join(tmpdir(), 'sysketch-brand-'));
writeFileSync(join(brand, 'redis.svg'), REDIS_SVG);
const home = mkdtempSync(join(tmpdir(), 'sysketch-hosted-logos-'));
importLogos(brand, 'simple-icons', { home });
process.env.SYSKETCH_HOSTED_LOGOS = home;
