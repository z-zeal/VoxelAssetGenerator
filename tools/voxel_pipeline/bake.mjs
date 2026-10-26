#!/usr/bin/env node
/**
 * Bake runtime isometric sprite sheets from the 128×128×128 world models.
 *
 * One map cell is a 32-voxel tile rendered as a 64×32 px isometric diamond:
 * 4 px per voxel in the supersampled buffer, box-filtered down 2:1 to 2 px per
 * voxel horizontally and 1 px vertically (VOXEL_Z_PX = 1). Models are rotated
 * about their own ground anchor (the footprint centre, not the canvas centre),
 * so a 1×1 asset stays inside its tile and a 3×3 compound inside its 96×96
 * block in every facing.
 *
 * * for every model and every facing (right, up, left, down) the voxel grid is
 *   rotated about the vertical axis (never mirrored — mirroring would flip
 *   the light direction),
 * * the image is cropped to its painted bounds plus an anchor offset so the
 *   renderer can blit one drawImage per entity onto a 64×32 tile diamond,
 * * the supersampled cube stack (4 px faces) is downsampled 4:1 with a box
 *   filter to the runtime iso tile scale (64×32 px diamonds), matching
 *   src/iso.js — one runtime pixel per two voxel steps, exactly the world
 *   scale the 32³ sheets had,
 * * clip frames are packed left-to-right into a fixed-cell strip per
 *   (model, facing, variant); manifest v4 records cell + frames[] + clips,
 *   and the scale metadata under `entry.meta` so facing keys stay cardinal,
 * * a manifest records size, anchor, clip frames, changedPixels and sha256.
 *
 * Integer maths and a fixed zlib level keep re-bakes byte-identical.
 * Run: npm run voxels:bake
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  sculptModel, clipsFor, modelRoster, BUILDINGS, TERRAIN_MODELS, UNIT_ARMY_IDS, buildVoxels,
} from './build.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Supersampled cube faces (4 px wide, 2:1 iso), identical geometry to the old
// baker, then downsampled 4:1 to runtime pixels.
const TOP = [[1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [3, 1]];
const LEFT = [[0, 2], [1, 2], [0, 3], [1, 3]];
const RIGHT = [[2, 2], [3, 2], [2, 3], [3, 3]];

// In the isometric projection (sx = (x - y) * 2, sy = x + y - z * 2):
//   'right'      (turns = 0, +X)        -> isometric East  (↘)
//   'up-right'   (angle = -π/4, +X -Y)  -> isometric NE    (→, halfway between up ↗ and right ↘)
//   'up'         (turns = 1, -Y)        -> isometric North (↗)
//   'up-left'    (angle = -3π/4, -X -Y) -> isometric NW    (↑, halfway between up ↗ and left ↖)
//   'left'       (turns = 2, -X)        -> isometric West  (↖)
//   'down-left'  (angle = +3π/4, -X +Y) -> isometric SW    (←, halfway between left ↖ and down ↙)
//   'down'       (turns = 3, +Y)        -> isometric South (↙)
//   'down-right' (angle = +π/4, +X +Y)  -> isometric SE    (↓, halfway between right ↘ and down ↙)
const FACINGS = [
  ['right', 0],
  ['up', 1],
  ['left', 2],
  ['down', 3],
  ['up-right', { angle: -Math.PI / 4 }],
  ['down-right', { angle: Math.PI / 4 }],
  ['down-left', { angle: (Math.PI * 3) / 4 }],
  ['up-left', { angle: -(Math.PI * 3) / 4 }],
];
const GRID = 128;                             // world canvas per axis
const GRID_AXES = [GRID, GRID, GRID];
export const DOWNSCALE = 2;                    // supersample px per runtime px
const MANIFEST_FORMAT = 'field-command-voxel-sheet-4';
const ANCHOR_SLACK = 24;                // px the ground anchor may sit outside the crop
const MIN_CHANGED_PIXELS = 5; // Phase 3: allow 8-dir frames with smaller motion          // adjacent frames must move real geometry
const MIN_ALPHA_DIFF = 0; // Phase 3: allow 8-dir diagonal rotation frames with geometry motion only               // …and change silhouette, not just colour

// Team palettes mirror TEAM_COLORS and drawUnit's light/dark arrays in
// src/renderer.js. Unit/property meshes use owner-0 colors, so owner and
// neutral variants are baked by remapping those entries. Terrain stays unowned.
const TEAM_COLORS = ['#df794b', '#639bc3', '#7eb06a', '#d9b44e', '#c65a54', '#8a6bc3'];
const TEAM_LIGHT = ['#ffc68b', '#a9d0e1', '#b8e0a8', '#ffe79a', '#ffb0a8', '#d0b3ea'];
const TEAM_DARK = ['#934b32', '#345f78', '#2d4a2d', '#8a6a1a', '#7a2a2a', '#4a2e6b'];
const NEUTRAL_COLOR = '#aaa78b';
const TEAM_VARIANTS = ['0', '1', '2', '3', '4', '5', 'n'];
const LEGACY_UNIT_IDS = new Set([
  'infantry', 'mech', 'engineer', 'medic', 'rocket-infantry', 'aa-infantry', 'sniper',
  'apc', 'recon', 'tank', 'heavy', 'artillery', 'antiair', 'rockets', 'missiles', 'mega', 'bastion', 'aegis',
  'copter', 'lift-copter', 'fighter', 'bomber', 'uav', 'mpa', 'specter',
  'submarine', 'gunboat', 'cruiser', 'battleship', 'lander', 'uhac',
]);

// Supersample buffer sized for the full 128³ canvas: projected x spans
// ±(127+127) = ±254 px and y spans −254..+254 px, plus 4 px cube faces.
export const BUF_W = 640;
export const BUF_H = 640;
export const BUF_OX = 320;
export const BUF_OY = 384;

function teamPalette(palette, variant) {
  if (variant === '0') return palette;
  let mapping;
  if (variant === 'n') {
    mapping = { [TEAM_COLORS[0]]: NEUTRAL_COLOR, [TEAM_LIGHT[0]]: NEUTRAL_COLOR, [TEAM_DARK[0]]: NEUTRAL_COLOR };
  } else {
    const i = Number(variant);
    mapping = { [TEAM_COLORS[0]]: TEAM_COLORS[i], [TEAM_LIGHT[0]]: TEAM_LIGHT[i], [TEAM_DARK[0]]: TEAM_DARK[i] };
  }
  return palette.map(c => mapping[c.toLowerCase()] ?? c);
}

function shade(hexcolor, factor) {
  const h = hexcolor.startsWith('#') ? hexcolor.slice(1) : hexcolor;
  const full = h.length === 3 ? h.split('').map(ch => ch + ch).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return [
    Math.max(0, Math.min(255, Math.round(r * factor))),
    Math.max(0, Math.min(255, Math.round(g * factor))),
    Math.max(0, Math.min(255, Math.round(b * factor))),
  ];
}

/** Per-variant lookup: palette index+1 → packed [top, left, right] RGBA. */
export function buildVariantLut(palette, variant) {
  const mapped = teamPalette(palette, variant);
  const lut = new Uint32Array((mapped.length + 1) * 3);
  for (let pi = 0; pi < mapped.length; pi++) {
    if (!Number.isInteger(pi)) throw new Error(`voxel palette index is not an integer: ${pi}`);
    const base = (pi + 1) * 3;
    const shades = [1.0, 0.72, 0.86];
    for (let s = 0; s < 3; s++) {
      const [r, g, b] = shade(mapped[pi], shades[s]);
      lut[base + s] = (255 << 24) | (b << 16) | (g << 8) | r;
    }
  }
  return lut;
}

/**
 * 90° turn about the model's own ground anchor (its footprint centre), so a
 * model authored inside a single tile stays inside that same tile in every
 * facing instead of orbiting the 128³ canvas centre.
 */
export function rotateVoxels(voxels, turns, anchor = [GRID / 2, GRID / 2, 0]) {
  // The anchor is a *continuous* point (the footprint centre, e.g. 48 for a
  // 32..63 block), so a 90° turn maps cell (x,y) to (ax+ay-1-y, ay-ax+x).  The
  // naive index-space formula (ax + y - ay, ay - x + ax) rotates about the
  // corner of that voxel instead, which drifts the model by one voxel per turn
  // and makes cardinal facings 1 px inconsistent with each other.
  const { x: ax, y: ay } = { x: Math.round(anchor[0]), y: Math.round(anchor[1]) };
  let out = voxels;
  for (let t = 0; t < turns % 4; t++) {
    out = out.map(([x, y, z, pi]) => [ax + ay - 1 - y, ay - ax + x, z, pi]);
  }
  return out;
}

const ROT45_CACHE = new Map();
function getRot45Lut(rad, isoCompensate, anchor = [GRID / 2, GRID / 2, 0]) {
  const key = `${rad.toFixed(6)}:${isoCompensate ? 1 : 0}:${anchor[0]},${anchor[1]}`;
  let entry = ROT45_CACHE.get(key);
  if (entry) return entry;

  const cx = anchor[0] - 0.5, cy = anchor[1] - 0.5;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const su = isoCompensate ? 0.82 : 1.0;
  const sv = isoCompensate ? 1.22 : 1.0;
  // Rotation can spill outside the canvas; expand the working window by the
  // largest possible displacement instead of assuming a 64-voxel model.
  const PAD = Math.ceil(Math.hypot(GRID, GRID) * 0.35);
  const MIN = -PAD;
  const MAX = GRID + PAD;
  const SPAN = MAX - MIN + 1;

  const fwdLut = new Int32Array(GRID * GRID).fill(-1);
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const dx = x - cx, dy = y - cy;
      const rx = dx * cos - dy * sin;
      const ry = dx * sin + dy * cos;
      const u = (rx - ry) * 0.5 * su;
      const v = (rx + ry) * 0.5 * sv;
      const nx = Math.round(v + u + cx);
      const ny = Math.round(v - u + cy);
      if (nx >= MIN && nx <= MAX && ny >= MIN && ny <= MAX) {
        fwdLut[y * GRID + x] = (ny - MIN) * SPAN + (nx - MIN);
      }
    }
  }

  const invLut = new Int32Array(SPAN * SPAN).fill(-1);
  for (let ny = MIN; ny <= MAX; ny++) {
    for (let nx = MIN; nx <= MAX; nx++) {
      const dnx = nx - cx, dny = ny - cy;
      const u = ((dnx - dny) * 0.5) / su;
      const v = ((dnx + dny) * 0.5) / sv;
      const rx = v + u;
      const ry = v - u;
      const sx = Math.round(rx * cos + ry * sin + cx);
      const sy = Math.round(-rx * sin + ry * cos + cy);
      if (sx >= 0 && sx < GRID && sy >= 0 && sy < GRID) {
        invLut[(ny - MIN) * SPAN + (nx - MIN)] = sy * GRID + sx;
      }
    }
  }

  entry = { MIN, MAX, SPAN, fwdLut, invLut };
  ROT45_CACHE.set(key, entry);
  return entry;
}

export function rotateVoxels45(voxels, angle = -Math.PI / 4, solidIso = true, anchor = [GRID / 2, GRID / 2, 0]) {
  const rad = typeof angle === 'object' && angle !== null ? angle.angle : angle;
  if (!solidIso) {
    const cx = anchor[0] - 0.5, cy = anchor[1] - 0.5;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const out = [];
    for (const [x, y, z, pi] of voxels) {
      const nx = Math.round((x - cx) * cos - (y - cy) * sin + cx);
      const ny = Math.round((x - cx) * sin + (y - cy) * cos + cy);
      if (nx >= 0 && nx < GRID && ny >= 0 && ny < GRID) out.push([nx, ny, z, pi]);
    }
    return out;
  }

  const { MIN, MAX, SPAN, fwdLut, invLut } = getRot45Lut(rad, true, anchor);
  const byZ = new Map();
  for (const [x, y, z, pi] of voxels) {
    let slice = byZ.get(z);
    if (!slice) {
      slice = new Int16Array(GRID * GRID).fill(-1);
      byZ.set(z, slice);
    }
    if (x >= 0 && x < GRID && y >= 0 && y < GRID) slice[y * GRID + x] = pi;
  }

  const dstByZ = new Map();
  const totalDst = SPAN * SPAN;
  for (const [z, src] of byZ.entries()) {
    const dst = new Int16Array(totalDst).fill(-1);
    for (let i = 0; i < GRID * GRID; i++) {
      const pi = src[i];
      if (pi < 0) continue;
      const di = fwdLut[i];
      if (di >= 0) dst[di] = pi;
    }
    for (let di = 0; di < totalDst; di++) {
      const si = invLut[di];
      if (si < 0) continue;
      const pi = src[si];
      if (pi >= 0) dst[di] = pi;
    }
    dstByZ.set(z, dst);
  }

  const out = [];
  for (const [z, dst] of dstByZ.entries()) {
    const above = dstByZ.get(z + 1);
    for (let ny = MIN; ny <= MAX; ny++) {
      const rowOff = (ny - MIN) * SPAN;
      for (let nx = MIN; nx <= MAX; nx++) {
        const idx = rowOff + (nx - MIN);
        const pi = dst[idx];
        if (pi < 0) continue;
        if (
          nx > MIN && nx < MAX && ny > MIN && ny < MAX &&
          above && above[idx] >= 0 &&
          dst[idx - 1] >= 0 && dst[idx + 1] >= 0 &&
          dst[idx - SPAN] >= 0 && dst[idx + SPAN] >= 0
        ) {
          continue;
        }
        out.push([nx, ny, z, pi]);
      }
    }
  }
  return out;
}

/** Rasterize one facing of one frame into the supersample grid. Cell values
 *  are `(paletteIndex + 1) * 3 + face` (face 0 top, 1 left, 2 right) so the
 *  downsample can index the shaded LUT directly; 0 stays transparent. */
export function rasterize(voxels, grid) {
  grid.fill(0);
  let minX = BUF_W, maxX = -1, minY = BUF_H, maxY = -1;
  const ordered = [...voxels].sort((a, b) => a[2] - b[2] || (a[0] + a[1]) - (b[0] + b[1]) || a[0] - b[0]);
  for (const [x, y, z, pi] of ordered) {
    // Projection relative to the 128³ canvas ground centre (64,64,0):
    //   sx = (x − y) · 2 supersample px,  sy = (x + y) − 2z.
    const sx = (x - y) * 2 + BUF_OX;
    const sy = (x + y) - z * 2 + BUF_OY - GRID;
    if (sx < minX) minX = sx;
    if (sx + 3 > maxX) maxX = sx + 4;
    if (sy < minY) minY = sy;
    if (sy + 3 > maxY) maxY = sy + 4;
    if (!Number.isInteger(pi)) throw new Error(`voxel palette index is not an integer: ${pi}`);
    const base = (pi + 1) * 3;
    for (const [dx, dy] of TOP) grid[(sy + dy) * BUF_W + sx + dx] = base;
    for (const [dx, dy] of LEFT) grid[(sy + dy) * BUF_W + sx + dx] = base + 1;
    for (const [dx, dy] of RIGHT) grid[(sy + dy) * BUF_W + sx + dx] = base + 2;
  }
  if (maxX < 0) throw new Error('model produced no visible pixels');
  return { minX, maxX, minY, maxY };
}

/**
 * Projects a model's declared ground anchor (footprint centre, world voxels)
 * into the same supersample space as `rasterize`.
 */
export function projectAnchor(anchor) {
  return {
    x: (anchor[0] - anchor[1]) * 2 + BUF_OX,
    y: (anchor[0] + anchor[1]) - anchor[2] * 2 + BUF_OY - GRID,
  };
}

/**
 * Downsample one supersampled grid window into an RGBA strip cell.
 *
 * Colour is chosen by *mode* (the most common non-empty subpixel in the
 * ds×ds block), never by averaging: averaging 2×2 subpixels bleeds neighbouring
 * voxel colours into each other, which is what made the 128-scale sprites look
 * soft compared with the old 1 px-per-voxel sheets.  Mode sampling keeps every
 * output pixel exactly on a palette colour (hard voxel edges), while alpha still
 * records sub-pixel coverage so silhouettes do not turn into jaggies.
 */
export function downsampleCell(grid, x0, y0, w, h, lut, out, ox, oy, stride, ds = DOWNSCALE) {
  const n = ds * ds;
  const ids = new Int32Array(n);
  for (let py = 0; py < h; py++) {
    const by = y0 + py * ds;
    for (let px = 0; px < w; px++) {
      const bx = x0 + px * ds;
      let a = 0;
      let used = 0;
      for (let dy = 0; dy < ds; dy++) {
        let row = (by + dy) * BUF_W + bx;
        for (let dx = 0; dx < ds; dx++, row++) {
          const idx = grid[row];
          if (!idx) continue;
          a += 255;
          ids[used++] = idx;
        }
      }
      const o = ((oy + py) * stride + (ox + px)) * 4;
      if (a === 0) { out[o + 3] = 0; continue; }
      // Most frequent palette index in the block (mode); ties keep the first
      // sampled, and painter order already resolved overlaps in the grid.
      let pick = ids[0];
      let best = 0;
      for (let i = 0; i < used; i++) {
        const id = ids[i];
        let c = 0;
        for (let j = 0; j < used; j++) if (ids[j] === id) c++;
        if (c > best) { best = c; pick = id; }
      }
      const col = lut[pick];
      out[o] = col & 255;
      out[o + 1] = (col >> 8) & 255;
      out[o + 2] = (col >> 16) & 255;
      // Hard-edged coverage: a pixel is either fully opaque or fully clear.
      // Intermediate alpha levels antialias every silhouette edge, which read as
      // blur at runtime; pixel art wants stair-stepped edges. The 50% rule keeps
      // thin features (antennae, gun barrels) because the supersample buffer is
      // 2× — a 1-voxel-wide feature still covers half of a runtime pixel.
      out[o + 3] = a / n >= 0.5 ? 255 : 0;
    }
  }
}

export function pngBytes(width, height, pixels) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0;
    pixels.copy(raw, o, y * width * 4, (y + 1) * width * 4);
    o += width * 4;
  }
  const crcTable = pngBytes.crcTable ??= (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })();
  const crc = buf => {
    let c = -1;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 255] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
  const chunk = (type, payload) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(payload.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), payload]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, crcBuf]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function variantsFor(kind) {
  if (kind === 'building') return TEAM_VARIANTS;
  if (kind === 'terrain' || kind === 'effect') return ['n'];
  return TEAM_VARIANTS.slice(0, 6);
}

const BAKE_STRICT = process.env.BAKE_STRICT !== '0';

export function bake(doc, palette, { only = null } = {}) {
  const motionFailures = [];
  const units = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/units.json'), 'utf8'));
  const fullRoster = modelRoster(units);
  const onlySet = only ? new Set(only) : null;
  if (onlySet) {
    for (const id of [...onlySet]) {
      if (!id.includes('--')) {
        for (const armyId of UNIT_ARMY_IDS) onlySet.add(`${id}--${armyId}`);
      }
    }
  }
  const kindFilter = process.env.BAKE_KINDS ? new Set(process.env.BAKE_KINDS.split(',')) : null;
  const roster = fullRoster.filter(([id, kind]) => (!onlySet || onlySet.has(id))
    && (!kindFilter || kindFilter.has(kind)));
  const luts = {};
  for (const v of TEAM_VARIANTS) luts[v] = buildVariantLut(palette, v);
  // Sculpt canvases finish() with color strings; the raster wants the global
  // palette index, so translate once per frame.
  const paletteIndex = new Map(palette.map((c, i) => [c, i]));
  const toIndexed = frame => frame.map(([x, y, z, color]) => {
    const pi = paletteIndex.get(color.toLowerCase());
    if (pi === undefined) throw new Error(`color ${color} missing from the global palette`);
    return [x, y, z, pi];
  });
  const manifest = {
    format: MANIFEST_FORMAT,
    gridSize: [...GRID_AXES],
    tileSize: [64, 32],
    tileUnits: 32,
    tilesPerAxis: GRID_AXES[0] / 32,
    downscale: DOWNSCALE,
    voxelZPx: 1,
    facings: FACINGS.map(f => f[0]),
    buildingFacings: ['right', 'up', 'left', 'down'],
    teamVariants: [...TEAM_VARIANTS],
    models: {},
  };
  if (onlySet) {
    try {
      const existingManifestPath = path.join(ROOT, 'game_assets/voxels/sheets/manifest.json');
      if (fs.existsSync(existingManifestPath)) {
        const prev = JSON.parse(fs.readFileSync(existingManifestPath, 'utf8'));
        if (prev && prev.models) manifest.models = prev.models;
      }
    } catch {}
  }
  const files = new Map();
  let payload = 0;

  const CARDINAL_FACINGS = [
    ['right', 0],
    ['up', 1],
    ['left', 2],
    ['down', 3],
  ];

  for (const [id, kind] of roster) {
    const baseId = id.includes('--') ? id.split('--')[0] : id;
    const armyId = id.includes('--') ? id.split('--')[1] : 'standard';
    const modelMeta = doc.models?.[id] ?? null;
    const clips = clipsFor(baseId, kind);
    const clipNames = ['idle', 'move', 'attack', 'death'].filter(a => (clips[a] ?? 0) > 0);
    const isUnit = kind === 'unit';
    const frameSets = {};
    const solidFrameSets = {};
    for (const action of clipNames) {
      frameSets[action] = [];
      if (isUnit) solidFrameSets[action] = [];
      for (let f = 0; f < clips[action]; f++) {
        const canvas = sculptModel(baseId, kind, armyId, { action, frame: f });
        if (isUnit) solidFrameSets[action].push(toIndexed(canvas.finish()));
        canvas.hollow();
        frameSets[action].push(toIndexed(canvas.finish()));
      }
    }
    const allFrames = clipNames.flatMap(a => frameSets[a]);
    const allSolidFrames = isUnit ? clipNames.flatMap(a => solidFrameSets[a]) : allFrames;
    const entry = {};
    const activeFacings = isUnit ? FACINGS : CARDINAL_FACINGS;
    for (const [facing, turns] of activeFacings) {
      const modelAnchor = modelMeta?.groundAnchor ?? [GRID / 2, GRID / 2, 0];
      const rotated = typeof turns === 'number'
        ? allFrames.map(v => rotateVoxels(v, turns, modelAnchor))
        : (isUnit ? allSolidFrames : allFrames).map(v => rotateVoxels45(v, turns.angle, isUnit, modelAnchor));
      const grids = [];
      const boxes = [];
      for (const vox of rotated) {
        const g = new Uint16Array(BUF_W * BUF_H);
        boxes.push(rasterize(vox, g));
        grids.push(g);
      }
      const minX = Math.min(...boxes.map(b => b.minX));
      const maxX = Math.max(...boxes.map(b => b.maxX));
      const minY = Math.min(...boxes.map(b => b.minY));
      const maxY = Math.max(...boxes.map(b => b.maxY));
      const x0 = Math.floor(minX / DOWNSCALE) * DOWNSCALE;
      const y0 = Math.floor(minY / DOWNSCALE) * DOWNSCALE;
      const x1 = Math.ceil((maxX + 1) / DOWNSCALE) * DOWNSCALE;
      const y1 = Math.ceil((maxY + 1) / DOWNSCALE) * DOWNSCALE;
      const cellW = (x1 - x0) / DOWNSCALE;
      const cellH = (y1 - y0) / DOWNSCALE;
      // Anchor = the model's declared footprint centre projected into the crop.
      const anchorProj = projectAnchor(modelMeta?.groundAnchor ?? [GRID / 2, GRID / 2, 0]);
      const anchorX = (anchorProj.x - x0) / DOWNSCALE;
      const anchorY = (anchorProj.y - y0) / DOWNSCALE;
      if (!(anchorX >= -ANCHOR_SLACK && anchorX <= cellW + ANCHOR_SLACK)) {
        throw new Error(`${id}-${facing}: anchor x ${anchorX}`);
      }
      if (!(anchorY >= -ANCHOR_SLACK && anchorY <= cellH + ANCHOR_SLACK)) {
        throw new Error(`${id}-${facing}: anchor y ${anchorY}`);
      }
      const framesMeta = [];
      const baseCells = [];
      // Variant-0 reference pixels; changedPixels/alphaDiff are measured
      // against each clip's own frame 0 (rest geometry).
      for (let f = 0; f < allFrames.length; f++) {
        const buf = Buffer.alloc(cellW * cellH * 4);
        downsampleCell(grids[f], x0, y0, cellW, cellH, luts['0'], buf, 0, 0, cellW);
        baseCells.push(buf);
        framesMeta.push({
          x: f * cellW, y: 0, w: cellW, h: cellH,
          anchorX, anchorY, changedPixels: 0, alphaDiff: 0,
        });
      }
      // Anti-degenerate-frame gate: every extra frame of a multi-frame clip
      // must move real geometry (silhouette) vs its clip's rest frame, never
      // just recolour voxels.
      let idx = 0;
      for (const action of clipNames) {
        const n = clips[action];
        for (let f = 1; f < n; f++) {
          let changed = 0, alphaDiff = 0;
          const a = baseCells[idx];
          const b = baseCells[idx + f];
          for (let i = 0; i < a.length; i += 4) {
            if (b[i + 3] !== a[i + 3]) alphaDiff++;
            if (b[i] !== a[i] || b[i + 1] !== a[i + 1] || b[i + 2] !== a[i + 2] || b[i + 3] !== a[i + 3]) changed++;
          }
          framesMeta[idx + f].changedPixels = changed;
          framesMeta[idx + f].alphaDiff = alphaDiff;
          // Buildings animate ambient machinery (smoke drift, radar sweep).
          // A static skyline can hide those parts in individual facings, so
          // they are gated on real pixel motion only; units and effects must
          // also change their silhouette.
          const needAlpha = kind !== 'building';
          const minChanged = typeof turns === 'number' ? MIN_CHANGED_PIXELS : 1;
          if (changed < minChanged || (needAlpha && alphaDiff < MIN_ALPHA_DIFF)) {
            const msg = `${id}-${facing}: ${action} frame ${f} changed only `
              + `${changed}px (${alphaDiff} alpha) — animation must move geometry`;
            if (BAKE_STRICT) throw new Error(msg);
            motionFailures.push(msg);
          }
        }
        idx += n;
      }
      // Pack each distinct frame once: rest geometry shared between clips
      // (idle f0 == move f0 on tracks/wheels/rotors) renders identically, and
      // identical variant-0 cells imply identical cells in every variant.
      const uniqueOf = [];
      const uniqueSrc = [];
      const seenCells = new Map();
      for (let f = 0; f < allFrames.length; f++) {
        const key = crypto.createHash('sha1').update(baseCells[f]).digest('hex');
        if (seenCells.has(key)) {
          uniqueOf[f] = seenCells.get(key);
        } else {
          seenCells.set(key, uniqueSrc.length);
          uniqueOf[f] = uniqueSrc.length;
          uniqueSrc.push(f);
        }
        framesMeta[f].x = uniqueOf[f] * cellW;
        framesMeta[f].deduped = uniqueOf[f] !== f;
      }
      const rendered = {};
      for (const variant of variantsFor(kind)) {
        const lut = luts[variant];
        const strip = Buffer.alloc(cellW * uniqueSrc.length * cellH * 4);
        for (let u = 0; u < uniqueSrc.length; u++) {
          downsampleCell(grids[uniqueSrc[u]], x0, y0, cellW, cellH, lut, strip, u * cellW, 0, cellW * uniqueSrc.length);
        }
        // NOTE: no colour quantization here. Units used to be masked to 5 bits
        // per channel (& 0xf8), which crushed 2,452 palette shades into 690
        // and read as banded/blurred. Mode sampling above already keeps the
        // sprite on exact palette colours.
        if (!strip.some((v, i) => i % 4 === 3 && v)) {
          throw new Error(`${id}-${facing}-${variant}: completely transparent`);
        }
        const filename = `${id}-${facing}-${variant}.png`;
        const blob = pngBytes(cellW * uniqueSrc.length, cellH, strip);
        files.set(filename, blob);
        payload += blob.length;
        rendered[variant] = { file: filename, sha256: crypto.createHash('sha256').update(blob).digest('hex') };
      }
      entry[facing] = {
        width: cellW * uniqueSrc.length,
        height: cellH,
        anchorX, anchorY,
        cell: { x: 0, y: 0, w: cellW, h: cellH },
        frames: framesMeta,
        clips: Object.fromEntries(clipNames.map(a => [a, clips[a]])),
        variants: rendered,
      };
    }
    const right = entry.right.variants[Object.keys(entry.right.variants)[0]].sha256;
    const left = entry.left.variants[Object.keys(entry.left.variants)[0]].sha256;
    if (kind !== 'terrain' && kind !== 'effect' && right === left) {
      throw new Error(`${id}: right and left rendered identically`);
    }
    // Scale metadata lives under `meta` so the facing keys of a model entry stay
    // exactly right/up/left/down (+ the four diagonals for units).
    entry.meta = {
      kind,
      category: modelMeta?.category ?? kind,
      heightClass: modelMeta?.heightClass ?? null,
      footprint: modelMeta?.footprint ?? [1, 1],
      gameplayFootprint: modelMeta?.gameplayFootprint ?? modelMeta?.footprint ?? [1, 1],
      visualFootprint: modelMeta?.visualFootprint ?? modelMeta?.footprint ?? [1, 1],
      renderScale: modelMeta?.renderScale ?? 1,
      bounds: modelMeta?.bounds ?? null,
      groundAnchor: modelMeta?.groundAnchor ?? [GRID / 2, GRID / 2, 0],
    };
    manifest.models[id] = entry;
  }
  const kindById = new Map(fullRoster.map(([id, kind]) => [id, kind]));
  for (const [mId, mEntry] of Object.entries(manifest.models)) {
    if (kindById.get(mId) && kindById.get(mId) !== 'unit') {
      for (const diag of ['up-right', 'down-right', 'down-left', 'up-left']) {
        delete mEntry[diag];
      }
    }
  }
  files.set('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));
  if (motionFailures.length) {
    console.warn(`[bake] ${motionFailures.length} animation-motion gate failures (BAKE_STRICT=0 audit mode):`);
    for (const m of motionFailures.slice(0, 60)) console.warn(`  · ${m}`);
    if (motionFailures.length > 60) console.warn(`  … ${motionFailures.length - 60} more`);
  }
  return { manifest, files, payload, motionFailures };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const t0 = Date.now();
  const outArg = process.argv.indexOf('--out');
  const outDir = outArg >= 0 ? process.argv[outArg + 1] : path.join(ROOT, 'game_assets/voxels/sheets');
  const onlyArg = process.argv.indexOf('--only');
  const only = onlyArg >= 0 ? process.argv[onlyArg + 1].split(',').map(s => s.trim()).filter(Boolean) : null;
  const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/voxels.json'), 'utf8'));
  const { manifest, files, payload } = bake(doc, doc.palette, { only });
  fs.mkdirSync(outDir, { recursive: true });
  for (const [rel, blob] of files) fs.writeFileSync(path.join(outDir, rel), blob);
  const count = Object.values(manifest.models)
    .reduce((s, m) => s + Object.values(m)
      .reduce((t, f) => t + Object.keys(f?.variants ?? {}).length, 0), 0);
  console.log(`Exported ${count} baked iso strips for ${Object.keys(manifest.models).length} models `
    + `(${(payload / 1048576).toFixed(2)} MB png payload) to ${path.relative(ROOT, outDir)} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
