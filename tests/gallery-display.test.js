/**
 * Display contract for the review gallery.
 *
 * This is the second time the gallery has been reported for showing the sprite
 * badly while every baked pixel was correct, so the contract is worth pinning
 * down. It lives here (and in `gallery-zoom.mjs` / `gallery-sheets.test.js`)
 * because nothing else in the repo can catch it: no bake produces a wrong pixel,
 * the page just *presents* one badly.
 *
 *   1. the page opens on the baked 8× preview — full review resolution;
 *   2. the live composite is composited from `sheets-hi/`, not from the
 *      60-pixel runtime sheets;
 *   3. crisp (nearest-neighbour) is the default for the live view, because at a
 *      4× sheet set the integer scale is 1–3 CSS px per sheet pixel — that reads
 *      as pixel art, not as the 8 px mosaic that was rejected;
 *   4. touching any interactive control leaves the baked render.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { cameraBasis } from '../tools/voxel_pipeline/v3/raster.mjs';

const html = await readFile(new URL('../voxel-sprite-review-v4.html', import.meta.url), 'utf8');

const rule = (selector) => {
  const re = new RegExp(`(^|\\n)\\s*${selector.replace(/[.#]/g, (m) => `\\${m}`)}\\s*\\{([^}]*)\\}`);
  const m = html.match(re);
  return m ? m[2] : null;
};

test('the canvas is never nearest-neighbour by default at the CSS level', () => {
  const base = rule('#view');
  assert.ok(base, '#view rule is missing');
  assert.match(base, /image-rendering:\s*auto/, '#view must not be pixelated at rest');
  assert.doesNotMatch(base, /pixelated/, 'crisp must be a class, not the base style');
  assert.match(html, /\.stage\.crisp\s+#view\s*\{[^}]*pixelated/,
    'pixelated must be gated behind .stage.crisp');
});

test('the stage opens on the high-resolution baked preview', () => {
  assert.match(html, /<img id="hires"/, 'the stage needs a slot for the baked preview');
  assert.match(html, /<button data-hires="1" class="active">/, 'baked preview must be the default');
  assert.match(html, /hires: true,/, 'state must start on the baked preview');
  assert.match(html, /hi\.src = entry\.preview/, "the stage must load the asset's preview.png");
});

test('the live composite reads the review sheets, not the runtime sheets', () => {
  assert.match(html, /from '\.\/tools\/voxel_pipeline\/v3\/gallery-zoom\.mjs'/,
    'display maths must live in the shared, testable module');
  assert.match(html, /const entry = \(state\.sheetHi && rec\.filesHi\) \? rec\.filesHi : rec;/,
    'loadPartMaps must prefer the hi sheet set');
  assert.match(html, /pickSheetSet\(state\.manifest/, 'the sheet set must be chosen per asset');
  // The scale is the manifest's `hiSheetScale`, NOT the ratio of the two crops.
  // A hi crop is ceil-ed to the supersample grid at its own scale, so the width
  // ratio is only ever approximately the scale (measured: 3.60–4.00); using it
  // scaled every part by its own error about its own origin and smeared the
  // layers apart by a few pixels.
  assert.match(html, /const S = hi \? state\.sheetScale : 1;/,
    'hi pixels must be scaled by the manifest scale, not by a measured crop ratio');
  assert.match(html, /scale: S,/, 'the same scale must map hi pixels onto the runtime depth sheet');
  assert.match(html, /const hires = state\.sheetHi && pick\.every/,
    'a composite must not mix hi and runtime layers: that is two coordinate systems');
});

test('a traversing part keeps its depth when drawn from another facing', () => {
  // A traversing part is composited from the sheet baked `steps` cameras round
  // the ring, so its depth sheet measures depth along THAT camera's axis. The
  // pose on screen is the part yawed about its ring, seen from the scene
  // camera; the two differ by `(v_scene − v_sheet) · root / 8`, a constant.
  // Without it the gun sat ~37 tile units too far back and the hull painted
  // over it as soon as the traverse left zero.
  assert.match(html, /depthBias: xf\.depthBias,/, 'the layer must carry the traverse depth correction');
  assert.match(html, /function traverseRootOf\(m, pmeta\)/, 'the rotation centre must be the ring, not the gun');
  const m = html.match(/function viewDirFor\(angleDeg\) \{([\s\S]*?)\n\}/);
  assert.ok(m, 'viewDirFor() is missing');
  const viewDirFor = new Function('angleDeg', m[1]);
  for (const angle of [0, 22.5, 45, 90, 180, 270]) {
    const dHat = cameraBasis(angle, 1).dHat;
    const got = viewDirFor(angle);
    for (let i = 0; i < 3; i++) {
      assert.ok(Math.abs(got[i] - dHat[i]) < 1e-12,
        `viewDirFor(${angle})[${i}] = ${got[i]}, camera axis is ${dHat[i]}`);
    }
  }
});

test('crisp pixels is the default for the live view', () => {
  assert.match(html, /<button data-crisp="1" class="active">/, 'crisp must be the default');
  assert.match(html, /crisp: true,/, 'state must start crisp');
  assert.match(html, /<button data-crisp="0">Smooth<\/button>/, 'smooth must remain available');
});

test('the default zoom fits, and the presets are sheet-pixel multiples', () => {
  const buttons = [...html.matchAll(/<button data-zoom="(\d+)"( class="active")?>/g)];
  assert.ok(buttons.length >= 3, 'zoom presets missing');
  const active = buttons.find(([, , cls]) => cls);
  assert.ok(active, 'one zoom preset must be active by default');
  assert.equal(active[1], '0', 'default zoom must be "fit"');
  for (const [, v] of buttons) {
    assert.ok(Number(v) <= 4, `zoom preset ${v}× is a mosaic preset at review scale`);
  }
  assert.match(html, /zoom: 0, /, 'state.zoom must start at fit');
});

test('interactive controls fall back to the live sheet', () => {
  assert.match(html, /function showLive\(\)/, 'showLive() must exist');
  const hooks = [
    /cb\.onchange = \(\) => \{ st\.visible = cb\.checked; showLive\(\); rebuild\(\); \}/,
    /state\.facing = f; showLive\(\); renderFacings\(\); rebuild\(\)/,
    /state\.traverse = snapped;[\s\S]{0,120}showLive\(\);\n\s*rebuild\(\);/,
    /showLive\(\);\n\s*render\(\);/,   // view mode + light sliders
  ];
  for (const re of hooks) assert.match(html, re, `missing showLive() hook: ${re}`);
  assert.match(html, /state\.selecting = true;/, 'selectAsset must guard the auto-switch');
});
