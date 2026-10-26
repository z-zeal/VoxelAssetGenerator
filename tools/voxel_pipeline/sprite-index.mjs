#!/usr/bin/env node
/**
 * Rebuilds the static catalogue used by the offline browsers:
 *
 *   assets-list.json        every preview + baked sheet path (full 17,880 files)
 *   assets-list-full.json   grouped by kind and by asset
 *   voxel-sprite-review.html  the embedded ASSETS array of the offline browser
 *
 * The review page is a single self-contained HTML file (it must work from
 * file:// where fetch() is blocked), so its catalogue is embedded.  To keep the
 * page light it lists every preview plus the neutral (`n`) variant of every
 * baked strip (its neutral 'n' variant, or team colour 0 where the kind has no
 * neutral sheet); the complete file list stays in assets-list.json.
 *
 * Run: node tools/voxel_pipeline/sprite-index.mjs   (part of `voxels:review`)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/voxels.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'game_assets/voxels/sheets/manifest.json'), 'utf8'));

const CATEGORY = {
  unit: 'Units / other',
  building: 'Buildings / structures',
  terrain: 'Terrain / environment',
  effect: 'Units / other',
};

const ids = Object.keys(doc.models).sort((a, b) => a.localeCompare(b));
const previews = ids.map(id => `game_assets/voxels/${id}.png`);

const sheets = [];
const sheetsByAsset = {};
for (const id of ids) {
  const entry = manifest.models[id];
  const list = [];
  for (const facing of Object.keys(entry)) {
    if (facing === 'meta') continue;
    const variants = entry[facing].variants;
    for (const info of Object.values(variants)) sheets.push(`game_assets/voxels/sheets/${info.file}`);
    // One representative strip per facing keeps the embedded page light: the
    // neutral sheet where the kind has one, otherwise team colour 0.
    const representative = variants.n ?? variants['0'];
    if (representative) list.push(`game_assets/voxels/sheets/${representative.file}`);
  }
  sheetsByAsset[id] = list;
}
sheets.sort((a, b) => a.localeCompare(b));

const byCategory = { unit: [], building: [], terrain: [] };
for (const id of ids) {
  const kind = doc.models[id].kind;
  if (byCategory[kind]) byCategory[kind].push(id);
}

fs.writeFileSync(path.join(ROOT, 'assets-list.json'),
  `${JSON.stringify({ previews, sheets }, null, 2)}\n`);
fs.writeFileSync(path.join(ROOT, 'assets-list-full.json'),
  `${JSON.stringify({ byCategory, previews, sheetsByAsset }, null, 2)}\n`);

/* --------------------------------------------------- embedded browser list -- */
const assets = [];
for (const id of ids) {
  const kind = doc.models[id].kind;
  const category = CATEGORY[kind] ?? 'Units / other';
  assets.push({ name: id, filename: `${id}.png`, path: `game_assets/voxels/${id}.png`, kind: 'Preview', category });
}
for (const id of ids) {
  const kind = doc.models[id].kind;
  const category = CATEGORY[kind] ?? 'Units / other';
  for (const rel of sheetsByAsset[id]) {
    const filename = path.basename(rel);
    assets.push({ name: filename.replace(/\.png$/, ''), filename, path: rel, kind: 'Baked sheet', category });
  }
}

const htmlPath = path.join(ROOT, 'voxel-sprite-review.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const start = html.indexOf('const ASSETS = ');
if (start < 0) throw new Error('voxel-sprite-review.html: ASSETS array not found');
const end = html.indexOf('];', start);
if (end < 0) throw new Error('voxel-sprite-review.html: ASSETS array is not terminated');
const oldCount = JSON.parse(html.slice(start + 'const ASSETS = '.length, end + 1)).length;
html = `${html.slice(0, start)}const ASSETS = ${JSON.stringify(assets)};${html.slice(end + 2)}`;
fs.writeFileSync(htmlPath, html);

console.log(`Wrote assets-list.json (${previews.length} previews, ${sheets.length} sheets), `
  + `assets-list-full.json and voxel-sprite-review.html (${assets.length} entries, was ${oldCount})`);
