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
import { HANGAR_PLAN, HANGAR_FACTIONS } from '../tools/voxel_pipeline/models/hangar.mjs';

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
  assert.deepEqual([...TILE_SIZE_PX], [128, 64]);

  // The document, the pipeline and the runtime must agree.
  assert.equal(voxDoc.format, 'field-command-voxel-128x128x128');
  assert.deepEqual(voxDoc.scale.canvas, [128, 128, 128]);
  assert.equal(voxDoc.scale.tileUnits, 32);
  assert.deepEqual(voxDoc.scale.tileSizePx, [128, 64]);
  assert.equal(voxDoc.scale.tilesPerAxis, 4);

  assert.equal(VOXEL_SIZE.join('x'), '128x128x128');
  assert.equal(DESIGN_SIZE.join('x'), '64x64x64');
  assert.equal(VOXEL_GRID_SIZE, 128);
  assert.equal(DOWNSCALE, 1, 'no supersample downscale: sprites keep full voxel detail');
  assert.equal(TILE_VOXELS, 32);

  // 32 world voxels project onto the 128 px tile diamond: 1 tile = 32 voxels.
  // Sprite density: 4 px per voxel horizontally, 2 px vertically. The tile grew
  // with the density (128×64 px) instead of the sprites shrinking, which is what
  // keeps 1x1 assets sharp.
  assert.equal(TILE_W / TILE_VOXELS, 4, 'four runtime px per voxel horizontally');
  assert.equal(TILE_H / TILE_VOXELS, 2, 'two runtime px per voxel vertically');
  assert.equal(VOXEL_Z_PX, 2, 'two runtime px per elevation unit');

  assert.equal(manifest.format, 'field-command-voxel-sheet-4');
  assert.deepEqual(manifest.gridSize, [128, 128, 128]);
  assert.equal(manifest.tileUnits, 32);
  assert.equal(manifest.tilesPerAxis, 4);
  assert.equal(manifest.downscale, 1);
  assert.equal(manifest.voxelZPx, 2);
  assert.deepEqual(manifest.tileSize, [128, 64]);
});

/* --------------------------------------------------------------- 2. metadata */
test('2. Every generated model declares footprint, design grid, voxel scale, anchor and bounds metadata', () => {
  assert.equal(allIds.length, 505, 'the full roster must be regenerated');
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
test('4. Scale hierarchy: infantry < vehicles < posts < facilities < HQ, and units are role-sized', () => {
  const size = id => voxDoc.models[id].bounds.size;
  const foot = ['infantry', 'engineer', 'medic', 'rocket-infantry', 'sniper'];
  for (const id of foot) {
    const [w, , h] = size(id);
    assert.ok(w <= 16 && h <= 16, `${id}: infantry must stay inside half a tile (${w}×${h})`);
    assert.ok(h >= 8, `${id}: infantry must stay readable as a person (${h} voxels tall)`);
    assert.deepEqual(voxDoc.models[id].footprint, [0.5, 0.5], `${id} is a half-tile unit`);
  }
  // The roster is bounded: nothing is smaller than half a tile and nothing is
  // bigger than 1.25 tiles. Buildings own everything above that.
  const unitIds = Object.keys(voxDoc.models).filter(id => voxDoc.models[id].kind === 'unit');
  for (const id of unitIds) {
    const fp = voxDoc.models[id].footprint[0];
    assert.ok(fp >= 0.5 - 1e-9, `${id}: footprint ${fp} below the 0.5 tile floor`);
    assert.ok(fp <= 1.25 + 1e-9, `${id}: footprint ${fp} above the 1.25 tile ceiling`);
    assert.equal(fp % 0.25, 0, `${id}: footprint ${fp} must be a quarter-tile step`);
  }
  // Role ladder: 0.5 → 0.75 → 1.0 → 1.25 tiles.
  assert.deepEqual(voxDoc.models.recon.footprint, [0.75, 0.75]);
  assert.deepEqual(voxDoc.models.apc.footprint, [0.75, 0.75]);
  assert.deepEqual(voxDoc.models.tank.footprint, [1, 1]);
  assert.deepEqual(voxDoc.models.artillery.footprint, [1.25, 1.25]);
  assert.deepEqual(voxDoc.models.battleship.footprint, [1.25, 1.25]);
  const w = id => voxDoc.models[id].bounds.size[0];
  assert.ok(w('infantry') < w('recon'), 'recon must be wider than infantry');
  assert.ok(w('recon') < w('tank'), 'a tank must be wider than a recon jeep');
  assert.ok(w('tank') < w('battleship'), 'a capital ship must be wider than a tank');
  assert.ok(w('battleship') < w('barracks'), 'even the biggest unit stays smaller than a 2×2 facility');
  for (const id of ['pillbox', 'bunker', 'guard-tower']) {
    assert.deepEqual(voxDoc.models[id].footprint, [1, 1], `${id} is a 1×1 post`);
  }
  assert.deepEqual(voxDoc.models.hq.footprint, [3, 3]);
  const hq = size('hq');
  const post = size('pillbox');
  assert.ok(hq[0] > post[0] * 2 && hq[1] > post[1] * 2, 'the HQ must be visibly larger than a small post');
  assert.ok(hq[2] > post[2], 'the HQ must also be taller than a small post');
  // A tank is never building-tall: it stays below a guard tower.
  assert.ok(size('tank')[2] < size('guard-tower')[2], 'a tank must stay shorter than a guard tower');
});

/* --------------------------------------------------------- 5. resample gate */
test('5. World resampling is deterministic and lands each asset inside its footprint block', () => {
  const build = (id, kind) => sculptModel(id, kind, 'standard', { action: 'idle', frame: 0 });
  const a = build('tank', 'unit');
  const b = build('tank', 'unit');
  assert.deepEqual(a.finish(), b.finish(), 'resampling must be deterministic');

  // Geometry is recalculated (uniform factor) into the block its footprint
  // occupies — never stretched, never cropped.
  for (const [id, kind, fp] of [
    ['infantry', 'unit', [0.5, 0.5]],
    ['recon', 'unit', [0.75, 0.75]],
    ['tank', 'unit', [1, 1]],
    ['artillery', 'unit', [1.25, 1.25]],
    ['hq', 'building', [3, 3]],
    ['port', 'building', [3, 2]],
  ]) {
    const spec = modelSpec(id, kind, kind === 'unit' ? 'tracked' : id);
    const rect = footprintRect(fp);
    assert.deepEqual(spec.offset, [rect.x, rect.y, 0], `${id}: translated into its footprint block`);
    assert.deepEqual(spec.footprint, fp, `${id}: footprint`);
    const bounds = boundsOf(build(id, kind).finish());
    const slack = TILE_UNITS; // declared overhang (barrels, wings) up to one tile
    assert.ok(bounds.min[0] >= rect.x - slack && bounds.max[0] < rect.x + rect.w + slack,
      `${id}: x ${bounds.min[0]}..${bounds.max[0]} outside its block ${rect.x}..${rect.x + rect.w}`);
    assert.ok(bounds.min[1] >= rect.y - slack && bounds.max[1] < rect.y + rect.h + slack,
      `${id}: y ${bounds.min[1]}..${bounds.max[1]} outside its block ${rect.y}..${rect.y + rect.h}`);
  }
  // The scale factor is uniform on all three axes (aspect ratio preserved).
  for (const id of ['infantry', 'tank', 'battleship']) {
    const spec = modelSpec(id, 'unit', 'tracked');
    assert.equal(spec.scale[0], spec.scale[1], `${id}: x/y scale must match`);
    assert.equal(spec.scale[1], spec.scale[2], `${id}: y/z scale must match`);
    assert.equal(spec.scale[0], spec.footprint[0] * TILE_UNITS / 64, `${id}: scale derives from its footprint`);
  }
  // A 3×3 compound fills most of its 96×96 block.
  const hqBounds = boundsOf(build('hq', 'building').finish());
  assert.ok(hqBounds.size[0] >= 64 && hqBounds.size[1] >= 64, 'the HQ must fill most of its compound');

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
  assert.equal(VOXEL_Z_PX, 2, 'one elevation unit is two runtime pixels');
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
  assert.equal(BUILDINGS.length, 27);
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
  for (const file of ['scale-scene.png', 'scale-lineup.png', 'before-after.png', 'unit-size.png', 'unit-size-wall.png']) {
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

/* ------------------------------------- 16. review page shows true sprite scale */
test('16. The review page shows units at their real pixel size, not a normalised thumbnail', () => {
  const pagePath = path.join(ROOT, 'docs/review/scale-review.html');
  assert.ok(fs.existsSync(pagePath), 'missing docs/review/scale-review.html');
  const page = fs.readFileSync(pagePath, 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'game_assets/voxels/sheets/manifest.json'), 'utf8'));

  // A preview window that fits every sprite into a fixed box destroys the one
  // thing this page exists to show: relative size. Forbid that.
  assert.ok(!/object-fit\s*:\s*contain/.test(page), 'previews must not be letterboxed into a fixed box');
  assert.ok(!/\.card img\{[^}]*height:\s*\d+px/.test(page), 'preview cards must not force a fixed height');

  // Every preview carries the intrinsic size of its baked cell, and that size
  // must match the PNG on disk (so the browser cannot rescale it silently).
  const imgs = [...page.matchAll(/<img[^>]*src="\.\.\/\.\.\/game_assets\/voxels\/([^"]+)"[^>]*width="(\d+)"[^>]*height="(\d+)"/g)];
  assert.ok(imgs.length >= 400, `expected preview images with intrinsic sizes, found ${imgs.length}`);
  for (const [, id, w, h] of imgs.slice(0, 60)) {
    const png = fs.readFileSync(path.join(ROOT, 'game_assets/voxels', id));
    assert.equal(png.readUInt32BE(16), Number(w), `${id}: declared width must match the PNG`);
    assert.equal(png.readUInt32BE(20), Number(h), `${id}: declared height must match the PNG`);
  }

  // True scale for the headline units, measured from the baked cells.
  // Preview PNGs are frame-0 crops of their baked cells (the cell is the union
  // of every animation frame, so it can be a few pixels larger).
  assert.match(page, /alt="tank"[^>]*width="87"[^>]*height="64"/, 'tank preview must be 87×64');
  assert.match(page, /alt="infantry"[^>]*width="27"[^>]*height="31"/, 'infantry preview must be 27×31');
  assert.match(page, /alt="hq"[^>]*width="385"[^>]*height="239"/, 'hq preview must be 385×239');
  // The hierarchy that the page is supposed to make visible.
  const px = id => {
    const v = page.match(new RegExp(`alt="${id}"[^>]*width="(\\d+)"`));
    return Number(v[1]);
  };
  assert.ok(px('hq') > px('tank') && px('tank') > px('infantry'),
    'a 3×3 HQ must be wider on the page than a 1-tile tank, which must be wider than a half-tile rifleman');

  // Figures must declare their real size and offer integer zoom without blur.
  for (const fig of ['scale-lineup.png', 'scale-scene.png', 'before-after.png', 'unit-size.png', 'unit-size-wall.png']) {
    const png = fs.readFileSync(path.join(ROOT, 'docs/review', fig));
    const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
    // The URL may carry a content hash (`?v=...`) so a re-bake can never be
    // masked by a cached image; the declared size must still be the real one.
    assert.match(page, new RegExp(`src="${fig}(\\?v=[0-9a-f]+)?"[^>]*width="${w}"[^>]*height="${h}"`),
      `${fig} must declare ${w}×${h}`);
  }
  assert.ok(page.includes('data-zoom'), 'the review page needs zoom controls to inspect true pixels');
  assert.match(page, /image-rendering:\s*pixelated/, 'previews must be drawn nearest-neighbour');
});


/* ------------------------------------------ 17. scene elevation is really 3D */
test('17. The review scene shows real elevation steps, not a line drawn on the grass', () => {
  const scenePath = path.join(ROOT, 'docs/review/scale-scene.png');
  const png = decodePng(fs.readFileSync(scenePath));

  // Cliff faces are the only place these rock colours appear. Count how tall the
  // runs get: a level-24 plateau on a level-8 apron must produce 32 px and 16 px
  // walls (VOXEL_Z_PX = 2 per voxel, 4-level steps are 8 px).
  const isRock = i => {
    const r = png.pixels[i], g = png.pixels[i + 1], b = png.pixels[i + 2];
    const near = (c, t) => Math.abs(c - t) < 16;
    return (near(r, 0x5b) && near(g, 0x4a) && near(b, 0x33))
      || (near(r, 0x6d) && near(g, 0x5b) && near(b, 0x3f))
      || (near(r, 0x3f) && near(g, 0x34) && near(b, 0x23));
  };
  const runs = new Map();
  for (let x = 0; x < png.width; x++) {
    let run = 0;
    for (let y = 0; y < png.height; y++) {
      if (isRock((y * png.width + x) * 4)) {
        run++;
      } else {
        if (run) runs.set(run, (runs.get(run) || 0) + 1);
        run = 0;
      }
    }
  }
  assert.ok((runs.get(32) || 0) > 100, `expected long 32 px cliff runs (level 24 -> 8); got ${runs.get(32) || 0}`);
  assert.ok((runs.get(16) || 0) > 50, `expected 16 px cliff runs (level 8 -> 0); got ${runs.get(16) || 0}`);

  // And no hole may be punched through the map: every background-coloured pixel
  // must be reachable from the border.
  const W = png.width, H = png.height;
  const isBg = i => png.pixels[i] === 16 && png.pixels[i + 1] === 20 && png.pixels[i + 2] === 26;
  const seen = new Uint8Array(W * H);
  const stack = [];
  for (let x = 0; x < W; x++) { stack.push(x, 0, x, H - 1); }
  for (let y = 0; y < H; y++) { stack.push(0, y, W - 1, y); }
  while (stack.length) {
    const y = stack.pop(), x = stack.pop();
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const p = y * W + x;
    if (seen[p] || !isBg(p * 4)) continue;
    seen[p] = 1;
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }
  let holes = 0;
  for (let p = 0; p < W * H; p++) if (!seen[p] && isBg(p * 4)) holes++;
  assert.equal(holes, 0, `scene must not contain enclosed transparent holes (found ${holes} px)`);
});

/* ------------------------------------------------------------- 18. hangar */
test('18. The fixed-wing hangar is its own 3×3 facility: a 2-shaped plan, four faction designs and a clear aircraft bay', () => {
  const P = HANGAR_PLAN;
  const hangarIds = HANGAR_FACTIONS.map(f => (f === 'standard' ? 'hangar' : `hangar--${f}`));
  const model = id => voxDoc.models[id];

  // --- separate stable building id, separate footprint class from the helipad
  assert.ok(BUILDINGS.includes('hangar'), 'hangar is registered as a building');
  assert.ok(!BUILDINGS.includes('helipad-hangar'));
  assert.deepEqual(BUILDING_SPECS.hangar.footprint, [3, 3], 'the hangar is a 3×3 compound');
  assert.deepEqual(BUILDING_SPECS.helipad.footprint, [2, 2], 'the helipad stays a 2×2 rotary deck');
  assert.notEqual(BUILDING_SPECS.hangar.category, BUILDING_SPECS.helipad.category);
  assert.deepEqual(BUILDING_FOOTPRINTS.hangar, [3, 3], 'runtime footprint table agrees');
  assert.ok(MULTI_TILE_BUILDINGS.has('hangar'));
  for (const id of hangarIds) {
    assert.ok(model(id), `missing hangar model ${id}`);
    assert.deepEqual(model(id).footprint, [3, 3], `${id} footprint`);
    assert.deepEqual(model(id).bounds.size, [96, 96, model(id).bounds.size[2]], `${id} fills its 96×96 block`);
    assert.equal(animationJson.buildings.hangar.idle, 1, 'the hangar has one idle frame');
  }
  // The hangar and the helipad are different art: no shared silhouette.
  const footprintOf = id => new Set(model(id).voxels.map(v => `${v[0]},${v[1]}`));
  const hangarPlan = footprintOf('hangar');
  const helipadPlan = footprintOf('helipad');
  const shared = [...hangarPlan].filter(k => helipadPlan.has(k)).length;
  assert.ok(shared / hangarPlan.size < 0.6, `hangar reuses ${shared} helipad columns — must be its own building`);
  assert.notEqual(model('hangar').bounds.size[2], model('helipad').bounds.size[2]);

  const solidsOf = id => {
    const set = new Set();
    for (const [x, y, z] of model(id).voxels) set.add(`${x},${y},${z}`);
    return set;
  };
  const countIn = (set, x0, x1, y0, y1, z0, z1) => {
    let n = 0;
    for (const key of set) {
      const [x, y, z] = key.split(',').map(Number);
      if (x >= x0 && x < x1 && y >= y0 && y < y1 && z >= z0 && z < z1) n++;
    }
    return n;
  };

  // --- "2" plan: top stroke, open counter, right descender, bottom stroke
  for (const id of hangarIds) {
    const solids = solidsOf(id);
    let roofed = 0;
    for (let x = 20; x < 80; x++) {
      for (let y = 14; y < 38; y++) {
        if ([...Array(20).keys()].some(dz => solids.has(`${x},${y},${30 + dz}`))) roofed++;
      }
    }
    assert.ok(roofed / (60 * 24) > 0.95, `${id}: the hall must roof the top stroke (${roofed}/1440 columns)`);
    // Counter: open apron between the hall and the front range.  Painted cones
    // and drain covers sit on the ground, so the sample starts above them.
    assert.equal(countIn(solids, 20, 60, 56, 68, 5, 40), 0, `${id}: the counter must stay open`);
    // Counter opens to the west (nothing between the apron and the tile edge).
    assert.equal(countIn(solids, 6, 18, 56, 68, 5, 40), 0, `${id}: the counter opens west`);
    // Descender: the east annex bridges hall and front range.
    let bridged = 0;
    for (let x = 74; x < 88; x++) {
      for (let y = 56; y < 68; y++) {
        if ([...Array(42).keys()].some(dz => solids.has(`${x},${y},${18 + dz}`))) bridged++;
      }
    }
    assert.ok(bridged / (14 * 12) > 0.9, `${id}: the descender must join the strokes (${bridged}/168 columns)`);
    // Bottom stroke: the front range runs across the footprint.
    let front = 0;
    for (let x = 54; x < 86; x++) {
      for (let y = 78; y < 88; y++) {
        if ([...Array(10).keys()].some(dz => solids.has(`${x},${y},${8 + dz}`))) front++;
      }
    }
    assert.ok(front / (32 * 10) > 0.9, `${id}: the front range must form the bottom stroke (${front}/320 columns)`);
    // Vehicle gate stays open at ground level.
    assert.equal(countIn(solids, 28, 44, 76, 84, 3, 12), 0, `${id}: the gate passage must stay open`);
  }

  // --- aircraft clearances: the bay and the door are empty in every design
  const all = hangarIds.map(id => ({ id, solids: solidsOf(id) }));
  for (const { id, solids } of all) {
    const bay = countIn(solids, P.bay.x0, P.bay.x1, P.bay.y0, P.bay.y1, P.bay.z0, P.bay.z1);
    assert.equal(bay, 0, `${id}: ${bay} voxels intrude into the clear bay`);
    const door = countIn(solids, P.door.x0, P.door.x1, P.door.y0, P.door.y1, P.door.z0, P.door.z1);
    assert.equal(door, 0, `${id}: ${door} voxels block the door opening`);
  }
  const bayW = P.bay.x1 - P.bay.x0, bayD = P.bay.y1 - P.bay.y0, bayH = P.bay.z1 - P.bay.z0;
  const fixedWing = ['fighter', 'bomber', 'transport-plane', 'ground-attack-jet', 'stealth-fighter', 'spy-plane', 'uav'];
  const aircraft = fixedWing.map(id => ({ id, size: voxDoc.models[id].bounds.size }));
  const largest = aircraft.reduce((a, b) => (b.size[0] * b.size[1] > a.size[0] * a.size[1] ? b : a));
  assert.ok(bayW >= largest.size[0] + 8, `bay width ${bayW} must clear the ${largest.id} (${largest.size[0]})`);
  assert.ok(bayD >= largest.size[1] + 2, `bay depth ${bayD} must clear the ${largest.id} (${largest.size[1]})`);
  assert.ok(bayH >= largest.size[2] + 4, `bay height ${bayH} must clear the ${largest.id} (${largest.size[2]})`);
  const doorW = P.door.x1 - P.door.x0, doorH = P.door.z1 - P.door.z0;
  assert.ok(doorW >= largest.size[0] + 8, `door ${doorW} must pass the ${largest.id} wingspan`);
  assert.ok(doorH >= largest.size[2] + 4, `door ${doorH} must pass the ${largest.id} fin`);
  // …and the bay is bigger than the aircraft, but smaller than the whole tile stack.
  assert.ok(bayW < 96 && bayD < 96, 'the bay stays inside the 3×3 footprint');

  // --- four genuinely different designs, not recolours: compare solid voxels
  const abovePavement = id => new Set(model(id).voxels.filter(v => v[2] >= 4).map(v => `${v[0]},${v[1]},${v[2]}`));
  const sets = Object.fromEntries(hangarIds.map(id => [id, abovePavement(id)]));
  for (let i = 0; i < hangarIds.length; i++) {
    for (let j = i + 1; j < hangarIds.length; j++) {
      const a = sets[hangarIds[i]], b = sets[hangarIds[j]];
      let common = 0;
      for (const key of a) if (b.has(key)) common++;
      const union = a.size + b.size - common;
      const differ = (union - common) / union;
      assert.ok(differ > 0.2, `${hangarIds[i]} vs ${hangarIds[j]}: only ${(differ * 100).toFixed(1)}% of the structure differs — that reads as a recolour`);
    }
  }
  const heights = hangarIds.map(id => model(id).bounds.size[2]);
  assert.equal(new Set(heights).size, heights.length, `each faction must have its own silhouette height (${heights.join(', ')})`);

  // --- ownership accents survive for the seven baked team variants
  for (const id of hangarIds) {
    const team = model(id).voxels.filter(v => ['#df794b', '#ffc68b', '#934b32'].includes(voxDoc.palette[v[3]]));
    assert.ok(team.length > 500, `${id}: only ${team.length} owner-coloured voxels`);
    // …and it is spread over the footprint, not one badge: every quadrant of the
    // 96×96 block carries the owner colour, and it appears at several heights.
    const quadrants = new Set(team.map(v => `${v[0] < 48 ? 'w' : 'e'}${v[1] < 48 ? 'n' : 's'}`));
    assert.equal(quadrants.size, 4, `${id}: owner colour only reaches ${[...quadrants].join(',')}`);
    const cols = new Set(team.map(v => `${v[0]},${v[1]}`));
    assert.ok(cols.size > 200, `${id}: owner colour concentrated in ${cols.size} columns`);
  }
});
