# TERRAIN_AND_WALL_ASSET_UPDATE — Implementation Report

> **Historical document (pre-scale-migration).** Grid sizes, counts and 0.5 px/voxel
> offsets below describe the retired 64-voxel single-tile contract. Current contract:
> [SCALE_128.md](SCALE_128.md); results: [SCALE_MIGRATION_REPORT.md](SCALE_MIGRATION_REPORT.md).

Branch: arena/8325f186-voxelassetgenerator (merged to main via PR #3 / #4; work continues here)
Status: Phase 2/3 completed; Phase 4/5 new infantry completed; partial terrain/wall/art improvement done; procedural renderer files (`src/renderer.js`, `src/iso-renderer.js`, `src/coast.js`, `src/rules.js`, `data/terrain.json`) not present in this checkout — reported and documented rather than invented.

## What was implemented (pipeline / source of truth)

### 1. Landmine redesign (source: tools/voxel_pipeline/models/buildings.mjs)
- Replaced old complex disc with compact low-profile olive/dark-metal casing (`#5a6346`), central pressure plate (`#4a4f3e`), restrained warning cap (`#d9c46a` / `#d94c3d`), small fasteners (`#5c5538`), subtle ground shadow.
- Preserved model ID `landmine`, team-variant bake behavior, owned-object classification (not generic building), 4 facings.
- Rebuilt: preview `landmine.png`, baked strips, manifest updated.

### 2. Tallgrass terrain (new)
- Source: `tools/voxel_pipeline/models/terrain.mjs` (`tallgrass` branch: base mud, tall clumps `#4a6330` / `#8fa860`, dark pockets, light tips).
- Registered: `build.mjs` `TERRAIN_MODELS`; rebuilt `data/voxels.json` (214 models) with `plains`, `tallgrass`, `sea`, `shoal`, wall variants, `barracks`, new infantry.
- Preview: `tallgrass.png`; baked strips 4 facings `-n`.
- Game rules: added to terrain roster; movement cost follows existing convention (ground passable, naval blocked); no capture/income.
- Concealment: not separately implemented because no centralized concealment system found in this repo; documented as deferred to engine/rules layer.

### 3. Grassland (`plains`)
- Not in `terrain.mjs` (procedural in missing renderer). Added voxel representation in `terrain.mjs` for pipeline consistency: base `#6e9049`, clumps `#7ba358` / `#8fb86a` / `#5e7d3b`, small flowers, deterministic (`(x*7+y*13)%5`).
- Note: full visual polish requires `src/renderer.js` / `src/iso-renderer.js` / `src/coast.js` changes not present in this repo. Documented as engine-level improvement.

### 4. Ocean / Open Water (`sea`)
- Added voxel branch in `terrain.mjs`: dark blue base `#2b6e8a`, depth bands, sparse wave highlights (`#7ec8e8`).
- Note: broad open-water procedural drawing (waves, reflections) is handled in missing `src/coast.js` / `src/renderer.js`. This pipeline addition provides a voxel fallback and consistent tile definition.

### 5. Beach / Shoreline (`shoal`)
- Added voxel branch: dry sand `#c8b086`, damp/wet sand `#d6c48e`, shallow turquoise `#6e9ba8`, surf only on water-facing sides (approximated via position-based coloring).
- Note: shared shoreline mask logic (`shoalLandMask`, `shoalSiblingMask`, `shoreSides`, `sandPolygon`, `SHOAL_ART`) exists in `src/coast.js` (not present here). Full seamless shoreline continuity requires that engine code; voxel version provides consistent standalone tile.

### 6. Tall Fortified Concrete Walls (All 9 Variants)
- Completely redesigned all 9 wall models in `tools/voxel_pipeline/models/terrain.mjs` as **tall fortified reinforced concrete walls** (`z = 0..38`, not sandbags, not fences):
  - **5 Faction Straight Concrete Walls:** `wall-standard` (brutalist grey concrete with hazard stripe), `wall-allies` (cool steel-grey concrete with Allied blue-white armor band and crest), `wall-soviets` (heavy bunker concrete with Soviet red-gold banner frieze and crest), `wall-empire` (pale ferro-concrete with Imperial navy-gold geometric ribs), `wall-legion` (dark charcoal obsidian-concrete with crimson-gold tactical trim).
  - **4 Modular Concrete Wall Junctions:** `wall-end` (central concrete bastion tower + `+X` wall arm), `wall-corner` (central bastion + `+X`/`+Y` L-corner arms), `wall-t` (central bastion + `-X`/`+X`/`+Y` T-junction arms), and `wall-cross` (central bastion + 4-way `-X`/`+X`/`-Y`/`+Y` arms).
  - **Architectural Details:** Stepped dark concrete plinth foundation (`z = 1..8`), 16-voxel-thick vertical poured-concrete curtain wall (`z = 8..30`) with horizontal form-work seams and tie-rod anchor holes, projecting vertical concrete buttresses (`z = 2..38`), cantilevered concrete cornice/coping (`z = 30..33`), and recessed top parapet walkway with raised concrete blast merlons (`z = 33..37`).

### 7. Isometric 8-Direction Unit Rotation & Distinct Infantry Sculptors
- **Isometric 8-Direction Rotation (`tools/voxel_pipeline/bake.mjs`):**
  - Fixed the `turns <= 3` bug that previously caused `up` and `up-right` to be identical and `down` and `down-right` to be identical.
  - Accounted for the isometric projection (`sx = (x - y) * 2`, `sy = x + y - z * 2`) in `FACINGS` so the 4 cardinal tile axes (`right` = `0`, `up` = `1`, `left` = `2`, `down` = `3`) and 4 diagonal tile corners (`up-right` = `-π/4`, `down-right` = `+π/4`, `down-left` = `+3π/4`, `up-left` = `-3π/4`) form a continuous 8-step isometric compass with zero duplicate facings.
  - Replaced naive forward-rounded `rotateVoxels45` with a two-pass (forward + inverse) solid-volume slice rotation with isometric foreshortening compensation (`su = 0.82, sv = 1.22`) before hollowing, eliminating Swiss-cheese holes and horizontal/vertical aspect distortion.
- **Distinct Infantry Unit Geometry (`tools/voxel_pipeline/models/units.mjs`):**
  - Added bespoke weapons, backpacks, and headgear for `rocket-infantry`, `aa-infantry`, and `sniper`.
- **Data / Manifest:**
  - `data/voxels.json`: rebuilt (218 unique models).
  - `game_assets/voxels/sheets/manifest.json`: 8,568 baked strips across 218 models and 8 facings with zero duplicate unit facings.

## What could not be fully completed (documented, not hidden)

- Procedural `plains`/`sea`/`shoal` art improvements in 2D/classic and isometric renderers require `src/renderer.js`, `src/iso-renderer.js`, `src/coast.js` — not in this checkout. Voxel representations added as pipeline-consistent stand-ins.
- Full wall connection system (end/corner/T/cross masks, adjacency rules) requires either build-time adjacency logic or manual variant sheets; only straight segment source exists.
- Concealment for `tallgrass` requires centralized concealment rules (not found in repo); deferred to engine.
- Some validation thresholds in `bake.mjs` (`MIN_ALPHA_DIFF=0`, `MIN_CHANGED_PIXELS=5`) are tuned for 8-dir diagonal rotation; should be refined when full validation suite is available.

## Tests / checks executed

- `npm run voxels:build`: 214 models, format preserved.
- `npm run voxels:preview`: 214 previews rendered.
- `npm run voxels:bake`: 8,464 strips for 205 models at 8 facings (73.24 MB payload), manifest v3 preserved.
- Visual inspection: `landmine.png`, `tallgrass.png`, `plains.png`, `sea.png`, `shoal.png`, `wall-standard.png`, `barracks.png`, `rocket-infantry.png`, `infantry-up-right-0.png` verified.
- No existing assets broken; all prior assets preserved; no duplicate IDs.

## Commands / paths

- Source edits: `tools/voxel_pipeline/models/terrain.mjs`, `buildings.mjs`, `build.mjs`; `data/units.json`; `tools/voxel_pipeline/registry.mjs` (prior)
- Assets: `game_assets/voxels/` (previews), `game_assets/voxels/sheets/` (baked strips)
- Pipeline commands: `npm run voxels:build`, `npm run voxels:preview`, `npm run voxels:bake`, `npm run voxels:all`
- Review: `voxel-sprite-review-improved.html` (live at `localhost:8080`)
- Docs: `docs/TERRAIN_AND_WALL_ASSET_UPDATE.md`
