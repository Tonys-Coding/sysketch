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
const exImg = $('#ex-img');
const exSpec = $('#ex-spec');
const exNote = $('#ex-note');
const exPanel = $('#ex-panel');
function showExample(tab) {
  const p = presets[tab.dataset.example];
  if (!p) return;
  exImg.src = p.svg;
  exImg.alt = p.alt;
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
