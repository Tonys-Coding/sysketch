import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, extname, join, relative, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { unzipSync } from 'fflate';
import { SysketchError } from './errors.js';

/**
 * Official brand logos, drawn exactly as published.
 *
 * sysketch ships no logos. Users install them on their own machine from the official
 * source (`sysketch logos install simple-icons`), import a vendor pack or company folder
 * (`sysketch logos import`), or point a spec at a folder (`logos: ./brand`). Every file is
 * fingerprinted (sha256) when it is installed and checked again before it is drawn, so a
 * logo that was edited after install is refused instead of rendered.
 */

export interface Logo {
  /** lookup name, e.g. "stripe" */
  name: string;
  /** display name, e.g. "Stripe" */
  title: string;
  /** where it came from, e.g. "simple-icons" or "./brand" */
  source: string;
  mime: 'image/svg+xml' | 'image/png';
  /** the file's bytes, base64 */
  data: string;
  /** Simple Icons only: the official brand color its single-color mark is filled with */
  color?: string;
  /** draw on a dark tile (the logo is too light for a white one) */
  darkTile?: boolean;
}

export type LogoResolver = (key: string) => Logo | undefined;

export interface LogoMatch {
  /** what to write in a spec */
  key: string;
  title: string;
  source: string;
}

interface IndexEntry {
  title: string;
  file: string;
  sha256: string;
  color?: string;
  aliases?: string[];
  guidelines?: string;
  license?: string;
  origin?: string;
}

export interface LogoIndex {
  source: string;
  version?: string;
  origin?: string;
  logos: Record<string, IndexEntry>;
}

const INDEX = 'index.json';
const LOCK = 'logos.lock.json';
const FILE_RE = /\.(svg|png)$/i;

/** Where installed logo sources live: $SYSKETCH_HOME/logos, default ~/.sysketch/logos. */
export function logoHome(): string {
  return join(process.env.SYSKETCH_HOME ?? join(homedir(), '.sysketch'), 'logos');
}

export const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Everyday names -> names that logo sources publish under (checked in order).
 * Covers Simple Icons slugs and the AWS, Azure and Google Cloud icon packs.
 */
const BRAND_ALIASES: Record<string, string[]> = {
  postgres: ['postgresql'],
  pg: ['postgresql'],
  psql: ['postgresql'],
  mongo: ['mongodb'],
  kafka: ['apachekafka'],
  cassandra: ['apachecassandra'],
  spark: ['apachespark'],
  airflow: ['apacheairflow'],
  flink: ['apacheflink'],
  zookeeper: ['apachezookeeper'],
  hadoop: ['apachehadoop'],
  pulsar: ['apachepulsar'],
  activemq: ['apacheactivemq'],
  solr: ['apachesolr'],
  beam: ['apachebeam'],
  iceberg: ['apacheiceberg'],
  k8s: ['kubernetes'],
  gcp: ['googlecloud'],
  googlecloud: ['googlecloud'],
  node: ['nodedotjs'],
  nodejs: ['nodedotjs'],
  nextjs: ['nextdotjs'],
  es: ['elasticsearch'],
  elastic: ['elasticsearch'],
  hashicorpvault: ['vault'],
  newrelic: ['newrelic'],
  huggingface: ['huggingface'],
  githubactions: ['githubactions'],
  // AWS Architecture Icons
  s3: ['amazonsimplestorageservice'],
  glacier: ['amazonsimplestorageserviceglacier'],
  sqs: ['amazonsimplequeueservice'],
  sns: ['amazonsimplenotificationservice'],
  ses: ['amazonsimpleemailservice'],
  elb: ['elasticloadbalancing'],
  alb: ['elasticloadbalancing'],
  nlb: ['elasticloadbalancing'],
  apigw: ['amazonapigateway'],
  eks: ['amazonelastickubernetesservice'],
  ecs: ['amazonelasticcontainerservice'],
  ecr: ['amazonelasticcontainerregistry'],
  efs: ['amazonelasticfilesystem', 'amazonefs'],
  iam: ['awsidentityandaccessmanagement'],
  kms: ['awskeymanagementservice'],
  msk: ['amazonmanagedstreamingforapachekafka'],
  opensearch: ['amazonopensearchservice', 'opensearch'],
  dynamo: ['amazondynamodb'],
  sagemaker: ['amazonsagemakerai', 'amazonsagemaker'],
  // Azure icons
  aks: ['kubernetesservices'],
  cosmosdb: ['azurecosmosdb'],
  cosmos: ['azurecosmosdb'],
  azurefunctions: ['functionapps'],
  appservice: ['appservices'],
  azureappservice: ['appservices'],
  azuresql: ['sqldatabase'],
  keyvault: ['keyvaults'],
  azurekeyvault: ['keyvaults'],
  servicebus: ['azureservicebus'],
  eventhubs: ['eventhubs'],
  eventhub: ['eventhubs'],
  eventgrid: ['eventgridtopics'],
  azureblob: ['storageaccounts'],
  azurestorage: ['storageaccounts'],
  azurevm: ['virtualmachine'],
  frontdoor: ['frontdoorandcdnprofiles'],
  azurefrontdoor: ['frontdoorandcdnprofiles'],
  apim: ['apimanagementservices'],
  apimanagement: ['apimanagementservices'],
  azureredis: ['azuremanagedredis', 'cacheredis'],
  azurecache: ['cacheredis'],
  azuremonitor: ['monitor'],
  entra: ['entraidprotection'],
  logicapps: ['logicapps'],
  containerapps: ['containerappsenvironments'],
  datafactory: ['datafactories'],
  synapse: ['azuresynapseanalytics'],
  databricks: ['azuredatabricks', 'databricks'],
  aisearch: ['cognitivesearch'],
  // Google Cloud icons
  gcs: ['cloudstorage', 'googlecloudstorage'],
  cloudstorage: ['cloudstorage', 'googlecloudstorage'],
  gce: ['computeengine'],
  vertex: ['vertexai'],
  bigquery: ['bigquery', 'googlebigquery'],
};
const ALIAS_TO_NAMES = new Map<string, string[]>();
for (const [alias, names] of Object.entries(BRAND_ALIASES))
  ALIAS_TO_NAMES.set(normName(alias), names);

/** Vendor prefixes dropped to make extra aliases in icon packs (Amazon-EC2 -> ec2). */
const VENDOR_PREFIXES = ['amazon', 'aws', 'azure', 'microsoft', 'googlecloud', 'google', 'cloud'];

const sha256 = (buf: Buffer) => createHash('sha256').update(buf).digest('hex');

function readIndex(dir: string): LogoIndex | undefined {
  const p = join(dir, INDEX);
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as LogoIndex) : undefined;
}

/** Light colors (yellow, white...) get a dark tile so the mark stays visible. */
function isLight(hex: string): boolean {
  const n = parseInt(hex.replace('#', ''), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.72;
}

interface Source {
  label: string;
  dir: string;
  index: LogoIndex;
  /** normalized name/alias/title -> index key */
  keys: Map<string, string>;
  /** verify fingerprints (false only for a plain folder with no lock file) */
  verified: boolean;
}

function sourceFrom(label: string, dir: string, index: LogoIndex, verified: boolean): Source {
  const keys = new Map<string, string>();
  const add = (k: string, name: string) => {
    const n = normName(k);
    if (n && !keys.has(n)) keys.set(n, name);
  };
  for (const name of Object.keys(index.logos)) add(name, name);
  for (const [name, e] of Object.entries(index.logos)) {
    add(e.title, name);
    for (const a of e.aliases ?? []) add(a, name);
  }
  return { label, dir, index, keys, verified };
}

/* ------------------------------------------------------------ file naming */

/** Folders that hold category, group or generic shapes rather than products. */
const SKIP_PATH = /(^|\/)(__MACOSX|\.[^/]*)(\/|$)|category|group-icons|general-icons/i;
const LEAD_TOKENS = new Set(['arch', 'res', 'icon', 'service']);
const TRAIL_TOKENS = new Set([
  'light',
  'dark',
  'color',
  'colour',
  'rgb',
  'logo',
  'icon',
  'mark',
  'full',
  'mono',
  'svg',
  'png',
]);
const SIZE_SCORE: Record<string, number> = { '64': 8, '512': 8, '48': 6, '32': 4, '16': 1 };

interface Named {
  name: string;
  title: string;
  aliases: string[];
  score: number;
}

/**
 * Name a logo file from its path. Handles plain names (acme.svg, acme-dark.svg) and the
 * vendor packs: AWS `Arch_Amazon-Simple-Storage-Service_64.svg`, Azure
 * `10121-icon-service-Azure-Cosmos-DB.svg`, Google Cloud `Cloud Run/SVG/CloudRun-512-color-rgb.svg`.
 */
export function nameLogoFile(path: string): Named | undefined {
  const norm = path.split('\\').join('/');
  if (!FILE_RE.test(norm) || SKIP_PATH.test(norm)) return undefined;
  const parts = norm.split('/');
  const stem = basename(parts[parts.length - 1]!, extname(norm));
  if (stem.startsWith('_') || stem.startsWith('.')) return undefined;
  const raw = stem.split(/[-_\s]+/).filter(Boolean);
  const tokens = [...raw];
  while (
    tokens.length > 1 &&
    (/^\d+$/.test(tokens[0]!) || LEAD_TOKENS.has(tokens[0]!.toLowerCase()))
  )
    tokens.shift();
  let size = '';
  while (tokens.length > 1) {
    const t = tokens[tokens.length - 1]!.toLowerCase();
    if (/^(16|20|24|32|48|64|128|256|512)(@\d+x)?(px)?$/.test(t)) size ||= t.replace(/@.*|px/g, '');
    else if (!TRAIL_TOKENS.has(t)) break;
    tokens.pop();
  }
  const parent = parts[parts.length - 2] ?? '';
  const fromFolder = /^(svg|png)$/i.test(parent) && parts.length >= 3;
  const title = fromFolder ? parts[parts.length - 3]! : tokens.join(' ').trim();
  const name = normName(title);
  if (!name) return undefined;
  const aliases = new Set([normName(stem), normName(tokens.join(''))]);
  for (const p of VENDOR_PREFIXES) {
    if (name.startsWith(p) && name.length - p.length >= (p === 'cloud' ? 5 : 2))
      aliases.add(name.slice(p.length));
  }
  aliases.delete(name);
  const dark = raw.some((t) => t.toLowerCase() === 'dark');
  const score =
    (/\.svg$/i.test(norm) ? 100 : 0) +
    (SIZE_SCORE[size] ?? 5) -
    (dark ? 10 : 0) -
    (/(^|\/)res_|resource-icons/i.test(norm) ? 20 : 0);
  return { name, title, aliases: [...aliases].filter(Boolean), score };
}

interface FileRef {
  path: string;
  read: () => Buffer;
}

/** Pick the best file for every logo name (SVG over PNG, light over dark, larger size). */
function indexFiles(
  files: FileRef[],
  withHashes: boolean,
): Record<string, IndexEntry & { ref: FileRef }> {
  const best = new Map<string, Named & { ref: FileRef }>();
  for (const ref of [...files].sort((x, y) => x.path.localeCompare(y.path))) {
    const n = nameLogoFile(ref.path);
    if (!n) continue;
    const prev = best.get(n.name);
    if (!prev || n.score > prev.score) best.set(n.name, { ...n, ref });
  }
  const logos: Record<string, IndexEntry & { ref: FileRef }> = {};
  for (const [name, n] of [...best].sort(([a], [b]) => a.localeCompare(b))) {
    logos[name] = {
      title: n.title,
      file: n.ref.path,
      sha256: withHashes ? sha256(n.ref.read()) : '',
      ...(n.aliases.length ? { aliases: n.aliases } : {}),
      ref: n.ref,
    };
  }
  return logos;
}

function folderFiles(dir: string): FileRef[] {
  const out: FileRef[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      if (f.startsWith('.')) continue;
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (FILE_RE.test(f))
        out.push({ path: relative(dir, p).split('\\').join('/'), read: () => readFileSync(p) });
    }
  };
  walk(dir);
  return out;
}

/** Files inside a .zip (and zips nested one level deep, as some vendor packs ship). */
function zipFiles(buf: Uint8Array, depth = 0): FileRef[] {
  const entries = unzipSync(buf, {
    filter: (f) => FILE_RE.test(f.name) || (depth === 0 && /\.zip$/i.test(f.name)),
  });
  const out: FileRef[] = [];
  for (const [path, data] of Object.entries(entries)) {
    if (/\.zip$/i.test(path))
      out.push(
        ...zipFiles(data, depth + 1).map((r) => ({
          ...r,
          path: `${path.replace(/\.zip$/i, '')}/${r.path}`,
        })),
      );
    else out.push({ path, read: () => Buffer.from(data) });
  }
  return out;
}

/** Index a plain folder of .svg/.png files (names come from the file names). */
function scanFolder(dir: string, withHashes: boolean): LogoIndex {
  const logos: Record<string, IndexEntry> = {};
  for (const [name, e] of Object.entries(indexFiles(folderFiles(dir), withHashes))) {
    logos[name] = {
      title: e.title,
      file: e.file,
      sha256: e.sha256,
      ...(e.aliases ? { aliases: e.aliases } : {}),
    };
  }
  return { source: dir, logos };
}

export interface ResolverOptions {
  /** extra folders checked first (company / project logos), in order */
  dirs?: string[];
  /** use sources installed in the logo home (default true) */
  installed?: boolean;
  /** override the logo home (tests) */
  home?: string;
}

/** Build a lookup over project folders first, then installed sources (Simple Icons last). */
export function createLogoResolver(
  opts: ResolverOptions = {},
): LogoResolver & { names(): string[]; search(text: string, limit?: number): LogoMatch[] } {
  const sources: Source[] = [];
  for (const d of opts.dirs ?? []) {
    const dir = resolve(d);
    if (!existsSync(dir)) throw new SysketchError(`Logo folder not found: ${d}`);
    // Label by folder name: the label ends up in the SVG, and full paths would leak the
    // author's file system into published diagrams.
    const label = basename(dir);
    const lockPath = join(dir, LOCK);
    if (existsSync(lockPath)) {
      sources.push(
        sourceFrom(label, dir, JSON.parse(readFileSync(lockPath, 'utf8')) as LogoIndex, true),
      );
    } else {
      sources.push(sourceFrom(label, dir, scanFolder(dir, false), false));
    }
  }
  const home = opts.home ?? logoHome();
  if (opts.installed !== false && existsSync(home)) {
    const installed = readdirSync(home)
      .filter((d) => existsSync(join(home, d, INDEX)))
      .sort(
        (a, b) => Number(a === 'simple-icons') - Number(b === 'simple-icons') || a.localeCompare(b),
      );
    for (const d of installed)
      sources.push(sourceFrom(d, join(home, d), readIndex(join(home, d))!, true));
  }

  const cache = new Map<string, Logo | undefined>();
  const resolver = (key: string): Logo | undefined => {
    const k = normName(key);
    if (!k) return undefined;
    if (cache.has(k)) return cache.get(k);
    const wanted = [k, ...(ALIAS_TO_NAMES.get(k) ?? [])];
    let found: Logo | undefined;
    outer: for (const s of sources) {
      for (const w of wanted) {
        const name = s.keys.get(w);
        if (!name) continue;
        const e = s.index.logos[name]!;
        const path = join(s.dir, e.file);
        if (!existsSync(path)) {
          throw new SysketchError(
            `Logo "${name}" (${s.label}) is missing its file ${e.file}. Reinstall the source.`,
          );
        }
        const buf = readFileSync(path);
        if (s.verified && sha256(buf) !== e.sha256) {
          throw new SysketchError(
            `Logo "${name}" (${s.label}) does not match its recorded fingerprint, so it was changed after install. ` +
              `sysketch only draws original logos; reinstall or re-lock the source.`,
          );
        }
        found = {
          name,
          title: e.title,
          source: s.label,
          mime: extname(e.file).toLowerCase() === '.png' ? 'image/png' : 'image/svg+xml',
          data: buf.toString('base64'),
          ...(e.color ? { color: e.color, darkTile: isLight(e.color) } : {}),
        };
        break outer;
      }
    }
    cache.set(k, found);
    return found;
  };
  return Object.assign(resolver, {
    names: () => [...new Set(sources.flatMap((s) => Object.keys(s.index.logos)))],
    /** Logos whose name, alias or title contains `text`; `key` is the shortest name to write. */
    search: (text: string, limit = 20): LogoMatch[] => {
      const q = normName(text);
      const hits = new Map<string, LogoMatch>();
      const everyday = [...ALIAS_TO_NAMES].filter(([a]) => a.includes(q));
      for (const s of sources) {
        const keysByName = new Map<string, string[]>();
        for (const [k, name] of s.keys) keysByName.set(name, [...(keysByName.get(name) ?? []), k]);
        for (const [a, targets] of everyday) {
          const name = targets.map((t) => s.keys.get(t)).find(Boolean);
          if (name) keysByName.set(name, [...(keysByName.get(name) ?? []), a]);
        }
        for (const [name, keys] of keysByName) {
          const match = keys.filter((k) => k.includes(q));
          if (!match.length || hits.has(`${s.label}:${name}`)) continue;
          const key = match.sort((a, b) => a.length - b.length || a.localeCompare(b))[0]!;
          hits.set(`${s.label}:${name}`, {
            key,
            title: s.index.logos[name]!.title,
            source: s.label,
          });
        }
      }
      return [...hits.values()]
        .sort(
          (a, b) =>
            Number(b.key === q) - Number(a.key === q) ||
            a.key.length - b.key.length ||
            a.key.localeCompare(b.key),
        )
        .slice(0, limit);
    },
  });
}

/* ------------------------------------------------------------------ installers */

/** Minimal tar reader (ustar + pax path headers), enough for npm tarballs. */
export function readTar(buf: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  let off = 0;
  let paxPath: string | undefined;
  const str = (o: number, n: number) => buf.toString('utf8', o, o + n).replace(/\0.*$/s, '');
  while (off + 512 <= buf.length) {
    const name = str(off, 100);
    if (!name) break;
    const size = parseInt(str(off + 124, 12).trim() || '0', 8);
    const type = str(off + 156, 1);
    const prefix = str(off + 345, 155);
    const body = buf.subarray(off + 512, off + 512 + size);
    off += 512 + Math.ceil(size / 512) * 512;
    if (type === 'x') {
      paxPath = /\d+ path=([^\n]*)\n/.exec(body.toString('utf8'))?.[1];
      continue;
    }
    if (type === 'g') continue;
    const path = paxPath ?? (prefix ? `${prefix}/${name}` : name);
    paxPath = undefined;
    if (type === '0' || type === '' || type === '\0') files.set(path, Buffer.from(body));
  }
  return files;
}

export interface InstallResult {
  source: string;
  version?: string;
  count: number;
  dir: string;
}

interface SimpleIconData {
  title: string;
  slug: string;
  hex: string;
  source?: string;
  guidelines?: string;
  license?: { type?: string; url?: string };
  aliases?: { aka?: string[]; dup?: { title: string }[] };
}

/**
 * Download Simple Icons from the npm registry, check the tarball against the registry's
 * sha512 integrity, and store its icons byte-for-byte with their brand data.
 */
export async function installSimpleIcons(
  opts: { version?: string; home?: string; fetch?: typeof fetch } = {},
): Promise<InstallResult> {
  const f = opts.fetch ?? fetch;
  const meta = (await (
    await f(`https://registry.npmjs.org/simple-icons/${opts.version ?? 'latest'}`)
  ).json()) as {
    version: string;
    dist: { tarball: string; integrity: string };
  };
  if (!meta.dist?.tarball)
    throw new SysketchError(`simple-icons ${opts.version ?? 'latest'} not found on npm`);
  const tgz = Buffer.from(await (await f(meta.dist.tarball)).arrayBuffer());
  const [algo, want] = meta.dist.integrity.split('-') as [string, string];
  const got = createHash(algo).update(tgz).digest('base64');
  if (got !== want)
    throw new SysketchError(
      'simple-icons download failed its integrity check; nothing was installed.',
    );

  const files = readTar(gunzipSync(tgz));
  const data = files.get('package/data/simple-icons.json');
  if (!data) throw new SysketchError('simple-icons package has no data/simple-icons.json');
  const list = JSON.parse(data.toString('utf8')) as SimpleIconData[];

  const dir = join(opts.home ?? logoHome(), 'simple-icons');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, 'icons'), { recursive: true });
  const logos: Record<string, IndexEntry> = {};
  for (const icon of list) {
    const svg = files.get(`package/icons/${icon.slug}.svg`);
    if (!svg) continue;
    const file = `icons/${icon.slug}.svg`;
    writeFileSync(join(dir, file), svg);
    logos[icon.slug] = {
      title: icon.title,
      file,
      sha256: sha256(svg),
      color: `#${icon.hex}`,
      ...(icon.aliases?.aka || icon.aliases?.dup
        ? {
            aliases: [...(icon.aliases.aka ?? []), ...(icon.aliases.dup ?? []).map((d) => d.title)],
          }
        : {}),
      ...(icon.guidelines ? { guidelines: icon.guidelines } : {}),
      ...(icon.license?.type ? { license: icon.license.type } : {}),
      ...(icon.source ? { origin: icon.source } : {}),
    };
  }
  for (const extra of ['LICENSE.md', 'DISCLAIMER.md']) {
    const b = files.get(`package/${extra}`);
    if (b) writeFileSync(join(dir, extra), b);
  }
  const index: LogoIndex = {
    source: 'simple-icons',
    version: meta.version,
    origin: meta.dist.tarball,
    logos,
  };
  writeFileSync(join(dir, INDEX), JSON.stringify(index, null, 1));
  return { source: 'simple-icons', version: meta.version, count: Object.keys(logos).length, dir };
}

/** Guess a source name for the official cloud packs. */
function detectSource(paths: string[]): string | undefined {
  const all = paths.join('\n');
  if (/Architecture-Service-Icons|(^|\/)Arch_/m.test(all)) return 'aws';
  if (/Azure_Public_Service_Icons|icon-service-/.test(all)) return 'azure';
  if (/Unique Icons\/|-512-color/.test(all)) return 'gcp';
  return undefined;
}

/**
 * Copy official logo files (a folder or a .zip, e.g. a vendor icon pack) byte-for-byte into
 * the logo home. `name` defaults to aws / azure / gcp for those vendors' packs.
 */
export function importLogos(
  src: string,
  name?: string,
  opts: { home?: string } = {},
): InstallResult {
  const from = resolve(src);
  if (!existsSync(from)) throw new SysketchError(`Not found: ${src}`);
  const files = statSync(from).isDirectory()
    ? folderFiles(from)
    : /\.zip$/i.test(from)
      ? zipFiles(readFileSync(from))
      : [];
  if (!files.length)
    throw new SysketchError(`No .svg or .png logo files in ${src}. Pass a folder or a .zip.`);
  const source = name ?? detectSource(files.map((f) => f.path));
  if (!source) throw new SysketchError('Name this logo source with --as <name> (e.g. --as acme).');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(source)) {
    throw new SysketchError(
      `Source name "${source}" must be lowercase letters, digits and dashes.`,
    );
  }
  const indexed = indexFiles(files, true);
  const dir = join(opts.home ?? logoHome(), source);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, 'files'), { recursive: true });
  const logos: Record<string, IndexEntry> = {};
  for (const [key, { ref, ...e }] of Object.entries(indexed)) {
    const file = `files/${key}${extname(e.file).toLowerCase()}`;
    writeFileSync(join(dir, file), ref.read());
    logos[key] = { ...e, file, origin: e.file };
  }
  writeFileSync(
    join(dir, INDEX),
    JSON.stringify({ source, origin: basename(from), logos }, null, 1),
  );
  return { source, count: Object.keys(logos).length, dir };
}

/** Record fingerprints for a project logo folder; later edits to those files are refused. */
export function lockLogoFolder(dir: string): { count: number; path: string } {
  const abs = resolve(dir);
  if (!existsSync(abs) || !statSync(abs).isDirectory())
    throw new SysketchError(`Not a folder: ${dir}`);
  const index = scanFolder(abs, true);
  index.source = basename(abs);
  const path = join(abs, LOCK);
  writeFileSync(path, JSON.stringify(index, null, 1) + '\n');
  return { count: Object.keys(index.logos).length, path };
}

export function listLogoSources(
  home = logoHome(),
): { source: string; version?: string; count: number }[] {
  if (!existsSync(home)) return [];
  return readdirSync(home)
    .map((d) => readIndex(join(home, d)))
    .filter((i): i is LogoIndex => !!i)
    .map((i) => ({
      source: i.source,
      ...(i.version ? { version: i.version } : {}),
      count: Object.keys(i.logos).length,
    }));
}

export function removeLogoSource(name: string, home = logoHome()): boolean {
  const dir = join(home, name);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name) || !existsSync(join(dir, INDEX))) return false;
  rmSync(dir, { recursive: true, force: true });
  return true;
}

/** Details for `sysketch logos info <name>`: where the logo came from and its guidelines. */
export function logoInfo(
  key: string,
  home = logoHome(),
): (IndexEntry & { source: string; name: string }) | undefined {
  const wanted = [normName(key), ...(ALIAS_TO_NAMES.get(normName(key)) ?? [])];
  for (const s of listLogoSources(home)) {
    const idx = readIndex(join(home, s.source));
    const src = idx && sourceFrom(s.source, join(home, s.source), idx, true);
    const name = wanted.map((w) => src?.keys.get(w)).find(Boolean);
    if (src && name) return { ...src.index.logos[name]!, source: s.source, name };
  }
  return undefined;
}
