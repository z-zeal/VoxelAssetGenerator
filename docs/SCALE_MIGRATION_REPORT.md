# Asset scale migration — final report

**Branch:** `arena/0e53910e-voxelassetgenerator`
**Scope:** coordinated world-scale migration of the voxel roster from a single
64×64×64 cube per map tile to a 128×128×128 model canvas on a 32-unit tile grid.
This was a *scale* migration, not a resolution bump: every asset now has an
explicit role-appropriate size, and major buildings are real multi-tile
compounds.

**Result:** complete. All 500 models rebuilt, all 17,880 baked strips
regenerated, runtime integrated, review art regenerated, 27/27 automated gates
passing, 0 animation-motion gate failures in strict bake, 0 blocked assets.

---

## 1. The contract that changed

| quantity | before | after |
| --- | --- | --- |
| model canvas | 64³ (whole canvas = one tile) | **128³** (4 × 4 tiles) |
| ground tile | 64 voxels = one full model | **32 voxels** |
| footprint | implicit 1 tile for everything | **explicit, 32-voxel multiples** (1×1, 2×2, 3×2, 3×3) |
| elevation → pixels | 0.5 px per voxel (4-level step = 2 px) | **1 px per voxel** (4-level step = 4 px) |
| ground anchor | canvas centre (31.5, 31.5) | **per-model `groundAnchor`** (48, 48 for 1×1) |
| manifest metadata | flat keys next to facing keys | **`entry.meta`**, facing keys untouched |
| renderer placement | one sprite per building cell | **one sprite per footprint, anchored on its centre** |
| animation motion | design-space ops applied after resample | **`scalePoseMotion` promotes design → world before resample** |

Runtime contract now: `TILE_W 64`, `TILE_H 32`, `TILE_VOXELS 32`,
`VOXEL_Z_PX 1`, `VOXEL_GRID_SIZE 128`, `DOWNSCALE 2`, tile diamond unchanged at
2:1 (2 px per voxel horizontally, 1 px vertically). `ISO_Z` (23) is untouched.

Normative specification: **`docs/SCALE_128.md`**.

---

## 2. Phase A — audit (before any edit)

The following assumptions were located and catalogued before changing constants:

| location | old assumption | risk found |
| --- | --- | --- |
| `src/iso.js` | `VOXEL_GRID_SIZE 64`, `DOWNSCALE 1`, `VOXEL_Z_PX 0.5` | every sprite and elevation offset was tied to a 64-voxel canvas |
| `src/iso.js` / `iso-renderer.js` | buildings drawn per occupied cell only | no multi-tile concept: a 3×3 HQ would have been drawn 9 times |
| `src/map-editor.js` | `placeBuilding` cleared a single cell | partial replacement would leave orphaned cells |
| `bake.mjs` | rotation about canvas centre `GRID/2` | off-centre models drift out of their crop (`silo-missile-down` anchor x −25) |
| `bake.mjs` | manifest metadata beside facing keys | consumers counting facings would see metadata as a ninth/eighth direction |
| `build.mjs` | pose ops applied in design space | sub-voxel motion disappeared after world resample |
| `tests/elevation.test.js` | 64-px tile maths, 0.5 px/voxel | would silently keep the old scale |

No constant was changed before this table was complete.

---

## 3. Asset accounting — every asset accounted for

`data/voxels.json` → **500 models, 1,678,654 voxels, 360 palette colours.**

| category | ids | base types | armies | models | work |
| --- | --- | --- | --- | --- | --- |
| Infantry / vehicles / aircraft / naval | 290 | 58 | standard + allies, soviets, empire, legion | 290 | recalculated to half-scale world voxels (32-voxel tile), silhouette fixes |
| Buildings / structures | 130 | 26 | standard + 4 factions | 130 | re-authored on footprint design grids; 3 compound types fully remodelled |
| Terrain / environment | 79 | 79 | — | 79 | recalculated; connectors, props, elevation blocks re-derived |
| Effects | 1 | 1 | — | 1 | recalculated (silo missile) |

Footprint distribution across all 500 ids:

| footprint | voxels per cell block | ids |
| --- | --- | --- |
| 1×1 | 32 × 32 | 415 |
| 2×2 | 64 × 64 | 70 |
| 3×2 | 96 × 64 | 5 |
| 3×3 | 96 × 96 | 10 |

**85 ids (17 types × 5 armies) are multi-tile**: hq, airport, port, base, city,
farm, mine, depot, supply-depot, repair-depot, field-hospital, barracks,
helipad, power-plant, refinery, radar-station, research-lab.

**Fully remodelled compounds** (not scaled up): `hq` 3×3 with perimeter wall,
parade ground, annexes and command block; `airport` 3×3 with paved runway,
aprons, control tower and hangars; `port` 3×2 with quays, water basin and
cranes. 1×1 posts (9 types) were re-authored on 32×32 grids so they read as
small strongpoints, and the 14 facilities on 64×64 grids fill their 2×2 blocks.

Full per-asset record:
**`docs/ASSET_SIZING_MATRIX.md`** — id, category, height class, visual and
gameplay footprint, model bounds, render scale, facings, variants, frame cells,
validation status (500 rows, generated from the committed data).

---

## 4. Phase B–E — modelling work

**Prototype (Phase B).** One asset per category (infantry, tank, tree, pillbox,
airport, hq) taken end-to-end through sculpt → resample → preview → bake →
runtime draw before touching the rest of the roster. Verified anchors, tile
grounding and 3×3 centring; then rolled out.

**Terrain (Phase C).** All 79 cells keep their ids, movement costs, defence and
passability. Ground geometry is recalculated to 32 world voxels per tile; props
keep half-scale z so they retain their old proportions. The nine
`elevation-*` blocks are the exception: their z is the elevation level and is
not rescaled (see §5). Roads (`road-0…f`), pipes and bridges were checked for
cell-spanning coverage; `bridge-ew`/`bridge-ns` span a full 32-voxel tile.

**Units (Phase D).** All 58 base types × 5 armies recalculated to half-scale
world voxels (a soldier occupies roughly a third of a tile, a tank most of it).
Because design-space motion is invisible after a 2:1 resample, the animation
pipeline now promotes pose ops with `scalePoseMotion(ops, spec.scale)`; in
addition the geometry was made to move at world scale: 4-design-voxel tread
cleats, 2×2-proud tyre lugs, Soviet side appliqué and Legion deck planks above
the tread belt, and a new `addMuzzleFlash` op for armed units on attack frames.
Result: **0 motion-gate failures** across every unit facing, clip and frame.

**Buildings (Phase E).** 1×1 posts authored on 32×32 grids, 2×2 facilities on
64×64, and the three major compounds on 96×96 / 96×64. Each is translated into
its footprint block inside the 128³ canvas (never stretched), with
`groundAnchor` at the block centre. Faction variants keep their architectural
deltas (verified distinct across all four armies).

**Anatomy of the rescale (no upscaling used as a substitute for modelling):**
rendering uses `renderScale 1` for every asset. There is no display-time
enlargement anywhere in the roster; the HQ was remodelled, not scaled.

---

## 5. Height contract {#height}

- Elevation blocks are full columns from z=0 to their level, with z unscaled.
  Their sprites are cropped tight to content, so each +4-level block is exactly
  4 px taller and its ground anchor sits exactly 4 px lower inside the crop; the
  anchor-to-sprite-bottom distance is constant (18 px) for every level. Drawing a
  level-h block with its anchor on the z=0 baseline puts its surface exactly
  h px above that baseline, which is where `gridToIso(..., elevation)` draws
  entities standing on the tile.
- `VOXEL_Z_PX = 1`; `data/terrain.json → elevation.runtimePixelsPerVoxelZ = 1`.
- Height hierarchy verified in test 4: infantry (≈23 voxels tall) < vehicles
  (≈18–23) < 1×1 posts (17–51 px sprites, guard tower tallest) < 2×2 facilities
  (43–62) < major compounds (70). Tallest model in the roster: **hq, 70 voxels**
  — comfortably inside the 128 ceiling.

---

## 6. Phase F — bake and validation

```
build   500 models, 1,678,654 voxels       (~26 s)
preview 500 preview PNGs                   (~2 s)
bake    17,880 strips, 26,708 frame cells  (379 s)
        82.11 MB PNG payload, 135 MB on disk
```

Bake gates that ran in **strict** mode (any failure aborts):

- no model outside the 128³ canvas;
- ground footprint aligned to 32-voxel tiles, overhang declared ≤ 1 tile;
- every facing produces a non-transparent strip, right ≠ left;
- every animation frame moves geometry by ≥ `MIN_CHANGED_PIXELS`
  (0 failures across units, buildings, terrain and the missile);
- manifest hashes written for every strip (`sha256`).

Bake fix found by the validation: 90° rotation was performed about the *voxel
corner* of the ground anchor, which drifted a model by one voxel per turn and
made cardinal facings 1 px inconsistent (visible as a 1 px seam between terrain
tiles drawn in different facings). Rotation now maps cell `(x,y)` to
`(ax+ay−1−y, ay−ax+x)`, the exact 90° rotation about the continuous footprint
centre. After the fix, symmetric terrain (`elevation-00…32`, `plains`, `road-*`,
`bridge-*`) is pixel-identical across all four cardinal facings, and the anchors
match exactly.

Manifest: `field-command-voxel-sheet-4`, grid `[128,128,128]`, tile `[64,32]`,
`tileUnits 32`, `tilesPerAxis 4`, `downscale 2`, `voxelZPx 1`. Metadata lives
under `entry.meta` (`kind, category, heightClass, footprint, gameplayFootprint,
visualFootprint, renderScale, bounds, groundAnchor`), so facing keys remain
exactly `right|up|left|down` (+ 4 diagonals for units). 17,880 strips referenced
by the manifest; **0 missing, 0 orphaned** files.

Test suite (`npm test`) — **27/27 passing**:

| file | tests | coverage |
| --- | --- | --- |
| `tests/elevation.test.js` | 15 | elevation semantics, legacy 64-grid compatibility, wall/gate fortifications, all 58 units × 5 armies, all 26 buildings + 6 fortifications × 5 armies, manifest paths and hashes, deterministic re-bake |
| `tests/scale.test.js` | 12 | 128³/32-unit contract, per-model metadata, bounds, scale hierarchy, resampling determinism and offsets, footprint catalogue, runtime placement, multi-tile rendering, terrain semantics, registry coverage, facing/anchor integrity, review deliverables |

---

## 7. Runtime integration

- **`src/iso.js`** — imports the generated `src/asset-scale.js`; new footprint
  API: `footprintOf`, `isMultiTileBuilding`, `footprintCells`,
  `footprintOrigin`, `footprintCenter`, `canPlaceFootprint`,
  `getBuildingRenderPosition`, `footprintDiamondPoints`, `cellKey`.
- **`src/iso-renderer.js`** — buildings are drawn once at the front-most
  footprint cell with the sprite anchor on the footprint centre; selection
  outlines the whole footprint; `placementPreview` tints every covered cell
  (green/red, dashed outline) and records `renderLog.placement`; procedural
  fallbacks scale with `renderScale`.
- **`src/map-editor.js`** — `buildingPlacementAt`, footprint-validating
  `placeBuilding` (clamps the anchor to the map, clears the entire replaced
  footprint, `force` override, `lastPlacementError`), `footprintAt`, and
  footprint-aware `inspectTile` (“Building: hq 3×3 tiles”).
- **`terrain-elevation-editor.html`** — uses `VOXEL_Z_PX`, `TILE_VOXELS` and
  `footprintOf`, shows the height offset per elevation block, the footprint hint
  chip, footprint details in the inspector, and live placement previews.
- Classic sprite-sheet rendering is untouched; the iso path is the only consumer
  of the new scale data. Gameplay-relevant decisions (footprints, validity,
  ownership) stay in shared modules, not in view code.

---

## 8. Deliverables

| artifact | path |
| --- | --- |
| Scale specification | `docs/SCALE_128.md` |
| Asset sizing matrix (500 rows) | `docs/ASSET_SIZING_MATRIX.md` |
| Review page (scene, lineups, before/after, all 500 previews, full matrix) | `docs/review/scale-review.html` |
| Mixed-scale scene (14×12 tiles, 2× zoom) | `docs/review/scale-scene.png` |
| Category lineups at true relative scale | `docs/review/scale-lineup.png` |
| Before/after comparison | `docs/review/before-after.png` |
| Regenerated model database | `data/voxels.json` (128 format) |
| Generated runtime scale table | `src/asset-scale.js` |
| Regenerated previews | `game_assets/voxels/*.png` (500) |
| Regenerated sheets + manifest | `game_assets/voxels/sheets/` (17,880 strips, `manifest.json`) |
| Offline browser catalogue | `voxel-sprite-review.html`, `assets-list.json`, `assets-list-full.json` |
| Pipeline | `tools/voxel_pipeline/{scale,bake,build,preview,review,png,sizing-matrix,sprite-index}.mjs`, `models/{units,terrain,buildings,buildings-small,buildings-large,building-army}.mjs` |
| Gates | `tests/{elevation,scale}.test.js` |
| This report | `docs/SCALE_MIGRATION_REPORT.md` |

Reproduce from scratch:

```bash
npm run voxels:all      # build (26 s) + previews (2 s) + strict bake (≈6.5 min)
npm run voxels:review   # review sheets + sizing matrix + browsers
npm test                # 27 gates
```

---

## 9. Blocked / not done, and why

No asset was skipped or omitted. The following are deliberate scope boundaries,
not silent gaps:

1. **Flat terrain surfaces remain vector-drawn.** `plains`, `river`, `sea`,
   `shoal` still use the runtime's procedural diamond/coast painter (animated
   shimmer, cliff lips) instead of voxel sprites. Their voxel models exist, are
   baked and validated, but switching the main renderer to sprite terrain would
   change the look of every map and was out of scope for a scale migration.
   Isolated behind the existing renderer paths; documented in the sizing matrix.
2. **Projectiles and blast particles stay renderer-side effects.** Only the
   `silo-missile` asset is a voxel model (recalculated and baked).
3. **Units remain single-cell for gameplay.** Sprite length can exceed a tile
   (battleship hull), but occupancy, pathing and collision stay 1 cell exactly
   as before — changing unit footprint rules would be a gameplay change, and
   this migration preserves multiplayer-authoritative behaviour.
4. **Legacy 64-grid compatibility code is retained.** The old 64-based helpers
   and their tests still pass; removal was explicitly deferred until the tests
   show it is safe. All new code paths are opt-in via the scale table.
5. **No browser/GPU performance benchmark.** The review renderer and the
   canvas editor were validated headlessly (render logs, anchors, placement),
   and the editor module parses and runs; frame-time measurement in a real
   browser was not possible in this environment.
6. **`voxel-sprite-review-improved.html`** is a legacy hand-built page and was
   left as-is; the regenerated `voxel-sprite-review.html` and
   `docs/review/scale-review.html` are the current review tools.

---

## 10. Numbers at a glance

| metric | value |
| --- | --- |
| Assets inventoried | 500 models (58 unit types, 26 building types, 79 terrain, 1 effect) |
| Faction variants regenerated | 336 (232 unit + 104 building) |
| Buildings re-authored | 130 models / 26 types, 85 multi-tile ids |
| Major compounds remodelled | 3 types (hq, airport, port) = 15 models |
| Voxels regenerated | 1,678,654 |
| Previews regenerated | 500 |
| Baked strips | 17,880 (26,708 frame cells, 82.11 MB) |
| Runtime files integrated | 3 modules + editor page + generated scale table |
| Automated gates | 27 passing (15 elevation + 12 scale) |
| Animation motion failures | 0 |
| Blocker assets | 0 |
