# Voxel Asset Generation Bundle

This bundle contains the voxel pipeline and existing sprite output extracted from `advance-wars-main`, plus an offline HTML reviewer and the revised prompt for an AI coding agent.

## What is included

- `tools/voxel_pipeline/`: source model builders, preview renderer, and sprite-sheet baker.
- `data/voxels.json`: the current 64×64×64 voxel model database.
- `data/animation.json`, `data/units.json`, and `data/armies.json`: supporting source data.
- `src/armies.js`: source dependency imported by the model builder.
- `game_assets/voxels/`: existing rendered previews, baked sheets, and the sheet manifest.
- `docs/`: original voxel inventory, completion report, and graphics/animation plan.
- `voxel-sprite-review.html`: offline browser gallery. Open it directly in a browser after extraction.
- `PROMPT_build_voxel_asset_generation_system.md`: the agent prompt for implementing the requested natural-language-to-voxel-asset workflow.

## Existing pipeline commands

Requires Node.js with ES module support. From this folder:

- `npm run voxels:build` — regenerate `data/voxels.json` from source model definitions.
- `npm run voxels:preview` — render static model previews into `game_assets/voxels/`.
- `npm run voxels:bake` — regenerate baked facing/variant/frame sprite strips and their manifest.
- `npm run voxels:all` — run all three steps in sequence.

The ZIP includes a minimal `package.json` for these commands. Re-baking can take time; preserve a backup of the original assets if you intend to compare outputs.

## Important status note

This is a **source-and-assets starter bundle**, not the fully implemented natural-language voxel asset-generation agent/studio. The included prompt asks a coding agent to implement that system using the bundled pipeline. The HTML page is a working local reviewer for the sprites already included here; it does not itself generate new voxel models.

## 512³-native rebuild (in progress)

The next asset generation runs on a **512×512×512 native voxel lattice** — geometry is authored at that
resolution, never scaled up from the 64³ models. Units bake **16 directions**, buildings keep **4**, every
asset is split into **segmented parts** (turret / barrel / rotor / legs …), and every sprite is emitted as an
**albedo + normal + material** trio, one folder per asset.

- Plan: `docs/PLAN_512_native_16dir_segmented_pipeline.md`
- Batch checklist: `docs/CHECKLIST_512_native_rebuild.md`
- Pipeline: `tools/voxel_pipeline/v3/` (`bake.mjs`, `scribe.mjs`, `raster.mjs`, `materials.mjs`, `models/`)
- Output contract: `game_assets/[units|buildings]/<asset>/{manifest.json,preview.png,sheets/}`
  plus `game_assets/voxel-index.json`
- Review gallery: `npm run voxels3:review` → http://localhost:8099/voxel-sprite-review-v4.html
  - The gallery's live view composites `game_assets/**/sheets-hi/` (4× review sheets). If an asset has
    none, it falls back to the runtime sheets and says so in the HUD. Re-bake them with
    `npm run voxels3:sheets:hi` (`bake.mjs --sheet-k 4`); `--sheet-k 0` skips them.
  (live virtual-light rig over the baked normal + material maps, per-part toggles, turret rotation)

Status: pipeline skeleton written, pilot asset over the voxel budget — see batch **B1** in the checklist.
The 64³ pipeline below still owns the shipped sheets until the v4 runtime lands.

## Folder conventions

- Preserve original filenames and manifest fields.
- Treat `data/voxels.json` and `tools/voxel_pipeline/models/` as the core model source/output path used by this project.
- Newly generated custom assets should be separated from built-in model sources and should not overwrite the current roster unless explicitly requested.
- Do not commit `node_modules`, caches, temporary render output, or unrelated game files to a derived package.
