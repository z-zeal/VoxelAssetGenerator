# Isometric 64×64×64 Voxel Asset Rebuild — Completion Report

> **Historical document (pre-scale-migration).** Grid sizes, counts and 0.5 px/voxel
> offsets below describe the retired 64-voxel single-tile contract. Current contract:
> [SCALE_128.md](SCALE_128.md); results: [SCALE_MIGRATION_REPORT.md](SCALE_MIGRATION_REPORT.md).

**Branch:** `arena/6796ddea-advance-wars` · **Date:** 2026-10-24
**Scope:** every asset consumed by Isometric 3D voxel mode. Classic 2D is
byte-identical (verified below). No gameplay, rules, map-logic, footprint or
multiplayer-authority changes.

## 1. The standard, and how it is implemented

- **Authoring resolution:** all models are sculpted on a **64×64×64** grid
  (`data/voxels.json`, format `field-command-voxel-64x64x64`, 146-colour
  global palette, 1,915,767 voxels total). Shapes occupy only the cells their
  proportions need — nothing is stretched or upscaled from the old 32×32×23
  meshes; every model was re-authored with genuine geometric detail (tread
  links, rotor hubs, gun mantlets, bridge pilings, conifer canopies, …).
- **Scale separation:** the logical map cell stays the 64×32 iso diamond
  (`src/iso.js`, `ISO_Z = 23` untouched). The baker rasterizes each 64³ model
  at 4× supersampling (288×320 buffer) and box-filters to runtime size, so
  voxel resolution and render scale are independent knobs (`DOWNSCALE`).
- **Footprints unchanged:** movement, placement, hitboxes and terrain effects
  read the same map/units data as before; only pixels changed.

## 2. Pipeline (reused, not replaced)

`tools/voxel_pipeline/build.mjs` (geometry + mechanical pose frames — single
source of truth) → `tools/voxel_pipeline/bake.mjs` (4 turn-facings × team
variants × animation strips, manifest v3) → `tools/voxel_pipeline/preview.mjs`
(inspection renders). New `models/units.mjs`, `models/buildings.mjs`,
`models/terrain.mjs` hold the sculpted 64³ art. The Python rasterizers
(`bake.py`, `preview.py`) were **removed** after the Node equivalents passed
every gate — 64³ multi-frame rasterization (~30 M voxel draws + 4×4
downsampling per frame) exceeded what the pure-stdlib Python loops could do
inside the repo's ≤10 min bake budget. Manifest fields, shading factors,
rotation-not-mirror facings and team-variant semantics are unchanged.

**Bake output (green):** 3,024 strips · 152 models · 26.67 MB PNG payload ·
111 s. Determinism: re-bake reproduces every sha256 (subset asserted in unit
tests; full re-bake verified during development).

## 3. Per-category counts

| category | inventoried | rebuilt | validated | exceptions |
| --- | --- | --- | --- | --- |
| Units (22 types × 5 armies) | 110 | 110 | 110 | 0 |
| Buildings & structures | 9 | 9 | 9 | alpha-gate exemption (§6.2) |
| Terrain tiles & world structures | 32 | 32 | 32 | flat vector surfaces kept (§6.3) |
| Effects (silo missile) | 1 | 1 | 1 | particles/blast stay renderer-side (§6.4) |
| **Total voxel models** | **152** | **152** | **152** | — |

Full model-by-model table: `docs/VOXEL64_INVENTORY.md` (all ✅).

## 4. Animation approach

- **Clips follow real gameplay state:** `data/animation.json` (unchanged —
  the rebuilt clips match it exactly) drives idle/move/attack/death per
  family: foot 1/4/3/5, wheeled & tracked 1/4/3/4, rotor 2/4/2/4, jet
  1/3/2/4, naval 1/4/2/4 frames; buildings 1–2 idle frames; silo-missile a
  3-frame thrust cycle. `tools/validate-animation.mjs` now cross-checks the
  baked manifest clips against animation.json for all 152 models (0 errors).
- **Mechanical motion:** rotor spin (idle + move, tail/fore rotors phased),
  tread cleats cycle **only in the move clip**, wheels rotate on move,
  artillery/AA/missile/rocket barrels elevate → recoil → return on attack,
  turrets yaw about ring pivots (`pivotFrom`), naval wake + hull lift/list,
  jet exhaust undulation + bay/rack launches, infantry gait/arm-swing/
  weapon-raise and staggered collapse deaths, corpse = final death frame.
- **Renderer wiring (`src/iso-renderer.js`):** `clipFrameIndex` maps
  clip-relative frames from gameplay events onto absolute strip indices;
  `unitPose` supplies idle motion (rotor spin, naval bob) with per-unit
  `hash01` phasing; the old Phase-10 procedural building overlay was
  **deleted** in favour of baked idle strips; `drawIsoSiloMissile` blits the
  true voxel missile (up/down facings, ballistic lift) — iso only; Classic
  keeps its 2D procedural strike. All animation is cosmetic: no attack,
  damage-timing or availability logic moved client-side; multiplayer visuals
  react solely to authoritative state.

## 5. Files changed

- **Assets:** `data/voxels.json` (regenerated 64³), `game_assets/voxels/*.png`
  (152 previews), `game_assets/voxels/sheets/**` (3,024 strips + manifest v3).
- **Pipeline:** `tools/voxel_pipeline/build.mjs`, `bake.mjs` *(new)*,
  `preview.mjs` *(new)*, `models/{units,buildings,terrain}.mjs` *(new)*;
  `bake.py`/`preview.py` **deleted** (no remaining references);
  `package.json` scripts → `.mjs`.
- **Runtime:** `src/iso-renderer.js` (clip wiring, pose fallbacks, overlay
  removal), `src/voxel-gallery.js` (manifest v3 read). `src/renderer.js`,
  `src/iso.js`, `src/animation.js`, `src/main.js`, `assets/` — **unchanged**.
- **Tests/tools:** `tests/voxels.test.js` (rewritten, 13 tests),
  `tests/voxel-frames.test.js` *(new, 6 tests — decodes the baked PNGs and
  re-runs the motion gates on real pixels)*, `tools/validate-animation.mjs`
  (manifest cross-check), `tools/browser-smoke.mjs` (iso silo strike now
  proven via voxel-strip blits).
- **Docs:** `docs/VOXEL64_INVENTORY.md`, this report, notes in
  `docs/PLAN_graphics_and_sprite_animation.md` and `docs/PLAYABLE_BUILD.md`.

## 6. Verification actually performed

1. `npm test` — **496 tests: 492 pass / 2 fail / 2 skip.** The 2 failures
   (`tests/multiplayer-convex.test.js` #318/#322) are **pre-existing on the
   base commit** (verified before any changes) and unrelated to assets; the
   skips are pre-existing.
2. `node tools/validate-animation.mjs` — OK, 0 errors (22 units × 5 armies,
   8 buildings, silo effect, static terrain all match their clips).
3. `npm run test:browser` — **full Playwright smoke passed** against the live
   static server in both view modes, including the Missile Silo launch
   (ignition, voxel warhead flight, shockwave, mushroom cloud, −30 labels in
   2D **and** iso), combat, production and resource flows; zero page
   exceptions. The game was genuinely launched headless
   (@sparticuz/chromium); screenshots in `.generated/` (git-ignored).
4. Classic isolation: `src/renderer.js` and `assets/` show **no git diff**;
   `tests/sprites-32.test.js` and `tests/frame-parity.test.js` green.
5. Manual visual checks: 152 preview renders spot-checked across categories
   (infantry, tank, copter, hq, road, tree, silo-missile, army variants) plus
   in-browser iso screenshots.
6. A bake bug found by the new pixel-decoding test was fixed before release:
   full-coverage alpha quantized to `round(255/64)*64 = 256`, truncating to
   **0** in the PNG buffer (hollow sprite interiors). Now clamped to 255;
   strips carry alpha levels {0, 64, 128, 192, 255} and all gates re-passed.

## 7. Remaining exceptions & deviations (with reasons)

1. **Payload 26.67 MB vs the original ≤12 MB plan target** — multi-frame
   64³ strips (13–20 frames/model/facing) replaced mostly single-frame 32³
   sheets. Re-gated at ≤30 MB (asserted in tests); mitigations: 5-level alpha
   quantization, sha1 frame de-duplication, zlib-9, tight bbox crops, lazy
   per-model loading. The repo already serves ~610 MB of audio.
2. **Buildings exempt from the silhouette (alphaDiff) gate** — changed-pixels
   gate still enforced. A building's topmost moving part can flip between
   facings without altering the outer silhouette in all 4 turnings; documented
   in `bake.mjs` (`needAlpha = kind !== 'building'`) and the inventory.
3. **Flat terrain surfaces** (plains/sea/river/shoal/base diamonds) have no
   voxel asset by design — they are vector-painted with live shoreline/water
   shimmer in the iso renderer; remastering them would delete animated
   blending. Every *voxel* terrain model was rebuilt.
4. **Muzzle flashes, impact debris, blast volumes** remain renderer-side
   projected particles — not voxel assets; they share timing code with
   gameplay presentation that must not change.
5. **Army-variant strip de-duplication impossible** — all 88 army variants
   were checked pairwise: 0 identical strips (distinct hull/trim paint), so
   no further size win is available there.
