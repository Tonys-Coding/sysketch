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
/** Zoom range, as multiples of the fitted size: out to half of it, in to 3x the real size. */
const MIN_ZOOM = 0.5;
const maxZoom = () => Math.max(2, 3 / fit);
/** While panning, keep at least this much of the diagram inside the view. */
const KEEP = 80;

const app = new App(
  { name: 'sysketch viewer', version: '1.0.0' },
  { availableDisplayModes: ['inline', 'fullscreen'] },
);

let diagram: Diagram | undefined;
let fit = 1; // scale that fits the whole diagram
let zoom = 1; // multiple of fit
let x = 0; // diagram's top-left corner inside the view
let y = 0;
let mode: string = 'inline';

const maxHeight = () => (mode === 'fullscreen' ? Math.max(200, stage.clientHeight) : INLINE_MAX_H);
const size = () => ({ w: diagram!.width * fit * zoom, h: diagram!.height * fit * zoom });

/** Draw the diagram at the current zoom and position (kept partly in view). */
function place() {
  if (!diagram) return;
  const { w, h } = size();
  x = Math.min(stage.clientWidth - KEEP, Math.max(KEEP - w, x));
  y = Math.min(stage.clientHeight - KEEP, Math.max(KEEP - h, y));
  img.style.width = `${w}px`;
  img.style.height = `${h}px`;
  img.style.transform = `translate(${x}px, ${y}px)`;
  zoomLabel.textContent = zoom === 1 ? 'Fit' : `${Math.round(fit * zoom * 100)}%`;
  zoomLabel.title = zoom === 1 ? 'Fitted to the view' : 'Fit to view';
}

/** Size the view to the diagram (inline) and recompute the fitted scale. */
function measure() {
  if (!diagram) return;
  const width = stage.clientWidth || document.body.clientWidth;
  fit = Math.min(1, (width - 2) / diagram.width, maxHeight() / diagram.height);
  if (mode !== 'fullscreen') stage.style.height = `${Math.ceil(diagram.height * fit)}px`;
}

function fitView() {
  if (!diagram) return;
  zoom = 1;
  measure();
  const { w, h } = size();
  x = (stage.clientWidth - w) / 2;
  y = (stage.clientHeight - h) / 2;
  place();
}

/** Zoom around a point of the view (the centre by default), keeping it under the cursor. */
function zoomTo(z: number, at = { x: stage.clientWidth / 2, y: stage.clientHeight / 2 }) {
  const next = Math.min(maxZoom(), Math.max(MIN_ZOOM, z));
  const k = next / zoom;
  x = at.x - (at.x - x) * k;
  y = at.y - (at.y - y) * k;
  zoom = next;
  place();
}

const point = (e: MouseEvent) => {
  const r = stage.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
};

$('in').onclick = () => zoomTo(zoom * STEP);
$('out').onclick = () => zoomTo(zoom / STEP);
zoomLabel.onclick = () => fitView();
stage.ondblclick = (e) => (zoom === 1 ? zoomTo(1 / fit, point(e)) : fitView());
stage.addEventListener(
  'wheel',
  (e) => {
    // pinch on a trackpad, or Ctrl/Cmd + wheel; a plain wheel still scrolls the chat
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    zoomTo(zoom * Math.exp(-e.deltaY / 300), point(e));
  },
  { passive: false },
);

// drag to pan, at any zoom
let drag: { x: number; y: number; left: number; top: number } | undefined;
stage.onpointerdown = (e) => {
  drag = { x: e.clientX, y: e.clientY, left: x, top: y };
  stage.setPointerCapture(e.pointerId);
  stage.classList.add('dragging');
};
stage.onpointermove = (e) => {
  if (!drag) return;
  x = drag.left + e.clientX - drag.x;
  y = drag.top + e.clientY - drag.y;
  place();
};
stage.onpointerup = stage.onpointercancel = () => {
  drag = undefined;
  stage.classList.remove('dragging');
};
window.addEventListener('resize', () => (zoom === 1 ? fitView() : (measure(), place())));

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
  fitView();
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
  fitView();
};

app.onhostcontextchanged = (ctx) => applyContext(ctx);

await app.connect();
applyContext(app.getHostContext());
