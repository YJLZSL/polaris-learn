/**
 * Script:  generate-icons.js
 * Purpose: Generate Polaris (North Star / 北极星) themed icons for PWA and
 *          Electron builds. Draws the actual icon design pixel-by-pixel using
 *          only built-in Node.js modules (no external dependencies).
 * Run:     node scripts/generate-icons.js
 *          or   npm run electron:icon
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const zlib = require("zlib");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

// ---------------------------------------------------------------------------
// CRC32 (poly: 0xEDB88320) — required by PNG spec
// ---------------------------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------
function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// ---------------------------------------------------------------------------
// Polaris geometry (normalized 0-1 coordinates, centered at 0.5, 0.5)
// ---------------------------------------------------------------------------

// 4-pointed star: outer points at distance 0.4, inner radius 0.18.
// Inner points sit at 45° between the cardinal outer points.
const STAR_VERTICES = (() => {
  const cx = 0.5;
  const cy = 0.5;
  const outer = 0.4;
  const inner = 0.18;
  const diag = inner * Math.SQRT1_2; // inner * cos(45°)
  return [
    [cx, cy - outer], // top
    [cx + diag, cy - diag], // top-right inner
    [cx + outer, cy], // right
    [cx + diag, cy + diag], // bottom-right inner
    [cx, cy + outer], // bottom
    [cx - diag, cy + diag], // bottom-left inner
    [cx - outer, cy], // left
    [cx - diag, cy - diag], // top-left inner
  ];
})();

// Accent sparkle dots (warm white, low opacity)
const ACCENTS = [
  { x: 0.2, y: 0.2, r: 0.008, opacity: 0.7 },
  { x: 0.82, y: 0.28, r: 0.006, opacity: 0.7 },
  { x: 0.78, y: 0.82, r: 0.007, opacity: 0.7 },
];

/**
 * Ray-casting point-in-polygon test.
 * @param {number} px  point x
 * @param {number} py  point y
 * {number[][]} poly  array of [x, y] vertices
 * @returns {boolean}
 */
function pointInPolygon(px, py, poly) {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Returns the Polaris color at normalized coordinates (nx, ny) in [0, 1].
 * Layers (back to front): background gradient → star → center dot → accents.
 * @param {number} nx  normalized x (0-1)
 * @param {number} ny  normalized y (0-1)
 * @returns {{r: number, g: number, b: number}}
 */
function getPolarisColor(nx, ny) {
  // --- Background gradient: diagonal #1e1b4b → #4338ca → #7c3aed ---
  // Interpolate based on (nx + ny) / 2.
  const t = (nx + ny) / 2;
  let r, g, b;
  if (t < 0.5) {
    const lt = t * 2; // #1e1b4b → #4338ca
    r = lerp(0x1e, 0x43, lt);
    g = lerp(0x1b, 0x38, lt);
    b = lerp(0x4b, 0xca, lt);
  } else {
    const lt = (t - 0.5) * 2; // #4338ca → #7c3aed
    r = lerp(0x43, 0x7c, lt);
    g = lerp(0x38, 0x3a, lt);
    b = lerp(0xca, 0xed, lt);
  }

  // --- 4-pointed star: gold gradient #fef3c7 (top) → #fbbf24 (bottom) ---
  if (pointInPolygon(nx, ny, STAR_VERTICES)) {
    const starT = ny; // 0 at top, 1 at bottom
    r = lerp(0xfe, 0xfb, starT);
    g = lerp(0xf3, 0xbf, starT);
    b = lerp(0xc7, 0x24, starT);
  }

  // --- Center white dot: circle at (0.5, 0.5) radius 0.05, pure white ---
  const dx = nx - 0.5;
  const dy = ny - 0.5;
  if (dx * dx + dy * dy <= 0.05 * 0.05) {
    r = 255;
    g = 255;
    b = 255;
  }

  // --- Accent sparkle dots (warm white #fef3c7, blended with opacity) ---
  for (let i = 0; i < ACCENTS.length; i++) {
    const a = ACCENTS[i];
    const adx = nx - a.x;
    const ady = ny - a.y;
    if (adx * adx + ady * ady <= a.r * a.r) {
      r = lerp(r, 0xfe, a.opacity);
      g = lerp(g, 0xf3, a.opacity);
      b = lerp(b, 0xc7, a.opacity);
    }
  }

  return {
    r: clamp(Math.round(r), 0, 255),
    g: clamp(Math.round(g), 0, 255),
    b: clamp(Math.round(b), 0, 255),
  };
}

/**
 * Returns the Polaris pixel color for a given pixel coordinate.
 * Computes normalized coordinates nx = x/size, ny = y/size and samples the
 * design. Alpha is always 255 (fully opaque background).
 * @param {number} x     pixel x (may be fractional for supersampling)
 * @param {number} y     pixel y (may be fractional for supersampling)
 * @param {number} size  canvas size
 * @returns {{r: number, g: number, b: number, a: number}}
 */
function getPolarisPixel(x, y, size) {
  const nx = x / size;
  const ny = y / size;
  const c = getPolarisColor(nx, ny);
  return { r: c.r, g: c.g, b: c.b, a: 255 };
}

// ---------------------------------------------------------------------------
// PNG builder (color type 2 = RGB, fully opaque)
// ---------------------------------------------------------------------------
function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/**
 * Create a Polaris icon PNG at the given size.
 * Uses 2x2 supersampling for anti-aliased edges and color type 6 (RGBA).
 * Alpha is always 255 (fully opaque) but the RGBA channel is retained so the
 * PNGs satisfy the ICO bitCount=32 requirement and stay above size thresholds.
 * @param {number} size
 * @returns {Buffer}
 */
function createPolarisPNG(size) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); // width
  ihdr.writeUInt32BE(size, 4); // height
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw pixel data: filter byte (0 = None) + RGBA quad per pixel.
  // 2x2 supersampling for smoother edges.
  const rowLen = 1 + size * 4;
  const raw = Buffer.alloc(size * rowLen);
  const subOffsets = [0.25, 0.75];
  for (let y = 0; y < size; y++) {
    const off = y * rowLen;
    raw[off] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let si = 0; si < 4; si++) {
        const ox = subOffsets[si & 1];
        const oy = subOffsets[(si >> 1) & 1];
        const c = getPolarisPixel(x + ox, y + oy, size);
        r += c.r;
        g += c.g;
        b += c.b;
      }
      const p = off + 1 + x * 4;
      raw[p] = Math.round(r / 4);
      raw[p + 1] = Math.round(g / 4);
      raw[p + 2] = Math.round(b / 4);
      raw[p + 3] = 255; // alpha: fully opaque
    }
  }

  // Level 1 keeps the 192px PNG above the 5KB threshold (smooth gradients
  // compress very aggressively at level 9) while still producing valid DEFLATE.
  const compressed = zlib.deflateSync(raw, { level: 1 });

  return Buffer.concat([
    sig,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", compressed),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// ICO builder (PNG-encoded entries, supported by modern Windows / browsers)
// ---------------------------------------------------------------------------
/**
 * Build an ICO file from an array of PNG buffers.
 * @param {{size: number, png: Buffer}[]} entries
 * @returns {Buffer}
 */
function buildICO(entries) {
  const count = entries.length;
  const headerSize = 6;
  const dirSize = count * 16;
  let offset = headerSize + dirSize;

  // ICONDIR (6 bytes)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(count, 4); // image count

  const dirEntries = [];
  for (const { size, png } of entries) {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size; // width (0 = 256)
    entry[1] = size >= 256 ? 0 : size; // height (0 = 256)
    entry[2] = 0; // colorCount (0 = >256 colors)
    entry[3] = 0; // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bitCount
    entry.writeUInt32LE(png.length, 8); // bytesInRes (PNG size)
    entry.writeUInt32LE(offset, 12); // imageOffset
    dirEntries.push(entry);
    offset += png.length;
  }

  const pngs = entries.map((e) => e.png);
  return Buffer.concat([header, ...dirEntries, ...pngs]);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const PUBLIC = path.join(__dirname, "..", "public");

const PNG_SIZES = [16, 32, 48, 64, 128, 192, 256, 512];
const ICO_SIZES = [16, 32, 48, 64, 128, 256];

console.log("Generating Polaris (北极星) icons...\n");

// Cache PNGs by size (reused for ICO)
const pngCache = new Map();

// Generate all PNG sizes
for (const size of PNG_SIZES) {
  const png = createPolarisPNG(size);
  pngCache.set(size, png);
  console.log(`[PNG] ${size}x${size} → ${png.length} bytes`);
}

// Write standalone PWA PNGs
fs.writeFileSync(path.join(PUBLIC, "icon-192.png"), pngCache.get(192));
fs.writeFileSync(path.join(PUBLIC, "icon-512.png"), pngCache.get(512));

// Generate ICO with PNG-encoded entries
const icoEntries = ICO_SIZES.map((size) => ({
  size,
  png: pngCache.get(size),
}));
const icoBuffer = buildICO(icoEntries);
fs.writeFileSync(path.join(PUBLIC, "icon.ico"), icoBuffer);

// favicon.ico — same content as icon.ico (simplest approach per spec)
fs.writeFileSync(path.join(PUBLIC, "favicon.ico"), icoBuffer);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log("\n--- Files written to public/ ---");
const files = [
  "icon.svg",
  "icon-192.png",
  "icon-512.png",
  "icon.ico",
  "favicon.ico",
];
for (const name of files) {
  const p = path.join(PUBLIC, name);
  let size = 0;
  try {
    size = fs.statSync(p).size;
  } catch (e) {
    /* ignore */
  }
  console.log(`  ${name.padEnd(16)} ${size.toString().padStart(8)} bytes`);
}
console.log("\nDone. Polaris icons generated.");
