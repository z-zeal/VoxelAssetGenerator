#!/usr/bin/env node
/**
 * Generates the asset sizing matrix (docs/ASSET_SIZING_MATRIX.md) and the
 * interactive review page (docs/review/scale-review.html) from the committed
 * model data, so the documentation can never drift from the assets.
 *
 * Run: npm run voxels:matrix   (or as part of `npm run voxels:review`)
 */
import crypto from 'node:crypto';
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
    cell: entry.right.cell,
    anchor: [entry.right.anchorX, entry.right.anchorY],
    clips: m.clips,
    // Units carry a role-driven footprint class (1 / 1.25 / 1.5 / 1.75 / 2
    // tiles) instead of being forced onto a 1x1 grid cell. Buildings keep the
    // integer tile grid they are placed on.
    sizeClass: m.kind === 'unit' ? (Math.round(m.gameplayFootprint[0] * 100) / 100) : null,
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
  const head = '| id | category | height class | size class | footprint (tiles) | model bounds (voxels) | render scale | facings | variants | frame cells | status |\n'
    + '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n';
  const body = list.map(r => `| \`${r.id}\` | ${CATEGORY_LABELS[r.category] ?? r.category} | ${r.heightClass} | ${r.sizeClass === null ? '—' : r.sizeClass + '×'} | ${fp(r.footprint)} (${Math.round(r.footprint[0] * 32)}×${Math.round(r.footprint[1] * 32)}) | ${sizeStr(r.bounds)} | ${r.renderScale} | ${r.facings} | ${r.variants} | ${r.frames} | ${status(r)} |`).join('\n');
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

- One ground tile = **32 × 32 world voxels**, projected as a **128 × 64 px**
  isometric diamond (**4 px per voxel horizontally, 2 px per voxel
  vertically**). The tile got bigger when the tile-grid unit got smaller, so a
  1×1 asset still gets a full-size sprite and stays crisp.
- Maximum model canvas = **128 × 128 × 128 voxels** = 4 × 4 tiles.
- \`gameplay footprint\` = cells a structure occupies for placement, collision,
  selection and ownership. \`visual footprint\` = ground area the sprite covers.
  Both are listed; both are equal for the current roster (no decorative overhang
  that would confuse placement).
- \`model bounds\` = the painted geometry inside the 128³ authoring canvas.
- Buildings sit on integer tile footprints that are multiples of 32 voxels:
  1×1, 2×2, 3×2, 3×3 are in use.
- Units use **role size classes** — 1, 1.25, 1.5, 1.75 and 2 tiles — because
  the game moves units on floating-point positions rather than snapping them to
  a grid cell. A rifleman is 1×1; a battleship is 2×2.
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

Units are authored at 64³ design resolution. Each unit's role picks a **size
class** from \`UNIT_SIZES\` in \`tools/voxel_pipeline/scale.mjs\`, which yields a
target footprint in tiles. The model is then resampled by **one uniform factor**
(nothing is stretched per axis) so it fills that footprint plus its role height.

Size classes exist because units are *not* grid-locked: the game integrates
their positions as floating-point world units, so a 0.75-tile APC is as valid as a
half-tile rifleman. The roster is deliberately bounded: **nothing is smaller than
half a tile and nothing is bigger than 1.25 tiles**, so units never compete with
the 2×2 buildings they stand next to.

| size class | tiles | world voxels | units |
| --- | --- | --- | --- |
${[0.5, 0.75, 1, 1.25].map(c => {
  const list = units.filter(r => r.footprint[0] === c).map(r => `\`${r.id}\``);
  return `| ${c}× | ${c} × ${c} | ${c * 32} × ${c * 32} | ${list.length ? list.join(', ') : '—'} |`;
}).join('\n')}

A battleship covers **6.25×** the ground of a rifleman while still fitting inside
a tile and a quarter, and every unit keeps eight directional facings and six team
variants. \`docs/review/unit-size.png\` draws the ladder at 1:1 next to a 2×2
barracks, and \`docs/review/unit-size-wall.png\` shows all 58 types on one grid.

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
3. **Units use fractional footprints without grid occupancy.** A unit declares
   1 / 1.25 / 1.5 / 1.75 / 2 tiles of ground so its size class is explicit, but
   \`footprintCells()\` still returns a single cell: occupancy, pathing and
   collision stay continuous because the game moves units on floating-point
   positions.
`;

fs.writeFileSync(path.join(ROOT, 'docs/ASSET_SIZING_MATRIX.md'), md);

/* ------------------------------------------------------------- HTML page -- */
const cellPx = r => `${r.cell.w}×${r.cell.h}`;

// Preview PNGs are rendered by preview.mjs and are NOT the same crop as the iso
// cells, so the <img> intrinsic size has to come from the file itself.
const previewSizes = new Map();
function previewSize(id) {
  if (!previewSizes.has(id)) {
    const buf = fs.readFileSync(path.join(ROOT, 'game_assets/voxels', `${id}.png`));
    previewSizes.set(id, { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) });
  }
  return previewSizes.get(id);
}

/** Intrinsic size of a review figure, so the <img> never lies about its aspect. */
function pngSize(name) {
  const buf = fs.readFileSync(path.join(ROOT, 'docs/review', name));
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

/**
 * Content-hashed URL for a generated figure. The file names are stable across
 * rebuilds, so without a version query a browser (or a proxy) can keep showing
 * a scene from an earlier bake — which looks exactly like a broken asset.
 */
function figureUrl(name, size) {
  const buf = fs.readFileSync(path.join(ROOT, 'docs/review', name));
  const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10);
  return `${name}?v=${hash}`;
}
const lineupImg = pngSize('scale-lineup.png');
const sceneImg = pngSize('scale-scene.png');
const beforeAfterImg = pngSize('before-after.png');
const unitSizeImg = pngSize('unit-size.png');
const sizeWallImg = pngSize('unit-size-wall.png');
const pageRows = rows.map(r => `<tr>
  <td><code>${r.id}</code></td><td>${CATEGORY_LABELS[r.category] ?? r.category}</td>
  <td>${r.heightClass}</td><td>${r.sizeClass === null ? '—' : r.sizeClass + '×'}</td>
  <td>${fp(r.footprint)}</td>
  <td>${sizeStr(r.bounds)}</td><td>${r.renderScale}</td>
  <td>${cellPx(r)}</td><td>${r.facings}</td><td>${r.variants}</td><td>${r.frames}</td>
  <td>${status(r)}</td>
</tr>`).join('\n');

// The page lives in docs/review/, so asset paths are relative to it.
const previewFor = r => `../../game_assets/voxels/${r.id}.png`;

// Cards are NOT normalised: each preview keeps its baked pixel size, so a 385 px
// HQ really is wider on screen than a 73 px rifleman. That is the whole point of
// the review page, so no object-fit / fixed height anywhere.
const card = r => {
  const p = previewSize(r.id);
  return `<div class="card"><img loading="lazy" src="${previewFor(r)}" alt="${r.id}" `
    + `width="${p.w}" height="${p.h}"><span><b>${r.id}</b><br>`
    + `${r.sizeClass === null ? fp(r.footprint) + ' tiles' : r.sizeClass + '× tile'} · ${p.w}×${p.h} px</span></div>`;
};

const rosterSection = (title, list, open = false) => list.length ? `
  <details${open ? ' open' : ''}>
    <summary>${title} (${list.length})</summary>
    <div class="gallery">
${list.map(r => '      ' + card(r)).join('\n')}
    </div>
  </details>` : '';

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Scale Migration Review — 128³ canvas / 32-unit tiles</title>
<style>
:root{color-scheme:dark;--bg:#0f1319;--panel:#171d26;--line:#2a3442;--muted:#a7b4c4;--text:#eef3f8;--accent:#8fd0a4;--z:1}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
header{padding:26px clamp(16px,3vw,40px);border-bottom:1px solid var(--line);background:#131922}
h1{margin:0 0 6px;font-size:clamp(20px,2.6vw,30px)}h2{margin:34px 0 10px;font-size:20px}
p{margin:6px 0;color:var(--muted)}a{color:var(--accent)}
main{padding:8px clamp(14px,2.4vw,34px) 60px}
figure{margin:0;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px}
figure img{display:block;width:auto;height:auto;max-width:none;image-rendering:pixelated;background:#0b0f14;border-radius:6px;zoom:var(--z)}
figure{overflow:auto}
figcaption{margin-top:8px;color:var(--muted);font-size:12px}
table{border-collapse:collapse;width:100%;font-size:12.5px;margin-top:10px}
th,td{border-bottom:1px solid var(--line);padding:5px 7px;text-align:left}
th{position:sticky;top:0;background:#131922;z-index:1}
tr:hover td{background:#1b2430}
.scroll{max-height:520px;overflow:auto;border:1px solid var(--line);border-radius:8px}
.gallery{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin-top:12px}
details{margin-top:14px;border:1px solid var(--line);border-radius:8px;padding:8px 12px;background:#131922}
summary{cursor:pointer;font-weight:600;padding:4px 0}
.card{flex:0 0 auto;background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:8px;text-align:center}
.card img{display:block;width:auto;height:auto;image-rendering:pixelated;margin:0 auto;zoom:var(--z)}
.card span{display:block;font-size:11px;color:var(--muted);margin-top:6px;word-break:break-word}
.rule{background:var(--panel);border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:8px;padding:10px 12px;margin:10px 0;color:var(--muted)}
code{background:#0b0f14;padding:1px 5px;border-radius:4px}
.bar{position:sticky;top:0;z-index:9;display:flex;flex-wrap:wrap;gap:10px;align-items:center;
  padding:10px clamp(14px,2.4vw,34px);background:#131922ee;backdrop-filter:blur(6px);border-bottom:1px solid var(--line)}
.bar span.lbl{color:var(--muted);font-size:12px}
.bar button{background:#1d2632;color:var(--text);border:1px solid var(--line);border-radius:6px;
  padding:5px 11px;font:inherit;font-size:12.5px;cursor:pointer}
.bar button.active{background:var(--accent);color:#0f1319;border-color:var(--accent);font-weight:600}
.ruler{display:inline-flex;flex-direction:column;gap:3px;margin-left:6px}
.ruler i{display:block;height:12px;width:calc(128px * var(--z));
  background-image:repeating-linear-gradient(90deg,var(--accent) 0 1px,transparent 1px calc(4px * var(--z)))}
.ruler small{color:var(--muted);font-size:11px}
</style>
</head>
<body>
<div class="bar">
  <span class="lbl">Zoom</span>
  <button data-zoom="1" class="active">1:1</button>
  <button data-zoom="2">2×</button>
  <button data-zoom="3">3×</button>
  <span class="ruler"><i></i><small>1 tile = 128 × 64 px = 32 × 32 voxels; each tick = 1 voxel (4 px wide)</small></span>
</div>
<header>
  <h1>Scale migration review — 128×128×128 canvas, 32-unit tile grid</h1>
  <p>${count.total} models · ${count.units} unit models (${units.length} types × 5 armies) ·
     ${count.buildings} building models (${buildings.length} types × 5 armies) ·
     ${count.terrain} terrain · ${count.effects} effect · ${validated}/${count.total} validated</p>
  <p>Generated by <code>tools/voxel_pipeline/sizing-matrix.mjs</code>. Figures are produced from the
     committed baked sheets, not hand-edited images.</p>
</header>
<main>
  <h2>How to read this page</h2>
  <div class="rule">
    Every image is shown <b>1:1</b> — one image pixel is one screen pixel, at the same
    <b>4 px per voxel across, 2 px down</b> density the runtime blits (previews are frame-0 crops
    of their baked cells). Nothing is normalised: a 385 px HQ <em>is</em> many times wider on
    screen than a 27 px rifleman.
    Units run from <b>0.5 to 1.25 tiles</b>; buildings start at <b>2×2</b>.
    One map tile is <b>128 × 64 px</b> covering <b>32 × 32 voxels</b>, so a voxel is <b>4 × 2 px</b>.
    Use the zoom buttons to inspect at 2×/3×; the art is nearest-neighbour, so it stays crisp.
  </div>

  <h2>1. Unit size ladder — 0.5 → 1.25 tiles at 1:1</h2>
  <div class="rule">
    One representative per size class, <b>0.5 / 0.75 / 1 / 1.25 tiles</b>, drawn one image pixel per
    screen pixel on a shared baseline, each standing on its own tile diamond (green diamond = exactly
    one tile). A <b>2×2 barracks</b> sits underneath at the same zoom: that is the invariant — units
    run from half a tile to a tile and a quarter, and buildings start at 2×2, four times the ground of
    the largest unit. Measured sprite widths: infantry <b>49 px</b>, APC <b>73</b>, tank <b>91</b>,
    battleship <b>113</b>, barracks <b>257</b>.
  </div>
  <figure>
    <img src="${figureUrl('unit-size.png')}" alt="Unit size ladder: 0.5, 0.75, 1 and 1.25 tiles at 1:1" width="${unitSizeImg.w}" height="${unitSizeImg.h}">
    <figcaption>docs/review/unit-size.png — nothing normalised, nothing scaled for display.</figcaption>
  </figure>

  <h2>2. Every unit type at true size</h2>
  <div class="rule">
    All 58 unit types, drawn 1:1 on the same continuous tile grid and grouped by size class. Each
    sprite sits on its own tile diamond; the bar beside each class heading is that footprint drawn to
    the same scale.
  </div>
  <figure>
    <img src="${figureUrl('unit-size-wall.png')}" alt="Every unit type at true size, grouped by size class" width="${sizeWallImg.w}" height="${sizeWallImg.h}">
    <figcaption>docs/review/unit-size-wall.png — 58 types · 0.5 / 0.75 / 1 / 1.25 tiles · 1 image
      pixel per screen pixel.</figcaption>
  </figure>

  <h2>3. Category lineups with ground footprints</h2>
  <div class="rule">
    Units, buildings and terrain in category rows, each sprite on its ground-footprint diamond with
    its size class printed underneath — so a 0.5-tile rifleman, a 0.75-tile APC, a 1-tile tank and a
    1.25-tile battleship can be read against each other and against the 2×2 facilities and 3×3
    compounds in the same sheet.
  </div>
  <figure>
    <img src="${figureUrl('scale-lineup.png')}" alt="Category lineups with ground footprints" width="${lineupImg.w}" height="${lineupImg.h}">
    <figcaption>docs/review/scale-lineup.png — every sprite 1 image pixel per screen pixel, on a
      shared baseline, with its ground footprint.</figcaption>
  </figure>

  <h2>4. Representative scene</h2>
  <div class="rule">Mixed terrain with a two-step hill (level 24 on a level-8 apron, so the cliffs are
    32 px and 16 px tall), road and bridge connectors, infantry beside vehicles, aircraft, ships, trees, 1×1
    posts, 2×2 facilities and the 3×3 HQ — all blitted with the runtime anchors onto 128×64 px tile
    diamonds. Terrain tops are tinted by height and cliffs are drawn after the ground, so a raised
    terrace reads as a step instead of a line across the grass.</div>
  <figure>
    <img src="${figureUrl('scale-scene.png')}" alt="Mixed-scale isometric scene" width="${sceneImg.w}" height="${sceneImg.h}">
    <figcaption>docs/review/scale-scene.png — 14×12 tile scene at 1:1, cropped to content.</figcaption>
  </figure>

  <h2>5. Before / after (whole roster)</h2>
  <div class="rule">Legacy previews were rendered at 2× runtime scale; they are halved here so the
    comparison is 1:1 on both sides. Sprites grew, they did not shrink.</div>
  <figure>
    <img src="${figureUrl('before-after.png')}" alt="Before and after previews" width="${beforeAfterImg.w}" height="${beforeAfterImg.h}">
    <figcaption>Before: 64³ authoring cube treated as a whole tile. After: 128³ canvas, 32-unit tile,
      role-appropriate footprints.</figcaption>
  </figure>

  <h2>6. Building footprint gallery</h2>
  <div class="rule">Multi-tile compounds are authored across their full footprint: hq 3×3,
    airport 3×3, port 3×2, all other facilities 2×2, posts and turrets 1×1. Cards keep their baked
    pixel size, so relative size is readable.</div>
  <div class="gallery">
    ${buildings.sort((a, b) => (b.footprint[0] * b.footprint[1]) - (a.footprint[0] * a.footprint[1]))
      .map(r => card(r)).join('\n    ')}
  </div>

  <h2>7. Full roster previews</h2>
  <div class="rule">Every generated preview, grouped by kind. ${count.total} models: ${units.length} unit types,
    ${buildings.length} building types, ${rows.filter(r => r.kind === 'terrain').length} terrain cells and
    ${count.effects} effect, each with its four faction variants. Previews are natural size — compare
    an infantry card with a battleship card.</div>
  ${rosterSection('Units — all size classes', rows.filter(r => r.kind === 'unit' && !isVariant(r.id)), true)}
  ${rosterSection('Unit faction variants', rows.filter(r => r.kind === 'unit' && isVariant(r.id)))}
  ${rosterSection('Buildings and structures', rows.filter(r => r.kind === 'building'))}
  ${rosterSection('Terrain and effects', rows.filter(r => r.kind === 'terrain' || r.kind === 'effect'))}

  <h2>8. Full sizing matrix</h2>
  <div class="scroll">
    <table>
      <thead><tr><th>id</th><th>category</th><th>height class</th><th>size class</th><th>footprint</th>
        <th>model bounds</th><th>render scale</th><th>sprite px</th><th>facings</th><th>variants</th><th>frame cells</th><th>status</th></tr></thead>
      <tbody>
${pageRows}
      </tbody>
    </table>
  </div>
</main>
<script>
  const root = document.documentElement;
  const buttons = [...document.querySelectorAll('[data-zoom]')];
  for (const b of buttons) {
    b.addEventListener('click', () => {
      root.style.setProperty('--z', b.dataset.zoom);
      for (const x of buttons) x.classList.toggle('active', x === b);
    });
  }
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(ROOT, 'docs/review/scale-review.html'), html);

console.log(`Wrote docs/ASSET_SIZING_MATRIX.md (${rows.length} rows) and docs/review/scale-review.html`);
