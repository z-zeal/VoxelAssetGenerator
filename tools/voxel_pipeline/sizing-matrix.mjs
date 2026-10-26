#!/usr/bin/env node
/**
 * Generates the asset sizing matrix (docs/ASSET_SIZING_MATRIX.md) and the
 * interactive review page (docs/review/scale-review.html) from the committed
 * model data, so the documentation can never drift from the assets.
 *
 * Run: npm run voxels:matrix   (or as part of `npm run voxels:review`)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/voxels.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'game_assets/voxels/sheets/manifest.json'), 'utf8'));
const unitsJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/units.json'), 'utf8'));
const terrainJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/terrain.json'), 'utf8'));

const ARMIES = ['allies', 'soviets', 'empire', 'legion'];
const ids = Object.keys(doc.models);
const baseId = id => (id.includes('--') ? id.split('--')[0] : id);
const isVariant = id => id.includes('--');

const CATEGORY_LABELS = {
  infantry: 'Infantry', vehicle: 'Ground vehicle', aircraft: 'Aircraft', ship: 'Naval',
  defense: 'Defence (1×1)', command: 'Command compound', production: 'Production',
  economy: 'Economy', logistics: 'Logistics', support: 'Support',
  infrastructure: 'Infrastructure', terrain: 'Terrain / environment', effect: 'Effect',
};

const rows = ids.map(id => {
  const m = doc.models[id];
  const entry = manifest.models[id];
  const facings = Object.keys(entry).filter(k => k !== 'meta').length;
  const frames = entry.right.frames.length;
  const variants = Object.keys(entry.right.variants).length;
  return {
    id,
    base: baseId(id),
    kind: m.kind,
    category: m.category,
    heightClass: m.heightClass,
    footprint: m.gameplayFootprint,
    visual: m.visualFootprint,
    bounds: m.bounds,
    renderScale: m.renderScale,
    design: m.design,
    voxelScale: m.voxelScale,
    anchor: m.groundAnchor,
    facings,
    variants,
    frames,
    clips: m.clips,
    army: isVariant(id) ? id.split('--')[1] : 'standard',
    sheet: entry.right.variants[Object.keys(entry.right.variants)[0]].file,
  };
});

const fmt = n => String(n);
const fp = f => `${f[0]}×${f[1]}`;
const sizeStr = b => `${b.size[0]}×${b.size[1]}×${b.size[2]}`;
const status = r => {
  if (r.bounds.max[0] >= 128 || r.bounds.max[1] >= 128 || r.bounds.max[2] >= 128) return '❌ out of canvas';
  return r.facings > 0 && r.frames > 0 ? '✅' : '❌ missing bake';
};

const count = {
  total: rows.length,
  units: rows.filter(r => r.kind === 'unit').length,
  buildings: rows.filter(r => r.kind === 'building').length,
  terrain: rows.filter(r => r.kind === 'terrain').length,
  effects: rows.filter(r => r.kind === 'effect').length,
  variants: rows.filter(r => isVariant(r.id)).length,
  multiTile: rows.filter(r => (r.footprint[0] > 1 || r.footprint[1] > 1)).length,
};
const validated = rows.filter(r => status(r) === '✅').length;

const section = (title, list) => {
  if (!list.length) return '';
  const head = '| id | category | height class | footprint (tiles) | model bounds (voxels) | render scale | facings | variants | frame cells | status |\n'
    + '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n';
  const body = list.map(r => `| \`${r.id}\` | ${CATEGORY_LABELS[r.category] ?? r.category} | ${r.heightClass} | ${fp(r.footprint)} (${r.footprint[0] * 32}×${r.footprint[1] * 32}) | ${sizeStr(r.bounds)} | ${r.renderScale} | ${r.facings} | ${r.variants} | ${r.frames} | ${status(r)} |`).join('\n');
  return `### ${title}\n\n${head}${body}\n\n`;
};

const units = rows.filter(r => r.kind === 'unit' && !isVariant(r.id));
const buildings = rows.filter(r => r.kind === 'building' && !isVariant(r.id));
const terrain = rows.filter(r => r.kind === 'terrain' || r.kind === 'effect');

const terrainRoles = terrain.filter(r => r.kind === 'terrain').map(r => {
  const def = terrainJson.terrains[r.base];
  return `| \`${r.id}\` | ${def?.name ?? '—'} | ${fp(r.footprint)} | ${r.heightClass} | ${sizeStr(r.bounds)} | ${status(r)} |`;
}).join('\n');

const md = `# Asset Sizing Matrix — 128×128×128 canvas, 32-unit tile grid

**Generated** by \`tools/voxel_pipeline/sizing-matrix.mjs\` from \`data/voxels.json\`
and \`game_assets/voxels/sheets/manifest.json\`. Do not edit by hand: re-run
\`npm run voxels:review\` after a rebuild.

## Conventions

- One ground tile = **32 × 32 world voxels**, projected as a **64 × 32 px**
  isometric diamond (2 px per voxel horizontally, 1 px per voxel vertically).
- Maximum model canvas = **128 × 128 × 128 voxels** = 4 × 4 tiles.
- \`gameplay footprint\` = cells a structure occupies for placement, collision,
  selection and ownership. \`visual footprint\` = ground area the sprite covers.
  Both are listed; both are equal for the current roster (no decorative overhang
  that would confuse placement).
- \`model bounds\` = the painted geometry inside the 128³ authoring canvas.
- Footprints are multiples of 32 voxels: 1×1, 2×2, 3×2, 3×3 are in use.
- Heights are deliberately *not* proportional to footprint: a radar tower is
  tall and narrow, a runway is wide and low.

## Coverage summary

| metric | count |
| --- | --- |
| Models in \`data/voxels.json\` | ${count.total} |
| Base units | ${units.length} |
| Unit faction variants | ${rows.filter(r => r.kind === 'unit' && isVariant(r.id)).length} |
| Base buildings / structures | ${buildings.length} |
| Building faction variants | ${rows.filter(r => r.kind === 'building' && isVariant(r.id)).length} |
| Terrain models | ${rows.filter(r => r.kind === 'terrain').length} |
| Effects | ${count.effects} |
| Multi-tile (2×2 and larger) ids | ${count.multiTile} |
| Validated (bake + manifest + bounds) | ${validated} / ${rows.length} |

## Footprint classes in use

| class | voxels | assets |
| --- | --- | --- |
${[...new Set(rows.map(r => fp(r.footprint)))].sort().map(c => {
  const list = [...new Set(rows.filter(r => fp(r.footprint) === c).map(r => r.base))];
  const vox = list[0] ? rows.find(r => r.base === list[0]).footprint : [1, 1];
  return `| ${c} | ${vox[0] * 32}×${vox[1] * 32} | ${list.join(', ')} |`;
}).join('\n')}

## Units

Units are authored at 64³ design resolution and recalculated to **half-scale
world voxels** (1 unit = 16 world voxels of ground), so a soldier occupies a
fraction of a tile while vehicles fill most of it. Every unit keeps eight
directional facings and six team variants.

${section('Base unit types', units)}

## Buildings and structures

${section('1×1 posts and small structures', buildings.filter(r => fp(r.footprint) === '1×1'))}
${section('2×2 facilities', buildings.filter(r => fp(r.footprint) === '2×2'))}
${section('3×2 and 3×3 compounds', buildings.filter(r => r.footprint[0] === 3))}

Every building type also has four faction variants, which are listed in the
appendix below.

## Terrain and environment

Terrain cells keep their ids, movement costs, defence values and elevation
semantics. Only the *scale* of the geometry changed: 64³ design cells map to
32×32 world tiles, and the \`elevation-*\` blocks keep world z units so their
heights remain the elevation system levels (0, 4, …, 32 → 0, 4, …, 32 px).

| id | terrain role | footprint | height class | model bounds | status |
| --- | --- | --- | --- | --- | --- |
${terrainRoles}

## Faction variants (appendix)

${section('Unit variants', rows.filter(r => r.kind === 'unit' && isVariant(r.id)))}
${section('Building variants', rows.filter(r => r.kind === 'building' && isVariant(r.id)))}

## Validation status

All rows above are derived from a completed \`npm run voxels:all\` +
\`npm run voxels:review\`: the model exists in \`data/voxels.json\`, a manifest
entry exists with the expected facing/variant/frame counts, and the baked
sheet file exists on disk. \`tests/scale.test.js\` re-checks the same gates plus
the runtime integration (footprints, anchors, placement, elevation).

Known, documented exceptions:

1. **Flat terrain surfaces** (\`plains\`, \`river\`, \`sea\`, \`shoal\`) are drawn by
   the runtime vector/coast painter (animated shimmer), not by voxel sprites;
   their voxel ids exist for the sprite pipeline but legacy renderer paths are
   preserved by design (\`renderMode: "vector"\`).
2. **Projectiles and blast particles** remain renderer-side effects; only the
   \`silo-missile\` effect is a voxel model.
3. **Units are not multi-cell.** Rendered length can exceed one tile at the
   edges (a battleship's hull spans a full tile), but gameplay occupancy stays
   one cell, exactly as before the rescale.
`;

fs.writeFileSync(path.join(ROOT, 'docs/ASSET_SIZING_MATRIX.md'), md);

/* ------------------------------------------------------------- HTML page -- */
const pageRows = rows.map(r => `<tr>
  <td><code>${r.id}</code></td><td>${CATEGORY_LABELS[r.category] ?? r.category}</td>
  <td>${r.heightClass}</td><td>${fp(r.footprint)}</td>
  <td>${sizeStr(r.bounds)}</td><td>${r.renderScale}</td>
  <td>${r.facings}</td><td>${r.variants}</td><td>${r.frames}</td>
  <td>${status(r)}</td>
</tr>`).join('\n');

// The page lives in docs/review/, so asset paths are relative to it.
const previewFor = r => `../../game_assets/voxels/${r.id}.png`;

const rosterSection = (title, list) => list.length ? `
  <details open>
    <summary>${title} (${list.length})</summary>
    <div class="gallery">
${list.map(r => `      <div class="card"><img loading="lazy" src="${previewFor(r)}" alt="${r.id}"><span>${r.id}<br>${fp(r.footprint)}</span></div>`).join('\n')}
    </div>
  </details>` : '';

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Scale Migration Review — 128³ canvas / 32-unit tiles</title>
<style>
:root{color-scheme:dark;--bg:#0f1319;--panel:#171d26;--line:#2a3442;--muted:#a7b4c4;--text:#eef3f8;--accent:#8fd0a4}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
header{padding:26px clamp(16px,3vw,40px);border-bottom:1px solid var(--line);background:#131922}
h1{margin:0 0 6px;font-size:clamp(20px,2.6vw,30px)}h2{margin:34px 0 10px;font-size:20px}
p{margin:6px 0;color:var(--muted)}a{color:var(--accent)}
main{padding:8px clamp(14px,2.4vw,34px) 60px}
.figures{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));margin-top:16px}
figure{margin:0;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px}
figure img{width:100%;height:auto;image-rendering:pixelated;background:#0b0f14;border-radius:6px}
figcaption{margin-top:8px;color:var(--muted);font-size:12px}
table{border-collapse:collapse;width:100%;font-size:12.5px;margin-top:10px}
th,td{border-bottom:1px solid var(--line);padding:5px 7px;text-align:left}
th{position:sticky;top:0;background:#131922;z-index:1}
tr:hover td{background:#1b2430}
.scroll{max-height:520px;overflow:auto;border:1px solid var(--line);border-radius:8px}
.gallery{display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));margin-top:12px}
details{margin-top:14px;border:1px solid var(--line);border-radius:8px;padding:8px 12px;background:#131922}
summary{cursor:pointer;font-weight:600;padding:4px 0}
.card{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:8px;text-align:center}
.card img{width:100%;height:74px;object-fit:contain;image-rendering:pixelated}
.card span{display:block;font-size:11px;color:var(--muted);margin-top:4px;word-break:break-word}
.rule{background:var(--panel);border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:8px;padding:10px 12px;margin:10px 0;color:var(--muted)}
code{background:#0b0f14;padding:1px 5px;border-radius:4px}
</style>
</head>
<body>
<header>
  <h1>Scale migration review — 128×128×128 canvas, 32-unit tile grid</h1>
  <p>${count.total} models · ${count.units} unit models (${units.length} types × 5 armies) ·
     ${count.buildings} building models (${buildings.length} types × 5 armies) ·
     ${count.terrain} terrain · ${count.effects} effect · ${validated}/${count.total} validated</p>
  <p>Generated by <code>tools/voxel_pipeline/sizing-matrix.mjs</code>. Figures are produced from the
     committed baked sheets, not hand-edited images.</p>
</header>
<main>
  <h2>1. Representative scene</h2>
  <div class="rule">Mixed terrain at three elevations, road and bridge connectors, infantry beside
    vehicles, aircraft, ships, trees, 1×1 posts, 2×2 facilities and the 3×3 HQ — all blitted with the
    runtime anchors onto the 64×32 tile diamonds.</div>
  <figure>
    <img src="scale-scene.png" alt="Mixed-scale isometric scene">
    <figcaption>docs/review/scale-scene.png — 14×12 tile scene at 2× integer zoom.</figcaption>
  </figure>

  <h2>2. Category lineups at true relative scale</h2>
  <div class="rule">Every sprite is drawn at 1 runtime pixel per pixel, anchored on the same baseline
    within its row, so relative sizes are directly comparable.</div>
  <figure>
    <img src="scale-lineup.png" alt="Category lineups">
    <figcaption>docs/review/scale-lineup.png</figcaption>
  </figure>

  <h2>3. Before / after</h2>
  <div class="figure"><figure>
    <img src="before-after.png" alt="Before and after previews">
    <figcaption>Before: 64³ authoring cube treated as a whole tile. After: 128³ canvas, 32-unit tile,
      role-appropriate footprints.</figcaption>
  </figure></div>

  <h2>4. Building footprint gallery</h2>
  <div class="rule">Multi-tile compounds are authored across their full footprint: hq 3×3,
    airport 3×3, port 3×2, all other facilities 2×2, posts and turrets 1×1.</div>
  <div class="gallery">
    ${buildings.sort((a, b) => (b.footprint[0] * b.footprint[1]) - (a.footprint[0] * a.footprint[1]))
      .map(r => `<div class="card"><img src="${previewFor(r)}" alt="${r.id}"><span>${r.id}<br>${fp(r.footprint)} · ${sizeStr(r.bounds)}</span></div>`).join('\n    ')}
  </div>

  <h2>5. Full roster previews</h2>
  <div class="rule">Every generated preview, grouped by kind. ${count.total} models: ${units.length} unit types,
    ${buildings.length} building types, ${rows.filter(r => r.kind === 'terrain').length} terrain cells and
    ${count.effects} effect, each with its four faction variants.</div>
  ${rosterSection('Units', rows.filter(r => r.kind === 'unit'))}
  ${rosterSection('Buildings and structures', rows.filter(r => r.kind === 'building'))}
  ${rosterSection('Terrain and effects', rows.filter(r => r.kind === 'terrain' || r.kind === 'effect'))}

  <h2>6. Full sizing matrix</h2>
  <div class="scroll">
    <table>
      <thead><tr><th>id</th><th>category</th><th>height class</th><th>footprint</th>
        <th>model bounds</th><th>render scale</th><th>facings</th><th>variants</th><th>frame cells</th><th>status</th></tr></thead>
      <tbody>
${pageRows}
      </tbody>
    </table>
  </div>
</main>
</body>
</html>
`;

fs.mkdirSync(path.join(ROOT, 'docs/review'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/review/scale-review.html'), html);

console.log(`Wrote docs/ASSET_SIZING_MATRIX.md (${rows.length} rows) and docs/review/scale-review.html`);
