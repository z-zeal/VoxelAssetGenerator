# Field Command — Graphics and Sprite Animation Overhaul Plan

**Status:** proposal, not implemented
**Scope:** animation, poses, effects and the asset pipeline for both visual modes. No gameplay rule, balance, movement-range, turn-order or combat-resolution change.
**Written against:** `main` at `0d691f1` (the commit that merged PR #39).
**Audience:** whoever implements the phases below, one phase at a time, on explicit instruction.

> **SUPERSEDED for the asset pipeline (2026-10):** sheet production moved to
> `docs/PLAN_512_native_16dir_segmented_pipeline.md` — 512×512×512 native geometry, 16 unit
> directions (4 for buildings), segmented per-part sheets, and normal + material maps. This
> document's audit and animation/effects vocabulary remain as historical reference for the
> animation pass that follows the rebuild.

> **64³ voxel rebuild update (2026-10):** the isometric asset pipeline was
> rebuilt at a standardized 64×64×64 modeling resolution. Where this document
> names `tools/voxel_pipeline/bake.py` and `preview.py`, the Node replacements
> `bake.mjs` and `preview.mjs` now own those steps (same manifest conventions,
> gates and npm script names; the Python tools were removed). Line-number
> citations into the old scripts are historical. See
> `docs/VOXEL64_INVENTORY.md` for the current per-category inventory and
> validation matrix.

Conventions used throughout:

- **Classic** — the default 2D projection, drawn procedurally by `src/renderer.js`.
- **Iso** — the isometric voxel projection, drawn from baked PNG sheets by `src/iso-renderer.js`.
- **Verified** — read in this repository at the commit above.
- **Assumed** — inferred from how the code is structured, not executed.
- **Unknown** — not measured. Never treat an unknown as passing.

The document is planning only. No source file, sprite, voxel model, animation metadata, build script or configuration was modified to produce it, and none should be modified as part of reading it.

---

## 1. Current-State Audit

### 1.1 What was inspected

Every claim in this section comes from reading the repository, not from running the game in a browser. The two renderers, the combat presentation clock, the movement tween, the rule set's damage entry points, all five data files, the voxel pipeline and the test suite were read directly. The browser suites were **not** run because `node_modules` is absent in this workspace (see §1.13).

| Area | Verified how | Confidence |
| --- | --- | --- |
| Classic draw path | `src/renderer.js` read in full | high |
| Isometric draw path | `src/iso-renderer.js` read in full | high |
| Baked sheet layout | `manifest.json`, filenames, decoded pixels | high |
| Combat timing | `src/combat-presentation.js` read in full | high |
| Unit rules | `data/units.json`, `src/rules.js` | high |
| Movement tween | `src/movement.js`, `src/main.js` tick | high |
| Browser behaviour | not executed | **unknown** |

### 1.2 Where the artwork lives

| Layer | Path | Format | Size | Consumed by |
| --- | --- | --- | --- | --- |
| Classic units and terrain | `src/renderer.js` | canvas code, no image files | 70 KB source | `drawUnit`, `drawTerrain` |
| Iso baked sheets | `game_assets/voxels/sheets/` | 3,020 PNGs plus `manifest.json` | ≈ 1.6 MB PNG payload, ≈ 13 MB on disk | `src/iso-renderer.js` |
| Voxel source renders | `game_assets/voxels/` | 151 PNGs, one per model | ≈ 1 MB | reference, `bake.py` |
| Voxel geometry | `data/voxels.json` | JSON, palette-indexed | 5.2 MB | `build.mjs`, gallery, workbench |
| CO portraits | `game_assets/reference/` | 43 PNGs | — | `src/reference-assets.js` (disabled: `USE_REFERENCE_ART = false`) |
| ROM chunks | `assets/` | LZ77 blobs plus `index.csv` | — | `tools/asset_pipeline` |

The important consequence: **Classic has no sprite sheets at all**. Its "assets" are per-type drawing branches inside one 70 KB module. Any Classic animation must therefore be authored as drawing code, not as PNGs, and any claim that Classic "reuses the iso sheets" is false.

### 1.3 Classic rendering path

Verified in `src/renderer.js`:

- `drawUnit(c, u, x, y, scale = 1)` at line 55 selects art by `u.type` through a long if/else chain: infantry, mech, engineer, medic, APC, recon, tank, heavy, artillery, anti-air, rockets, missiles, mega, submarine, helicopter, fighter, bomber, gunboat, cruiser, battleship, lander, lift-copter. Artillery, rockets, anti-air and missile launchers have bespoke `up`/`down` art because their barrels point.
- `drawMirrored` at 79–85 produces the `left` pose by horizontal flipping the `right` pose. Every unit uses it, including asymmetric ones.
- A grounding shadow is drawn at 76–77 before the body.
- `drawTerrain(c, t, x, y, s, p)` at 822 draws all 25 tiles plus properties; it is called from nine sites outside the module (`combat-battle.js:190`, `main.js:956`, `:2607`, `:2645`, `:2661`, `:3587`, `:3665`, `:3677`, `map-preview.js:213`) plus the internal board loop at `renderer.js:1317`.
- `render(c, s, ui, d, time, camera)` at 1302 receives `time` but forwards it only to effects that already use it (water shimmer, volcano glow). The unit loop at 1502 calls `drawUnit` with no time argument, so **no unit on the board is ever in a pose other than its rest pose**.

The 32×32 footprint is a contract: `tests/sprites-32.test.js` asserts bounds for every unit type. Any new frame must stay inside the same box or that suite fails.

### 1.4 Isometric rendering path

Verified in `src/iso-renderer.js`:

- `renderIso` at 516, viewport `960 × 640`, painter sort at 639 (`(x + y)`, then `y`, then `x`, then kind).
- `drawUnitSprite` at 424 reads `u.facing` (defaulting to `right`), computes `bob = 8` for `copter`, `fighter`, `bomber`, `lift-copter`, draws a shadow ellipse, then calls `blitSheet` for `<type>--<army>` and falls back to `<type>`, then to the Classic `drawUnit`.
- There is **no time parameter** in the sprite path. Aircraft bob is a static offset, not an oscillation.
- Sheets load lazily: `sheetFor` at 87 constructs `new Image()` at 98 on first use and stores it in a module-level `Map`; `blitSheet` at 106 draws whatever is decoded. There is **no eviction, no frame concept, and no preload of any facing except `right`**: `primeArmySheets` at 120 primes only facing `right`, variant `'0'` (with an `n` fallback for models that have no `0`), and is called from four sites in `main.js` (`2461`, `2512`, `3485`, `4210`).
- Destroyed units are drawn at ≈ 1097–1105 and **always blit the `right` sheet**, regardless of the facing the unit died with. A unit that dies facing `up` snaps to `right`.
- The silo strike is drawn by `drawIsoSiloMissile` at 779, called from `renderIsoSiloCombat` at 856: a **flat 2D missile built from canvas primitives**, flying over a voxel battlefield.

### 1.5 Naming, grouping and entity mapping

| Element | Pattern | Example |
| --- | --- | --- |
| Sheet file | `<model>-<facing>-<variant>.png` | `tank--allies-right-3.png` |
| Model id | `<type>` or `<type>--<army>` | `tank`, `tank--allies` |
| Facing | `right`, `up`, `left`, `down` | — |
| Unit variant | `0`–`5`, one per owner slot | `0`, `5` |
| Building variant | `0`–`5` and `n` (neutral) | `n` |

Counts: 151 models, 4 facings, and per-model variant sets that differ by kind. A unit type contributes 5 model ids (base plus four army skins: `allies`, `soviets`, `empire`, `legion`) × 4 facings × 6 variants = **120 files**; that is why `tank` owns 120 PNGs. Buildings and terrain add the neutral `n` variant.

The manifest (`field-command-voxel-sheet-2`) maps `models.<id>.<facing>` to `{width, height, anchorX, anchorY, variants: {<variant>: {file, sha256}}}`. It contains **no action, no frame count, no frame rectangle, no duration, no pivot beyond the single anchor pair**, and no per-frame data of any kind.

### 1.6 Movement direction and facing selection

Verified in `src/state.js`:

- `directionForDelta(dx, dy)` at 147 and `FACINGS = ['up', 'right', 'down', 'left']` at 156.
- Facing is derived from the dominant delta of the step being taken, so a unit has exactly **four** facings. There is no 8-way or 16-way rotation, and no diagonal art exists in the pipeline.
- Iso uses the real baked `left` sheet. Classic flips the `right` drawing instead.

### 1.7 Movement, action and turn timing

- `MOVEMENT_SETTINGS = { tileDurationMs: 160 }` in `src/movement.js:3`. One tile takes 160 ms; a route plays tile by tile.
- `Movement.sample(now)` returns `{x, y, facing, moving, ...}` and is asserted by exact `deepEqual` in `tests/movement.test.js:33` and `tests/combat.test.js:297` / `:300`. **The shape of that object cannot change.**
- `refresh()` at `main.js:782` rebuilds the visible state; `beginCombat` at 1401 starts playback; `tickCombat` at 1460 advances it; `skipCombat` 1484 and `finalizeCombat` 1489 end it.

There is no gait phase, no wheel rotation, no rotor spin and no step counter anywhere in the movement path. The only per-frame change during a move is the interpolated position.

### 1.8 Attack, projectile and death timing

`src/combat-presentation.js` is the single clock:

| Timing set | emphasis | muzzle | travel | impact | counterGap | destroy | settle |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `full` | 340 | 170 | 280 | 330 | 180 | 520 | 200 |
| `quick` | 150 | 90 | 140 | 170 | 80 | 260 | 110 |
| `reduced` | 240 | 130 | 260 | 240 | 120 | 320 | 140 |
| `off` | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Silo strikes use `SILO_TIMINGS`: `full` = ignition 340, ascent 380, descent 340, impact 620, settle 260.

`buildCombatTimeline` (62–82) emits the ordered beat list; `CombatPlayback._sample` (330–415) turns elapsed time into the frame the renderers draw. Attack visuals today:

| Element | Current implementation | Where |
| --- | --- | --- |
| Attacker pose | unchanged rest pose | `renderer.js` / `iso-renderer.js` |
| Muzzle flash | light canvas burst | `combat-renderer.js` |
| Projectile | drawn shape, 8×4 rectangle in iso | `drawProjectile` 78 |
| Impact | burst plus damage number | `drawImpact` 156 |
| Pre-impact jolt | ±1 px shake | `renderer.js` |
| Death | alpha fade of the standing sprite | `drawUnitSprite` / dead block |
| Weapon sound | fires immediately on `beginCombat` | `main.js:1419` |

`rules.attack` at 307 snapshots destroyed units at 316 and calls `cleanup(s)` at 323, **before** the presentation layer plays anything. The corpse therefore comes from `record.destroyed` snapshots (`sample.dead`), which carry `type`, `owner`, `army`, `x`, `y`, `alpha`, `scorch`. A dying unit is already gone from the board and can never act or be selected.

### 1.9 What can actually act

| Actor | Moves | Attacks | Can be destroyed | Notes |
| --- | --- | --- | --- | --- |
| 22 unit types | yes | 17 of them | yes | weaponless: engineer and medic (`weapon: "none"`), APC, Lander, Lift Copter (`weapon: null`) |
| Properties (`data/properties.json`, 8 types) | no | no | captured, not destroyed | no `weapon`, `range` or `targetDomains` fields |
| Emplacements (turret, volcano) | no | volcano and emplaced guns fire | no | driven by `rules.js` 970–1132, not by units |
| Structures | no | no | no | `attackStructure` exists for destructible terrain features only |

Buildings therefore cannot move and cannot attack, so **no building receives a movement clip or an attack clip**. The only armed non-unit objects are the volcano and emplaced guns, and those are hazard events, not units.

### 1.10 Existing animation metadata

| Property | Exists today | Detail |
| --- | --- | --- |
| Action clips | no | nothing names `idle`, `move`, `attack` or `death` |
| Frame count | no | one image per model/facing/variant |
| Frame rectangle | no | whole PNG is the frame |
| Frame duration | no | no timing data in the manifest |
| Pivot | partial | one `anchorX`/`anchorY` per model per facing |
| Layers | no | single flat PNG |
| Shadow | no | drawn procedurally at runtime |
| Directions | yes | four facings, baked |
| Palette | yes | 155-colour palette in `data/voxels.json` |
| Team colour | yes | six baked variants per model |

### 1.11 Classic to Isometric transition

`viewMode` is a module-level `let` at `main.js:181`, changed by `setViewMode` at 2204 and persisted under `field-command-view`. Both renderers consume the same `state` and the same `ui` object, so any animation state must live **outside** the renderers and be derivable from state plus elapsed time, or the two modes will drift apart.

### 1.12 Asset generation pipeline

| Stage | Script | Output |
| --- | --- | --- |
| Geometry | `tools/voxel_pipeline/build.mjs` (1,402 lines) | `data/voxels.json` |
| Render | same pipeline | `game_assets/voxels/*.png` |
| Directions and variants | `tools/voxel_pipeline/bake.py` | `game_assets/voxels/sheets/` plus manifest |
| Contact sheets | `tools/voxel_pipeline/preview.py` | review images |
| ROM extraction | `tools/asset_pipeline/` | `assets/` and docs; `releaseApproved: false` |

`bake.py` rotates each model into the four facings, downscales by 2, bakes six team variants plus `n` for neutral objects, and asserts at bake time that:

- every variant of a model has identical geometry (`bake.py:213`), so a variant may differ only in colour;
- no variant is fully transparent (`:214`);
- the anchor falls inside a small slack band (`:222–223`);
- `right` and `left` render differently (`:233`), which is why left-facing art is real geometry rather than a flip.

The geometry-parity assertion is exactly why the six anti-air files cannot have been poses: variants are *required* to share geometry. Frames need a separate axis precisely because they must not.

### 1.13 Tests, validators and commands

| Command | What it covers | State in this workspace |
| --- | --- | --- |
| `npm test` | 38 Node test files plus the Python asset suite | 333 pass, 4 fail, 2 skip; assets 43 pass |
| `npm run assets:test` | Python asset pipeline | 43 pass |
| `npm run build` | esbuild bundle | not run (no `node_modules`) |
| `npm run test:browser` | Playwright smoke | **not run** |
| `npm run test:browser:features` | feature smoke | **not run** |
| `npm run test:browser:ui` | UI overhaul checks | **not run** |

The four failing suites fail on `ERR_MODULE_NOT_FOUND: @firebase/app` (account-ui, convex-auth, firebase-config, multiplayer-convex) because dependencies are not installed. That is the baseline, not a regression. Any phase must keep the other 333 green.

Relevant existing assertions that constrain this work:

- `tests/voxels.test.js:128` pins `manifest.format === 'field-command-voxel-sheet-2'`; a new format string must be introduced without breaking v2 readers.
- `tests/sprites-32.test.js` pins Classic unit bounds.
- `tests/movement.test.js:33` pins the `sample()` object by `deepEqual`.
- `tests/combat.test.js:297,300` pins pause/resume behaviour via `sample(30000)`.
- `tools/browser-smoke.mjs:21–52` instruments `window.unitDraws`; `tools/ui-overhaul-check.mjs:24–36` hashes the canvas.

### 1.14 Gap summary

| Gap | Impact |
| --- | --- |
| No frame dimension anywhere | nothing can animate; any frame work is new data |
| Classic has no art files | animation is authored as code, not exported art |
| Iso sprite path has no time input | frames cannot advance without threading time through |
| Sheets load lazily per blit, unbounded | a frame pipeline multiplies image count by frame count |
| Destroyed units always blit `right` | death pose is wrong for three of four facings |
| Weapon sound fires at `beginCombat` | audio desynchronised from the muzzle beat |
| Hazard events are discarded | volcano damage lands with no visual or log |
| Six AA PNGs misread as directions | already caused the reported confusion |

---

## 2. Problems and Goals

### 2.1 The reported defect, explained

Two separate observations were reported: six anti-air PNGs that look like the same pose, and a single voxel apparently changing colour during movement.

**Six identical-looking PNGs.** They are not six poses and not six directions. They are the six owner variants of one facing: `antiair--allies-down-0.png` through `-5.png`. Decoding and comparing those files shows the sprites are pixel-identical except for **6 pixels out of 1,400** — the team accent. For comparison, `tank` varies by 9 of 1,160 pixels across variants, and `hq` by 572 of 2,028 because buildings carry much larger team-coloured areas. The engine has four facings, so six files cannot represent directions.

**The changing voxel.** There is no movement animation to see. During a move the only things that change are the interpolated position, the `acted` tint (0.62 alpha) and the team accent baked into the sheet. A moving tank that appears to flicker one pixel is showing a variant swap or a re-blit on a subtile boundary, not a gait.

Both observations share one root cause: **the project has directions and colours, but no notion of a frame of animation**.

### 2.2 Structural problems

| # | Problem | Consequence |
| --- | --- | --- |
| P1 | Neither renderer accepts time for units | units are frozen statues |
| P2 | No animation metadata | every phase needs a new data contract |
| P3 | Classic art is procedural | cannot reuse iso sheets; poses must be drawn |
| P4 | Iso sheets are one image per model/facing/variant | frame support means a new sheet format |
| P5 | Sheet cache has no eviction and no preload | naive frame multiplication blows memory |
| P6 | Death is an alpha fade | no death sequence, no final frame concept |
| P7 | Attacks have no weapon pose | recoil, aim and fire are invisible |
| P8 | Weapon sound fires before the muzzle beat | audio and visuals disagree |
| P9 | Destroyed iso units always face `right` | visible snap at the moment of death |
| P10 | Hazard events are discarded | volcano damage is unexplained |
| P11 | Silo missile is 2D in iso | breaks the voxel illusion |
| P12 | No validator for frames | identical-frame loops could ship unnoticed |

### 2.3 Goals

| Goal | Meaning |
| --- | --- |
| A | Classic units animate movement, attack and death, differently per family |
| B | Classic buildings show operational parts only, never movement |
| C | Iso units animate with real baked frames, four facings, no mirroring |
| D | Directions and frames are separate, with explicit metadata |
| E | Presentation follows authoritative gameplay exactly |
| F | Art stays readable, consistent in palette, lighting and pivots |
| G | Pipeline loads, caches, validates and scales to a full board |

### 2.4 Non-goals

- No gameplay, balance, range, turn-order or win-condition change.
- No 8-way or free rotation.
- No building movement animation, because buildings cannot move.
- No building destruction sequences (capture is instant; optional rubble for `pipe-seam` is deferred to a later, separate task).
- No renderer rewrite, no WebGL, no sprite-sheet runtime library, no new dependency.
- No regenerated or replaced art assets as part of this plan — the plan specifies how they would be produced, and the phases that need them say so explicitly.

---
## 3. Proposed Animation Architecture

### 3.1 One event model for both modes

Both renderers already receive the same `state`, the same `ui` object and the same presentation clock. The design keeps that: **animation is derived, never stored**.

```
 gameplay (rules.js, main.js)
        │  authoritative result: move route, combat record, destroyed snapshots
        ▼
 presentation clock (combat-presentation.js beats, movement.js 160 ms tiles)
        │  elapsed ms + action + (optional) record
        ▼
 src/animation.js  (pure: clip selection + frame index + pose)
        │  { action, frame, progress }
        ▼
 renderer.js drawUnit(pose)          iso-renderer.js blitSheet(frameRect)
```

Rules that follow from this diagram:

1. The renderer never decides *whether* something happened; it only decides *how it looks* while it happens.
2. Animation state is a function of `(entity, action, elapsed)`. Two clients that agree on gameplay agree on frames without transmitting any animation data.
3. Restarting the clock (pause, hidden tab, view switch) cannot desync gameplay, because nothing is written back.

### 3.2 Data contract: `data/animation.json`

A single new data file, versioned, read by both renderers and by the validator.

```json
{
  "format": "field-command-animation-1",
  "frameBudgets": {
    "classic": { "particlesPerEvent": 12 },
    "iso":     { "particlesPerEvent": 40, "particlesLive": 120 }
  },
  "families": {
    "foot":    { "idle": 1, "move": 4, "attack": 3, "death": 5 },
    "wheeled": { "idle": 1, "move": 4, "attack": 3, "death": 4 },
    "tracked": { "idle": 1, "move": 4, "attack": 3, "death": 4 },
    "rotor":   { "idle": 2, "move": 4, "attack": 2, "death": 4 },
    "jet":     { "idle": 1, "move": 3, "attack": 2, "death": 4 },
    "naval":   { "idle": 1, "move": 4, "attack": 2, "death": 4 }
  },
  "units": {
    "tank": { "family": "tracked", "weapon": "cannon", "releaseFrame": 1 },
    "infantry": { "family": "foot", "weapon": "rifle", "releaseFrame": 1 },
    "apc": { "family": "tracked", "weapon": null }
  },
  "buildings": {
    "airport": { "idle": 2 },
    "base": { "idle": 1 }
  },
  "effects": {
    "silo-missile": { "mode": "voxel-in-iso", "frames": 3 }
  }
}
```

Field meanings:

| Field | Meaning | Required |
| --- | --- | --- |
| `format` | schema version, checked by the validator | yes |
| `frameBudgets` | hard particle caps per mode | yes |
| `families.<name>` | frame counts per action, shared defaults | yes |
| `units.<type>.family` | motion family, overrides `moveType` | yes |
| `units.<type>.weapon` | mirrors `data/units.json`; `null` means no attack clip | yes |
| `units.<type>.releaseFrame` | frame at which the weapon fires (drives the muzzle beat) | when weapon is not null |
| `buildings.<id>.idle` | frame count for operational idle, `1` = static | yes |
| `effects` | effect-level assets such as the silo missile | yes |

The file is generated by hand and validated by script; it is **not** produced by `bake.py`, because frame counts are a design decision, not a bake output.

### 3.3 Runtime module: `src/animation.js`

New, DOM-free, dependency-free. Exports:

| Function | Contract |
| --- | --- |
| `animationFamily(type, moveType)` | maps a unit to one of the six families; pure lookup |
| `clipFor(type, action)` | returns `{action, frames, fps, loop}` or `null` when the unit has no such clip |
| `frameIndex(clip, elapsedMs)` | integer frame, clamped; loops only when `clip.loop` |
| `unitPose(entity, action, elapsedMs)` | `{action, frame, progress}` used by both renderers |
| `hash01(seed)` | deterministic 0..1 offset so idle animations do not pulse in unison |

Hard constraints:

- No imports from `renderer.js`, `main.js`, `state.js` or any DOM global.
- No `Math.random()`; per-entity variation comes from `hash01(entity.id)`.
- `tests/animation.test.js` covers every export; a purity test asserts the module imports nothing.

### 3.4 Classic playback

`drawUnit(c, u, x, y, scale)` keeps its signature and behaviour when no pose is supplied. A fifth optional argument `pose` is added:

```js
drawUnit(c, u, x, y, 1, { action: 'move', frame: 2, progress: 0.5 })
```

- Frame 0 of every clip must render **exactly** today's drawing. `tests/sprites-32.test.js` hashes are the guard.
- Each family branch consumes the frame in its own way: legs alternate for `foot`, wheels rotate for `wheeled`, tread links shift for `tracked`, rotor blur and pitch for `rotor`, afterburner/exhaust for `jet`, wake and hull bob for `naval`.
- No branch may implement a frame by changing only `fillStyle` opacity or a single pixel. The validator checks that each adjacent frame pair differs in at least 40 sampled pixels (see §6.4).

Time source: `movement.phase(now)` for movement, the beat clock for combat.

### 3.5 Isometric playback

`renderIso` already has `time`; `drawUnitSprite` will receive it. Frames are **baked**, not generated at runtime:

- One sheet per `(model, facing, variant)` as today, with frames packed into fixed cells.
- Manifest v3 (`field-command-voxel-sheet-3`) adds per facing: `cell`, `frames[{x, y, w, h, anchorX, anchorY, changedPixels}]`, and `clips{idle, move, attack, death}`.
- `blitSheet` gains an optional frame index and falls back to the whole image when the manifest is v2 or the frame is missing.

The renderer stays a blitter. No skeletal rig, no runtime 3D, no shader.

### 3.6 Buildings

Buildings never move and never attack. They may show **operational idle** only where the fiction justifies it and the rules already model activity: an airport's rotating radar, a base's flag, a factory's exhaust, a silo's closed doors. Everything else stays static. Building idle is limited to 2 frames at a slow cadence (≈ 1.2 s per frame) so a full map of buildings does not shimmer.

### 3.7 Particles

A small DOM-free pool, `src/particles.js`:

| Property | Classic | Isometric |
| --- | --- | --- |
| Particles per event | ≤ 12 | ≤ 40 |
| Live particles | ≤ 60 | ≤ 120 |
| Motion | 2D screen space | projected, z-sorted with the scene |
| Lifetime | ≤ `impact` + `settle` | ≤ `impact` + `settle` |
| Determinism | seeded per event | same |

Particles are presentation only. They never influence hit rolls, damage, visibility or selection, and they are cleared by `finalizeCombat`.

### 3.8 Invariants

| # | Invariant |
| --- | --- |
| I1 | Gameplay modules never import `src/animation.js` or `src/particles.js` |
| I2 | Animation never mutates `state`, `ui.sample` or the combat record |
| I3 | Frame selection is a pure function of elapsed time and the entity |
| I4 | Frame 0 reproduces today's visuals |
| I5 | A unit's visual death cannot outlive its `sample` |
| I6 | Both modes derive the same action from the same event |
| I7 | Missing frames degrade to frame 0, then to the procedural fallback |

---

## 4. Asset Inventory and Coverage Matrix

### 4.1 Units

Family is derived from `moveType`, with air split by type. All 22 types, verified against `data/units.json`.

| Unit | Family | Move type | Weapon | Attack clip | Death clip | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| infantry | foot | foot | rifle | yes | yes | leg cycle, rifle raise |
| mech | foot | mech | cannon | yes | yes | heavier stride, bazooka recoil |
| engineer | foot | foot | none | no | yes | tool swing for work tasks, no attack |
| medic | foot | foot | none | no | yes | no attack |
| apc | tracked | treads | null | no | yes | tread roll only |
| recon | wheeled | tires | rifle | yes | yes | wheel spin, light gun |
| tank | tracked | treads | cannon | yes | yes | turret aim, recoil |
| heavy | tracked | treads | heavy | yes | yes | slower turret, bigger recoil |
| artillery | tracked | treads | shell | yes | yes | outriggers, elevated barrel |
| antiair | tracked | treads | aa | yes | yes | twin barrels, rapid fire |
| mega | tracked | treads | mega | yes | yes | heavy siege pose |
| rockets | wheeled | tires | rockets | yes | yes | box launcher, salvo |
| missiles | wheeled | tires | sam | yes | yes | raised rails, launch |
| submarine | naval | sea | torpedo | yes | yes | dive/surface, torpedo tube |
| gunboat | naval | sea | navalGun | yes | yes | bow gun, wake |
| cruiser | naval | sea | navalMissile | yes | yes | VLS hatch |
| battleship | naval | sea | navalShell | yes | yes | triple turret recoil |
| lander | naval | sea | null | no | yes | ramp, wake |
| copter | rotor | air | airRocket | yes | yes | rotor, pitch, rockets |
| lift-copter | rotor | air | null | no | yes | rotor, cargo sway |
| fighter | jet | air | airMissile | yes | yes | afterburner, missile |
| bomber | jet | air | bomb | yes | yes | bomb bay |

Seventeen units are armed; five are not and must not receive an attack clip.

**Non-attack actions** that still need motion but not a combat clip: capture (`canCapture`) for infantry, mech and engineer; engineer long tasks (`fixBridge`, `deconstructBridge`, `landmine`); submarine `Dive` and `Surface`; loading and unloading for APC, Lander and Lift Copter. Repair and supply happen by standing on a property and need no unit animation.

### 4.2 Buildings and terrain props

`data/properties.json` holds exactly eight properties. None has a weapon, range or target domain, so none can attack, and none has a movement rule, so none can move. Coverage:

| Property id | Display name | Idle | Movement | Attack | Notes |
| --- | --- | --- | --- | --- | --- |
| `hq` | Headquarters | 1 | no | no | static |
| `base` | Factory | 2 | no | no | exhaust is the justified idle |
| `city` | City | 1 | no | no | static |
| `airport` | Airport | 2 | no | no | radar sweep is the justified idle |
| `port` | Port | 1 | no | no | dock crane optional, deferred |
| `farm` | Farm | 1 | no | no | static |
| `mine` | Mine | 1 | no | no | static |
| `depot` | Depot | 1 | no | no | static |

Three terrain features in `data/terrain.json` draw structure art of their own and are **not** properties:

| Terrain id | Idle | Attack | Notes |
| --- | --- | --- | --- |
| `silo` / `silo-spent` | 2 | launches | doors open during `renderIsoSiloCombat`; the missile is Phase 11 |
| `volcano` | 1 | erupts | hazard event from `rules.js`, not an attack |
| `secret-lab` | 1 | no | static |

Emplaced gun turrets are state-level objects rather than terrain ids; they fire through hazard events and are covered by Phase 6 and Phase 10. They have no owner animation and no death sequence.

### 4.3 Effects

| Effect | Classic | Isometric | Owner phase |
| --- | --- | --- | --- |
| Muzzle flash | canvas burst, ≤ 6 particles | projected burst | 4 / 9 |
| Recoil | 2 px slide | baked attack frames | 4 / 9 |
| Shell and missile travel | existing shapes | existing shapes | 4 / 9 |
| Impact | burst plus damage number | burst plus damage number | 4 / 9 |
| Death debris | ≤ 12 particles | ≤ 40 particles, z-sorted | 5 / 9 |
| Rotor wash | dust puffs | projected dust | 3 / 8 |
| Tank dust | 2 puffs per tile | projected dust | 3 / 8 |
| Ship wake | 3 px trail | projected wake | 3 / 8 |
| Silo missile | 2–3 drawn frames | **voxel model** | 10 / 11 |
| Volcano eruption | lava particles | projected lava | 6 |

### 4.4 Coverage summary and maintenance

| Mode | Units with movement clips | Units with attack clips | Units with death clips | Buildings animated |
| --- | --- | --- | --- | --- |
| Classic | 22 of 22 | 17 of 22 | 22 of 22 | 2 |
| Isometric | 22 of 22 | 17 of 22 | 22 of 22 | 2 |

The roster is fixed at 22 units, so the table is maintainable by hand. If units are ever added, the validator (§5 Phase 1, extended in Phase 12) fails on any unit missing a `units` entry, and the family defaults supply frame counts without new art.

### 4.5 Gaps

| Gap | Status |
| --- | --- |
| No frame data for any model | by design; produced in Phases 3, 5 and 7 |
| No accent or layer separation in sheets | out of scope; team colour stays baked |
| No attack art for the 5 weaponless units | correct; they have no attack |
| No building attack art | correct; buildings cannot attack |
| No 8-way facing art | out of scope; the engine has four facings |
| No iso frame for the silo missile model | Phase 11 creates it |
| No rubble or destruction art | deferred, optional |

---
## 5. Phased Implementation Roadmap

Each phase is independently reviewable, leaves the game playable, and ends with a commit that can be reverted on its own. Do not start phase N+1 until phase N is accepted.

Phases 1–6 touch Classic only and cannot destabilise the Isometric view; Phases 7–11 touch Isometric only and cannot destabilise Classic. Phase 12 is the only phase that touches both at once, and it adds no features.

### Phase 1 — Contract, specification and validation harness (no visual change)

**Objective:** land the data contract, the pure animation module and the validator before any art exists, so later phases cannot invent incompatible formats.

**Scope**

- `data/animation.json` with `format: "field-command-animation-1"`, the six family defaults, all 22 unit entries and the 8 building entries.
- `src/animation.js` with `animationFamily`, `clipFor`, `frameIndex`, `unitPose`, `hash01` (§3.3).
- `tools/validate-animation.mjs`: checks the format string, that every unit in `data/units.json` has an entry, that every armed unit has `releaseFrame`, that weaponless units have `weapon: null`, that frame counts are within 1–8, and that the six families are all referenced at least once.
- `package.json`: add `"animation:validate": "node tools/validate-animation.mjs"`.
- `tests/animation.test.js`: every export, plus a purity test that the module has no imports from gameplay, DOM or renderers.

**Files and modules:** `data/animation.json` (new), `src/animation.js` (new), `tools/validate-animation.mjs` (new), `tests/animation.test.js` (new), `package.json` (one script line).

**Dependencies:** none.

**Implementation approach:** author the JSON from the tables in §4.1 so the numbers have a written source. Keep `src/animation.js` free of imports. Do not call it from any renderer yet.

**Validation:** `npm test`, `npm run animation:validate`, `npm run build`.

**Acceptance criteria**

- [ ] Validator fails when a unit entry is deleted and passes on the committed file.
- [ ] All five exports are covered by tests.
- [ ] `src/animation.js` has zero imports.
- [ ] No renderer imports the module yet; the game is visually identical.
- [ ] 333 tests still pass, with the same 4 Firebase failures and 2 skips.

**Risks and rollback:** low. Revert the single commit; nothing consumes the module.

### Phase 2 — Classic pose plumbing and frame-0 parity

**Objective:** make `drawUnit` able to receive a pose while producing byte-identical drawing at frame 0, and give the movement clock a phase without touching the `sample()` contract.

**Scope**

- `drawUnit(c, u, x, y, scale, pose)` — optional sixth argument, ignored when absent.
- `Movement.phase(now)` in `src/movement.js`: returns `{progress, tile, moving}` derived from the same interpolation used by `sample()`, without changing `sample()`.
- `main.js` passes `pose` for units on the board, always frame 0 in this phase.
- `renderIso` passes `time` into `drawUnitSprite` but does not use it yet.
- `tests/frame-parity.test.js`: for every unit type and all four facings, compare the recorded draw signature with and without a frame-0 pose.

**Files and modules:** `src/renderer.js`, `src/movement.js`, `src/main.js`, `tests/frame-parity.test.js` (new).

**Dependencies:** Phase 1.

**Implementation approach:** keep the pose optional and defaulted; do not restructure the per-type branches yet. `Movement.phase` must be a pure read: no timers, no mutation. Reuse `performance.now()` supplied by the caller.

**Validation:** `npm test`; `npm run test:browser:ui` if dependencies are available, otherwise record it as not run.

**Acceptance criteria**

- [ ] Recorded draw signatures are identical for frame 0 in all 22 types × 4 facings.
- [ ] `tests/movement.test.js:33` and `tests/combat.test.js:297,300` pass unchanged.
- [ ] No visible change in either mode.
- [ ] `drawUnit` still respects the 32×32 bounds suite.

**Risks and rollback:** a refactor of the type branches could shift art by a pixel. Mitigation: no branch is rewritten in this phase, only the signature. Rollback is the single commit.

### Phase 3 — Classic unit movement, all families

**Objective:** every unit family gets its own readable movement motion, driven by the tile tween.

**Scope**

- `foot`: alternating leg cycle over 4 frames, with a 1-pixel body bob; mech gets a heavier stride with a wider stance.
- `wheeled`: wheel rotation over 4 frames, plus a 1-pixel suspension jiggle on tile boundaries.
- `tracked`: tread-link shift over 4 frames, road wheels rotating, dust puffs on the rear tile.
- `rotor`: 2-frame rotor blur plus a gentle 1-pixel airframe bob; `lift-copter` adds cargo sway.
- `jet`: 3 frames of exhaust length plus a wing-level pitch change; no vertical bob.
- `naval`: 4 frames of wake offset and a 1-pixel hull bob; submarine shows a periscope wake when surfaced.
- `src/animation.js`: no change; `main.js` selects `move` while `movement.moving`.
- Frame pacing derives from `tileDurationMs` (160 ms), so one tile always plays exactly one cycle.

**Files and modules:** `src/renderer.js` (per-family branches), `src/main.js` (pose selection), `tests/animation.test.js` (frame diff), `tests/frame-parity.test.js` (frame 0 unchanged).

**Dependencies:** Phases 1–2.

**Implementation approach:** implement each family behind its own helper (`drawFootGait`, `drawWheelRoll`, …) so a branch cannot accidentally borrow another family's motion. Never implement a frame by changing only alpha or a single pixel.

**Validation:** `npm test`; a recorded-signature diff proving adjacent frames differ; browser smoke at 480×320 for bounds; manual review of a 10-tile move per family.

**Acceptance criteria**

- [ ] All 22 types animate during movement and none of the six families shares another family's motion.
- [ ] Adjacent frames differ in at least 6 draw operations or 40 recorded coordinates.
- [ ] No unit leaves the 32×32 box at any frame.
- [ ] Movement timing and rules are unchanged; `sample()` untouched.
- [ ] Idle units remain still except rotor and naval hull bob.

**Risks and rollback:** motion sickness or visual noise at 160 ms per tile. Mitigation: amplitudes ≤ 2 px, no camera shake. Revert the phase leaves Classic static again.

### Phase 4 — Classic attack poses and lightweight particles

**Objective:** attacks read as attacks: aim, fire and recoil, aligned to the existing beats, with a light particle burst.

**Scope**

- Pose selection from `CombatPlayback`: `emphasis` shows the aim frame, `muzzle` shows the release frame, `travel` holds recoil, `impact` returns toward rest.
- Per-weapon behaviour: tank and heavy turret rotate and recoil; artillery elevates and kicks; anti-air fires twin barrels; rockets and missiles show a salvo; cruiser opens a hatch; battleship recoils three barrels; infantry and mech shoulder the weapon; aircraft drop or launch.
- `src/particles.js` (new): seeded pool, ≤ 12 particles per event, muzzle smoke, dust, sparks, ≤ 60 live.
- Weapon fire sound moves from `beginCombat` (`main.js:1419`) to the `muzzle` beat.
- No change to `COMBAT_TIMINGS`.

**Files and modules:** `src/renderer.js`, `src/particles.js` (new), `src/main.js`, `src/combat-presentation.js` (read-only use), `tests/particles.test.js` (new).

**Dependencies:** Phases 1–3.

**Implementation approach:** drive pose from `sample.beat`, which already names the current beat. Draw recoil as a translated copy of the same frame, not a new pose, so the silhouette never deforms. Particles expire at `settle`.

**Validation:** `npm test`; unit tests for particle caps and determinism; manual review of one attack per weapon family; audio check that fire coincides with the muzzle beat.

**Acceptance criteria**

- [ ] Every armed unit shows a distinct fire frame and a recoil.
- [ ] Particles never exceed the Classic budget and are cleared by `finalizeCombat`.
- [ ] Weaponless units show no attack animation.
- [ ] Damage, hit chance and damage numbers are byte-identical to today.
- [ ] Sound and muzzle beat are aligned within one frame.

**Risks and rollback:** timing drift between beats and frames. Mitigation: frames are a function of the beat clock only. Revert the phase; combat presentation returns to the current behaviour.

### Phase 5 — Classic unit death sequences

**Objective:** replace the alpha-only fade with a real death sequence that ends in an explicit final frame.

**Scope**

- Death clips per family (5 frames foot, 4 frames the rest), ending in a wreck, crater or wreck-plus-smoke frame.
- Keep the existing alpha curve so `silo-animation` and `combat` tests keep passing.
- Final frame is held through `settle` and disappears exactly when `finalizeCombat` clears `ui.sample`.
- `skipCombat` must not leave a partial corpse.
- Death debris: ≤ 12 particles per event.

**Files and modules:** `src/renderer.js`, `src/particles.js`, `src/main.js`, `tests/animation.test.js`, `tests/combat.test.js` (unchanged assertions must still pass).

**Dependencies:** Phase 4.

**Implementation approach:** draw the corpse from the `sample.dead` snapshot exactly as today, but select the frame by `(elapsed since destroy) / destroy duration`. Never read the live unit — it has already been removed by `cleanup()`.

**Validation:** `npm test`; manual: kill one unit of each family in both `full` and `quick` modes; skip mid-death and confirm nothing lingers.

**Acceptance criteria**

- [ ] Every unit family has a visible death sequence with a final frame.
- [ ] A destroyed unit cannot be selected, commanded or counted after destruction.
- [ ] Skip and off modes leave no lingering corpse.
- [ ] Existing alpha assertions still pass.
- [ ] No death animation outlives the sample.

**Risks and rollback:** corpses that overdraw adjacent tiles or obscure the board. Mitigation: keep debris inside the unit's tile plus 4 px. Revert restores the fade.

### Phase 6 — Classic buildings, emplacements and structure effects

**Objective:** give only the buildings that justify it a subtle operational idle, and make hazard firing visible.

**Scope**

- Airport radar sweep and Factory (`base`) exhaust as 2-frame slow idles; all other properties static.
- No movement and no attack clips for buildings.
- Emplacement and volcano events: consume `report.events` in `noteTurnStartReport` (`main.js:453`, which currently reads only `heals` and `tasks`), emit one log line, one toast, floaters, and a presentation-only `ui.hazardAnim` consumed by both renderers.
- No new saved state; the event is not replayed after a save.

**Files and modules:** `src/renderer.js`, `src/main.js`, `src/particles.js`, `tests/animation.test.js`.

**Dependencies:** Phases 1–2. Does not depend on the unit phases.

**Implementation approach:** `ui.hazardAnim` is derived from the turn report and cleared when its timer elapses. It never enters `state`, save files or online snapshots.

**Validation:** `npm test`; manual: stand a unit next to a volcano and advance a turn; confirm the log, the flash and the damage agree.

**Acceptance criteria**

- [ ] Only airport and factory animate, at ≤ 1 frame per second.
- [ ] A volcano eruption produces a visible effect and an explanatory log line.
- [ ] `ui.hazardAnim` is absent from saved state and from snapshots.
- [ ] No building moves or attacks.

**Risks and rollback:** idle animations across many buildings could shimmer. Mitigation: two frames maximum, slow cadence, disabled under reduced motion.

### Phase 7 — Isometric frame pipeline: bake v3, manifest and loader

**Objective:** produce and load multi-frame sheets without changing a single pixel of the current frame 0.

**Scope**

- `build.mjs`: accept a pose argument in the unit sculptors, export `MODEL_POSES`, and guarantee the `idle` pose reproduces today's geometry byte-identically.
- `bake.py`: bake frames into fixed cells, emit manifest v3 (`field-command-voxel-sheet-3`) with per facing `cell`, `frames[]`, `changedPixels` and `clips{}`, and keep emitting v2-compatible fields.
- `iso-renderer.js`: `sheetFor`/`blitSheet` accept a frame index; readers accept v2 and v3; `primeArmySheets` primes only frame 0 of `right`.
- Size gate: measure payload and bake time before proceeding.

**Files and modules:** `tools/voxel_pipeline/build.mjs`, `tools/voxel_pipeline/bake.py`, `game_assets/voxels/sheets/*` (regenerated), `game_assets/voxels/sheets/manifest.json`, `src/iso-renderer.js`, `tests/voxels.test.js`.

**Dependencies:** Phase 1 (needs frame counts from `data/animation.json`).

**Implementation approach:** pack frames horizontally in a strip and record each rectangle; do not resize existing frames. Regenerate only units in this phase; buildings and terrain keep single-frame sheets. Keep the v2 reader path so an old manifest still loads.

**Validation:** `npm test`; `npm run assets:test`; `npm run voxels:all`; a byte comparison of frame 0 against the pre-phase sheet; payload and bake-time measurement recorded in the phase report.

**Acceptance criteria**

- [ ] Frame 0 of every regenerated sheet is pixel-identical to the previous sheet.
- [ ] Manifest v3 validates and v2 manifests still load.
- [ ] Total sheet payload ≤ 12 MB and bake time ≤ 10 minutes, or a fallback from §6.7 is applied and documented.
- [ ] `tests/voxels.test.js` updated to accept v3 while still asserting four facings and the right/left difference.

**Risks and rollback:** sheet size and memory. Mitigation: the explicit gate and three ordered fallbacks. Rollback: regenerate from the previous `bake.py`; the reader supports v2, so sheets and code can be reverted independently.

### Phase 8 — Isometric movement, all families

**Objective:** the same six family motions as Classic, baked, with four real facings.

**Scope**

- Move clips 3–4 frames per family, baked per model, facing and variant.
- `drawUnitSprite` selects `move` while the unit's movement sample is active, using `movement.phase`.
- Aircraft bob becomes a real oscillation instead of the constant `bob = 8`.
- No mirroring: the baked `left` sheet is used as-is.

**Files and modules:** `tools/voxel_pipeline/build.mjs`, `bake.py`, sheets, `src/iso-renderer.js`, `src/main.js`, `tests/iso.test.js`.

**Dependencies:** Phase 7.

**Implementation approach:** reuse the same sculptors as Classic's visual language but in geometry: legs swing, wheels rotate or translate, treads shift, rotors tilt, jets pitch, hulls bob. Keep the anchor stable across frames so nothing jumps.

**Validation:** `npm test`; pixel diff between adjacent frames; a manual four-direction walk per family in the browser.

**Acceptance criteria**

- [ ] All six families move visibly and differently in iso.
- [ ] Direction selection matches the real facing for all four directions.
- [ ] Anchors are identical across frames; no vertical jump on frame change.
- [ ] Frame 0 still matches the pre-phase art.
- [ ] No new image-load failure path; the procedural fallback still works.

**Risks and rollback:** 4× frame count increases lazy loading cost. Mitigation: preload the visible facing of units in view; keep eviction (Phase 12). Rollback: revert sheets and code together.

### Phase 9 — Isometric attack and death

**Objective:** attacks and deaths read in iso as they do in Classic, at the same beats.

**Scope**

- Attack clips per weapon family: turret aim, recoil, muzzle, launch.
- Death clips with an explicit final frame, drawn in the unit's **real facing** (fixing the `'right'` bug at `iso-renderer.js:1099–1103`).
- `sample.dead` snapshots gain the facing they died with.
- Dimensional particles: ≤ 40 per event, z-sorted with the scene, ≤ 120 live.

**Files and modules:** `src/iso-renderer.js`, `src/combat-presentation.js` (dead snapshots), `src/particles.js`, `bake.py`, sheets, `tests/iso.test.js`, `tests/silo-animation.test.js`.

**Dependencies:** Phases 7–8.

**Implementation approach:** derive the attack frame from `sample.beat` exactly as Classic does, so both modes show the same phase at the same moment. Draw the corpse from the snapshot, never from live state.

**Validation:** `npm test`; manual: one attack and one death per family; a facing check across all four directions.

**Acceptance criteria**

- [ ] Every armed unit shows aim and recoil in iso.
- [ ] A unit dying facing left or up stays in that facing.
- [ ] Death ends at a final frame and is cleared by `finalizeCombat`.
- [ ] Particles stay inside their budget and are z-sorted.
- [ ] Both modes show the same beat for the same action.

**Risks and rollback:** particle sorting cost on large battles. Mitigation: hard live cap and no per-particle allocation. Rollback: revert to baked single frames for attack and death.

### Phase 10 — Isometric buildings and dimensional effects

**Objective:** finish the isometric environment: operational building idle and richer hazard effects, with no building movement or attack.

**Scope**

- Airport radar and Factory (`base`) exhaust as slow 2-frame idles; everything else static.
- Emplacement and volcano effects projected into the scene, consuming `ui.hazardAnim` from Phase 6.
- No building death or destruction art.

**Files and modules:** `src/iso-renderer.js`, `bake.py`, sheets, `src/particles.js`.

**Dependencies:** Phases 6–9.

**Implementation approach:** reuse the phase-6 event path; only the drawing differs. Effects read the existing telegraph overlays at `iso-renderer.js:585` and do not replace them.

**Validation:** `npm test`; manual: eruption and emplacement fire in iso.

**Acceptance criteria**

- [ ] Only airport and factory animate, in both modes.
- [ ] Hazard effects are visible and match the log.
- [ ] No building moves or attacks.
- [ ] Effects are cleared when their timer expires.

**Risks and rollback:** effects could obscure units. Mitigation: draw behind units where possible, cap particle counts.

### Phase 11 — Isometric silo missile as a voxel model

**Objective:** replace the flat 2D missile in iso with a real voxel model, launched, flown and impacted under the existing silo timeline.

**Scope**

- New voxel model `silo-missile` with `kind: "effect"` and a neutral variant only, so it never consumes team-colour baking.
- `build.mjs` and `bake.py` include it; the manifest entry is separate from units and buildings.
- `renderIsoSiloCombat` draws the model at altitude with the same anchor rules as units; launch, ascent, descent and impact stages read `SILO_TIMINGS`.
- Classic keeps `drawSiloMissile2D`, upgraded to 2–3 drawn frames with a plume and a warhead orientation.
- Trail and impact particles are dimensional in iso and light in Classic; all expire by the end of `settle`.

**Files and modules:** `data/voxels.json` (regenerated), `game_assets/voxels/silo-missile*`, `tools/voxel_pipeline/build.mjs`, `bake.py`, `src/iso-renderer.js`, `src/combat-renderer.js`, `tests/voxels.test.js`, `tests/silo-animation.test.js`.

**Dependencies:** Phases 7–10.

**Implementation approach:** the missile is a small model (nose, body, fins) baked at the same 32×32×23 grid and downscale 2, facing `up` and `down` only. It must not enter the unit roster or the deploy tables.

**Validation:** `npm test`; `npm run voxels:all`; manual: full silo strike in both modes; confirm the missile is absent from the build menu, the workbench unit list and save files.

**Acceptance criteria**

- [ ] Iso shows a voxel missile rising, flying and impacting.
- [ ] Classic shows at least two distinct missile frames.
- [ ] The animation follows `ignition → ascent → descent → impact → settle` exactly.
- [ ] All effects are gone when `finalizeCombat` runs.
- [ ] `silo-missile` cannot be built, selected, saved or targeted as a unit.

**Risks and rollback:** a new model id could leak into roster tests. Mitigation: `kind: "effect"` is filtered everywhere units are enumerated; add a test. Rollback: revert the model and the iso draw call; the 2D path already exists.

### Phase 12 — Validation, performance, documentation and regression

**Objective:** prove the whole thing holds together and leave a validator that prevents the original defect from returning.

**Scope**

- Extend `tools/validate-animation.mjs`: frame dimension checks, duplicate-frame detection (identical pixels inside a clip), missing direction checks, manifest/renderer consistency, naming rules.
- Performance pass: sheet preload and eviction; measure frame time with 40 units moving and a full particle load.
- Documentation: update `README.md` with a short animation section and the validator command.
- Full regression: both modes, all families, pause/resume, skip, replay, save/load, online snapshot apply, view switching mid-animation.

**Files and modules:** `tools/validate-animation.mjs`, `src/iso-renderer.js`, `README.md`, `docs/PLAYABLE_BUILD.md`, `package.json`, tests.

**Dependencies:** all previous phases.

**Implementation approach:** make the validator run in `npm test` so a future asset change cannot silently ship identical frames.

**Validation:** `npm test`, `npm run animation:validate`, `npm run assets:test`, `npm run build`, `npm run test:browser` where dependencies exist.

**Acceptance criteria**

- [ ] Validator catches a deliberately duplicated frame, a missing direction and a bad dimension.
- [ ] 40 moving units plus particles hold the frame budget on the reference machine.
- [ ] All existing tests pass with the same known Firebase exceptions.
- [ ] Docs describe how to author, validate and regenerate animation assets.
- [ ] No gameplay file imports animation code.

**Risks and rollback:** the validator could be too strict and block legitimate art. Mitigation: thresholds are constants at the top of the file, documented in §6.4.

---
## 6. Direction and Frame Specification

### 6.1 Directions

The engine has exactly four facings, derived from `directionForDelta` (`src/state.js:147`) with `FACINGS = ['up', 'right', 'down', 'left']` at 156. Nothing in this plan adds a fifth.

| Facing | Classic source | Iso source |
| --- | --- | --- |
| `right` | drawn right, `right` orientation | baked `right` sheet |
| `up` | drawn up, bespoke for artillery, rockets, AA and missiles | baked `up` sheet |
| `down` | drawn down, bespoke for the same units | baked `down` sheet |
| `left` | mirrored from `right` | baked `left` sheet (real geometry, asserted different from `right`) |

Directions and frames are separate axes. A model has 4 facings × N frames × 6 variants, and the two must never be conflated in naming, metadata or loading code.

### 6.2 Frame counts

Defaults per family and action, taken from `data/animation.json`:

| Family | Units | Idle | Move | Attack | Death |
| --- | --- | --- | --- | --- | --- |
| foot | infantry, mech, engineer, medic | 1 | 4 | 3 | 5 |
| wheeled | recon, rockets, missiles | 1 | 4 | 3 | 4 |
| tracked | apc, tank, heavy, artillery, antiair, mega | 1 | 4 | 3 | 4 |
| rotor | copter, lift-copter | 2 | 4 | 2 | 4 |
| jet | fighter, bomber | 1 | 3 | 2 | 4 |
| naval | submarine, gunboat, cruiser, battleship, lander | 1 | 4 | 2 | 4 |
| buildings | airport, base (Factory) | 2 | — | — | — |
| all other buildings | — | 1 | — | — | — |

Minimum viable motion: a move clip needs **at least 2 distinct frames** to be animated at all. Any clip that cannot reach 2 genuinely different frames must be declared static in the data instead of being padded with duplicates.

### 6.3 The six anti-air PNGs, mapped

| File | What it actually is |
| --- | --- |
| `antiair--allies-down-0.png` | down facing, owner slot 0 accent |
| `antiair--allies-down-1.png` | down facing, owner slot 1 accent |
| … | … |
| `antiair--allies-down-5.png` | down facing, owner slot 5 accent |

Measurement: the six decode to identical alpha and differ on **6 of 1,400 pixels** — the team accent. `tank` differs by 9 of 1,160; `hq` by 572 of 2,028. There is no `-n` variant for units; `n` is a building and terrain variant only.

Under this plan the same unit gains, for example, `antiair--allies-down-<variant>` with frames packed inside, and the variant axis keeps its current meaning. Nothing is renamed, so existing deployment art and save files are unaffected.

### 6.4 Frame dimensions, anchors and bounds

| Rule | Value | Enforced by |
| --- | --- | --- |
| Iso frame cell | 64 × 32 per frame, packed in a strip | bake + validator |
| Iso anchor | `anchorX`/`anchorY` per model, **constant across frames** | validator |
| Classic unit box | 32 × 32, no frame may exceed it | `tests/sprites-32.test.js` |
| Adjacent-frame difference | ≥ 40 changed pixels (iso) or ≥ 6 draw operations / 40 recorded coordinates (Classic) | validator, tests |
| Duplicate frames inside one clip | forbidden | validator |
| Transparency | unchanged alpha channel outside the silhouette | pixel diff |
| Stretch | forbidden; no frame may scale the art | code review + validator |

Anchor stability is the anti-jitter rule: if the painted content moves inside the frame, the anchor must not. A frame that shifts the whole model by a pixel will read as a hop, not a step.

### 6.5 Renderer metadata contract

Every field a renderer needs, and where it lives today.

| Field | Needed for | Location | Status |
| --- | --- | --- | --- |
| entity id | lookup | `manifest.models` key | exists |
| mode | choosing renderer | implicit (`viewMode`) | exists |
| action | choosing a clip | `data/animation.json` | new |
| facing | choosing a sheet | filename and manifest | exists |
| frame dimensions | source rectangle | manifest v3 `frames[]` | new |
| frame count | clip length | `data/animation.json` | new |
| timing | pacing | clip `fps` plus beat clock | new |
| looping | idle and move loop, attack and death clamp | clip `loop` | new |
| pivot | stable anchor | manifest `anchorX`/`anchorY` | exists |
| attack event frame | muzzle alignment | `releaseFrame` | new |
| death removal timing | corpse lifetime | `destroy`/`settle` beats | exists (beat clock) |
| layers and offsets | effects over art | procedural, per renderer | exists |
| shadows | grounding | procedural (`renderer.js:76–77`, `iso-renderer.js:430–433`) | exists |
| palette | consistency | `data/voxels.json`, 155 colours | exists |

### 6.6 Classic pose mapping (no new files)

Classic has no sheet format, so frames are code. The mapping is deliberately mechanical so both modes agree:

| Action | Classic | Both modes share |
| --- | --- | --- |
| idle | frame 0; rotor and naval hull get a 2-frame slow cycle | frame index from `unitPose` |
| move | `move` clip while `movement.moving` | tile progress from `Movement.phase` |
| attack | `attack` clip driven by `emphasis`, `muzzle`, `travel` | `releaseFrame` from the data file |
| death | `death` clip driven by the `destroy` beat | `sample.dead` snapshots |

No Classic frame may be implemented as an alpha change, a tint, or a moved single pixel. Each frame must change the silhouette or a structural detail.

### 6.7 Isometric sheet format v3

| Property | v2 (today) | v3 (proposed) |
| --- | --- | --- |
| Format string | `field-command-voxel-sheet-2` | `field-command-voxel-sheet-3` |
| Image | whole PNG is the frame | strip of fixed cells |
| Manifest per facing | `width`, `height`, `anchorX`, `anchorY`, `variants` | adds `cell`, `frames[]`, `changedPixels`, `clips{}` |
| Reader | whole-image blit | frame-rect blit with whole-image fallback |
| Writer | `bake.py` | `bake.py`, units only in Phase 7 |

Size gate and ordered fallbacks, applied only if Phase 7 measurement exceeds **12 MB payload** or **10 minutes** bake time:

1. Reduce `move` from 4 to 2 frames for `naval` and `jet` (visually acceptable at 160 ms per tile).
2. Deduplicate identical frames within a clip and point both frame indices at one rectangle.
3. Author the move clip as 2 poses and add the remaining motion procedurally in `drawUnitSprite` (still not an identical-frame loop).

No fallback may reintroduce a recolour-only or single-pixel animation.

### 6.8 Mirroring rules

| Element | Rule |
| --- | --- |
| Classic `left` | mirroring stays, as today (`drawMirrored`, 79–85) |
| Iso `left` | **never** mirrored; the baked sheet is real geometry |
| Asymmetric units | Classic mirroring is accepted for now, but attack frames must mirror the weapon too, not just the hull |
| Faction markings | never mirrored onto the wrong side; Classic markings are symmetric by construction, iso is baked per facing |
| Shadows | drawn by the renderer, never baked into frames |

If mirroring ever produces a visibly wrong weapon side on a Classic attack frame, that unit's `left` attack is drawn explicitly rather than mirrored.

---

## 7. Animation and Effects Synchronisation Rules

### 7.1 One clock, no second timeline

| Clock | Owns | Read by |
| --- | --- | --- |
| `Movement` (160 ms per tile) | movement pose, gait phase | both renderers |
| `CombatPlayback` beats | attack, projectile, impact, destroy, settle | both renderers |
| `SILO_TIMINGS` | ignition, ascent, descent, impact, settle | silo presentation only |

No renderer keeps its own timer, accumulator or frame counter. Elapsed time is passed in and the frame is computed. Pausing is therefore free: a hidden tab or an open dialog freezes `now`, and the next frame resumes where the beat clock is.

### 7.2 Attack and projectile alignment

| Beat | Clip | Effect | Sound |
| --- | --- | --- | --- |
| `emphasis` (340 ms) | `attack` frame 0, aim | target bracket | — |
| `muzzle` (170 ms) | release frame, recoil | flash plus ≤ 12 particles | weapon fire, **moved here** from `beginCombat` |
| `travel` (280 ms) | recoil hold | projectile, unchanged shapes | — |
| `impact` (330 ms) | target hit reaction | burst plus damage number | impact |
| `destroy` (520 ms) | `death` frames | debris and smoke | explosion |
| `settle` (200 ms) | death final frame | scorch | — |

Rules:

- `COMBAT_TIMINGS` is unchanged; only visuals move to match it.
- `sample.beat` is the only switch; no new timers.
- Reduced motion suppresses flashes and jolts but keeps aim, release and final death frames.
- `off` resolves instantly and plays nothing; the final state is identical.

### 7.3 Death, removal and interaction

1. `rules.attack` (`src/rules.js:307`) snapshots the destroyed units at 316 and calls `cleanup(s)` at 323, so the unit is gone from `state` before playback starts. It cannot act or be selected.
2. The corpse comes from `record.destroyed`, carried in `sample.dead`, which holds `type`, `owner`, `army`, `x`, `y`, `alpha`, `scorch` and, from Phase 9, `facing`.
3. The death clip replaces the pose change but keeps the same alpha curve, so `tests/silo-animation.test.js` and `tests/combat.test.js` keep passing.
4. The final frame is held through `settle`; when `finalizeCombat` clears `ui.sample`, nothing remains.
5. Skips call `finalizeCombat` once; a skipped death never leaves a partial corpse.

### 7.4 Silo missile lifecycle

| Stage | Classic | Isometric |
| --- | --- | --- |
| `ignition` (340 ms) | pit glow and doors | pit glow and doors, missile visible in the shaft |
| `ascent` (380 ms) | 2D missile rises with a plume | voxel missile rises above the silo, plume particles |
| `descent` (340 ms) | 2D missile dives, warhead down | voxel missile in `down` facing |
| `impact` (620 ms) | blast and mushroom | blast plus z-sorted smoke columns |
| `settle` (260 ms) | smoke dissipates | smoke dissipates, all particles expired |
| cleanup | `finalizeCombat` | `finalizeCombat` |

The missile model is `kind: "effect"`, neutral variant only, so it never enters the unit roster, the build menu, selection, saves or snapshots. It uses the same anchor rules as units so it does not skew while rising.

### 7.5 Hazard events

- `startTurn()` already returns `events: [{kind: 'emplacement-fire', …}]` (`src/rules.js:1109`, `:1132`).
- `noteTurnStartReport` (`main.js:453`) currently reads only `heals` and `tasks`, so hazard damage happens invisibly. Phase 6 consumes `events`: one log line, one toast, floaters per hit, and a presentation-only `ui.hazardAnim` read by both renderers.
- `ui.hazardAnim` is never saved and never replayed.

### 7.6 Pause, reduced motion, replay, camera, online

| Concern | Rule |
| --- | --- |
| Pause (hidden tab, dialog) | clocks freeze; frames resume without a jump |
| Reduced motion | keep key frames; suppress flashes, jolts, particle counts |
| `combatMode` `quick` | same clips, shorter beats |
| `combatMode` `off` | no clips; instant resolution |
| Replay viewer | animations are derived from replayed actions, never recorded |
| Camera | animation never moves the camera; existing focus stays |
| Online | snapshots replace state; animation derives from the new state; no animation data on the wire |
| Mode switch mid-animation | the new renderer recomputes the pose from the same clock, so the action continues |

### 7.7 Skipped, rapid and interrupted actions

| Case | Behaviour |
| --- | --- |
| Rapid multi-tile move | one continuous gait cycle; the cycle does not restart per tile |
| Move interrupted by attack | attack clip wins; the move clip stops immediately |
| Attack while another attack plays | impossible by construction: `beginCombat` returns early if `playback` exists |
| Death during counter-attack | counter death plays after the counter `impact` beat, not simultaneously |
| Save or load mid-animation | animation is discarded; state is authoritative |
| Replay of a skipped combat | replays the real resolution, not the skipped visuals |

---
## 8. Test and Acceptance Matrix

### 8.1 Automated

| Suite | Type | Covers | Phase |
| --- | --- | --- | --- |
| `tests/animation.test.js` | new | family mapping, clip lookup, frame index, clamping, loop, determinism, purity | 1 |
| `tests/frame-parity.test.js` | new | frame 0 reproduces today's draw signature for 22 types × 4 facings | 2 |
| `tests/particles.test.js` | new | caps, determinism, expiry, no allocation per frame | 4 |
| `tests/sprites-32.test.js` | existing | every frame stays inside 32×32 | 2–5 |
| `tests/movement.test.js` | existing | `sample()` stays `deepEqual`-identical | 2–3 |
| `tests/combat.test.js` | existing | pause/resume and `sample(30000)` unchanged | 4–5 |
| `tests/combat-battle.test.js` | existing | battle panel unaffected | 4–5 |
| `tests/silo-animation.test.js` | existing | silo beats and alpha behaviour | 5, 11 |
| `tests/iso.test.js` | existing | iso rendering paths | 8–11 |
| `tests/voxels.test.js` | existing, extended | manifest v3, four facings, right differs from left | 7 |
| `tools/validate-animation.mjs` | new | data consistency, duplicate frames, dimensions, missing directions | 1, 12 |
| `tests/asset_pipeline/test_pipeline.py` | existing | Python pipeline | 7, 11 |

### 8.2 Acceptance matrix

| # | Requirement | How it is proven | Phase |
| --- | --- | --- | --- |
| 1 | Units show many distinct frames | validator frame-diff threshold plus manual review | 3, 8 |
| 2 | Direction selection uses the real facing | unit test over four facings, both modes | 3, 8 |
| 3 | Both modes show the same action at the same time | shared `unitPose` plus a beat-table test | 9 |
| 4 | Attack aligns to resolution | beat assertion: release frame lands on `muzzle` | 4, 9 |
| 5 | Death plays and then disappears | manual skip test plus `finalizeCombat` assertion | 5, 9 |
| 6 | Attacking buildings | buildings have no attack; hazard emplacements do | 6, 10 |
| 7 | Pivots do not jump | anchor equality across frames | 7, 8 |
| 8 | Missing asset falls back | delete a frame in a test fixture; expect frame 0, then procedural | 7, 12 |
| 9 | Performance with many units | 40 moving units plus particles within budget | 12 |
| 10 | Classic particles are lightweight | ≤ 12 per event, ≤ 60 live | 4 |
| 11 | Iso particles are dimensional | z-sorted, ≤ 40 per event, ≤ 120 live | 9 |
| 12 | Particle lifetime and cleanup | all expired by `settle`; none survive `finalizeCombat` | 4, 9 |
| 13 | Silo is a voxel model in iso | scene inspection plus a roster-leak test | 11 |
| 14 | Silo is 2D with ≥ 2 frames in Classic | frame test plus manual review | 11 |
| 15 | Launch, trail, impact, cleanup in both modes | stage-by-stage manual check against `SILO_TIMINGS` | 11 |
| 16 | Regression: movement, combat, selection, turns | full `npm test` plus browser smoke | 12 |
| 17 | Regression: mode switching mid-animation | manual switch during move and during attack | 12 |
| 18 | No gameplay imports animation code | static import scan test | 1, 12 |

### 8.3 Manual and browser checks

| Check | Where | Expected |
| --- | --- | --- |
| 10-tile move per family | both modes | continuous motion, no per-tile restart |
| Attack per weapon family | both modes | aim, fire, recoil, impact |
| Kill per family | both modes | death sequence with a final frame |
| View switch mid-attack | both modes | continues, does not restart |
| Volcano turn | both modes | visible eruption plus log |
| Silo strike | both modes | ignition to settle, voxel missile in iso |
| Save, reload, replay | Classic | no animation state in the save |

Browser suites (`npm run test:browser`, `:features`, `:ui`) cannot run without `node_modules`. When they are unavailable, record them as **not run**, never as passing.

---

## 9. Risks, Dependencies and Open Questions

### 9.1 Risks

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Sheet payload grows too far | medium | load time, memory | size gate in Phase 7 with three ordered fallbacks |
| Frame anchors drift, units hop | medium | visual quality | anchor equality validator |
| Classic art regressions in shared branches | medium | broken silhouettes | frame-0 parity suite |
| `drawUnit` branches become unmaintainable | medium | future cost | per-family helpers, no shared mega-branch |
| Iso frame loading stalls the first move | medium | stutter | preload the facing in view, evict unused |
| Particle spam on large battles | low | frame drops | hard caps, seeded pools, no per-frame allocation |
| Timing drift between beats and frames | low | audio mismatch | frames derived from `sample.beat` only |
| New effect model leaks into gameplay | low | corrupted saves | `kind: "effect"` filtered everywhere plus a test |
| Validator too strict | low | blocked art | thresholds as documented constants |

### 9.2 Dependencies

| Dependency | Why |
| --- | --- |
| `data/animation.json` | the only source of frame counts and release frames |
| `bake.py` and `build.mjs` | produce iso frames and the missile model |
| `CombatPlayback` beats | the clock every animation reads |
| `Movement.phase` | gait phase without touching `sample()` |
| Existing test suite | the regression net for every phase |

Nothing here depends on installing a package. There is no new runtime dependency at any phase.

### 9.3 Open questions and recommended defaults

| # | Question | Recommended default |
| --- | --- | --- |
| Q1 | Should iso bake frames for all six variants? | yes, keep the current variant axis; revisit only if the size gate fails |
| Q2 | Should Classic attack frames be mirrored for `left`? | yes, mirror hull and weapon together; draw explicitly only if it reads wrong |
| Q3 | Should buildings ever get destruction art? | no; deferred, and out of scope for all 12 phases |
| Q4 | How many frames for `jet` movement? | 3, because jets cross tiles faster than treads and need less cycle |
| Q5 | Should reduced motion shorten clips or drop frames? | shorten timings only; never drop the aim, release or final death frame |
| Q6 | Should the validator run in `npm test`? | yes from Phase 12, standalone from Phase 1 |
| Q7 | Should the silo missile have four facings? | only `up` and `down`; it launches vertically |

---

## 10. Completion Checklist per Phase

### Phase 1

- [ ] `data/animation.json` committed with all 22 units and 8 buildings
- [ ] `src/animation.js` exported, pure and import-free
- [ ] Validator passes, and fails when a unit is removed
- [ ] Tests added; 333 baseline preserved

### Phase 2

- [ ] Optional pose argument added
- [ ] `Movement.phase` added; `sample()` unchanged
- [ ] Frame-0 parity suite green for all types and facings
- [ ] No visible change

### Phase 3

- [ ] Six distinct movement motions
- [ ] Frame-diff threshold met
- [ ] Bounds respected at every frame
- [ ] Movement rules untouched

### Phase 4

- [ ] Aim, release and recoil for 17 armed units
- [ ] Particles capped and cleared
- [ ] Sound moved to the muzzle beat
- [ ] Damage output unchanged

### Phase 5

- [ ] Death clip per family with a final frame
- [ ] Alpha curve unchanged
- [ ] Skip and off leave no corpse
- [ ] Dead units cannot act or be selected

### Phase 6

- [ ] Two building idles only
- [ ] Hazard events consumed and logged
- [ ] `ui.hazardAnim` never saved
- [ ] No building movement or attack

### Phase 7

- [ ] Manifest v3 emitted and validated
- [ ] Frame 0 pixel-identical
- [ ] v2 manifests still load
- [ ] Size and bake-time gate recorded

### Phase 8

- [ ] Six iso movement families
- [ ] Four real facings, no mirroring
- [ ] Anchors constant across frames
- [ ] Fallback still reachable

### Phase 9

- [ ] Iso attack and death clips
- [ ] Real facing on corpses
- [ ] Dimensional particles within budget
- [ ] Same beats as Classic

### Phase 10

- [ ] Building idle in iso
- [ ] Hazard effects projected and cleared
- [ ] No building movement or attack

### Phase 11

- [ ] Voxel missile model baked as `effect`
- [ ] Lifecycle matches `SILO_TIMINGS`
- [ ] Classic missile has 2–3 frames
- [ ] Not buildable, selectable or saveable

### Phase 12

- [ ] Validator covers duplicates, dimensions and directions
- [ ] Performance measured with 40 units
- [ ] Docs updated
- [ ] Full regression recorded, including which suites could not run

---

## 11. Important Constraints

1. **Gameplay is authoritative.** Animation can never decide whether an action happened, who was hit, how much damage was dealt, or whether a unit survives.
2. **No balance or rule changes.** No movement range, turn order, damage, ammo, vision or win-condition change.
3. **No renderer rewrite.** The canvas and sheet blitters stay; frames are added, not a new pipeline.
4. **No new dependencies.** No sprite library, no animation library, no WebGL.
5. **No recolour loops.** A frame that only changes colour, alpha or a single pixel is a defect, not an animation.
6. **Four directions.** Do not add 8-way art or free rotation.
7. **No building movement or attack** unless the rules gain it first.
8. **Frame 0 is sacred.** It must remain today's rendering, so every preview, thumbnail and test hash keeps working.
9. **Effects are presentation only** and are cleared with the sample.
10. **Both modes share one action model.** If Classic and Isometric disagree about which action is playing, the design is wrong.
11. **No asset regeneration as part of planning.** Assets change only in the phases that say so.
12. **Unknowns stay unknown.** If a browser suite could not be run, say so.

---

## 12. Final Response

Whoever implements a phase should report, in this order:

1. The exact files changed, with one line each.
2. What the phase does visually, in one sentence per family or mode touched.
3. Which automated checks ran and their counts, naming any suite that could not run and why.
4. Which manual checks were performed, and their outcome.
5. Any data-format change, and whether old data still loads.
6. Any deviation from this plan, with the reason.
7. Confirmation that no gameplay rule, balance value or save format changed.

And when the whole plan is delivered: the exact plan path, the twelve phases in one table, the six family motions, the two modes' differences, the remaining gaps, and the suites that were never executed.

---

## Appendix A — Verified file and function index

| Reference | What it is |
| --- | --- |
| `src/renderer.js:55` | `drawUnit` |
| `src/renderer.js:76–77` | unit shadow |
| `src/renderer.js:79–85` | `drawMirrored` |
| `src/renderer.js:822` | `drawTerrain`, nine external call sites |
| `src/renderer.js:1302` | `render`, unit loop at 1502 |
| `src/iso-renderer.js:87` | `sheetFor`, lazy `new Image()` at 98 |
| `src/iso-renderer.js:106` | `blitSheet` |
| `src/iso-renderer.js:120` | `primeArmySheets`, `right` facing and variant `0` only (`n` fallback where absent) |
| `src/iso-renderer.js:424` | `drawUnitSprite`, constant `bob` at 426 |
| `src/iso-renderer.js:516` | `renderIso` |
| `src/iso-renderer.js:585` | emplacement and eruption telegraph overlays |
| `src/iso-renderer.js:639` | painter sort |
| `src/iso-renderer.js:779` | `drawIsoSiloMissile` |
| `src/iso-renderer.js:856` | `renderIsoSiloCombat` |
| `src/iso-renderer.js:1065` | `renderIsoCombat` |
| `src/iso-renderer.js:1099–1103` | destroyed units always blit `right` |
| `src/combat-presentation.js:24–30` | `COMBAT_TIMINGS` |
| `src/combat-presentation.js:36–39` | `SILO_TIMINGS` |
| `src/combat-presentation.js:62–82` | `buildCombatTimeline` |
| `src/combat-presentation.js:330–415` | `CombatPlayback._sample` |
| `src/combat-renderer.js:78` | `drawProjectile` |
| `src/combat-renderer.js:156` | `drawImpact` |
| `src/combat-renderer.js:193` | `drawSiloMissile2D` (internal) |
| `src/combat-renderer.js:235` | `drawSiloCombat` (internal) |
| `src/rules.js:307` | `attack`, snapshots at 316, cleanup at 323 |
| `src/rules.js:1109` | emplacement and volcano events |
| `src/main.js:181` | `viewMode` |
| `src/main.js:453` | `noteTurnStartReport`, ignores `report.events` |
| `src/main.js:1401` | `beginCombat` |
| `src/main.js:1419` | weapon fire sound |
| `src/main.js:1460` | `tickCombat` |
| `src/main.js:1484` | `skipCombat` |
| `src/main.js:1489` | `finalizeCombat` |
| `src/main.js:2204` | `setViewMode` |
| `src/movement.js:3` | `tileDurationMs 160` |
| `src/state.js:147` | `directionForDelta` |
| `src/state.js:156` | `FACINGS` |
| `src/state.js:958` | `syncEmplacements` |

## Appendix B — Constants and budgets

| Constant | Value |
| --- | --- |
| Tile duration | 160 ms |
| Iso viewport | 960 × 640 |
| Iso frame cell | 64 × 32 |
| Classic unit box | 32 × 32 |
| Voxel grid | 32 × 32 × 23 |
| Palette | 155 colours |
| Classic particles per event | ≤ 12 |
| Classic live particles | ≤ 60 |
| Iso particles per event | ≤ 40 |
| Iso live particles | ≤ 120 |
| Sheet payload gate | ≤ 12 MB |
| Bake time gate | ≤ 10 minutes |
| Minimum changed pixels per frame pair | 40 |

## Appendix C — Commands

```bash
npm test                      # node --test then the asset suite: 333 pass / 4 Firebase failures / 2 skip; assets 43 pass
npm run assets:test           # Python asset pipeline, 43 checks
npm run build                 # esbuild bundle
npm start                     # dev server on 0.0.0.0:5173
npm run test:browser          # Playwright, requires node_modules
npm run test:browser:features
npm run test:browser:ui
npm run voxels:build          # data/voxels.json
npm run voxels:bake           # sheets and manifest
npm run voxels:all
npm run animation:validate    # added in Phase 1
```

Without `node_modules`, only `npm test`, `npm run assets:test` and the Python pipeline checks can run. Everything else must be reported as not run.
