import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

function crcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}

const CRC_TABLE = crcTable();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function png(size, bg, accent) {
  const [br, bgG, bb] = bg;
  const [ar, ag, ab] = accent;
  const raw = Buffer.alloc((size * 4 + 1) * size);

  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const i = row + 1 + x * 4;
      // rounded square background
      const margin = size * 0.08;
      const nx = (x - size / 2) / (size / 2 - margin);
      const ny = (y - size / 2) / (size / 2 - margin);
      const inBg = Math.max(Math.abs(nx), Math.abs(ny)) <= 1.05;

      // three rising bars in the center
      const barW = size * 0.08;
      const gap = size * 0.06;
      const baseY = size * 0.72;
      const cx = size / 2;
      const bars = [
        { x: cx - gap - barW * 1.5, h: size * 0.22 },
        { x: cx - barW / 2, h: size * 0.34 },
        { x: cx + gap + barW / 2, h: size * 0.48 },
      ];
      const inBar = bars.some(
        (b) => x >= b.x && x <= b.x + barW && y <= baseY && y >= baseY - b.h,
      );

      if (inBar) {
        raw[i] = ar;
        raw[i + 1] = ag;
        raw[i + 2] = ab;
        raw[i + 3] = 255;
      } else if (inBg) {
        raw[i] = br;
        raw[i + 1] = bgG;
        raw[i + 2] = bb;
        raw[i + 3] = 255;
      } else {
        raw[i] = 0;
        raw[i + 1] = 0;
        raw[i + 2] = 0;
        raw[i + 3] = 0;
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const bg = [15, 20, 25];
const accent = [46, 160, 140];

for (const size of [192, 512]) {
  const file = join(outDir, `icon-${size}.png`);
  writeFileSync(file, png(size, bg, accent));
  console.log("wrote", file);
}
