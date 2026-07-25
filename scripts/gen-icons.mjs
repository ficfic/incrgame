// Generates the PWA icon set into public/ — no image libraries needed.
// Motif: a small knowledge-graph constellation on the game's dark background.
// Run: npm run icons  (outputs are committed; rerun only when the design changes)
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
mkdirSync(OUT, { recursive: true });

// ---- minimal PNG encoder (RGBA8, filter 0) ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- tiny rasterizer ----
function makeCanvas(size, bg) {
  const px = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    px[i * 4] = bg[0];
    px[i * 4 + 1] = bg[1];
    px[i * 4 + 2] = bg[2];
    px[i * 4 + 3] = 255;
  }
  return px;
}
function blend(px, size, x, y, rgb, a) {
  if (x < 0 || y < 0 || x >= size || y >= size || a <= 0) return;
  const i = (y * size + x) * 4;
  px[i] = Math.round(px[i] + (rgb[0] - px[i]) * a);
  px[i + 1] = Math.round(px[i + 1] + (rgb[1] - px[i + 1]) * a);
  px[i + 2] = Math.round(px[i + 2] + (rgb[2] - px[i + 2]) * a);
}
function circle(px, size, cx, cy, r, rgb) {
  const lo = Math.max(0, Math.floor(cy - r - 2)), hi = Math.min(size - 1, Math.ceil(cy + r + 2));
  for (let y = lo; y <= hi; y++)
    for (let x = Math.max(0, Math.floor(cx - r - 2)); x <= Math.min(size - 1, Math.ceil(cx + r + 2)); x++) {
      const d = Math.hypot(x - cx, y - cy);
      blend(px, size, x, y, rgb, Math.max(0, Math.min(1, r - d + 0.5)));
    }
}
function line(px, size, x0, y0, x1, y1, w, rgb, alpha = 1) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.ceil(len * 2);
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    circleSoft(px, size, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w / 2, rgb, alpha);
  }
}
function circleSoft(px, size, cx, cy, r, rgb, alpha) {
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++)
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      const d = Math.hypot(x - cx, y - cy);
      blend(px, size, x, y, rgb, alpha * Math.max(0, Math.min(1, r - d + 0.5)));
    }
}

// ---- the icon itself ----
const BG = [0x0b, 0x0e, 0x14];
const EDGE = [0x2e, 0x4a, 0x5c];
const NODE = [0x53, 0xe0, 0xc4]; // the game's signal-teal
const NODE_DIM = [0x2f, 0x8f, 0x83];

function drawIcon(size, pad = 0) {
  const px = makeCanvas(size, BG);
  const u = (size * (1 - 2 * pad)) / 100; // design units on a 100-grid
  const o = size * pad;
  const P = ([x, y]) => [o + x * u, o + y * u];
  // node layout: an off-balance constellation drifting toward the corner
  const nodes = [
    { p: [50, 54], r: 13, c: NODE },      // hub
    { p: [22, 30], r: 7, c: NODE_DIM },
    { p: [78, 26], r: 8.5, c: NODE_DIM },
    { p: [26, 79], r: 6, c: NODE_DIM },
    { p: [80, 74], r: 7.5, c: NODE_DIM },
    { p: [64, 10], r: 4, c: NODE_DIM },
  ];
  const edges = [ [0, 1], [0, 2], [0, 3], [0, 4], [2, 5] ];
  for (const [a, b] of edges) {
    const [x0, y0] = P(nodes[a].p), [x1, y1] = P(nodes[b].p);
    line(px, size, x0, y0, x1, y1, Math.max(1.5, 1.6 * u), EDGE);
  }
  for (const n of nodes) {
    const [x, y] = P(n.p);
    circle(px, size, x, y, n.r * u, n.c);
  }
  // hub core highlight
  const [hx, hy] = P(nodes[0].p);
  circle(px, size, hx, hy, 5 * u, [0xd9, 0xff, 0xf5]);
  return encodePng(size, px);
}

writeFileSync(join(OUT, 'icon-180.png'), drawIcon(180));
writeFileSync(join(OUT, 'icon-192.png'), drawIcon(192));
writeFileSync(join(OUT, 'icon-512.png'), drawIcon(512));
writeFileSync(join(OUT, 'icon-512-maskable.png'), drawIcon(512, 0.14)); // safe-zone padding
console.log('icons written to public/');
