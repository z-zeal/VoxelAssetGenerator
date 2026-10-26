#!/usr/bin/env node
/**
 * Render data/voxels.json (128×128×128 world models) into isometric PNG
 * previews for visual inspection. Each model becomes one PNG under
 * game_assets/voxels/ showing frame 0 in the canonical `right` facing with all
 * three visible voxel faces (lit top, shaded left, mid-lit right) sorted
 * strictly back-to-front, box-downsampled 2:1 from the 4 px supersample so a
 * 3×3 compound preview stays around 200 px wide while carrying full detail.
 *
 * Run: npm run voxels:preview
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  rasterize, downsampleCell, buildVariantLut, pngBytes,
  BUF_W, BUF_H,
} from './bake.mjs';
import { UNIT_ARMY_IDS } from './build.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DS = Number(process.env.PREVIEW_DS ?? 2);

const onlyArg = process.argv.indexOf('--only');
const onlyList = onlyArg >= 0 ? process.argv[onlyArg + 1].split(',').map(s => s.trim()).filter(Boolean) : null;
const onlySet = onlyList ? new Set(onlyList) : null;
if (onlySet) {
  for (const id of [...onlySet]) {
    for (const armyId of UNIT_ARMY_IDS) onlySet.add(`${id}--${armyId}`);
  }
}

const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/voxels.json'), 'utf8'));
const lut = buildVariantLut(doc.palette, '0');
const outDir = path.join(ROOT, 'game_assets/voxels');
fs.mkdirSync(outDir, { recursive: true });

const grid = new Uint16Array(BUF_W * BUF_H);
let count = 0;
for (const [id, model] of Object.entries(doc.models)) {
  if (onlySet && !onlySet.has(id)) continue;
  const box = rasterize(model.voxels, grid);
  const x0 = Math.floor(box.minX / DS) * DS;
  const y0 = Math.floor(box.minY / DS) * DS;
  const w = (Math.ceil((box.maxX + 1) / DS) * DS - x0) / DS;
  const h = (Math.ceil((box.maxY + 1) / DS) * DS - y0) / DS;
  const buf = Buffer.alloc(w * h * 4);
  downsampleCell(grid, x0, y0, w, h, lut, buf, 0, 0, w, DS);
  fs.writeFileSync(path.join(outDir, `${id}.png`), pngBytes(w, h, buf));
  count++;
}
console.log(`Rendered ${count} previews to ${path.relative(ROOT, outDir)}`);
