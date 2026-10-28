# Checklist — 512³-Native Rebuild

Companion to `docs/PLAN_512_native_16dir_segmented_pipeline.md`. Work proceeds **one batch at a time**;
a batch closes only when its gate passes. Legend: `[x]` done · `[~]` written but not green · `[ ]` todo ·
`[!]` blocked.

Status as of this commit — **B0 done, B1 done, B2 pipeline green (modelling open), B3 done**.
Three assets bake end-to-end at 512³: `tank` (16 facings, 240 PNG), `barracks` (4 facings, 36 PNG) and
`at-turret` (4 scene facings + a 16-camera turret, 124 PNG). No existing asset was modified or deleted.

---

## B0 · Pipeline skeleton

- [x] `tools/voxel_pipeline/v3/materials.mjs` — material table, metalness/roughness/emissive, team roles,
      army livery resolver, stable material ids.
- [x] `tools/voxel_pipeline/v3/livery.json` — livery table for runtime tinting.
- [x] `tools/voxel_pipeline/v3/scribe.mjs` — 512³ canvas: parts, pivots, boxes/shells/cylinders/cones,
      ramps, rings, lines, rivets, bolts, grilles, mottle, wear, cull, finish.
- [x] `tools/voxel_pipeline/v3/raster.mjs` — azimuth-in-camera projection, per-face splat with depth
      buffer, albedo + view-space normal + material id map, box downsample.
- [x] `tools/voxel_pipeline/v3/bake.mjs` — 16 unit facings / 4 building facings, per-part PNG trio,
      shared anchor + pivot maths, per-asset manifest v4, preview composite, `voxel-index.json`.
- [x] `tools/voxel_pipeline/v3/validate.mjs` — canvas bounds, minimum span, required parts, dynamic part.
- [x] `tools/voxel_pipeline/v3/kit.mjs` — track loop, road wheel, suspension, louvres, crate, hatch,
      periscope, antenna, smoke bank, basket rack, cable, sandbags, seam, lifting eye.
- [x] `tools/voxel_pipeline/v3/models/index.mjs` — asset registry (kind, folder, group, required parts).
- [~] `tools/voxel_pipeline/v3/models/tank.mjs` — first native 512³ sculpt; **over budget, see B1**.
- [x] `package.json` scripts: `voxels3:bake`, `voxels3:tank`, `voxels3:all`.
- [x] Parallel runners: `voxels3/bake-all.sh` (POSIX) and `voxels3/bake-all.ps1` (Windows).

**Gate:** all modules import cleanly; pilot exposes the voxel-budget problem. *(met)*

---

## B1 · Voxel budget & raster correctness — **DONE**

- [x] **Diagnosis:** the sandbox was never the bottleneck. Attempt 1 filled volume (16.6 M cells, one hull
      call alone = 5.78 M invisible interior cells). Attempt 2 shelled the boxes but a *stack of shells*
      keeps hidden inner faces (empty space between layers ⇒ cull cannot prove them hidden) and still hit
      2.26 M. **Neither number justifies shrinking the canvas.**
- [x] Replaced the `Map` voxel store with a **512³ bitset** (16 MB) + ordered paint ops.
- [x] `finish()` resolves the real outer skin in one bounding-box walk and assigns material/part from the
      last covering op — stacked shells now collapse automatically.
- [x] Deferred surface passes (`paint`, `regroup`, `mottle`, `wear`, `mirrorY`) run on the resolved skin.
- [x] Budget gate in `validate.mjs`: warn above 1.3 M surface voxels, hard fail at 2.6 M.
- [x] Deterministic PRNG only (no `Math.random` in any builder); verified by re-bake.
- [x] Perf measured: sculpt **0.17 s**, surface pass **1.96 s**, full asset bake **39.5 s**.
- [x] Sheet contract verified: 240 PNG = 16 facings × 5 parts × 3 maps, 1.12 MB.
- [x] Determinism verified: byte-identical re-bake (aggregate sha256 of all sheets).
- [x] Fixed a real bug: `preview.png` was written as raw RGBA instead of an encoded PNG.
- [ ] Verify 22.5° facings are genuinely distinct (silhouette hash differs between all 16) — needs the B2
      contact strip.
- [ ] Record `sourceGeometry.timings` in the manifest.

**Gate:** met — one 512³ asset bakes end-to-end, deterministically, inside every budget.

---

## B2 · Pilot unit: `tank` (16 dirs, 5 parts, 3 maps)  ← **in progress**

- [x] Five parts: `body`, `running.L`, `running.R`, `turret`, `barrel`.
- [x] Baked 16 facings × 5 parts × 3 maps → 240 PNG, 1.12 MB, 39.5 s.
- [x] `preview.png` composite written and inspected.
- [x] Payload extrapolation: 58 units ≈ 65 MB PNG, ≈ 38 min serial / ≈ 10 min at 4 jobs — comfortably inside
      the §7.3 budgets, so 512³ stays.
- [x] **Preview layering bug fixed:** the compositor offset sign was inverted (`maxAnchor − anchor` had the
      sign flipped), scattering parts — the barrel landed 2×120 px from its ring. Parts are also now drawn
      far-to-near by centroid depth instead of in part-name order. Additionally the sprite crop is aligned to
      the supersample grid so sub-pixel drift cannot accumulate.
- [x] **Single-pass preview added:** `preview.png` renders every part into one depth buffer, so inter-part
      occlusion (turret ring inside hull, barrel over deck) is resolved by depth rather than draw order.
      `preview-parts.png` re-assembles the same parts from their sheets through the shared anchor — if the
      two ever disagree, an anchor is wrong.
- [x] **Per-facing composites baked:** `<asset>__composite__<facing>__albedo.png` for all 16 facings.
- [x] **Contact strip** (`tools/voxel_pipeline/v3/contact.mjs` → `contact.png`) for whole-roster review.
- [x] Turret rebuilt flush on the ring (no floating plinth) and the barrel now clears the turret shell.
- [x] 16-facing distinctness verified programmatically (8×8 silhouette signature: **no duplicate pairs**).
- [x] **Traverse fixed twice:** first the gallery rotated sprites in the image plane (a view-axis spin, not a
      yaw); now dynamic parts re-query a different baked facing and register on their world pivot.
- [x] **Parent chain added** (`c.parent('barrel','turret')` → `parts[].parent`): a mounted part's pivot is
      orbited about its parent's pivot, so the gun follows the turret instead of being left behind.
- [x] Barrel reworked for silhouette: mantlet narrowed (87 → 60 voxels wide), tube slimmed to 22 voxels, gun
      lengthened to overhang the hull nose by 40 voxels so the traverse is legible at game scale.
- [x] Turret ring registration checked across all 16 facings via the composite strips.
- [x] **Re-baked at true runtime scale** (see B3) — 240 PNG, 0.12 MB, tank body 52×35.
- [ ] **Modelling pass (open):** the hull still reads slab-sided and the ground wheels could sit tighter in
      the track band. Proportions need another iteration — geometry work, not a pipeline change.
- [x] **Virtual light rig for normal/material testing** — `light.mjs` relights the composite through a
      three-point rig and a single-light sweep; because it shades from the normal + material maps, bad
      normals or dead PBR channels fail at bake time.
- [x] Review images per asset: `preview-lit.png` (three-point), `preview-lights.png` (8 azimuths),
      `preview-maps.png` (albedo | normal | material id | metalness | roughness | emissive),
      `preview-parts.png` (segmentation check), `contact.png` (16 facings, relit).
- [x] Fixed composite masking: silhouette coverage now comes from the albedo alpha, never from the material
      map's emissive alpha; material ids take the nearest part instead of blending.
- [x] Fixed `contact.mjs` executing its CLI body on import (needed a main guard).
- [ ] Human review pass.

**Gate:** 16 distinct facings, clean part registration, proportions approved.

---

## B3 · Pilot building: `barracks` (4 dirs) + `at-turret` (segmented) — **DONE**

- [x] **Runtime scale bug fixed.** `k` defaulted to 4, so every sheet was rendered four times the legacy
      tile and no building could ever sit in its own tile. `RUNTIME_K = 1` / `PREVIEW_K = 4` are now
      separate: sheets at runtime scale, review images 4×.
- [x] **Vertical scale bug fixed.** `project()` used `((X+Y)·0.5 − w)·K` — a 1:1 diamond, so every sprite
      came out **twice as tall** as its tile (tank body 52×66 instead of 52×35) and disagreed with the
      baked view normals, which already assumed the 1:2 ground/height ratio. Now
      `((X+Y)·0.5 − w)·0.5K`: a full 512 footprint is exactly the legacy 64×32 diamond, and the tank
      composite is 56×39 (legacy cell 45×32).
- [x] `tools/voxel_pipeline/v3/kit-buildings.mjs` — architectural kit: foundation, `walls()` (solid mass by
      default: the occupancy cull keeps only the outer skin, so filling is *cheaper* than shelling),
      windows, doorway, gable/flat roof, flagpole, sandbags, steps, wall lamp, vent stack.
- [x] `tools/voxel_pipeline/v3/kit-init.mjs` — one import surface for both kits.
- [x] `barracks`: `body`, `door`, `flag`; yard, buttresses, two window rows, portico with canopy, gable
      roof, vents, roof hatch, antenna, flag pole. 835,171 surface voxels, **36 PNG**, 4 facings.
- [x] `at-turret`: `body`, `turret`, `barrel`; hollow ring wall with a firing slit, drum, octagonal
      cupola, sagger ring, rear blast door, sandbag ring, ready ammunition. 950,866 voxels, **124 PNG**.
- [x] **Per-part camera sets.** A unit rotates as a whole, so one camera set covers every part (a sprite
      from another azimuth *is* the same part yawed). A building does not rotate, so its body keeps 4
      scene facings while anything that **traverses** is baked on the 16-camera unit ring — otherwise a
      building turret could only ever snap to 90°.
- [x] `c.traverse('turret')` + inherited through the `parent` chain → `parts[].traverse`,
      `parts[].facingSet` (`scene` | `unit`), `parts[].facingOrder`, `facingMeta[].unitIndex`.
- [x] Gallery: `shiftFacing(partMeta, sceneFacing, steps)` picks from the part's own `facingOrder` using
      `unitIndex`, and only traversing parts follow the slider (a door is dynamic but does not traverse).
- [x] `scribe.box()` clamps to the lattice — the bulk bit-setting path could otherwise wrap an
      out-of-canvas box into the next row and corrupt unrelated geometry (found by the barracks yard).
- [x] Weathering is material-scoped (`wear(..., {only})`, `mottle(..., {only})`): the concrete pass used to
      speckle roof tiles and glass as well.
- [x] `barracks` + `at-turret` in the registry with `kind: 'building'` → the baker selects the 4 legacy
      facing ids (`right`/`up`/`left`/`down`) automatically; legacy poses confirmed by inspection.
- [x] `npm run voxels3:buildings`.

**Gate:** 4 facings match the legacy convention; the building turret rotates independently at 16 steps
while the structure stays put. ✅ (Gate met; art detail iterates with the rest of the roster.)

---

## B4 · Land units (three sub-batches) — **in progress**

- [x] **Shared chassis kit** (`tools/voxel_pipeline/v3/kit-vehicles.mjs`): `trackGear()` (track loop,
      wheels, sprocket with real teeth, idler, return rollers, fender, optional skirt), `trackedHull()`
      (belly, lower sides, **stair-stepped sponson chamfer**, deck plate, swept glacis), `engineDeck()`,
      `castTurret()` (octagonal plan, tapered per level), `applique()`, `stowageRail()`.
- [x] **Two B2 defects fixed at the source, not per model:**
      * *road wheels proud of the track* — a wheel is now always placed `WHEEL_INSET = 3` voxels **inboard**
        of the band's outer face, so the track ribbon paints over it and it only reads through the loop's
        opening;
      * *slab-sided hull* — the sponson is a three-step chamfer, not one vertical wall from belly to deck.
- [x] `tank` ported onto the kit (still 16 facings / 5 parts) — 890,270 voxels, 0.15 MB, and the turret was
      rebuilt twice: box slabs read as a bunker, `cylZ` rings read as a cake tin, an **octagonal tapered
      plan** reads as a turret.
- [x] `apc` — tall troop box, four firing ports a flank, rear ramp, roof kit, MG ring (`turret` + `barrel`,
      so an APC's gun traverses like a tank's). 1,061,824 voxels, 240 PNG.
- [x] `heavy` — six road wheels, wider track, steeper glacis, much larger octagonal turret with a long
      bustle and basket, longer gun overhanging the nose. 1,208,391 voxels, 240 PNG.
- [x] **Preview scale raised to 8** (`PREVIEW_K`): a design voxel at half a pixel is the smallest preview
      where silhouette and part attachment can actually be judged. `VOXEL_PREVIEW_K` overrides it.
- [ ] **B4a remaining** — `artillery`, `antiair`, `mega`, `bastion`, `aegis`, `ifv`, `tank-destroyer`,
      `flame-tank`, `amphibious-tank`, `mine-layer`, `mobile-repair`, `mine-clearing` (+ `tank`, `apc`,
      `heavy` done).
- [ ] **B4b wheeled** — `recon`, `rockets`, `missiles`, `supply-truck`, `command-vehicle`.
- [ ] **B4c foot** — `infantry`, `mech`, `engineer`, `medic`, `rocket-infantry`, `aa-infantry`, `sniper`,
      `grenadier`, `flamethrower`, `demolitionist`, `commando`, `officer`, `spy`, `elite-hero`,
      `attack-dog`, `scout`.
- [ ] Each asset: sculpt → `validate.mjs` → bake → preview → review.

**Gate per sub-batch:** every asset bakes, budget met, parts present, previews reviewed.

**Open art notes for B4a** — the turret/hull balance is close but not settled: the tank's deck still reads
as a large flat plane at preview scale, and the APC's MG ring is heavy. Both are shape problems, not
pipeline problems, and are cheaper to fix once the rest of the family exists and can be compared side by
side.

---

## B5 · Air + naval units

- [ ] **B5a rotor** — `copter`, `lift-copter`, `uav`.
- [ ] **B5b jet** — `fighter`, `bomber`, `specter`, `mpa`, `ground-attack-jet`, `transport-plane`,
      `stealth-fighter`, `spy-plane`.
- [ ] **B5c naval** — `submarine`, `gunboat`, `cruiser`, `battleship`, `lander`, `uhac`, `destroyer`,
      `missile-boat`, `carrier`, `naval-repair`, `mine-layer-ship`.
- [ ] Rotor/jet/naval part sets per §5 of the plan.

**Gate:** as B4.

---

## B6 · Buildings (26, four dirs)

- [ ] **B6a production** — `hq`, `base`, `barracks`(done in B3), `airport`, `port`, `helipad`,
      `depot`, `refinery`, `power-plant`, `research-lab`.
- [ ] **B6b economy/civil** — `city`, `farm`, `mine`, `supply-depot`, `repair-depot`, `field-hospital`,
      `radar-station`, `landmine`.
- [ ] **B6c defensive (segmented turrets)** — `pillbox`, `bunker`, `at-turret`(done in B3), `sam-site`,
      `flak-cannon`, `coastal-battery`, `artillery-emplacement`, `guard-tower`.

**Gate:** all 26 bake at 4 facings, defensive buildings carry rotating turret parts.

---

## B7 · Normal + material maps (priority 2)

- [ ] Channel-contract test: R = material id, G = metalness, B = roughness, A = emissive.
- [ ] Every material id in every sheet resolves in `materialMap.table` (no orphan ids).
- [ ] Normal-map unit test: flat top face at `d00` encodes ≈ `(128, 0, 128±)` view-space.
- [ ] Tint round-trip: standard → allies → standard reproduces the original pixels.
- [ ] Payload report per asset and per map type.
- [ ] If over budget: indexed material PNG, or half-res with documented `materialMap.scale`.

**Gate:** contract tests green; payload within budget for the full roster.

---

## B8 · Folder organisation + index + archive (priority 3, parallel from B2)

- [x] Per-asset folder layout implemented in the baker (`game_assets/<kind>/<asset>/sheets/…`).
- [x] `game_assets/voxel-index.json` writer (`units`, `buildings`, folder, parts, facings).
- [ ] Migrate the first real assets into the layout (starts as soon as B2 greens).
- [ ] Archive legacy output: `game_assets/voxels/` → `game_assets/_legacy/voxels-64/` (**move, never delete**).
- [ ] Path-contract test: every `file` in every manifest exists on disk, no stray sheets.
- [ ] `.gitattributes` / ignore rules for generated sheets if payload lands in Git.
- [ ] README folder map.

**Gate:** index covers every baked asset; no orphan files; legacy archive intact.

---

## B9 · Runtime integration

- [ ] `src/iso-renderer.js` v4 loader: manifest v4, per-part composition via shared anchor.
- [ ] 16-way facing selection (22.5° resolution) alongside the legacy `directionForDelta`.
- [ ] Dynamic part transforms: turret traverse about `pivot`, barrel elevation.
- [ ] Material-map tinting for army livery.
- [ ] Fallback path to v3 sheets while both pipelines exist.
- [ ] No change to the `Movement.sample()` object shape (asserted by existing tests).

**Gate:** game renders segmented 16-direction units; legacy tests still pass.

---

## B10 · Tooling, tests, docs

- [x] **Interactive review gallery** — `voxel-sprite-review-v4.html` + `npm run voxels3:review`
      (zero-dep static server; browsers block `fetch`/pixel reads on `file://`). Relights live from the normal +
      material maps, exposes an azimuth/elevation/intensity/ambient/exposure light rig, a light sweep, per-map
      views, part toggles, and turret/barrel rotation about their pivots.
- [ ] Contact-sheet generator (one image per asset, all facings in a row) for human review.
- [ ] Validation report command (`voxels3:report`): voxel counts, part counts, payload, timing.
- [ ] Tests: `sheet-contract`, `anchor`, `facing-uniqueness`, `payload`, `determinism`.
- [ ] Update `README.md` to the v3 pipeline + folder contract.
- [ ] Update `tools/voxel_pipeline/registry.mjs` to the new registration points.
- [ ] Banner-mark the superseded plans (`PLAN_new_assets_and_voxel_eight_direction_movement.md`,
      `PLAN_graphics_and_sprite_animation.md`).

**Gate:** suite green; docs consistent; gallery reviewed.

---

## Totals to track

| Metric | Target | Current |
| --- | --- | --- |
| Units rebuilt at 512³ | 58 | **1** (`tank`, modelling pass pending) |
| Buildings rebuilt at 512³ | 26 | 0 |
| Unit facings | 16 | 16 baked for `tank` |
| Building facings | 4 | 0 baked |
| Maps per sheet | 3 (albedo/normal/material) | 3 |
| Canvas | 512³ native | **512³ — confirmed, no downgrade** |
| Sculpt time per asset | ≤ 2 s | 0.17 s |
| Bake time per unit asset | ≤ 90 s | 39.5 s |
| Surface voxels per vehicle | ≤ 1.3 M | 1.06 M |
| PNG per unit asset | — | 240 |
| Payload per unit asset | ≤ 3 MB | 1.12 MB |
| Bake determinism | byte-identical | **verified** |
| Dynamic part pivots in manifest | per facing | **added** (`depth` + `viewDir`) |
| Total PNG payload | ≤ 400 MB | 65 MB projected (163 MB legacy, archived later) |
