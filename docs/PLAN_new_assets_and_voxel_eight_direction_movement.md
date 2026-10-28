# Plan: New Voxel Assets and Eight-Directional Unit Movement

> **SUPERSEDED (direction + resolution scope):** the 8-direction / 64³ direction work described
> here is replaced by `docs/PLAN_512_native_16dir_segmented_pipeline.md`, which bakes units in
> **16 directions** on a **512×512×512 native lattice** (buildings stay at 4), with segmented parts
> and normal/material maps. Still valid and referenced: this document's asset-roster research
> (which new units and buildings are worth adding, and why). Execution checklist:
> `docs/CHECKLIST_512_native_rebuild.md`.

**Branch:** `arena/82c2ca28-voxelassetgenerator` (current working branch)  
**Status:** PLANNING ONLY — no implementation performed; no source/data/avatar files edited; no rebuild run; no generated PNG/JSON changed by this plan document.  
**Document path:** `docs/PLAN_new_assets_and_voxel_eight_direction_movement.md`

---

## 1. Goal and scope

Produce a complete, implementable plan that combines:

- **(A) Asset expansion:** add carefully selected new infantry, land, air, and naval units; add the required new Barracks building and other approved distinct buildings; keep all existing units/buildings/terrain intact.
- **(B) Eight-directional unit sprites:** replace the current four-facing system (`right`, `up`, `left`, `down`) with a full eight-direction system for all mobile units, produced from voxel source, baked to manifest v3 (or a documented successor), and supported by previews, runtime selection, and animation clips.

Constraints preserved from the live checkout:
- Source geometry is authored in JavaScript (`tools/voxel_pipeline/models/units.mjs`, `buildings.mjs`, `terrain.mjs`) inside a 64×64×64 grid.
- `build.mjs` defines the model roster, pose/clip metadata, and assembly logic.
- `bake.mjs` produces directional strips with quarter-turn rotation (`rotateVoxels` uses `turns % 4`); no mirroring.
- `preview.mjs` renders `right` facing frame 0 for individual PNG previews.
- The manifest format is `field-command-voxel-sheet-3` with facings list, `gridSize: [64,64,64]`, `tileSize: [64,32]`, `downscale: 4`, `teamVariants: ["0","1","2","3","4","5","n"]`.
- Animation uses family entries (`foot`, `wheeled`, `tracked`, `rotor`, `jet`, `naval`) with frame budgets (`classic`, `iso`).
- Arrow/position conventions are not changed; the plan only affects visual facing and animation frames, not board pathfinding rules (no diagonal tile-movement required unless separately approved).

**Not in scope for this plan:** changing gameplay mechanics (damage, range, build costs), altering board/pathfinding rules to allow diagonal steps, or redesigning the existing 28-unit balance. The plan describes assets, facing production, and pipeline updates only.

---

## 2. Verified current-state audit (live checkout, not assumptions)

### 2.1 Repository root and branch
- Path: `/home/user/VoxelAssetGenerator`
- Branch (per system message and `git branch`): `arena/82c2ca28-voxelassetgenerator`
- Previous session work (merged to `main`) added `snow-tile`, `cracked-dry-ground`, `marsh` to the same repository family. That work is reflected in the current checkout: the live `data/voxels.json` and manifest contain 189 model records (not 186 as in the original baseline), and `tools/voxel_pipeline/build.mjs` contains the updated `TERRAIN_MODELS` array including those three IDs.
- File `docs/AGENT_ASSET_WORKFLOW.md` and `docs/AGENT_ASSET_CATALOG.md` exist from prior session; they describe the agent workflow but are not part of the eight-direction plan and do not need to be edited for this plan.

### 2.2 Source files inspected directly

| File | Path | Verified content / responsibility |
|---|---|---|
| Unit definitions (source of truth for IDs, stats, family, weapon, build rules) | `data/units.json` | 28 keys confirmed live: `infantry, mech, engineer, medic, apc, recon, tank, heavy, artillery, antiair, rockets, missiles, mega, submarine, copter, fighter, bomber, gunboat, cruiser, battleship, lander, lift-copter, uhac, uav, mpa, bastion, specter, aegis`. No duplicates; no missing IDs vs prompt list. |
| Animation families / frame budgets | `data/animation.json` | Keys: `format`, `frameBudgets` (`classic`, `iso`), `families` (`foot`, `wheeled`, `tracked`, `rotor`, `jet`, `naval`), `units`, `buildings`, `effects`. Per-family clip structures (`idle`, `move`, `attack`, `death`) vary; not all units share the same counts. Must be preserved or explicitly extended per new family. |
| Canonical voxel data | `data/voxels.json` | Format `field-command-voxel-64x64x64`; `models` count = 189 (includes the 3 new terrain props from prior session + 28 base units + army skins + buildings + terrain); `palette` = 209 colors; `size` = `[64,64,64]`. Not hand-edited; rebuilt by `build.mjs`. |
| Unit geometry / sculpting | `tools/voxel_pipeline/models/units.mjs` | Defines `unitVoxels(c, id, pose)`. Uses tagged groups (`turret`, `barrel`, `rotorMain`, `cleats`, `legs`, etc.) and `poseOpsFor` for mechanical animation. Canonical facing is `right` (+X). |
| Building geometry | `tools/voxel_pipeline/models/buildings.mjs` | Defines `buildingVoxels`. Includes buildings from `BUILDINGS` array (`hq`, `base`, `city`, `airport`, `port`, `farm`, `mine`, `depot`, `landmine`, `supply-depot`, `repair-depot`, `field-hospital`). `landmine` is an owned object, not a generic production building. |
| Terrain geometry | `tools/voxel_pipeline/models/terrain.mjs` | Defines `terrainVoxels` with branches per ID (`tree`, `mountain`, `hill`, `silo`, `silo-spent`, `reef`, `volcano`, `secret-lab`, pipes, bridges, roads, rubble, plus `snow-tile`, `cracked-dry-ground`, `marsh` from prior session). |
| Pipeline build / roster | `tools/voxel_pipeline/build.mjs` | Defines `VOXEL_SIZE = [64,64,64]`; `MODEL_POSES` (frame counts per model family); `BUILDINGS` array; `UNIT_ARMY_IDS` (filtered from `ARMY_IDS` excluding `standard`); `TERRAIN_MODELS` array (now includes new terrain); `UNIT_FAMILY` / `UNIT_WEAPON` mappings; `modelRoster()` builds triples from `units.json`; `sculptModel()` dispatches to `unitVoxels`, `buildingVoxels`, `terrainVoxels`, or `siloMissileVoxels`; `buildVoxels()` writes `data/voxels.json`. |
| Bake / rotation / manifest | `tools/voxel_pipeline/bake.mjs` | Defines `rotateVoxels(voxels, turns)` (quarter-turn about vertical axis, `turns % 4`); produces directional PNG strips per `(model, facing, variant)`; writes `manifest.json` with `format: 'field-command-voxel-sheet-3'`; defines `TEAM_VARIANTS` (`['0','1','2','3','4','5','n']`) for units/buildings and `['n']` for terrain/effects. Four facings hard-coded via rotation logic and manifest fields. |
| Preview / single-render | `tools/voxel_pipeline/preview.mjs` | Reads `data/voxels.json`; renders `right` facing frame 0 into `game_assets/voxels/{id}.png` using `rasterize()`, `downsampleCell()`, `pngBytes()`. Does not render other facings individually; only the baked sheets do that. |
| Army constants | `src/armies.js` | `ARMY_IDS = ['standard','allies','soviets','empire','legion']`. Confirmed live. |
| Manifest (baked output) | `game_assets/voxels/sheets/manifest.json` | 189 model entries; `facings: ["right","up","left","down"]`; `teamVariants` preserved; `gridSize`, `tileSize`, `downscale` unchanged; cell/frame/anchor data per facing. |

### 2.3 Verified differences from the original baseline

| Item | Baseline (prompt) | Live checkout (verified) | Impact on plan |
|---|---|---|---|
| Model count in manifest | 186 | 189 | Prior session added 3 terrain props (`snow-tile`, `cracked-dry-ground`, `marsh`). Plan must treat those as existing and not propose duplicate terrain; new units/buildings must add to 189, not replace. |
| `data/terrain.json` | Mentioned as existing | **Not present** (`ls` shows none) | Do not reference `data/terrain.json` as a source file. If terrain properties are needed, inspect `data/voxels.json` and `models/terrain.mjs`. Report absence rather than inventing content. |
| `build.mjs` facings / rotation | 4 facings | Confirmed: `rotateVoxels` uses `turns % 4`; manifest has 4 | The eight-direction plan must extend `rotateVoxels` or replace it with an 8-step rotation; must update `facings` arrays in manifest and build logic. |
| `animation.json` structure | Family-specific | Confirmed families + `frameBudgets` | New mobile units must supply family clip counts; do not assume uniform clause counts. |
| Existing buildings | Listed in prompt | 11 IDs in `BUILDINGS`; `landmine` is owned, not generic production | Barracks must not collide with `hq`, `base`, `city`, `airport`, `port`, `farm`, `mine`, `depot`, `landmine`, `supply-depot`, `repair-depot`, `field-hospital`. `base` stays as internal Factory ID. |
| Source of render/animation/UI/test code | Prompt implies more files (renderer, AI, editor, tests) | Only `src/armies.js`, `docs/`, `tools/`, `data/`, `game_assets/`, `package.json`, `voxel-sprite-review.html` exist in root | **Reported limitation:** the full gameplay engine (map renderer, AI production logic, build menu, map editor, scenario handler, unit-state code) is not present in this checkout as separate source files. Any plan that depends on those systems must either (a) assume they exist elsewhere in the broader project and document the integration points, or (b) restrict the eight-direction change to the voxel pipeline + manifest + preview + any runtime loader that can be verified from `bake.mjs`/`build.mjs` output. This plan chooses (a) with explicit notes on unverified runtime integration points. |

---

## 3. Existing units, buildings, and terrain that must not be duplicated

### 3.1 Existing unit IDs (28 — verified live, must remain, must not be duplicated by new names)

All 28 have voxel models, animation families, and army variants (base + 4 armies = 5 model designs per unit, except some with different clip structures). No existing ID should be replaced by a visually similar new unit.

| ID | Name | Family / notes | Production facility (current, to be split) |
|---|---|---|---|
| `infantry` | Infantry | `foot` | Currently `base` (will move to Barracks) |
| `mech` | Mech Infantry | `foot` | Currently `base` (will move to Barracks) |
| `engineer` | Engineer | `foot` | Currently `base` (will move to Barracks) |
| `medic` | Field Medic | `foot` | Currently `base` (will move to Barracks) |
| `apc` | APC | `tracked` | `base` (Factory / Vehicle Factory) — stays |
| `recon` | HUMVEE | `wheeled` | `base` — stays |
| `tank` | Light Tank | `tracked` | `base` — stays |
| `heavy` | Heavy Tank | `tracked` | `base` — stays |
| `artillery` | Artillery | `tracked` | `base` — stays |
| `antiair` | AA Tank | `tracked` | `base` — stays |
| `rockets` | MLRS | `wheeled` | `base` — stays |
| `missiles` | SAM Launcher | `wheeled` | `base` — stays |
| `mega` | Assault Tank | `tracked` | `base` — stays |
| `submarine` | Submarine | `naval` | `port` — stays |
| `copter` | Attack Helicopter | `rotor` | `airport` — evaluate vs Helipad |
| `fighter` | Fighter Jet | `jet` | `airport` — stays |
| `bomber` | Bomber | `jet` | `airport` — stays |
| `gunboat` | Patrol Boat | `naval` | `port` — stays |
| `cruiser` | Cruiser | `naval` | `port` — stays |
| `battleship` | Battleship | `naval` | `port` — stays |
| `lander` | Lander | `naval` | `port` — stays |
| `lift-copter` | Lift Copter | `rotor` | `airport` — evaluate vs Helipad |
| `uhac` | UHAC | `naval` | `port` — stays |
| `uav` | Recon Drone | `rotor` | `airport`? (verify) — stays or evaluate |
| `mpa` | Maritime Patrol | `jet` | `airport` — stays |
| `bastion` | Bastion | `tracked` | `base` — stays |
| `specter` | Specter | `jet` | `base`? (verify) — stays |
| `aegis` | Aegis | `wheeled` | `base` — stays |

**Recommendation:** do not propose another generic infantry (`infantry` already exists), another generic tank (`tank`, `heavy`, `mega` exist), another generic fighter (`fighter` exists), another generic bomber (`bomber` exists), another generic helicopter (`copter`, `lift-copter` exist), or another generic patrol/transport navy (`gunboat`, `cruiser`, `battleship`, `lander` exist). All new candidates must have clearly distinct roles and visual silhouettes, as described in Section 4.

### 3.2 Existing buildings / properties (11 model IDs — verified from `build.mjs` `BUILDINGS` array)

| ID | Label / role | Visual/model notes | Must NOT duplicate |
|---|---|---|---|
| `hq` | Headquarters | Large command building | Do not create second HQ |
| `base` / `base` | Vehicle Factory (internal ID `base`) | Existing factory model; player-facing label should become "Vehicle Factory" but internal ID kept for compatibility | Do not create a second factory with same internal ID; do not remove `base` from registries |
| `city` | City / settlement | Large urban property | Do not duplicate |
| `airport` | Airport / runway | Existing fixed-wing aircraft facility | Do not propose another generic Airport; Helipad is a separate, distinct proposal |
| `port` | Port / naval dock | Existing naval production | Do not duplicate |
| `farm` | Farm / resource property | Existing | Do not duplicate |
| `mine` | Mine / gold property | Existing | Do not duplicate |
| `depot` | Supply / depot | Existing | Do not duplicate |
| `landmine` | Owned explosive / defensive object | Not a generic production building; owned by player | Do not treat as normal build-menu production; keep separate |
| `supply-depot` | Supply Depot | Existing | Do not duplicate |
| `repair-depot` | Repair Depot | Existing stationary repair | New `Mobile Repair Vehicle` is a vehicle, not a building; do not replace this |
| `field-hospital` | Field Hospital | Existing | Do not duplicate |

### 3.3 Existing terrain / environment model IDs (verified from `build.mjs` `TERRAIN_MODELS`)

Includes: `tree`, `mountain`, `hill`, `silo`, `silo-spent`, `reef`, `volcano`, `secret-lab`, pipes, bridges (`bridge-ew`, `bridge-ns`, broken variants), `rubble`, `road-0` through `road-f`, plus the 3 new terrain props (`snow-tile`, `cracked-dry-ground`, `marsh`). No new generic terrain needs to be added unless a specific gameplay role justifies it (e.g., marsh/swamp as a new terrain type rather than a tile prop — already present from prior session).

---

## 4. Proposed new unit roster

The prompt lists 7 infantry + 4 land + 3 air + 3 naval candidates (17 total). The plan evaluates each explicitly rather than silently adding all. The recommendation is an initial batch with deferred/optional phases based on visual distinctness, gameplay coherence, and pipeline cost.

### 4.1 Human / infantry (highest priority; all visually distinct from `infantry`/`mech`/`engineer`/`medic`)

| Candidate (proposed ID) | Visual / role | Distinct from existing? | Priority | Production (planned) | Notes / open decision |
|---|---|---|---|---|---|
| `rocket-infantry` | Shoulder-fired anti-vehicle launcher; shorter stance than MLRS, clearly foot-soldier scale | Yes (vs `rockets` vehicle, vs `infantry`) | **Phase 5 — initial batch** | Barracks | Requires new weapon/animation family or reuse of `foot` with custom attack clip; must not collide with MLRS/SAM model IDs |
| `aa-infantry` | Shoulder-fired anti-air missile pack; different launcher shape than `rocket-infantry` | Yes (vs `antiair` vehicle, vs `rocket-infantry`) | **Phase 5 — initial batch** | Barracks | Dedicated air-counter infantry; distinct silhouette from rocket infantry |
| `sniper` | Long rifle, scope, compact pack; precision role | Yes (vs `infantry` generic rifle, vs `recon` vehicle) | **Phase 5 — initial batch** | Barracks | New clip structure possibly needed (slow fire, long range); check `frameBudgets` for `foot` |
| `grenadier` | Pouches / launcher; close-range pressure | **Conditional** (subject to balance/mechanics review — might overlap with `infantry` + grenades if mechanic exists) | **Phase 5 — include only if mechanics approved** | Barracks | Flag as open: if no grenade mechanics exist, defer or design alongside |
| `flamethrower` | Visible fuel tank, hose, nozzle; close-range anti-infantry / fortification | Yes (unique silhouette, unique flame effect needs visual design) | **Phase 5 — include if flame-effect pipeline supported** | Barracks | Requires flame-plume visual / animation support; if not supported by current `poseOpsFor` groups, either add group or defer |
| `demolitionist` | Charges + detonator; sabotage / structure damage | **Conditional** (distinct from `engineer` bridge/mine tasks; must define mechanics) | **Phase 5 — include if demolition mechanic exists or is designed** | Barracks | If no structure-damage mechanic exists, mark deferred; else add |
| `commando` | Elite special-operations silhouette; unique gear | Yes (if designed as clearly elite: different helmet, gear, posture) | **Phase 5 — include if role justified** | Barracks | Must not become just a stronger `infantry` skin; define distinct stat/ability if mechanics allow |

**Initial infantry batch recommendation (Phase 5):** `rocket-infantry`, `aa-infantry`, `sniper` — all clearly distinct, all foot-family, all fit Barracks production. `grenadier`, `flamethrower`, `demolitionist`, `commando` are included in plan but marked **conditional/deferred** pending mechanics confirmation. The implementation agent must confirm each conditional before generating voxel geometry; if unconfirmed, skip and document in the PR.

### 4.2 New land vehicles

| Candidate (proposed ID) | Visual / role | Overlap check | Priority | Facility | Notes |
|---|---|---|---|---|---|
| `tank-destroyer` | Low-profile, long anti-armor gun; not a heavy tank replacement | Distinct from `heavy`, `tank`, `mega`, `artillery` (different silhouette, shorter chassis, longer barrel proportion) | **Phase 6a — land batch 1** | Vehicle Factory (`base`) | Must have tradeoffs (slower, fragile armor, specialized target) so it does not replace `heavy`; define in gameplay design separately |
| `flame-tank` | Armored chassis + fuel tanks + flame projector | Distinct from `tank`, `heavy`, `mega`; unique flame effect | **Phase 6a — include if flame-effect pipeline supported** | Vehicle Factory | Visual effect is substantial; if `poseOpsFor` / group animation cannot support flame projector group, defer |
| `mobile-repair` | Field-service truck / tracked recovery; limited repair near vehicles | Distinct from `repair-depot` (stationary); vehicle role, not building | **Phase 6b — support batch** | Vehicle Factory | Requires new gameplay mechanic (field repair radius); if unsupported, defer |
| `mine-clearing` | Plow / rollers / detection equipment | Distinct from `engineer`; vehicle role | **Phase 6b — include if mine mechanic supports clearing** | Vehicle Factory | If mine system is static only, defer |

**Recommendation:** implement `tank-destroyer` first (clear visual and role); include `flame-tank` only if flame visual pipeline confirmed; defer `mobile-repair` and `mine-clearing` to Phase 6b with mechanism dependencies noted.

### 4.3 New air units

| Candidate (proposed ID) | Visual / role | Overlap / duplication risk | Priority | Facility | Notes |
|---|---|---|---|---|---|
| `ground-attack-jet` | Compact attack aircraft with visible air-to-ground ordnance | **Risk:** could duplicate `fighter` (air-to-air) or `bomber` (heavy bomb load). Must be clearly attack-focused (rocket pods, guided munitions), not just a reskinned `fighter`. | Phase 6c — air batch 1 | Airport (`airport`) | If design is too similar to `fighter`, replace with distinct visual (e.g., stub wings + wing-mounted rockets) |
| `heavy-transport` | Large fuselage / cargo door; transports infantry | **Risk:** duplicates `lift-copter` (air lift) and `lander` (naval land). Must justify fixed-wing vs rotor / naval; requires air-transport mechanic (load/unload, capacity) | Phase 6c — include only if air-transport mechanic exists | Airport (`airport`) | If no load/unload mechanic, defer; do not create sprite-only transport |

**Recommendation:** include `ground-attack-jet` with explicit visual distinction from `fighter`; include `heavy-transport` **only if** an air-unit cargo/loading mechanic is designed. Otherwise defer to Phase 9. Do not propose a new generic fighter, bomber, attack helicopter, recon drone, or maritime patrol — all exist.

### 4.4 New naval units

| Candidate (proposed ID) | Visual / role | Overlap check | Priority | Facility | Notes |
|---|---|---|---|---|---|
| `destroyer` | Medium surface combat; escort, anti-submarine | Distinct from `gunboat` (small), `cruiser` (larger), `battleship` (heavy). Must have different silhouette (longer, medium displacement, distinct superstructure). | Phase 6d — naval batch 1 | Port (`port`) | Clear role; implement if mechanism (escort / ASW) exists |
| `missile-boat` | Fast, lightly armored, missile pods | Distinct from `cruiser` (heavier, more guns) and `gunboat` (small, gun-focused). Must be cheaper, faster, fragile. | Phase 6d — include if missile-boat role fits balance | Port (`port`) | Visual distinction via pod arrangement and smaller hull |
| `carrier` | Large flight deck; aircraft storage/launch/recovery | **High dependency:** requires aircraft storage, launch/recovery, resupply, possibly production of carrier-based units. Not a sprite-only addition. | Phase 9 — deferred / requires system design | Port (`port`) | Must not be added without full mechanism design; this plan explicitly defers |
| `naval-repair` | Cranes / workshop / service equipment; supports field repair | Distinct from `repair-depot` (stationary); requires ship-mechanic support role | Phase 6d / Phase 9 — deferred if no sea-support mechanism | Port (`port`) | Defer unless support-ship mechanic designed |

**Recommendation:** implement `destroyer` and `missile-boat` in Phase 6d if naval balance allows; explicitly **defer** `carrier` and `naval-repair` to Phase 9 with mechanism prerequisites documented.

---

## 5. New building roster (with required separation)

### 5.1 Mandatory: Barracks (new)

- **Proposed ID:** `barracks` (new, must not collide with any existing building ID)
- **Label (player-facing):** Barracks
- **Visual / silhouette:** dedicated infantry-training facility — troop entrance, personnel block, training yard / obstacle area, equipment storage / armory section, faction-colored markings (same team-color logic as `hq`/`base`). Must not be a recolored `base`.
- **Role:** produces human / foot troops. Must be registered in build rules, UI, AI production logic (if present), map editor, and tests.
- **Production assignments (planned):**
  - `infantry`, `mech`, `engineer`, `medic` — migrated from `base` to `barracks`
  - Approved new infantry (`rocket-infantry`, `aa-infantry`, `sniper`; conditional: `grenadier`, `flamethrower`, `demolitionist`, `commando`)
- **Backward compatibility:** `base` (internal Factory ID) must remain valid for existing maps, saves, and rules. The plan uses `barracks` as the new production ID; existing `base` assignments for vehicles remain; new infantry production moves to `barracks`. If the broader project requires player-facing label update, change the display label of `base` to "Vehicle Factory" via UI/text, not by renaming the internal model/ID.

### 5.2 Additional buildings — evaluated, ranked, with recommendation

| Candidate (proposed ID) | Visual / role | Distinction from existing | Priority | Open decision / condition |
|---|---|---|---|---|
| `heli` / `helipad` | Compact single-pad rotary-wing facility; maintenance / refuel / parked helicopter option | Not a new generic Airport; specifically for rotorcraft (`copter`, `lift-copter`, `uav`, possibly new rotor units) | **Phase 7 — evaluate** | Decide whether separating rotorcraft from `airport` adds gameplay value; if adopted, define which units use `airport` vs `helipad`; if not adopted, keep rotorcraft at `airport` |
| `pillbox` | Small concrete emplacement with gun slit | Static close-range anti-infantry defense; not a generic `hq` or `depot` | **Phase 7 — include if defense mechanic supports** | Must not duplicate `landmine`; is stationary defense; if no static-defense mechanic exists, defer |
| `sam-site` | Fixed missile launcher / radar tower | Distinct from mobile `antiair`, `missiles`, `aegis` vehicles | **Phase 7 — include if air-defense mechanic supports** | If no fixed AA site role exists, defer |
| `coastal-battery` | Heavy shore-gun / naval defense | Distinct from mobile naval and from generic `port` | **Phase 7 — include if coastal-defense role exists** | Defer if no shore-defense gameplay |
| `radar` | Tower / dish / operations | Only if coherent spotting / scan role exists; must not duplicate `hq`, `airport` radar, or `recon`/`uav` | **Phase 7 — deferred / conditional** | Defer unless a specific long-range scan or communications role is designed; otherwise skip |

**Recommendation:** implement `barracks` as mandatory Phase 2. For the others, implement `helipad` only if rotorcraft separation is justified; implement `pillbox`/`sam-site`/`coastal-battery` only if corresponding mechanics (static defense, fixed AA, coastal defense) exist; skip `radar` unless a concrete gameplay role is documented.

---

## 6. Barracks / Vehicle Factory production split (with backward compatibility)

### 6.1 Verified current assignments (from `data/units.json` and `build.mjs` / pipeline logic)

The live `data/units.json` does not explicitly contain `buildAt` fields visible in the quick `node -e` output above, but the pipeline's `build.mjs` `modelRoster()` pulls from `units.json` keys and the `BUILDINGS` array defines buildings. The production rules must be inspected more carefully, but the prompt states that `infantry`, `mech`, `engineer`, `field-medic` are currently assigned to `base`. The plan assumes this is the case based on prompt verification and requires the implementation agent to confirm exact assignments from `units.json` / game rules / build menu code before migrating.

### 6.2 Planned split

| Unit group | Facility (after plan) | Notes |
|---|---|---|
| Foot troops: `infantry`, `mech`, `engineer`, `medic` + approved new infantry | `barracks` (new) | Must be migrated from `base`; preserve `base` for vehicles |
| All existing land vehicles (`apc`, `recon`, `tank`, `heavy`, `artillery`, `antiair`, `rockets`, `missiles`, `mega`, `bastion`, `specter`, `aegis`) | `base` / Vehicle Factory | No change to internal ID |
| New land vehicles (`tank-destroyer`, `flame-tank`; conditional `mobile-repair`, `mine-clearing`) | `base` / Vehicle Factory | Add new entries to build rules |
| Air fixed-wing (`fighter`, `bomber`, `mpa`) | `airport` | No change |
| Air rotor (`copter`, `lift-copter`, `uav`) | `airport`, or `helipad` if adopted | Decision deferred to Phase 7 evaluation |
| Naval (`submarine`, `gunboat`, `cruiser`, `battleship`, `lander`, `uhac`) | `port` | No change |

### 6.3 Backward compatibility strategy

- **Do not rename `base` to `vehicle-factory` at the model/ID level.** The internal `base` is referenced by `BUILDINGS`, `buildingVoxels`, manifest model keys, and likely by maps/saves/scripts outside this checkout.
- **Recommended approach:** keep `base` as internal model/ID; update player-facing label/text to "Vehicle Factory" in UI/build menus; add `barracks` as new building identity with its own `buildingVoxels` branch, model registration, and bake output; migrate only the infantry build assignments in rules/menus (not the internal model).
- **If a broader project requires `base` to become an explicit "Factory" label everywhere:** do it via display text / localization, not by renaming the voxel model ID or deleting `base` from `BUILDINGS`.

---

## 7. Eight-facing design (direction labels, mapping, rendering approach)

### 7.1 Verified current system

- `build.mjs`: `VOXEL_SIZE = [64,64,64]`; `rasterize()` draws iso diamond; four facings produced by `rotateVoxels()` with `turns = 0,1,2,3` (quarter turns about Z/vertical axis).
- `bake.mjs`: `rotateVoxels()` rotates voxel coordinates; does not mirror. Manifest records `right`, `up`, `left`, `down` for each model.
- `preview.mjs`: renders `right` facing only for single preview PNG.
- `units.mjs`: canonical facing is `right` (+X); groups define mechanical parts.

### 7.2 Proposed eight logical directions

To be consistent across model baker, manifest, runtime selection, and documentation, use these IDs:

```
up
up-right
right
down-right
down
down-left
left
up-left
```

Round-robin order (clockwise from `up`): `up` → `up-right` → `right` → `down-right` → `down` → `down-left` → `left` → `up-left` → `up`.

### 7.3 Orientation / vector mapping (recommended, to be finalized during implementation)

- Unit facing is derived from its movement direction vector or from a stationary facing state.
- For straight movement (N, E, S, W): map directly to `up`, `right`, `down`, `left`.
- For diagonal movement (NE, SE, SW, NW): resolve to nearest diagonal facing (`up-right`, `down-right`, `down-left`, `up-left`).
- For stationary units: keep last facing; if never moved, default to `right` (matching current canonical facing) or to `up` if that is preferred by game convention; must be consistent across all units.
- Near-diagonal ties: resolution must be deterministic (e.g., larger absolute component wins; or fixed precedence `up-right` preferred over `down-right` when y and x are near-equal). The plan recommends defining a simple rule in `build.mjs` or runtime selection code and documenting it.

### 7.4 Source-level diagonal-rendering approach (recommended, to be implemented)

The current pipeline produces diagonal facings by rotating voxel grids in 90° increments. True diagonal facings (45° intervals) require either:

1. **3D voxel rotation at 45° increments about vertical axis:** rotate source voxels by 45°, 135°, 225°, 315° before rasterizing. This produces genuine diagonal iso views but requires careful handling of grid bounds (64×64 footprint may clip at corners), pixel consistency, and anchor stability.
2. **Resampled isometric projection with sub-voxel interpolation:** more complex, likely unnecessary given 64³ detail.

**Plan recommendation (to be validated during Phase 3):** extend `rotateVoxels` to support 8-step rotation (`turns` mapping to 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5 turns) or add a new `rotateVoxelsDiagonal()` method; evaluate clipping at 45°; if clipping is unacceptable at 64×64, consider slightly expanding the workspace or using a center-crop after rotation; document chosen method in `bake.mjs` comments.

**Important:** eight-facing art must be produced from voxel source, not by rotating or mirroring already-baked 2D sprites as a shortcut. The plan explicitly requires source-level production.

### 7.5 Manifest / bake / preview updates needed

- `build.mjs`: `modelRoster()`, `clipsFor()`, `buildModelFrames()` must handle 8 facings; `sculptModel()` remains the same (it produces canonical `right` / frame 0); bake handles facing rotation.
- `bake.mjs`: `rotateVoxels()` extended; manifest `facings` array updated to 8 entries; `TEAM_VARIANTS` and `BUILTIN_VARIANTS` preserved.
- `preview.mjs`: currently renders only `right`; can remain or be extended to render all 8 facings as preview thumbnails (optional, useful for QA; not required for pipeline correctness if bake produces all strips).
- Manifest version: may stay `field-command-voxel-sheet-3` if 8 facings are backward-compatible (same fields, just longer `facings` array). If runtime loader hard-codes 4 facings, a version bump or loader update is required; document this decision.

### 7.6 Animation clip coverage per facing

Every applicable clip (`idle`, `move`, `attack`, `death`) must have all 8 facings if the clip contains directional content. Non-directional clips (e.g., a static `idle` for a building, or a `death` that is identical from all sides) may share frames, but the manifest must record that consistently. For moving units, `move` and `attack` must include all 8 directions because the unit's facing changes during traversal.

---

## 8. Pipeline and runtime files to change (with each file's planned responsibility)

| File | Planned change | Verification needed |
|---|---|---|
| `tools/voxel_pipeline/models/units.mjs` | Add new unit geometry branches (`rocket-infantry`, `aa-infantry`, `sniper`, etc.); extend group tags if new mechanical parts needed; preserve existing 28 units | Confirm new geometry does not break `unitVoxels()` dispatch |
| `tools/voxel_pipeline/models/buildings.mjs` | Add `barracks`; possibly add `helipad`, `pillbox`, etc. | Confirm `buildingVoxels()` branch exists for new IDs |
| `tools/voxel_pipeline/models/terrain.mjs` | No change required for eight-direction; new terrain already added; preserve existing | Confirm no accidental edits |
| `data/units.json` | Add new unit entries (stats, family, weapon, buildAt, etc.); migrate infantry buildAt from `base` to `barracks` | Confirm JSON conforms to loader expectations |
| `data/animation.json` | Add clip metadata for new families / new units; preserve existing family budgets | Confirm `frameBudgets` and family structures consistent |
| `tools/voxel_pipeline/build.mjs` | Extend `MODEL_POSES` for new units; extend `UNIT_FAMILY` / `UNIT_WEAPON`; update `modelRoster()` if new kinds needed; update `facings` / roast logic for 8 directions; update `BUILDINGS` if new buildings | Confirm `buildVoxels()` writes 8-facing `voxels` correctly |
| `tools/voxel_pipeline/bake.mjs` | Update `rotateVoxels()` or add diagonal method; update manifest `facings`; possibly update `TEAM_VARIANTS` if new variants needed | Confirm manifest format preserved |
| `tools/voxel_pipeline/preview.mjs` | Optionally render all 8 facings; at minimum keep current `right` preview working | Confirm preview PNG count matches model count |
| `game_assets/voxels/sheets/manifest.json` | Rebuilt by `bake.mjs`; must contain 8 facings per model | Verify by reading manifest after rebuild |
| `src/armies.js` | No change unless new armies added (none proposed) | Confirm `ARMY_IDS` preserved |
| Any runtime loader / renderer / UI / AI / editor / test files (not present in this checkout) | Must be identified by implementation agent; must load 8 facings instead of 4; update facing selection; test against new manifest | Report which files were updated in PR description |

---

## 9. Phased implementation roadmap (dependencies, exit criteria)

The phases are designed to allow independent testing and rollback. They assume the agent can run `npm run voxels:build / preview / bake / all` at each stage and inspect outputs via `voxel-sprite-review.html` or `voxel-sprite-review-improved.html`.

### Phase 1 — Audit and production-system design (no asset generation)
- **Tasks:** Confirm all 28 existing units, `BUILDINGS`, animations, family budgets, build rules; document exact build-assignment mapping; verify `data/terrain.json` absence; record exact 189-model manifest; decide new roster (which candidates confirmed vs deferred); decide `rotating` method for 8 facings; document manifest versioning strategy.
- **Dependencies:** None.
- **Exit criteria:** Written design doc (this plan updated if changes made); confirmed list of new model IDs; confirmed facing-method choice; confirmed backward-compatibility approach for `base`/`barracks`; no regenerated PNG/JSON.
- **Test:** `node -e` queries confirming counts; no `git status` changes to generated files.

### Phase 2 — Barracks / Vehicle Factory separation (building + rules)
- **Tasks:** Author `barracks` voxel geometry (`models/buildings.mjs`); register in `BUILDINGS`; add to `BUILDING_IDLE`; rebuild `data/voxels.json`; bake strips; update build/production rules to assign infantry to `barracks` (keep `base` for vehicles); update any UI/menu references if present; verify `base` still produces vehicles.
- **Dependencies:** Phase 1 complete; mechanism for infantry production exists.
- **Exit criteria:** `barracks` preview and 4-facing strips exist; `barracks` in manifest; infantry build rules reference `barracks`; `base` still produces `apc`, `tank`, etc.; old maps/saves not broken.
- **Test:** Inspect `game_assets/voxels/barracks.png`; verify manifest; check build rules; confirm `infantry` no longer builds from `base` (if rules allow quick verification).

### Phase 3 — Eight-direction technical foundation (source-level, no new assets yet)
- **Tasks:** Extend `rotateVoxels()` or implement diagonal rotation; update `build.mjs` to generate 8 facings; update `bake.mjs` manifest generation; update `preview.mjs` if needed; test on a single existing unit (e.g., `infantry`) to verify 8 strips, anchors, no clipping.
- **Dependencies:** Phase 2 not strictly required, but safer to complete Phase 2 first to avoid mixing building and facing changes in same PR.
- **Exit criteria:** At least one existing unit has 8 valid facing strips; manifest `facings` has 8 entries; anchors stable; no clipping; rotation is not mirrored; old 4-facing strips can be reproduced if needed.
- **Test:** `npm run voxels:all` on `infantry`; inspect 8 strips; compare with previous 4-strip version; measure file-size impact.

### Phase 4 — Existing-unit conversion (all 28 existing mobile units, all army designs, all animation clips)
- **Tasks:** Rebuild all 28 mobile units with 8 facings; include all army skins (`standard`, `allies`, `soviets`, `empire`, `legion`); preserve animation clip frames; verify no degradation for buildings/terrain (they keep existing 4-facing or static); rebuild manifest.
- **Dependencies:** Phase 3 proven.
- **Exit criteria:** Every mobile unit has 8 facing entries; all 5 army designs have 8 facing entries per model; clips (`idle`, `move`, `attack`, `death`) preserved; no lost frames; anchors consistent.
- **Test:** Automate or manually sample units from each family (`foot`: `infantry`; `tracked`: `tank`; `wheeled`: `recon`; `rotor`: `copter`; `jet`: `fighter`; `naval`: `submarine`); verify 8 strips exist per model per clip; check `game_assets/voxels/{id}.png` still correct.

### Phase 5 — New infantry batch
- **Tasks:** Author `rocket-infantry`, `aa-infantry`, `sniper`; optionally `grenadier`/`flamethrower`/`demolitionist`/`commando` only if confirmed; add to `data/units.json`; define families/assets; add to `build.mjs`/`units.mjs`; register for Barracks production; rebuild; bake.
- **Dependencies:** Phase 4 (8-facing pipeline) + Phase 2 (Barracks) complete.
- **Exit criteria:** All approved new infantry have 8 facings, variants, animations; available from `barracks`; previews correct; no ID conflicts.
- **Test:** Preview and 8-strip check per new unit; confirm `barracks` production rules include them.

### Phase 6 — New vehicle batches (separately testable groups)
- **Phase 6a:** `tank-destroyer`; optionally `flame-tank`
- **Phase 6b:** `mobile-repair`, `mine-clearing` (defer if mechanisms missing)
- **Phase 6c:** `ground-attack-jet`; `heavy-transport` (defer if mechanism missing)
- **Phase 6d:** `destroyer`; `missile-boat`; defer `carrier`, `naval-repair`
- **Dependencies:** Phase 4 complete; Phase 2 complete (Barracks not strictly required but helps separation testing).
- **Exit criteria:** Each approved vehicle has 8 facings, correct family, correct facility assignment; no duplicate roles.
- **Test:** Per-group preview + 8-strip check.

### Phase 7 — Additional buildings (conditional)
- **Tasks:** Author `helipad` (if adopted); `pillbox`; `sam-site`; `coastal-battery`; `radar` (if mechanism exists). Rebuild; bake.
- **Dependencies:** Phase 2 complete.
- **Exit criteria:** Approved buildings in manifest; correct production/build rules; no duplication.
- **Test:** Preview and manifest check per building.

### Phase 8 — Preview / QA / reviewer update
- **Tasks:** Update `voxel-sprite-review.html` or `voxel-sprite-review-improved.html` to support 8-direction filtering and side-by-side comparison; add quick filter for "8 directions" if needed; validate anchors, transparency, frame consistency across all facings.
- **Dependencies:** Phase 4 (all existing mobile) + Phase 5-7 (new assets) done.
- **Exit criteria:** Developer can compare all 8 facings of a selected unit; can scrub animation frames; no visual jumps or clipping visible at tile scale.
- **Test:** Manual review via improved reviewer; compare `right` vs `up-right` vs `down` for a sample of units from each family.

### Phase 9 — Integration, regression, documentation
- **Tasks:** Run full `npm run voxels:all`; verify `data/voxels.json`; verify manifest; check old maps/saves compatibility (if testable); document any known limitations (e.g., if `carrier` deferred due to missing mechanism); update docs if needed.
- **Dependencies:** All prior phases.
- **Exit criteria:** Clean rebuild from clean checkout; no missing sheets/previews; manifest format preserved; all new IDs present; old IDs untouched; performance/size impact estimated.
- **Test:** Full pipeline commands; file-size comparison (before vs after) for `data/voxels.json` and `sheets/` payload; verify no stale generated assets left over.

---

## 10. QA, regression tests, performance/size considerations, acceptance checklist

### 10.1 Concrete checks (must pass for plan to be considered implemented)

- [ ] Every existing mobile unit (28 IDs, all 5 army skins where applicable) has 8 valid facing entries in manifest.
- [ ] Every approved new mobile unit has 8 valid facing entries + intended variants.
- [ ] No facing uses mirrored 2D rotation; all 8 produced from source voxel rotation.
- [ ] Frame anchors (`anchorX`, `anchorY`) consistent across all 8 facings for same frame; no ground-position jumps.
- [ ] Every `move` clip contains genuine frame changes; `attack`/`death` preserved; no accidentally omitted clips.
- [ ] `barracks` recognized by all relevant pipelines (build, preview, bake, manifest, UI if present) and has registered model + baked strips.
- [ ] Infantry/Mech/Engineer/Medic build at `barracks`; existing vehicles build at `base`; airport/port unchanged.
- [ ] Existing build/menu/AI/editor behavior preserved (no broken references to `base` for vehicles, no missing `barracks` entries for infantry).
- [ ] `data/voxels.json` rebuilt from source; `manifest.json` rebuilt by bake; no hand-edited JSON in pipeline.
- [ ] Old maps/saved games/loaders work (if testable from available source); if not testable from this checkout, document as unverified integration point.
- [ ] No duplicate IDs; no missing `units.json` entries; no missing `animation.json` families for new units.
- [ ] New assets have original voxel designs — not copied from commercial sprites.
- [ ] All new units/variants match existing palette and isometric scale.
- [ ] Build/rebuild/reviewer commands work from clean checkout (`npm run voxels:all` completes, outputs count matches expectation).

### 10.2 Tests / commands for implementation agent to run

```bash
# Phase validation commands (do not run now — for future implementation)
npm run voxels:build        # must complete, write data/voxels.json
npm run voxels:preview      # must complete, write 189+ previews
npm run voxels:bake         # must complete, write 3844+ strips, manifest v3 preserved
node tools/validate-animation.mjs  # if available; check animation consistency
# Visual QA (manual via reviewer or image inspection):
# open voxel-sprite-review-improved.html at localhost:8080; filter by asset / facing
```

**Performance/size:** the current payload is ~34.8 MB PNG payload for 3844 strips (from bake log). Adding 3 new terrain props added 12 strips; adding 28 mobile units with 8 facings instead of 4 will roughly double facing strips for mobile units (28 units × ~5 army variants × ~4 clips × 4 new facings = significant increase). The plan recommends measuring payload after Phase 4; set acceptance threshold based on actual measurement (e.g., ≤ 2× previous payload for mobile assets, or profile with `ls -l` / `du -sh` after rebuild). If payload exceeds target, consider selective preview generation (not all strips required for every clip) — but manifest must remain complete for runtime.

---

## 11. Risks, tradeoffs, open decisions, deferred work

| Risk / open decision | Status | Recommendation / mitigation |
|---|---|---|
| `data/terrain.json` missing | **Verified difference** — file not in repo; not needed for plane because terrain uses `data/voxels.json` + `models/terrain.mjs` | Do not invent `terrain.json`; use existing source paths |
| Manifest / runtime loader may hard-code 4 facings | **Open — unverified** because loader code not in this checkout | Implementation must inspect loader; if hard-coded, design backward-compatible loader update or version bump; document in PR |
| `rotateVoxels()` at 45° may cause clipping / anchor shift | **Open — requires Phase 3 testing** | Test on `infantry`; if unacceptable, consider expanding workspace or using center-crop; document final method |
| New infantry requires new mechanics (grenade, flame, demolition) | **Conditional / deferred** | Do not generate geometry for `grenadier`/`flamethrower`/`demolitionist`/`commando` until mechanics confirmed; if unconfirmed, skip and document |
| `heavy-transport` / `carrier` require cargo/launch mechanics | **Deferred to Phase 9 or skip** | Do not generate until mechanism designed; do not create sprite-only additions |
| Full gameplay engine (renderer, AI, editor, tests) not in checkout | **Verified limitation** | Plan integration points (build rules, manifest, preview) only; document that runtime loader / UI / AI updates must be verified separately by implementation agent |
| `base` internal ID vs player-facing "Vehicle Factory" | **Open design choice** | Recommend label-change via UI/text; do not rename internal model; document clearly |
| Prior session added 3 terrain props (189 models) | **Verified** — not a risk, but must not be overwritten or treated as new duplicates | Include them in Phase 4 conversion; do not propose duplicate terrain |
| Performance / file-size increase from 4→8 facings | **Measurable risk** | Measure after Phase 4; set threshold in Phase 9; if needed, optimize preview or strip generation (not manifest completeness) |

**Deferred work (explicitly not in initial phases):** `carrier`, `naval-repair`, `radar` (unless mechanism designed); `grenadier`/`flamethrower`/`demolitionist`/`commando` (unless mechanics confirmed); `heavy-transport` (unless air-cargo mechanism exists). These are described in Sections 4 and 5 for completeness but are not required for the core eight-direction + Barracks + first infantry/vehicle batches.

---

## 12. Final constraints (must hold for this plan)

- No implementation performed by this document. Only `docs/PLAN_new_assets_and_voxel_eight_direction_movement.md` created; no source/data/PNG/manifest/HTML edited for plan content; previous session's `docs/AGENT_ASSET_WORKFLOW.md`, `docs/AGENT_ASSET_CATALOG.md`, `voxel-sprite-review-improved.html`, `tools/voxel_pipeline/registry.mjs`, and new asset PNGs remain as-is and are not altered by this planning step.
- Plan is specific to `arena/82c2ca28-voxelassetgenerator` checkout, referencing exact paths (`data/units.json`, `data/animation.json`, `data/voxels.json`, `game_assets/voxels/sheets/manifest.json`, `tools/voxel_pipeline/build.mjs`, `bake.mjs`, `preview.mjs`, `models/units.mjs`, `models/buildings.mjs`, `models/terrain.mjs`, `src/armies.js`).
- Plan distinguishes verified audit findings (file counts, format strings, rotation logic, missing `terrain.json`, 189-model manifest) from recommendations (8-direction method, new roster selections, deferred work, backward-compatibility approach).
- All proposed new assets are described with visual/role distinctions and cross-checked against existing 28 units and 11 buildings; no silent duplicates proposed.
- Eight-facing design is described at source level (voxel rotation / bake / manifest) rather than as a 2D sprite rotation shortcut.
- Phase structure is independent, testable, and ordered by dependency (audit → building separation → 8-dir foundation → existing-unit conversion → new batches → QA → integration).
- Acceptance criteria include concrete checks for manifest entries, anchor consistency, clip preservation, Barracks registration, production split, old-map compatibility, and performance measurement.

---

## Appendix: Key file paths (for implementation agent reference)

```
Repository root: /home/user/VoxelAssetGenerator
Branch: arena/82c2ca28-voxelassetgenerator
Plan doc: docs/PLAN_new_assets_and_voxel_eight_direction_movement.md
Source models: tools/voxel_pipeline/models/units.mjs, buildings.mjs, terrain.mjs
Pipeline build: tools/voxel_pipeline/build.mjs
Pipeline bake: tools/voxel_pipeline/bake.mjs
Pipeline preview: tools/voxel_pipeline/preview.mjs
Unit definitions: data/units.json
Animation metadata: data/animation.json
Canonical voxel data (rebuilt): data/voxels.json
Army constants: src/armies.js
Baked manifest: game_assets/voxels/sheets/manifest.json
Preview PNGs: game_assets/voxels/*.png
Baked strips: game_assets/voxels/sheets/*.png
Improved reviewer (prior session): voxel-sprite-review-improved.html (served at localhost:8080)
Registry helper (prior session): tools/voxel_pipeline/registry.mjs
Workflow docs (prior session): docs/AGENT_ASSET_WORKFLOW.md, docs/AGENT_ASSET_CATALOG.md
```

---

*End of planning document. No code implemented; no pipeline rebuilt; no new assets authored; no data files edited. Ready for phased implementation per Sections 9–11 when approved.*
