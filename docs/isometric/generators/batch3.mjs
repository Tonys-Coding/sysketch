// Usage: node batch3.mjs <outDir> [offsets.json]   (offsets: {name: [x0, y0]} from center2.py)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { A, LINE, T, LF, RF, INK, PI, icon, svg } from './iso.mjs';

const OUT = process.argv[2];
const OFF = process.argv[3] && existsSync(process.argv[3]) ? JSON.parse(readFileSync(process.argv[3], 'utf8')) : {};
const only = process.argv[4]?.split(',');
const gens = {};

// link: two thick chain links standing upright on the left-face plane (u-z), hooked together. Each
// link is a stadium band extruded back along +v; the solid between the front and back outlines shows
// as the lit rim. Plane coords: s along u, t = 2 z-units, so a v step is a (1, 1) plane step.
function uprightChain({ L, R, r, gap, TH, rim = A }) {
  return (x0, y0) => {
    const { plane, arc } = icon(x0, y0);
    const D = 2 * L + 2 * r + gap;
    const at = (c, v) => plane([c, v, 0], [1, 0, 0], [0, 0, 2]);
    const st = (pl, q) =>
      `M${pl(-L, -q)}L${pl(L, -q)}${arc(pl, L, 0, q, -PI / 2, PI / 2)}L${pl(-L, q)}${arc(pl, -L, 0, q, PI / 2, 1.5 * PI)}Z`;
    const c45 = Math.SQRT1_2;
    const solid = (c) => {
      const f = at(c, 0), k = at(c, TH);
      return (
        `M${f(-L - R * c45, R * c45)}${arc(f, -L, 0, R, 0.75 * PI, 1.5 * PI)}L${f(L, -R)}${arc(f, L, 0, R, -PI / 2, -PI / 4)}` +
        `L${k(L + R * c45, -R * c45)}${arc(k, L, 0, R, -PI / 4, PI / 2)}L${k(-L, R)}${arc(k, -L, 0, R, PI / 2, 0.75 * PI)}Z` +
        st(k, r)
      );
    };
    const link = (c) => [
      `<path d="${solid(c)}" fill-rule="evenodd" fill="${RF}" ${rim}/>`,
      `<path d="${st(at(c, 0), R)}${st(at(c, 0), r)}" fill-rule="evenodd" fill="${LF}" ${A}/>`,
    ];
    const pl = at(0, 0);
    return svg([
      link(0),
      link(D),
      `<path d="M${pl(0, -R)}L${pl(L, -R)}${arc(pl, L, 0, R, -PI / 2, 0)}L${pl(L + r, 0)}${arc(pl, L, 0, r, 0, -PI / 2)}L${pl(0, -r)}Z" fill="${LF}"/>`,
      `<path d="M${pl(0, -R)}L${pl(L, -R)}${arc(pl, L, 0, R, -PI / 2, 0)}M${pl(0, -r)}L${pl(L, -r)}${arc(pl, L, 0, r, -PI / 2, 0)}" ${LINE}/>`,
    ]);
  };
}
gens.link = uprightChain({ L: 1.8, R: 3.4, r: 1.7, gap: 0.5, TH: 1.2 });


// calendar: an upright desk calendar (about 1:1.1) with a dark header band, two binder rings and a
// 3 x 2 grid of day cells, one of them marked.
gens.calendar = (x0, y0) => {
  const { face, box, line } = icon(x0, y0);
  const W = 11.4, H = 20, t = 1.4;
  // days are a 4 x 3 grid of ink dots (round-capped specks), which stay crisp in every theme
  const dots = [];
  for (const z of [10, 6.6, 3.2])
    for (const u of [1.8, 4.1, 6.4, 8.7]) dots.push(line([[u, 0, z], [u + 0.3, 0, z]]));
  return svg([
    face([[W, 0, 0], [W, t, 0], [W, t, H], [W, 0, H]], RF),
    face([[0, 0, H], [W, 0, H], [W, t, H], [0, t, H]], T),
    face([[0, 0, 0], [W, 0, 0], [W, 0, H], [0, 0, H]], LF),
    face([[0, 0, H - 5], [W, 0, H - 5], [W, 0, H], [0, 0, H]], RF),
    dots,
    box(2.2, 3.1, 0.4, 1, H, H + 3.4),
    box(8.3, 9.2, 0.4, 1, H, H + 3.4),
  ]);
};

// upload: a flat tray with an upward arrow standing on it (the arrow is an extruded polygon)
gens.upload = (x0, y0) => {
  const { box, extrude } = icon(x0, y0);
  const z = 1.8;
  const arrow = [[4.5, 0], [6.5, 0], [6.5, 8], [8.7, 8], [5.5, 16.5], [2.3, 8], [4.5, 8]].map(([u, h]) => [u, h + z]);
  return svg([box(0, 11, 0, 7, 0, z), extrude(arrow, 2.6, 4.4)]);
};

// sms: a small upright phone with a speech bubble (three dots) standing in front of it
gens.sms = (x0, y0) => {
  const { box, extrude, line } = icon(x0, y0);
  const v0 = -2.4;
  const bubble = [[5.2, 6], [7.4, 8], [12.2, 8], [12.2, 16.6], [5.2, 16.6]];
  return svg([
    box(0, 6.4, 0, 1.6, 0, 18.5),
    line([[1.7, 0, 2], [4.7, 0, 2]]),
    extrude(bubble, v0, -0.8, T),
    line([[6.4, v0, 13.6], [10.8, v0, 13.6]]),
    line([[6.4, v0, 10.6], [9.4, v0, 10.6]]),
  ]);
};

// leaderboard: a three-step podium (second, first, third) with a star on the winner's step
gens.leaderboard = (x0, y0) => {
  const { box, extrude } = icon(x0, y0);
  const zc = 12.6 + 6.6 + 0.8;
  const star = Array.from({ length: 10 }, (_, i) => {
    const a = PI / 2 + (i * PI) / 5, rad = i % 2 ? 2.9 : 6.6;
    return [6 + (rad * Math.cos(a)) / 2, zc + rad * Math.sin(a)];
  });
  return svg([
    box(0, 4, 0, 6, 0, 8),
    box(4, 8, 0, 6, 0, 12.6),
    box(8, 12, 0, 6, 0, 5),
    extrude(star, 2.7, 3.5),
  ]);
};

// id-generator: a ticket dispenser: a tall box with a hash sign on its face and a ticket lying in front
gens['id-generator'] = (x0, y0) => {
  const { box, line } = icon(x0, y0);
  return svg([
    box(0, 7.4, 0, 6, 0, 14),
    line([[2.6, 0, 4.2], [2.6, 0, 11.4]]),
    line([[4.8, 0, 4.2], [4.8, 0, 11.4]]),
    line([[1.3, 0, 6.5], [6.1, 0, 6.5]]),
    line([[1.3, 0, 9.2], [6.1, 0, 9.2]]),
    box(1.4, 6, -5, -0.4, 0, 0.8),
    line([[2.6, -3.7, 0.8], [4.8, -3.7, 0.8]]),
  ]);
};

// counter: an upright display slab showing "+1" (strokes only, so it stays crisp at small sizes)
gens.counter = (x0, y0) => {
  const { box, line } = icon(x0, y0);
  return svg([
    box(0, 9.6, 0, 2, 0, 14),
    line([[1.4, 0, 7.2], [4, 0, 7.2]]),
    line([[2.7, 0, 5.6], [2.7, 0, 8.8]]),
    line([[6.2, 0, 4], [6.2, 0, 10.6]]),
    line([[6.2, 0, 10.6], [5, 0, 9.6]]),
  ]);
};

// social-graph: three small people (body block plus a round head) joined by lines between their heads
gens['social-graph'] = (x0, y0) => {
  const { box, xy } = icon(x0, y0);
  // well apart, so the lines between the bodies show
  const people = [[0, 7.6], [7.6, 7.6], [0, 0]];
  const at = ([u, v], z) => xy(u + 1.1, v + 0.8, z);
  const [a, b, c] = people.map((p) => at(p, 3));
  const parts = [`<path d="M${a.join(' ')}L${b.join(' ')}M${a.join(' ')}L${c.join(' ')}M${b.join(' ')}L${c.join(' ')}" ${LINE.replace('stroke-width="2"', 'stroke-width="1.75"')}/>`];
  for (const [u, v] of people) parts.push(box(u, u + 2.2, v, v + 1.6, 0, 5.4));
  for (const h of people.map((p) => at(p, 8.8))) parts.push(`<circle cx="${h[0]}" cy="${h[1]}" r="2.5" fill="${T}" ${A}/>`);
  return svg(parts);
};

// websocket: a browser window floating above a server slab, joined by a standing two-way arrow
gens.websocket = (x0, y0) => {
  const { face, box, line } = icon(x0, y0);
  const W = 9.6, t = 1.4, v0 = 2.4, z0 = 15.5, H = 8.4;
  const dot = (u, z) => line([[u, v0, z], [u + 0.2, v0, z]], T);
  return svg([
    box(0, 10.4, 0, 6, 0, 3.4),
    line([[1.2, 0, 1.7], [3.6, 0, 1.7]]),
    [6.4, 7.8, 9.2].map((u) => line([[u, 0, 1.7], [u + 0.2, 0, 1.7]])),
    // the window: sides, top, front, a dark title bar with three light dots
    face([[W, v0, z0], [W, v0 + t, z0], [W, v0 + t, z0 + H], [W, v0, z0 + H]], RF),
    face([[0, v0, z0 + H], [W, v0, z0 + H], [W, v0 + t, z0 + H], [0, v0 + t, z0 + H]], T),
    face([[0, v0, z0], [W, v0, z0], [W, v0, z0 + H], [0, v0, z0 + H]], LF),
    face([[0, v0, z0 + H - 2.8], [W, v0, z0 + H - 2.8], [W, v0, z0 + H], [0, v0, z0 + H]], RF),
    [1.3, 2.7, 4.1].map((u) => dot(u, z0 + H - 1.4)),
    // the arrow: shaft and a chevron at each end
    line([[5.2, 1.4, 4.4], [5.2, 1.4, 15.8]]),
    line([[3.4, 1.4, 13.6], [5.2, 1.4, 15.8], [7, 1.4, 13.6]]),
    line([[3.4, 1.4, 6.6], [5.2, 1.4, 4.4], [7, 1.4, 6.6]]),
  ]);
};

// shard: one database fanning out to three smaller partitions on a tree line
gens.shard = (x0, y0) => {
  const k = 0.5523;
  const cyl = (cx, top, rx, ry, h, bands) => {
    const bt = top + h;
    const out = [
      `<path d="M${cx - rx} ${top}V${bt}C${cx - rx} ${bt + k * ry} ${cx - k * rx} ${bt + ry} ${cx} ${bt + ry}V${top + ry}C${cx - k * rx} ${top + ry} ${cx - rx} ${top + k * ry} ${cx - rx} ${top}Z" fill="${LF}" ${A}/>`,
      `<path d="M${cx} ${top + ry}V${bt + ry}C${cx + k * rx} ${bt + ry} ${cx + rx} ${bt + k * ry} ${cx + rx} ${bt}V${top}C${cx + rx} ${top + k * ry} ${cx + k * rx} ${top + ry} ${cx} ${top + ry}Z" fill="${RF}" ${A}/>`,
    ];
    for (let i = 1; i <= bands; i++) {
      const m = top + (h * i) / (bands + 1);
      out.push(`<path d="M${cx - rx} ${m}C${cx - rx} ${m + k * ry} ${cx - k * rx} ${m + ry} ${cx} ${m + ry}C${cx + k * rx} ${m + ry} ${cx + rx} ${m + k * ry} ${cx + rx} ${m}" ${LINE}/>`);
    }
    out.push(`<ellipse cx="${cx}" cy="${top}" rx="${rx}" ry="${ry}" fill="${T}" ${A}/>`);
    return out;
  };
  const X = (n) => x0 + n, Y = (n) => y0 + n;
  const small = [10, 24, 38];
  return svg([
    // tree line first, so the cylinders sit over its ends
    `<path d="M${X(24)} ${Y(20)}V${Y(27)}M${X(10)} ${Y(37)}V${Y(27)}H${X(38)}V${Y(37)}M${X(24)} ${Y(27)}V${Y(37)}" ${LINE}/>`,
    small.map((cx) => cyl(X(cx), Y(37), 6, 3, 3.5, 0)),
    cyl(X(24), Y(6), 8.5, 4, 11, 1),
  ]);
};

// gpu: a graphics card kept simple (one slab, two round fans, a hint of contacts, the end bracket) so sketch stays light
gens.gpu = (x0, y0) => {
  const { box, xy, line } = icon(x0, y0);
  const top = 3.8;
  const fan = (u) => {
    const [x, y] = xy(u, 3.3, top);
    return [
      `<ellipse cx="${x}" cy="${y}" rx="5.6" ry="2.8" fill="${LF}" ${A}/>`,
      `<path d="M${x} ${y}L${x + 0.2} ${y}" ${LINE}/>`,
    ];
  };
  return svg([box(0, 14, 0, 6.6, 0, top), line([[2, 0, 1.9], [5, 0, 1.9]]), fan(3.8), fan(10.2), box(14, 15, 0, 6.6, 0, 7)]);
};

// workflow: three flat step tiles in a row, joined by stroked arrows
gens.workflow = (x0, y0) => {
  const { box, xy } = icon(x0, y0);
  const r = (n) => Math.round(n * 10) / 10;
  const z = 2.6, size = 2.6, gap = 7.4;
  const arrow = (u0, u1) => {
    const [ax, ay] = xy(u0, size / 2, z), [bx, by] = xy(u1, size / 2, z);
    const len = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / len, uy = (by - ay) / len;
    const head = (ang) => {
      const c = Math.cos(ang), n = Math.sin(ang);
      return `${r(bx - 3.4 * (ux * c - uy * n))} ${r(by - 3.4 * (uy * c + ux * n))}`;
    };
    return `<path d="M${r(ax)} ${r(ay)}L${r(bx)} ${r(by)}M${head(0.6)}L${r(bx)} ${r(by)}L${head(-0.6)}" ${LINE}/>`;
  };
  const parts = [];
  for (let i = 0; i < 3; i++) parts.push(box(i * gap, i * gap + size, 0, size, 0, z));
  for (let i = 0; i < 2; i++) parts.push(arrow(i * gap + size + 0.5, (i + 1) * gap - 0.5));
  return svg(parts);
};

// backup: a database with an open circular arrow around it (a gap at the back-left, arrowhead pointing up)
gens.backup = (x0, y0) => {
  const { arc } = icon(x0, y0);
  const k = 0.5523, cx = x0 + 24, top = y0 + 6, rx = 9, ry = 4.5, h = 16, bt = top + h;
  const R = 15, RY = 6.6, ym = top + h * 0.62;
  const pl = (s2, t) => `${Math.round((cx + s2) * 10) / 10} ${Math.round((ym + (t * RY) / R) * 10) / 10}`;
  const back = `<path d="M${pl(R, 0)}${arc(pl, 0, 0, R, 0, -0.78 * PI)}" ${LINE}/>`;
  const front = `<path d="M${pl(R, 0)}${arc(pl, 0, 0, R, 0, PI)}M${pl(-R - 3.4, 3.6)}L${pl(-R, 0)}L${pl(-R + 3.4, 3.6)}" ${LINE}/>`;
  return svg([
    back,
    `<path d="M${cx - rx} ${top}V${bt}C${cx - rx} ${bt + k * ry} ${cx - k * rx} ${bt + ry} ${cx} ${bt + ry}V${top + ry}C${cx - k * rx} ${top + ry} ${cx - rx} ${top + k * ry} ${cx - rx} ${top}Z" fill="${LF}" ${A}/>`,
    `<path d="M${cx} ${top + ry}V${bt + ry}C${cx + k * rx} ${bt + ry} ${cx + rx} ${bt + k * ry} ${cx + rx} ${bt}V${top}C${cx + rx} ${top + k * ry} ${cx + k * rx} ${top + ry} ${cx} ${top + ry}Z" fill="${RF}" ${A}/>`,
    `<ellipse cx="${cx}" cy="${top}" rx="${rx}" ry="${ry}" fill="${T}" ${A}/>`,
    front,
  ]);
};

// region: a map slab with two landmasses on its top face and a pin standing on it
gens.region = (x0, y0) => {
  const { box, xy } = icon(x0, y0);
  const z = 2.2;
  const land = (pts) =>
    `<path d="M${pts.map(([u, v]) => xy(u, v, z).map((n) => Math.round(n * 10) / 10).join(' ')).join('L')}Z" fill="${LF}" ${A}/>`;
  const [tx, ty] = xy(6.4, 3.8, z).map((n) => Math.round(n * 10) / 10);
  const pin =
    `M${tx} ${ty}C${tx - 2} ${ty - 4} ${tx - 5.5} ${ty - 7} ${tx - 5.5} ${ty - 11}C${tx - 5.5} ${ty - 14.2} ${tx - 3} ${ty - 16.5} ${tx} ${ty - 16.5}` +
    `C${tx + 3} ${ty - 16.5} ${tx + 5.5} ${ty - 14.2} ${tx + 5.5} ${ty - 11}C${tx + 5.5} ${ty - 7} ${tx + 2} ${ty - 4} ${tx} ${ty}Z`;
  return svg([
    box(0, 13, 0, 9, 0, z),
    land([[1.4, 1.6], [4.8, 1.2], [5.8, 3.4], [4.2, 5.4], [2, 4.8]]),
    land([[8, 3.2], [11.2, 2], [12, 4.8], [10.4, 7.2], [8.2, 6.2]]),
    `<path d="${pin}" fill="${T}" ${A}/>`,
    `<circle cx="${tx}" cy="${Math.round((ty - 11) * 10) / 10}" r="1.5" fill="${INK}" ${A}/>`,
  ]);
};

const names = only ?? Object.keys(gens);
for (const n of names) {
  const [x0, y0] = OFF[n] ?? [0, 0];
  writeFileSync(`${OUT}/${n}.svg`, gens[n](x0, y0));
}
console.log(names.join(' '));
