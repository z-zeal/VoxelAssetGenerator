# Checklist — 512³-Native Rebuild

Companion to `docs/PLAN_512_native_16dir_segmented_pipeline.md`. Work proceeds **one batch at a time**;
a batch closes only when its gate passes. Legend: `[x]` done · `[~]` written but not green · `[ ]` todo ·
`[!]` blocked.

Status as of this commit — **B0 done, B1 done, B2 in progress**. One asset (`tank`) bakes end-to-end at
512³; its proportions still need a modelling pass (B2). No existing asset was modified or deleted.

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
- [ ] **Modelling pass (open):** proportions are off in the first sculpt — the hull reads too tall and the
      roadwheels sit proud of the tracks instead of tucked behind the track band. Needs a redesign
      iteration, not a re-bake.
- [ ] Turret ring registration check at all 16 facings.
- [ ] 16-facing contact strip for review (also satisfies the B1 facing-uniqueness check).
- [ ] Human review pass.

**Gate:** 16 distinct facings, clean part registration, proportions approved.

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
| Total PNG payload | ≤ 400 MB | 65 MB projected (163 MB legacy, archived later) |
