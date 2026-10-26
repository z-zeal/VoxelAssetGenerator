# Voxel Asset Generation Bundle

This bundle contains the voxel pipeline and existing sprite output extracted from `advance-wars-main`, plus an offline HTML reviewer and the revised prompt for an AI coding agent.

## What is included

- `tools/voxel_pipeline/`: source model builders, preview renderer, and sprite-sheet baker.
- `data/voxels.json`: the current **128×128×128** voxel model database (one 32-unit tile per map cell, 4×4 tiles per canvas).
- `data/animation.json`, `data/units.json`, and `data/armies.json`: supporting source data.
- `src/armies.js`: source dependency imported by the model builder.
- `game_assets/voxels/`: existing rendered previews, baked sheets, and the sheet manifest.
- `docs/`: scale specification (`SCALE_128.md`), generated asset sizing matrix, visual review sheets, and the earlier inventory/reports.
- `voxel-sprite-review.html`: offline browser gallery. Open it directly in a browser after extraction.
- `PROMPT_build_voxel_asset_generation_system.md`: the agent prompt for implementing the requested natural-language-to-voxel-asset workflow.

## Existing pipeline commands

Requires Node.js with ES module support. From this folder:

- `npm run voxels:build` — regenerate `data/voxels.json` from source model definitions.
- `npm run voxels:preview` — render static model previews into `game_assets/voxels/`.
- `npm run voxels:bake` — regenerate baked facing/variant/frame sprite strips and their manifest.
- `npm run voxels:all` — run all three steps in sequence.
- `npm run voxels:review` — regenerate the review sheets (`docs/review/*.png`), the sizing matrix and the review pages.
- `npm test` — elevation, scale, manifest, animation, sprite-crispness and runtime integration gates (29 tests).

The 2026 scale migration (128³ canvas, 32-unit tiles, multi-tile footprints) is
specified in `docs/SCALE_128.md`; per-asset sizes are listed in
`docs/ASSET_SIZING_MATRIX.md` and reviewed in `docs/review/scale-review.html`.

One map tile is a **128 × 64 px** isometric diamond over 32 voxels, i.e. **4 px
per voxel horizontally and 2 px vertically** — the diamond grew with the voxel
budget so 1×1 assets stay crisp instead of being squeezed into 2×1 px per voxel.
Units are sized by role (1 / 1.25 / 1.5 / 1.75 / 2 tiles) rather than all being
1×1; see the *Unit size classes* table in the sizing matrix.

The ZIP includes a minimal `package.json` for these commands. Re-baking can take time; preserve a backup of the original assets if you intend to compare outputs.

## Important status note

This is a **source-and-assets starter bundle**, not the fully implemented natural-language voxel asset-generation agent/studio. The included prompt asks a coding agent to implement that system using the bundled pipeline. The HTML page is a working local reviewer for the sprites already included here; it does not itself generate new voxel models.

## Folder conventions

- Preserve original filenames, asset ids and manifest fields (scale metadata lives under each model entry's `meta`).
- Treat `data/voxels.json` and `tools/voxel_pipeline/models/` as the core model source/output path used by this project.
- Newly generated custom assets should be separated from built-in model sources and should not overwrite the current roster unless explicitly requested.
- Do not commit `node_modules`, caches, temporary render output, or unrelated game files to a derived package.
