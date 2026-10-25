# Agent Asset Catalog — New Production (2026-10-25)

Assets produced in this session under the agent-driven workflow described in `docs/AGENT_ASSET_WORKFLOW.md`. Source geometry is the source of truth (not hand-drawn PNGs).

## Produced assets

| ID | Kind | Category | Source module | Frames (idle) | Facings baked | Variants | Preview path | Sheet paths |
|---|---|---|---|---|---|---|---|---|
| `snow-tile` | terrain | Frozen ground tile | `terrain.mjs` | 1 | right, up, left, down | `n` (neutral) | `game_assets/voxels/snow-tile.png` | `game_assets/voxels/sheets/snow-tile-{facing}-n.png` (4) |
| `cracked-dry-ground` | terrain | Cracked dry earth | `terrain.mjs` | 1 | right, up, left, down | `n` | `game_assets/voxels/cracked-dry-ground.png` | `game_assets/voxels/sheets/cracked-dry-ground-{facing}-n.png` (4) |
| `marsh` | terrain | Wetland / marsh | `terrain.mjs` | 1 | right, up, left, down | `n` | `game_assets/voxels/marsh.png` | `game_assets/voxels/sheets/marsh-{facing}-n.png` (4) |

## Pipeline state after production
- `data/voxels.json`: 189 models, format `field-command-voxel-64x64x64`, 209 colours (added ~34 new palette entries from terrain palettes)
- `game_assets/voxels/`: 189 preview PNGs (added 3)
- `game_assets/voxels/sheets/`: 3844 baked strips (added 12 = 3 new × 4 facings)
- `game_assets/voxels/sheets/manifest.json`: format `field-command-voxel-sheet-3`, facings preserved (`right`, `up`, `left`, `down`), `teamVariants` preserved ([`0`..`5`, `n`])

## Assumptions documented
- All three are static terrain props (`idle: 1`); no animation clips required.
- Neutral / standard only; no team-variant colors applied (terrain convention).
- Palette choices drawn from existing mountain snow (`#e8eef0`, `#a8b5bf`), dry earth (`#c49a72`, `#3e2a1d`), and marsh green (`#4a7a3a`, `#3b6e75`).
- Footprints are full 64×64 to match other terrain props (tree, hill, reef); no connector-vertex logic needed (that applies only to roads/bridges).
- Source geometry written in `terrain.mjs` using existing primitives (`box`, `put`, `cylZ` not needed for flat props); loops over 64² for surface variation are acceptable (~4k iterations per asset).

## Registration points verified
- `build.mjs`: `TERRAIN_MODELS` updated; `BUILDINGS`, `UNIT_ARMY_IDS`, `MODEL_POSES`, `UNIT_FAMILY`, `UNIT_WEAPON` untouched
- `terrain.mjs`: new `else if` branches added before the final `else` (road connector)
- `registry.mjs`: new module documents points; `registerTerrain` helper verifies checklist
- No changes to `data/units.json`, `data/animation.json`, `src/armies.js`, or existing model outputs

## Validation performed
- `npm run voxels:build` completed (189 models, no errors)
- `npm run voxels:preview` completed (189 previews, no errors)
- `npm run voxels:bake` completed (3844 strips, manifest v3 preserved, new entries present)
- Preview PNGs inspected visually for silhouette, orientation, palette, clipping; no major defects found
- Prior assets unchanged (count increase exactly matches new assets; no re-baked discrepancies for existing IDs)
