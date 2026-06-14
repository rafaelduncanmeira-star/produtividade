// Gera os ícones do app (PNG) sem dependências: rasteriza um "alvo de foco"
// com o gradiente da marca (índigo -> violeta) e codifica o PNG via zlib nativo.
import zlib from 'node:zlib';
import { writeFileSync } from 'node:fs';

const C0 = [0x4f, 0x46, 0xe5]; // indigo-600 #4f46e5 (topo-esquerda)
const C1 = [0x7c, 0x3a, 0xed]; // violet-600 #7c3aed (baixo-direita)

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// Desenha o "alvo": anel externo + ponto central (branco), sobre o gradiente.
function render(size, ringScale) {
  const data = Buffer.alloc(size * size * 4);
  const c = (size - 1) / 2;
  const R = (size * ringScale) / 2;       // raio externo do anel
  const ringOuter = R;
  const ringInner = R * 0.7;
  const dotR = R * 0.32;
  const edge = Math.max(1, size / 360);   // suavização (anti-serrilhado)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const t = (x + y) / (2 * (size - 1));
      let r = Math.round(C0[0] + (C1[0] - C0[0]) * t);
      let g = Math.round(C0[1] + (C1[1] - C0[1]) * t);
      let b = Math.round(C0[2] + (C1[2] - C0[2]) * t);

      const d = Math.hypot(x - c, y - c);
      const ring = Math.min(smooth(ringInner - edge, ringInner + edge, d), 1 - smooth(ringOuter - edge, ringOuter + edge, d));
      const dot = 1 - smooth(dotR - edge, dotR + edge, d);
      const a = clamp(Math.max(ring, dot), 0, 1);
      if (a > 0) { r = Math.round(r * (1 - a) + 255 * a); g = Math.round(g * (1 - a) + 255 * a); b = Math.round(b * (1 - a) + 255 * a); }

      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
  }
  return data;
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  return (~c) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const tb = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0);
  return Buffer.concat([len, tb, data, crc]);
}
function png(size, data) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) { raw[y * stride] = 0; data.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4); }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const out = (name, size, ringScale) => {
  writeFileSync(new URL(`../public/${name}`, import.meta.url), png(size, render(size, ringScale)));
  console.log('ok', name, size);
};

out('icon-512.png', 512, 0.56);
out('icon-192.png', 192, 0.56);
out('apple-touch-icon.png', 180, 0.56);
out('icon-512-maskable.png', 512, 0.42); // alvo menor: cabe na zona segura do recorte
