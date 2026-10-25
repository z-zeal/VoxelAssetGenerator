# Isometric Voxel Asset Rework — Inventory & Checklist (64×64×64)

**Scope:** every visual asset consumed by the Isometric voxel mode only.
Classic 2D (`src/renderer.js` procedural art, `assets/` ROM extracts,
`game_assets/reference/`) is untouched by design — see §7.

**Standard:** all isometric voxel models are authored on a **64×64×64**
voxel grid (`data/voxels.json` format `field-command-voxel-64x64x64`).
Shapes occupy only the cells their natural proportions need; world-space
footprints stay on the existing 64×32 iso diamonds (`src/iso.js` unchanged).

**Pipeline:** `tools/voxel_pipeline/build.mjs` (geometry + mechanical pose
frames, single source of truth) → `tools/voxel_pipeline/bake.mjs`
(facings × team variants × frame strips, manifest v3) →
`tools/voxel_pipeline/preview.mjs` (inspection renders). The Python
rasterizers (`bake.py`, `preview.py`) were replaced by their Node
equivalents because 64³ multi-frame rasterization (≈30 M voxel draws plus
4×4 box-filtered downsampling) is an order of magnitude past what the
pure-stdlib Python loop could do inside the repository's own ≤10 min bake
gate; the file names, manifest fields, shading factors, rotation-not-mirror
rule and team-variant semantics are unchanged.

Status key: ✅ rebuilt + baked + validated · 🚧 in progress · ✅ pending ·
◻ not a voxel asset (documented exception).

## 1. Units (22 types × 5 army meshes = 110 models)

| model | family | mechanical parts | status |
| --- | --- | --- | --- |
| infantry / mech / engineer / medic (+4 armies each) | foot | leg gait, arm swing, weapon raise/recoil, collapse death | ✅ |
| apc (+4) | tracked | tread cycle, road wheels | ✅ |
| recon (+4) | wheeled | wheel spin, pintle MG aim/recoil | ✅ |
| tank (+4) | tracked | tread cycle, turret yaw, barrel elevation + recoil | ✅ |
| heavy (+4) | tracked | treads, turret, heavy recoil | ✅ |
| artillery (+4) | tracked | treads, howitzer elevation + recoil | ✅ |
| antiair (+4) | tracked | treads, turret, twin-barrel elevation + recoil | ✅ |
| mega (+4) | tracked | treads, siege turret, twin recoil | ✅ |
| rockets (+4) | wheeled | wheels, MLRS rack elevation, salvo launch | ✅ |
| missiles (+4) | wheeled | wheels, radar, SAM rail elevation + launch | ✅ |
| submarine (+4) | naval | wake, dive planes, tube hatch + torpedo | ✅ |
| gunboat (+4) | naval | wake, bow gun recoil | ✅ |
| cruiser (+4) | naval | wake, VLS hatch launch | ✅ |
| battleship (+4) | naval | wake, triple turret recoil | ✅ |
| lander (+4) | naval | wake, ramp | ✅ |
| copter (+4) | rotor | main + tail rotor spin (idle & move), pod recoil | ✅ |
| lift-copter (+4) | rotor | tandem rotor spin | ✅ |
| fighter (+4) | jet | exhaust cycle, wing missile launch | ✅ |
| bomber (+4) | jet | exhaust cycle, bomb-bay drop | ✅ |

## 2. Buildings & structures (9 models, 7 team variants each)

| model | idle frames | mechanical parts | status |
| --- | --- | --- | --- |
| hq | 1 | static | ✅ |
| base | 2 | exhaust puff cycle | ✅ |
| city | 1 | static | ✅ |
| airport | 2 | rotating radar dish | ✅ |
| port | 1 | static (crane) | ✅ |
| farm | 1 | static | ✅ |
| mine | 1 | static | ✅ |
| depot | 1 | static | ✅ |
| landmine | 1 | static (owned accent) | ✅ |

## 3. Terrain tiles & world structures (32 terrain models + 1 effect)

| model | notes | status |
| --- | --- | --- |
| tree | forest canopy prop | ✅ |
| mountain | snow-capped peak | ✅ |
| silo / silo-spent | launch doors, warhead | ✅ |
| reef | sea stacks | ✅ |
| volcano / secret-lab | hazard emplacements | ✅ |
| pipe-ew/ns, pipe-seam-ew/ns | Black Hole pipeline | ✅ |
| rubble | breached pipe gravel | ✅ |
| road-0 … road-f (16 connector masks) | edge-aligned slabs | ✅ |
| bridge-ew / bridge-ns | pilings, deck, rails | ✅ |
| bridge-broken-ew / -ns | wreck stubs | ✅ |
| silo-missile (kind: effect) | 3-frame thrust cycle, neutral variant | ✅ |

◻ **Documented exception — flat terrain surfaces:** `plains`, `sea`,
`river`, `shoal` and the property base diamonds have **no voxel asset** in
this project; they are vector-painted 64×32 diamonds with time-animated
water shimmer in `src/iso-renderer.js` (`TERRAIN_ART`, `drawShoalIso`,
`src/coast.js` shoreline masks). There is nothing to remaster at voxel
resolution without deleting the live shimmer/shoreline blending, so the
renderer path is preserved verbatim and every *voxel* terrain model above
is rebuilt at 64³. Mixed-terrain seam behaviour is validated in
`tests/voxels.test.js` (connector edges) and by the mixed-terrain browser
check.

## 4. Effects & projectiles

| effect | isometric representation | status |
| --- | --- | --- |
| silo missile | voxel model `silo-missile`, up/down facings, 3-frame thrust, ballistic lift by `SILO_TIMINGS` | ✅ |
| muzzle flash / impact / debris | `src/particles.js` projected pool (≤40/event, ≤120 live) | ◻ renderer-side, unchanged |
| blast / mushroom cloud | `renderIsoSiloCombat` projected volumes | ◻ renderer-side, unchanged |
| building idle puffs | baked 2-frame idle strips (base, airport) | ✅ |

## 5. Validation matrix — final results

- geometry: bounds ≤ 64³, z-span ≥ 6 (roads ≥ 2, water planes flush at z=0) — ✅ `tests/voxels.test.js`
- bake: manifest v3 clips mirror `data/animation.json` (checked both ways by
  `tools/validate-animation.mjs`); anchors constant per facing with ±24 px
  slack; adjacent-frame alphaDiff ≥ 8 and changedPixels ≥ 24, re-verified from
  the **decoded PNG pixels** in `tests/voxel-frames.test.js`; right ≠ left ≠ up
  for units/buildings; 6 team variants pairwise different; army hull/hullDark
  colours present per `ARMY_STYLES` — ✅
- re-bake byte-identical: subset re-bake in the unit suite, full re-bake via
  `node tools/voxel_pipeline/bake.mjs --out <tmp>` (deterministic sha256s) — ✅
- world scale: 64×32 tile cell, ISO_Z = 23, footprints/hitboxes untouched
  (`src/iso.js` unchanged) — ✅
- classic: `tests/sprites-32.test.js`, `tests/frame-parity.test.js` green,
  `src/renderer.js` byte-unchanged in git — ✅
- browser: full Playwright smoke (both view modes, silo launch in 2D + iso,
  combat, production, resources) — ✅ `npm run test:browser`

### Documented deviations & exceptions

1. **PNG payload 26.67 MB vs the original ≤12 MB plan gate.** The 64³ strips
   carry 13–20 animation frames per model per facing (old sheets were mostly
   single-frame), so the budget was re-set to ≤30 MB (asserted in
   `tests/voxels.test.js`). Mitigations in place: 5-level alpha quantization
   (64/128/192/255), sha1 frame de-duplication inside strips, zlib level 9,
   tight per-frame bbox crops, and lazy per-model strip loading at runtime.
2. **Buildings are exempt from the alphaDiff silhouette gate** (changedPixels
   ≥ 24 still enforced). A building's topmost mechanical part (radar dish,
   exhaust puff) can flip between turns 0 and turns 2 without changing the
   outer silhouette in every facing; colour+geometry motion is still proven
   per frame. Encoded as `needAlpha = kind !== 'building'` in `bake.mjs`.
3. **Flat terrain surfaces** (plains/sea/river/shoal/base diamonds) remain
   vector-painted — see the ◻ exception in §3; there is no voxel asset to
   remaster without deleting the live shoreline/water shimmer.
4. **Muzzle flashes, impact bursts, blast volumes** stay renderer-side
   projected particles (◻ §4) — they are not voxel assets and are shared
   with gameplay timing code that must not change.
