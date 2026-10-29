// Shared isometric geometry for the sysketch icon generators.
// u runs along left faces (screen +2,+1), v along right faces (screen +2,-1), z up. Viewer sits at (+u, -v, +z).
export const A = 'stroke="#0000FF" stroke-width="2" stroke-linejoin="round"';
export const LINE = 'stroke="#0000FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
export const T = '#FF0000', LF = '#00FF00', RF = '#FFFF00', INK = '#0000FF';
export const PI = Math.PI;
const r1 = (n) => Math.round(n * 10) / 10;

export function icon(X0 = 0, Y0 = 0) {
  const xy = (u, v, z) => [X0 + 2 * u + 2 * v, Y0 + u - v - z];
  const P = (u, v, z) => xy(u, v, z).map(r1).join(' ');
  const face = (pts, fill) => `<path d="M${pts.map((p) => P(...p)).join('L')}Z" fill="${fill}" ${A}/>`;
  const line = (pts, color = INK) =>
    `<path d="M${pts.map((p) => P(...p)).join('L')}" ${LINE.replace(INK, color)}/>`;
  const box = (u0, u1, v0, v1, z0, z1) => [
    face([[u0, v0, z0], [u1, v0, z0], [u1, v0, z1], [u0, v0, z1]], LF),
    face([[u1, v0, z0], [u1, v1, z0], [u1, v1, z1], [u1, v0, z1]], RF),
    face([[u0, v0, z1], [u1, v0, z1], [u1, v1, z1], [u0, v1, z1]], T),
  ];
  const dot = (u, v, z, r = 2.2) => {
    const [x, y] = xy(u, v, z).map(r1);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${INK}" ${A}/>`;
  };
  // extrude a polygon given in (u, z) between v0 (front) and v1 (back): side faces first, front face last
  const extrude = (poly, v0, v1, front = LF) => {
    const area = poly.reduce((s, p, i) => {
      const q = poly[(i + 1) % poly.length];
      return s + (p[0] * q[1] - q[0] * p[1]);
    }, 0);
    const sg = area > 0 ? 1 : -1;
    const out = [];
    poly.forEach((p, i) => {
      const q = poly[(i + 1) % poly.length];
      const nu = sg * (q[1] - p[1]), nz = -sg * (q[0] - p[0]);
      const col = nz > 0.01 ? T : nu > 0.01 ? RF : null;
      if (col) out.push(face([[p[0], v0, p[1]], [q[0], v0, q[1]], [q[0], v1, q[1]], [p[0], v1, p[1]]], col));
    });
    out.push(face(poly.map(([u, z]) => [u, v0, z]), front));
    return out;
  };
  const plane = (o, a, b) => (s, t) =>
    P(o[0] + s * a[0] + t * b[0], o[1] + s * a[1] + t * b[1], o[2] + s * a[2] + t * b[2]);
  // circular arc in plane coordinates as cubic segments (at most 90 degrees each), without the move-to
  const arc = (pl, cs, ct, r, a0, a1) => {
    const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / (PI / 2) - 1e-9));
    const step = (a1 - a0) / n, k = (4 / 3) * Math.tan(step / 4) * r;
    let d = '';
    for (let i = 0; i < n; i++) {
      const b0 = a0 + i * step, b1 = b0 + step;
      const c1 = [cs + r * Math.cos(b0) - k * Math.sin(b0), ct + r * Math.sin(b0) + k * Math.cos(b0)];
      const c2 = [cs + r * Math.cos(b1) + k * Math.sin(b1), ct + r * Math.sin(b1) - k * Math.cos(b1)];
      d += `C${pl(...c1)} ${pl(...c2)} ${pl(cs + r * Math.cos(b1), ct + r * Math.sin(b1))}`;
    }
    return d;
  };
  return { xy, P, face, line, box, dot, extrude, plane, arc };
}

export const svg = (parts) =>
  `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">\n${parts.flat().join('\n')}\n</svg>\n`;
