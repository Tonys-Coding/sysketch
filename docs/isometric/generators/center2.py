# usage: center2.py <probeDir> <offsets.json> name...
# Measures each icon (generated with origin 0,0) and writes the offsets that center it on x = 24 and
# sit it on a shared baseline: bottom at y = 44, or lifted so small icons center near y = 28.
import json, re, sys

def extent(path):
    s = open(path).read(); xs = []; ys = []
    for d in re.findall(r' d="([^"]*)"', s):
        toks = re.findall(r'[MLCZVH]|-?\d+\.?\d*', d); i = 0; cur = None; cmd = None
        while i < len(toks):
            t = toks[i]
            if t in 'MLCZVH': cmd = t; i += 1; continue
            if cmd == 'V': ys.append(float(toks[i])); cur = (cur[0], float(toks[i])); i += 1; continue
            if cmd == 'H': xs.append(float(toks[i])); cur = (float(toks[i]), cur[1]); i += 1; continue
            if cmd in 'ML': cur = (float(toks[i]), float(toks[i+1])); xs.append(cur[0]); ys.append(cur[1]); i += 2
            else:
                c = [float(x) for x in toks[i:i+6]]; p0 = cur
                for k in range(11):
                    u = k / 10
                    xs.append((1-u)**3*p0[0]+3*(1-u)**2*u*c[0]+3*(1-u)*u*u*c[2]+u**3*c[4])
                    ys.append((1-u)**3*p0[1]+3*(1-u)**2*u*c[1]+3*(1-u)*u*u*c[3]+u**3*c[5])
                cur = (c[4], c[5]); i += 6
    for cx, cy, r in re.findall(r'cx="(-?[\d.]+)" cy="(-?[\d.]+)" r="([\d.]+)"', s):
        xs += [float(cx) - float(r), float(cx) + float(r)]; ys += [float(cy) - float(r), float(cy) + float(r)]
    for cx, cy, rx, ry in re.findall(r'<ellipse cx="(-?[\d.]+)" cy="(-?[\d.]+)" rx="([\d.]+)" ry="([\d.]+)"', s):
        xs += [float(cx) - float(rx), float(cx) + float(rx)]; ys += [float(cy) - float(ry), float(cy) + float(ry)]
    return min(xs), max(xs), min(ys), max(ys)

probe, out, names = sys.argv[1], sys.argv[2], sys.argv[3:]
offs = {}
for n in names:
    x0, x1, y0, y1 = extent(f'{probe}/{n}.svg')
    h = y1 - y0
    bottom = min(44, 28 + h / 2)
    offs[n] = [round(24 - (x0 + x1) / 2, 1), round(bottom - y1, 1)]
    print(f'{n:12} w {x1-x0:5.1f} h {h:5.1f}  offset {offs[n]}', file=sys.stderr)
json.dump(offs, open(out, 'w'))
