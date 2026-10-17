// sysketch site: tabs, copy buttons, the menu, and the live editor. The editor draws through
// the hosted server's diagram links (https://sysketch.vercel.app/d/<code>.svg), where <code>
// is the description itself, compressed. Nothing is stored anywhere.

const API = 'https://sysketch.vercel.app';
const MAX_CODE = 8000;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ---------- menu ---------- */
const toggle = $('.menu-toggle');
const nav = $('#site-nav');
toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('open', open);
});
nav.addEventListener('click', (e) => {
  if (e.target.closest('a')) {
    toggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('open');
  }
});

/* ---------- tabs (ARIA tabs pattern, arrow keys move between tabs) ---------- */
function tabs(list, onSelect) {
  const items = $$('[role="tab"]', list);
  const select = (tab, focus) => {
    for (const t of items) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel && items.filter((x) => x.getAttribute('aria-controls') === panel.id).length === 1) {
        panel.hidden = !on;
      }
    }
    if (focus) tab.focus();
    onSelect?.(tab);
  };
  list.addEventListener('click', (e) => {
    const tab = e.target.closest('[role="tab"]');
    if (tab) select(tab);
  });
  list.addEventListener('keydown', (e) => {
    const i = items.indexOf(document.activeElement);
    if (i < 0) return;
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: items.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select(items[(next + items.length) % items.length], true);
  });
}

/* ---------- copy ---------- */
for (const btn of $$('[data-copy]')) {
  const label = btn.textContent;
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      btn.textContent = 'Copied';
      btn.dataset.done = '';
    } catch {
      btn.textContent = 'Select and copy';
    }
    setTimeout(() => {
      btn.textContent = label;
      delete btn.dataset.done;
    }, 1800);
  });
}

tabs($('#get .tabs'));

/* ---------- moving diagrams: a packet travels each arrow, in the order requests flow ---------- */
// The site's own diagrams are drawn with their nodes and edges tagged (render option
// `annotate`), so each arrow's route is known. Packets leave the nodes nothing points at, and
// every other node passes one on when one arrives; sequence diagrams play their messages in
// order. Motion starts off for people who ask their system to reduce it, and a button pauses it.
const NS = 'http://www.w3.org/2000/svg';
const SPEED = 300; // diagram units per second
const COLORS = ['#f783ac', '#ffc93c', '#4cc3fc'];
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const motionBtn = $('.motion');
const live = new Set();
const onScreen = new WeakSet();
let chosen = null;
try {
  chosen = localStorage.getItem('sysketch-motion');
} catch {
  // storage blocked: the choice lasts for this visit
}
let motion = chosen ? chosen === 'on' : !reduce.matches;

const play = (svg) =>
  motion && onScreen.has(svg) ? svg.unpauseAnimations() : svg.pauseAnimations();
function setMotion(on) {
  motion = on;
  document.documentElement.dataset.motion = on ? 'on' : 'off';
  motionBtn.textContent = on ? 'Pause animation' : 'Play animation';
  for (const svg of live) play(svg);
}
setMotion(motion);
motionBtn.addEventListener('click', () => {
  setMotion(!motion);
  try {
    localStorage.setItem('sysketch-motion', motion ? 'on' : 'off');
  } catch {
    // not remembered
  }
});
reduce.addEventListener('change', () => chosen || setMotion(!reduce.matches));

// animations only run while their diagram is on screen
const watch = new IntersectionObserver((entries) => {
  for (const { target, isIntersecting } of entries) {
    if (isIntersecting) onScreen.add(target);
    else onScreen.delete(target);
    play(target);
  }
});
const near = (el) =>
  new Promise((ok) => {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((x) => x.isIntersecting)) {
          io.disconnect();
          ok();
        }
      },
      { rootMargin: '400px' },
    );
    io.observe(el);
  });

const el = (name, attrs) => {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
};

function addPackets(svg, prefix) {
  const edges = $$('.sk-edge', svg)
    .map((g, i) => {
      const route = $('.sk-route', g);
      return { g, i, route, from: g.dataset.from, to: g.dataset.to, len: route?.getTotalLength() };
    })
    .filter((e) => e.len > 1);
  if (!edges.length) return false;
  const dur = (e) => Math.max(0.6, e.len / SPEED);
  const start = new Map();
  if (svg.dataset.type === 'sequence') {
    let t = 0;
    for (const e of edges) {
      start.set(e, t);
      t += dur(e) + 0.25;
    }
  } else {
    const arrive = new Map();
    const fed = new Set(edges.map((e) => e.to));
    for (const e of edges) if (!fed.has(e.from)) arrive.set(e.from, 0);
    if (!arrive.size) arrive.set(edges[0].from, 0);
    for (let changed = true; changed;) {
      changed = false;
      for (const e of edges) {
        const t = arrive.get(e.from) + dur(e);
        if (Number.isNaN(t) || arrive.get(e.to) <= t) continue;
        arrive.set(e.to, t);
        changed = true;
      }
    }
    for (const e of edges) start.set(e, arrive.get(e.from) ?? 0);
  }

  const lead = 0.3;
  const cycle = Math.max(...edges.map((e) => start.get(e) + dur(e))) + lead + 1.5;
  const fade = 0.08 / cycle;
  const keys = (...xs) => xs.map((x) => +x.toFixed(4)).join(';');
  const loop = { dur: `${cycle}s`, repeatCount: 'indefinite' };
  const r = Math.max(6, svg.viewBox.baseVal.width / 210);
  for (const e of edges) {
    const color = COLORS[e.i % COLORS.length];
    const t0 = (lead + start.get(e)) / cycle;
    const t1 = (lead + start.get(e) + dur(e)) / cycle;
    const id = `${prefix}route-${e.i}`;
    e.route.id = id;

    // the wire lights up behind the packet, then fades
    const trail = el('path', {
      class: 'sk-pkt',
      d: e.route.getAttribute('d'),
      fill: 'none',
      stroke: color,
      'stroke-width': r * 1.5,
      'stroke-linecap': 'round',
      'stroke-dasharray': `${e.len} ${e.len}`,
      'stroke-dashoffset': e.len,
      opacity: 0,
    });
    trail.append(
      el('animate', {
        attributeName: 'stroke-dashoffset',
        values: keys(e.len, e.len, 0, 0),
        keyTimes: keys(0, t0, t1, 1),
        ...loop,
      }),
      el('animate', {
        attributeName: 'opacity',
        values: '0;0;0.45;0.45;0;0',
        keyTimes: keys(0, t0, t0 + fade, t1, t1 + 0.6 / cycle, 1),
        ...loop,
      }),
    );
    e.g.prepend(trail);

    const dot = el('circle', {
      class: 'sk-pkt',
      r,
      fill: color,
      stroke: '#1f2328',
      'stroke-width': r / 3,
      opacity: 0,
    });
    const path = el('mpath', { href: `#${id}` });
    path.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#${id}`);
    const move = el('animateMotion', {
      keyPoints: '0;0;1;1',
      keyTimes: keys(0, t0, t1, 1),
      calcMode: 'linear',
      ...loop,
    });
    move.append(path);
    dot.append(
      move,
      el('animate', {
        attributeName: 'opacity',
        values: '0;0;1;1;0;0',
        keyTimes: keys(0, t0, t0 + fade, t1, t1 + fade, 1),
        ...loop,
      }),
    );
    e.g.append(dot);
  }
  return true;
}

// Swap a diagram's <img> for the same SVG inline, with packets. Our own build output only.
let artCount = 0;
const artText = new Map();
async function liveArt(box, url) {
  box.dataset.art = url;
  await near(box);
  try {
    if (!artText.has(url)) {
      const res = await fetch(url);
      if (!res.ok) return;
      artText.set(url, await res.text());
    }
  } catch {
    return; // the image stays
  }
  if (box.dataset.art !== url) return; // another diagram was picked meanwhile
  // ids are prefixed so two inline diagrams can't borrow each other's glyphs or clips
  const prefix = `a${++artCount}-`;
  const text = artText.get(url).replace(/\bid="|href="#|url\(#/g, `$&${prefix}`);
  const svg = new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;
  if (svg.nodeName !== 'svg' || !svg.querySelector('.sk-edge')) return;
  const img = $('img', box);
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  if (img?.alt) svg.setAttribute('aria-label', img.alt);
  const node = document.importNode(svg, true);
  box.replaceChildren(node);
  if (!addPackets(node, prefix)) return;
  for (const old of live) if (!old.isConnected) live.delete(old);
  live.add(node);
  watch.observe(node);
  play(node);
  motionBtn.hidden = false;
}
liveArt($('.hero .live-art'), 'hero.svg');

/* ---------- data: example descriptions and their pre-drawn diagrams ---------- */
const presets = await fetch('presets.json').then((r) => r.json());
const titleOf = (spec) => /^title:\s*(.+)$/m.exec(spec)?.[1]?.replace(/^["']|["']$/g, '') ?? '';

/* ---------- live editor ---------- */
const spec = $('#spec');
const img = $('#diagram');
const themeSel = $('#theme');
const status = $('#status');
const error = $('#error');
const openPng = $('#open-png');
const supported = 'CompressionStream' in window;

async function encode(text) {
  const stream = new Blob([new TextEncoder().encode(text)])
    .stream()
    .pipeThrough(new CompressionStream('deflate-raw'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const linkFor = (code, ext) =>
  `${API}/d/${code}.${ext}${themeSel.value ? `?theme=${themeSel.value}` : ''}`;

let current = '';
let seq = 0;
function show(src, text) {
  return new Promise((done) => {
    const next = new Image();
    next.onload = () => {
      img.src = src;
      img.alt = `Diagram: ${titleOf(text) || 'your system'}`;
      if (current.startsWith('blob:')) URL.revokeObjectURL(current);
      current = src;
      done();
    };
    next.onerror = done;
    next.src = src;
  });
}

async function draw() {
  const id = ++seq;
  const text = spec.value;
  if (!text.trim()) return;
  if (!supported) {
    status.textContent = 'This browser can’t draw live; the examples still work.';
    return;
  }
  img.classList.add('drawing');
  status.textContent = 'Drawing…';
  try {
    const code = await encode(text);
    if (code.length > MAX_CODE) throw new Error('This description is too long for the live demo.');
    const res = await fetch(linkFor(code, 'svg'));
    if (id !== seq) return;
    if (!res.ok) {
      error.textContent = (await res.text()) || 'The diagram could not be drawn.';
      error.hidden = false;
      status.textContent = 'Fix the description to update the drawing';
      return;
    }
    const blob = await res.blob();
    await show(URL.createObjectURL(blob), text);
    if (id !== seq) return;
    openPng.href = linkFor(code, 'png');
    error.hidden = true;
    status.textContent = '';
  } catch (e) {
    if (id !== seq) return;
    error.textContent =
      e instanceof TypeError
        ? 'Couldn’t reach the drawing server. Check your connection.'
        : e.message;
    error.hidden = false;
    status.textContent = '';
  } finally {
    if (id === seq) img.classList.remove('drawing');
  }
}

let timer;
const later = () => {
  clearTimeout(timer);
  timer = setTimeout(draw, 550);
};
spec.addEventListener('input', () => {
  for (const b of $$('[data-preset]')) b.setAttribute('aria-pressed', 'false');
  later();
});
themeSel.addEventListener('change', draw);
spec.addEventListener('keydown', (e) => {
  // Tab indents inside the description; Escape then Tab leaves the field.
  if (e.key === 'Tab' && !e.shiftKey && !spec.dataset.escaped) {
    e.preventDefault();
    spec.setRangeText('  ', spec.selectionStart, spec.selectionEnd, 'end');
    later();
  }
  if (e.key === 'Escape') spec.dataset.escaped = '1';
});
spec.addEventListener('blur', () => delete spec.dataset.escaped);

async function loadPreset(name) {
  const p = presets[name];
  if (!p) return;
  for (const b of $$('[data-preset]'))
    b.setAttribute('aria-pressed', String(b.dataset.preset === name));
  spec.value = p.spec;
  error.hidden = true;
  seq++;
  if (!themeSel.value) {
    // the pre-drawn sketch version shows at once; no server round trip
    await show(p.svg, p.spec);
    status.textContent = '';
    if (supported) openPng.href = linkFor(await encode(p.spec), 'png');
  } else {
    draw();
  }
}
for (const b of $$('[data-preset]'))
  b.addEventListener('click', () => loadPreset(b.dataset.preset));
loadPreset('rate-limited-api');

/* ---------- examples ---------- */
const exArt = $('#ex-art');
const exSpec = $('#ex-spec');
const exNote = $('#ex-note');
const exPanel = $('#ex-panel');
// side by side on wide screens, so the description is shown there from the start
if (matchMedia('(min-width: 1101px)').matches) $('#ex-details').open = true;
function showExample(tab) {
  const p = presets[tab.dataset.example];
  if (!p) return;
  exArt.replaceChildren(Object.assign(document.createElement('img'), { src: p.svg, alt: p.alt }));
  liveArt(exArt, p.svg);
  exSpec.textContent = p.spec;
  exNote.textContent = p.note;
  exPanel.setAttribute('aria-labelledby', tab.id);
}
tabs($('.examples .tabs'), showExample);
showExample($('.examples [role="tab"][aria-selected="true"]'));

/* ---------- themes ---------- */
const themeImg = $('#theme-img');
const radios = $$('.swatches [role="radio"]');
function pickTheme(btn, focus) {
  for (const r of radios) {
    const on = r === btn;
    r.setAttribute('aria-checked', String(on));
    r.tabIndex = on ? 0 : -1;
  }
  if (focus) btn.focus();
  themeImg.src = `themes/${btn.dataset.theme}.svg`;
  themeImg.alt = `A URL shortener diagram in the ${btn.dataset.theme} theme`;
}
$('.swatches').addEventListener('click', (e) => {
  const btn = e.target.closest('[role="radio"]');
  if (btn) pickTheme(btn);
});
$('.swatches').addEventListener('keydown', (e) => {
  const i = radios.indexOf(document.activeElement);
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
  if (i < 0 || !step) return;
  e.preventDefault();
  pickTheme(radios[(i + step + radios.length) % radios.length], true);
});
