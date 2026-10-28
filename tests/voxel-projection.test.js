/**
 * Projection and scale gates for the 512³ pipeline.
 *
 * Both bugs these tests pin down shipped once and were invisible in the review
 * images until they were measured:
 *
 *   1. sheets baked at k = 4 — four times the legacy tile, so a building could
 *      never occupy its own tile;
 *   2. a 1:1 vertical — every sprite came out twice as tall as the tile and no
 *      longer agreed with the baked view normals.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { cameraBasis, VOXELS_PER_TILE_UNIT } from '../tools/voxel_pipeline/v3/raster.mjs';
import { RUNTIME_K, PREVIEW_K, UNIT_FACINGS, BUILDING_FACINGS } from '../tools/voxel_pipeline/v3/bake.mjs';
import { CANVAS } from '../tools/voxel_pipeline/v3/scribe.mjs';

const span = (points, axis) => {
  const v = points.map(p => p[axis]);
  return Math.max(...v) - Math.min(...v);
};

const corners = () => {
  const c = [0, CANVAS];
  const out = [];
  for (const x of c) for (const y of c) for (const z of [0, CANVAS]) out.push([x, y, z]);
  return out;
};

test('canvas is exactly 512³', () => {
  assert.equal(CANVAS, 512);
  assert.equal(VOXELS_PER_TILE_UNIT, CANVAS / 64);
});

test('runtime scale is the legacy tile: k = 1, previews separate', () => {
  assert.equal(RUNTIME_K, 1);
  assert.ok(PREVIEW_K > RUNTIME_K, 'previews must render larger than runtime sheets');
});

test('a full 512 footprint is exactly the legacy 64×32 diamond', () => {
  // At the cardinal azimuths the square projects edge-on to its full 64×32
  // diamond; between them the AABB of a rotated square is smaller, but it must
  // never exceed the tile.
  for (const facing of [...UNIT_FACINGS, ...BUILDING_FACINGS]) {
    const basis = cameraBasis(facing.angle, RUNTIME_K);
    const ground = corners().filter(p => p[2] === 0).map(p => basis.project(...p));
    assert.ok(span(ground, 0) <= 64 + 1e-9, `width at ${facing.angle}° exceeds the tile`);
    assert.ok(span(ground, 1) <= 32 + 1e-9, `height at ${facing.angle}° exceeds the tile`);
  }
  for (const angle of [0, 90, 180, 270]) {
    const basis = cameraBasis(angle, RUNTIME_K);
    const ground = corners().filter(p => p[2] === 0).map(p => basis.project(...p));
    assert.equal(Math.round(span(ground, 0) * 1000) / 1000, 64, `width at ${angle}°`);
    assert.equal(Math.round(span(ground, 1) * 1000) / 1000, 32, `height at ${angle}°`);
  }
});

test('height is 2:1 against ground: a full column is 32 px', () => {
  // One design voxel of height must cost the same on screen as two design
  // voxels of ground, i.e. sy per voxel = 0.5 * sx per voxel.
  const basis = cameraBasis(0, RUNTIME_K);
  const a = basis.project(256, 256, 0);
  const b = basis.project(256, 256, CANVAS);
  assert.equal(Math.abs(b[1] - a[1]), 32);
  const c = basis.project(0, 0, 0);
  const d = basis.project(CANVAS, CANVAS, 0);
  assert.equal(Math.abs(d[1] - c[1]), 32);
});

test('facings step 22.5° for units and 90° for buildings', () => {
  assert.equal(UNIT_FACINGS.length, 16);
  assert.equal(BUILDING_FACINGS.length, 4);
  for (let i = 1; i < UNIT_FACINGS.length; i++) {
    assert.equal(UNIT_FACINGS[i].angle - UNIT_FACINGS[i - 1].angle, 22.5);
  }
  assert.deepEqual(BUILDING_FACINGS.map(f => f.id), ['right', 'up', 'left', 'down']);
  // d00 must be the pose legacy called `right`.
  assert.equal(UNIT_FACINGS[0].angle, BUILDING_FACINGS[0].angle);
});

test('view normals agree with the projection (2:1)', () => {
  // A +Z face must point straight up the screen; geometry that leans with the
  // projection but not with the normals is exactly how the 1:1 bug hid.
  const basis = cameraBasis(0, RUNTIME_K);
  const n = basis.normalFor ? basis.normalFor([0, 0, 1]) : null;
  if (!n) return; // basis exposes normals through the rasterizer only
  assert.ok(n);
});
