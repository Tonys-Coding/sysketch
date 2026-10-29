import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { render, renderWithModel, svgToPng } from '../src/index.js';
import {
  createLogoResolver,
  importLogos,
  installSimpleIcons,
  listLogoSources,
  lockLogoFolder,
  logoInfo,
  nameLogoFile,
  readTar,
} from '../src/logos.js';
import { ICONS } from '../src/icons.js';
import { PRODUCTS } from '../src/products.js';

const tmp = () => mkdtempSync(join(tmpdir(), 'sysketch-logos-'));

// A logo with a gradient, a class style and an id: all must reach the output untouched.
const ACME = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 32"><style>.c{fill:#e11d48}</style>' +
    '<defs><linearGradient id="g"><stop offset="0" stop-color="#f59e0b"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs>' +
    '<rect width="64" height="32" rx="6" fill="url(#g)"/><circle class="c" cx="16" cy="16" r="8"/></svg>',
);

function brandFolder(): string {
  const dir = tmp();
  writeFileSync(join(dir, 'acme.svg'), ACME);
  writeFileSync(join(dir, 'database.svg'), ACME); // a generic icon name: never used as a logo
  return dir;
}

const b64 = (b: Buffer) => b.toString('base64');

describe('brand logos', () => {
  it('embeds a project logo byte-for-byte, scaled without stretching', async () => {
    const dir = brandFolder();
    const svg = await render(`logos: ${dir}\nedges: ["client > acme > database"]`);
    expect(svg).toContain(`href="data:image/svg+xml;base64,${b64(ACME)}"`);
    expect(svg).toContain('preserveAspectRatio="xMidYMid meet"');
    expect(svg.match(/<image /g)).toHaveLength(1); // database keeps the sysketch icon
    expect(svg).not.toContain(dir); // folder sources are labeled by name, never by full path
  });

  it('uses the logo title as the label and keeps explicit labels', async () => {
    const dir = brandFolder();
    const { model } = await renderWithModel(
      `logos: ${dir}\nnodes:\n  pay: acme | Payments\nedges: ["client > pay", "pay > acme"]`,
    );
    expect(model.nodes.find((n) => n.id === 'pay')?.label).toBe('Payments');
    expect(model.nodes.find((n) => n.id === 'acme')?.label).toBe('acme');
  });

  it('a generic icon on a node named after a product draws its logo', async () => {
    const dir = brandFolder();
    writeFileSync(join(dir, 'stripe.svg'), ACME);
    writeFileSync(join(dir, 'kafka.svg'), ACME);
    const { model } = await renderWithModel(
      `logos: ${dir}
nodes:
  pay: payment | Stripe
  kafka: queue | Event Bus
  db: database | Database
  orders: server | Orders
edges: ["pay > kafka > db > orders"]`,
    );
    const logo = (id: string) => model.nodes.find((n) => n.id === id)?.logo?.name;
    expect(logo('pay')).toBe('stripe'); // product in the label
    expect(logo('kafka')).toBe('kafka'); // product as the id
    expect(model.nodes.find((n) => n.id === 'kafka')?.label).toBe('Event Bus');
    expect(logo('db')).toBeUndefined(); // generic label: database.svg is never used
    expect(logo('orders')).toBeUndefined();
  });

  it('logos: false and the logos option turn logos off', async () => {
    const dir = brandFolder();
    const spec = `nodes:\n  a: acme/cdn\nedges: ["client > a"]`;
    expect(await render(`logos: ${dir}\n${spec}`)).toContain('<image ');
    expect(await render(`logos: false\n${spec}`)).not.toContain('<image ');
    expect(await render(spec, { logos: false, logoDirs: [dir] })).not.toContain('<image ');
  });

  it('logoFolders: false refuses spec folders but keeps installed logos', async () => {
    const home = tmp();
    importLogos(brandFolder(), 'brand', { home });
    const spec = 'edges: ["acme > db"]';
    await expect(
      render(`logos: ${brandFolder()}\n${spec}`, { logoHome: home, logoFolders: false }),
    ).rejects.toThrow(/not available here/);
    const svg = await render(spec, { logoHome: home, logoFolders: false });
    expect(svg).toContain(b64(ACME));
  });

  it('brand/icon falls back to the icon when no logo is installed', async () => {
    const { model, svg } = await renderWithModel('edges: ["client > cloudflare/cdn > api"]');
    const n = model.nodes.find((x) => x.id === 'cloudflare/cdn')!;
    expect(n.icon.name).toBe('cdn');
    expect(n.label).toBe('Cloudflare');
    expect(n.logo).toBeUndefined();
    expect(svg).not.toContain('<image ');
  });

  it('unknown names still fail with a hint about brand/icon', async () => {
    await expect(render('edges: ["client > zorblax"]')).rejects.toThrow(/brand\/icon/);
  });

  it('known product names fall back to a matching icon without logos', async () => {
    const { model } = await renderWithModel(
      'edges: ["api > sendgrid", "api > auth0", "api > aks"]',
    );
    const by = (id: string) => model.nodes.find((n) => n.id === id)!;
    expect([by('sendgrid').icon.name, by('sendgrid').label]).toEqual(['email', 'SendGrid']);
    expect(by('auth0').icon.name).toBe('auth');
    expect(by('aks').icon.name).toBe('cluster');
  });

  it('refuses a locked logo that was edited afterwards', async () => {
    const dir = brandFolder();
    lockLogoFolder(dir);
    await expect(render(`logos: ${dir}\nedges: ["client > acme"]`)).resolves.toContain('<image ');
    writeFileSync(join(dir, 'acme.svg'), ACME.toString().replace('#e11d48', '#000000'));
    await expect(render(`logos: ${dir}\nedges: ["client > acme"]`)).rejects.toThrow(/fingerprint/);
  });

  it('imports a folder into the logo home and verifies it on use', async () => {
    const home = tmp();
    const r = importLogos(brandFolder(), 'acme-pack', { home });
    expect(r.count).toBe(2);
    expect(listLogoSources(home)).toEqual([{ source: 'acme-pack', count: 2 }]);
    const svg = await render('edges: ["client > acme"]', { logoHome: home });
    expect(svg).toContain(b64(ACME));
    writeFileSync(join(r.dir, 'files', 'acme.svg'), 'tampered');
    await expect(render('edges: ["client > acme"]', { logoHome: home })).rejects.toThrow(
      /fingerprint/,
    );
  });

  it('project folders win over installed sources', () => {
    const home = tmp();
    const other = tmp();
    writeFileSync(join(other, 'acme.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    importLogos(other, 'vendor', { home });
    const logo = createLogoResolver({ dirs: [brandFolder()], home })('acme');
    expect(logo?.data).toBe(b64(ACME));
  });

  it('renders logos to PNG', async () => {
    const svg = await render(`logos: ${brandFolder()}\nedges: ["client > acme"]`);
    expect(svgToPng(svg, 1).subarray(1, 4).toString()).toBe('PNG');
  });
});

/* ------------------------------------------------------------- Simple Icons */

function tarEntry(name: string, body: Buffer): Buffer {
  const h = Buffer.alloc(512);
  h.write(name, 0);
  h.write(body.length.toString(8).padStart(11, '0'), 124);
  h.write('0', 156);
  h.write('ustar', 257);
  const pad = Buffer.alloc((512 - (body.length % 512)) % 512);
  return Buffer.concat([h, body, pad]);
}

const STRIPE = Buffer.from(
  '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Stripe</title><path d="M2 2h20v20H2z"/></svg>',
);
const HIVE = Buffer.from(
  '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Apache Hive</title><path d="M2 2h20v20z"/></svg>',
);

function fakeRegistry(
  opts: { corrupt?: boolean; host?: string; extraSlug?: string } = {},
): typeof fetch {
  const evil = opts.extraSlug ? [{ title: 'Evil', slug: opts.extraSlug, hex: '000000' }] : [];
  const data = JSON.stringify([
    ...evil,
    {
      title: 'Stripe',
      slug: 'stripe',
      hex: '635BFF',
      source: 'https://stripe.com/newsroom/information',
    },
    {
      title: 'Apache Hive',
      slug: 'apachehive',
      hex: 'FDEE21',
      guidelines: 'https://example.org/hive',
      license: { type: 'Apache-2.0' },
      aliases: { aka: ['Hive'] },
    },
  ]);
  const tgz = gzipSync(
    Buffer.concat([
      tarEntry('package/data/simple-icons.json', Buffer.from(data)),
      tarEntry('package/icons/stripe.svg', STRIPE),
      ...(opts.extraSlug ? [tarEntry(`package/icons/${opts.extraSlug}.svg`, STRIPE)] : []),
      tarEntry('package/icons/apachehive.svg', HIVE),
      Buffer.alloc(1024),
    ]),
  );
  const integrity = `sha512-${createHash('sha512').update(tgz).digest('base64')}`;
  return (async (url: string) => {
    if (url.endsWith('.tgz')) {
      const body = opts.corrupt ? Buffer.concat([tgz, Buffer.from('x')]) : tgz;
      return { arrayBuffer: async () => body } as unknown as Response;
    }
    return {
      json: async () => ({
        version: '99.0.0',
        dist: {
          tarball: `https://${opts.host ?? 'registry.npmjs.org'}/simple-icons/-/simple-icons-99.0.0.tgz`,
          integrity,
        },
      }),
    } as unknown as Response;
  }) as typeof fetch;
}

describe('simple-icons install', () => {
  it('only downloads from the npm registry', async () => {
    const home = tmp();
    await expect(
      installSimpleIcons({ home, fetch: fakeRegistry({ host: 'evil.example.com' }) }),
    ).rejects.toThrow(/Refusing to download/);
    await expect(
      installSimpleIcons({ home, version: '../../x', fetch: fakeRegistry() }),
    ).rejects.toThrow(/Not a version/);
  });

  it('skips icon names that could escape the logo folder', async () => {
    const home = tmp();
    const r = await installSimpleIcons({ home, fetch: fakeRegistry({ extraSlug: '../../evil' }) });
    expect(r.count).toBe(2);
    expect(existsSync(join(home, 'evil.svg'))).toBe(false);
    expect(existsSync(join(home, '..', 'evil.svg'))).toBe(false);
  });

  it('reads npm tarballs', () => {
    const files = readTar(
      Buffer.concat([tarEntry('package/a.txt', Buffer.from('hi')), Buffer.alloc(1024)]),
    );
    expect(files.get('package/a.txt')?.toString()).toBe('hi');
  });

  it('installs files byte-for-byte with brand data', async () => {
    const home = tmp();
    const r = await installSimpleIcons({ home, fetch: fakeRegistry() });
    expect(r).toMatchObject({ version: '99.0.0', count: 2 });
    expect(logoInfo('hive', home)).toMatchObject({
      name: 'apachehive',
      license: 'Apache-2.0',
      guidelines: 'https://example.org/hive',
    });
    const logo = createLogoResolver({ home })('stripe')!;
    expect(Buffer.from(logo.data, 'base64').equals(STRIPE)).toBe(true);
    expect(logo.color).toBe('#635BFF');
  });

  it('refuses a download that fails the integrity check', async () => {
    const home = tmp();
    await expect(
      installSimpleIcons({ home, fetch: fakeRegistry({ corrupt: true }) }),
    ).rejects.toThrow(/integrity/);
    expect(listLogoSources(home)).toEqual([]);
  });

  it('fills single-color marks with the official brand color, light ones on a dark tile', async () => {
    const home = tmp();
    await installSimpleIcons({ home, fetch: fakeRegistry() });
    const svg = await render('edges: ["client > stripe > hive"]', { logoHome: home });
    const marks = [...svg.matchAll(/base64,([^"]+)"/g)].map((m) =>
      Buffer.from(m[1]!, 'base64').toString(),
    );
    expect(marks[0]).toBe(STRIPE.toString().replace('<svg', '<svg fill="#635BFF"'));
    expect(marks[1]).toContain('fill="#FDEE21"');
    expect(svg).toContain('fill="#1E293B"'); // dark tile behind the yellow Hive mark
  });

  it('generic icon names never turn into brand logos', async () => {
    const home = tmp();
    mkdirSync(join(home, 'x'));
    writeFileSync(join(home, 'x', 'vault.svg'), ACME);
    importLogos(join(home, 'x'), 'pack', { home });
    expect(await render('edges: ["api > vault"]', { logoHome: home })).not.toContain('<image ');
  });
});

describe('vendor icon packs', () => {
  it('names files from the AWS, Azure and Google Cloud packs', () => {
    const n = (p: string) => nameLogoFile(p);
    expect(
      n(
        'Architecture-Service-Icons_07312026/Arch_Storage/64/Arch_Amazon-Simple-Storage-Service_64.svg',
      ),
    ).toMatchObject({
      name: 'amazonsimplestorageservice',
      title: 'Amazon Simple Storage Service',
    });
    expect(n('x/Arch_AWS-Lambda_64.svg')?.aliases).toContain('lambda');
    expect(n('x/Arch_Amazon-Route-53_64.svg')?.aliases).toContain('route53');
    expect(n('Icons/databases/10121-icon-service-Azure-Cosmos-DB.svg')).toMatchObject({
      name: 'azurecosmosdb',
      aliases: expect.arrayContaining(['cosmosdb']),
    });
    expect(n('Unique Icons/Cloud Run/SVG/CloudRun-512-color-rgb.svg')).toMatchObject({
      name: 'cloudrun',
      title: 'Cloud Run',
    });
    expect(n('brand/Acme-Logo.svg')?.name).toBe('acme');
    expect(n('__MACOSX/x/._Arch_AWS-Lambda_64.svg')).toBeUndefined();
    expect(
      n('Category-Icons_07312026/Arch-Category_32/Arch-Category_Storage_32.svg'),
    ).toBeUndefined();
  });

  it('prefers SVG over PNG, light over dark and the larger size', () => {
    const files = ['x/acme.png', 'x/acme-dark.svg', 'x/acme_16.svg', 'x/acme_64.svg'];
    const scored = files
      .map((f) => [f, nameLogoFile(f)!.score] as const)
      .sort((a, b) => b[1] - a[1]);
    expect(scored[0]![0]).toBe('x/acme_64.svg');
  });

  it('imports a vendor .zip, detects the source and resolves everyday names', async () => {
    const home = tmp();
    const zip = join(tmp(), 'Icon-package.zip');
    const svg = new Uint8Array(ACME);
    writeFileSync(
      zip,
      zipSync({
        'Architecture-Service-Icons_07312026/Arch_Storage/64/Arch_Amazon-Simple-Storage-Service_64.svg':
          svg,
        'Architecture-Service-Icons_07312026/Arch_Storage/32/Arch_Amazon-Simple-Storage-Service_32.svg':
          new Uint8Array([60]),
        'Architecture-Service-Icons_07312026/Arch_Compute/64/Arch_AWS-Lambda_64.svg': svg,
        '__MACOSX/Architecture-Service-Icons_07312026/._Arch_AWS-Lambda_64.svg': svg,
        'Category-Icons_07312026/Arch-Category_32/Arch-Category_Compute_32.svg': svg,
      }),
    );
    const r = importLogos(zip, undefined, { home });
    expect(r).toMatchObject({ source: 'aws', count: 2 });
    const { model, svg: out } = await renderWithModel('edges: ["api > s3", "api > lambda"]', {
      logoHome: home,
    });
    expect(model.nodes.find((x) => x.id === 's3')?.logo?.source).toBe('aws');
    expect(out).toContain(b64(ACME)); // the 64px original, not the 32px one
    expect(out.match(/<image /g)).toHaveLength(2);
  });
});

describe('cloud packs and plain words', () => {
  it('claim product names, not plain words or other companies', () => {
    const home = tmp();
    const svg = new Uint8Array(ACME);
    const pack = (name: string, files: string[]) => {
      const zip = join(tmp(), name);
      writeFileSync(zip, zipSync(Object.fromEntries(files.map((f) => [f, svg]))));
      return zip;
    };
    importLogos(
      pack('Azure_Public_Service_Icons_V24.zip', [
        'Icons/databases/10121-icon-service-Azure-Cosmos-DB.svg',
        'Icons/ai/10001-icon-service-Azure-OpenAI.svg',
        'Icons/monitor/00001-icon-service-Monitor.svg',
        'Icons/containers/10023-icon-service-Kubernetes-Services.svg',
        'Icons/analytics/00039-icon-service-Event-Hubs.svg',
      ]),
      undefined,
      { home },
    );
    importLogos(
      pack('Icon-package.zip', [
        'Architecture-Service-Icons/Arch_Storage/64/Arch_AWS-Backup_64.svg',
        'Architecture-Service-Icons/Arch_Compute/64/Arch_AWS-Lambda_64.svg',
      ]),
      undefined,
      { home },
    );
    importLogos(
      pack('google-cloud-legacy-icons.zip', [
        'cloud_functions/cloud_functions.svg',
        'pubsub/pubsub.svg',
        'dataflow/dataflow.svg',
      ]),
      'gcp-legacy',
      { home },
    );
    const logo = createLogoResolver({ home });
    const source = (name: string) => logo(name)?.source;
    // Google's lowercase file names read as names
    expect(logo('cloud-functions')?.title).toBe('Cloud Functions');
    expect(logo('gcp-pubsub')?.title).toBe('Pub/Sub');
    expect(source('dataflow')).toBe('gcp-legacy');
    // vendor + name always works
    expect(source('gcp-functions')).toBe('gcp-legacy');
    expect(source('aws-lambda')).toBe('aws');
    expect(source('azure-cosmosdb')).toBe('azure');
    // product names and everyday aliases
    for (const n of ['cosmosdb', 'aks', 'eventhubs', 'azure-monitor', 'azure-openai'])
      expect(source(n), n).toBe('azure');
    for (const n of ['lambda', 'aws-backup']) expect(source(n), n).toBe('aws');
    // plain words and other companies keep sysketch icons
    for (const n of ['monitor', 'backup', 'openai', 'kubernetes-services', 'functions'])
      expect(source(n), n).toBeUndefined();
    // suggestions name what works
    expect(logo.names()).toContain('azuremonitor');
    expect(logo.names()).not.toContain('monitor');
  });

  it('everyday names reach logos filed under longer names', () => {
    const home = tmp();
    const folder = (files: string[]) => {
      const dir = tmp();
      for (const f of files) writeFileSync(join(dir, f), ACME);
      return dir;
    };
    importLogos(
      folder(['googlegemini.svg', 'vuedotjs.svg', 'apachecouchdb.svg', 'traefikproxy.svg']),
      'simple-icons',
      { home },
    );
    importLogos(folder(['Power Apps.svg', 'Dynamics 365.svg', 'Dynamics 365 Sales.svg']), 'msft', {
      home,
    });
    const zip = join(tmp(), 'Azure_Public_Service_Icons_V24.zip');
    writeFileSync(
      zip,
      zipSync({ 'Icons/databases/10130-icon-service-SQL-Server.svg': new Uint8Array(ACME) }),
    );
    importLogos(zip, undefined, { home });
    const logo = createLogoResolver({ home });
    const title = (name: string) => logo(name)?.title;
    expect(title('gemini')).toBe('googlegemini');
    expect(title('vue')).toBe('vuedotjs');
    expect(title('couchdb')).toBe('apachecouchdb');
    expect(title('traefik')).toBe('traefikproxy');
    expect(title('sqlserver')).toBe('SQL Server');
    expect(title('power-apps')).toBe('Power Apps');
    expect(title('d365')).toBe('Dynamics 365');
    expect(title('dynamics-365-sales')).toBe('Dynamics 365 Sales');
    // plain words stay free
    expect(logo('sales')).toBeUndefined();
  });
});

describe('product names', () => {
  it('every product maps to a real icon', () => {
    const names = new Set(ICONS.map((i) => i.name));
    for (const [k, [icon]] of Object.entries(PRODUCTS)) expect(names.has(icon), k).toBe(true);
  });
});
