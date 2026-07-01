/**
 * Script:  generate-icons.js
 * Purpose: Generate Polaris (North Star / 北极星) themed icons for PWA and
 *          Electron builds. Draws the actual icon design pixel-by-pixel using
 *          only built-in Node.js modules (no external dependencies).
 * Run:     node scripts/generate-icons.js
 *          or   npm run electron:icon
 */

const zlib = require("zlib");
const fs = require("fs");
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
// Polaris geometry (normalized 0-1 coordinates)
// Star sits slightly above center to leave room for the open book below.
// ---------------------------------------------------------------------------
const STAR_CENTER_X = 0.5;
const STAR_CENTER_Y = 0.449;
const STAR_OUTER = 0.234;
const STAR_INNER = 0.094;
const STAR_GLOW_RADIUS = STAR_OUTER * 1.75;

// 4-pointed star: outer points at distance STAR_OUTER, inner radius STAR_INNER.
// Inner points sit at 45° between the cardinal outer points.
const STAR_VERTICES = (() => {
  const cx = STAR_CENTER_X;
  const cy = STAR_CENTER_Y;
  const outer = STAR_OUTER;
  const inner = STAR_INNER;
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

// Open book at the bottom (two pages opening upward from a center spine).
const BOOK_LEFT = [
  [0.5, 0.725], // spine top
  [0.215, 0.754], // top-left corner
  [0.195, 0.84], // bottom-left corner
  [0.5, 0.82], // spine bottom
];
const BOOK_RIGHT = [
  [0.5, 0.725], // spine top
  [0.785, 0.754], // top-right corner
  [0.805, 0.84], // bottom-right corner
  [0.5, 0.82], // spine bottom
];

// Constellation sparkle dots (knowledge points scattered across the night sky)
const CONSTELLATION = [
  { x: 0.176, y: 0.234, r: 0.007, opacity: 0.85 },
  { x: 0.293, y: 0.156, r: 0.0047, opacity: 0.6 },
  { x: 0.5, y: 0.086, r: 0.005, opacity: 0.6 },
  { x: 0.742, y: 0.176, r: 0.005, opacity: 0.6 },
  { x: 0.82, y: 0.293, r: 0.006, opacity: 0.75 },
  { x: 0.205, y: 0.586, r: 0.005, opacity: 0.6 },
  { x: 0.84, y: 0.625, r: 0.006, opacity: 0.7 },
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
 * Layers (back to front):
 *   background gradient → star glow halo → constellation → open book →
 *   4-pointed star → bright center dot.
 * @param {number} nx  normalized x (0-1)
 * @param {number} ny  normalized y (0-1)
 * @returns {{r: number, g: number, b: number}}
 */
function getPolarisColor(nx, ny) {
  // --- Background gradient: diagonal #1e1b4b → #4338ca → #7c3aed ---
  // Interpolate based on (nx + ny) / 2.
  const t = (nx + ny) / 2;
  let r, g, b;
  if (t < 0.55) {
    const lt = t / 0.55; // #1e1b4b → #4338ca
    r = lerp(0x1e, 0x43, lt);
    g = lerp(0x1b, 0x38, lt);
    b = lerp(0x4b, 0xca, lt);
  } else {
    const lt = (t - 0.55) / 0.45; // #4338ca → #7c3aed
    r = lerp(0x43, 0x7c, lt);
    g = lerp(0x38, 0x3a, lt);
    b = lerp(0xca, 0xed, lt);
  }

  // --- Star glow halo: warm gold radial fade around the star center ---
  const sdx = nx - STAR_CENTER_X;
  const sdy = ny - STAR_CENTER_Y;
  const sdist = Math.sqrt(sdx * sdx + sdy * sdy);
  if (sdist < STAR_GLOW_RADIUS) {
    const glowT = sdist / STAR_GLOW_RADIUS; // 0 center → 1 edge
    const strength = Math.pow(1 - glowT, 2) * 0.5;
    r = lerp(r, 0xfb, strength);
    g = lerp(g, 0xbf, strength);
    b = lerp(b, 0x24, strength * 0.7);
  }

  // --- Constellation sparkle dots (warm white #fef3c7) ---
  for (let i = 0; i < CONSTELLATION.length; i++) {
    const a = CONSTELLATION[i];
    const adx = nx - a.x;
    const ady = ny - a.y;
    if (adx * adx + ady * ady <= a.r * a.r) {
      r = lerp(r, 0xfe, a.opacity);
      g = lerp(g, 0xf3, a.opacity);
      b = lerp(b, 0xc7, a.opacity);
    }
  }

  // --- Open book at bottom: light indigo gradient #e0e7ff → #a5b4fc ---
  if (pointInPolygon(nx, ny, BOOK_LEFT) || pointInPolygon(nx, ny, BOOK_RIGHT)) {
    const bookT = clamp((ny - 0.725) / 0.115, 0, 1); // 0 top → 1 bottom
    const br = lerp(0xe0, 0xa5, bookT);
    const bg2 = lerp(0xe7, 0xb4, bookT);
    const bb = lerp(0xff, 0xfc, bookT);
    r = lerp(r, br, 0.92);
    g = lerp(g, bg2, 0.92);
    b = lerp(b, bb, 0.92);
  }

  // --- 4-pointed star: gold gradient #fef3c7 (top) → #fbbf24 (bottom) ---
  if (pointInPolygon(nx, ny, STAR_VERTICES)) {
    const starT = clamp(
      (ny - (STAR_CENTER_Y - STAR_OUTER)) / (STAR_OUTER * 2),
      0,
      1,
    );
    r = lerp(0xfe, 0xfb, starT);
    g = lerp(0xf3, 0xbf, starT);
    b = lerp(0xc7, 0x24, starT);
  }

  // --- Bright white center dot: circle at star center, radius 0.035 ---
  const cdx = nx - STAR_CENTER_X;
  const cdy = ny - STAR_CENTER_Y;
  if (cdx * cdx + cdy * cdy <= 0.035 * 0.035) {
    r = 255;
    g = 255;
    b = 255;
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
 * design. When `round` is true, a circular mask is applied: pixels outside
 * the inscribed circle (center 0.5,0.5, radius 0.5) become transparent, with
 * a thin anti-aliased edge — used for Android ic_launcher_round.
 * @param {number} x     pixel x (may be fractional for supersampling)
 * @param {number} y     pixel y (may be fractional for supersampling)
 * @param {number} size  canvas size
 * @param {boolean} round  apply circular mask
 * @returns {{r: number, g: number, b: number, a: number}}
 */
function getPolarisPixel(x, y, size, round) {
  const nx = x / size;
  const ny = y / size;
  const c = getPolarisColor(nx, ny);
  let a = 255;
  if (round) {
    const dx = nx - 0.5;
    const dy = ny - 0.5;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= 0.5) {
      a = 0;
    } else if (dist > 0.495) {
      // 1.5px (at normalized scale) anti-aliased edge
      a = Math.round(((0.5 - dist) / 0.005) * 255);
    }
  }
  return { r: c.r, g: c.g, b: c.b, a };
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
 * Shared PNG renderer for the Polaris icon.
 * Uses 2x2 supersampling for anti-aliased edges and color type 6 (RGBA).
 * When `round` is true a circular alpha mask is applied (for ic_launcher_round).
 * @param {number} size
 * @param {boolean} round
 * @returns {Buffer}
 */
function renderPolarisPNG(size, round) {
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
      let a = 0;
      for (let si = 0; si < 4; si++) {
        const ox = subOffsets[si & 1];
        const oy = subOffsets[(si >> 1) & 1];
        const c = getPolarisPixel(x + ox, y + oy, size, round);
        r += c.r;
        g += c.g;
        b += c.b;
        a += c.a;
      }
      const p = off + 1 + x * 4;
      raw[p] = Math.round(r / 4);
      raw[p + 1] = Math.round(g / 4);
      raw[p + 2] = Math.round(b / 4);
      raw[p + 3] = Math.round(a / 4);
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

/**
 * Create a square Polaris icon PNG at the given size (fully opaque).
 * RGBA channel retained so PNGs satisfy the ICO bitCount=32 requirement.
 * @param {number} size
 * @returns {Buffer}
 */
function createPolarisPNG(size) {
  return renderPolarisPNG(size, false);
}

/**
 * Create a round Polaris icon PNG at the given size with a circular alpha
 * mask (transparent corners) — used for Android ic_launcher_round.
 * @param {number} size
 * @returns {Buffer}
 */
function createPolarisPNGRound(size) {
  return renderPolarisPNG(size, true);
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
// Android mipmap launcher icons
// ---------------------------------------------------------------------------
const ANDROID_RES = path.join(
  __dirname,
  "..",
  "android",
  "app",
  "src",
  "main",
  "res",
);
// density → pixel size mapping per Android launcher spec
const MIPMAP_DENSITIES = [
  { name: "mdpi", size: 48 },
  { name: "hdpi", size: 72 },
  { name: "xhdpi", size: 96 },
  { name: "xxhdpi", size: 144 },
  { name: "xxxhdpi", size: 192 },
];

console.log("\n--- Generating Android mipmap launcher icons ---");
for (const { name, size } of MIPMAP_DENSITIES) {
  const dir = path.join(ANDROID_RES, `mipmap-${name}`);
  fs.mkdirSync(dir, { recursive: true });
  const squarePng = createPolarisPNG(size);
  const roundPng = createPolarisPNGRound(size);
  fs.writeFileSync(path.join(dir, "ic_launcher.png"), squarePng);
  fs.writeFileSync(path.join(dir, "ic_launcher_round.png"), roundPng);
  console.log(
    `[mipmap-${name}] ${size}x${size} → ic_launcher.png (${squarePng.length} bytes), ic_launcher_round.png (${roundPng.length} bytes)`,
  );
}

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
  } catch {
    /* ignore */
  }
  console.log(`  ${name.padEnd(16)} ${size.toString().padStart(8)} bytes`);
}
console.log("\nDone. Polaris icons generated.");
