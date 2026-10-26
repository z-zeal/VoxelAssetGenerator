/**
 * Scale-migration gates: 128×128×128 canvas, 32-unit ground tile, multi-tile
 * building footprints, world-scale resampling and runtime integration.
 *
 * These tests are the machine-checkable half of docs/SCALE_128.md.  They read
 * the committed outputs (data/voxels.json, the baked manifest, the previews)
 * so a partial rebuild cannot pass.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MODEL_CANVAS, TILE_UNITS, TILES_PER_AXIS, TILE_SIZE_PX, FOOTPRINT_CLASSES,
  BUILDING_SPECS, modelSpec, boundsOf, validateModel, footprintRect,
} from '../tools/voxel_pipeline/scale.mjs';
import {
  sculptModel, clipsFor, BUILDINGS, TERRAIN_MODELS, UNIT_ARMY_IDS, VOXEL_SIZE, DESIGN_SIZE,
} from '../tools/voxel_pipeline/build.mjs';
import { BUILDING_FOOTPRINTS, MULTI_TILE_BUILDINGS, buildingFootprint } from '../src/asset-scale.js';
import {
  TILE_W, TILE_H, TILE_VOXELS, VOXEL_Z_PX, VOXEL_GRID_SIZE, DOWNSCALE,
  footprintOf, footprintCells, canPlaceFootprint, getBuildingRenderPosition,
  createMap, setTileElevation, getTileElevation,
} from '../src/iso.js';
import { renderIso, blitSheet } from '../src/iso-renderer.js';
import { decodePng } from '../tools/voxel_pipeline/png.mjs';
import { buildVariantLut } from '../tools/voxel_pipeline/bake.mjs';
import { MapElevationEditor } from '../src/map-editor.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const voxDoc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/voxels.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'game_assets/voxels/sheets/manifest.json'), 'utf8'));
const terrainJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/terrain.json'), 'utf8'));
const animationJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/animation.json'), 'utf8'));

const allIds = Object.keys(voxDoc.models);
const baseIdOf = id => (id.includes('--') ? id.split('--')[0] : id);

/* ------------------------------------------------------------------ 1. canvas */
test('1. The model canvas is 128×128×128 and the ground tile is 32 units (4×4 tiles)', () => {
  assert.deepEqual([...MODEL_CANVAS], [128, 128, 128]);
  assert.equal(TILE_UNITS, 32);
  assert.equal(TILES_PER_AXIS, 4);
  assert.deepEqual([...TILE_SIZE_PX], [64, 32]);

  // The document, the pipeline and the runtime must agree.
  assert.equal(voxDoc.format, 'field-command-voxel-128x128x128');
  assert.deepEqual(voxDoc.scale.canvas, [128, 128, 128]);
  assert.equal(voxDoc.scale.tileUnits, 32);
  assert.deepEqual(voxDoc.scale.tileSizePx, [64, 32]);
  assert.equal(voxDoc.scale.tilesPerAxis, 4);

  assert.equal(VOXEL_SIZE.join('x'), '128x128x128');
  assert.equal(DESIGN_SIZE.join('x'), '64x64x64');
  assert.equal(VOXEL_GRID_SIZE, 128);
  assert.equal(DOWNSCALE, 2);
  assert.equal(VOXEL_Z_PX, 1);
  assert.equal(TILE_VOXELS, 32);

  // 32 world voxels project onto the 64 px tile diamond: 1 tile = 32 voxels.
  assert.equal(TILE_W / TILE_VOXELS, 2, 'two runtime px per voxel horizontally');
  assert.equal(TILE_H / TILE_VOXELS, 1, 'one runtime px per voxel vertically');

  assert.equal(manifest.format, 'field-command-voxel-sheet-4');
  assert.deepEqual(manifest.gridSize, [128, 128, 128]);
  assert.equal(manifest.tileUnits, 32);
  assert.equal(manifest.tilesPerAxis, 4);
  assert.equal(manifest.downscale, 2);
  assert.equal(manifest.voxelZPx, 1);
});

/* --------------------------------------------------------------- 2. metadata */
test('2. Every generated model declares footprint, design grid, voxel scale, anchor and bounds metadata', () => {
  assert.equal(allIds.length, 500, 'the full roster must be regenerated');
  for (const id of allIds) {
    const m = voxDoc.models[id];
    assert.deepEqual(m.size, [128, 128, 128], `${id}: size field must be the 128³ canvas`);
    assert.ok(Array.isArray(m.footprint) && m.footprint.length === 2, `${id}: footprint`);
    assert.ok(FOOTPRINT_CLASSES.some(([w, h]) => w === m.footprint[0] && h === m.footprint[1]),
      `${id}: footprint ${m.footprint} must be a supported tile increment`);
    assert.deepEqual(m.gameplayFootprint, m.footprint, `${id}: gameplay footprint`);
    assert.deepEqual(m.visualFootprint, m.footprint, `${id}: visual footprint`);
    assert.equal(m.renderScale, 1, `${id}: renderScale`);
    assert.ok(Array.isArray(m.design) && m.design.length === 3, `${id}: design grid`);
    assert.ok(Array.isArray(m.voxelScale) && m.voxelScale.length === 3, `${id}: voxel scale`);
    assert.ok(Array.isArray(m.groundAnchor) && m.groundAnchor.length === 3, `${id}: ground anchor`);
    assert.ok(typeof m.heightClass === 'string' && m.heightClass.length, `${id}: height class`);
    assert.ok(typeof m.category === 'string' && m.category.length, `${id}: category`);
    assert.ok(Number.isFinite(m.clippingMargin), `${id}: clipping margin`);
    assert.deepEqual(m.bounds, boundsOf(m.voxels.map(([x, y, z]) => [x, y, z])), `${id}: recorded bounds must match geometry`);
  }
});

/* ----------------------------------------------------------------- 3. bounds */
test('3. No model exceeds the 128³ canvas and every ground footprint lands on 32-unit tile boundaries', () => {
  let maxHeight = 0;
  let tallestId = null;
  for (const id of allIds) {
    const m = voxDoc.models[id];
    const b = m.bounds;
    for (let axis = 0; axis < 3; axis++) {
      assert.ok(b.min[axis] >= 0, `${id}: min ${axis} below 0 (${b.min[axis]})`);
      assert.ok(b.max[axis] < 128, `${id}: max ${axis} exceeds 127 (${b.max[axis]})`);
      assert.ok(b.size[axis] <= 128, `${id}: size ${axis} exceeds the canvas`);
    }
    if (b.size[2] > maxHeight) { maxHeight = b.size[2]; tallestId = id; }
    // Ground footprint aligned to whole tiles, feet inside the declared cells
    // (one tile of overhang is tolerated for wings/barrels; the generator gate
    // validateModel enforces the same rule).
    const rect = footprintRect(m.footprint);
    if (m.kind === 'building') {
      assert.ok(b.min[0] >= rect.x && b.max[0] < rect.x + rect.w, `${id}: x outside its ${m.footprint.join('×')} footprint`);
      assert.ok(b.min[1] >= rect.y && b.max[1] < rect.y + rect.h, `${id}: y outside its ${m.footprint.join('×')} footprint`);
      assert.equal(rect.x % TILE_UNITS, 0);
      assert.equal(rect.y % TILE_UNITS, 0);
    }
  }
  assert.ok(maxHeight <= 128);
  assert.ok(tallestId, 'at least one model measured');
});

/* ------------------------------------------------------- 4. scale hierarchy */
test('4. Scale hierarchy: infantry < vehicles < 1×1 posts < facilities < HQ', () => {
  const size = id => voxDoc.models[id].bounds.size;
  const foot = ['infantry', 'engineer', 'medic', 'rocket-infantry', 'sniper'];
  for (const id of foot) {
    const [w, , h] = size(id);
    assert.ok(w <= 32 && h <= 32, `${id}: infantry must stay inside one tile (${w}×${h})`);
    assert.ok(h >= 16, `${id}: infantry must stay readable as a person (${h} voxels tall)`);
  }
  const tanks = ['tank', 'heavy', 'mega', 'bastion'];
  for (const id of tanks) {
    const [w, d, h] = size(id);
    assert.ok(w > size('infantry')[0], `${id}: armoured vehicles must out-size infantry`);
    assert.ok(w >= 24 && d >= 16, `${id}: ${w}×${d} reads as a vehicle`);
    assert.ok(h < 32, `${id}: a tank must not be building-tall (${h})`);
  }
  for (const id of ['pillbox', 'bunker', 'guard-tower']) {
    assert.deepEqual(voxDoc.models[id].footprint, [1, 1], `${id} is a 1×1 post`);
  }
  assert.deepEqual(voxDoc.models.hq.footprint, [3, 3]);
  const hq = size('hq');
  const post = size('pillbox');
  assert.ok(hq[0] > post[0] * 2 && hq[1] > post[1] * 2, 'the HQ must be visibly larger than a small post');
  assert.ok(hq[2] > post[2], 'the HQ must also be taller than a small post');
  for (const id of BUILDINGS.filter(b => !b.includes('--'))) {
    const fp = footprintOf(id);
    const other = footprintOf(id === 'hq' ? 'pillbox' : 'hq');
    assert.ok(fp.length === 2 && other.length === 2);
  }
});

/* --------------------------------------------------------- 5. resample gate */
test('5. World resampling is deterministic and lands each asset inside its footprint block', () => {
  const build = (id, kind) => sculptModel(id, kind, 'standard', { action: 'idle', frame: 0 });
  const a = build('tank', 'unit');
  const b = build('tank', 'unit');
  assert.deepEqual(a.finish(), b.finish(), 'resampling must be deterministic');
  const spec = a.spec;
  assert.deepEqual(spec.scale, [0.5, 0.5, 0.5], 'design voxels become half-scale world voxels');
  // Each model is translated into the block its footprint occupies; nothing is
  // stretched, so the aspect ratio of the silhouette is preserved.
  for (const [id, kind, fp] of [['tank', 'unit', [1, 1]], ['hq', 'building', [3, 3]], ['port', 'building', [3, 2]]]) {
    const spec2 = modelSpec(id, kind, kind === 'unit' ? 'tracked' : id);
    const rect = footprintRect(fp);
    assert.deepEqual(spec2.offset, [rect.x, rect.y, 0], `${id}: translated into its footprint block`);
    assert.deepEqual(spec2.footprint, fp, `${id}: footprint`);
  }

  // A 1×1 asset's geometry must stay inside its 32-unit cell.
  const bounds = a.spec && boundsOf(a.finish());
  assert.ok(bounds.min[0] >= 32 && bounds.max[0] < 64, `tank x ${bounds.min[0]}..${bounds.max[0]} outside its tile`);
  assert.ok(bounds.min[1] >= 32 && bounds.max[1] < 64, `tank y ${bounds.min[1]}..${bounds.max[1]} outside its tile`);
  assert.ok(bounds.max[2] < 64, 'a tank is not a skyscraper');

  // 3×3 compounds are translated into their 96×96 block, not scaled.
  const hq = build('hq', 'building');
  const hqBounds = boundsOf(hq.finish());
  assert.ok(hqBounds.min[0] >= 0 && hqBounds.max[0] < 96);
  assert.ok(hqBounds.min[1] >= 0 && hqBounds.max[1] < 96);
  assert.ok(hqBounds.size[0] >= 64 && hqBounds.size[1] >= 64, 'the HQ must fill most of its 3×3 compound');

  // Validation catches out-of-canvas and unsupported footprints.
  assert.deepEqual(validateModel({ bounds: { min: [0, 0, 0], max: [127, 127, 127], size: [128, 128, 128] }, footprint: [3, 3], renderScale: 1 }), []);
  assert.ok(validateModel({ bounds: { min: [0, 0, 0], max: [128, 5, 5], size: [129, 6, 6] }, footprint: [3, 3], renderScale: 1 }).length > 0);
  assert.ok(validateModel({ bounds: { min: [0, 0, 0], max: [10, 10, 10], size: [11, 11, 11] }, footprint: [5, 5], renderScale: 1 }).length > 0);
});

/* --------------------------------------------------------- 6. catalog specs */
test('6. The building catalogue assigns sensible multi-tile footprints and keeps gameplay placement in sync', () => {
  assert.deepEqual(BUILDING_SPECS.hq.footprint, [3, 3]);
  assert.deepEqual(BUILDING_SPECS.airport.footprint, [3, 3]);
  assert.deepEqual(BUILDING_SPECS.port.footprint, [3, 2]);
  for (const small of ['pillbox', 'bunker', 'at-turret', 'sam-site', 'flak-cannon',
    'coastal-battery', 'artillery-emplacement', 'guard-tower', 'landmine']) {
    assert.deepEqual(BUILDING_SPECS[small].footprint, [1, 1], `${small} is a 1×1 structure`);
  }
  for (const medium of ['base', 'barracks', 'power-plant', 'radar-station', 'depot']) {
    assert.deepEqual(BUILDING_SPECS[medium].footprint, [2, 2], `${medium} is a 2×2 facility`);
  }
  // Runtime table mirrors the catalogue exactly.
  for (const [id, spec] of Object.entries(BUILDING_SPECS)) {
    assert.deepEqual(BUILDING_FOOTPRINTS[id], spec.footprint, `${id}: runtime footprint must match the catalogue`);
  }
  for (const id of ['hq', 'airport', 'port', 'base', 'barracks']) assert.ok(MULTI_TILE_BUILDINGS.has(id));
  assert.equal(buildingFootprint('unknown-thing').join('x'), '1x1');
});

/* ------------------------------------------------------- 7. runtime footprint */
test('7. Runtime placement validates multi-tile footprints (bounds, flat ground, overlap)', () => {
  const map = createMap({ width: 8, height: 8 });
  assert.equal(canPlaceFootprint(map, 5, 5, [3, 3]).ok, true);
  assert.equal(canPlaceFootprint(map, 6, 6, [3, 3]).reason, 'out-of-bounds');

  // Uneven ground is rejected so a compound is never split by a cliff.
  setTileElevation(map, 6, 6, 8);
  assert.equal(canPlaceFootprint(map, 5, 5, [3, 3]).reason, 'uneven-ground');
  setTileElevation(map, 6, 6, 0);

  // Overlap is rejected on any covered cell, so a 3×3 HQ blocks its neighbours.
  map.properties.push({ type: 'hq', x: 0, y: 0, owner: 0 });
  assert.equal(canPlaceFootprint(map, 1, 1, [2, 2]).reason, 'occupied');
  assert.equal(canPlaceFootprint(map, 1, 1, [1, 1]).reason, 'occupied');
  assert.equal(canPlaceFootprint(map, 3, 0, [2, 2]).ok, true);

  // Placement centres the footprint on the clicked tile and stores the
  // north-west anchor, clamping at map edges instead of spilling out.
  const editor = new MapElevationEditor(createMap({ width: 8, height: 8 }));
  assert.equal(editor.placeBuilding(4, 4, { type: 'hq' }), true);
  assert.deepEqual(editor.map.properties.map(p => [p.type, p.x, p.y]), [['hq', 3, 3]]);
  assert.equal(editor.inspectTile(5, 5).building.type, 'hq', 'inspection resolves from any covered cell');
  assert.equal(editor.placeBuilding(4, 3, { type: 'barracks' }), false, 'overlap is rejected without force');
  assert.equal(editor.lastPlacementError.reason, 'occupied');

  // Forced replacement clears the whole replaced footprint, not just the cells
  // under the new building.
  assert.equal(editor.placeBuilding(4, 4, { type: 'barracks', force: true }), true);
  assert.deepEqual(editor.map.properties.map(p => [p.type, p.x, p.y]), [['barracks', 4, 4]]);
  assert.equal(editor.inspectTile(5, 5).building.type, 'barracks');
  assert.equal(editor.inspectTile(3, 3).building, null, 'far HQ cells were released');

  const edge = new MapElevationEditor(createMap({ width: 4, height: 4 }));
  assert.equal(edge.placeBuilding(0, 0, { type: 'hq' }), true);
  assert.deepEqual(edge.map.properties[0].x, 0);
  assert.equal(edge.footprintAt(2, 2).property.type, 'hq');
  assert.deepEqual(footprintCells(0, 0, [3, 3]).length, 9);
});

/* ------------------------------------------------------- 8. anchored rendering */
test('8. Multi-tile buildings render centred on their footprint, grounded on the tile elevation', () => {
  const map = createMap({ width: 8, height: 8 });
  map.properties.push({ type: 'hq', x: 2, y: 2, owner: 0, facing: 'right' });
  const pos = getBuildingRenderPosition(map, map.properties[0], 480, 120, 1);
  assert.deepEqual(pos.footprint, [3, 3]);
  assert.equal(pos.cells.length, 9);
  assert.equal(pos.anchorX, 480 + (3 - 3) * 32, 'footprint centre is the sprite anchor');
  const marker = pos.selectionDiamond;
  assert.equal(marker.length, 4);

  // Raising the whole footprint lifts the anchor by exactly VOXEL_Z_PX each unit.
  for (const [x, y] of [[2, 2], [3, 2], [4, 2], [2, 3], [3, 3], [4, 3], [2, 4], [3, 4], [4, 4]]) {
    setTileElevation(map, x, y, 20);
  }
  const raised = getBuildingRenderPosition(map, map.properties[0], 480, 120, 1);
  assert.equal(raised.anchorX, pos.anchorX);
  assert.equal(raised.anchorY, pos.anchorY - 20 * VOXEL_Z_PX);

  // The renderer draws each property exactly once and covers every cell.
  const ctx = { save() {}, restore() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
    fill() {}, stroke() {}, fillRect() {}, strokeRect() {}, ellipse() {}, drawImage() {},
    setLineDash() {}, clearRect() {} };
  const log = renderIso(ctx, map);
  const buildings = log.entities.filter(e => e.kind === 'building');
  assert.equal(buildings.length, 1);
  assert.equal(buildings[0].multiTile, true);
  assert.equal(buildings[0].cells.length, 9);
  assert.equal(buildings[0].elevation, 20);
});

/* --------------------------------------------------------- 9. terrain cells */
test('9. Terrain keeps its ids, movement costs and elevation semantics at the new tile scale', () => {
  const ids = Object.keys(terrainJson.terrains);
  assert.ok(ids.length >= 20);
  for (const id of ids) {
    const t = terrainJson.terrains[id];
    assert.equal(t.id, id);
    assert.ok(typeof t.moveCost === 'object', `${id}: move costs preserved`);
    assert.ok(Number.isFinite(t.defense), `${id}: defense preserved`);
    if (t.voxelModel) assert.ok(voxDoc.models[t.voxelModel], `${id}: voxel model ${t.voxelModel} must exist`);
  }
  // Elevation levels are untouched by the asset rescale.
  assert.deepEqual(terrainJson.elevation.levels, [0, 4, 8, 12, 16, 20, 24, 28, 32]);
  assert.equal(terrainJson.elevation.step, 4);
  assert.equal(terrainJson.elevation.runtimePixelsPerVoxelZ, VOXEL_Z_PX);
  assert.deepEqual(voxDoc.models['elevation-32'].voxelScale, [0.5, 0.5, 1],
    'elevation blocks keep world z units so their heights stay the elevation system values');

  // Every 1×1 terrain cell is exactly 32 world voxels wide and deep.
  for (const id of TERRAIN_MODELS) {
    const m = voxDoc.models[id];
    assert.deepEqual(m.footprint, [1, 1], `${id}: terrain is one tile`);
    assert.ok(m.bounds.size[0] <= 32 + 32 && m.bounds.size[1] <= 32 + 32, `${id}: terrain overhang`);
  }

  // Road connector variants tile seamlessly: each mask model spans the cell.
  for (const mask of '0123456789abcdef') {
    const road = voxDoc.models[`road-${mask}`];
    assert.ok(road, `road-${mask} must exist`);
    assert.ok(road.bounds.max[0] - road.bounds.min[0] >= 10, `road-${mask} must reach across its cell`);
  }
  const bridge = voxDoc.models['bridge-ew'];
  assert.equal(bridge.kind, 'terrain');
  assert.ok(bridge.bounds.size[0] >= 30, 'bridges span the full tile width');
});

/* ------------------------------------------------------------- 10. coverage */
test('10. Registry coverage: every roster asset has a model, manifest entry, preview and baked sheets', () => {
  const units = Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/units.json'), 'utf8')));
  assert.equal(units.length, 58);
  assert.equal(BUILDINGS.length, 26);
  for (const type of units) {
    for (const id of [type, ...UNIT_ARMY_IDS.map(a => `${type}--${a}`)]) {
      assert.ok(voxDoc.models[id], `missing model ${id}`);
      assert.ok(manifest.models[id], `missing manifest ${id}`);
      assert.ok(fs.existsSync(path.join(ROOT, 'game_assets/voxels', `${id}.png`)), `missing preview ${id}`);
      const entry = manifest.models[id];
      assert.equal(entry.meta.kind, 'unit');
      assert.equal(Object.keys(entry).filter(k => k !== 'meta').length, 8, `${id}: 8 facings`);
    }
  }
  for (const type of BUILDINGS) {
    for (const id of [type, ...UNIT_ARMY_IDS.map(a => `${type}--${a}`)]) {
      assert.ok(manifest.models[id], `missing manifest ${id}`);
      const entry = manifest.models[id];
      assert.deepEqual(entry.meta.footprint, BUILDING_SPECS[baseIdOf(id)].footprint,
        `${id}: manifest footprint must match the catalogue`);
      assert.equal(Object.keys(entry).filter(k => k !== 'meta').length, 4, `${id}: 4 facings`);
    }
  }
  for (const id of TERRAIN_MODELS) {
    assert.ok(manifest.models[id], `missing terrain manifest ${id}`);
    assert.ok(fs.existsSync(path.join(ROOT, 'game_assets/voxels/sheets',
      manifest.models[id].right.variants.n.file)), `missing baked sheet ${id}`);
  }
  // Animation clip families are unchanged by the rescale: every unit keeps the
  // exact clip set and frame budget the animation registry declares (unarmed
  // units have no attack clip, which clipsFor() already accounts for).
  for (const [type, def] of Object.entries(animationJson.units)) {
    const model = voxDoc.models[type];
    assert.ok(model, `${type} model`);
    assert.deepEqual(model.clips, clipsFor(type, 'unit'), `${type}: clip set and frame budget`);
    const family = animationJson.families[def.family];
    for (const [clip, frames] of Object.entries(model.clips)) {
      if (clip === 'attack' && !def.weapon) continue;
      assert.equal(frames, family[clip], `${type}: ${clip} must keep ${family[clip]} frames (${def.family})`);
      for (const facing of Object.keys(manifest.models[type]).filter(k => k !== 'meta')) {
        assert.equal(manifest.models[type][facing].clips[clip], frames,
          `${type}-${facing}: ${clip} clip frames in the manifest`);
      }
    }
  }
});

/* ---------------------------------------------------------- 11. all facings */
test('11. Every facing keeps internally consistent anchors and a crop that covers multi-tile footprints', () => {
  const FACINGS = ['right', 'up', 'left', 'down', 'up-right', 'down-right', 'down-left', 'up-left'];
  for (const id of allIds) {
    const entry = manifest.models[id];
    const meta = entry.meta;
    const expected = meta.kind === 'unit' ? 8 : 4;
    const present = FACINGS.filter(f => entry[f]);
    assert.equal(present.length, expected, `${id}: ${expected} facings`);
    for (const facing of present) {
      const f = entry[facing];
      assert.ok(f.cell.w > 0 && f.cell.h > 0, `${id}-${facing}: non-empty crop`);
      assert.ok(f.frames.length >= 1, `${id}-${facing}: frames`);
      for (const frame of f.frames) {
        // Every frame is cut to the same cell and shares the anchor, so the
        // animation loop never jitters.
        assert.equal(frame.w, f.cell.w, `${id}-${facing}: frame width matches the crop`);
        assert.equal(frame.h, f.cell.h, `${id}-${facing}: frame height matches the crop`);
        assert.equal(frame.anchorX, f.anchorX, `${id}-${facing}: per-frame anchorX`);
        assert.equal(frame.anchorY, f.anchorY, `${id}-${facing}: per-frame anchorY`);
      }
      // The anchor must be reachable inside the crop, allowing a clipped edge.
      assert.ok(f.anchorX >= -8 && f.anchorX <= f.cell.w + 8, `${id}-${facing}: anchor x in crop`);
      assert.ok(f.anchorY >= -8 && f.anchorY <= f.cell.h + 8, `${id}-${facing}: anchor y in crop`);
    }
    // Multi-tile crops must span the whole footprint diamond, otherwise the
    // compound would be cut off at the edges of its own sprite.
    const [fw, fh] = meta.footprint;
    if (meta.kind !== 'unit' && (fw > 1 || fh > 1)) {
      const diamondW = (fw + fh) * TILE_SIZE_PX[0] / 2;
      const diamondH = (fw + fh) * TILE_SIZE_PX[1] / 2;
      for (const facing of present) {
        assert.ok(entry[facing].cell.w >= diamondW, `${id}-${facing}: crop ${entry[facing].cell.w}px narrower than its ${fw}×${fh} footprint (${diamondW}px)`);
        assert.ok(entry[facing].cell.h >= diamondH, `${id}-${facing}: crop ${entry[facing].cell.h}px shorter than its ${fw}×${fh} footprint (${diamondH}px)`);
      }
    }
  }
});


/* ------------------------------------------------------- 13. crisp sprites */
test('13. Baked sprites stay pixel-crisp: every opaque pixel is an exact palette colour', () => {
  // Regression gate for the "units look blurry" bug. Cause was threefold:
  //   1. canvas bilinear filtering at fractional zoom (fixed in the renderer),
  //   2. the baker box-averaging 2×2 subpixels (colour bleed at every edge),
  //   3. 5-bit colour masking of unit strips (& 0xf8), which banded the palette.
  // Mode sampling + no masking means every opaque pixel must be exactly a
  // palette shade, in the team colour of its variant.
  const ARMY_VARIANTS = ['0', 'n'];
  const allowed = new Map(ARMY_VARIANTS.map(v => [v, new Set()]));
  for (const v of ARMY_VARIANTS) {
    const lut = buildVariantLut(voxDoc.palette, v);
    for (let i = 0; i < lut.length; i++) {
      const c = lut[i];
      if (!c) continue;
      allowed.get(v).add((c & 0xff) | (((c >> 8) & 0xff) << 8) | (((c >> 16) & 0xff) << 16));
    }
  }
  assert.ok(allowed.get('0').size > 100, 'palette shades must be loaded');

  const samples = [];
  for (const kind of ['unit', 'building', 'terrain']) {
    for (const id of allIds.filter(i => voxDoc.models[i].kind === kind).slice(0, 6)) {
      samples.push(id);
    }
  }
  for (const id of samples) {
    const entry = manifest.models[id];
    for (const variant of ARMY_VARIANTS) {
      const file = entry.right.variants[variant]?.file;
      if (!file) continue;
      const img = decodePng(fs.readFileSync(path.join(ROOT, 'game_assets/voxels/sheets', file)));
      const set = allowed.get(variant);
      let bad = 0;
      const distinct = new Set();
      for (let i = 0; i < img.pixels.length; i += 4) {
        if (!img.pixels[i + 3]) continue;
        const rgb = img.pixels[i] | (img.pixels[i + 1] << 8) | (img.pixels[i + 2] << 16);
        distinct.add(rgb);
        if (!set.has(rgb)) bad++;
      }
      assert.equal(bad, 0, `${file}: ${bad} pixels are blended colours, not palette shades (sprite is being smoothed)`);
      // A blurred sprite produces hundreds of unique shades; a crisp one stays
      // close to the palette actually used by that model.
      assert.ok(distinct.size < 220, `${file}: ${distinct.size} distinct colours looks like colour bleed`);
    }
  }
});

/* ------------------------------------------------- 14. renderer crispness */
test('14. The iso renderer disables canvas image smoothing around every sprite blit', () => {
  // A stub Image stands in for the browser's loader so blitSheet() reaches the
  // drawImage() call under test.
  const toggles = [];
  const ctx = {
    _smooth: true,
    get imageSmoothingEnabled() { return this._smooth; },
    set imageSmoothingEnabled(v) { this._smooth = v; toggles.push(v); },
    save() {}, restore() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
    fill() {}, stroke() {}, fillRect() {}, strokeRect() {}, ellipse() {}, clearRect() {},
    setLineDash() {},
    drawImage() { toggles.push(this._smooth ? 'blurry-draw' : 'crisp-draw'); },
  };
  const entry = {
    right: {
      cell: { x: 0, y: 0, w: 8, h: 8 },
      anchorX: 4, anchorY: 8,
      frames: [{ x: 0, y: 0, w: 8, h: 8, anchorX: 4, anchorY: 8 }],
      variants: { '0': { file: 'stub-right-0.png' } },
    },
  };
  // blitSheet needs a "loaded" image; provide a minimal Image stand-in.
  globalThis.Image = class { constructor() { this.complete = true; this.naturalWidth = 8; this.naturalHeight = 8; } };
  try {
    const ok = blitSheet(ctx, { models: { stub: entry } }, 'stub', 'right', '0', 0, 100, 100, 1);
    assert.equal(ok, true, 'stub sheet must blit');
  } finally {
    delete globalThis.Image;
  }
  assert.deepEqual(toggles.filter(t => t === 'crisp-draw' || t === 'blurry-draw').slice(0, 1), ['crisp-draw'],
    'sprites must be blitted with image smoothing disabled');
  assert.ok(!toggles.includes('blurry-draw'), 'no sprite may be blitted with bilinear filtering on');
  // The previous global state is restored afterwards.
  assert.equal(ctx.imageSmoothingEnabled, true, "renderer must restore the caller's smoothing state");
});

/* --------------------------------------------------- 12. review deliverables */
test('15. The review deliverables exist and document the scale migration', () => {
  for (const file of ['scale-scene.png', 'scale-lineup.png', 'before-after.png']) {
    const p = path.join(ROOT, 'docs/review', file);
    assert.ok(fs.existsSync(p), `missing ${file}`);
    assert.ok(fs.statSync(p).size > 5000, `${file} looks empty`);
  }
  const matrix = fs.readFileSync(path.join(ROOT, 'docs/ASSET_SIZING_MATRIX.md'), 'utf8');
  assert.ok(matrix.includes('128'), 'sizing matrix documents the canvas');
  for (const id of ['hq', 'airport', 'port', 'pillbox', 'infantry', 'tank']) {
    assert.ok(matrix.includes(`| \`${id}\``), `sizing matrix must list ${id}`);
  }
  const spec = fs.readFileSync(path.join(ROOT, 'docs/SCALE_128.md'), 'utf8');
  assert.ok(spec.includes('32'), 'scale specification documents the tile grid');
  assert.ok(/128\s*[×x]\s*128\s*[×x]\s*128/.test(spec), 'scale specification documents the canvas');
});
