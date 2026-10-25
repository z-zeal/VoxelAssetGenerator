# Isometric Terrain Elevation System (`0..32` Voxel Z Units)

## 1. Overview & Height Unit Semantics

The Field Command isometric engine models terrain, buildings, and units on a **64×64×64 voxel grid** (`tools/voxel_pipeline/build.mjs`, `tools/voxel_pipeline/bake.mjs`) whose horizontal ground footprint projects to a **64×32 runtime isometric diamond** (`TILE_W = 64`, `TILE_H = 32`, `HALF_W = 32`, `HALF_H = 16`).

Elevation is defined in **voxel Z-axis height units** (not screen pixels or image dimensions):

| Voxel Z Level | Model ID | Voxel Top Layer (`z`) | Runtime Screen Y Offset (`-H * 0.5 px`) | Preview Screen Y Offset (`DS = 2`) | Baked Sheet Size (`w × h`) | Baked Anchor (`anchorX, anchorY`) |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| `0` | `elevation-00` | `0..1` | `0 px` | `0 px` | `65 × 34` | `(32, 17)` |
| `4` | `elevation-04` | `4..5` | `-2 px` | `-4 px` | `65 × 36` | `(32, 19)` |
| `8` | `elevation-08` | `8..9` | `-4 px` | `-8 px` | `65 × 38` | `(32, 21)` |
| `12` | `elevation-12` | `12..13` | `-6 px` | `-12 px` | `65 × 40` | `(32, 23)` |
| `16` | `elevation-16` | `16..17` | `-8 px` | `-16 px` | `65 × 42` | `(32, 25)` |
| `20` | `elevation-20` | `20..21` | `-10 px` | `-20 px` | `65 × 44` | `(32, 27)` |
| `24` | `elevation-24` | `24..25` | `-12 px` | `-24 px` | `65 × 46` | `(32, 29)` |
| `28` | `elevation-28` | `28..29` | `-14 px` | `-28 px` | `65 × 48` | `(32, 31)` |
| `32` | `elevation-32` | `32..33` | `-16 px` | `-32 px` | `65 × 50` | `(32, 33)` |

- **Complete 4-Unit Progression**: `ELEVATION_LEVELS = [0, 4, 8, 12, 16, 20, 24, 28, 32]`.
- **Zero Lateral Drift**: `anchorX` remains `32` across all nine levels; raising a tile shifts its top surface strictly along `-Y` (`screenY = baseY - H * 0.5 * zoom`).

---

## 2. Voxel Asset Generation Pipeline

- **Editable Voxel Source**: `tools/voxel_pipeline/models/terrain.mjs` (`id.startsWith('elevation-')`) and `tools/voxel_pipeline/build.mjs` (`ELEVATION_LEVELS`, `ELEVATION_MODELS` registered in `TERRAIN_MODELS`).
- **Visual Design**:
  - **Top Surface (`z = H .. H + 1`)**: Uses the exact `plains` grassland palette (`#6e9049`, `#7ba358`, `#8fb86a`, `#5e7d3b`, `#a0c27a`, `#7a9e58`, `#b5d48c`) across the full `64×64` footprint so elevated terrain matches baseline ground at `H = 0` and joins seamlessly with adjacent equal-height tiles.
  - **Stratified Cliff Faces (`z = 0 .. H - 1`)**: Sculpted in 4-voxel geological strata (`#7a6a5a`, `#8a7a6a`, `#6b5d4f`, `#9e9082`) separated by dark horizontal shale seams (`#5a4a3a` / `#3e2a1d`) at every 4-voxel boundary (`z % 4 === 0`), staggered vertical rock fissure joints (`#52453a`), and a sub-turf loam/root overhang (`#6b5a3a`, `#7a6548`, `#5e7d3b`) directly beneath the grass rim.
  - **Directional Shading**: Rendered through `bake.mjs` (`buildVariantLut`), applying `1.00×` brightness to the top diamond, `0.72×` shade to the South-West (`LEFT` / `south`) cliff face, and `0.86×` mid-lighting to the South-East (`RIGHT` / `east`) cliff face.
- **Generated Outputs**:
  - Canonical voxel geometry: `data/voxels.json` (`elevation-00` .. `elevation-32`).
  - Static inspection previews: `game_assets/voxels/elevation-00.png` .. `game_assets/voxels/elevation-32.png` plus the side-by-side baseline comparison sheet `game_assets/voxels/elevation-comparison.png`.
  - Baked 4-facing neutral sprite strips: `game_assets/voxels/sheets/elevation-{00..32}-{right,up,left,down}-n.png` (36 PNG strips) and `game_assets/voxels/sheets/manifest.json`.
- **Pipeline Rebuild Commands**:
  ```bash
  npm run voxels:build
  node tools/voxel_pipeline/preview.mjs --only elevation-00,elevation-04,elevation-08,elevation-12,elevation-16,elevation-20,elevation-24,elevation-28,elevation-32
  node tools/voxel_pipeline/bake.mjs --only elevation-00,elevation-04,elevation-08,elevation-12,elevation-16,elevation-20,elevation-24,elevation-28,elevation-32
  ```

---

## 3. Neighbour-Aware Cliff & Transition Rendering

Implemented in `src/iso.js` (`computeTileElevationFaces`, `computeMapElevationMesh`) and `src/iso-renderer.js` (`drawTileExposedCliffs`, `drawTileTopSurface`, `renderIso`).

For each tile `(x, y)` at height `H` and each cardinal neighbour `N` (`north` `(x, y-1)`, `east` `(x+1, y)`, `south` `(x, y+1)`, `west` `(x-1, y)`):

1. **Equal Height (`H === N`)**:
   - `exposed = false`, `diff = 0`, `owner = null`.
   - No vertical cliff or internal edge border is drawn between the two tiles; their elevated top diamonds join edge-to-edge as a continuous plateau.
2. **Higher than Neighbour (`H > N`)**:
   - `exposed = true`, `diff = H - N`, `topZ = H`, `bottomZ = N`, `owner = 'self'`.
   - Renders a visible side wall strictly for the exposed vertical difference `H - N` (`(H - N) * 0.5 * zoom` runtime pixels tall), stratified in 4-unit rock layers from `z = H` down to `z = N`.
3. **Lower than Neighbour (`H < N`)**:
   - `exposed = false`, `diff = 0`, `owner = 'neighbor'`.
   - The higher neighbour owns the shared edge; the lower tile never draws a duplicate wall.
4. **Map Boundaries & Corners**:
   - Out-of-bounds neighbours default to baseline height `0` (`isBoundary = true`), exposing the full `H` drop strictly within the tile's `[cx - 32, cx + 32]` horizontal footprint.
   - Where `south` and `east` cliff faces meet at the front-bottom vertex `(cx, topCy + 16)`, the shared vertical corner ridge is drawn strictly from `z = H` down to `z = max(N_south, N_east)`, preventing gaps or overdraw across multi-height corners.
5. **Height-0 Baseline & Coastline Preservation**:
   - At `H = 0`, tiles have `elevOffset = 0` and `0` exposed cliffs, preserving flat vector rendering, `src/coast.js` shoreline blending (`shoalLandMask`, `shoalSiblingMask`, `shoreSides`, `sandPolygon`), and animated water shimmer (`drawWaterShimmer`).

---

## 4. Map Data Schema & Backward Compatibility

Implemented in `src/iso.js` (`createMap`, `loadMapData`, `serializeMapData`, `exportMapJson`, `importMapJson`, `validateElevation`) and `data/terrain.json`:

- **Orthogonal Elevation Layer**: `map.elevation` is stored as a 2D per-tile grid (`elevation[y][x]`) completely separate from `map.terrain` (terrain IDs such as `'plains'`, `'road'`, `'sea'`), `map.properties` (building ownership), `map.units` (unit occupancy), and `map.fog` (Fog of War).
- **Backward Compatibility**: Maps that omit `elevation` load cleanly with every tile initialized to `0` without errors or visual changes.
- **Explicit Validation**: `validateElevation` accepts only `0, 4, 8, 12, 16, 20, 24, 28, 32` and throws a `RangeError` on out-of-range or malformed values so invalid input never silently corrupts map state.

---

## 5. Units, Buildings, Picking & Depth Sorting

- **Elevated Anchoring (`getEntityRenderPosition`)**:
  - Units (8 directional facings), buildings (4 cardinal facings), unit ground shadows, and selection reticles are positioned at `(baseX, baseY - H * 0.5 * zoom)`.
- **Depth Sorting (`compareIsoDepth`)**:
  - Scene rendering orders cells back-to-front by `(x + y, y, x, layerOrder)` so cliff faces, elevated top surfaces, terrain props, buildings, shadows, and units occlude one another accurately.
- **Tile Picking (`isoToGrid`)**:
  - Tests candidate tiles in reverse painter order (front-to-back) against each tile's elevated top diamond (`pointInDiamond`) and exposed front cliff faces (`pointInTileCliff`), keeping click/touch selection aligned with raised terrain.

---

## 6. Map Editor Workflow

Implemented in `src/map-editor.js` (`MapElevationEditor`) and `terrain-elevation-editor.html`:

- **Height Brush Selector**: Direct buttons and progression gallery cards for `0, 4, 8, 12, 16, 20, 24, 28, 32`, plus `+4 Step`, `-4 Step`, `Return Tile to 0`, and `Reset Map to 0`.
- **Orthogonal Terrain Palette**: Single terrain selector (`plains`, `tallgrass`, `road`, `bridge`, `river`, `sea`, `shoal`, `reef`, `tree`, `hill`, `mountain`, `snow-tile`, `cracked-dry-ground`, `marsh`, `rubble`, `silo`, `volcano`, `secret-lab`, `wall`, `wall-gate`) without duplicating terrain types per height.
- **Undo / Redo & Inspector**: Full stroke undo/redo stack (`Ctrl+Z` / `Ctrl+Y`), JSON export/import, and live tile inspection showing `(x, y)`, terrain ID, height `H`, `elevation-XX` model ID, and N/E/S/W cliff differentials.
- **Preset Inspection Scenes**: Built-in presets for `Showcase Battlefield`, `Flat Ground (0)`, `Single Raised Tile (16)`, `Wide Plateau (20)`, `9-Level Staircase (0..32)`, `Equal-Height Neighbours`, `Steep 0→32 Cliff`, and `Mixed-Height Corners`.

---

## 7. Known Limitations & Future Gameplay Extension Points

- **Gameplay Scope**: By design, elevation currently affects physical 3D/isometric representation, anchoring, and editor authoring without altering movement costs, defense stars, vision range, or weapon range (`data/terrain.json`).
- **Extension Points**:
  - **Movement Step Cost / Cliff Blocking**: Pathfinding can query `computeTileElevationFaces(map, x, y).edges[dir].diff` to block ground vehicles when `Math.abs(H - N) > 4` while allowing infantry/mech on `diff <= 8` and air units at any `diff`.
  - **High-Ground Combat & Vision Bonus**: Combat and Fog of War evaluators can read `getTileElevation(map, attacker.x, attacker.y) - getTileElevation(map, defender.x, defender.y)` to grant high-ground direct/indirect range or defense modifiers.

---

## 8. Validation & Test Report

| Command Executed | Result | Details |
| :--- | :---: | :--- |
| `npm run voxels:build` | **PASS** | Wrote `380` voxel models (`5,360,376` voxels, `329` colours) including `elevation-00`..`elevation-32` to `data/voxels.json` |
| `node tools/voxel_pipeline/preview.mjs --only elevation-00,...,elevation-32` | **PASS** | Rendered 9 static elevation previews (`game_assets/voxels/elevation-00.png`..`elevation-32.png`) + `elevation-comparison.png` |
| `node tools/voxel_pipeline/bake.mjs --only elevation-00,...,elevation-32` | **PASS** | Exported 36 new elevation sheets (`14,904` total baked strips across `380` models in `manifest.json`) |
| `npm test` (`node --test tests/elevation.test.js`) | **PASS (12/12)** | Verified all 9 levels, legacy height-0 loading, save/load round-trips, invalid height rejection, equal-height seamless joins, `H - N` cliff height math, single-owner shared edges, boundary/corner bounds, elevated unit/building anchors & picking, terrain/fog preservation, height-0 coast/shimmer parity, and deterministic asset rebuilds |
| Visual Inspection of Previews & 7 Rendered Map Scenarios | **PASS** | Inspected `elevation-00.png`..`elevation-32.png`, `elevation-comparison.png`, and rendered scenes for `flat`, `single-raised`, `plateau`, `staircase`, `equal-neighbors`, `steep-cliff`, and `mixed-corners` |
