# Checklist — 512³-Native Rebuild

Companion to `docs/PLAN_512_native_16dir_segmented_pipeline.md`. Work proceeds **one batch at a time**;
a batch closes only when its gate passes. Legend: `[x]` done · `[~]` written but not green · `[ ]` todo ·
`[!]` blocked.

Status as of this commit — **B0–B3 done, B4a/B4b/B4c done (36 units), B5a done (air, rotor)**.
Every unit and both buildings bake end-to-end at 512³ with the full part set: albedo, normal, material
**and depth** per part per facing, plus a 4× review set. **Occlusion is resolved per pixel by a z-test**
(see *Depth sheets* below), so draw order no longer affects any composite.

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
- [x] **Superseded: sorting parts by depth.** A part does not have *a* depth — it has one per pixel. A door
      on the far wall has to lose to the roof while a door on the near wall has to win, and the roof's own
      bounding box reaches closer to the camera than either. Every such "resolve by order" rule (by manifest
      order, by centroid depth, by dynamic-first) fails on some facing; the barracks door over the roof at
      `down` was the visible symptom. Draw order is now irrelevant — see the next item.
- [x] **Depth sheets** — `raster.mjs` writes a per-part, per-facing depth map (16-bit fixed point, 1/32
      voxel, `depth-map.mjs`); `composite.mjs` `compositeParts()` z-tests every pixel of every part and takes
      the nearest surface's albedo, normal and material, so material ids never blend and a hidden part never
      paints. `tests/voxel-occlusion.test.js` diffs composites against a single-pass render of the same
      model: coverage, depth and (on single-part pixels) colour. It fails loudly if order-based compositing
      is reintroduced — 109/1038 pixels on `barracks/down` if the z-test is removed.
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
- [x] **B4a batch 2** — `artillery` (rear turret, spades + ground anchor aft, travel lock forward,
      1,057,750 vox / 240 PNG), `antiair` (open-topped four-wall turret, twin elevated guns, radar as its
      own spinning part, 1,074,620 / 288), `tank-destroyer` (fixed casemate + traversing collar and
      overhanging gun so its 16 facings differ from the tank's, 1,190,238 / 240), `ifv` (rear troop box,
      ramp, firing ports, small turret, ATGM launcher as its own pivoted part, 986,644 / 288).
      Kit grew `slantedBarrel()` and `muzzleBrake()` for these; both leave the caller's `part` current.
- [x] **B4a batch 3** — `mega` (seven road wheels on a 444-voxel run, deck 12 higher than `heavy`,
      **twin gun** in one `barrel` part so both tubes share a trunnion; 1,425,673 vox / 240 PNG) and
      `bastion` (low, widest hull, four-step sponson chamfer, six **hang-on appliqué panels** a side on
      visible rails, armoured **collar ring** with the turret sunk inside it, short fat braked gun,
      fuel drums; 1,270,424 / 240). `aegis` moved to **B4b**: `data/units.json` gives it
      `moveType: "tires"`, so it is wheeled, not tracked.
- [x] **`castTurret` fixed at the source** — the shell is now cut into 4-voxel sub-slabs with the
      footprint taken from each slab's bottom, so the taper reads as a ramp instead of a ziggurat.
      Every turreted asset was re-baked for it (tank 917,800; apc 1,061,824; heavy 1,200,253;
      artillery 1,052,379; antiair 1,074,620; tank-destroyer 1,190,238; ifv 985,041; at-turret 950,866).
      A 4-voxel tread is a quarter of a pixel in the 64 px sprite, so nothing changes at runtime; what
      changes is that the review sheets stop lying about the shape.
- [x] **B4a batch 4** — `flame-tank` (two 34-radius fuel drums with banding, cradle feet and a
      blast shield on the rear deck; the `barrel` part is a **flared projector** with a pilot light,
      not a gun; 1,041,888 vox / 240 PNG) and `amphibious-tank` (boat hull: gunwale, belt strake,
      splash rails, tapered prow, twin shrouded propellers behind a notched transom, caged snorkel,
      no skirts so the run drains; light thin gun; 1,134,390 / 240).
- [x] **B4a batch 5 — B4a complete** — `mine-layer` (long flat deck under two rows of mine
      canisters, boxy cab with a vision slit and no turret at all, hinged `dispenser` chute over the
      tail; 1,100,777 vox / 192 PNG), `mobile-repair` (workshop box with an open servicing bay and a
      rolled shutter, **lattice crane boom** on an A-frame as its own pivoted part with the hook block
      riding with it; 957,002 / 192), `mine-clearing` (heavy armour built around a transverse **flail
      drum** on braced arms with chains and weights, behind a stepped blast shield over the driver;
      small RWS turret rather than a gun tank; 1,039,226 / 288).
- [x] **B4a remaining** — none. All 13 tracked units are baked.
- [x] **B4b wheeled — complete (6/6)** — a new sub-assembly kit, `kit-wheeled.mjs`, had to exist first:
      tracked gear paints the wheel into the track band, so a wheeled vehicle needs the opposite rule —
      tyres outboard and exposed, hull stopping at a sill line above the wheel tops, a narrower chassis
      between the wheels so the arches appear with no boolean cutting, and mudguards that arc (not a
      flat fender, which reads as a lorry with square arches). `recon` (HUMVEE: exposed tyres, bonnet
      with a winch and grille on the slope, open cargo bay, lattice roll cage, rear ring mount;
      568,488 / 240), `rockets` (MLRS: armoured cassette of 6 tube mouths with retaining rings and dark
      bores on a turntable, cab-over body, deck lockers; 620,154 / 240), `missiles` (SAM: four canisters
      in a 2x2 grid standing nearly upright, each banded and railed, on an A-frame, with a solid radar
      dish on its own post; 860,600 / 288), `supply-truck` (no turret and no barrel at all, flat bed with
      a ribbed olive canvas tilt over arched hoops, hinged `tailgate` part; 816,436 / 192),
      `command-vehicle` (tall ribbed box body, open side hatch with a map table, telescoping `mast` part
      carrying yagi heads and a dish; 685,806 / 192), `aegis` (eight wheels, appliqué flanks, low stepped
      turret with a **flat phased array** — a tilted plate of emissive elements, nothing like the SAM's
      canisters; 668,860 / 240).
- [x] **B4c foot — complete (16/16)** — needed a third kit, `kit-foot.mjs` (a humanoid rig, a quadruped
      and a walker), because infantry is the opposite sculpting problem to armour: 200 voxels tall and
      60 wide, with no hull form to carry the identity. Three channels do all the work instead —
      **proportion** (real shoulder/elbow/hip/knee joints), **headgear and weapon**, and **the load**.
      Every humanoid is `body` + `head` (pivoted at the neck) + `arm.R` (the aiming arm *with* its weapon,
      so an aim animation moves the gun and not just the arm), and every one shares the same standing rig
      so the roster reads as one army.
      `infantry` helmet/rucksack/rifle 63,815; `engineer` hard hat, toolbox carried two-handed, shovel and
      pick 74,568; `medic` white aid panels and red crosses on the **front** as well as the pack, stretcher
      roll 69,158; `rocket-infantry` shoulder tube overhanging both ends 64,113; `aa-infantry` MANPADS
      angled at the sky, seeker head above the helmet 64,579; `sniper` ghillie hood and the longest barrel
      in the game with a bipod 67,170; `grenadier` drum launcher 65,677; `flamethrower` twin standing fuel
      cylinders and a lance 71,427; `demolitionist` sealed suit, charges on the belt, heavy rifle 68,559;
      `commando` beret, radio, SMG — deliberately the emptiest silhouette 62,632; `officer` peaked cap,
      binoculars, map board, rank tabs 66,555; `spy` fedora and a **trench coat as a cone** 70,956;
      `elite-hero` flared cape, pauldrons, crested helmet 101,702; `scout` cap and binoculars up 62,278;
      `attack-dog` quadruped with a raised head, weapon cradle and sensor mast 60,347; `mech` walker with
      reverse-jointed legs and a traversing upper body 127,851 (96 PNG — two parts).
      Foot units carry `minSpan: 60`: the 180-voxel footprint gate exists to catch 64³-scale mistakes, and
      a man is legitimately smaller than that on a 512 lattice.
- [ ] Each asset: sculpt → `validate.mjs` → bake → preview → review.

**Gate per sub-batch:** every asset bakes, budget met, parts present, previews reviewed.

**Rejected approaches, recorded so they are not retried:** `wheeledHull` originally painted the top of
the swept nose with a **deferred `c.paint(predicate)`** on `(x, z)` alone — which also matched everything
*above* the bonnet, so at finish time it silently overpainted the cab, the windscreen and the mirrors of
five vehicles with flat body colour. Deferred paint on a two-axis predicate is unusable near a body
edge; the deck skin is now written as explicit voxels per column. `windscreen` first stepped the glass
*forward* with height, building a forward-leaning visor, and used the pale `glass` material, whose
transparency dither reads as **wire mesh** at sprite scale — a large pane needs a solid dark tint
(`solar`) with a bright reflection streak. The SAM's canisters were first four cylinders at
`256 ± 46 ± 8`, i.e. 16 voxels apart with radius 34, which merged into two oil drums; they only read as
four tubes when the grid is spread on **both** axes. The MLRS cassette's six mouths were first stacked
flush at 12-voxel pitch, which merged into vertical stripes. In B4a, `mine-clearing`'s flail was first built as
a cylinder along **X** with chains radiating in every direction — it read as a spiked ball bolted to the
nose; a flail drum's axis is **transverse (Y)**, with chains hanging round its circumference and the
drum standing *ahead of the tracks*, not over the idler. Its blast shield was also one 8-voxel slab,
which read as a black billboard from every facing, and its engine deck was one dark plate that flattened
the whole vehicle. `mobile-repair`'s boom first held a constant height above its heel, so it floated
detached in mid-air — the chords have to start at the heel and climb aft.

**Air-batch lessons, recorded so they are not retried:** an aircraft authored like a vehicle comes out a
bus — the fuselage has to be *lofted* (stations of half-width/half-height), and the first `copter` read as a
blimp at preview scale because one wide box ran nose to tail. A rotor built from axis-aligned boxes at 45°
is a fan of chips; the blades have to be stamped along their own angle, one chord slice at a time. A large
canopy pane in the pale `glass` material dithers into wire mesh — from a quarter view it has to be
`glass.dark`/`solar` with a bright streak, or `sideGlass` strips down the flanks, because the canopy alone
only reads from the front and 12 of the 16 facings are quarter views. On `lift-copter` the two discs were
first 30 voxels apart, which merged into one grey smudge: tandem hubs need to be far enough apart that each
disc keeps its outline. And an aircraft *fails the default `minSpan: 180` gate*, which exists to catch a
model authored at 64³ — airframes pass `minSpan: 150` explicitly rather than being scaled up to fit.

**Foot-batch lessons, recorded so they are not retried:** a fist-sized glove drawn as a 48-voxel bar
reads as a plank — hands are 12 voxels, and the arm has to *reach* the weapon rather than the weapon being
dragged back to the hand. A 15-voxel-thick arm over a 30-voxel span is a sausage; 11 is a limb. A helmet in
the uniform's own colour just thickens the head into a bucket, so helmets are olive and the hard hat is the
only bright one. A cape or coat built as one vertical slab reads as a board strapped to the back; cloth only
reads if the outline changes with height, so both are stacked, widening slabs (the coat also has to close
*round* the body, not hang behind it). A flamethrower's tanks have to stand up and rise above the shoulders
or the whole load hides behind the torso from every facing. A ghillie hood drawn as a single box round the
head is a cardboard carton. The dog's head has to sit above and forward of the body line. And identity marks
belong on the **front** first: a red cross only on the pack is invisible from most of the 16 facings.
`walker` first had no dynamic part at all; a mech's upper body rotating at the waist both fixes the
validation gate and is the right articulation.

**Open art notes for B4a** — the turret/hull balance is close but not settled: the tank's deck still reads
as a large flat plane at preview scale, and the APC's MG ring is heavy. Both are shape problems, not
pipeline problems, and are cheaper to fix once the rest of the family exists and can be compared side by
side. Newer notes from batch 3: `artillery`'s tube is only ~84 voxels long because the ring sits at
`CX 268` with `halfX 116`, so the gun reaches x500 and barely overhangs the nose — a howitzer wants a
longer tube, which means either a smaller ring or letting the tube exceed the nose. `bastion`'s dozer
blade was cut after two attempts (stacked slabs read as a fence; a ribbed plate hid the whole glacis)
and replaced with a low stepped ram under the nose. `amphibious-tank` is the flattest vehicle in the
family and reads as a barge head-on until the gunwale catches the light; a taller freeboard, or an
open transom with the screws visible from behind, would settle it.

---

## B5 · Air + naval units

- [x] **B5a rotor** — `copter` (235,282 voxels, parts `body`/`rotor`/`tail-rotor`/`gun`), `lift-copter`
      (273,214, `body`/`rotor.front`/`rotor.rear`/`ramp`), `uav` (131,342, `body`/`sensor`/`prop`).
      All three bake 16 facings with albedo/normal/material/depth per part (192/192/144 PNG).
- [x] `kit-air.mjs` — lofted `fuselage` (stations of half-width/half-height), `canopy`, `rotor` (blades
      stamped along their own angle, so a diagonal blade is a real staircase), `tailRotor`, `skids`,
      `wingPair`/`tailPlane`/`fin`, `jetPipe`, `nacelle`, `store`, `sensorBall`, `propDisc`, `bellyHook`.
- [x] Aircraft carry `minSpan: 150`: the default 180 exists to catch a 64³-authored model, and an airframe
      is legitimately thin. 150 still fails a 64³ model by 2×.
- [ ] **B5b jet** — `fighter` (174,567, `body`/`fin` = rudder pair/`stores`), `bomber`, `specter`, `mpa`,
      `ground-attack-jet`, `transport-plane`, `stealth-fighter`, `spy-plane`.
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
- [x] **Review sheet set** — `bake.mjs --sheet-k 4` (`npm run voxels3:sheets:hi`) writes the same
      part/facing renders at 4× into `sheets-hi/`, with pivots and anchors re-projected in hi pixels.
      The gallery composites those instead of magnifying a ~60×43 runtime sheet, which is what made a
      rotated segment look blurry. Review artifact only — the engine keeps reading `sheets/`. Costs
      ~1.5 MB an asset and about doubles bake time; `--sheet-k 0` turns it off.
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
| Units rebuilt at 512³ | 58 | **40** (36 land/foot + 3 rotor + `fighter`) |
| Buildings rebuilt at 512³ | 26 | **2** (`barracks`, `at-turret`) |
| Unit facings | 16 | 16 for every unit |
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
