#!/usr/bin/env node
/**
 * 512³-native baker: segmented sprite sheets + normal + material maps.
 *
 * Contract (documented in docs/PLAN_512_native_16dir_segmented_pipeline.md):
 *
 *   * one folder per asset:            game_assets/<kind>/<asset>/
 *   * one PNG per part per facing:     sheets/<asset>__<part>__<facing>__albedo.png
 *                                      sheets/<asset>__<part>__<facing>__normal.png
 *                                      sheets/<asset>__<part>__<facing>__material.png
 *   * the asset manifest records the shared ground anchor so the parts
 *     composite exactly, plus each part's rotation pivot in pixels.
 *
 * Units get 16 facings, buildings keep the 4 legacy cardinal facings
 * (`right`/`up`/`left`/`down` = the same poses the old sheets used), because a
 * building's footprint is axis-aligned on the board.
 *
 * Run: node tools/voxel_pipeline/v3/bake.mjs [--only tank,barracks] [--k 4] [--ss 2]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pngBytes } from '../bake.mjs';
import { createScribe, CANVAS } from './scribe.mjs';
import { MATERIALS, MATERIAL_IDS, MATERIAL_NAMES, colorFor, materialMapDescriptor } from './materials.mjs';
import { cameraBasis, renderPart, buildPalette } from './raster.mjs';
import { MODELS } from './models/index.mjs';
import { validateModel } from './validate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** 16 unit facings: 22.5° steps. d00 is the pose legacy sheets called `right`. */
export const UNIT_FACINGS = Array.from({ length: 16 }, (_, i) => {
  const angle = i * 22.5;
  const screen = (45 + angle) % 360;          // where the model's nose points on screen
  const names = ['E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW', 'N', 'NNE', 'NE', 'ENE'];
  return {
    id: `d${String(i).padStart(2, '0')}`,
    angle,
    screenAngle: screen,
    label: names[Math.round((((screen % 360) + 360) % 360) / 22.5) % 16],
  };
});

/** 4 building facings, identical poses to the legacy right/up/left/down set. */
export const BUILDING_FACINGS = [
  { id: 'right', angle: 0 },
  { id: 'up', angle: 90 },
  { id: 'left', angle: 180 },
  { id: 'down', angle: 270 },
];

const DEFAULTS = { k: 4, ss: 2 };

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function partFileName(asset, part, facing, map) {
  return `${asset}__${part}__${facing}__${map}.png`;
}

/** Composite every part of one facing into a single preview PNG. */
function compositePreview(parts, anchor, pad = 8) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of parts) {
    minX = Math.min(minX, -p.anchor[0]);
    minY = Math.min(minY, -p.anchor[1]);
    maxX = Math.max(maxX, p.w - p.anchor[0]);
    maxY = Math.max(maxY, p.h - p.anchor[1]);
  }
  const w = Math.ceil(maxX - minX) + pad * 2;
  const h = Math.ceil(maxY - minY) + pad * 2;
  const out = new Uint8ClampedArray(w * h * 4);
  for (const p of parts) {
    const ox = Math.round(p.anchor[0] + minX) + pad;
    const oy = Math.round(p.anchor[1] + minY) + pad;
    for (let y = 0; y < p.h; y++) {
      for (let x = 0; x < p.w; x++) {
        const s = (y * p.w + x) * 4;
        const a = p.albedo[s + 3] / 255;
        if (a <= 0) continue;
        const dx = x + ox, dy = y + oy;
        if (dx < 0 || dy < 0 || dx >= w || dy >= h) continue;
        const d = (dy * w + dx) * 4;
        const da = out[d + 3] / 255;
        const oa = a + da * (1 - a);
        for (let i = 0; i < 3; i++) {
          out[d + i] = (p.albedo[s + i] * a + out[d + i] * da * (1 - a)) / (oa || 1);
        }
        out[d + 3] = oa * 255;
      }
    }
  }
  return { w, h, buf: Buffer.from(out.buffer, out.byteOffset, out.length), minX, minY };
}

export function bakeAsset(id, def, { k = DEFAULTS.k, ss = DEFAULTS.ss, outRoot = ROOT } = {}) {
  const scribe = createScribe({ materialIds: MATERIAL_IDS });
  def.build(scribe);
  const geom = scribe.finish({ cull: true });
  const problems = validateModel(id, def, geom);
  if (problems.length) {
    throw new Error(`${id}: geometry validation failed\n  - ${problems.join('\n  - ')}`);
  }
  const palette = buildPalette(MATERIAL_NAMES, name => colorFor(name, 'standard'), MATERIALS);
  const occluders = new Set();
  for (const part of geom.parts) for (const [x, y, z] of part.voxels) occluders.add(`${x},${y},${z}`);

  const facings = def.kind === 'unit' ? UNIT_FACINGS : BUILDING_FACINGS;
  const assetDir = path.join(outRoot, 'game_assets', def.folder, id);
  const sheetDir = path.join(assetDir, 'sheets');
  fs.mkdirSync(sheetDir, { recursive: true });

  const manifest = {
    format: 'field-command-voxel-sheet-4',
    asset: id,
    kind: def.kind,
    group: def.group,
    canvas: CANVAS,
    designVoxelsPerTileUnit: CANVAS / 64,
    renderScale: k,
    superSample: ss,
    pxPerVoxel: k / (CANVAS / 64),
    facings: facings.map(f => f.id),
    facingMeta: facings,
    teamTint: {
      note: 'Albedo is baked in the standard livery. Recolour pixels whose material map red channel matches these ids to apply an army livery.',
      materialIds: Object.entries(MATERIALS).filter(([, m]) => m.team).map(([name]) => ({ name, id: MATERIAL_IDS[name], role: MATERIALS[name].team })),
      liveries: JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/voxel_pipeline/v3/livery.json'), 'utf8')),
    },
    normalMap: { space: 'view', channelOrder: 'rgb', range: '0..255 maps -1..1', up: '+g means screen up' },
    materialMap: { channelOrder: 'rgba', meaning: ['materialId', 'metalness', 'roughness', 'emissive'], table: materialMapDescriptor() },
    parts: {},
    clips: { idle: 1 },
    sourceGeometry: {
      parts: geom.parts.map(p => ({
        name: p.name,
        dynamic: p.dynamic,
        voxels: p.voxels.length,
        pivotDesign: p.pivot,
        bounds: p.bounds,
      })),
      totalVoxels: geom.totalVoxels,
    },
  };

  const previewParts = [];
  for (const part of geom.parts) {
    const entry = {
      name: part.name,
      dynamic: part.dynamic,
      pivotDesign: part.pivot,
      cell: null,
      facings: {},
    };
    for (const facing of facings) {
      const basis = cameraBasis(facing.angle, k);
      const rendered = renderPart(part.voxels, { basis, palette, superSample: ss, occluders });
      if (!rendered) throw new Error(`${id}/${part.name}/${facing.id}: empty render`);
      const ax = basis.project(CANVAS / 2, CANVAS / 2, 0);
      const anchor = [ax[0] - rendered.origin[0], ax[1] - rendered.origin[1]];
      const pivotScreen = basis.project(part.pivot[0], part.pivot[1], part.pivot[2] ?? 0);
      const pivotPx = [pivotScreen[0] - rendered.origin[0], pivotScreen[1] - rendered.origin[1]];
      const files = {};
      for (const map of ['albedo', 'normal', 'material']) {
        const name = partFileName(id, part.name, facing.id, map);
        const blob = pngBytes(rendered.w, rendered.h, Buffer.from(rendered[map].buffer));
        fs.writeFileSync(path.join(sheetDir, name), blob);
        files[map] = { file: `sheets/${name}`, w: rendered.w, h: rendered.h, sha256: sha256(blob) };
      }
      entry.facings[facing.id] = {
        anchor: [round2(anchor[0]), round2(anchor[1])],
        pivot: [round2(pivotPx[0]), round2(pivotPx[1])],
        w: rendered.w,
        h: rendered.h,
        files,
      };
      if (facing.id === (def.kind === 'unit' ? 'd00' : 'right')) {
        previewParts.push({ albedo: rendered.albedo, w: rendered.w, h: rendered.h, anchor });
      }
    }
    manifest.parts[part.name] = entry;
  }

  const preview = compositePreview(previewParts, null);
  fs.writeFileSync(path.join(assetDir, 'preview.png'), preview.buf);
  manifest.preview = {
    file: 'preview.png',
    facing: def.kind === 'unit' ? 'd00' : 'right',
    w: preview.w,
    h: preview.h,
  };
  fs.writeFileSync(path.join(assetDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  const fileCount = Object.values(manifest.parts)
    .reduce((s, p) => s + Object.keys(p.facings).length * 3, 0);
  const bytes = Object.values(manifest.parts).reduce((s, p) => s
    + Object.values(p.facings).reduce((t, f) => t + ['albedo', 'normal', 'material']
      .reduce((u, m) => u + fs.statSync(path.join(assetDir, f.files[m].file)).size, 0), 0), 0);
  return { manifest, assetDir, fileCount, bytes, voxels: geom.totalVoxels };
}

const round2 = v => Math.round(v * 100) / 100;

/** Top-level index so tools and the game can enumerate every baked asset. */
export function writeIndex(outRoot = ROOT) {
  const index = { format: 'field-command-voxel-index-4', canvas: CANVAS, generatedBy: 'tools/voxel_pipeline/v3/bake.mjs', units: {}, buildings: {} };
  for (const [id, def] of Object.entries(MODELS)) {
    const dir = path.join(outRoot, 'game_assets', def.folder, id, 'manifest.json');
    if (!fs.existsSync(dir)) continue;
    const m = JSON.parse(fs.readFileSync(dir, 'utf8'));
    const bucket = def.kind === 'unit' ? index.units : index.buildings;
    bucket[id] = {
      folder: `game_assets/${def.folder}/${id}`,
      manifest: `game_assets/${def.folder}/${id}/manifest.json`,
      preview: `game_assets/${def.folder}/${id}/preview.png`,
      group: def.group,
      parts: Object.keys(m.parts),
      facings: m.facings,
    };
  }
  fs.writeFileSync(path.join(outRoot, 'game_assets', 'voxel-index.json'), JSON.stringify(index, null, 2) + '\n');
  return index;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const arg = (name, fallback) => {
    const i = process.argv.indexOf(name);
    return i >= 0 ? process.argv[i + 1] : fallback;
  };
  const onlyArg = arg('--only', null);
  const only = onlyArg ? onlyArg.split(',').map(s => s.trim()).filter(Boolean) : null;
  const k = Number(arg('--k', DEFAULTS.k));
  const ss = Number(arg('--ss', DEFAULTS.ss));
  const ids = only ?? Object.keys(MODELS);
  const t0 = Date.now();
  let files = 0, bytes = 0, voxels = 0;
  for (const id of ids) {
    const def = MODELS[id];
    if (!def) { console.error(`unknown asset "${id}"`); process.exitCode = 1; continue; }
    const r = bakeAsset(id, def, { k, ss });
    files += r.fileCount; bytes += r.bytes; voxels += r.voxels;
    console.log(`  ${id.padEnd(22)} ${String(r.voxels).padStart(8)} voxels  `
      + `${String(r.fileCount).padStart(4)} png  ${(r.bytes / 1048576).toFixed(2)} MB`);
  }
  const index = writeIndex();
  console.log(`Baked ${ids.length} assets → ${files} PNG (${(bytes / 1048576).toFixed(1)} MB) `
    + `from ${voxels.toLocaleString()} voxels in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`Index: game_assets/voxel-index.json (${Object.keys(index.units).length} units, `
    + `${Object.keys(index.buildings).length} buildings)`);
}
