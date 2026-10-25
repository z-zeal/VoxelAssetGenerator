import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import {
  TILE_W, TILE_H, HALF_W, HALF_H, VOXEL_Z_PX,
  ELEVATION_LEVELS, ELEVATION_STEP, MIN_ELEVATION, MAX_ELEVATION, ELEVATION_MODEL_IDS,
  isValidElevation, validateElevation, elevationModelId, elevationPixelOffset,
  gridToIso, isoToGrid, createMap, loadMapData, serializeMapData,
  exportMapJson, importMapJson, getTileElevation, setTileElevation,
  getTileTerrain, setTileTerrain, computeTileElevationFaces,
  computeMapElevationMesh, getEntityRenderPosition,
} from '../src/iso.js';
import {
  shoalLandMask, shoalSiblingMask, shoreSides, sandPolygon, waterShimmerPhase,
} from '../src/coast.js';
import { renderIso } from '../src/iso-renderer.js';
import { MapElevationEditor, createPresetMap } from '../src/map-editor.js';
import {
  unitSheetKey, buildingSheetKey, fortificationSheetKey, resolveEntityArmy,
} from '../src/armies.js';
import { sculptModel, ELEVATION_MODELS, BUILDINGS, UNIT_ARMY_IDS } from '../tools/voxel_pipeline/build.mjs';
import { bake } from '../tools/voxel_pipeline/bake.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Minimal recording 2D canvas context for headless rendering verification.
 */
function createRecordingContext() {
  const ops = [];
  return {
    ops,
     fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    save() { ops.push({ op: 'save' }); },
    restore() { ops.push({ op: 'restore' }); },
    beginPath() { ops.push({ op: 'beginPath' }); },
    closePath() { ops.push({ op: 'closePath' }); },
    moveTo(x, y) { ops.push({ op: 'moveTo', x, y }); },
    lineTo(x, y) { ops.push({ op: 'lineTo', x, y }); },
    fill() { ops.push({ op: 'fill', style: this.fillStyle }); },
    stroke() { ops.push({ op: 'stroke', style: this.strokeStyle, lineWidth: this.lineWidth }); },
    fillRect(x, y, w, h) { ops.push({ op: 'fillRect', x, y, w, h, style: this.fillStyle }); },
    strokeRect(x, y, w, h) { ops.push({ op: 'strokeRect', x, y, w, h, style: this.strokeStyle }); },
    ellipse(x, y, rx, ry) { ops.push({ op: 'ellipse', x, y, rx, ry }); },
    arc(x, y, r) { ops.push({ op: 'arc', x, y, r }); },
    drawImage(...args) { ops.push({ op: 'drawImage', args }); },
    clearRect() {},
  };
}

test('1. All nine height levels (0, 4, 8, 12, 16, 20, 24, 28, 32) are accepted and represented in configuration', () => {
  const expected = [0, 4, 8, 12, 16, 20, 24, 28, 32];
  assert.deepEqual([...ELEVATION_LEVELS], expected);
  assert.equal(ELEVATION_LEVELS.length, 9);

  const terrainConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/terrain.json'), 'utf8'));
  assert.deepEqual(terrainConfig.elevation.levels, expected);
  assert.equal(terrainConfig.elevation.step, 4);
  assert.equal(terrainConfig.elevation.min, 0);
  assert.equal(terrainConfig.elevation.max, 32);

  for (const h of expected) {
    assert.equal(isValidElevation(h), true, `Expected height ${h} to be valid`);
    assert.equal(validateElevation(h), h);
    const modelId = `elevation-${String(h).padStart(2, '0')}`;
    assert.equal(elevationModelId(h), modelId);
    assert.equal(terrainConfig.elevation.models[String(h)], modelId);
    assert.equal(elevationPixelOffset(h, 1), h * 0.5);
  }
});

test('2. Existing maps without elevation load as all height 0 without errors', () => {
  const legacyMap = {
    name: 'Legacy Map Without Elevation',
    width: 5,
    height: 4,
    terrain: Array.from({ length: 4 }, () => Array(5).fill('plains')),
    properties: [{ type: 'hq', x: 1, y: 1, owner: 0 }],
    units: [{ type: 'tank', x: 2, y: 2, owner: 0, facing: 'right' }],
  };

  const loaded = loadMapData(legacyMap);
  assert.equal(loaded.width, 5);
  assert.equal(loaded.height, 4);
  assert.equal(loaded.elevation.length, 4);
  for (let y = 0; y < 4; y++) {
    assert.equal(loaded.elevation[y].length, 5);
    for (let x = 0; x < 5; x++) {
      assert.equal(getTileElevation(loaded, x, y), 0);
    }
  }
  assert.equal(loaded.properties.length, 1);
  assert.equal(loaded.units.length, 1);
});

test('3. Map save/load and JSON export/import round-trips preserve per-tile elevation', () => {
  const map = createMap({ width: 9, height: 3, name: 'Roundtrip Test' });
  for (let x = 0; x < 9; x++) {
    setTileElevation(map, x, 1, ELEVATION_LEVELS[x]);
    setTileTerrain(map, x, 1, x % 2 === 0 ? 'plains' : 'tallgrass');
  }

  const serialized = serializeMapData(map);
  const reloaded = loadMapData(serialized);
  assert.deepEqual(reloaded.elevation, map.elevation);
  assert.deepEqual(reloaded.terrain, map.terrain);

  const json = exportMapJson(map);
  const imported = importMapJson(json);
  assert.deepEqual(imported.elevation, map.elevation);
  for (let x = 0; x < 9; x++) {
    assert.equal(getTileElevation(imported, x, 1), ELEVATION_LEVELS[x]);
  }
});

test('4. Unsupported elevation values are rejected through explicit validation', () => {
  const invalidValues = [-4, -1, 1, 2, 3, 5, 6, 7, 10, 14, 15, 33, 36, 64, 3.5, NaN, Infinity, '16', {}, []];
  const map = createMap({ width: 4, height: 4 });

  for (const bad of invalidValues) {
    assert.equal(isValidElevation(bad), false, `Expected ${JSON.stringify(bad)} to be invalid`);
    assert.throws(() => validateElevation(bad), RangeError);
    assert.throws(() => setTileElevation(map, 1, 1, bad), RangeError);
  }

  // Ensure corrupted elevation in raw map payload is rejected and does not silently corrupt state
  assert.throws(() => {
    loadMapData({
      width: 2,
      height: 2,
      terrain: [['plains', 'plains'], ['plains', 'plains']],
      elevation: [[0, 12], [7, 16]], // 7 is invalid
    });
  }, RangeError);
});

test('5. Equal-height neighbours do not produce exposed cliff walls between them', () => {
  const map = createPresetMap('plateau'); // 4x4 plateau at height 20 (x=2..5, y=2..5)
  // Interior tile (3, 3) has all 4 cardinal neighbours at height 20
  const interior = computeTileElevationFaces(map, 3, 3);
  assert.equal(interior.height, 20);
  assert.equal(interior.hasExposedCliffs, false);
  for (const dir of ['north', 'east', 'south', 'west']) {
    assert.equal(interior.edges[dir].neighborHeight, 20);
    assert.equal(interior.edges[dir].exposed, false);
    assert.equal(interior.edges[dir].diff, 0);
    assert.equal(interior.edges[dir].owner, null);
  }

  const ctx = createRecordingContext();
  const log = renderIso(ctx, map);
  const interiorCliffs = log.cliffs.filter(c => c.x === 3 && c.y === 3);
  assert.equal(interiorCliffs.length, 0);
});

test('6. Higher-to-lower neighbours render the exact exposed wall height difference (H - N)', () => {
  const map = createMap({ width: 5, height: 5 });
  setTileElevation(map, 2, 2, 28);
  setTileElevation(map, 2, 1, 20); // north: diff = 8
  setTileElevation(map, 3, 2, 12); // east:  diff = 16
  setTileElevation(map, 2, 3, 4);  // south: diff = 24
  setTileElevation(map, 1, 2, 0);  // west:  diff = 28

  const faces = computeTileElevationFaces(map, 2, 2);
  assert.equal(faces.edges.north.diff, 8);
  assert.equal(faces.edges.east.diff, 16);
  assert.equal(faces.edges.south.diff, 24);
  assert.equal(faces.edges.west.diff, 28);

  assert.equal(faces.edges.east.topZ, 28);
  assert.equal(faces.edges.east.bottomZ, 12);
  assert.equal(faces.edges.east.pixelHeight, 16 * VOXEL_Z_PX);

  assert.equal(faces.edges.south.topZ, 28);
  assert.equal(faces.edges.south.bottomZ, 4);
  assert.equal(faces.edges.south.pixelHeight, 24 * VOXEL_Z_PX);

  const ctx = createRecordingContext();
  const log = renderIso(ctx, map);
  const eastCliff = log.cliffs.find(c => c.x === 2 && c.y === 2 && c.dir === 'east');
  const southCliff = log.cliffs.find(c => c.x === 2 && c.y === 2 && c.dir === 'south');
  assert.ok(eastCliff);
  assert.ok(southCliff);
  assert.equal(eastCliff.diff, 16);
  assert.equal(eastCliff.pixelHeight, 8);
  assert.equal(southCliff.diff, 24);
  assert.equal(southCliff.pixelHeight, 12);
});

test('7. Shared edges between higher and lower tiles never render duplicate walls', () => {
  const map = createPresetMap('mixed-corners');
  const mesh = computeMapElevationMesh(map);

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const cell = mesh[y][x];
      if (x + 1 < map.width) {
        const rightNeighbor = mesh[y][x + 1];
        const eA = cell.edges.east;
        const eB = rightNeighbor.edges.west;
        // At most one side can own/expose the shared edge
        assert.equal(
          (eA.exposed ? 1 : 0) + (eB.exposed ? 1 : 0),
          cell.height === rightNeighbor.height ? 0 : 1,
          `Duplicate or missing edge ownership between (${x},${y}) and (${x + 1},${y})`
        );
      }
      if (y + 1 < map.height) {
        const bottomNeighbor = mesh[y + 1][x];
        const sA = cell.edges.south;
        const nB = bottomNeighbor.edges.north;
        assert.equal(
          (sA.exposed ? 1 : 0) + (nB.exposed ? 1 : 0),
          cell.height === bottomNeighbor.height ? 0 : 1,
          `Duplicate or missing edge ownership between (${x},${y}) and (${x},${y + 1})`
        );
      }
    }
  }
});

test('8. Corners, map boundaries, staircase, and steep 0-to-32 transitions stay within footprint without gaps', () => {
  for (const preset of ['single-raised', 'plateau', 'staircase', 'equal-neighbors', 'steep-cliff', 'mixed-corners']) {
    const map = createPresetMap(preset);
    const ctx = createRecordingContext();
    const log = renderIso(ctx, map, { originX: 480, originY: 120, zoom: 1 });

    // Verify boundary cliffs at map edges stay strictly within horizontal tile footprint [cx - 32, cx + 32]
    for (const cliff of log.cliffs) {
      const tile = log.tiles.find(t => t.x === cliff.x && t.y === cliff.y);
      assert.ok(tile);
      assert.ok(cliff.bounds.minX >= tile.screenX - HALF_W - 0.001);
      assert.ok(cliff.bounds.maxX <= tile.screenX + HALF_W + 0.001);
      assert.equal(cliff.topZ - cliff.bottomZ, cliff.diff);
    }

    // Verify corner junctions are continuous
    for (const tile of log.tiles) {
      for (const corner of Object.values(tile.corners)) {
        assert.equal(corner.seamless, true);
        assert.ok(corner.sharedRidgeTopZ >= corner.sharedRidgeBottomZ);
      }
    }
  }
});

test('9. Units and buildings on raised terrain use correct elevated anchors and remain selectable', () => {
  const map = createMap({ width: 6, height: 6 });
  setTileElevation(map, 2, 2, 24);
  setTileElevation(map, 4, 3, 32);
  map.properties.push({ type: 'barracks', x: 2, y: 2, facing: 'right', owner: 0 });
  map.units.push({ type: 'tank', x: 4, y: 3, facing: 'down-right', army: 'allies', owner: 0 });

  const bldgPos = getEntityRenderPosition(map, map.properties[0], 480, 120, 1);
  const bldgBase = gridToIso(2, 2, 0, 480, 120, 1);
  assert.equal(bldgPos.anchorX, bldgBase.x, 'Building X must not drift laterally when elevated');
  assert.equal(bldgPos.anchorY, bldgBase.y - 24 * VOXEL_Z_PX, 'Building Y must shift up by H * 0.5 px');

  const unitPos = getEntityRenderPosition(map, map.units[0], 480, 120, 1);
  const unitBase = gridToIso(4, 3, 0, 480, 120, 1);
  assert.equal(unitPos.anchorX, unitBase.x, 'Unit X must not drift laterally when elevated');
  assert.equal(unitPos.anchorY, unitBase.y - 32 * VOXEL_Z_PX, 'Unit Y must shift up by H * 0.5 px');
  assert.equal(unitPos.shadowX, unitPos.anchorX);
  assert.equal(unitPos.shadowY, unitPos.anchorY);

  // Hit-testing at the elevated top surface selects the raised tile accurately
  const pickedBldgTile = isoToGrid(bldgPos.anchorX, bldgPos.anchorY, map, 480, 120, 1);
  assert.deepEqual(pickedBldgTile, { x: 2, y: 2, elevation: 24, hitSurface: 'top' });

  const pickedUnitTile = isoToGrid(unitPos.anchorX, unitPos.anchorY, map, 480, 120, 1);
  assert.deepEqual(pickedUnitTile, { x: 4, y: 3, elevation: 32, hitSurface: 'top' });
});

test('10. Terrain type, terrain rules, ownership, unit occupancy, and Fog of War remain unchanged when editing elevation', () => {
  const initial = createMap({
    width: 5,
    height: 5,
    terrain: Array.from({ length: 5 }, (_, y) => Array.from({ length: 5 }, (_, x) => (x === 2 ? 'road' : 'plains'))),
    properties: [{ type: 'hq', x: 2, y: 2, owner: 1, facing: 'left' }],
    units: [{ type: 'commando', x: 2, y: 3, owner: 0, army: 'allies', facing: 'up-right' }],
    fog: Array.from({ length: 5 }, (_, y) => Array.from({ length: 5 }, (_, x) => x > 2 && y > 2)),
  });

  const editor = new MapElevationEditor(initial);
  editor.selectHeight(20);
  editor.paintElevation(2, 2);
  editor.paintElevation(2, 3);

  assert.equal(getTileElevation(editor.map, 2, 2), 20);
  assert.equal(getTileElevation(editor.map, 2, 3), 20);
  assert.equal(getTileTerrain(editor.map, 2, 2), 'road');
  assert.equal(getTileTerrain(editor.map, 2, 3), 'road');
  assert.deepEqual(editor.map.properties, initial.properties);
  assert.deepEqual(editor.map.units, initial.units);
  assert.deepEqual(editor.map.fog, initial.fog);

  // Undo & redo preserve terrain and restore height
  assert.equal(editor.undo(), true);
  assert.equal(getTileElevation(editor.map, 2, 3), 0);
  assert.equal(editor.redo(), true);
  assert.equal(getTileElevation(editor.map, 2, 3), 20);

  // Reset tile to height 0
  editor.resetTileElevation(2, 2);
  assert.equal(getTileElevation(editor.map, 2, 2), 0);
  assert.equal(getTileTerrain(editor.map, 2, 2), 'road');
});

test('11. Elevation 0 preserves baseline flat terrain rendering, shoreline masks, and water shimmer', () => {
  const flatMap = createPresetMap('flat');
  const ctx = createRecordingContext();
  const log = renderIso(ctx, flatMap, { timeMs: 500 });

  assert.equal(log.cliffs.length, 0, 'Flat map at elevation 0 must render zero cliffs');
  for (const t of log.tiles) {
    assert.equal(t.elevation, 0);
    assert.equal(t.elevOffset, 0);
    assert.equal(t.screenX, t.baseX);
    assert.equal(t.screenY, t.baseY);
  }

  // Verify coast.js shoreline blending and water shimmer helpers work on elevation 0
  assert.ok(shoalLandMask(flatMap, 1, 2) > 0);
  assert.ok(shoalSiblingMask(flatMap, 1, 2) > 0);
  const sides = shoreSides(flatMap, 1, 2);
  assert.equal(sides.west, true, 'Shoal at x=1 borders sea at x=0');
  const poly = sandPolygon(100, 100, flatMap, 1, 2, 1);
  assert.equal(poly.length, 4);
  const phase0 = waterShimmerPhase(0, 2, 0);
  const phase1 = waterShimmerPhase(0, 2, 600);
  assert.notEqual(phase0, phase1);
});

test('12. Generated elevation assets exist, manifest paths resolve, previews render, and pipeline rebuilds deterministically', () => {
  const voxDoc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/voxels.json'), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'game_assets/voxels/sheets/manifest.json'), 'utf8'));

  assert.equal(ELEVATION_MODELS.length, 9);
  for (let i = 0; i < ELEVATION_LEVELS.length; i++) {
    const h = ELEVATION_LEVELS[i];
    const id = elevationModelId(h);
    assert.ok(voxDoc.models[id], `Missing ${id} in data/voxels.json`);
    assert.equal(voxDoc.models[id].kind, 'terrain');

    const previewPath = path.join(ROOT, 'game_assets/voxels', `${id}.png`);
    assert.equal(fs.existsSync(previewPath), true, `Missing preview PNG: ${previewPath}`);
    assert.ok(fs.statSync(previewPath).size > 200);

    const mEntry = manifest.models[id];
    assert.ok(mEntry, `Missing ${id} in manifest.json`);
    assert.deepEqual(Object.keys(mEntry), ['right', 'up', 'left', 'down'], `${id} must have 4 cardinal facings`);

    for (const facing of ['right', 'up', 'left', 'down']) {
      const fEntry = mEntry[facing];
      assert.equal(fEntry.anchorX, 32, `${id}-${facing} must keep anchorX = 32`);
      assert.equal(fEntry.anchorY, 17 + h * 0.5, `${id}-${facing} anchorY must step by +2px per 4 voxel units`);
      const sheetRel = fEntry.variants?.n?.file;
      assert.ok(sheetRel, `Missing neutral variant for ${id}-${facing}`);
      const sheetPath = path.join(ROOT, 'game_assets/voxels/sheets', sheetRel);
      assert.equal(fs.existsSync(sheetPath), true, `Missing baked sheet: ${sheetPath}`);
      const sha = crypto.createHash('sha256').update(fs.readFileSync(sheetPath)).digest('hex');
      assert.equal(sha, fEntry.variants.n.sha256, `SHA-256 mismatch for ${sheetRel}`);
    }
  }

  // Deterministic re-bake check on elevation-00 and elevation-32
  const rebaked = bake(voxDoc, voxDoc.palette, { only: ['elevation-00', 'elevation-32'] });
  for (const id of ['elevation-00', 'elevation-32']) {
    for (const facing of ['right', 'up', 'left', 'down']) {
      assert.equal(
        rebaked.manifest.models[id][facing].variants.n.sha256,
        manifest.models[id][facing].variants.n.sha256,
        `Re-bake of ${id}-${facing} must be deterministic`
      );
    }
  }
});

test('13. All 58 base units have complete 4-faction unit models (290 total) with 8 facings and distinct silhouettes', () => {
  const unitsJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/units.json'), 'utf8'));
  const voxDoc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/voxels.json'), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'game_assets/voxels/sheets/manifest.json'), 'utf8'));

  const unitIds = Object.keys(unitsJson);
  assert.equal(unitIds.length, 58, 'Must have 58 base units');
  assert.deepEqual(UNIT_ARMY_IDS, ['allies', 'soviets', 'empire', 'legion']);

  for (const u of unitIds) {
    assert.ok(voxDoc.models[u], `Missing standard unit model ${u}`);
    assert.ok(manifest.models[u], `Missing standard unit manifest entry ${u}`);

    const coordHashes = new Set();
    for (const army of UNIT_ARMY_IDS) {
      const fid = `${u}--${army}`;
      assert.ok(voxDoc.models[fid], `Missing faction unit model ${fid} in voxels.json`);
      assert.equal(voxDoc.models[fid].kind, 'unit');
      assert.ok(fs.existsSync(path.join(ROOT, 'game_assets/voxels', `${fid}.png`)), `Missing preview ${fid}.png`);

      const mEntry = manifest.models[fid];
      assert.ok(mEntry, `Missing faction unit manifest entry ${fid}`);
      assert.equal(Object.keys(mEntry).length, 8, `${fid} must have 8 directional facings`);
      for (const facing of ['right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right']) {
        assert.ok(mEntry[facing], `${fid} missing facing ${facing}`);
        assert.equal(Object.keys(mEntry[facing].variants).length, 6, `${fid}-${facing} must have 6 team variants (0..5)`);
      }

      // Verify 3D coordinate geometry (ignoring palette index) differs across the 4 factions
      const coordsOnly = voxDoc.models[fid].voxels.map(([x, y, z]) => `${x},${y},${z}`).join(';');
      coordHashes.add(crypto.createHash('sha1').update(coordsOnly).digest('hex'));
    }
    assert.equal(coordHashes.size, 4, `Unit ${u} must have 4 distinct 3D voxel geometries across Allies, Soviets, Empire, and Legion`);
  }
});

test('14. All 26 buildings/structures (130 total) and all 6 wall/gate fortifications (30 total) have 4-faction models with distinct geometry', () => {
  const voxDoc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/voxels.json'), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'game_assets/voxels/sheets/manifest.json'), 'utf8'));

  assert.equal(BUILDINGS.length, 26, 'Must have 26 base buildings/military structures');
  for (const b of BUILDINGS) {
    assert.ok(voxDoc.models[b], `Missing standard building model ${b}`);
    assert.ok(manifest.models[b], `Missing standard building manifest entry ${b}`);

    const coordHashes = new Set();
    for (const army of UNIT_ARMY_IDS) {
      const fid = `${b}--${army}`;
      assert.ok(voxDoc.models[fid], `Missing faction building model ${fid} in voxels.json`);
      assert.equal(voxDoc.models[fid].kind, 'building');
      assert.ok(fs.existsSync(path.join(ROOT, 'game_assets/voxels', `${fid}.png`)), `Missing preview ${fid}.png`);

      const mEntry = manifest.models[fid];
      assert.ok(mEntry, `Missing faction building manifest entry ${fid}`);
      assert.deepEqual(Object.keys(mEntry), ['right', 'up', 'left', 'down'], `${fid} must have 4 cardinal facings`);
      for (const facing of ['right', 'up', 'left', 'down']) {
        assert.equal(Object.keys(mEntry[facing].variants).length, 7, `${fid}-${facing} must have 7 team variants (0..5, n)`);
      }

      const coordsOnly = voxDoc.models[fid].voxels.map(([x, y, z]) => `${x},${y},${z}`).join(';');
      coordHashes.add(crypto.createHash('sha1').update(coordsOnly).digest('hex'));
    }
    assert.equal(coordHashes.size, 4, `Building ${b} must have 4 distinct 3D architectural geometries across Allies, Soviets, Empire, and Legion`);
  }

  // Verify all 6 wall/gate fortification types have all 4 faction models + standard (30 models)
  const fortBases = ['wall', 'wall-gate', 'wall-end', 'wall-corner', 'wall-t', 'wall-cross'];
  for (const fBase of fortBases) {
    for (const army of ['standard', ...UNIT_ARMY_IDS]) {
      const fid = fortificationSheetKey(fBase, army);
      assert.ok(voxDoc.models[fid], `Missing fortification model ${fid}`);
      assert.ok(manifest.models[fid], `Missing fortification manifest entry ${fid}`);
      assert.ok(fs.existsSync(path.join(ROOT, 'game_assets/voxels', `${fid}.png`)), `Missing fortification preview ${fid}.png`);
    }
  }
});

test('15. Runtime renderer and army helpers resolve faction models independently of player team colour', () => {
  const map = createMap({ width: 6, height: 6 });
  map.players = [
    { owner: 0, army: 'allies' },
    { owner: 1, army: 'soviets' },
    { owner: 2, army: 'empire' },
    { owner: 3, army: 'legion' },
  ];
  map.wallArmy = 'empire';
  map.terrain[0][0] = 'wall';
  map.terrain[0][1] = 'wall-gate';
  map.properties.push(
    { type: 'hq', x: 1, y: 1, owner: 0, facing: 'right' },
    { type: 'barracks', x: 2, y: 1, owner: 1, facing: 'up' },
    { type: 'research-lab', x: 3, y: 1, owner: 2, facing: 'left' },
    { type: 'coastal-battery', x: 4, y: 1, owner: 3, facing: 'down' },
  );
  map.units.push(
    { type: 'commando', x: 1, y: 2, owner: 3, army: 'legion', facing: 'down-right' },
    { type: 'attack-dog', x: 2, y: 2, owner: 0, facing: 'up-left' },
  );

  assert.equal(resolveEntityArmy(map, map.properties[0]), 'allies');
  assert.equal(resolveEntityArmy(map, map.properties[1]), 'soviets');
  assert.equal(resolveEntityArmy(map, map.properties[2]), 'empire');
  assert.equal(resolveEntityArmy(map, map.properties[3]), 'legion');
  assert.equal(buildingSheetKey('hq', 'allies'), 'hq--allies');
  assert.equal(unitSheetKey('commando', 'legion'), 'commando--legion');
  assert.equal(fortificationSheetKey('wall', 'empire'), 'wall-empire');
  assert.equal(fortificationSheetKey('wall-gate', 'soviets'), 'wall-gate-soviets');

  const ctx = createRecordingContext();
  const log = renderIso(ctx, map);
  const bldgs = log.entities.filter(e => e.kind === 'building');
  assert.equal(bldgs.length, 4);
  assert.deepEqual(
    bldgs.map(b => [b.modelId, b.army, b.variant]),
    [
      ['hq--allies', 'allies', '0'],
      ['barracks--soviets', 'soviets', '1'],
      ['research-lab--empire', 'empire', '2'],
      ['coastal-battery--legion', 'legion', '3'],
    ]
  );

  const units = log.entities.filter(e => e.kind === 'unit');
  assert.equal(units.length, 2);
  assert.deepEqual(
    units.map(u => [u.modelId, u.army, u.variant]),
    [
      ['commando--legion', 'legion', '3'],
      ['attack-dog--allies', 'allies', '0'],
    ]
  );
});

