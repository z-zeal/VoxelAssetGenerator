# Agent Asset Production Workflow (VoxelAssetGenerator)

> **Historical document (pre-scale-migration).** Grid sizes, counts and 0.5 px/voxel
> offsets below describe the retired 64-voxel single-tile contract. Current contract:
> [SCALE_128.md](SCALE_128.md); results: [SCALE_MIGRATION_REPORT.md](SCALE_MIGRATION_REPORT.md).

This document defines the repeatable agent-driven workflow for producing voxel assets in this repository. It is specific to the `field-command-voxel-64x64x64` pipeline and should not be replaced with manual sculpting or generic voxel-editor instructions.

## 1. Receive the brief
The user describes assets in natural language: category (unit / building / terrain / effect), appearance, distinguishing features, required facings (right, up, left, down), animation needs (idle / move / attack / death clip frames), and variant rules (team/neutral). The brief may contain multiple assets.

Assumption rule: if details are missing (e.g., exact animation frame count, team-variant need), make a reasonable assumption consistent with existing neighbors, document it in this file or the commit message, and proceed rather than blocking on unnecessary questions.

## 2. Plan the assets
Extract for each asset:
- Stable ID (must match data/units.json for units, BUILDINGS/TERRAIN_MODELS for buildings/terrain, MODEL_POSES for effects)
- Category and kind (`unit` / `building` / `terrain` / `effect`)
- Required facings (default: `right` `up` `left` `down`; terrain is usually static `idle` only)
- Animation clips (from `data/animation.json` family + `MODEL_POSES`) and pose frame counts
- Variant rules (units get 4 army skins + standard; buildings get team variants via bake; terrain gets neutral only)
- Distinguishing visual features (palette, silhouette, proportion relative to 64×64 footprint)

## 3. Inspect existing art
Search current outputs for references:
- `game_assets/voxels/` — individual model previews (frame 0, `right` facing)
- `game_assets/voxels/sheets/` — baked directional strips per facing/variant/frame
- `game_assets/voxels/sheets/manifest.json` — sheet metadata (`field-command-voxel-sheet-3`, `gridSize` [64,64,64], facings list, teamVariants, frame anchors)
- `tools/voxel_pipeline/models/terrain.mjs`, `buildings.mjs`, `units.mjs` — source geometry conventions (primitives: `box`, `cylZ`, `put`; group/pivot for moving parts; hollowing for final voxel lists)
- `data/voxels.json` — canonical voxel lists and palette to verify colors and scale

Reuse the project's proportions, lighting (lit top / shaded left / mid-lit right), outline/readability, palette behavior, and isometric presentation. Do not duplicate an existing model under a new name.

## 4. Author source geometry
Implement in the appropriate source module using existing sculpting conventions:
- `tools/voxel_pipeline/models/terrain.mjs` for terrain props (`terrainVoxels(c, id, pose)`)
- `tools/voxel_pipeline/models/buildings.mjs` for buildings (`buildingVoxels(c, id, pose)`)
- `tools/voxel_pipeline/models/units.mjs` for units (`unitVoxels(c, id, pose)`)
- New model modules must be imported by `build.mjs` and registered in the rosters below.

Use the canvas primitives from `build.mjs` (`box`, `cylZ`, `put`, `pivot`, `group`). Keep geometry within 64³; frames start at rest (frame 0 = canonical `voxels`). Apply mechanical pose transforms via `poseOpsFor` only when animation clips require moving parts (turrets, legs, rotors).

## 5. Register the model
Every new asset must touch **all** of these points or it will be skipped by the pipeline:

### For terrain props
- `tools/voxel_pipeline/build.mjs`: add ID to `TERRAIN_MODELS` array (line ~87)
- `tools/voxel_pipeline/models/terrain.mjs`: add `else if (id === 'new-id') { ... }` block inside `terrainVoxels`
- `data/animation.json` / `MODEL_POSES`: only if the prop has animation clips (most terrain is static `idle: 1`; if animated, add to `MODEL_POSES` and `animation.json` and run `node tools/validate-animation.mjs` when it exists)

### For buildings
- `tools/voxel_pipeline/build.mjs`: add to `BUILDINGS` array (line ~83) and `BUILDING_IDLE`
- `tools/voxel_pipeline/models/buildings.mjs`: implement `buildingVoxels` branch
- `data/animation.json`: idle/clip metadata if mechanical parts (rotors, exhaust)
- `data/units.json`: only if the building is an owned structure that needs a unit entry (not required for props)

### For units
- `data/units.json`: add entry with stats, weapon, family, etc.
- `data/animation.json`: add family clip metadata (idle / move / attack / death frames)
- `tools/voxel_pipeline/build.mjs`: `UNIT_FAMILY`, `UNIT_WEAPON`, `MODEL_POSES` must include entry; `modelRoster` pulls from `unitsJson` automatically
- `tools/voxel_pipeline/models/units.mjs`: implement `unitVoxels`
- `src/armies.js`: ensure `ARMY_IDS` covers required teams (already defines `standard`, `allies`, `empire`, `legion`, `soviets`)

### Registration helper (new)
`tools/voxel_pipeline/registry.mjs` (created in this session) documents all registration points and exports `registerTerrain`, `registerBuilding`, `registerUnit` helpers that verify the required files contain the ID. Use it to confirm nothing was forgotten.

## 6. Build and bake
Run in order; do not skip steps:
```bash
npm run voxels:build    # canonical voxel data → data/voxels.json
npm run voxels:preview   # individual PNGs → game_assets/voxels/
npm run voxels:bake     # directional strips + manifest → game_assets/voxels/sheets/
npm run voxels:all      # combined
```
Confirm commands against `package.json` (Node 22 ES-module target; `build.mjs` reads `data/units.json`; `bake.mjs` writes `manifest.json` with `field-command-voxel-sheet-3`).

After new assets are added, the bake count will increase; do not hardcode old counts. Confirm from `manifest.json` `models` keys and from the actual output file list (`ls game_assets/voxels/sheets/`).

## 7. Review the images
Open `voxel-sprite-review.html` (offline, relative paths) or inspect `game_assets/voxels/{id}.png` and `game_assets/voxels/sheets/{id}--{facing}-{frame}.png` directly.

Check every new asset for:
- Silhouette and orientation (matches `right` facing convention; isometric diamond orientation)
- Proportions relative to 32×32 tile (footprints should stay near 64×32 diamond)
- Palette consistency (no accidental bright colors outside the established earth/stone/metal family unless the brief requires it)
- Transparency / clipping (no missing voxels at edges, no overdraw past the footprint)
- Grounding (terrain props sit at z=0 with a base layer; buildings have floor plates)
- Readability at actual tile scale
- Consistency with nearby assets (compare to `mountain.png`, `hill.png`, `reef.png`, `road-*.png`)

If defects are found (misorientation, clipping, noise, wrong scale, missing animation frames), edit source geometry and rebuild from step 6. Do not finish with known defects.

## 8. Iterate
Correct source geometry and rerun. Common fixes:
- Adjust `c.box` / `c.cylZ` ranges for correct footprint
- Add base layer (`c.box(0,0,0,64,64,1,color)`) for terrain if missing
- Fix color values to match palette (use hex strings from existing terrain, not arbitrary RGB)
- Ensure `hollow()` survives correctly (visible surfaces survive; hidden interior voxels are removed before baking)
- For animations, verify `poseOpsFor` transforms match the mechanical part (group names must match those defined in `build.mjs` / `units.mjs`)

## 9. Validate and report
Run structural checks:
- `node tools/voxel_pipeline/build.mjs` runs without error and reports model count
- `node tools/voxel_pipeline/preview.mjs` writes expected PNG count (old + new)
- `node tools/voxel_pipeline/bake.mjs` writes manifest with `format: 'field-command-voxel-sheet-3'` and includes new model IDs
- Confirm `game_assets/voxels/sheets/manifest.json` has `facings: ["right","up","left","down"]` and `teamVariants` unchanged
- Confirm prior art unchanged unless redesign was requested (compare pixel counts if needed; rebuilt files for existing IDs should be bit-identical if source geometry unchanged — but after adding new assets, only new files change)
- Update inventory/catalog/docs: list new IDs, file paths, frame counts, and any assumption made
- Report exact generated IDs, output paths (`game_assets/voxels/{id}.png`, `game_assets/voxels/sheets/`), and any changes to pipeline files (registration points, docs)

## Registration points summary (checklist)
- [ ] Source geometry implemented (`models/*.mjs`)
- [ ] Roster updated (`build.mjs` arrays / `unitsJson` / `animation.json`)
- [ ] `data/voxels.json` rebuilt (contains new `models` key with `kind`, `size`, `clips`, `voxels`)
- [ ] Previews exist (`game_assets/voxels/*.png`)
- [ ] Baked strips exist (`game_assets/voxels/sheets/*.png` with facing/frame naming)
- [ ] Manifest updated (`game_assets/voxels/sheets/manifest.json` includes new entry with `right`/`up`/`left`/`down` and correct `anchorX`/`anchorY`/`cell`)
- [ ] `docs/AGENT_ASSET_WORKFLOW.md` updated if any new convention was added

## Key conventions preserved
- Four facings: `right`, `up`, `left`, `down`
- Team/neutral variants: `standard` (base name) + `allies`, `empire`, `legion`, `soviets` for units; buildings get 6 team variants (`0`..`5` + `n`) via bake; terrain is neutral (`standard` only, no team colors)
- Animation clips stored per action (`idle`, `move`, `attack`, `death`) with frame arrays; frame 0 = rest pose
- Palette behavior: colors are indexed in `data/voxels.json`; bake creates `lut` from palette; no external colors injected
- Format compatibility: `field-command-voxel-sheet-3`, `gridSize` [64,64,64], `tileSize` [64,32], `downscale` 4
