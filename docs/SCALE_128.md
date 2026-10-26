# SCALE 128 — world-scale contract

This document is the normative specification for the 2026 asset-scale migration.
The executable half of it lives in `tools/voxel_pipeline/scale.mjs`; the gates
that enforce it are `tests/scale.test.js` and `tests/elevation.test.js`.

> This was **not** a resolution bump. The old pipeline treated one 64×64×64
> voxel cube as a whole map tile, so every asset — a rifleman and an HQ alike —
> was exactly one tile wide and equally tall. The migration separates *tile
> size* (32 units), *authoring canvas* (128³), and *per-role size*, and adds
> real multi-tile compounds.

## 1. Constants

| quantity | value | notes |
| --- | --- | --- |
| model canvas | **128 × 128 × 128 voxels** | hard maximum for any model |
| ground tile | **32 × 32 voxels** | one gameplay cell |
| tiles per canvas axis | **4** | 128 / 32 |
| iso tile footprint | **64 × 32 px** | unchanged 2:1 isometric diamond |
| pixels per voxel | **2 px horizontal, 1 px vertical** | `VOXEL_Z_PX = 1` |
| runtime downscale | **2** | raycast canvas → sprite pixels |
| elevation levels | 0, 4, 8, …, 32 | step 4, untouched by the rescale |
| elevation → pixels | **1 px per elevation unit** | a 4-level step lifts a tile by 4 px |

`TILE_W / TILE_VOXELS = 2` and `TILE_H / TILE_VOXELS = 1` are asserted by test 1:
the runtime's tile and the pipeline's tile are the same physical 32 voxels.

## 2. The three sizes

Every generated model carries all three, separately. Conflating them was the
root cause of the old "everything is one tile" behaviour.

| size | field | meaning |
| --- | --- | --- |
| **model bounds** | `bounds.min/max/size` | painted geometry inside the 128³ canvas |
| **visual footprint** | `visualFootprint` | ground area the sprite covers, in tiles |
| **gameplay footprint** | `gameplayFootprint` | cells used by placement, collision, selection, ownership, pathing |

The current roster has `visualFootprint === gameplayFootprint` for every asset
(no decorative overhang that would mislead the placement preview). Should a
future asset need overhang, `visualFootprint` may exceed `gameplayFootprint`,
and the renderer already centres the sprite on the gameplay footprint.

## 3. Footprint classes

Footprints are multiples of 32 voxels: 1×1, 1×2, 2×1, 2×2, 2×3, 3×2, 3×3, 4×4.

| class | examples | gameplay cells |
| --- | --- | --- |
| 1×1 | infantry, tanks, aircraft, ships, pillbox, bunker, guard tower, SAM site, all terrain | 1 |
| 2×2 | base, barracks, power plant, radar station, refinery, depot, research lab, city, farm, mine, helipad | 4 |
| 3×2 | port | 6 |
| 3×3 | HQ, airport | 9 |

A model is *translated* into the block its footprint occupies inside the 128³
canvas (`footprintRect`); geometry is never stretched to fill it. A 3×3 model is
sculpted on a 96×96 design grid and placed at the canvas origin; a 3×2 model is
sculpted on 96×64 and placed at y = 32.

## 4. Design space vs world space

Sculpting directly at world scale would make every infantryman a 16-voxel
speck, so models keep their readable authoring grids and are **recalculated**:

| kind | design grid | world scale | result |
| --- | --- | --- | --- |
| unit | 64³ | 0.5, 0.5, 0.5 | 32-voxel-wide vehicle inside a 32-unit tile |
| terrain / prop | 64³ | 0.5, 0.5, 0.5 | 32-voxel cell, half-height props |
| elevation block | 64³ | 0.5, 0.5, **1** | 32-voxel cell, z = elevation level |
| effect (missile) | 64³ | 0.5, 0.5, 0.5 | travels in world units |
| 1×1 building | 32×32×H | 1, 1, 1 | authored directly in world voxels |
| 2×2 building | 64×64×H | 1, 1, 1 | authored directly in world voxels |
| 3×3 building | 96×96×H | 1, 1, 1 | authored directly in world voxels |
| 3×2 building | 96×64×H | 1, 1, 1 | authored directly in world voxels |

Pose/animation ops are authored in design voxels and promoted to world units by
`scalePoseMotion(ops, spec.scale)` before the world-space resample. Without that
promotion a 1-voxel tread shift vanishes in the 2:1 resample — the reason the
old animation gates could not see tank tracks move.

## 5. Height contract {#height}

Height is deliberately **not** proportional to footprint. A radar tower is tall
and narrow; an airport is wide and flat.

- **Elevation blocks** are the one place where z is gameplay data. Their z is the
  elevation level (0…32) and is *not* rescaled, so a level-32 block is 32 world
  voxels tall (plus its surface diamond). `VOXEL_Z_PX = 1` and
  `terrain.json → elevation.runtimePixelsPerVoxelZ = 1` describe the same rule.
  Sprites are cropped tight to their content, so each +4-level block's crop is
  exactly 4 px taller and its ground anchor sits exactly 4 px lower inside the
  crop; the distance from the anchor to the bottom of the sprite stays constant
  (18 px). Draw a level-h block with its anchor on the z = 0 baseline and its
  surface lands h × `VOXEL_Z_PX` px above it — which is exactly where
  `gridToIso(..., elevation)` puts entities standing on that tile. Test 12 of
  `tests/elevation.test.js` asserts all four relationships for every level.
- **Terrain props** (trees, rocks, hills) use half-scale z like their x/y, which
  keeps their old silhouette proportions on a tile that is now half as wide.
- **Units** are 16–24 world voxels tall (infantry ≈ 23, tanks ≈ 18), so a
  human is clearly smaller than a doorway while still readable at 2 px/voxel.
- **1×1 posts** are 17–51 voxels tall (pillbox 29 px sprite, guard tower 51 px).
- **2×2 facilities** are 43–62 voxels tall at the anchor.
- **3×3 compounds** reach 70 voxels (HQ) — the tallest structures in the
  roster, well inside the 128-voxel ceiling.

The `heightClass` field (`ground`, `low`, `medium`, `tall`, `vehicle`, `human`,
`ship`, `aircraft`, `major`) records the intended hierarchy and is checked by
test 4 (infantry < vehicles < posts < facilities < HQ).

## 6. Anchors and clipping

`groundAnchor` is the voxel inside the canvas that lands on the tile centre:
`[48, 48, 0]` for 1×1 assets, the block centre for compounds. The baker rotates
about **that anchor**, never about the canvas centre — the old centre-of-canvas
rotation pushed off-centre models out of their crop (`silo-missile-down`,
anchor x = −25).

Per-facing sprites are cropped tightly to their content and each crop records
its own `anchorX`/`anchorY`; that offset legitimately varies between facings
because the silhouette does. Every frame inside a facing shares the facing's
crop and anchor, so animation never jitters. Multi-tile crops are asserted to be
at least as large as the footprint diamond, so a compound can never be clipped
by its own sprite.

`clippingMargin` declares any extra padding the baker must reserve around the
geometry (0 for the current roster).

## 6b. Sprite crispness (pixel-art sampling)

The world scale halves the number of voxels per tile, so the bake has to resample
a 4 px/voxel supersample buffer down to 1 px/voxel. Three rules keep the result
looking like pixel art rather than a blurred photograph:

| rule | why |
| --- | --- |
| **mode sampling**, not box averaging | averaging 2×2 subpixels mixes neighbouring voxel colours, so every edge bleeds and the sprite gains hundreds of off-palette shades (a tank went from 690 to 2,452 distinct colours). Each output pixel now takes the most frequent palette index in its block, so colours stay exactly on-palette. |
| **hard alpha** (50% coverage → opaque, else clear) | intermediate alpha levels antialias every silhouette edge, which reads as blur once the sprite is blitted at 1×. The 50% rule keeps 1-voxel features (antennae, barrels) because the supersample is 2×. |
| **no colour quantization** | unit strips used to be masked to 5 bits per channel (2,452 → 690 shades) to shrink the payload; that banding was visible. Removed — the mode sampler already keeps the palette small. |

The renderer must also sample nearest-neighbour: `blitSheet()` disables
`imageSmoothingEnabled` around every `drawImage`, because the editor runs at a
fractional zoom (1.35×) where the default bilinear filter blurs all sprite edges.
`tests/scale.test.js` test 13 asserts that every opaque pixel of a baked strip is
an exact palette shade, and test 14 asserts that no sprite is ever blitted with
smoothing enabled.

## 7. Runtime contract

`src/iso.js` consumes the generated `src/asset-scale.js`:

```js
TILE_W = 64, TILE_H = 32         // px per tile
TILE_VOXELS = 32                 // voxels per tile
VOXEL_Z_PX = 1                   // px per elevation unit
VOXEL_GRID_SIZE = 128, DOWNSCALE = 2
```

- `footprintOf(type)`, `footprintCells(x, y, fp)`, `footprintOrigin(map, entity)`,
  `footprintCenter`, `canPlaceFootprint`, `getBuildingRenderPosition`.
- Buildings are drawn **once**, at the front-most cell of their footprint, with
  the sprite anchor placed on the footprint centre. Selecting any covered cell
  highlights the whole footprint.
- Placement previews tint every covered cell (green = valid, red = invalid,
  dashed outline) and reject out-of-bounds, uneven ground and overlaps.
- Classic and iso rendering stay isolated: the legacy sprite-sheet path is left
  untouched, and the scale data only feeds the iso renderer and the editor.

## 8. Pipeline

```
voxels:build    registry → sculpt → resample → data/voxels.json (+ asset-scale.js)
voxels:preview  500 preview PNGs from the model data
voxels:bake     17,880 iso strips + manifest.json (v4, metadata under entry.meta)
voxels:review   docs/review/*.png + sizing matrix + review page
```

Manifest entry shape (v4):

```json
"hq": {
  "right": { "cell": {"x":0,"y":0,"w":193,"h":120}, "anchorX": 95, "anchorY": 70,
             "frames": [ … ], "variants": {"0": {"file": "...png", "sha256": "..."}, "n": {}, …} },
  "up": { … }, "left": { … }, "down": { … },
  "meta": { "kind": "building", "category": "command", "heightClass": "major",
            "footprint": [3,3], "gameplayFootprint": [3,3], "visualFootprint": [3,3],
            "renderScale": 1, "bounds": {…}, "groundAnchor": [48,48,0] }
}
```

Facing keys stay exactly `right|up|left|down` (+ four diagonals for units), so
existing consumers cannot mistake metadata for a facing.

## 9. Rebuild

```bash
npm run voxels:all     # build (≈26 s) + previews (≈2 s) + bake (≈6 min)
npm run voxels:review  # review sheets, sizing matrix, review page
npm test               # elevation + scale gates
```

The bake is deterministic: manifest hashes, frame dedupe and cell sizes are
stable across runs, and test 12 of `tests/elevation.test.js` re-bakes
`elevation-00`/`elevation-32` into a temporary directory to prove it.

Current payload: **17,880 strips, 50.19 MB** (98 MB on disk with the manifest).
Hard-edged pixel art compresses far better than the previous antialiased
sprites, which is why this dropped from 82 MB without losing any coverage.
