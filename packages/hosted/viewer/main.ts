/**
 * The in-chat diagram viewer (MCP Apps). Hosts that support MCP Apps (Claude, ChatGPT, VS Code...)
 * show this page in a sandboxed frame under the render_diagram call and pass it the tool result.
 * It shows the small preview from the result at once, swaps in the full SVG from the diagram
 * link, and offers zoom, pan, fullscreen and PNG/SVG downloads. Bundled into one HTML file by
 * scripts/build-viewer.mjs.
 */
import {
  App,
  applyDocumentTheme,
  type McpUiHostContext,
} from '@modelcontextprotocol/ext-apps/app-with-deps';

interface Diagram {
  title?: string;
  png: string;
  svg: string;
  width: number;
  height: number;
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const stage = $<HTMLDivElement>('stage');
const img = $<HTMLImageElement>('img');
const note = $<HTMLDivElement>('note');
const zoomLabel = $<HTMLButtonElement>('zoom');
const fullBtn = $<HTMLButtonElement>('full');
const pngBtn = $<HTMLButtonElement>('png');
const svgBtn = $<HTMLButtonElement>('svg');

/** Tallest the inline view gets; zoom or fullscreen for more. */
const INLINE_MAX_H = 560;
const STEP = 1.25;

const app = new App(
  { name: 'sysketch viewer', version: '1.0.0' },
  { availableDisplayModes: ['inline', 'fullscreen'] },
);

let diagram: Diagram | undefined;
let fit = 1; // scale that fits the whole diagram
let zoom = 1; // multiple of fit
let mode: string = 'inline';

const maxHeight = () => (mode === 'fullscreen' ? Math.max(200, stage.clientHeight) : INLINE_MAX_H);

function layout(keep?: { x: number; y: number }) {
  if (!diagram) return;
  const width = stage.clientWidth || document.body.clientWidth;
  fit = Math.min(1, (width - 2) / diagram.width, maxHeight() / diagram.height);
  if (mode !== 'fullscreen') stage.style.height = `${Math.ceil(diagram.height * fit)}px`;
  const before = { w: img.offsetWidth || 1, h: img.offsetHeight || 1 };
  img.style.width = `${diagram.width * fit * zoom}px`;
  img.style.height = `${diagram.height * fit * zoom}px`;
  // keep the point under the cursor (or the centre) where it was
  const at = keep ?? { x: stage.clientWidth / 2, y: stage.clientHeight / 2 };
  const fx = (stage.scrollLeft + at.x) / before.w;
  const fy = (stage.scrollTop + at.y) / before.h;
  stage.scrollLeft = fx * img.offsetWidth - at.x;
  stage.scrollTop = fy * img.offsetHeight - at.y;
  zoomLabel.textContent = zoom === 1 ? 'Fit' : `${Math.round(fit * zoom * 100)}%`;
}

function setZoom(z: number, at?: { x: number; y: number }) {
  const max = Math.max(2, 3 / fit); // up to 3x the diagram's own size
  zoom = Math.min(max, Math.max(1, z));
  layout(at);
}

$('in').onclick = () => setZoom(zoom * STEP);
$('out').onclick = () => setZoom(zoom / STEP);
zoomLabel.onclick = () => setZoom(1);
stage.ondblclick = (e) => setZoom(zoom === 1 ? 1 / fit : 1, { x: e.offsetX, y: e.offsetY });
stage.addEventListener(
  'wheel',
  (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    setZoom(zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), { x: e.clientX - r.left, y: e.clientY - r.top });
  },
  { passive: false },
);

// drag to pan
let drag: { x: number; y: number; left: number; top: number } | undefined;
stage.onpointerdown = (e) => {
  drag = { x: e.clientX, y: e.clientY, left: stage.scrollLeft, top: stage.scrollTop };
  stage.setPointerCapture(e.pointerId);
  stage.classList.add('dragging');
};
stage.onpointermove = (e) => {
  if (!drag) return;
  stage.scrollLeft = drag.left - (e.clientX - drag.x);
  stage.scrollTop = drag.top - (e.clientY - drag.y);
};
stage.onpointerup = stage.onpointercancel = () => {
  drag = undefined;
  stage.classList.remove('dragging');
};
window.addEventListener('resize', () => layout());

const slug = () =>
  (diagram?.title ?? 'diagram')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'diagram';

async function save(url: string, ext: 'png' | 'svg') {
  const mimeType = ext === 'png' ? 'image/png' : 'image/svg+xml';
  try {
    const r = await app.downloadFile({
      contents: [{ type: 'resource_link', uri: url, name: `${slug()}.${ext}`, mimeType }],
    });
    if (!r.isError) return;
  } catch {
    // host without downloads: open the link instead
  }
  await app.openLink({ url }).catch(() => undefined);
}
pngBtn.onclick = () => diagram && save(diagram.png, 'png');
svgBtn.onclick = () => diagram && save(diagram.svg, 'svg');

fullBtn.onclick = async () => {
  const r = await app
    .requestDisplayMode({ mode: mode === 'fullscreen' ? 'inline' : 'fullscreen' })
    .catch(() => undefined);
  if (r?.mode) setMode(r.mode);
};

function setMode(m: string) {
  mode = m;
  document.documentElement.classList.toggle('fullscreen', mode === 'fullscreen');
  fullBtn.textContent = mode === 'fullscreen' ? '⤡' : '⤢';
  fullBtn.title = mode === 'fullscreen' ? 'Exit fullscreen' : 'Fullscreen';
  layout();
}

function applyContext(ctx: McpUiHostContext | undefined) {
  if (!ctx) return;
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  fullBtn.hidden = !ctx.availableDisplayModes?.includes('fullscreen');
  if (ctx.displayMode && ctx.displayMode !== mode) setMode(ctx.displayMode);
}

/** Only links from the diagram server itself are loaded. */
const safe = (url: unknown): url is string =>
  typeof url === 'string' && /^https?:\/\/[^/]+\/d\/[\w-]+\.(png|svg)(\?theme=[a-z]+)?$/.test(url);

app.ontoolresult = (result) => {
  const d = result.structuredContent as Partial<Diagram> | undefined;
  if (result.isError || !d || !safe(d.png) || !safe(d.svg) || !d.width || !d.height) {
    const text = result.content?.find((c) => c.type === 'text');
    note.textContent = text && 'text' in text ? text.text : 'The diagram could not be drawn.';
    return;
  }
  diagram = d as Diagram;
  $('title').textContent = diagram.title ?? 'sysketch diagram';
  img.alt = diagram.title ?? 'System design diagram';
  pngBtn.disabled = svgBtn.disabled = false;
  // the preview from the tool result shows at once; the full SVG replaces it when loaded
  const preview = result.content?.find((c) => c.type === 'image');
  if (preview && 'data' in preview) img.src = `data:${preview.mimeType};base64,${preview.data}`;
  const full = new Image();
  full.onload = () => (img.src = full.src);
  full.src = diagram.svg;
  if (!preview) img.src = diagram.svg;
  note.hidden = true;
  img.hidden = false;
  zoom = 1;
  layout();
};

app.onhostcontextchanged = (ctx) => applyContext(ctx);

await app.connect();
applyContext(app.getHostContext());
