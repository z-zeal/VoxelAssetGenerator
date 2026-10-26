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
import { rasterize, downsampleCell, rotateVoxels, BUF_W, BUF_H } from './bake.mjs';
import { HANGAR_PLAN } from './models/hangar.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'game_assets/voxels/sheets/manifest.json'), 'utf8'));
const VOXELS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/voxels.json'), 'utf8'));
const TERRAIN = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/terrain.json'), 'utf8'));
const OUT = path.join(ROOT, 'docs/review');
fs.mkdirSync(OUT, { recursive: true });

const TILE_W = MANIFEST.tileSize[0];   // 128
const TILE_H = MANIFEST.tileSize[1];   // 64
const VOXEL_Z_PX = MANIFEST.voxelZPx ?? 2; // screen px per world voxel of height
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


/** Lighten/darken a #rrggbb colour by a factor (elevation tinting). */
function shadeHex(color, factor) {
  const [r, g, b] = hex(color);
  const c = v => Math.max(0, Math.min(255, Math.round(v * factor)));
  return `#${[c(r), c(g), c(b)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function gridToIso(x, y, elevation = 0, ox, oy) {
  // `elevation` is in world voxels; a voxel is VOXEL_Z_PX screen px tall, so a
  // level-4 step lifts the tile by 8 px (2 px per voxel at 4 px/voxel x).
  return { x: ox + (x - y) * HALF_W, y: oy + (x + y) * HALF_H - elevation * VOXEL_Z_PX };
}

/** Iso scene renderer: terrain diamonds + anchored sprites in painter order. */
function renderScene({ width, height, originX, originY, tiles, props, units, background = '#12161c', zoom = 1 }) {
  const W = width, H = height;
  const px = Buffer.alloc(W * H * 4);
  const [br, bg, bb] = hex(background);
  for (let i = 0; i < W * H; i++) {
    px[i * 4] = br; px[i * 4 + 1] = bg; px[i * 4 + 2] = bb; px[i * 4 + 3] = 255;
  }
  const tileBy = new Map(tiles.map(t => [`${t.x},${t.y}`, t]));
  const cells = [...tileBy.keys()].map(k => k.split(',').map(Number))
    .sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]) || a[1] - b[1] || a[0] - b[0]);

  // 1a. Ground tops, painted far to near. Every tile is one 128×64 diamond
  //     lifted by its elevation, so the raised terraces leave gaps on their
  //     south/east edges — those are filled by the wall pass below.
  const terrainPal = new Map();
  for (const [x, y] of cells) {
    const t = tileBy.get(`${x},${y}`);
    const iso = gridToIso(x, y, t.elevation, originX, originY);
    // Higher ground is lit slightly brighter, the way a shaded heightfield
    // reads. Without it a raised terrace is the same green as the plain and the
    // cliff edge looks like a crack in the grass instead of a step.
    const raw = TERRAIN.terrains[t.terrain]?.palette ?? TERRAIN.terrains.plains.palette;
    const tint = 1 + (t.elevation / 32) * 0.16;
    const pal = {
      top: shadeHex(raw.top, tint),
      topAlt: raw.topAlt ? shadeHex(raw.topAlt, tint) : undefined,
      highlight: raw.highlight ? shadeHex(raw.highlight, tint) : undefined,
      topDark: raw.topDark ? shadeHex(raw.topDark, tint) : undefined,
    };
    terrainPal.set(`${x},${y}`, pal);
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

  // 1b. Exposed cliff walls, still far to near, drawn ON TOP of the ground.
  //     A wall only exists where the neighbour is lower, and it hangs exactly
  //     `drop * VOXEL_Z_PX` px below the shared edge — 8 px per 4-level step.
  //     Drawing them after the tops is what stops nearer tiles from eating the
  //     lower half of every cliff.
  for (const [x, y] of cells) {
    const t = tileBy.get(`${x},${y}`);
    if (!t.elevation) continue;
    const iso = gridToIso(x, y, t.elevation, originX, originY);
    const eastN = tileBy.get(`${x + 1},${y}`)?.elevation ?? 0;
    const southN = tileBy.get(`${x},${y + 1}`)?.elevation ?? 0;
    const dropSouth = Math.max(0, t.elevation - southN) * VOXEL_Z_PX;
    const dropEast = Math.max(0, t.elevation - eastN) * VOXEL_Z_PX;
    if (dropSouth > 0) {
      drawCliffFace(px, W, H, iso.x - HALF_W, iso.y, iso.x, iso.y + HALF_H, dropSouth, CLIFF_SOUTH);
    }
    if (dropEast > 0) {
      drawCliffFace(px, W, H, iso.x, iso.y + HALF_H, iso.x + HALF_W, iso.y, dropEast, CLIFF_EAST);
    }
    // The two faces meet at the bottom vertex; fill that column so the corner
    // never shows a 1 px slit of background.
    const corner = Math.max(dropSouth, dropEast);
    if (corner > 0) fillRect(px, W, H, iso.x, iso.y + HALF_H, 1, corner, CLIFF_SOUTH.base);
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

function strokeRect(dst, W, H, x, y, w, h, color) {
  fillRect(dst, W, H, x, y, w, 1, color);
  fillRect(dst, W, H, x, y + h - 1, w, 1, color);
  fillRect(dst, W, H, x, y, 1, h, color);
  fillRect(dst, W, H, x + w - 1, y, 1, h, color);
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
  const W = 2420, H = 1340;
  const originX = W / 2, originY = 330;
  const gridW = 14, gridH = 12;
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      let terrain = 'plains';
      let elevation = 0;
      // A two-step hill in the interior: a level-24 plateau (48 px above the
      // plain) on a level-8 apron, so the cliffs are 32 px and 16 px tall and
      // the elevation scale is visible at 1:1. Keeping it away from the map
      // corner matters — a plateau against the border reads as a floating slab
      // because its back edges run off the map instead of meeting ground.
      if (x >= 2 && x <= 4 && y >= 2 && y <= 3) elevation = 24;
      else if (x >= 1 && x <= 5 && y >= 1 && y <= 4) elevation = 8;
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

/**
 * Trim a rendered sheet to its painted content plus `pad` px of background, so a
 * scene sized generously for tall compounds does not ship with empty margins.
 * The render fills the canvas with an opaque background colour, so "content" is
 * any pixel that differs from that colour.
 */
function cropToContent(img, pad = 28) {
  const { width: W, height: H, pixels: px } = img;
  const bg = [px[0], px[1], px[2]];
  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (px[i] !== bg[0] || px[i + 1] !== bg[1] || px[i + 2] !== bg[2]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return img;
  const x0 = Math.max(0, minX - pad), y0 = Math.max(0, minY - pad);
  const x1 = Math.min(W - 1, maxX + pad), y1 = Math.min(H - 1, maxY + pad);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const out = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    px.copy(out, y * cw * 4, ((y0 + y) * W + x0) * 4, ((y0 + y) * W + x0 + cw) * 4);
  }
  return { width: cw, height: ch, pixels: out };
}


/** Filled isometric diamond of an arbitrary size (ground footprint guides). */
function fillDiamondSize(dst, W, H, cx, cy, hw, hh, color) {
  const [r, g, b] = hex(color);
  for (let dy = -hh; dy <= hh; dy++) {
    const half = Math.round(hw * (1 - Math.abs(dy) / hh));
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

/** 1 px isometric diamond outline (footprint edge). */
function strokeDiamond(dst, W, H, cx, cy, hw, hh, color) {
  const [r, g, b] = hex(color);
  for (let dy = -hh; dy <= hh; dy++) {
    const half = Math.round(hw * (1 - Math.abs(dy) / hh));
    const y = Math.round(cy + dy);
    if (y < 0 || y >= H) continue;
    for (const dx of (half === 0 ? [0] : [-half, half])) {
      const x = Math.round(cx + dx);
      if (x < 0 || x >= W) continue;
      const i = (y * W + x) * 4;
      dst[i] = r; dst[i + 1] = g; dst[i + 2] = b; dst[i + 3] = 255;
    }
  }
}

/**
 * Ground-footprint guide drawn under a sprite: the exact diamond the model
 * covers at its declared footprint, plus a one-tile reference diamond so a
 * 1.75-tile tank is directly comparable to a 1-tile rifleman.
 */
const FOOTPRINT_FILL = '#1f2b39';
const FOOTPRINT_EDGE = '#5b7593';
const TILE_REF_EDGE = '#4fc98a';
function drawFootprintGuide(dst, W, H, modelId, ax, ay) {
  const meta = MANIFEST.models[modelId]?.meta;
  const fp = meta?.footprint ?? [1, 1];
  const hw = Math.max(1, Math.round((fp[0] ?? 1) * HALF_W));
  const hh = Math.max(1, Math.round((fp[1] ?? 1) * HALF_H));
  fillDiamondSize(dst, W, H, ax, ay, hw, hh, FOOTPRINT_FILL);
  strokeDiamond(dst, W, H, ax, ay, hw, hh, FOOTPRINT_EDGE);
  const bigger = hw > HALF_W || hh > HALF_H;
  if (bigger) strokeDiamond(dst, W, H, ax, ay, HALF_W, HALF_H, TILE_REF_EDGE);
  return { fp, hw, hh, overTile: bigger };
}

/* ------------------------------------------------------------- lineups -- */
function buildLineup(rows) {
  const pad = 20, titleH = 34, gapX = 14, labelH = 44, legendH = 132;
  const W = 1600;
  const BG = [16, 20, 26];

  // Lay every category out on a shared 1:1 pixel grid, wrapping when a slot no
  // longer fits, so nothing is silently dropped from the sheet.
  const layout = [];
  for (const row of rows) {
    const items = [];
    for (const item of row.items) {
      const modelId = typeof item === 'string' ? item : item.id;
      const variant = typeof item === 'string' ? '0' : (item.variant ?? '0');
      const facing = typeof item === 'string' ? 'right' : (item.facing ?? 'right');
      const s2 = sheet(modelId, facing, variant);
      if (!s2) continue;
      const f = s2.face.frames[0];
      const meta = MANIFEST.models[modelId]?.meta;
      const fp = meta?.footprint ?? [1, 1];
      const guided = meta?.kind === 'unit';
      const guideW = guided ? Math.round(fp[0] * TILE_W) + 30 : 0;
      // The caption is two lines: the id, then "<note> - <size class> tile".
      const caption = `${(item.note ?? '').toUpperCase()}${item.note ? ' - ' : ''}${fp[0]}X${fp[1]} TILE`;
      const slot = Math.max(f.w + 34, guideW,
        textWidth(modelId, 1) + 26, textWidth(caption, 1) + 46, 100);
      const above = Math.max(f.anchorY, guided ? Math.round(fp[1] * HALF_H) : 0);
      const below = Math.max(f.h - f.anchorY, guided ? Math.round(fp[1] * HALF_H) : 0);
      items.push({ modelId, variant, facing, f, fp, meta, guided, slot, above, below, note: item.note });
    }
    const lines = [];
    let line = null;
    for (const it of items) {
      if (!line || line.x + it.slot > W - pad) {
        line = { items: [], x: pad, above: 0, below: 0 };
        lines.push(line);
      }
      line.items.push(it);
      line.x += it.slot;
      line.above = Math.max(line.above, it.above);
      line.below = Math.max(line.below, it.below);
    }
    layout.push({ row, lines });
  }

  const H = pad + layout.reduce((sum, sec) => sum
    + titleH + sec.lines.reduce((a, l) => a + l.above + l.below + labelH + 16, 0), 0)
    + legendH + pad;
  const px = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) { px[i * 4] = BG[0]; px[i * 4 + 1] = BG[1]; px[i * 4 + 2] = BG[2]; px[i * 4 + 3] = 255; }

  let y = pad;
  for (const sec of layout) {
    drawText(px, W, H, pad, y, sec.row.title, '#8fb2d8', 2);
    y += titleH;
    for (const line of sec.lines) {
      const baseline = y + line.above;
      let x = pad;
      for (const it of line.items) {
        const ax = x + Math.floor(it.slot / 2);
        if (it.guided) drawFootprintGuide(px, W, H, it.modelId, ax, baseline);
        drawModel(px, W, H, it.modelId, ax, baseline, { facing: it.facing, variant: it.variant });
        drawText(px, W, H, x + 2, baseline + line.below + 10, it.modelId, '#c8d2de', 1);
        const sizeLabel = it.guided ? `${it.fp[0]}X${it.fp[1]} TILE` : `${it.fp[0]}X${it.fp[1]}`;
        const note = it.note ? `${it.note.toUpperCase()} - ${sizeLabel}` : sizeLabel;
        drawText(px, W, H, x + 2, baseline + line.below + 22, note, '#7f8c9b', 1);
        x += it.slot;
      }
      y += line.above + line.below + labelH + 16;
    }
    y += 8;
  }

  // Legend: what the two diamonds mean, drawn at the same 1:1 scale.
  const ly = H - legendH + 18;
  drawText(px, W, H, pad, ly, 'GROUND GUIDE', '#8fb2d8', 2);
  const lcy = ly + 58;
  let lx = pad + 12;
  fillDiamondSize(px, W, H, lx + 64, lcy, HALF_W, HALF_H, FOOTPRINT_FILL);
  strokeDiamond(px, W, H, lx + 64, lcy, HALF_W, HALF_H, FOOTPRINT_EDGE);
  drawText(px, W, H, lx, lcy + 42, '1 TILE = 32 VOXELS = 128X64 PX', '#a7b4c4', 1);
  lx += 370;
  const hw = Math.round(1.25 * HALF_W), hh = Math.round(1.25 * HALF_H);
  fillDiamondSize(px, W, H, lx + 100, lcy, hw, hh, FOOTPRINT_FILL);
  strokeDiamond(px, W, H, lx + 100, lcy, hw, hh, FOOTPRINT_EDGE);
  strokeDiamond(px, W, H, lx + 100, lcy, HALF_W, HALF_H, TILE_REF_EDGE);
  drawText(px, W, H, lx, lcy + 42, '1.25 TILES (BATTLESHIP) - GREEN DIAMOND = ONE TILE', '#a7b4c4', 1);
  lx += 520;
  drawText(px, W, H, lx, lcy - 12, 'EVERY SPRITE IS DRAWN ONE IMAGE PIXEL PER SCREEN PIXEL', '#7f8c9b', 1);
  drawText(px, W, H, lx, lcy, 'ON A SHARED BASELINE - THE SIZES YOU SEE ARE THE SIZES', '#7f8c9b', 1);
  drawText(px, W, H, lx, lcy + 12, 'THE RUNTIME BLITS. NOTHING IS NORMALISED OR RESCALED.', '#7f8c9b', 1);
  return { pixels: px, width: W, height: H };
}

/* ------------------------------------------------------- unit size wall -- */
/**
 * Every unit type at 1:1 on one continuous tile grid, grouped by size class.
 * Each sprite is anchored on its own tile diamond and the diamonds tile the
 * row, so the hierarchy reads the way it does on the map: no per-card slots, no
 * padding, nothing normalised.
 */
function buildSizeWall() {
  const pad = 22;
  const CLASSES = [0.5, 0.75, 1, 1.25];
  const ids = Object.keys(MANIFEST.models)
    .filter(id => MANIFEST.models[id].meta?.kind === 'unit' && !id.includes('--'));
  const byClass = new Map(CLASSES.map(c => [c, []]));
  for (const id of ids) {
    const fp = MANIFEST.models[id].meta?.footprint?.[0] ?? 1;
    const key = CLASSES.find(c => Math.abs(c - fp) < 0.001) ?? 0.5;
    byClass.get(key).push(id);
  }

  const W = 1720;
  const GAP_X = 16;
  const LABEL_H = 30;
  const HEAD = 62;
  const CLASS_HEAD = 30;

  // Lay out first (rows of items), then allocate the canvas exactly.
  const sections = [];
  for (const cls of CLASSES) {
    const list = byClass.get(cls).sort();
    if (!list.length) continue;
    const rows = [];
    let row = { items: [], x: pad + Math.round(HALF_W), above: 0, below: 0 };
    for (const id of list) {
      const s = sheet(id, 'right', '0');
      if (!s) continue;
      const f = s.face.frames[0];
      const slot = Math.max(f.w, Math.round(cls * TILE_W)) + GAP_X;
      if (row.items.length && row.x + slot + HALF_W > W - pad) {
        rows.push(row);
        row = { items: [], x: pad + Math.round(HALF_W), above: 0, below: 0 };
      }
      const above = Math.max(f.anchorY, Math.round(cls * HALF_H));
      const below = Math.max(f.h - f.anchorY, Math.round(cls * HALF_H));
      row.items.push({ id, f, ax: row.x + Math.round(slot / 2) - GAP_X / 2 });
      row.x += slot;
      row.above = Math.max(row.above, above);
      row.below = Math.max(row.below, below);
    }
    if (row.items.length) rows.push(row);
    sections.push({ cls, rows });
  }

  const H = HEAD + sections.reduce((sum, sec) => sum + CLASS_HEAD
    + sec.rows.reduce((a, r) => a + r.above + r.below + LABEL_H + 18, 0), 0) + pad;
  const px = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) { px[i * 4] = 16; px[i * 4 + 1] = 20; px[i * 4 + 2] = 26; px[i * 4 + 3] = 255; }

  drawText(px, W, H, pad, 14, 'UNIT SIZE WALL - EVERY UNIT TYPE AT 1:1 ON THE SAME TILE GRID', '#8fb2d8', 2);
  drawText(px, W, H, pad, 38, 'EACH SPRITE SITS ON ITS OWN TILE DIAMOND - GREEN DIAMOND = ONE TILE - UNITS RUN 0.5 TO 1.25 TILES', '#7f8c9b', 1);

  let y = HEAD;
  for (const sec of sections) {
    const label = `${sec.cls}X TILE - ${Math.round(sec.cls * 32)} X ${Math.round(sec.cls * 32)} VOX - ${sec.rows.reduce((n, r) => n + r.items.length, 0)} TYPES`;
    drawText(px, W, H, pad, y + 8, label, '#4fc98a', 1);
    // Footprint bar for this class, drawn at the same 1:1 scale as the sprites.
    const barW = Math.round(sec.cls * TILE_W);
    fillRect(px, W, H, W - pad - barW, y + 6, barW, 10, '#2f7d5a');
    strokeRect(px, W, H, W - pad - barW, y + 6, barW, 10, '#40526a');
    y += CLASS_HEAD;
    for (const row of sec.rows) {
      const baseline = y + row.above;
      for (const item of row.items) {
        drawFootprintGuide(px, W, H, item.id, item.ax, baseline);
        drawModel(px, W, H, item.id, item.ax, baseline, { facing: 'right', variant: '0' });
        drawText(px, W, H, item.ax - Math.round(textWidth(item.id, 1) / 2), baseline + row.below + 10,
          item.id, '#8b97a6', 1);
      }
      y += row.above + row.below + LABEL_H + 18;
    }
  }
  return { pixels: px, width: W, height: H };
}

/* ------------------------------------------------------------ unit size -- */
/**
 * Unit size ladder: one representative per size class drawn 1:1 on a shared
 * baseline, each standing on its own tile diamond, with a 2×2 building below at
 * the same scale. Nothing is normalised, so a 0.5-tile rifleman really is half
 * the width of a 1-tile tank here, and the building is visibly four times the
 * ground of the biggest unit.
 */
function buildUnitLadder(samples, building) {
  const pad = 24;
  const W = 1240;

  const sheets = samples.map(s => {
    const sh = sheet(s.id, 'right', '0');
    return sh ? { ...s, sh, f: sh.face.frames[0] } : null;
  }).filter(Boolean);
  const bSheet = sheet(building, 'right', '0');
  const bFrame = bSheet?.face.frames[0];

  const headH = 84;
  const unitSpan = 150;            // space above the baseline for tall units
  const unitsBaseline = headH + unitSpan;
  // How far each sprite hangs below its anchor: the label must clear the
  // lowest of the footprint diamond and the sprite body.
  const unitBelow = Math.max(
    ...sheets.map(s => Math.max(s.f.h - s.f.anchorY, Math.round(s.fp * HALF_H))),
    0,
  );
  const unitLabelH = 74;
  const buildingGap = 26;

  const bSheetH = bFrame ? bFrame.h : 0;
  const buildingBelow = Math.max(bSheetH - (bFrame?.anchorY ?? 0), Math.round(2 * HALF_H));
  const buildingBaseline = unitsBaseline + unitBelow + unitLabelH + buildingGap + bSheetH;
  const H = buildingBaseline + buildingBelow + 54 + pad;

  const px = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) { px[i * 4] = 16; px[i * 4 + 1] = 20; px[i * 4 + 2] = 26; px[i * 4 + 3] = 255; }

  drawText(px, W, H, pad, 14, 'UNIT SIZE LADDER - 0.5 / 0.75 / 1 / 1.25 TILES AT 1:1', '#8fb2d8', 2);
  drawText(px, W, H, pad, 38, 'EACH UNIT STANDS ON ITS OWN TILE DIAMOND (GREEN = ONE TILE). SAME ZOOM, SAME BASELINE, NOTHING SCALED.',
    '#7f8c9b', 1);
  // Length of one tile in words, so the ruler below is unambiguous.
  drawText(px, W, H, pad, 54, 'ONE TILE = 32 VOXELS = 128 X 64 PX AT THIS ZOOM.', '#66788c', 1);

  // Slots: wide enough for the widest sprite plus its caption, laid out evenly.
  const SLOT = 290;
  const xs = sheets.map((s, i) => pad + 70 + i * SLOT);

  for (let i = 0; i < sheets.length; i++) {
    const s = sheets[i], cx = xs[i];
    drawFootprintGuide(px, W, H, s.id, cx, unitsBaseline);
    blit(px, W, H, s.sh.image, s.f.x, s.f.y, s.f.w, s.f.h,
      Math.round(cx - s.f.anchorX), Math.round(unitsBaseline - s.f.anchorY));
  }
  // Captions, centred under each sprite and clear of its silhouette.
  const capY = unitsBaseline + unitBelow + 10;
  for (let i = 0; i < sheets.length; i++) {
    const s = sheets[i], cx = xs[i];
    const l1 = s.id.toUpperCase();
    const l2 = `${s.fp} TILE = ${Math.round(s.fp * 32)} X ${Math.round(s.fp * 32)} VOX`;
    const l3 = `SPRITE ${s.f.w} X ${s.f.h} PX`;
    drawText(px, W, H, cx - Math.round(textWidth(l1, 1) / 2), capY, l1, '#eef3f8', 1);
    drawText(px, W, H, cx - Math.round(textWidth(l2, 1) / 2), capY + 14, l2, '#8fb2d8', 1);
    drawText(px, W, H, cx - Math.round(textWidth(l3, 1) / 2), capY + 26, l3, '#66788c', 1);
    // Footprint bar: exactly the unit's footprint in tiles, drawn 1:1.
    const barW = Math.round(s.fp * TILE_W);
    const barX = cx - Math.round(barW / 2);
    fillRect(px, W, H, barX, capY + 36, barW, 6, '#2f7d5a');
    strokeRect(px, W, H, barX, capY + 36, barW, 6, '#40526a');
  }

  // 2×2 building, same model space, to show the upper end of the hierarchy.
  if (bFrame) {
    const bfp = MANIFEST.models[building]?.meta?.footprint ?? [2, 2];
    const bcx = pad + Math.round((bfp[0] * TILE_W) / 2) + 30;
    for (let i = 0; i < Math.ceil(bfp[0]); i++) {
      for (let j = 0; j < Math.ceil(bfp[1]); j++) {
        strokeDiamond(px, W, H, bcx + (i - j) * HALF_W, buildingBaseline + (i + j) * HALF_H, HALF_W, HALF_H, '#3a4c60');
      }
    }
    blit(px, W, H, bSheet.image, bFrame.x, bFrame.y, bFrame.w, bFrame.h,
      Math.round(bcx - bFrame.anchorX), Math.round(buildingBaseline - bFrame.anchorY));
    const l1 = building.toUpperCase();
    const l2 = `${bfp[0]} X ${bfp[1]} TILES = ${bfp[0] * 32} X ${bfp[1] * 32} VOX`;
    const l3 = `SPRITE ${bFrame.w} X ${bFrame.h} PX`;
    const bCapY = buildingBaseline + buildingBelow + 14;
    drawText(px, W, H, bcx - Math.round(textWidth(l1, 1) / 2), bCapY, l1, '#eef3f8', 1);
    drawText(px, W, H, bcx - Math.round(textWidth(l2, 1) / 2), bCapY + 14, l2, '#8fb2d8', 1);
    drawText(px, W, H, bcx - Math.round(textWidth(l3, 1) / 2), bCapY + 26, l3, '#66788c', 1);
    const noteX = bcx + Math.round(bfp[0] * HALF_W) + 34;
    drawText(px, W, H, noteX, buildingBaseline - 56, 'BUILDINGS START AT 2X2 = 64 X 64 VOX', '#a7b4c4', 1);
    drawText(px, W, H, noteX, buildingBaseline - 44, '4X THE GROUND OF THE BIGGEST UNIT (1.25 TILES)', '#a7b4c4', 1);
    drawText(px, W, H, noteX, buildingBaseline - 26, 'THAT IS THE CEILING UNITS DELIBERATELY STOP BELOW', '#7f8c9b', 1);
    drawText(px, W, H, noteX, buildingBaseline - 14, 'SO INFANTRY NEVER READS AS LARGER THAN A BASE', '#7f8c9b', 1);
  }
  return { pixels: px, width: W, height: H };
}

/* --------------------------------------------------------- before/after - */
/** Nearest-neighbour 1/factor downsample (legacy previews were rendered at 2× runtime). */
function downscaleNearest(img, factor) {
  const w = Math.max(1, Math.floor(img.width / factor));
  const h = Math.max(1, Math.floor(img.height / factor));
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = ((y * factor) * img.width + x * factor) * 4;
      const di = (y * w + x) * 4;
      out[di] = img.pixels[si];
      out[di + 1] = img.pixels[si + 1];
      out[di + 2] = img.pixels[si + 2];
      out[di + 3] = img.pixels[si + 3];
    }
  }
  return { width: w, height: h, pixels: out };
}

function buildBeforeAfter(pairs) {
  // Variable-width columns at one shared scale: a 3×3 HQ is ~385 px while an
  // infantryman is ~45 px, so equal-width columns would either crop the
  // compounds or shrink the units into specks. Old and new previews are both
  // 2 px per voxel of their own model, so this is an honest 1:1 comparison.
  const SCALE = 1;
  const pad = 18, titleH = 26, gapX = 20, rowGap = 14, labelH = 30;
  const loaded = pairs.map(p => {
    const before = fs.existsSync(p.before) ? decodePng(fs.readFileSync(p.before)) : null;
    const after = fs.existsSync(p.after) ? decodePng(fs.readFileSync(p.after)) : null;
    const w = Math.max(before?.width ?? 0, after?.width ?? 0) * SCALE;
    return { ...p, before, after, w };
  });
  const beforeH = Math.max(...loaded.map(c => (c.before?.height ?? 0) * SCALE), 40);
  const afterH = Math.max(...loaded.map(c => (c.after?.height ?? 0) * SCALE), 40);
  const W = pad * 2 + loaded.reduce((n, c) => n + Math.max(c.w, 96) + gapX, -gapX);
  const row1Top = pad + titleH;
  const row2Title = row1Top + beforeH + rowGap;
  const row2Top = row2Title + titleH;
  const H = row2Top + afterH + rowGap + labelH;
  const px = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) { px[i * 4] = 14; px[i * 4 + 1] = 18; px[i * 4 + 2] = 24; px[i * 4 + 3] = 255; }
  drawText(px, W, H, pad, pad - 4, 'BEFORE — 64 CUBE, ONE 64PX TILE', '#d8a06a', 2);
  drawText(px, W, H, pad, row2Title, 'AFTER — 128 CUBE, 32 UNIT TILES', '#78c08a', 2);
  let x = pad;
  for (const c of loaded) {
    const colW = Math.max(c.w, 96);
    const cx = x + colW / 2;
    const draw = (img, bottomY) => {
      if (!img) return;
      const scaled = scaleNearest(img.pixels, img.width, img.height, SCALE);
      const sw = img.width * SCALE, sh = img.height * SCALE;
      blit(px, W, H, { width: sw, height: sh, pixels: scaled }, 0, 0, sw, sh,
        Math.round(cx - sw / 2), Math.round(bottomY - sh));
    };
    // Both rows sit on their band's ground line, so the relative size (and the
    // unchanged unit scale) is directly readable.
    draw(c.before, row1Top + beforeH);
    draw(c.after, row2Top + afterH);
    drawText(px, W, H, x + 2, H - labelH + 2, c.id.toUpperCase(), '#9fb0c4', 1);
    if (c.after) drawText(px, W, H, x + 2, H - labelH + 14, `${c.after.width}×${c.after.height} PX`, '#66788c', 1);
    x += colW + gapX;
  }
  return { pixels: px, width: W, height: H };
}

/* --------------------------------------------------------- hangar figures -- */
/**
 * The hangar is the only asset whose functional layout has to be legible from
 * two very different viewpoints: the *plan* has to read as the digit "2", and
 * the *interior* has to swallow a fixed-wing unit without clipping it.  Both
 * figures below are generated from the same voxels the baker rasterises, so
 * they cannot drift from the shipped sprite:
 *
 *   docs/review/hangar-plan.png  top-down plan of all five designs with the
 *                               clear bay, the door opening and the largest
 *                               fixed-wing unit ghosted in place
 *   docs/review/hangar-fit.png   the five designs sliced at the bay ceiling
 *                               (z < 27) with a transport-plane standing in
 *                               the bay — proof it fits and nothing clips it
 */
const HANGAR_FACTIONS = [
  ['hangar', 'STANDARD'],
  ['hangar--allies', 'ALLIES'],
  ['hangar--soviets', 'SOVIETS'],
  ['hangar--empire', 'EMPIRE'],
  ['hangar--legion', 'LEGION'],
];
const HANGAR_GRID = HANGAR_PLAN.size;              // 96 world voxels
const TRANSPORT_ID = 'transport-plane';            // largest fixed-wing unit

const BAY_W = HANGAR_PLAN.bay.x1 - HANGAR_PLAN.bay.x0;
const BAY_D = HANGAR_PLAN.bay.y1 - HANGAR_PLAN.bay.y0;
const BAY_H = HANGAR_PLAN.bay.z1 - HANGAR_PLAN.bay.z0;
const DOOR_W = HANGAR_PLAN.door.x1 - HANGAR_PLAN.door.x0;
const DOOR_H = HANGAR_PLAN.door.z1 - HANGAR_PLAN.door.z0;

/**
 * The biggest fixed-wing unit, turned nose-to-the-door and centred in each of
 * the two standing bays.  Returns the parked voxels, their plan columns and the
 * per-stall translation, so the plan figure and the cutaway draw exactly the
 * same aeroplanes in exactly the same places.
 */
function parkedAircraft() {
  const model = VOXELS.models[TRANSPORT_ID];
  const parked = rotateVoxels(model.voxels, 1, model.groundAnchor);   // nose south
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y, z] of parked) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
  }
  const sizeX = maxX - minX + 1, sizeY = maxY - minY + 1;
  const placements = HANGAR_PLAN.stalls.map(st => ({
    x: Math.round((st.x0 + st.x1) / 2 - (minX + sizeX / 2)),
    y: Math.round((st.y0 + st.y1) / 2 - (minY + sizeY / 2)),
    z: HANGAR_PLAN.bay.z0 - minZ,
  }));
  return {
    parked, size: [sizeX, sizeY], placements,
    min: [minX, minY, minZ],
    planeCols: new Set(parked.map(v => `${v[0]},${v[1]}`)),
  };
}

/** Palette LUT in the baker's packed-ABGR layout: three shade steps/colour. */
function shadeLut(palette) {
  const lut = new Uint32Array((palette.length + 1) * 3);
  palette.forEach((c, i) => {
    [1.0, 0.72, 0.86].forEach((f, s) => {
      const [r, g, b] = hex(shadeHex(c, f));
      lut[(i + 1) * 3 + s] = (255 << 24) | (b << 16) | (g << 8) | r;
    });
  });
  return lut;
}

/** Isometric render of raw [x,y,z,paletteIndex] voxels, cropped to content. */
function isoOfVoxels(voxels, lut, ds = 1) {
  const grid = new Uint16Array(BUF_W * BUF_H);
  const box = rasterize(voxels, grid);
  const x0 = Math.floor(box.minX / ds) * ds;
  const y0 = Math.floor(box.minY / ds) * ds;
  const w = (Math.ceil((box.maxX + 1) / ds) * ds - x0) / ds;
  const h = (Math.ceil((box.maxY + 1) / ds) * ds - y0) / ds;
  const pixels = Buffer.alloc(w * h * 4);
  downsampleCell(grid, x0, y0, w, h, lut, pixels, 0, 0, w, ds);
  return { width: w, height: h, pixels };
}

/** Translucent fill, used for the parked-aircraft ghost. */
function blendRect(dst, W, H, x, y, w, h, color, alpha) {
  const [r, g, b] = hex(color);
  for (let dy = 0; dy < h; dy++) {
    const ty = Math.round(y + dy);
    if (ty < 0 || ty >= H) continue;
    for (let dx = 0; dx < w; dx++) {
      const tx = Math.round(x + dx);
      if (tx < 0 || tx >= W) continue;
      const i = (ty * W + tx) * 4;
      dst[i] = Math.round(r * alpha + dst[i] * (1 - alpha));
      dst[i + 1] = Math.round(g * alpha + dst[i + 1] * (1 - alpha));
      dst[i + 2] = Math.round(b * alpha + dst[i + 2] * (1 - alpha));
    }
  }
}

/** A boxed rectangle outline of `t` pixels, aligned to the voxel grid. */
function frameRect(dst, W, H, x0, y0, x1, y1, color, t = 2) {
  fillRect(dst, W, H, x0, y0, x1 - x0, t, color);
  fillRect(dst, W, H, x0, y1 - t, x1 - x0, t, color);
  fillRect(dst, W, H, x0, y0, t, y1 - y0, color);
  fillRect(dst, W, H, x1 - t, y0, t, y1 - y0, color);
}

/**
 * Top-down plan of the five hangars: the "2" massing, the clear bay, the door
 * and the largest aircraft ghosted where it would sit.
 */
function buildHangarPlan() {
  const px = 2;
  const panel = HANGAR_GRID * px;
  const pad = 26, gap = 16, titleH = 58, labelH = 32;
  const W = pad * 2 + panel * 5 + gap * 4;
  const H = titleH + panel + labelH + pad;
  const dst = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    dst[i * 4] = 14; dst[i * 4 + 1] = 18; dst[i * 4 + 2] = 24; dst[i * 4 + 3] = 255;
  }
  drawText(dst, W, H, pad, 10, 'FIXED-WING HANGAR — TWO AIRCRAFT BAYS ON A 2-SHAPED PLAN', '#dbe3ec', 2);
  drawText(dst, W, H, pad, 28,
    'TOP BAR = ROOFED HALL · GAP = OPEN COUNTER · EAST ANNEX = DESCENDER · FRONT RANGE = BOTTOM BAR',
    '#93a6bb', 1);
  drawText(dst, W, H, pad, 42,
    `GREEN = CLEAR BAY ${BAY_W}x${BAY_D}x${BAY_H} · AMBER = DOOR ${DOOR_W}x${DOOR_H} · PALEST GREEN = TWO 38x36 STALLS · CYAN = TWO TRANSPORT-PLANES`,
    '#5fc4e8', 1);

  const { planeCols, placements } = parkedAircraft();
  const bay = HANGAR_PLAN.bay, door = HANGAR_PLAN.door;

  HANGAR_FACTIONS.forEach(([id, label], i) => {
    const model = VOXELS.models[id];
    const ox = pad + i * (panel + gap), oy = titleH;
    fillRect(dst, W, H, ox, oy, panel, panel, '#080b10');
    // Top-most voxel per plan cell, tinted by the height it sits at so roofs,
    // walls and the apron read apart in a flat top-down image.
    const top = new Map();
    for (const [x, y, z, ci] of model.voxels) {
      const key = `${x},${y}`;
      const prev = top.get(key);
      if (!prev || z > prev[0]) top.set(key, [z, VOXELS.palette[ci]]);
    }
    for (const [key, [z, color]] of top) {
      const [x, y] = key.split(',').map(Number);
      // Two tones only: structure is drawn at full colour, ground paint is
      // crushed to near-black.  The silhouette — the massing, not the apron
      // paint — is what draws the "2".
      fillRect(dst, W, H, ox + x * px, oy + y * px, px, px,
        shadeHex(color, z <= 4 ? 0.16 : 0.98));
    }
    // Aircraft ghosts drawn as outlines, not fills: the annotation must not hide
    // the roof that carries the "2" read.  One aeroplane per standing bay.
    for (const place of placements) {
      for (const key of planeCols) {
        const [x, y] = key.split(',').map(Number);
        const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]]
          .some(([dx, dy]) => !planeCols.has(`${x + dx},${y + dy}`));
        if (!edge) continue;
        blendRect(dst, W, H, ox + (place.x + x) * px, oy + (place.y + y) * px, px, px, '#5fc4e8', 0.9);
      }
    }
    frameRect(dst, W, H, ox + bay.x0 * px, oy + bay.y0 * px, ox + bay.x1 * px, oy + bay.y1 * px, '#3fa34d', 2);
    for (const st of HANGAR_PLAN.stalls) {
      frameRect(dst, W, H, ox + st.x0 * px, oy + st.y0 * px, ox + st.x1 * px, oy + st.y1 * px, '#9be0b0', 1);
    }
    frameRect(dst, W, H, ox + door.x0 * px, oy + door.y0 * px, ox + door.x1 * px, oy + door.y1 * px, '#e5b93c', 2);
    drawText(dst, W, H, ox, oy + panel + 6, label, '#dbe3ec', 1);
    drawText(dst, W, H, ox, oy + panel + 16, `${model.bounds.size[0]}x${model.bounds.size[1]}x${model.bounds.size[2]} VOX`,
      '#66788c', 1);
  });
  return { pixels: dst, width: W, height: H };
}

/**
 * The same five designs sliced at the bay ceiling with a transport-plane parked
 * inside, so "the aircraft fits and nothing clips it" is something you can see
 * rather than something you have to believe.
 */
function buildHangarFit() {
  const lut = shadeLut(VOXELS.palette);
  const bay = HANGAR_PLAN.bay;
  const { parked, placements } = parkedAircraft();
  const twoAircraft = placements.flatMap(place =>
    parked.map(([x, y, z, c]) => [x + place.x, y + place.y, z + place.z, c]));

  const rendered = HANGAR_FACTIONS.map(([id]) => isoOfVoxels(
    [...VOXELS.models[id].voxels.filter(v => v[2] < bay.z1), ...twoAircraft], lut, 1));

  const pad = 26, gap = 14, titleH = 50, labelH = 34;
  const panelW = Math.max(...rendered.map(r => r.width));
  const panelH = Math.max(...rendered.map(r => r.height));
  const W = pad * 2 + panelW * 5 + gap * 4;
  const H = titleH + panelH + labelH + pad;
  const dst = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    dst[i * 4] = 14; dst[i * 4 + 1] = 18; dst[i * 4 + 2] = 24; dst[i * 4 + 3] = 255;
  }
  drawText(dst, W, H, pad, 10, 'ROOF CUT AT Z=27 — TWO TRANSPORT-PLANES PARKED IN THE TWO BAYS', '#dbe3ec', 2);
  drawText(dst, W, H, pad, 28,
    `SAME VOXELS AS THE SPRITE, ROOF REMOVED ABOVE THE BAY CEILING · 2 x (36 x 38 x 20) IN A ${BAY_W} x ${BAY_D} x ${BAY_H} BAY · ONE PLANE PER 38 x 36 STALL`,
    '#93a6bb', 1);

  rendered.forEach((img, i) => {
    const ox = pad + i * (panelW + gap);
    fillRect(dst, W, H, ox, titleH, panelW, panelH, '#080b10');
    blit(dst, W, H, img, 0, 0, img.width, img.height,
      ox + Math.round((panelW - img.width) / 2), titleH + Math.round((panelH - img.height) / 2));
    drawText(dst, W, H, ox, titleH + panelH + 6, HANGAR_FACTIONS[i][1], '#dbe3ec', 1);
    drawText(dst, W, H, ox, titleH + panelH + 18,
      `${VOXELS.models[HANGAR_FACTIONS[i][0]].bounds.size[2]} VOX TALL`, '#66788c', 1);
  });
  return { pixels: dst, width: W, height: H };
}

/* ---------------------------------------------------------------- main -- */
const scene = cropToContent(buildScene(), 28);
fs.writeFileSync(path.join(OUT, 'scale-scene.png'), encodePng(scene.width, scene.height, scene.pixels));

const sizeWall = buildSizeWall();
fs.writeFileSync(path.join(OUT, 'unit-size-wall.png'), encodePng(sizeWall.width, sizeWall.height, sizeWall.pixels));
console.log(`Wrote docs/review/unit-size-wall.png (${sizeWall.width}×${sizeWall.height})`);

const unitSize = buildUnitLadder(
  [
    { id: 'infantry', fp: 0.5 },
    { id: 'apc', fp: 0.75 },
    { id: 'tank', fp: 1 },
    { id: 'battleship', fp: 1.25 },
  ],
  'barracks',
);
fs.writeFileSync(path.join(OUT, 'unit-size.png'), encodePng(unitSize.width, unitSize.height, unitSize.pixels));
console.log(`Wrote docs/review/unit-size.png (${unitSize.width}×${unitSize.height})`);

const hangarPlan = buildHangarPlan();
fs.writeFileSync(path.join(OUT, 'hangar-plan.png'), encodePng(hangarPlan.width, hangarPlan.height, hangarPlan.pixels));
console.log(`Wrote docs/review/hangar-plan.png (${hangarPlan.width}×${hangarPlan.height})`);

const hangarFit = buildHangarFit();
fs.writeFileSync(path.join(OUT, 'hangar-fit.png'), encodePng(hangarFit.width, hangarFit.height, hangarFit.pixels));
console.log(`Wrote docs/review/hangar-fit.png (${hangarFit.width}×${hangarFit.height})`);

const lineup = buildLineup([
  {
    title: 'INFANTRY — HALF A TILE, HUMAN SIZED',
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
      { id: 'hangar', note: '3x3' }, { id: 'port', note: '3x2' },
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
