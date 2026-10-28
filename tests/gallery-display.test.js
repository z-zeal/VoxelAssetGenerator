/**
 * Display contract for the review gallery.
 *
 * The gallery composites *runtime-scale* sheets, so a tank is a ~60×43 image. To
 * be legible it has to be magnified, and PR #18 magnified it with
 * `image-rendering: pixelated` at an integer scale — which turned every sprite
 * into an 8-pixel mosaic and was reported, correctly, as "the preview becomes
 * pixelated". The fix is a display contract worth pinning down, because it is
 * invisible to every other test in this repo: nothing bakes a wrong pixel, the
 * page just *shows* one badly.
 *
 *   1. the default filter is smooth — nearest-neighbour is opt-in;
 *   2. the default zoom fits the stage at a fractional scale, not a fixed
 *      integer;
 *   3. a high-resolution baked preview is reachable from the stage;
 *   4. crisp mode still exists, because counting voxels needs it.
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

test('the canvas is not nearest-neighbour by default', () => {
  const base = rule('#view');
  assert.ok(base, '#view rule is missing');
  assert.match(base, /image-rendering:\s*auto/, '#view must scale smoothly by default');
  assert.doesNotMatch(base, /pixelated/,
    '#view must not be pixelated at rest — that is the mosaic bug');
});

test('crisp pixel mode exists, but only under an explicit class', () => {
  assert.match(html, /\.stage\.crisp\s+#view\s*\{[^}]*pixelated/,
    'pixelated must be gated behind .stage.crisp');
});

test('the default zoom fits the stage instead of pinning an integer scale', () => {
  const zoomButtons = [...html.matchAll(/<button data-zoom="(\d+)"( class="active")?>/g)];
  assert.ok(zoomButtons.length >= 3, 'zoom presets missing');
  const active = zoomButtons.find(([, , cls]) => cls);
  assert.ok(active, 'one zoom preset must be active by default');
  assert.equal(active[1], '0', 'default zoom must be "fit" (data-zoom="0")');
  // The old mosaic presets: anything above 4x exists only to blow the sprite up
  // into blocks, and fit/crisp already cover looking at it closely.
  for (const [, v] of zoomButtons) {
    assert.ok(Number(v) <= 4, `zoom preset ${v}x is a mosaic preset; cap presets at 4x`);
  }
  assert.match(html, /fitScale\(/, 'fit must be computed as a fractional scale');
  assert.doesNotMatch(html, /Math\.floor\(Math\.min\(availW \/ C\.W/, 'fit must not floor to an integer');
});

test('smooth is the default filter and crisp is opt-in', () => {
  const m = html.match(/<button data-crisp="1"( class="active")?>/);
  assert.ok(m, 'crisp toggle missing');
  assert.equal(m[1], undefined, 'crisp must not be active by default');
  assert.match(html, /<button data-crisp="0" class="active">/, 'smooth must be the default');
});

test('the stage opens on the high-resolution baked preview', () => {
  assert.match(html, /<img id="hires"/, 'the stage needs a slot for the baked preview');
  assert.match(html, /<button data-hires="1" class="active">/, 'baked preview must be the default');
  assert.match(html, /hires: true,/, 'state must start on the baked preview');
  assert.match(html, /hi\.src = entry\.preview/, 'the stage must load the asset\'s preview.png');
});

test('interactive controls fall back to the live sheet', () => {
  // A control that cannot move the picture is worse than no control, so every
  // handler that changes what is drawn has to leave the static bake first.
  assert.match(html, /function showLive\(\)/, 'showLive() must exist');
  const hooks = [
    /cb\.onchange = \(\) => \{ st\.visible = cb\.checked; showLive\(\); rebuild\(\); \}/,
    /state\.facing = f; showLive\(\); renderFacings\(\); rebuild\(\)/,
    /state\.traverse = snapped;[\s\S]{0,120}showLive\(\);\n\s*rebuild\(\);/,
    /showLive\(\);\n\s*render\(\);/,   // view mode + light sliders
  ];
  for (const re of hooks) assert.match(html, re, `missing showLive() hook: ${re}`);
  // ...but the initial load must not fight the default.
  assert.match(html, /state\.selecting = true;/, 'selectAsset must guard the auto-switch');
});
