# Checklist — 512³-Native Rebuild

Companion to `docs/PLAN_512_native_16dir_segmented_pipeline.md`. Work proceeds **one batch at a time**;
a batch closes only when its gate passes. Legend: `[x]` done · `[~]` written but not green · `[ ]` todo ·
`[!]` blocked.

Status as of this commit — **B0 partial, B1 blocked**. Nothing has been baked yet; no existing asset was
modified or deleted.

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
- [ ] `package.json` scripts: `voxels3:bake`, `voxels3:preview`, `voxels3:validate`, `voxels3:all`.

**Gate:** all modules import cleanly; pilot exposes the voxel-budget problem. *(met)*

---

## B1 · Voxel budget & raster correctness  ← **blocker**

- [!] **Volume explosion (measured):** naive tank = **16,621,600 cells**, 28.2 s to sculpt, cull does not
      finish. Filling volume instead of surfaces is the failure mode of a 512³ lattice (134 M cells).
- [ ] Replace the `Map` voxel store with a **bitset** occupancy grid (512³ bits = 16 MB) + a sparse
      material/part side table; cull becomes a linear scan.
- [ ] `box()` helper refuses to run above a volume threshold and points the author at `shell()`.
- [ ] Surface-first primitives for big masses (`shell`, `plate`, `ringZ`) used by every builder.
- [ ] Hard voxel budget in the validator: ≤ 450 k surface voxels (land vehicle), ≤ 700 k (building),
      hard fail at 2×.
- [ ] Deterministic PRNG everywhere (no `Math.random` in any builder) — audit script.
- [ ] Perf: sculpt ≤ 2 s, single asset bake ≤ 90 s; record both in the manifest (`sourceGeometry.timings`).
- [ ] Verify anchor maths against a hand-computed pixel for one facing.
- [ ] Verify 22.5° facings are genuinely distinct (silhouette hash differs between all 16).

**Gate:** tank sculpts ≤ 2 s and ≤ 450 k voxels; 16 facing hashes all distinct.

---

## B2 · Pilot unit: `tank` (16 dirs, 5 parts, 3 maps)

- [ ] Re-sculpt tank to budget: `body`, `running.L`, `running.R`, `turret`, `barrel`.
- [ ] Bake 16 facings × 5 parts × 3 maps.
- [ ] Composite `preview.png` and a 16-facing contact strip for review.
- [ ] Confirm the turret part registers on the hull ring at all 16 facings.
- [ ] Measure payload per asset → extrapolate to 58 units; decide material-map compression if over budget.
- [ ] Human review pass on the sheet.

**Gate:** 16 distinct facings, clean part registration, payload within the §7.3 budget.

---

## B3 · Pilot building: `barracks` (4 dirs) + `at-turret` (segmented)

- [ ] `barracks`: `body`, `door`, `flag` parts; 4 legacy facings.
- [ ] `at-turret`: `body`, `turret`, `barrel`; proves building segmentation.
- [ ] Confirm the 4 legacy poses are visually the same directions the current sheets show.
- [ ] Manifest uses legacy facing ids (`right`/`up`/`left`/`down`).

**Gate:** 4 facings match legacy convention; building turret rotates independently.

---

## B4 · Land units (three sub-batches)

- [ ] **B4a tracked** — `apc`, `heavy`, `artillery`, `antiair`, `mega`, `bastion`, `aegis`, `ifv`,
      `tank-destroyer`, `flame-tank`, `amphibious-tank`, `mine-layer`, `mobile-repair`, `mine-clearing`.
- [ ] **B4b wheeled** — `recon`, `rockets`, `missiles`, `supply-truck`, `command-vehicle`.
- [ ] **B4c foot** — `infantry`, `mech`, `engineer`, `medic`, `rocket-infantry`, `aa-infantry`, `sniper`,
      `grenadier`, `flamethrower`, `demolitionist`, `commando`, `officer`, `spy`, `elite-hero`,
      `attack-dog`, `scout`.
- [ ] Each asset: sculpt → `validate.mjs` → bake → preview → review.

**Gate per sub-batch:** every asset bakes, budget met, parts present, previews reviewed.

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

- [ ] Review gallery: every asset × facing × map, offline HTML.
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
| Units rebuilt at 512³ | 58 | 0 |
| Buildings rebuilt at 512³ | 26 | 0 |
| Unit facings | 16 | 0 baked |
| Building facings | 4 | 0 baked |
| Maps per sheet | 3 (albedo/normal/material) | 0 baked |
| Max surface voxels per asset | 450 k (vehicle) / 700 k (building) | 16.6 M (pilot — B1 fix) |
| Total PNG payload | ≤ 400 MB | 163 MB (legacy, archived later) |
| Bake determinism | byte-identical | unverified |
