/* Gera os ícones do PWA (sem dependências externas: só Buffer + zlib).
   Ícone: quadrado indigo (#4f46e5) com o monograma "T" branco (Tempo).
   Rode com: node scripts/generate-icons.cjs */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makePng(size, glyphScale) {
  const W = size, H = size;
  const bg = [79, 70, 229, 255];    // #4f46e5
  const fg = [255, 255, 255, 255];  // branco
  const g = Math.round(W * glyphScale);
  const gx = Math.round((W - g) / 2);
  const gy = Math.round((H - g) / 2);
  const thick = Math.max(2, Math.round(g * 0.22));
  const vx = gx + Math.round((g - thick) / 2);

  const stride = W * 4 + 1;
  const raw = Buffer.alloc(stride * H);
  for (let y = 0; y < H; y++) {
    raw[y * stride] = 0; // filtro "none"
    for (let x = 0; x < W; x++) {
      const inBarH = y >= gy && y < gy + thick && x >= gx && x < gx + g;
      const inBarV = x >= vx && x < vx + thick && y >= gy && y < gy + g;
      const c = inBarH || inBarV ? fg : bg;
      const off = y * stride + 1 + x * 4;
      raw[off] = c[0]; raw[off + 1] = c[1]; raw[off + 2] = c[2]; raw[off + 3] = c[3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const out = path.join(__dirname, '..', 'public');
fs.mkdirSync(out, { recursive: true });
const files = [
  ['icon-192.png', 192, 0.55],
  ['icon-512.png', 512, 0.55],
  ['icon-512-maskable.png', 512, 0.42], // mais padding para a "safe zone"
  ['apple-touch-icon.png', 180, 0.55],
];
for (const [name, size, scale] of files) {
  fs.writeFileSync(path.join(out, name), makePng(size, scale));
  console.log('gerado', name);
}
