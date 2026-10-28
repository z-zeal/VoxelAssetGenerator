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
  assert.match(html, /const S = hi \? state\.sheetScale : 1;/,
    'hi sheets are in different pixel units — the screen position must be scaled');
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
