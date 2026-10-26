#!/usr/bin/env node
/**
 * Visual review generator for the 128×128×128 / 32-unit tile migration.
 *
 * Produces, from the committed manifest and baked sprites (never hand-edited
 * images):
 *
 *   docs/review/scale-scene.png    representative world scene: mixed terrain,
 *                                  elevation steps, infantry, vehicles,
 *                                  aircraft, trees, ordinary buildings and the
 *                                  3×3 HQ, all blitted with the runtime anchors
 *   docs/review/scale-lineup.png   category lineups at true relative scale
 *   docs/review/before-after.png   old 64³ previews beside the re-scaled ones
 *   docs/review/scale-review.html  gallery + sizing matrix + rules
 *
 * Run: npm run voxels:review
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, encodePng, blit, scaleNearest } from './png.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'game_assets/voxels/sheets/manifest.json'), 'utf8'));
const VOXELS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/voxels.json'), 'utf8'));
const TERRAIN = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/terrain.json'), 'utf8'));
const OUT = path.join(ROOT, 'docs/review');
fs.mkdirSync(OUT, { recursive: true });

const TILE_W = MANIFEST.tileSize[0];   // 64
const TILE_H = MANIFEST.tileSize[1];   // 32
const HALF_W = TILE_W / 2;
const HALF_H = TILE_H / 2;

const sheetCache = new Map();
function sheet(modelId, facing = 'right', variant = '0') {
  const entry = MANIFEST.models[modelId];
  if (!entry) return null;
  const face = entry[facing] ?? entry.right;
  const v = face?.variants?.[variant] ?? face?.variants?.['0'] ?? face?.variants?.n;
  if (!v) return null;
  if (!sheetCache.has(v.file)) {
    sheetCache.set(v.file, decodePng(fs.readFileSync(path.join(ROOT, 'game_assets/voxels/sheets', v.file))));
  }
  return { image: sheetCache.get(v.file), face, variant: v };
}

/** Blits the first frame of a model with its runtime anchor at (ax, ay). */
function drawModel(dst, W, H, modelId, ax, ay, { facing = 'right', variant = '0', frame = 0 } = {}) {
  const s = sheet(modelId, facing, variant);
  if (!s) return false;
  const f = s.face.frames[Math.min(frame, s.face.frames.length - 1)];
  const scale = s.face.cell.w ? 1 : 1;
  blit(dst, W, H, s.image, f.x, f.y, f.w, f.h,
    Math.round(ax - f.anchorX * scale), Math.round(ay - f.anchorY * scale));
  return true;
}

function fillDiamond(dst, W, H, cx, cy, color) {
  const [r, g, b] = hex(color);
  for (let dy = -HALF_H; dy <= HALF_H; dy++) {
    const half = Math.round(HALF_W * (1 - Math.abs(dy) / HALF_H));
    const y = Math.round(cy + dy);
    if (y < 0 || y >= H) continue;
    for (let dx = -half; dx <= half; dx++) {
      const x = Math.round(cx + dx);
      if (x < 0 || x >= W) continue;
      const i = (y * W + x) * 4;
      dst[i] = r; dst[i + 1] = g; dst[i + 2] = b; dst[i + 3] = 255;
    }
  }
}

/**
 * Draws one exposed vertical cliff face as a stack of 1 px columns between two
 * points of the tile diamond's front edge, with the same reading as the runtime
 * painter: dark loam lip under the turf, stratified rock bands, and a slightly
 * lighter right-hand face so the light still comes from the upper left.
 */
function drawCliffFace(dst, W, H, x0, y0, x1, y1, drop, colors) {
  const steps = Math.max(1, Math.abs(x1 - x0));
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const x = Math.round(x0 + (x1 - x0) * t);
    const y = Math.round(y0 + (y1 - y0) * t);
    const shade = (i >> 2) % 2 === 0 ? colors.base : colors.alt;
    fillRect(dst, W, H, x, y, 1, drop, shade);
    fillRect(dst, W, H, x, y, 1, Math.min(2, drop), colors.loam);
    for (let dy = 4; dy < drop; dy += 4) fillRect(dst, W, H, x, y + dy, 1, 1, colors.seam);
  }
}

const CLIFF_SOUTH = { base: '#5b4a33', alt: '#54432e', loam: '#3f3423', seam: '#463a28' };
const CLIFF_EAST = { base: '#6d5b3f', alt: '#7b6748', loam: '#463a28', seam: '#54452f' };

function hex(c) {
  const h = c.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function gridToIso(x, y, elevation = 0, ox, oy) {
  return { x: ox + (x - y) * HALF_W, y: oy + (x + y) * HALF_H - elevation };
}

/** Iso scene renderer: terrain diamonds + anchored sprites in painter order. */
function renderScene({ width, height, originX, originY, tiles, props, units, background = '#12161c', zoom = 2 }) {
  const W = width, H = height;
  const px = Buffer.alloc(W * H * 4);
  const [br, bg, bb] = hex(background);
  for (let i = 0; i < W * H; i++) {
    px[i * 4] = br; px[i * 4 + 1] = bg; px[i * 4 + 2] = bb; px[i * 4 + 3] = 255;
  }
  const tileBy = new Map(tiles.map(t => [`${t.x},${t.y}`, t]));
  const cells = [...tileBy.keys()].map(k => k.split(',').map(Number))
    .sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]) || a[1] - b[1] || a[0] - b[0]);

  // 1. Ground layer: exposed cliff faces first, then the terrain diamond.
  //    Only faces whose neighbour is lower are drawn (and only for that drop),
  //    exactly like the runtime's drawTileExposedCliffs.
  for (const [x, y] of cells) {
    const t = tileBy.get(`${x},${y}`);
    const iso = gridToIso(x, y, t.elevation, originX, originY);
    const eastN = tileBy.get(`${x + 1},${y}`)?.elevation ?? 0;
    const southN = tileBy.get(`${x},${y + 1}`)?.elevation ?? 0;
    const dropEast = Math.max(0, t.elevation - eastN);
    const dropSouth = Math.max(0, t.elevation - southN);
    if (dropSouth > 0) {
      drawCliffFace(px, W, H, iso.x - HALF_W, iso.y, iso.x, iso.y + HALF_H, dropSouth, CLIFF_SOUTH);
    }
    if (dropEast > 0) {
      drawCliffFace(px, W, H, iso.x, iso.y + HALF_H, iso.x + HALF_W, iso.y, dropEast, CLIFF_EAST);
    }
    const pal = TERRAIN.terrains[t.terrain]?.palette ?? TERRAIN.terrains.plains.palette;
    fillDiamond(px, W, H, iso.x, iso.y, pal.top);
    const seed = (x * 7 + y * 13) & 3;
    const alt = pal.topAlt ?? pal.top;
    const tuft = pal.highlight ?? pal.topAlt ?? pal.top;
    const dark = pal.topDark ?? pal.top;
    const flecks = [[-14, -1, alt], [-6, -6, tuft], [5, -5, alt], [12, 0, tuft], [-8, 4, dark]];
    for (let i = 0; i < flecks.length; i++) {
      const [dx, dy, col] = flecks[(i + seed) % flecks.length];
      fillRect(px, W, H, iso.x + dx, iso.y + dy, 3, 2, col);
    }
  }

  // 2. Object layer in painter order. Buildings and units are drawn per occupied
  //    front-most cell (the runtime's layerOrder = 1/3 rule), so a multi-tile
  //    compound is painted once, above the ground it covers.
  const drawQueue = [];
  for (const p of props) {
    const fp = p.footprint ?? [1, 1];
    const front = { x: p.x + fp[0] - 1, y: p.y + fp[1] - 1 };
    drawQueue.push({ depth: front.x + front.y, order: front.y, p });
  }
  for (const u of units) drawQueue.push({ depth: u.x + u.y, order: u.y, p: u });
  drawQueue.sort((a, b) => a.depth - b.depth || a.order - b.order);
  for (const { p } of drawQueue) {
    const t = tileBy.get(`${p.x},${p.y}`) ?? { elevation: 0 };
    if (p.kind === 'prop') {
      const iso = gridToIso(p.x, p.y, t.elevation, originX, originY);
      drawModel(px, W, H, p.model, iso.x, iso.y, { facing: p.facing ?? 'right', variant: p.variant ?? 'n' });
    } else if (p.kind === 'building') {
      const fp = p.footprint ?? [1, 1];
      const c = gridToIso(p.x + (fp[0] - 1) / 2, p.y + (fp[1] - 1) / 2, t.elevation, originX, originY);
      drawModel(px, W, H, p.model, c.x, c.y, { facing: p.facing ?? 'right', variant: p.variant ?? '0' });
    } else {
      const iso = gridToIso(p.x, p.y, t.elevation, originX, originY);
      drawModel(px, W, H, p.model, iso.x, iso.y, { facing: p.facing ?? 'right', variant: p.variant ?? '0' });
    }
  }
  if (zoom === 1) return { pixels: px, width: W, height: H };
  return { pixels: scaleNearest(px, W, H, zoom), width: W * zoom, height: H * zoom };
}

function fillDiamondColor(dst, W, H, cx, cy, rgb) {
  for (let dy = -HALF_H; dy <= HALF_H; dy++) {
    const half = Math.round(HALF_W * (1 - Math.abs(dy) / HALF_H));
    const y = Math.round(cy + dy);
    if (y < 0 || y >= H) continue;
    for (let dx = -half; dx <= half; dx++) {
      const x = Math.round(cx + dx);
      if (x < 0 || x >= W) continue;
      const i = (y * W + x) * 4;
      dst[i] = rgb[0]; dst[i + 1] = rgb[1]; dst[i + 2] = rgb[2]; dst[i + 3] = 255;
    }
  }
}

function fillRect(dst, W, H, x, y, w, h, color) {
  const [r, g, b] = hex(color);
  for (let dy = 0; dy < h; dy++) {
    const ty = Math.round(y + dy);
    if (ty < 0 || ty >= H) continue;
    for (let dx = 0; dx < w; dx++) {
      const tx = Math.round(x + dx);
      if (tx < 0 || tx >= W) continue;
      const i = (ty * W + tx) * 4;
      dst[i] = r; dst[i + 1] = g; dst[i + 2] = b; dst[i + 3] = 255;
    }
  }
}


/* --------------------------------------------------------------- labels -- */
// 5×7 bitmap font (32..95) — small enough to stay in-file, enough for the
// ASCII labels the review sheets need (names, tile footprints, counts).
const FONT = {
  ' ': ['00000','00000','00000','00000','00000','00000','00000'],
  '-': ['00000','00000','00000','11111','00000','00000','00000'],
  '.': ['00000','00000','00000','00000','00000','01100','01100'],
  ':': ['00000','01100','01100','00000','01100','01100','00000'],
  '/': ['00001','00010','00100','01000','10000','00000','00000'],
  '(': ['00110','01100','11000','11000','11000','01100','00110'],
  ')': ['11000','01100','00110','00110','00110','01100','11000'],
  '+': ['00000','00100','00100','11111','00100','00100','00000'],
  '=': ['00000','00000','11111','00000','11111','00000','00000'],
  '×': ['00000','10001','01010','00100','01010','10001','00000'],
  '0': ['01110','10001','10011','10101','11001','10001','01110'],
  '1': ['00100','01100','00100','00100','00100','00100','01110'],
  '2': ['01110','10001','00001','00010','00100','01000','11111'],
  '3': ['11111','00010','00100','00010','00001','10001','01110'],
  '4': ['00010','00110','01010','10010','11111','00010','00010'],
  '5': ['11111','10000','11110','00001','00001','10001','01110'],
  '6': ['00110','01000','10000','11110','10001','10001','01110'],
  '7': ['11111','00001','00010','00100','01000','01000','01000'],
  '8': ['01110','10001','10001','01110','10001','10001','01110'],
  '9': ['01110','10001','10001','01111','00001','00010','01100'],
  'A': ['01110','10001','10001','11111','10001','10001','10001'],
  'B': ['11110','10001','10001','11110','10001','10001','11110'],
  'C': ['01110','10001','10000','10000','10000','10001','01110'],
  'D': ['11100','10010','10001','10001','10001','10010','11100'],
  'E': ['11111','10000','10000','11110','10000','10000','11111'],
  'F': ['11111','10000','10000','11110','10000','10000','10000'],
  'G': ['01110','10001','10000','10111','10001','10001','01111'],
  'H': ['10001','10001','10001','11111','10001','10001','10001'],
  'I': ['01110','00100','00100','00100','00100','00100','01110'],
  'J': ['00111','00010','00010','00010','00010','10010','01100'],
  'K': ['10001','10010','10100','11000','10100','10010','10001'],
  'L': ['10000','10000','10000','10000','10000','10000','11111'],
  'M': ['10001','11011','10101','10101','10001','10001','10001'],
  'N': ['10001','11001','10101','10011','10001','10001','10001'],
  'O': ['01110','10001','10001','10001','10001','10001','01110'],
  'P': ['11110','10001','10001','11110','10000','10000','10000'],
  'Q': ['01110','10001','10001','10001','10101','10010','01101'],
  'R': ['11110','10001','10001','11110','10100','10010','10001'],
  'S': ['01111','10000','10000','01110','00001','00001','11110'],
  'T': ['11111','00100','00100','00100','00100','00100','00100'],
  'U': ['10001','10001','10001','10001','10001','10001','01110'],
  'V': ['10001','10001','10001','10001','10001','01010','00100'],
  'W': ['10001','10001','10001','10101','10101','11011','10001'],
  'X': ['10001','10001','01010','00100','01010','10001','10001'],
  'Y': ['10001','10001','01010','00100','00100','00100','00100'],
  'Z': ['11111','00001','00010','00100','01000','10000','11111'],
};

function drawText(dst, W, H, x, y, text, color = '#dbe3ec', scale = 1) {
  const [r, g, b] = hex(color);
  let cx = x;
  for (const ch of String(text).toUpperCase()) {
    const glyph = FONT[ch] ?? FONT[' '];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row][col] !== '1') continue;
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = Math.round(cx + col * scale + sx);
            const py = Math.round(y + row * scale + sy);
            if (px < 0 || px >= W || py < 0 || py >= H) continue;
            const i = (py * W + px) * 4;
            dst[i] = r; dst[i + 1] = g; dst[i + 2] = b; dst[i + 3] = 255;
          }
        }
      }
    }
    cx += 6 * scale;
  }
  return cx;
}

function textWidth(text, scale = 1) { return String(text).length * 6 * scale; }

/* ------------------------------------------------------------- scene ---- */
function buildScene() {
  const tiles = [];
  const props = [];
  const units = [];
  const W = 1260, H = 760;
  const originX = W / 2, originY = 200;
  const gridW = 14, gridH = 12;
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      let terrain = 'plains';
      let elevation = 0;
      if (x <= 2 && y <= 1) elevation = 8;
      else if (x <= 2 && y <= 2) elevation = 4;
      if (x === 10 && y < 9) terrain = 'river';
      if (x === 10 && y === 5) terrain = 'bridge';
      if (x >= 12 || (x === 11 && y >= 8)) terrain = 'sea';
      if (x >= 11 && y >= 3 && y <= 5 && x <= 13) terrain = 'plains';
      if (x === 11 && (y === 6 || y === 7)) terrain = 'shoal';
      if (y === 9 && x < 9) terrain = 'road';
      if ((x === 3 && y === 1) || (x === 6 && y === 0) || (x === 10 && y === 2)) terrain = 'tree';
      if (x === 0 && y === 3) terrain = 'mountain';
      if (x === 7 && y === 6) terrain = 'tree';
      if (x === 5 && y === 11) terrain = 'wall';
      if (x === 6 && y === 11) terrain = 'wall';
      tiles.push({ x, y, terrain, elevation });
    }
  }
  const tileAt = (x, y) => tiles.find(t => t.x === x && t.y === y);
  for (const [x, y] of [[3, 1], [6, 0], [10, 2], [7, 6], [0, 3]]) {
    props.push({ kind: 'prop', x, y, model: tileAt(x, y).terrain, variant: 'n' });
  }
  props.push({ kind: 'prop', x: 10, y: 5, model: 'bridge-ew', variant: 'n' });
  props.push({ kind: 'prop', x: 5, y: 11, model: 'wall-standard', variant: 'n' });
  props.push({ kind: 'prop', x: 6, y: 11, model: 'wall-standard', variant: 'n' });
  props.push({ kind: 'building', x: 3, y: 5, model: 'hq', footprint: [3, 3], variant: '0' });
  props.push({ kind: 'building', x: 8, y: 6, model: 'base', footprint: [2, 2], variant: '1' });
  props.push({ kind: 'building', x: 7, y: 8, model: 'depot', footprint: [2, 2], variant: '2' });
  props.push({ kind: 'building', x: 6, y: 3, model: 'barracks', footprint: [2, 2], variant: '2' });
  props.push({ kind: 'building', x: 0, y: 10, model: 'power-plant', footprint: [2, 2], variant: '3' });
  props.push({ kind: 'building', x: 1, y: 5, model: 'pillbox', footprint: [1, 1], variant: '3' });
  props.push({ kind: 'building', x: 1, y: 7, model: 'guard-tower', footprint: [1, 1], variant: '0' });
  props.push({ kind: 'building', x: 6, y: 7, model: 'sam-site', footprint: [1, 1], variant: '2' });
  props.push({ kind: 'building', x: 11, y: 3, model: 'airport', footprint: [3, 3], variant: '0' });
  // (airport footprint 11..13 × 3..5 stays on land left of the sea band)
  const lineup = [
    ['infantry', 3, 9, 'right', '0'],
    ['infantry', 4, 9, 'down', '1'],
    ['engineer', 5, 9, 'up', '2'],
    ['tank', 3, 10, 'right', '0'],
    ['tank', 4, 10, 'up-right', '1'],
    ['heavy', 5, 10, 'right', '2'],
    ['artillery', 7, 9, 'down-right', '0'],
    ['recon', 7, 10, 'right', '1'],
    ['apc', 8, 10, 'right', '0'],
    ['copter', 8, 4, 'down', '0'],
    ['fighter', 10, 7, 'right', '0'],
    ['bomber', 11, 8, 'left', '1'],
    ['gunboat', 12, 9, 'down-left', '0'],
    ['battleship', 12, 10, 'left', '2'],
    ['destroyer', 13, 8, 'left', '1'],
  ];
  for (const [model, x, y, facing, variant] of lineup) {
    units.push({ kind: 'unit', x, y, model, facing, variant });
  }
  return renderScene({ width: W, height: H, originX, originY, tiles, props, units, background: '#101418' });
}

/* ------------------------------------------------------------- lineups -- */
function buildLineup(rows) {
  const pad = 20, rowH = 168;
  const W = 1320;
  const H = pad + rows.reduce((sum, r) => sum + rowH, 0) + pad;
  const px = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) { px[i * 4] = 16; px[i * 4 + 1] = 20; px[i * 4 + 2] = 26; px[i * 4 + 3] = 255; }
  let y = pad;
  for (const row of rows) {
    drawText(px, W, H, pad, y, row.title, '#8fb2d8', 2);
    let x = pad;
    const baseline = y + rowH - 58;
    for (const item of row.items) {
      const modelId = typeof item === 'string' ? item : item.id;
      const variant = typeof item === 'string' ? '0' : (item.variant ?? '0');
      const facing = typeof item === 'string' ? 'right' : (item.facing ?? 'right');
      const s2 = sheet(modelId, facing, variant);
      if (!s2) continue;
      const f = s2.face.frames[0];
      const slot = Math.max(f.w + 24, textWidth(modelId, 1) + 14, 78);
      if (x + slot > W - pad) break;
      drawModel(px, W, H, modelId, x + Math.floor(slot / 2), baseline, { facing, variant });
      drawText(px, W, H, x + 4, baseline + 12, modelId, '#c8d2de', 1);
      if (item.note) drawText(px, W, H, x + 4, baseline + 22, item.note, '#7f8c9b', 1);
      x += slot;
    }
    y += rowH;
  }
  return { pixels: px, width: W, height: H };
}

/* --------------------------------------------------------- before/after - */
function buildBeforeAfter(pairs) {
  const cols = pairs.length;
  const colW = 230, rowH = 210, pad = 18, headH = 40;
  const W = cols * colW + pad * 2;
  const H = headH + rowH * 2 + pad;
  const px = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) { px[i * 4] = 14; px[i * 4 + 1] = 18; px[i * 4 + 2] = 24; px[i * 4 + 3] = 255; }
  drawText(px, W, H, pad, 10, 'BEFORE — 64 CUBE, ONE 64PX TILE', '#d8a06a', 2);
  drawText(px, W, H, pad, headH + rowH - 6, 'AFTER — 128 CUBE, 32 UNIT TILES', '#78c08a', 2);
  pairs.forEach((p, i) => {
    const cx = pad + i * colW + colW / 2;
    drawText(px, W, H, pad + i * colW + 6, H - 22, p.id, '#9fb0c4', 1);
    const draw = (imgPath, cy) => {
      if (!fs.existsSync(imgPath)) return;
      const img = decodePng(fs.readFileSync(imgPath));
      const factor = Math.max(1, Math.floor(170 / Math.max(img.width, img.height)));
      const scaled = factor > 1 ? scaleNearest(img.pixels, img.width, img.height, factor) : img.pixels;
      const sw = img.width * factor, sh = img.height * factor;
      blit(px, W, H, { width: sw, height: sh, pixels: scaled }, 0, 0, sw, sh,
        Math.round(cx - sw / 2), Math.round(cy - sh / 2));
    };
    draw(p.before, headH + rowH / 2 + 8);
    draw(p.after, headH + rowH + rowH / 2 + 2);
  });
  return { pixels: px, width: W, height: H };
}

/* ---------------------------------------------------------------- main -- */
const scene = buildScene();
fs.writeFileSync(path.join(OUT, 'scale-scene.png'), encodePng(scene.width, scene.height, scene.pixels));

const lineup = buildLineup([
  {
    title: 'INFANTRY — ONE 32 UNIT TILE, HUMAN SIZED',
    items: [
      { id: 'infantry', note: 'rifleman' }, { id: 'engineer', note: 'engineer' },
      { id: 'medic', note: 'medic' }, { id: 'commando', note: 'commando' },
      { id: 'rocket-infantry', note: 'AT' }, { id: 'attack-dog', note: 'K9' },
    ],
  },
  {
    title: 'VEHICLES — LIGHT TO HEAVY',
    items: [
      { id: 'recon', note: 'scout' }, { id: 'apc', note: 'APC' },
      { id: 'tank', note: 'MBT' }, { id: 'heavy', note: 'heavy' },
      { id: 'artillery', note: 'SPG' }, { id: 'antiair', note: 'AAA' },
      { id: 'rockets', note: 'MLRS' }, { id: 'mega', note: 'siege' },
    ],
  },
  {
    title: 'AIRCRAFT AND NAVAL — WINGSPAN AND HULL LENGTH',
    items: [
      { id: 'copter', note: 'rotor' }, { id: 'fighter', note: 'fighter' },
      { id: 'bomber', note: 'bomber' }, { id: 'gunboat', note: 'gunboat' },
      { id: 'destroyer', note: 'destroyer' }, { id: 'cruiser', note: 'cruiser' },
      { id: 'battleship', note: 'BBS' }, { id: 'carrier', note: 'CV' },
    ],
  },
  {
    title: 'SMALL STRUCTURES — 1X1 TILE',
    items: [
      { id: 'landmine', note: '1x1' }, { id: 'pillbox', note: '1x1' },
      { id: 'bunker', note: '1x1' }, { id: 'at-turret', note: '1x1' },
      { id: 'sam-site', note: '1x1' }, { id: 'flak-cannon', note: '1x1' },
      { id: 'artillery-emplacement', note: '1x1' }, { id: 'guard-tower', note: '1x1' },
    ],
  },
  {
    title: 'FACILITIES — 2X2 AND MAJOR 3X3 / 3X2 COMPOUNDS',
    items: [
      { id: 'barracks', note: '2x2' }, { id: 'base', note: '2x2' },
      { id: 'power-plant', note: '2x2' }, { id: 'city', note: '2x2' },
      { id: 'hq', note: '3x3' }, { id: 'airport', note: '3x3' },
      { id: 'port', note: '3x2' },
    ],
  },
  {
    title: 'TERRAIN AND PROPS — TILE CELLS AND ENVIRONMENT',
    items: [
      { id: 'elevation-00', variant: 'n', note: 'ground' },
      { id: 'elevation-08', variant: 'n', note: 'elev 8' },
      { id: 'elevation-32', variant: 'n', note: 'elev 32' },
      { id: 'road-5', variant: 'n', note: 'road' },
      { id: 'bridge-ew', variant: 'n', note: 'bridge' },
      { id: 'wall-standard', variant: 'n', note: 'wall' },
      { id: 'tree', variant: 'n', note: 'woods' },
      { id: 'mountain', variant: 'n', note: 'mountain' },
    ],
  },
]);
fs.writeFileSync(path.join(OUT, 'scale-lineup.png'), encodePng(lineup.width, lineup.height, lineup.pixels));

const pairs = ['infantry', 'tank', 'tree', 'pillbox', 'airport', 'hq'].map(id => ({
  id,
  before: path.join(OUT, 'before', `${id}.png`),
  after: path.join(ROOT, 'game_assets/voxels', `${id}.png`),
}));
const ba = buildBeforeAfter(pairs);
fs.writeFileSync(path.join(OUT, 'before-after.png'), encodePng(ba.width, ba.height, ba.pixels));

console.log(`Wrote docs/review/scale-scene.png (${scene.width}×${scene.height})`);
console.log(`Wrote docs/review/scale-lineup.png (${lineup.width}×${lineup.height})`);
console.log(`Wrote docs/review/before-after.png (${ba.width}×${ba.height})`);
