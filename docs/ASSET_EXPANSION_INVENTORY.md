# Voxel Asset Expansion, 8-Direction Unit Pipeline & 4-Direction Building Specification

## 1. Directional & Production Rules

- **Mobile Units (8 Directional Facings)**:
  - All `58` base mobile units (`290` total unit models across `standard`, `allies`, `soviets`, `empire`, `legion`) are rendered in **8 true 3D isometric facings**:
    - `right` (East `↘`), `up-right` (Northeast `→`), `up` (North `↗`), `up-left` (Northwest `↑`), `left` (West `↖`), `down-left` (Southwest `←`), `down` (South `↙`), `down-right` (Southeast `↓`).
  - Diagonal facings (`up-right`, `down-right`, `down-left`, `up-left`) rotate the un-hollowed 3D voxel geometry by `±45°` / `±135°` with isometric aspect compensation (`su = 0.82, sv = 1.22`) before hollowing. No 2D sprite rotation or asymmetric mirroring is used.
- **Buildings, Walls & Terrain (4 Cardinal Facings Only)**:
  - All `26` buildings (`BUILDINGS`) and `55` terrain/wall/effect models (`TERRAIN_MODELS`) are baked in **4 cardinal facings only** (`right`, `up`, `left`, `down`, registered in `manifest.json` under `buildingFacings`).
  - All 564 stale diagonal (`up-right`, `up-left`, `down-right`, `down-left`) building and terrain PNG strips have been removed.
- **Production Separation (`barracks` vs `base`)**:
  - All 16 human/canine foot units set `"buildAt": "barracks"`.
  - All 21 land vehicles set `"buildAt": "base"` (preserving `base` as Vehicle Factory).
  - All 11 aircraft set `"buildAt": "airport"`.
  - All 11 naval vessels set `"buildAt": "port"`.

---

## 2. Asset Audit & Classification Inventory

### A. Human / Foot Units (`buildAt: "barracks"`, 8 Facings)

| Proposed Asset | Canonical ID | Classification | Notes |
| :--- | :--- | :--- | :--- |
| Rifle Infantry | `infantry` | `already exists` | Existing rifle squad; verified 8-direction sheets |
| Anti-Tank Mech | `mech` | `already exists` | Existing heavy bazooka infantry; verified 8-direction sheets |
| Combat Engineer | `engineer` | `already exists` | Existing capture/construction specialist |
| Field Medic | `medic` | `already exists` | Existing infantry healer |
| Rocket Infantry | `rocket-infantry` | `already exists` | Existing shoulder-fired rocket trooper; normalized `buildAt: "barracks"` & `animation.json` |
| Anti-Air Infantry | `aa-infantry` | `already exists` | Existing MANPADS trooper; normalized `buildAt: "barracks"` & `animation.json` |
| Sniper | `sniper` | `already exists` | Existing ghillie/optic marksman; normalized `buildAt: "barracks"` & `animation.json` |
| Grenadier | `grenadier` | `new asset` | Revolving drum grenade launcher, grenade bandolier, blast pauldrons |
| Flamethrower Trooper | `flamethrower` | `new asset` | Twin red dorsal fuel cylinders, respirator visor, flame nozzle with pilot jet |
| Demolitionist | `demolitionist` | `new asset` | Detonator pack with T-plunger, primed C4 satchel charge, clacker |
| Commando | `commando` | `new asset` | Elite red beret, green NVG goggles, suppressed bullpup rifle with laser sight |
| Officer | `officer` | `new asset` | High-peaked officer visor cap with gold cockade, gold epaulettes, binoculars & saber |
| Spy / Infiltrator | `spy` | `new asset` | Dark covert trench coat, wide-brimmed fedora with team band, briefcase & silenced pistol |
| Elite Hero | `elite-hero` | `new asset` | Flowing cape with gold trim, crested helmet with cyan T-visor, twin-barrel heavy carbine |
| Attack Dog | `attack-dog` | `new asset` | 4-legged K9 Shepherd with pointed ears, dark muzzle, alert tail, and team harness |
| Foot Recon Scout | `scout` | `new asset` | Soft recon boonie hat, long-range whip antenna pack, dual-lens binoculars |

### B. Land Vehicles (`buildAt: "base"`, 8 Facings)

| Proposed Asset | Canonical ID | Classification | Notes |
| :--- | :--- | :--- | :--- |
| APC / Troop Carrier | `apc`, `recon`, `tank`, `heavy`, `mega`, `bastion`, `artillery`, `rockets`, `antiair`, `missiles`, `aegis` | `already exists` | Existing tracked/wheeled combat roster preserved |
| Infantry Fighting Vehicle (IFV) | `ifv` | `new asset` | Sloped troop hull with vision ports, rear ramp, 2-man turret, 30mm autocannon + ATGM pod |
| Supply Truck | `supply-truck` | `new asset` | 6×6 logistics truck with cab-over-engine cab, olive canvas bows, ammo crate & fuel drums |
| Mobile Repair Vehicle | `mobile-repair` | `new asset` | Armored engineering vehicle with amber beacons, welding cylinders, tool chest & yellow crane jib |
| Mobile Command Vehicle | `command-vehicle` | `new asset` | 6×6 C4I command van with map-room windows, white satcom dome, planar radar & whip antennas |
| Mine-Laying Vehicle | `mine-layer` | `new asset` | Tracked minelayer with open rear mine magazine (6 visible mines) and dual stern deployment chutes |
| Tank Destroyer | `tank-destroyer` | `new asset` | Low-profile turretless casemate tank hunter with schürzen skirts, cast mantlet & long HV gun |
| Flame Tank | `flame-tank` | `new asset` | Twin external red napalm drums with yellow hazard bands + shrouded flame projector & pilot flame |
| Amphibious Tank | `amphibious-tank` | `new asset` | Boat-bow hull with erected surf-breaker board, waterline plimsoll stripe, snorkel & stern waterjets |
| Mine-Clearing Vehicle | `mine-clearing` | `new asset` | Reinforced engineering hull with roof line-charge tub & front V-shaped toothed steel mine plow |

### C. Air Units (`buildAt: "airport"`, 8 Facings)

| Proposed Asset | Canonical ID | Classification | Notes |
| :--- | :--- | :--- | :--- |
| Existing Aircraft | `copter`, `lift-copter`, `fighter`, `bomber`, `uav`, `mpa`, `specter` | `already exists` | Existing rotorcraft, fighters, bombers, UAV, MPA, and flying-wing stealth bomber (`specter`) |
| Ground-Attack Jet | `ground-attack-jet` | `new asset` | A-10/Su-25 CAS silhouette: straight wings with 4 rocket/AGM pylons, dorsal twin turbofans, H-tail & rotary nose gun |
| Transport Plane | `transport-plane` | `new asset` | Heavy 4-engine fixed-wing airlifter (`cargo: 2`) with wide fuselage, rear ramp, high wings & T-tail |
| Stealth Aircraft | `stealth-fighter` | `new asset` | Angular F-22/F-35 stealth air-superiority fighter (`weapon: "airMissile"`, distinct from flying-wing bomber `specter`) |
| Spy Plane | `spy-plane` | `new asset` | High-altitude U-2/SR-71 strategic recon jet (`vision: 8`) with full-span glider wings & ventral camera window |

### D. Naval Units (`buildAt: "port"`, 8 Facings)

| Proposed Asset | Canonical ID | Classification | Notes |
| :--- | :--- | :--- | :--- |
| Existing Naval Roster | `submarine`, `gunboat`, `cruiser`, `battleship`, `lander`, `uhac` | `already exists` | Existing naval combat & amphibious transport roster preserved |
| Destroyer | `destroyer` | `new asset` | Multi-role escort warship with stealthy superstructure, rapid-fire 5-inch bow gun, angled ASM canisters & aft helipad |
| Missile Boat | `missile-boat` | `new asset` | Fast coastal attack corvette with bow rotary gun and twin oversized angled anti-ship missile box launchers |
| Aircraft Carrier | `carrier` | `new asset` | Full-deck flattop carrier (`cargo: 2`) with angled runway markings, bow ski-jump, starboard island & parked strike jets |
| Naval Repair Ship | `naval-repair` | `new asset` | Fleet tender with forward bridge, amber beacons, machine-shop containers, welding tanks & twin yellow gantry cranes |
| Mine-Laying Vessel | `mine-layer-ship` | `new asset` | Broad-transom minelayer with twin stern mine rails carrying 6 horned naval contact mines & transom chutes |

### E. Buildings, Defenses, Walls & Landmine (4 Cardinal Facings Only)

| Proposed Asset | Canonical ID | Classification | Notes |
| :--- | :--- | :--- | :--- |
| Core Buildings & Depots | `hq`, `base`, `city`, `airport`, `port`, `farm`, `mine`, `depot`, `supply-depot`, `repair-depot`, `field-hospital` | `already exists` | Existing buildings preserved (`base` remains Vehicle Factory); 4 cardinal facings enforced |
| Barracks | `barracks` | `redesign existing` | Redesigned with 2-storey troop dormitory + porch, armory bunker, obstacle course, rifle targets, flagpole & guarded gate |
| Landmine | `landmine` | `redesign existing` | Redesigned grounded beveled olive-steel mine casing with radial ribs, team stencil arcs, 4-prong spider fuze + red pin & grounded tripwire stake |
| Allied Helipad | `helipad` | `new asset` | Elevated tarmac landing pad with yellow/white `H` circle, approach beacons, JP-8 fuel tank & control booth with windsock |
| Power Plant | `power-plant` | `new asset` | Turbine generator hall with twin smokestacks, waisted hyperboloid cooling tower with steam vapor, and HV transformer switchyard |
| Resource Refinery | `refinery` | `new asset` | Covered dump-truck ore hopper bay, smelting hall, twin tall distillation columns, spherical storage tank & active gas flare stack |
| Radar Station | `radar-station` | `new asset` | Hardened C4I bunker, white geodesic satcom radome, steel lattice tower & rotating parabolic radar dish (`idle: 2`) |
| Research Laboratory | `research-lab` | `new asset` | Player-owned modernist L-shaped R&D wings with cyan cleanroom glazing, solar array & glowing magnetic-containment dome |
| Machine-Gun Pillbox | `pillbox` | `new asset` | Compact octagonal ferro-concrete strongpoint with sandbag revetment ring, firing slits & twin protruding heavy MGs |
| Reinforced Bunker | `bunker` | `new asset` | Heavy rectangular fortified casemate with corner buttresses, casemate cannon, searchlight, cupola & rear blast door |
| Anti-Tank Turret | `at-turret` | `new asset` | Sunken octagonal concrete gun pit with hazard stripes, sloped tank-hunter turret, rangefinder ears & long 120mm AT gun |
| SAM Missile Site | `sam-site` | `new asset` | Blast-deflector pad, corner fire-control radar van & dish, rotatable pedestal & 4-rail elevated SAM launcher |
| Flak Cannon | `flak-cannon` | `new asset` | Circular sandbagged/concrete AA pit with ammo crates, cruciform mount, armored gun shield & quad high-angle flak barrels |
| Coastal Defense Gun | `coastal-battery` | `new asset` | Tiered ferro-concrete shore battery casemate with blast visor, rooftop optical rangefinder tower & twin naval-caliber guns |
| Long-Range Artillery Emplacement | `artillery-emplacement` | `new asset` | Horseshoe earthwork/concrete gun pit, rear ammo bunker with brass shells, turntable carriage & long-range siege howitzer |
| Guard Tower | `guard-tower` | `new asset` | Tall cross-braced steel watchtower (`z = 0..62`), ground sentry booth + barrier arm, enclosed observation cab, searchlight & MG |
| Concrete Walls | `wall-standard`, `wall-allies`, `wall-soviets`, `wall-empire`, `wall-legion`, `wall-end`, `wall-corner`, `wall-t`, `wall-cross` | `already exists` | Tall fortified reinforced concrete walls (`z = 0..38`), 4 cardinal facings only |
| Faction Wall Gates | `wall-gate`, `wall-gate-allies`, `wall-gate-soviets`, `wall-gate-empire`, `wall-gate-legion` | `new asset` | Twin concrete gatehouse towers (`z = 0..42`), overhead crenellated arch walkway, armored roadway & raised steel portcullis |
