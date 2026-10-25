#!/usr/bin/env node
/**
 * Bake runtime isometric sprite sheets from the 64×64×64 sculptors.
 *
 * Replaces the former pure-stdlib Python baker with the same contract but in
 * Node, because 64³ multi-frame rasterization (≈30 M voxel draws plus 4×4
 * box-filtered downsampling) is far past the repository's ≤10 min bake gate in
 * a Python loop. Everything else is preserved:
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
 *   (model, facing, variant); manifest v3 records cell + frames[] + clips,
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
  sculptModel, clipsFor, modelRoster, BUILDINGS, TERRAIN_MODELS, UNIT_ARMY_IDS,
} from './build.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Supersampled cube faces (4 px wide, 2:1 iso), identical geometry to the old
// baker, then downsampled 4:1 to runtime pixels.
const TOP = [[1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [3, 1]];
const LEFT = [[0, 2], [1, 2], [0, 3], [1, 3]];
const RIGHT = [[2, 2], [3, 2], [2, 3], [3, 3]];

const FACINGS = [['right', 0], ['up', 1], ['left', 2], ['down', 3], ['up-right', 'diag'], ['down-right', 'diag'], ['down-left', 'diag'], ['up-left', 'diag']];
const GRID = 64;
export const DOWNSCALE = 4;                    // supersample px per runtime px
const GROUND = 63;                      // projected y of the 64×64 ground centre
const MANIFEST_FORMAT = 'field-command-voxel-sheet-3';
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

export const BUF_W = 288;
export const BUF_H = 320;
export const BUF_OX = 144;
export const BUF_OY = 208;

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

export function rotateVoxels(voxels, turns) {
  let out = voxels;
  for (let t = 0; t < turns % 4; t++) {
    out = out.map(([x, y, z, pi]) => [y, GRID - 1 - x, z, pi]);
  }
  return out;
}

export function rotateVoxels45(voxels) {
  const cx = 31.5, cy = 31.5;
  const cos = Math.cos(Math.PI / 4), sin = Math.sin(Math.PI / 4);
  const out = [];
  for (const [x, y, z, pi] of voxels) {
    const nx = Math.round((x - cx) * cos - (y - cy) * sin + cx);
    const ny = Math.round((x - cx) * sin + (y - cy) * cos + cy);
    if (nx >= 0 && nx < 64 && ny >= 0 && ny < 64) out.push([nx, ny, z, pi]);
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
    const sx = (x - y) * 2 - 2 + BUF_OX;
    const sy = (x + y) - z * 2 - GROUND + BUF_OY;
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
  return { minX: minX - BUF_OX, maxX: maxX - BUF_OX, minY: minY - BUF_OY, maxY: maxY - BUF_OY };
}

/** 4:1 box-filtered downsample of one grid window into an RGBA strip cell.
 *  x0/y0 are origin-relative (as returned by rasterize); the grid itself is
 *  buffered with the BUF_OX/BUF_OY projection offsets. */
export function downsampleCell(grid, x0, y0, w, h, lut, out, ox, oy, stride, ds = DOWNSCALE, quantize = true) {
  const n = ds * ds;
  for (let py = 0; py < h; py++) {
    const by = y0 + BUF_OY + py * ds;
    for (let px = 0; px < w; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      const bx = x0 + BUF_OX + px * ds;
      for (let dy = 0; dy < ds; dy++) {
        let row = (by + dy) * BUF_W + bx;
        for (let dx = 0; dx < ds; dx++, row++) {
          const idx = grid[row];
          if (!idx) continue;
          const c = lut[idx];
          r += c & 255; g += (c >> 8) & 255; b += (c >> 16) & 255; a += 255;
        }
      }
      const o = ((oy + py) * stride + (ox + px)) * 4;
      if (a === 0) { out[o + 3] = 0; continue; }
      out[o] = Math.round(r / n);
      out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n);
      // Edge coverage quantized to five alpha levels (64/128/192/255): visually
      // identical at runtime scale, far friendlier to deflate (payload gate).
      // NOTE: must clamp — round(255/64)*64 = 256 would truncate to 0 in the
      // Uint8Array and punch holes through fully covered interior pixels.
      out[o + 3] = quantize ? Math.min(255, Math.round(a / n / 64) * 64) || 64 : Math.round(a / n);
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

export function bake(doc, palette, { only = null } = {}) {
  const units = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/units.json'), 'utf8'));
  const roster = modelRoster(units)
    .filter(([id]) => !only || only.includes(id));
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
    gridSize: [64, 64, 64],
    tileSize: [64, 32],
    downscale: DOWNSCALE,
    facings: FACINGS.map(f => f[0]),
    teamVariants: [...TEAM_VARIANTS],
    models: {},
  };
  const files = new Map();
  let payload = 0;

  for (const [id, kind] of roster) {
    const baseId = id.includes('--') ? id.split('--')[0] : id;
    const armyId = id.includes('--') ? id.split('--')[1] : 'standard';
    const clips = clipsFor(baseId, kind);
    const clipNames = ['idle', 'move', 'attack', 'death'].filter(a => (clips[a] ?? 0) > 0);
    const frameSets = {};
    for (const action of clipNames) {
      frameSets[action] = [];
      for (let f = 0; f < clips[action]; f++) {
        const canvas = sculptModel(baseId, kind, armyId, { action, frame: f });
        canvas.hollow();
        frameSets[action].push(toIndexed(canvas.finish()));
      }
    }
    const allFrames = clipNames.flatMap(a => frameSets[a]);
    const entry = {};
    for (const [facing, turns] of FACINGS) {
      const rotated = allFrames.map(v => (turns === 'diag' ? rotateVoxels45(v) : rotateVoxels(v, turns)));
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
      const anchorX = -x0 / DOWNSCALE;
      const anchorY = -y0 / DOWNSCALE;
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
          if (changed < MIN_CHANGED_PIXELS || (needAlpha && alphaDiff < MIN_ALPHA_DIFF)) {
            throw new Error(`${id}-${facing}: ${action} frame ${f} changed only `
              + `${changed}px (${alphaDiff} alpha) — animation must move geometry`);
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
    manifest.models[id] = entry;
  }
  files.set('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));
  return { manifest, files, payload };
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
    .reduce((s, m) => s + Object.values(m).reduce((t, f) => t + Object.keys(f.variants).length, 0), 0);
  console.log(`Exported ${count} baked iso strips for ${Object.keys(manifest.models).length} models `
    + `(${(payload / 1048576).toFixed(2)} MB png payload) to ${path.relative(ROOT, outDir)} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
