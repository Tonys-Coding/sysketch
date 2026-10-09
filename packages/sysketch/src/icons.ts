/**
 * Original icon set. Each body is drawn on a 48x48 grid and uses placeholders:
 * {A} accent stroke, {M} mid fill, {L} white highlight.
 */
export interface IconDef {
  name: string;
  label: string;
  hue: string;
  /** alias -> default label (null = use the icon label) */
  aliases: Record<string, string | null>;
  body: string;
}

const S = 'stroke="{A}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"';

const server = [6, 19, 32]
  .map(
    (y) =>
      `<rect x="5" y="${y}" width="38" height="12" rx="4" fill="{M}" ${S}/>` +
      `<circle cx="13" cy="${y + 6}" r="2.2" fill="{A}"/><path d="M24 ${y + 6}h13" ${S} fill="none"/>`,
  )
  .join('');

export const ICONS: IconDef[] = [
  {
    name: 'user',
    label: 'User',
    hue: 'blue',
    aliases: {
      client: 'Client',
      browser: 'Browser',
      users: 'Users',
      person: 'User',
      mobile: 'Mobile',
    },
    body: `<circle cx="24" cy="14" r="8" fill="{A}"/><path d="M8 42c0-10 7-16 16-16s16 6 16 16z" fill="{M}" ${S}/>`,
  },
  {
    name: 'server',
    label: 'Server',
    hue: 'green',
    aliases: {
      api: 'API Server',
      backend: 'Backend',
      service: 'Service',
      app: 'App Server',
      web: 'Web Server',
      worker: 'Worker',
    },
    body: server,
  },
  {
    name: 'database',
    label: 'Database',
    hue: 'amber',
    aliases: {
      db: 'Database',
      sql: 'SQL DB',
      postgres: 'PostgreSQL',
      mysql: 'MySQL',
      mongo: 'MongoDB',
      nosql: 'NoSQL DB',
    },
    body:
      `<path d="M8 12v24c0 4 7 7 16 7s16-3 16-7V12" fill="{M}" ${S}/>` +
      `<ellipse cx="24" cy="12" rx="16" ry="7" fill="{L}" ${S}/>` +
      `<path d="M8 24c0 4 7 7 16 7s16-3 16-7" fill="none" ${S}/>`,
  },
  {
    name: 'cache',
    label: 'Cache',
    hue: 'red',
    aliases: { redis: 'Redis', memcached: 'Memcached' },
    body: `<path d="M28 3L9 27h13l-3 18 20-26H26z" fill="{M}" ${S}/>`,
  },
  {
    name: 'queue',
    label: 'Queue',
    hue: 'pink',
    aliases: {
      kafka: 'Kafka',
      mq: 'Message Queue',
      broker: 'Broker',
      sqs: 'SQS',
      rabbitmq: 'RabbitMQ',
    },
    body:
      [3, 16, 29]
        .map((x) => `<rect x="${x}" y="15" width="10" height="18" rx="3" fill="{M}" ${S}/>`)
        .join('') + `<path d="M41 19l5 5-5 5" fill="none" ${S}/>`,
  },
  {
    name: 'load-balancer',
    label: 'Load Balancer',
    hue: 'violet',
    aliases: { lb: 'Load Balancer', nginx: 'Nginx', haproxy: 'HAProxy', balancer: 'Load Balancer' },
    body:
      `<path d="M24 13V26M8 32V26H40V32M24 26V32" fill="none" ${S}/>` +
      `<circle cx="24" cy="9" r="6" fill="{A}"/>` +
      [8, 24, 40].map((x) => `<circle cx="${x}" cy="38" r="6" fill="{M}" ${S}/>`).join(''),
  },
  {
    name: 'api-gateway',
    label: 'API Gateway',
    hue: 'teal',
    aliases: { gateway: 'API Gateway', apigw: 'API Gateway' },
    body:
      `<path d="M24 3l19 11v20L24 45 5 34V14z" fill="{M}" ${S}/>` +
      `<path d="M18 17l-6 7 6 7M30 17l6 7-6 7M26 15l-4 18" fill="none" ${S}/>`,
  },
  {
    name: 'cdn',
    label: 'CDN',
    hue: 'sky',
    aliases: { edge: 'Edge', globe: 'Global' },
    body:
      `<circle cx="24" cy="24" r="19" fill="{L}" ${S}/>` +
      `<ellipse cx="24" cy="24" rx="8" ry="19" fill="{M}" ${S}/>` +
      `<path d="M5 24h38M8 14h32M8 34h32" fill="none" ${S}/>`,
  },
  {
    name: 'storage',
    label: 'Storage',
    hue: 'orange',
    aliases: { s3: 'S3', bucket: 'Bucket', blob: 'Blob Storage', files: 'File Storage' },
    body:
      `<path d="M7 14l5 28h24l5-28" fill="{M}" ${S}/>` +
      `<ellipse cx="24" cy="14" rx="17" ry="6" fill="{L}" ${S}/>`,
  },
  {
    name: 'cloud',
    label: 'Cloud',
    hue: 'slate',
    aliases: { internet: 'Internet', external: 'External' },
    body: `<path d="M13 39a9 9 0 0 1-1-18 12 12 0 0 1 23-3 10.5 10.5 0 0 1 1 21z" fill="{M}" ${S}/>`,
  },
];

const byKey = new Map<string, { icon: IconDef; label: string }>();
for (const icon of ICONS) {
  byKey.set(icon.name, { icon, label: icon.label });
  for (const [alias, label] of Object.entries(icon.aliases)) {
    byKey.set(alias, { icon, label: label ?? icon.label });
  }
}

/** Resolve an icon name or alias (case-insensitive). */
export function findIcon(key: string): { icon: IconDef; label: string } | undefined {
  return byKey.get(key.toLowerCase());
}

/** Every accepted icon name and alias. */
export function iconKeys(): string[] {
  return [...byKey.keys()];
}
