/**
 * Script:  generate-icons.js
 * Purpose: Generate placeholder PNG icons for PWA and Electron builds.
 *          Uses only built-in Node.js modules (no external dependencies).
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
// PNG builder
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
 * Create a solid-colour square PNG.
 * @param {number} size   width & height in pixels
 * @param {number} r      red   0-255
 * @param {number} g      green 0-255
 * @param {number} b      blue  0-255
 * @returns {Buffer}
 */
function createSolidPNG(size, r, g, b) {
  // ---- PNG signature (8 bytes) ---------------------------------------
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // ---- IHDR (13 bytes) -----------------------------------------------
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); // width
  ihdr.writeUInt32BE(size, 4); // height
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB (no alpha → smaller file)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // ---- Raw pixel data (filter-byte + RGB triple per pixel) -----------
  const rowLen = 1 + size * 3;
  const raw = Buffer.alloc(size * rowLen);
  for (let y = 0; y < size; y++) {
    const off = y * rowLen;
    raw[off] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const p = off + 1 + x * 3;
      raw[p] = r;
      raw[p + 1] = g;
      raw[p + 2] = b;
    }
  }

  // ---- IDAT (deflate-compressed raw data) ----------------------------
  const compressed = zlib.deflateSync(raw, { level: 9 });

  // ---- Assemble ------------------------------------------------------
  return Buffer.concat([
    sig,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", compressed),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Generate icons matching the project's Indigo brand colour (#6366f1)
// ---------------------------------------------------------------------------
const INDIGO = { r: 99, g: 102, b: 241 }; // #6366f1 Tailwind indigo-500
const PUBLIC = path.join(__dirname, "..", "public");

const icons = [
  { name: "icon-512.png", size: 512 }, // PWA + Electron
  { name: "icon-192.png", size: 192 }, // PWA
];

for (const { name, size } of icons) {
  const buf = createSolidPNG(size, INDIGO.r, INDIGO.g, INDIGO.b);
  const dest = path.join(PUBLIC, name);
  fs.writeFileSync(dest, buf);
  console.log(`[OK]  ${name}  (${size}x${size}, ${buf.length} bytes)`);
}

console.log("\nIcons generated. Replace these placeholders with your branded artwork.");
