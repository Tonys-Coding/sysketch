/**
 * Simplified map backdrops for groups (`maps: {Group Label: world}`). The outlines are hand-made,
 * low-poly [lon, lat] rings: recognizable at diagram scale, a few KB, no third-party map data.
 */
export type MapName = 'world';
export const MAP_NAMES: MapName[] = ['world'];

type Ring = [number, number][];

const WORLD: Ring[] = [
  // North America
  [
    [-168, 66],
    [-156, 71],
    [-140, 70],
    [-125, 70],
    [-110, 68],
    [-95, 68],
    [-90, 62],
    [-94, 58],
    [-85, 55],
    [-80, 52],
    [-79, 57],
    [-77, 62],
    [-70, 60],
    [-64, 60],
    [-60, 55],
    [-56, 52],
    [-60, 47],
    [-66, 45],
    [-70, 42],
    [-74, 40],
    [-76, 35],
    [-81, 31],
    [-80, 26],
    [-83, 29],
    [-89, 30],
    [-94, 29],
    [-97, 26],
    [-97, 22],
    [-93, 19],
    [-88, 21],
    [-87, 16],
    [-83, 10],
    [-79, 8],
    [-83, 8],
    [-86, 12],
    [-92, 15],
    [-97, 16],
    [-105, 20],
    [-110, 24],
    [-112, 29],
    [-115, 31],
    [-110, 23],
    [-117, 32],
    [-121, 35],
    [-124, 40],
    [-124, 47],
    [-128, 51],
    [-135, 58],
    [-146, 61],
    [-152, 59],
    [-158, 57],
    [-165, 55],
    [-160, 59],
    [-165, 62],
    [-166, 65],
  ],
  // Greenland
  [
    [-55, 60],
    [-45, 60],
    [-40, 65],
    [-22, 70],
    [-20, 76],
    [-18, 82],
    [-35, 83],
    [-60, 82],
    [-70, 78],
    [-58, 75],
    [-52, 69],
  ],
  // South America
  [
    [-80, 9],
    [-73, 12],
    [-62, 10],
    [-52, 5],
    [-50, 0],
    [-45, -3],
    [-35, -6],
    [-39, -14],
    [-41, -22],
    [-48, -26],
    [-53, -34],
    [-58, -38],
    [-63, -41],
    [-66, -46],
    [-68, -52],
    [-71, -54],
    [-74, -50],
    [-73, -40],
    [-71, -30],
    [-70, -18],
    [-76, -14],
    [-81, -6],
    [-80, -2],
    [-78, 4],
  ],
  // Africa
  [
    [-17, 21],
    [-13, 28],
    [-9, 32],
    [-5, 36],
    [10, 37],
    [20, 33],
    [32, 31],
    [34, 28],
    [38, 20],
    [43, 12],
    [51, 12],
    [46, 3],
    [40, -3],
    [40, -10],
    [35, -20],
    [33, -26],
    [27, -34],
    [20, -35],
    [18, -30],
    [12, -18],
    [13, -8],
    [9, -1],
    [9, 4],
    [4, 6],
    [-5, 5],
    [-9, 5],
    [-14, 10],
    [-17, 15],
  ],
  // Europe and Asia
  [
    [-9, 38],
    [-9, 43],
    [-2, 43.5],
    [-1, 46],
    [-4, 48],
    [2, 51],
    [5, 53],
    [8, 54],
    [9, 57],
    [11, 56],
    [12, 54],
    [20, 55],
    [24, 58],
    [30, 60],
    [24, 65],
    [21, 61],
    [18, 60],
    [16, 56],
    [12, 56],
    [8, 59],
    [5, 62],
    [14, 68],
    [25, 71],
    [32, 70],
    [40, 68],
    [45, 68],
    [60, 69],
    [70, 73],
    [80, 73],
    [95, 76],
    [110, 77],
    [130, 72],
    [150, 71],
    [170, 70],
    [180, 68],
    [180, 65],
    [170, 60],
    [163, 58],
    [156, 51],
    [150, 59],
    [142, 59],
    [138, 54],
    [142, 47],
    [135, 43],
    [130, 42],
    [129, 36],
    [126, 35],
    [126, 40],
    [121, 40],
    [122, 37],
    [119, 35],
    [122, 30],
    [120, 24],
    [110, 21],
    [108, 17],
    [109, 12],
    [105, 9],
    [100, 13],
    [100, 7],
    [103, 1],
    [98, 8],
    [98, 16],
    [93, 19],
    [88, 22],
    [80, 15],
    [77, 8],
    [73, 17],
    [70, 21],
    [67, 25],
    [62, 25],
    [57, 26],
    [56, 25],
    [52, 28],
    [48, 30],
    [50, 26],
    [56, 25],
    [59, 22],
    [52, 16],
    [44, 12],
    [43, 15],
    [38, 22],
    [35, 28],
    [34, 32],
    [36, 36],
    [30, 36],
    [27, 37],
    [26, 40],
    [29, 41],
    [41, 41],
    [37, 45],
    [32, 46],
    [28, 41],
    [24, 38],
    [22, 37],
    [20, 40],
    [15, 44],
    [12, 45],
    [18, 40],
    [16, 38],
    [10, 44],
    [3, 43],
    [-2, 37],
    [-6, 36],
  ],
  // Great Britain, Ireland, Iceland
  [
    [-5, 50],
    [1, 51],
    [2, 53],
    [-2, 56],
    [-2, 58],
    [-6, 58],
    [-5, 55],
    [-3, 53],
    [-5, 52],
  ],
  [
    [-10, 52],
    [-6, 52],
    [-6, 55],
    [-10, 54],
  ],
  [
    [-24, 64],
    [-14, 64],
    [-15, 66],
    [-22, 66],
  ],
  // Japan
  [
    [130, 31],
    [135, 34],
    [140, 36],
    [142, 40],
    [141, 45],
    [145, 44],
    [142, 41],
    [141, 36],
    [135, 33],
  ],
  // Southeast Asia islands
  [
    [95, 5],
    [104, -3],
    [106, -6],
    [100, -2],
  ],
  [
    [109, 2],
    [117, 7],
    [119, 1],
    [116, -4],
    [110, -3],
  ],
  [
    [106, -6],
    [114, -7],
    [114, -8],
    [106, -7],
  ],
  // Madagascar
  [
    [44, -12],
    [50, -15],
    [47, -25],
    [43, -22],
  ],
  // Australia and New Zealand
  [
    [114, -22],
    [122, -18],
    [130, -12],
    [136, -12],
    [137, -16],
    [142, -11],
    [146, -18],
    [153, -26],
    [151, -34],
    [146, -39],
    [140, -38],
    [135, -35],
    [129, -31],
    [115, -34],
    [113, -26],
  ],
  [
    [172, -34],
    [178, -38],
    [175, -41],
    [172, -41],
  ],
  [
    [167, -46],
    [172, -41],
    [174, -42],
    [171, -46],
  ],
];

/** The map covers longitude -180..180 and latitude 84..-58 (no Antarctica), so it is 360 x 142. */
const MAPS: Record<MapName, { rings: Ring[]; w: number; h: number; top: number }> = {
  world: { rings: WORLD, w: 360, h: 142, top: 84 },
};

export interface Pin {
  label: string;
  lon: number;
  lat: number;
}

/** Known region names: cloud-style regions plus a few cities. [lon, lat] */
const PLACES: Record<string, [number, number]> = {
  'us-east': [-77.4, 38.9],
  'us-west': [-121.2, 45.6],
  'us-central': [-95.9, 41.3],
  'ca-central': [-73.6, 45.5],
  'sa-east': [-46.6, -23.5],
  'eu-west': [-6.3, 53.3],
  'eu-central': [8.7, 50.1],
  'eu-north': [18, 59.3],
  'eu-south': [9.2, 45.5],
  'me-south': [50.6, 26.2],
  'af-south': [18.4, -33.9],
  'ap-south': [72.9, 19.1],
  'ap-southeast': [103.8, 1.35],
  'ap-northeast': [139.7, 35.7],
  'ap-east': [114.2, 22.3],
  'ap-southeast-2': [151.2, -33.9],
  virginia: [-77.4, 38.9],
  oregon: [-121.2, 45.6],
  california: [-122.3, 37.8],
  'new-york': [-74, 40.7],
  'sao-paulo': [-46.6, -23.5],
  london: [-0.1, 51.5],
  ireland: [-6.3, 53.3],
  paris: [2.3, 48.9],
  frankfurt: [8.7, 50.1],
  stockholm: [18, 59.3],
  mumbai: [72.9, 19.1],
  singapore: [103.8, 1.35],
  tokyo: [139.7, 35.7],
  'hong-kong': [114.2, 22.3],
  sydney: [151.2, -33.9],
  dubai: [55.3, 25.2],
  johannesburg: [28, -26.2],
};

export const PIN_NAMES = Object.keys(PLACES);

/**
 * A map pin from a spec string: a known place (`us-east`, `tokyo`) or `Label @ lon,lat`
 * (`HQ @ -0.12 51.5`; a comma between the numbers works too, but needs quotes in a YAML list). Returns undefined when it is neither.
 */
export function parsePin(text: string): Pin | undefined {
  const at = /^(.*?)\s*@\s*(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/.exec(text.trim());
  if (at) {
    const lon = Number(at[2]);
    const lat = Number(at[3]);
    if (lon < -180 || lon > 180 || lat < -90 || lat > 90) return undefined;
    return { label: at[1]!.trim() || `${lon}, ${lat}`, lon, lat };
  }
  const key = text.trim().toLowerCase();
  const hit = PLACES[key];
  return hit ? { label: text.trim(), lon: hit[0], lat: hit[1] } : undefined;
}

/** Path data for a map fitted (and centered, aspect kept) into the box x, y, w, h. */
export function mapPath(
  name: MapName,
  x: number,
  y: number,
  w: number,
  h: number,
): {
  d: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** screen position of a longitude and latitude on this map */
  at: (lon: number, lat: number) => [number, number];
} {
  const m = MAPS[name];
  const k = Math.min(w / m.w, h / m.h);
  const ox = x + (w - m.w * k) / 2;
  const oy = y + (h - m.h * k) / 2;
  const r = (n: number) => Math.round(n * 10) / 10;
  const d = m.rings
    .map(
      (ring) =>
        'M' +
        ring.map(([lon, lat]) => `${r(ox + (lon + 180) * k)} ${r(oy + (m.top - lat) * k)}`).join('L') +
        'Z',
    )
    .join('');
  return {
    d,
    x: ox,
    y: oy,
    w: m.w * k,
    h: m.h * k,
    at: (lon, lat) => [r(ox + (lon + 180) * k), r(oy + (m.top - lat) * k)],
  };
}
