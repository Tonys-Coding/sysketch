import { GENERATED_ICONS } from './icons.generated.js';

/**
 * Icon bodies are drawn on a 48x48 grid with color placeholders that each
 * theme fills in: {A} accent stroke, {M} mid fill, {L} highlight / lit top, {S} shade
 * (the dark side of 3D shapes).
 */
export interface IconDef {
  name: string;
  label: string;
  hue: string;
  /** alias -> default label (null = use the icon label) */
  aliases: Record<string, string | null>;
  body: string;
  /** true when the body is borrowed from a fallback icon (art not drawn yet) */
  borrowed: boolean;
}

interface IconMeta {
  name: string;
  label: string;
  hue: string;
  aliases?: Record<string, string | null>;
  /** icon whose art is used until this one is drawn */
  fallback?: string;
}

const S = 'stroke="{A}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"';

/** Starter art by Claude. Files in icons-src/ (see icons.generated.ts) replace these. */
const PLACEHOLDERS: Record<string, string> = {
  user: `<circle cx="24" cy="14" r="8" fill="{A}"/><path d="M8 42c0-10 7-16 16-16s16 6 16 16z" fill="{M}" ${S}/>`,
  server: [6, 19, 32]
    .map(
      (y) =>
        `<rect x="5" y="${y}" width="38" height="12" rx="4" fill="{M}" ${S}/>` +
        `<circle cx="13" cy="${y + 6}" r="2.2" fill="{A}"/><path d="M24 ${y + 6}h13" ${S} fill="none"/>`,
    )
    .join(''),
  database:
    `<path d="M8 12v24c0 4 7 7 16 7s16-3 16-7V12" fill="{M}" ${S}/>` +
    `<ellipse cx="24" cy="12" rx="16" ry="7" fill="{L}" ${S}/>` +
    `<path d="M8 24c0 4 7 7 16 7s16-3 16-7" fill="none" ${S}/>`,
  cache: `<path d="M28 3L9 27h13l-3 18 20-26H26z" fill="{M}" ${S}/>`,
  queue:
    [3, 16, 29]
      .map((x) => `<rect x="${x}" y="15" width="10" height="18" rx="3" fill="{M}" ${S}/>`)
      .join('') + `<path d="M41 19l5 5-5 5" fill="none" ${S}/>`,
  'load-balancer':
    `<path d="M24 13V26M8 32V26H40V32M24 26V32" fill="none" ${S}/>` +
    `<circle cx="24" cy="9" r="6" fill="{A}"/>` +
    [8, 24, 40].map((x) => `<circle cx="${x}" cy="38" r="6" fill="{M}" ${S}/>`).join(''),
  'api-gateway':
    `<path d="M24 3l19 11v20L24 45 5 34V14z" fill="{M}" ${S}/>` +
    `<path d="M18 17l-6 7 6 7M30 17l6 7-6 7M26 15l-4 18" fill="none" ${S}/>`,
  cdn:
    `<circle cx="24" cy="24" r="19" fill="{L}" ${S}/>` +
    `<ellipse cx="24" cy="24" rx="8" ry="19" fill="{M}" ${S}/>` +
    `<path d="M5 24h38M8 14h32M8 34h32" fill="none" ${S}/>`,
  storage:
    `<path d="M7 14l5 28h24l5-28" fill="{M}" ${S}/>` +
    `<ellipse cx="24" cy="14" rx="17" ry="6" fill="{L}" ${S}/>`,
  cloud: `<path d="M13 39a9 9 0 0 1-1-18 12 12 0 0 1 23-3 10.5 10.5 0 0 1 1 21z" fill="{M}" ${S}/>`,
};

/** The full catalog (see docs/icon-checklist.md). Order is the listing order. */
const META: IconMeta[] = [
  // Clients & edge
  {
    name: 'user',
    label: 'User',
    hue: 'blue',
    aliases: { client: 'Client', users: 'Users', person: 'User', customer: 'Customer' },
  },
  {
    name: 'mobile',
    label: 'Mobile',
    hue: 'blue',
    fallback: 'user',
    aliases: { phone: 'Phone', ios: 'iOS App', android: 'Android App', 'mobile-app': 'Mobile App' },
  },
  {
    name: 'browser',
    label: 'Browser',
    hue: 'blue',
    fallback: 'user',
    aliases: { webapp: 'Web App', frontend: 'Frontend', spa: 'Web App' },
  },
  {
    name: 'desktop',
    label: 'Desktop App',
    hue: 'blue',
    fallback: 'user',
    aliases: { 'desktop-app': 'Desktop App' },
  },
  {
    name: 'cdn',
    label: 'CDN',
    hue: 'sky',
    aliases: { edge: 'Edge', globe: 'Global', cloudfront: 'CloudFront' },
  },
  {
    name: 'dns',
    label: 'DNS',
    hue: 'sky',
    fallback: 'cloud',
    aliases: { route53: 'Route 53', domain: 'Domain' },
  },
  {
    name: 'load-balancer',
    label: 'Load Balancer',
    hue: 'violet',
    aliases: {
      lb: 'Load Balancer',
      balancer: 'Load Balancer',
      nginx: 'Nginx',
      haproxy: 'HAProxy',
      elb: 'ELB',
      proxy: 'Proxy',
      'reverse-proxy': 'Reverse Proxy',
    },
  },
  {
    name: 'api-gateway',
    label: 'API Gateway',
    hue: 'teal',
    aliases: { gateway: 'API Gateway', apigw: 'API Gateway' },
  },
  {
    name: 'firewall',
    label: 'Firewall',
    hue: 'red',
    fallback: 'api-gateway',
    aliases: { waf: 'WAF' },
  },
  {
    name: 'rate-limiter',
    label: 'Rate Limiter',
    hue: 'red',
    fallback: 'api-gateway',
    aliases: { ratelimit: 'Rate Limiter', throttle: 'Throttler' },
  },
  // Compute
  {
    name: 'server',
    label: 'Server',
    hue: 'green',
    aliases: {
      api: 'API Server',
      backend: 'Backend',
      app: 'App Server',
      web: 'Web Server',
      'web-server': 'Web Server',
    },
  },
  {
    name: 'service',
    label: 'Service',
    hue: 'green',
    fallback: 'server',
    aliases: { microservice: 'Microservice', svc: 'Service' },
  },
  {
    name: 'worker',
    label: 'Worker',
    hue: 'green',
    fallback: 'server',
    aliases: { workers: 'Workers', consumer: 'Consumer', job: 'Job' },
  },
  {
    name: 'function',
    label: 'Function',
    hue: 'green',
    fallback: 'server',
    aliases: { lambda: 'Lambda', serverless: 'Serverless Fn', faas: 'Function' },
  },
  {
    name: 'container',
    label: 'Container',
    hue: 'green',
    fallback: 'server',
    aliases: { docker: 'Docker', pod: 'Pod' },
  },
  {
    name: 'cluster',
    label: 'Cluster',
    hue: 'green',
    fallback: 'server',
    aliases: { k8s: 'Kubernetes', kubernetes: 'Kubernetes' },
  },
  {
    name: 'scheduler',
    label: 'Scheduler',
    hue: 'green',
    fallback: 'server',
    aliases: { cron: 'Cron', timer: 'Scheduler' },
  },
  {
    name: 'vm',
    label: 'Virtual Machine',
    hue: 'slate',
    fallback: 'server',
    aliases: { ec2: 'EC2', instance: 'Instance' },
  },
  // Data
  {
    name: 'database',
    label: 'Database',
    hue: 'amber',
    aliases: {
      db: 'Database',
      sql: 'SQL DB',
      postgres: 'PostgreSQL',
      mysql: 'MySQL',
      rds: 'RDS',
      primary: 'Primary DB',
      replica: 'Replica',
    },
  },
  {
    name: 'nosql',
    label: 'NoSQL DB',
    hue: 'amber',
    fallback: 'database',
    aliases: {
      mongo: 'MongoDB',
      dynamodb: 'DynamoDB',
      cassandra: 'Cassandra',
      document: 'Document DB',
    },
  },
  {
    name: 'key-value',
    label: 'KV Store',
    hue: 'amber',
    fallback: 'database',
    aliases: { kv: 'KV Store' },
  },
  {
    name: 'cache',
    label: 'Cache',
    hue: 'red',
    aliases: { redis: 'Redis', memcached: 'Memcached' },
  },
  {
    name: 'search',
    label: 'Search',
    hue: 'teal',
    fallback: 'database',
    aliases: {
      elasticsearch: 'Elasticsearch',
      opensearch: 'OpenSearch',
      'search-index': 'Search Index',
    },
  },
  {
    name: 'storage',
    label: 'Storage',
    hue: 'orange',
    aliases: {
      s3: 'S3',
      bucket: 'Bucket',
      blob: 'Blob Storage',
      'object-storage': 'Object Storage',
    },
  },
  {
    name: 'file',
    label: 'Files',
    hue: 'orange',
    fallback: 'storage',
    aliases: { files: 'File Storage', fs: 'File System' },
  },
  {
    name: 'warehouse',
    label: 'Data Warehouse',
    hue: 'amber',
    fallback: 'database',
    aliases: {
      dwh: 'Data Warehouse',
      snowflake: 'Snowflake',
      bigquery: 'BigQuery',
      redshift: 'Redshift',
    },
  },
  {
    name: 'data-lake',
    label: 'Data Lake',
    hue: 'orange',
    fallback: 'storage',
    aliases: { lake: 'Data Lake' },
  },
  {
    name: 'time-series',
    label: 'Time-Series DB',
    hue: 'amber',
    fallback: 'database',
    aliases: { tsdb: 'TSDB', influxdb: 'InfluxDB' },
  },
  {
    name: 'graph-db',
    label: 'Graph DB',
    hue: 'amber',
    fallback: 'database',
    aliases: { graph: 'Graph DB', neo4j: 'Neo4j' },
  },
  {
    name: 'vector-db',
    label: 'Vector DB',
    hue: 'violet',
    fallback: 'database',
    aliases: { vectors: 'Vector DB', embeddings: 'Embeddings', pinecone: 'Pinecone' },
  },
  // Messaging
  {
    name: 'queue',
    label: 'Queue',
    hue: 'pink',
    aliases: {
      mq: 'Message Queue',
      'message-queue': 'Message Queue',
      sqs: 'SQS',
      rabbitmq: 'RabbitMQ',
      broker: 'Broker',
    },
  },
  {
    name: 'pubsub',
    label: 'Pub/Sub',
    hue: 'pink',
    fallback: 'queue',
    aliases: { topic: 'Topic', sns: 'SNS', 'pub-sub': 'Pub/Sub' },
  },
  {
    name: 'stream',
    label: 'Event Stream',
    hue: 'pink',
    fallback: 'queue',
    aliases: { kafka: 'Kafka', kinesis: 'Kinesis', 'event-stream': 'Event Stream' },
  },
  {
    name: 'notification',
    label: 'Notifications',
    hue: 'pink',
    fallback: 'queue',
    aliases: { push: 'Push', notify: 'Notifications' },
  },
  {
    name: 'email',
    label: 'Email',
    hue: 'pink',
    fallback: 'queue',
    aliases: { mail: 'Mail', smtp: 'SMTP', ses: 'SES' },
  },
  {
    name: 'webhook',
    label: 'Webhook',
    hue: 'pink',
    fallback: 'queue',
    aliases: { callback: 'Callback' },
  },
  // Security & identity
  {
    name: 'auth',
    label: 'Auth',
    hue: 'red',
    fallback: 'server',
    aliases: {
      oauth: 'OAuth',
      idp: 'Identity Provider',
      identity: 'Identity',
      login: 'Login',
      sso: 'SSO',
    },
  },
  {
    name: 'token',
    label: 'Token',
    hue: 'red',
    fallback: 'server',
    aliases: { jwt: 'JWT', key: 'Key', 'api-key': 'API Key' },
  },
  {
    name: 'vault',
    label: 'Secrets Vault',
    hue: 'red',
    fallback: 'storage',
    aliases: { secrets: 'Secrets', kms: 'KMS' },
  },
  // Observability
  {
    name: 'metrics',
    label: 'Metrics',
    hue: 'teal',
    fallback: 'server',
    aliases: { monitoring: 'Monitoring', prometheus: 'Prometheus' },
  },
  { name: 'logs', label: 'Logs', hue: 'teal', fallback: 'server', aliases: { logging: 'Logging' } },
  {
    name: 'alert',
    label: 'Alerts',
    hue: 'teal',
    fallback: 'server',
    aliases: { alerts: 'Alerts', pager: 'Pager', pagerduty: 'PagerDuty' },
  },
  {
    name: 'tracing',
    label: 'Tracing',
    hue: 'teal',
    fallback: 'server',
    aliases: { traces: 'Traces', jaeger: 'Jaeger' },
  },
  {
    name: 'dashboard',
    label: 'Dashboard',
    hue: 'teal',
    fallback: 'server',
    aliases: { grafana: 'Grafana', admin: 'Admin Panel' },
  },
  // Feature services
  {
    name: 'payment',
    label: 'Payments',
    hue: 'orange',
    fallback: 'server',
    aliases: { stripe: 'Stripe', billing: 'Billing', checkout: 'Checkout' },
  },
  {
    name: 'chat',
    label: 'Chat',
    hue: 'sky',
    fallback: 'server',
    aliases: { messaging: 'Messaging' },
  },
  {
    name: 'video',
    label: 'Video',
    hue: 'violet',
    fallback: 'server',
    aliases: { transcoder: 'Transcoder', streaming: 'Streaming' },
  },
  {
    name: 'image',
    label: 'Images',
    hue: 'violet',
    fallback: 'storage',
    aliases: { images: 'Images', thumbnails: 'Thumbnails', media: 'Media' },
  },
  {
    name: 'location',
    label: 'Location',
    hue: 'sky',
    fallback: 'server',
    aliases: { geo: 'Geo Service', maps: 'Maps', gps: 'GPS' },
  },
  {
    name: 'recommendation',
    label: 'Recommendations',
    hue: 'violet',
    fallback: 'server',
    aliases: { recs: 'Recommendations', feed: 'Feed', ranking: 'Ranking' },
  },
  { name: 'analytics', label: 'Analytics', hue: 'teal', fallback: 'server', aliases: { bi: 'BI' } },
  {
    name: 'ml-model',
    label: 'ML Model',
    hue: 'violet',
    fallback: 'server',
    aliases: { ml: 'ML Model', model: 'Model', inference: 'Inference' },
  },
  {
    name: 'llm',
    label: 'LLM',
    hue: 'violet',
    fallback: 'server',
    aliases: { ai: 'AI', agent: 'AI Agent' },
  },
  {
    name: 'etl',
    label: 'ETL Pipeline',
    hue: 'orange',
    fallback: 'worker',
    aliases: { pipeline: 'Pipeline', batch: 'Batch Job', spark: 'Spark', airflow: 'Airflow' },
  },
  {
    name: 'stream-processor',
    label: 'Stream Processor',
    hue: 'pink',
    fallback: 'worker',
    aliases: { flink: 'Flink', 'stream-processing': 'Stream Processing' },
  },
  // Product building blocks
  {
    name: 'cart',
    label: 'Cart',
    hue: 'orange',
    fallback: 'payment',
    aliases: {
      'shopping-cart': 'Shopping Cart',
      basket: 'Basket',
      order: 'Orders',
      orders: 'Orders',
    },
  },
  {
    name: 'booking',
    label: 'Booking',
    hue: 'pink',
    fallback: 'server',
    aliases: { ticket: 'Tickets', tickets: 'Tickets', reservation: 'Reservations', seats: 'Seats' },
  },
  {
    name: 'ride',
    label: 'Rides',
    hue: 'sky',
    fallback: 'location',
    aliases: { car: 'Car', vehicle: 'Vehicles', driver: 'Drivers', trip: 'Trips' },
  },
  {
    name: 'inventory',
    label: 'Inventory',
    hue: 'amber',
    fallback: 'storage',
    aliases: { stock: 'Stock', products: 'Products', catalog: 'Catalog' },
  },
  {
    name: 'shipping',
    label: 'Shipping',
    hue: 'teal',
    fallback: 'server',
    aliases: {
      delivery: 'Delivery',
      logistics: 'Logistics',
      fulfillment: 'Fulfillment',
      shipment: 'Shipments',
    },
  },
  {
    name: 'link',
    label: 'Links',
    hue: 'blue',
    fallback: 'server',
    aliases: {
      url: 'URLs',
      'short-url': 'Short URLs',
      shortener: 'URL Shortener',
      'url-shortener': 'URL Shortener',
    },
  },
  {
    name: 'doc',
    label: 'Docs',
    hue: 'green',
    fallback: 'file',
    aliases: {
      docs: 'Docs',
      editor: 'Editor',
      collab: 'Collaboration',
      'google-docs': 'Google Docs',
    },
  },
  {
    name: 'calendar',
    label: 'Calendar',
    hue: 'red',
    fallback: 'scheduler',
    aliases: { events: 'Events', agenda: 'Agenda', 'calendar-service': 'Calendar Service' },
  },
  {
    name: 'upload',
    label: 'Upload',
    hue: 'blue',
    fallback: 'storage',
    aliases: { uploads: 'Uploads', ingest: 'Ingest', 'file-upload': 'File Upload' },
  },
  {
    name: 'sms',
    label: 'SMS',
    hue: 'green',
    fallback: 'notification',
    aliases: { otp: 'OTP', 'text-message': 'Text Message', texting: 'Texting' },
  },
  {
    name: 'leaderboard',
    label: 'Leaderboard',
    hue: 'violet',
    fallback: 'metrics',
    aliases: { scoreboard: 'Scoreboard', rankings: 'Rankings', highscores: 'High Scores' },
  },
  {
    name: 'id-generator',
    label: 'ID Generator',
    hue: 'slate',
    fallback: 'key-value',
    aliases: {
      uuid: 'UUID',
      'ticket-server': 'Ticket Server',
      'id-service': 'ID Service',
      sequence: 'Sequence',
    },
  },
  {
    name: 'counter',
    label: 'Counter',
    hue: 'amber',
    fallback: 'metrics',
    aliases: { counters: 'Counters', likes: 'Likes', views: 'Views', tally: 'Tally' },
  },
  {
    name: 'social-graph',
    label: 'Social Graph',
    hue: 'teal',
    fallback: 'graph-db',
    aliases: {
      followers: 'Followers',
      friends: 'Friends',
      'social-network': 'Social Network',
      connections: 'Connections',
    },
  },
  {
    name: 'websocket',
    label: 'WebSocket',
    hue: 'sky',
    fallback: 'chat',
    aliases: { ws: 'WebSocket', socket: 'Socket', realtime: 'Realtime', sse: 'SSE' },
  },
  {
    name: 'shard',
    label: 'Shard',
    hue: 'orange',
    fallback: 'database',
    aliases: { shards: 'Shards', partition: 'Partition', sharding: 'Sharding' },
  },
  {
    name: 'gpu',
    label: 'GPU',
    hue: 'violet',
    fallback: 'server',
    aliases: { accelerator: 'Accelerator', tpu: 'TPU', cuda: 'CUDA' },
  },
  {
    name: 'workflow',
    label: 'Workflow',
    hue: 'green',
    fallback: 'etl',
    aliases: {
      orchestrator: 'Orchestrator',
      saga: 'Saga',
      'step-functions': 'Step Functions',
      temporal: 'Temporal',
    },
  },
  {
    name: 'backup',
    label: 'Backup',
    hue: 'slate',
    fallback: 'storage',
    aliases: {
      snapshot: 'Snapshot',
      archive: 'Archive',
      restore: 'Restore',
      replication: 'Replication',
    },
  },
  {
    name: 'region',
    label: 'Region',
    hue: 'sky',
    fallback: 'cloud',
    aliases: {
      datacenter: 'Data Center',
      az: 'Availability Zone',
      'availability-zone': 'Availability Zone',
      zone: 'Zone',
    },
  },
  // Infrastructure & dev workflow
  {
    name: 'cloud',
    label: 'Cloud',
    hue: 'slate',
    aliases: { internet: 'Internet', external: 'External', 'third-party': 'Third Party' },
  },
  {
    name: 'config',
    label: 'Config',
    hue: 'slate',
    fallback: 'server',
    aliases: { settings: 'Settings', 'feature-flags': 'Feature Flags' },
  },
  {
    name: 'registry',
    label: 'Service Registry',
    hue: 'slate',
    fallback: 'server',
    aliases: {
      discovery: 'Service Discovery',
      consul: 'Consul',
      zookeeper: 'ZooKeeper',
      etcd: 'etcd',
    },
  },
  {
    name: 'ci-cd',
    label: 'CI/CD',
    hue: 'slate',
    fallback: 'server',
    aliases: { cicd: 'CI/CD', deploy: 'Deploy' },
  },
  {
    name: 'repo',
    label: 'Repository',
    hue: 'slate',
    fallback: 'storage',
    aliases: { git: 'Git', github: 'GitHub' },
  },
  {
    name: 'iot',
    label: 'IoT Device',
    hue: 'slate',
    fallback: 'mobile',
    aliases: { device: 'Device', sensor: 'Sensor' },
  },
];

const metaByName = new Map(META.map((m) => [m.name, m]));

function art(name: string, seen: Set<string> = new Set()): string | undefined {
  if (seen.has(name)) return undefined;
  seen.add(name);
  const own = GENERATED_ICONS[name] ?? PLACEHOLDERS[name];
  if (own) return own;
  const fb = metaByName.get(name)?.fallback;
  return fb ? art(fb, seen) : undefined;
}

export const ICONS: IconDef[] = META.map((m) => ({
  name: m.name,
  label: m.label,
  hue: m.hue,
  aliases: m.aliases ?? {},
  body: art(m.name) ?? '',
  borrowed: !(m.name in GENERATED_ICONS || m.name in PLACEHOLDERS),
}));

/** Names whose art came from icons-src/ (the owner's drawings). */
export const DRAWN_ICONS: string[] = Object.keys(GENERATED_ICONS).sort();

const byKey = new Map<string, { icon: IconDef; label: string }>();
for (const icon of ICONS) byKey.set(icon.name, { icon, label: icon.label });
for (const icon of ICONS) {
  for (const [alias, label] of Object.entries(icon.aliases)) {
    if (byKey.has(alias))
      throw new Error(`Icon alias "${alias}" clashes with another icon name or alias`);
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
