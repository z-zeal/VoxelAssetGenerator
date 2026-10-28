# Plan: 512³-Native Rebuild — 16-Direction Units, 4-Direction Buildings, Segmented Sheets, Normal + Material Maps

**Document:** `docs/PLAN_512_native_16dir_segmented_pipeline.md`
**Status:** PLAN — approved structure, execution deliberately split into batches (see §8).
**Branch:** `arena/b64e2484-voxelassetgenerator`
**Supersedes:** `docs/PLAN_new_assets_and_voxel_eight_direction_movement.md` (8-direction scope) and the
asset-pipeline sections of `docs/PLAN_graphics_and_sprite_animation.md`. Both keep their historical value and
get a "superseded" banner; nothing in them is deleted.
**Companion:** `docs/CHECKLIST_512_native_rebuild.md` — the checkbox list that drives the batches.

---

## 1. The request, restated as requirements

| ID | Requirement | Interpretation locked for this plan |
| --- | --- | --- |
| **R1** | Units get **16 directions** | Every unit asset bakes 16 distinct facings at 22.5° steps. No mirroring, no interpolation. |
| **R2** | Buildings stay on **4 directions** | Buildings bake the same four poses the current sheets use (`right`, `up`, `left`, `down`). Footprint is board-axis-aligned; 16 is pointless and expensive. |
| **R3** | Canvas is **512×512×512 voxels**, min **and** max | The authoring lattice is exactly 512 on every axis. Models are authored to fill it meaningfully; nothing is padded up, nothing is authored at 64 and enlarged. |
| **R4** | **Remodel every** unit and building | All 58 units and 26 buildings are re-sculpted as native 512³ geometry. No model is carried over. |
| **R5** | **Never** scale up geometry | Explicit: a re-scaled 64³ model is a failed model. Detail must be authored on the 512 lattice (rivets, panel gaps, weld beads, vision blocks, track links). |
| **R6** | One folder per asset | `game_assets/<kind>/<asset>/` owns that asset's sheets, manifest and preview. |
| **R7** | Normal **and** material map for everything | Every sprite is emitted three times: `albedo`, `normal`, `material`. Same crop, same anchor. |
| **R8** | Segmented sheets | A unit/building is baked as independent parts (hull / turret / barrel / rotor / legs / crane …) so a turret can rotate without re-baking the vehicle. |
| **R9** | Priority order | 1) remodel + rebake at 512³ with segmentation, 2) normal + material maps, 3) (parallel) sheet/folder organisation. |

---

## 2. Verified current state (read from the checkout, not assumed)

| Fact | Verified value | File |
| --- | --- | --- |
| Voxel database | **500 models**, 358 palette colours, `format: field-command-voxel-64x64x64`, **49.9 MB** | `data/voxels.json` |
| Sculptors | `units.mjs` (1,813 lines), `buildings.mjs` (1,310), `terrain.mjs` (876) | `tools/voxel_pipeline/models/` |
| Legacy baker | `bake.mjs` (24.7 KB): `GRID = 64`, `DOWNSCALE = 4`, `tileSize [64,32]`, strip cells, sha256 per file | `tools/voxel_pipeline/bake.mjs` |
| Legacy facings | **8 for units**, **4 for buildings**. Cardinals are 90° grid rotations (`rotateVoxels`, `turns % 4`); diagonals are a fake 45° LUT that *iso-compensates* by stretching (`su 0.82 / sv 1.22`) — it only works at exactly ±45°. | `bake.mjs:52`, `:132`, `:140` |
| Legacy variants | `['0'…'5','n']` — 7 team colourways baked per model. 17,881 PNG total. | `bake.mjs`, `sheets/manifest.json` |
| Sheet payload | **17,881 PNG / 163 MB** on disk; 503 single previews | `game_assets/voxels/` |
| Roster | **58 units** (`data/units.json`), **26 buildings** (`BUILDINGS`), 80 terrain models | `data/units.json`, `build.mjs:116` |
| Existing groups | Units already tag `turret`, `barrel`, `rack`, `ammo`, `upper`, `legL/R`, `rotorMain/Tail`, `weapon`, `wheels`, `cleat*`; buildings tag only `body`, `dish`, `puff`, `beacon` | `models/units.mjs`, `models/buildings.mjs` |
| Runtime consumer | `src/iso-renderer.js` reads `manifest.models[id][facing].variants[v].file`, falls back to `right`, blits one `drawImage` per entity, **frame 0 only** | `src/iso-renderer.js:84` |
| Tests present | `tests/elevation.test.js` only. No sheet/anchor/facing test exists. | `tests/` |

**Consequence:** the current 8-direction support is a 4-rotation + 4-fake-diagonal hybrid. It cannot be
extended to 16 by adding more entries — 22.5° cannot be expressed by grid rotation, and the iso-compensated
diagonal LUT is only valid at ±45°. 16 directions require moving the azimuth **into the camera**, which is
what §3/D4 does.

---

## 3. Decisions

| ID | Decision | Why |
| --- | --- | --- |
| **D1** | 512 is the **lattice**, not a multiplier. Every builder writes integer voxels in `0..511`; a rivet is 1 voxel, a track link is 7–9 voxels. | Satisfies R3/R5. A scale-up would put 8×8×8 identical cubes where detail should be. |
| **D2** | **8 design voxels = 1 legacy tile unit.** 512/64 = 8, so the canvas maps exactly onto the existing `64×32` iso diamond and the runtime's world scale is unchanged. Baked at `k = 1`; `sx = (X−Y)·0.5`, `sy = ((X+Y)·0.5 − w)·0.5` — the second 0.5 is the 2:1 isometric, and without it sprites are twice the height of the tile (measured: tank body 52×66 → 52×35). | Sprites stay game-compatible; no renderer world-scale rewrite. |
| **D3** | The canvas is **fixed** at 512³. Builders that leave it fail validation; models that under-fill it fail a minimum-span gate. | Prevents both clipping and accidental 64³ authors. |
| **D4** | Azimuth lives in the **projection**, not in a rotated voxel model. Camera-space rasterizer, exact at any angle. | The only way to get 22.5° exactly; also removes the 45°-only hack and the iso stretch. |
| **D5** | 16 facings, ids `d00…d15`, 22.5° apart, `d00` == the pose legacy called `right`. Screen labels recorded alongside. | Stable ids for the manifest; explicit bridge to the old four names. |
| **D6** | Buildings bake the 4 legacy poses under the **legacy names** (`right`/`up`/`left`/`down`) at φ = 0/90/180/270. | The runtime's `directionForDelta` already speaks those names; buildings must not change behaviour. |
| **D7** | Segmentation is a **first-class geometry concept**: every voxel carries a part id, each part bakes its own sprite set, and the manifest stores (a) a shared ground anchor and (b) each part's rotation pivot in pixels. | R8. Turret rotation, barrel elevation, rotor spin and leg gait all become pure runtime transforms. |
| **D8** | No baked team colourways. One standard-livery albedo + the **material map**; the runtime re-tints pixels whose material id has a `team` role. | 7× fewer files, and it is exactly what the material map is for. |
| **D9** | Three maps per facing per part: `albedo` (lit, for unlit runtimes), `normal` (view-space RGB), `material` (R = material id, G = metalness, B = roughness, A = emissive). | R7, with a documented, engine-agnostic channel contract. |
| **D10** | Folder per asset; flat, greppable filenames inside it (`<asset>__<part>__<facing>__<map>.png`). | R6 + R9.3. |
| **D11** | Legacy `game_assets/voxels/` is **archived, not deleted** (`game_assets/_legacy/voxels-64/`), so the current game keeps working until the v4 runtime lands. | No broken intermediate state. |
| **D12** | Animation stays **out of scope for the first rebuild**, but every part records its pivot and `dynamic` flag so clips can be added per part later without re-sculpting. | R9 lists remodels first; pivots are the cheap forward-compatible bit. |
| **D13** | Occupancy is a bitset; appearance is a deferred surface pass. Materials resolve once, at `finish()`. | Measured: 16.6 M → 1.06 M voxels, 28.2 s → 0.17 s sculpt (§7.1). |
| **D15** | **Canvas stays 512³.** No 448/384 fallback, no machine-specific variants. | A full 512³ unit bakes in 39.5 s / 1.12 MB on an ordinary sandbox CPU (§7.3). |
| **D14** | Bakes are **deterministic and per-asset runnable** (`--only tank`, `--only barracks,at-turret`), so batches can be verified in isolation. | Batch execution, per §8. |
| **D16** | **Per-part camera rings.** A part that traverses is baked on the 16-camera unit ring even when the asset only has 4 scene facings; everything else stays on the scene set. Declared with `c.traverse(name)` and inherited down the `parent` chain. | A building's turret must swing at 22.5° while its body keeps 4 facings. Baking every building part 16× would quadruple the sheets; baking none would lock building turrets to 90°. |

---

## 4. Asset and sheet contract

```
game_assets/
  voxel-index.json                     # every asset, kind, folder, parts, facings
  units/
    tank/
      manifest.json                    # v4 (schema below)
      preview.png                      # composited d00 preview
      sheets/
        tank__body__d00__albedo.png
        tank__body__d00__normal.png
        tank__body__d00__material.png
        tank__turret__d00__albedo.png  # … one trio per part per facing
        tank__barrel__d00__albedo.png
        …
  buildings/
    at-turret/
      manifest.json
      preview.png
      sheets/
        at-turret__body__right__albedo.png    # 4 scene facings
        at-turret__turret__d00__albedo.png    # 16 cameras: the part traverses
        at-turret__barrel__d00__albedo.png
        …
  _legacy/voxels-64/                   # archived current pipeline output
```

### Manifest v4 (per asset)

```jsonc
{
  "format": "field-command-voxel-sheet-4",
  "asset": "tank", "kind": "unit", "group": "vehicles.tracked",
  "canvas": 512, "designVoxelsPerTileUnit": 8,
  "renderScale": 4, "superSample": 2, "pxPerVoxel": 0.5,
  "facings": ["d00", "…", "d15"],
  "facingMeta": [{ "id": "d00", "angle": 0, "screenAngle": 45, "label": "SE" }, …],
  "teamTint": { "materialIds": [{ "name": "team.hull", "id": 0, "role": "hull" }], "liveries": { … } },
  "normalMap": { "space": "view", "range": "0..255 maps -1..1", "up": "+g means screen up" },
  "materialMap": { "channelOrder": "rgba",
                   "meaning": ["materialId", "metalness", "roughness", "emissive"],
                   "table": [{ "id": 0, "name": "team.hull", "metalness": 0.35, … }] },
  "parts": {
    "turret": {
      "dynamic": true,
      "pivotDesign": [320, 256, 158],
      "facings": {
        "d00": {
          "anchor": [188.5, 132.0],        // where the SHARED ground anchor sits inside the crop
          "pivot":  [188.5, 96.5],         // rotation pivot inside the crop, pixels
          "w": 212, "h": 148,
          "files": { "albedo": { "file": "sheets/…", "sha256": "…" },
                     "normal": { "file": "…", "sha256": "…" },
                     "material": { "file": "…", "sha256": "…" } }
        }
      }
    }
  },
  "clips": { "idle": 1 },
  "sourceGeometry": { "parts": [{ "name": "body", "voxels": 214311, "bounds": { … } }], "totalVoxels": 712004 }
}
```

Runtime rule for composition: for every part of one entity, draw at
`screen = entityTilePos + part.facings[f].anchor`.

### Traversal contract (do not rotate sprites)

**A turret traverse is not an image rotation.** Rotating a sprite in the image plane about its pivot
produces a spin about the *view* axis, which is not a yaw and reads as wrong immediately. Traverse works by
selecting a different baked facing for the dynamic part and registering it by its **world pivot**:

1. `design = (sceneFacing.angle + traverseDeg) mod 360`, snapped to the 22.5° grid.
2. Query the part's sheet at `facing = facingAt(design)` — the same model photographed from another azimuth,
   so its silhouette is physically correct rather than a rotated flat image.
3. Place it with `offset = sceneFacing.screenMatrix · (part.pivotDesign − groundCentre) − part.facings[f].pivot`.
4. **Honour the parent chain.** A part mounted on another dynamic part (a gun on a turret ring) has its pivot
   *orbited* about its parent's pivot by the same angle, transitively. Without this the turret traverses and
   leaves its barrel behind in mid-air — the pivot has to move, not just the sprite.

`screenMatrix` (a 2×3 design-voxel→pixel projection, per facing) is in the manifest for exactly this, so a
runtime never has to concatenate crop offsets. Granularity is the facing grid: 22.5° for units.

**Per-part camera rings (D16).** The identity the step-2 trick relies on is *"a part yawed by +t seen from
camera c = the same part seen from camera c − t"* — which only holds if the whole scene turns. A unit turns
as a whole, so all its parts share one 16-camera set. **A building does not turn**: its body stays on the 4
legacy scene facings, while anything that traverses is baked separately on the 16-camera unit ring. Hence

* `parts[].facingSet` — `scene` (4) or `unit` (16);
* `parts[].facingOrder` — the part's own facing ids, in rotation order;
* `parts[].traverse` — true for a turret **and, through the `parent` chain, for its gun**;
* `facingMeta[].unitIndex` — which unit-ring index a scene facing corresponds to
  (`right` = 0, `up` = 4, `left` = 8, `down` = 12).

Runtime: `facing = facingOrder[(unitIndex(sceneFacing) + traverseSteps) mod 16]`. Only `traverse` parts
follow the slider — a door is `dynamic` (it opens) but it does not swing about a vertical axis, and baking it
on the unit ring would be 4× the sheets for nothing.

Painter order: static structure first, then dynamic parts far-to-near. A per-part centroid depth alone is
insufficient — once a turret swings to a facing where its centroid is deeper than the hull's, the hull paints
over it. Dynamic parts are mounted *above* their host, so they must draw after it.

**Elevation needs geometry.** Gun elevation changes the actual silhouette (the barrel rises), which is a
different pose, not a different azimuth — it requires a re-bake (`barrel.pitch`) and is not a runtime
transform. Animation clips remain the follow-up pass (D12). Because `anchor` is shared (it is the projection of
the design-space ground centre `(256, 256, 0)` for that facing), the parts align with no per-part offsets.

---

## 5. Segmentation contract

| Family | Required parts | Rotates at runtime |
| --- | --- | --- |
| Foot infantry | `body`, `legL`, `legR`, `upper`, `weapon` | leg gait, weapon aim |
| Tracked vehicle | `body`, `running.L`, `running.R`, `turret`, `barrel` | turret traverse, gun elevation, tread wrap — `barrel.parent = "turret"` |
| Wheeled vehicle | `body`, `wheels`, `turret`, `barrel` (where fitted) | wheel spin, turret |
| Rotary air | `body`, `rotorMain`, `rotorTail` | rotor spin |
| Jet | `body`, `gear`, `stores` | gear retract, store drop |
| Naval | `body`, `turret`(N), `guns` | turret traverse, wake |
| Defensive building | `body`, `turret`, `barrel` | turret traverse (pillbox AT gun, coastal battery, flak, SAM) |
| Static building | `body`, plus `dish`/`beacon`/`flag` where animated | ambient machinery |
| Production building | `body`, `door`, plus `crane`/`fan` where animated | door open/close |

Naming is enforced by `validate.mjs` (`requiredParts` per asset), so a model cannot silently lose its
segmentation. Mounting relationships are declared in the sculptor with `c.parent(child, parent)` and land in
the manifest as `parts[].parent`.

---

## 6. Normal and material map contract

* **Normal map** — per-pixel view-space normal of the voxel face that wins the depth test.
  `R = +right`, `G = +up`, `B = toward viewer`, encoded `0..255 ↔ -1..1`. Because azimuth is chosen per
  facing, the same model produces *different but correct* normals for each of the 16 directions.
* **Material map** — `R = material id` (0–255, table in the manifest), `G = metalness`, `B = roughness`,
  `A = emissive`. Ids are stable across assets because they come from one global table
  (`tools/voxel_pipeline/v3/materials.mjs`).
* **Team tinting** — albedo is baked in `standard` livery. A runtime that wants `allies` builds a 3×n
  channel swap from `teamTint.liveries` and applies it only to pixels whose material id carries a `team`
  role. That replaces the seven baked variant sets (17,881 → ~9,300 PNG).
* **Composite masking** — composited maps always take silhouette coverage from the *albedo* alpha. The
  material map's alpha is the emissive channel and the normal map's alpha is meaningless, so masking by a
  channel's own alpha silently erases every non-emissive pixel. Material ids are never blended (an average of
  two ids is a third id): the nearest part wins.
* **Virtual light rig (normals test)** — `tools/voxel_pipeline/v3/light.mjs` re-shades the composite through
  a configurable rig (warm key / cool fill / cold rim, plus a single-light sweep at 8 azimuths). Because it
  shades from the *normal* and *material* maps rather than the pre-lit albedo, a flipped normal axis, a stale
  metalness channel or a dead emissive channel fails visibly at bake time instead of at runtime.
* **Payload control** — the material map is a low-cardinality image; if payload gate B2 fails, emit it as
  an indexed PNG or at half resolution with nearest-neighbour sampling (documented in the manifest as
  `materialMap.scale`).

---

## 7. Voxel budget, authoring rules, and the measured pilot

### 7.1 What the pilot proved

Three attempts, all measured on the same tank geometry, all on the same hardware:

| Attempt | Approach | Sculpt | Cells | Verdict |
| --- | --- | --- | --- | --- |
| 1 | `box()` fills volume (string-keyed Map) | **28.2 s** | **16,621,600** | unusable; interior fill |
| 2 | Shell the big boxes, but stack layers | 3.7 s | 2,260,544 | still 5× over; stacked shells keep hidden inner faces |
| 3 | **Bitset occupancy + deferred surface pass** | **0.17 s** | **1,060,715 surface** | shipped |

**Diagnosis for the record: the sandbox was never the problem.** Attempt 1's largest single call filled
`344 × 336 × 50 = 5.78 M` invisible interior cells; attempt 2 failed because a *stack* of shells has empty
space between the layers, so the interior cull cannot see the hidden faces as hidden.

**Therefore the canvas stays at 512.** No downgrade to 448³ or 384³ is needed — a full 512³ unit bakes
end-to-end in **39.5 s** and produces **1.12 MB / 240 PNG**.

### 7.2 Architecture (binding)

1. **Occupancy and appearance are separate.** `box()`, `cyl*()` and `sphere()` set bits in a 512³ bitset
   (16 MB) and register an ordered *paint op*; they never allocate per-voxel objects.
2. **`finish()` resolves the skin.** One walk of the occupied bounding box keeps only cells with an exposed
   face (the true outer skin) and assigns each one's material/part from the last covering op. Stacking is
   therefore free: shells collapse into one skin.
3. **No per-cell maps during authoring.** Explicit writes are reserved for volumes ≤ 96 cells (routing,
   rivets, decals, single voxels).
4. **Deferred surface passes** (`paint`, `regroup`, `mottle`, `wear`, `mirrorY`) run on the resolved skin,
   which is why recolouring costs one pass instead of a geometry rebuild.
5. **1.06 M surface voxels is a correct number, not a bug** for a vehicle that spans ~400³ of the lattice.
   The budget gate exists to catch *interior fill regressions*, not to force low detail.
6. **Detail density is intentional**: budget goes to silhouette and hard-surface detail (track links,
   vision blocks, weld beads, grilles, stowage), never to filling volume.

### 7.3 Measured gates (512³ confirmed)

| Gate | Budget | Measured for `tank` |
| --- | --- | --- |
| Sculpt one asset | ≤ 2 s | **0.17 s** |
| Surface pass (`finish`) | ≤ 3 s | **1.96 s** |
| Bake one asset (16 facings × 5 parts × 3 maps) | ≤ 90 s | **39.5 s** |
| PNG per unit asset | — | **240** (16 × 5 × 3) |
| Payload per unit asset | ≤ 3 MB | **1.12 MB** |
| Surface voxels per land vehicle | ≤ 1.3 M (hard fail 2.6 M) | **1,060,715** |
| Full unit roster (58) | ≤ 45 min sequential | **≈ 38 min** (≈ 10 min at 4 jobs) |
| Full building roster (26, 4 facings) | ≤ 6 min sequential | estimate ≈ 4 min |
| Determinism | byte-identical re-bake | **verified** (sha256 of all 240 PNG identical) |

Parallel runner: `tools/voxel_pipeline/v3/bake-all.sh [jobs] [filter]` (and `bake-all.ps1` for Windows).
Each asset is independent and deterministic, so the roster splits cleanly across processes.

---

## 8. Batch plan

Ten batches. Each has a scope, an output, and a gate that must pass before the next batch starts.
**B0 is partly written** (the pipeline modules exist in `tools/voxel_pipeline/v3/` but the tank is
unbakeable until B1 lands).

### B0 — Pipeline skeleton *(in progress)*
Materials/metalness table, 512³ scribe (parts, pivots, primitives), camera-space rasterizer (albedo +
normal + material + depth), manifest writer, per-asset folder layout, validator stub, asset registry.
**Gate:** modules load; the pilot exposes the voxel-budget problem.

### B1 — Voxel budget & raster correctness *(blocker for everything)*
Bitset occupancy, surface-only authoring helpers, interior cull, budget gates, deterministic PRNG everywhere,
sprite-crop/anchor/pivot maths verified against a hand-checked case.
**Gate:** the tank sculpts in ≤ 2 s under 450 k voxels; one facing's anchor lands on a known pixel.

### B2 — Pilot: tank (unit) end-to-end
Retrofit the tank to the budgets, bake all 16 facings × 5 parts × 3 maps, composite preview, measure payload.
**Gate:** 16 visibly distinct facings; turret rotates cleanly against the hull at every facing; payload
estimate for 58 units is on budget; a human eyeball pass on the preview.

### B3 — Pilot: barracks + at-turret (buildings) end-to-end — *done*
Same pipeline at 4 facings, with a *defensive* building (`at-turret`) to prove building segmentation.
**Gate:** 4 facings match the legacy pose convention; turret part rotates; door/flag parts animate-ready.

### B4 — Land units (batched by family)
`tracked` → `wheeled` → `foot` in three sub-batches, each: sculpt → validate → bake → review.
~58 units total, ~20 per sub-batch.

### B5 — Air + naval units
`rotor` → `jet` → `naval` sub-batches, same gates.

### B6 — Buildings roster
26 buildings, grouped: `production`, `economy`, `defensive` (segmented turrets), `infrastructure`,
`special`. Buildings bake 4 facings.

### B7 — Normal + material map verification pass *(priority 2)*
Because the maps are produced by the same bake, this batch is *verification + hardening*: channel
contract tests, tint round-trip check (standard → allies → back), normal-map unit test on a known face,
payload optimisation if needed.

### B8 — Folder organisation + index + legacy archive *(priority 3, runs in parallel)*
`game_assets/<kind>/<asset>/` migration, `voxel-index.json`, `_legacy/voxels-64/` archive, index-driven
loader for tools, path validation test.

### B9 — Runtime integration
`iso-renderer` v4: 16-way facing selection, part composition with shared anchors, pivot rotation for
dynamic parts, material-map tinting, graceful fallback to v3 sheets while both exist.

### B10 — Tooling, docs, gates
Review gallery (all assets × facings × maps), contact-sheet generator, validation report, test suite
(`sheet-contract`, `anchor`, `facing-uniqueness`, `payload`, `determinism`), README + this plan kept current.

### Priority mapping (R9)

```
priority 1  ─ B1 → B2 → B3 → B4 → B5 → B6     (remodel + rebake at 512³, segmented)
priority 2  ─ B7                              (normal + material maps for everything)
priority 3  ─ B8 (parallel from B2 onward) → B9 → B10
```

B8 is folder work, so it can start as soon as B2 produces the first asset folder, running alongside the
modelling batches exactly as requested.

---

## 9. Disposition of the old plans

| Old document | Was | Now |
| --- | --- | --- |
| `docs/PLAN_new_assets_and_voxel_eight_direction_movement.md` | 8-direction units at 64³, new asset roster, Barracks | Direction section **superseded** by this plan (8 → 16, 64³ → 512³). Its *asset roster* research (which new units/buildings are worth adding and why) stays valid and is still referenced by B4–B6. |
| `docs/PLAN_graphics_and_sprite_animation.md` | Animation/effects plan, 32³ era, Python tools | Its §1 audit is historical. Animation is deferred here (D12) but its clip/frame vocabulary is what B4+ will use when clips return. |
| `docs/VOXEL64_INVENTORY.md`, `docs/VOXEL64_COMPLETION_REPORT.md` | 64³ inventory | Historical record; superseded by `game_assets/voxel-index.json` once B8 lands. |
| `README.md` | Describes the 64³ pipeline commands | Update in B10 to point at the v3 pipeline and the new folder contract. |

---

## 10. Risks

| Risk | Mitigation |
| --- | --- |
| Volume-filled models explode (already observed, and fixed) | Bitset occupancy + deferred surface pass collapse stacked shells into one skin; the budget gate catches regressions. |
| 58 units × 16 facings × 3 maps is a lot of files/bytes | Measure at B2; mitigate with material-map indexing / half-res material maps, and split maps so albedo-only consumers can skip the rest. |
| Authoring 84 assets by hand is long | Batches are family-scoped and independently verifiable; kit primitives are shared, so later assets reuse track/wheel/turret code. |
| 16-way review is expensive for a human | B10 contact sheets: one image per asset per family, all facings in a row. |
| Legacy runtime breaks mid-migration | Legacy sheets stay in `_legacy/` and v3 manifest stays valid until B9 lands. |
| Anchors drift between parts | All parts share one anchor by construction (projection of the design ground centre); `anchor` is a computed value, never authored. |

---

## 11. Definition of done

1. All 58 units and 26 buildings exist as native 512³ models, none above the voxel budget, all passing
   `validate.mjs`.
2. Units have 16 distinct facings; buildings have the 4 legacy poses.
3. Every asset carries `albedo` + `normal` + `material` per part per facing, plus a manifest with anchors
   and pivots, inside `game_assets/<kind>/<asset>/`.
4. `game_assets/voxel-index.json` enumerates every asset; legacy sheets archived, not deleted.
5. Runtime composes segmented parts and traverses a turret without a re-bake.
6. Test suite green: sheet contract, anchors, facing uniqueness, payload budget, determinism.
7. Docs updated, old plans banner-marked, README reflects the new commands.
