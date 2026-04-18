const zlib = require('zlib');
const fs = require('fs');

function createPNG(size) {
  // Colors: background #2C1810 (brown), text #F5C842 (gold)
  const bg = [0x2C, 0x18, 0x10, 0xFF];
  const gold = [0xF5, 0xC8, 0x42, 0xFF];
  const cream = [0xFF, 0xF8, 0xEE, 0xFF];

  // Create pixel data
  const pixels = new Uint8Array(size * size * 4);

  // Fill background
  for (let i = 0; i < size * size; i++) {
    pixels[i * 4] = bg[0];
    pixels[i * 4 + 1] = bg[1];
    pixels[i * 4 + 2] = bg[2];
    pixels[i * 4 + 3] = bg[3];
  }

  // Draw rounded rectangle inset as gold border
  const border = Math.floor(size * 0.07);
  const rad = Math.floor(size * 0.18);

  function drawRect(x1, y1, x2, y2, color, radius) {
    for (let y = y1; y < y2; y++) {
      for (let x = x1; x < x2; x++) {
        // Corner check
        let inCorner = false;
        if (x - x1 < radius && y - y1 < radius) {
          const dx = x - x1 - radius, dy = y - y1 - radius;
          if (dx * dx + dy * dy > radius * radius) inCorner = true;
        }
        if (x2 - x - 1 < radius && y - y1 < radius) {
          const dx = x2 - x - 1 - radius, dy = y - y1 - radius;
          if (dx * dx + dy * dy > radius * radius) inCorner = true;
        }
        if (x - x1 < radius && y2 - y - 1 < radius) {
          const dx = x - x1 - radius, dy = y2 - y - 1 - radius;
          if (dx * dx + dy * dy > radius * radius) inCorner = true;
        }
        if (x2 - x - 1 < radius && y2 - y - 1 < radius) {
          const dx = x2 - x - 1 - radius, dy = y2 - y - 1 - radius;
          if (dx * dx + dy * dy > radius * radius) inCorner = true;
        }
        if (!inCorner) {
          const idx = (y * size + x) * 4;
          pixels[idx] = color[0];
          pixels[idx + 1] = color[1];
          pixels[idx + 2] = color[2];
          pixels[idx + 3] = color[3];
        }
      }
    }
  }

  // Gold rounded square in center
  const sq = Math.floor(size * 0.55);
  const sx = Math.floor((size - sq) / 2);
  const sy = Math.floor((size - sq) / 2);
  drawRect(sx, sy, sx + sq, sy + sq, gold, Math.floor(sq * 0.2));

  // Draw "J" letter pixels (bitmap approach)
  // J: vertical bar on right, bottom curves left
  const lw = Math.floor(size * 0.065); // letter stroke width
  const lh = Math.floor(sq * 0.58);    // letter height
  const lx = Math.floor(size / 2);     // center x
  const ly = Math.floor(size / 2 - lh / 2 + size * 0.01);

  function setPixel(px, py, color) {
    if (px >= 0 && px < size && py >= 0 && py < size) {
      const idx = (py * size + px) * 4;
      pixels[idx] = color[0];
      pixels[idx + 1] = color[1];
      pixels[idx + 2] = color[2];
      pixels[idx + 3] = color[3];
    }
  }

  function fillRect(x1, y1, w, h, color) {
    for (let y = y1; y < y1 + h; y++)
      for (let x = x1; x < x1 + w; x++)
        setPixel(x, y, color);
  }

  // J vertical stroke (right side)
  fillRect(lx - Math.floor(lw / 2), ly, lw, lh - Math.floor(lh * 0.25), bg);

  // J bottom curve (left turn)
  const curveR = Math.floor(lw * 1.6);
  const curveY = ly + lh - Math.floor(lh * 0.25) - curveR;
  for (let angle = 0; angle <= 180; angle += 2) {
    const rad2 = angle * Math.PI / 180;
    const cx = lx - Math.floor(lw / 2) + Math.round(curveR * Math.cos(rad2));
    const cy = curveY + Math.round(curveR * Math.sin(rad2));
    fillRect(cx - Math.floor(lw / 2), cy, lw, lw, bg);
  }

  // Top serif bar
  fillRect(lx - Math.floor(lw * 1.5), ly, Math.floor(lw * 3), Math.floor(lw * 0.8), bg);

  // Build PNG binary
  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    const table = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[i] = c;
    }
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function chunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.allocUnsafe(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const crcBuf = Buffer.allocUnsafe(4);
    const crcData = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(crcData), 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }

  // IHDR
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB (no alpha for simplicity)
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // IHDR with alpha (color type 6)
  ihdr[9] = 6; // RGBA

  // Build raw image data (filter byte + row)
  const rawRows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.allocUnsafe(1 + size * 4);
    row[0] = 0; // filter type None
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      row[1 + x * 4] = pixels[idx];
      row[1 + x * 4 + 1] = pixels[idx + 1];
      row[1 + x * 4 + 2] = pixels[idx + 2];
      row[1 + x * 4 + 3] = pixels[idx + 3];
    }
    rawRows.push(row);
  }
  const rawData = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawData, { level: 6 });

  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const png = Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);

  return png;
}

fs.writeFileSync('icon-192.png', createPNG(192));
fs.writeFileSync('icon-512.png', createPNG(512));
fs.writeFileSync('apple-touch-icon.png', createPNG(180));
console.log('Icons created!');
