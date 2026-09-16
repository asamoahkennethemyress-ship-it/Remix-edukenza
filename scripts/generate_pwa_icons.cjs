const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(width, height, getPixel) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const idx = 1 + x * 4;
      row[idx] = r;
      row[idx + 1] = g;
      row[idx + 2] = b;
      row[idx + 3] = a;
    }
    rawRows.push(row);
  }
  const rawData = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Check point in polygon
function pointInPoly(px, py, vertices) {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i][0], yi = vertices[i][1];
    const xj = vertices[j][0], yj = vertices[j][1];
    const intersect = ((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

function renderEdukenzaPixel(x, y, width, height, isMaskable) {
  // Normalize coordinates from -1 to +1
  const scale = isMaskable ? 0.72 : 0.88;
  const cx = width / 2;
  const cy = height / 2;
  const nx = (x - cx) / (cx * scale);
  const ny = (y - cy) / (cy * scale);

  // Background navy gradient: from #001738 at top to #000c20 at bottom
  const bgGrad = (y / height);
  let r = Math.round(0 + bgGrad * 0);
  let g = Math.round(23 - bgGrad * 12);
  let b = Math.round(56 - bgGrad * 24);
  let a = 255;

  // Outer border / glow ring for non-maskable rounded icon
  if (!isMaskable) {
    const distSq = (x - cx) ** 2 + (y - cy) ** 2;
    const maxR = (width / 2) * 0.96;
    if (distSq > maxR * maxR) {
      return [0, 0, 0, 0]; // transparent outside rounded boundary
    }
  }

  // 1. Graduation Cap - Diamond Mortarboard:
  // Vertices: Top (0, -0.42), Right (0.75, -0.18), Bottom (0, 0.04), Left (-0.75, -0.18)
  const capDiamond = [
    [0, -0.42],
    [0.72, -0.18],
    [0, 0.04],
    [-0.72, -0.18]
  ];
  const insideCap = pointInPoly(nx, ny, capDiamond);

  // 2. Cap Skull Base / Band:
  // Under the cap from left (-0.42, -0.12) to right (0.42, -0.12) down to (0, 0.22)
  const skullBase = [
    [-0.44, -0.06],
    [0.44, -0.06],
    [0.38, 0.16],
    [-0.38, 0.16]
  ];
  const insideSkull = pointInPoly(nx, ny, skullBase);

  // 3. Tassel cord & drop:
  const cordDist = distToSegment(nx, ny, 0, -0.18, 0.65, -0.05);
  const cordDropDist = distToSegment(nx, ny, 0.65, -0.05, 0.68, 0.25);
  const isCord = cordDist < 0.022 || cordDropDist < 0.024;
  const isTasselBob = Math.hypot(nx - 0.68, ny - 0.28) < 0.045;

  // 4. Open Book / Shield Chevron underneath (ny from 0.22 to 0.58)
  // Left page
  const leftPage = [
    [-0.03, 0.26],
    [-0.58, 0.20],
    [-0.52, 0.48],
    [-0.03, 0.54]
  ];
  // Right page
  const rightPage = [
    [0.03, 0.26],
    [0.58, 0.20],
    [0.52, 0.48],
    [0.03, 0.54]
  ];
  const insideLeftPage = pointInPoly(nx, ny, leftPage);
  const insideRightPage = pointInPoly(nx, ny, rightPage);

  // 5. Academic Star in Center Book Spine:
  const isCenterSpine = Math.abs(nx) < 0.025 && ny >= 0.24 && ny <= 0.54;

  // Render colors
  if (insideCap) {
    // Gold gradient with highlights
    // Gold: #F59E0B to #D97706, apex highlight #FEF3C7
    const highlight = Math.max(0, 1 - Math.hypot(nx, ny + 0.25) * 2.2);
    r = Math.round(245 + highlight * 10);
    g = Math.round(158 + highlight * 80);
    b = Math.round(11 + highlight * 160);
    return [Math.min(255, r), Math.min(255, g), Math.min(255, b), 255];
  }

  if (insideSkull) {
    // Deep royal navy with subtle gold border
    const borderDist = Math.min(
      Math.abs(ny - 0.16),
      Math.abs(Math.abs(nx) - 0.40)
    );
    if (borderDist < 0.03) {
      return [251, 191, 36, 255]; // amber-400
    }
    return [2, 35, 78, 255];
  }

  if (isCord || isTasselBob) {
    return [254, 240, 138, 255]; // bright gold
  }

  if (insideLeftPage || insideRightPage) {
    // Crisp clean parchment white/cream with subtle edge
    const isEdge = distToSegment(nx, ny, -0.58, 0.20, -0.52, 0.48) < 0.02 ||
                   distToSegment(nx, ny, 0.58, 0.20, 0.52, 0.48) < 0.02 ||
                   distToSegment(nx, ny, -0.52, 0.48, -0.03, 0.54) < 0.02 ||
                   distToSegment(nx, ny, 0.52, 0.48, 0.03, 0.54) < 0.02;
    if (isEdge) {
      return [217, 119, 6, 255]; // gold outline
    }
    // Book stripes (lines of text)
    const stripeY = ((ny - 0.28) / 0.05);
    const inStripe = Math.sin(stripeY * Math.PI * 2) > 0.4 && ny < 0.48 && Math.abs(nx) > 0.12 && Math.abs(nx) < 0.46;
    if (inStripe) {
      return [203, 213, 225, 255]; // subtle text slate
    }
    return [248, 250, 252, 255]; // page white
  }

  if (isCenterSpine) {
    return [245, 158, 11, 255]; // gold spine
  }

  return [r, g, b, a];
}

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Generate standard 192x192
console.log('Generating public/icon-192.png...');
const icon192 = createPng(192, 192, (x, y, w, h) => renderEdukenzaPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);

// 2. Generate maskable 192x192
console.log('Generating public/icon-192-maskable.png...');
const icon192Maskable = createPng(192, 192, (x, y, w, h) => renderEdukenzaPixel(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'icon-192-maskable.png'), icon192Maskable);

// 3. Generate standard 512x512
console.log('Generating public/icon-512.png...');
const icon512 = createPng(512, 512, (x, y, w, h) => renderEdukenzaPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);

// 4. Generate maskable 512x512
console.log('Generating public/icon-512-maskable.png...');
const icon512Maskable = createPng(512, 512, (x, y, w, h) => renderEdukenzaPixel(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'icon-512-maskable.png'), icon512Maskable);

// 5. Generate Apple Touch Icon 180x180
console.log('Generating public/apple-touch-icon.png...');
const appleIcon = createPng(180, 180, (x, y, w, h) => renderEdukenzaPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);

// 6. Generate Favicon 64x64
console.log('Generating public/favicon.png...');
const favicon = createPng(64, 64, (x, y, w, h) => renderEdukenzaPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'favicon.png'), favicon);

console.log('All PWA icons generated successfully in public/ directory!');
