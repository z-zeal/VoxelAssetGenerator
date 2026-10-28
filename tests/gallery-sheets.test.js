/**
 * The review-sheet set (`sheets-hi/`) and the display maths that uses it.
 *
 * The gallery composites runtime sheets into one image per facing, then the
 * browser magnifies it. A runtime sheet for a 512³ tank is ~60×43 px, and a
 * 900 px stage asked for ~14× — a rotated turret came out looking like frosted
 * glass. The fix is not a CSS filter: it is more pixels. The baker now writes a
 * second sheet set at `hiSheetScale` for the gallery to composite.
 *
 * These tests pin the two things that can silently break that:
 *
 *   1. every baked asset actually has a complete, scaled hi set — a missing
 *      `filesHi` silently falls back to a 4× blurrier composite;
 *   2. the layout maths never magnifies beyond what is honest, and works in the
 *      same units for both sheet sets.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  computeLayout, pickSheetSet, AUTO_CSS_PER_RUNTIME,
} from '../tools/voxel_pipeline/v3/gallery-zoom.mjs';

const ROOT = fileURLToPath(new URL('../game_assets/', import.meta.url));
const index = JSON.parse(readFileSync(`${ROOT}voxel-index.json`, 'utf8'));
const entries = [
  ...Object.entries(index.units).map(([id, e]) => ['units', id, e]),
  ...Object.entries(index.buildings).map(([id, e]) => ['buildings', id, e]),
];

const manifestOf = (dir, id) => JSON.parse(readFileSync(`${ROOT}${dir}/${id}/manifest.json`, 'utf8'));

test('every baked asset ships a review sheet set', () => {
  assert.ok(entries.length >= 13, `expected the full roster, found ${entries.length}`);
  for (const [dir, id] of entries) {
    const m = manifestOf(dir, id);
    assert.ok(m.hiSheetScale >= 2, `${id}: hiSheetScale missing — re-bake with --sheet-k`);
    for (const [name, part] of Object.entries(m.parts)) {
      for (const [facing, e] of Object.entries(part.facings)) {
        assert.ok(e.filesHi, `${id}/${name}/${facing}: no hi sheet`);
        for (const [map, f] of Object.entries(e.filesHi.files)) {
          assert.ok(existsSync(`${ROOT}${dir}/${id}/${f.file}`),
            `${id}/${name}/${facing}/${map}: ${f.file} is in the manifest but not on disk`);
        }
      }
    }
  }
});

test('hi pivots and sizes are the runtime ones, scaled', () => {
  // Crops are ceil-ed to the supersample grid at each scale, so up to about one
  // runtime pixel of drift between the two sets is expected. More than that
  // means a pivot was projected in the wrong units — the bug that offsets a part
  // by a growing amount.
  for (const [dir, id] of entries) {
    const m = manifestOf(dir, id);
    const S = m.hiSheetScale;
    for (const [name, part] of Object.entries(m.parts)) {
      for (const [facing, e] of Object.entries(part.facings)) {
        assert.ok(Math.abs(S * e.w - e.filesHi.w) <= S + 2,
          `${id}/${name}/${facing}: width does not scale (${e.w} -> ${e.filesHi.w})`);
        for (const axis of [0, 1]) {
          assert.ok(Math.abs(S * e.pivot[axis] - e.filesHi.pivot[axis]) <= S + 2,
            `${id}/${name}/${facing}: pivot axis ${axis} does not scale `
            + `(${e.pivot[axis]} -> ${e.filesHi.pivot[axis]} at ${S}x)`);
        }
      }
    }
  }
});

test('the live composite has several times the pixels of the runtime sheet', () => {
  // This is the whole point: a review composite must not be a 60 px image.
  const m = manifestOf('units', 'tank');
  const S = m.hiSheetScale;
  const facing = 'd00';
  const span = (key) => {
    let lo = Infinity, hi = -Infinity;
    for (const part of Object.values(m.parts)) {
      const e = part.facings[facing].filesHi;
      lo = Math.min(lo, -e.pivot[key]);
      hi = Math.max(hi, -e.pivot[key] + (key === 0 ? e.w : e.h));
    }
    return hi - lo;
  };
  assert.ok(span(0) * span(1) >= 12 * 54 * 39,
    `tank composite is ${span(0)}×${span(1)}; expected ≥12× the runtime area at ${S}x`);
});

test('the auto fit shows both sheet sets at the same size, at different sharpness', () => {
  const stage = { stageW: 900, stageH: 640 };
  const runtime = computeLayout({ cw: 54, ch: 39, ...stage, zoom: 0, srcScale: 1 });
  const hi = computeLayout({ cw: 54 * 4, ch: 39 * 4, ...stage, zoom: 0, srcScale: 4 });

  // The cap is in runtime pixels, so the sprite does not jump when a hi set loads.
  assert.ok(Math.abs(runtime.cssW - hi.cssW) < 1, `${runtime.cssW} vs ${hi.cssW}`);
  assert.ok(runtime.runtime <= AUTO_CSS_PER_RUNTIME + 1e-9, 'auto fit must respect the cap');
  // The hi set reaches the same on-screen size with a quarter of the magnification:
  // that is the sharpness, and it is the whole reason the set exists.
  assert.equal(hi.css * 4, runtime.css, 'hi sheets must be magnified srcScale times less');
});

test('pinned presets are exact and clamped to the stage', () => {
  const stage = { stageW: 900, stageH: 640 };
  const one = computeLayout({ cw: 216, ch: 156, ...stage, zoom: 1, srcScale: 4 });
  assert.equal(one.css, 1, '1:1 must be exactly one CSS px per sheet pixel');
  const big = computeLayout({ cw: 216, ch: 156, stageW: 320, stageH: 240, zoom: 8, srcScale: 4 });
  assert.ok(big.cssW <= 320 && big.cssH <= 240, 'a preset must never crop the sprite');
});

test('crisp snaps to whole CSS pixels per sheet pixel', () => {
  const L = computeLayout({ cw: 216, ch: 156, stageW: 900, stageH: 640, zoom: 0, crisp: true, srcScale: 4 });
  assert.equal(L.css, Math.floor(L.css), 'crisp scale must be an integer');
  assert.ok(L.css >= 1);
});

test('the sheet-set picker is all-or-nothing', () => {
  const hi = { hiSheetScale: 4, parts: { a: { facings: { d00: { filesHi: {} } } } } };
  assert.deepEqual(pickSheetSet(hi, ['a']), { scale: 4, hi: true });
  // One part without hi sheets means the whole composite falls back, so the HUD
  // is never approximate.
  const mixed = { hiSheetScale: 4, parts: { a: { facings: { d00: { filesHi: {} } } }, b: { facings: { d00: {} } } } };
  assert.deepEqual(pickSheetSet(mixed, ['a', 'b']), { scale: 1, hi: false });
  assert.deepEqual(pickSheetSet({ parts: {} }, ['a']), { scale: 1, hi: false });
});
