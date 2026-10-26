# Asset Sizing Matrix — 128×128×128 canvas, 32-unit tile grid

**Generated** by `tools/voxel_pipeline/sizing-matrix.mjs` from `data/voxels.json`
and `game_assets/voxels/sheets/manifest.json`. Do not edit by hand: re-run
`npm run voxels:review` after a rebuild.

## Conventions

- One ground tile = **32 × 32 world voxels**, projected as a **128 × 64 px**
  isometric diamond (**4 px per voxel horizontally, 2 px per voxel
  vertically**). The tile got bigger when the tile-grid unit got smaller, so a
  1×1 asset still gets a full-size sprite and stays crisp.
- Maximum model canvas = **128 × 128 × 128 voxels** = 4 × 4 tiles.
- `gameplay footprint` = cells a structure occupies for placement, collision,
  selection and ownership. `visual footprint` = ground area the sprite covers.
  Both are listed; both are equal for the current roster (no decorative overhang
  that would confuse placement).
- `model bounds` = the painted geometry inside the 128³ authoring canvas.
- Buildings sit on integer tile footprints that are multiples of 32 voxels:
  1×1, 2×2, 3×2, 3×3 are in use.
- Units use **role size classes** — 1, 1.25, 1.5, 1.75 and 2 tiles — because
  the game moves units on floating-point positions rather than snapping them to
  a grid cell. A rifleman is 1×1; a battleship is 2×2.
- Heights are deliberately *not* proportional to footprint: a radar tower is
  tall and narrow, a runway is wide and low.

## Coverage summary

| metric | count |
| --- | --- |
| Models in `data/voxels.json` | 500 |
| Base units | 58 |
| Unit faction variants | 232 |
| Base buildings / structures | 26 |
| Building faction variants | 104 |
| Terrain models | 79 |
| Effects | 1 |
| Multi-tile (2×2 and larger) ids | 295 |
| Validated (bake + manifest + bounds) | 500 / 500 |

## Footprint classes in use

| class | voxels | assets |
| --- | --- | --- |
| 1.25×1.25 | 40×40 | recon, uav |
| 1.5×1.5 | 48×48 | apc, copter, lift-copter, aegis, ifv, supply-truck, mobile-repair, command-vehicle |
| 1.75×1.75 | 56×56 | tank, heavy, antiair, rockets, missiles, mega, submarine, fighter, gunboat, lander, uhac, bastion, mine-layer, tank-destroyer, flame-tank, amphibious-tank, mine-clearing, ground-attack-jet, stealth-fighter, spy-plane, missile-boat, naval-repair, mine-layer-ship |
| 1×1 | 32×32 | infantry, mech, engineer, medic, rocket-infantry, aa-infantry, sniper, grenadier, flamethrower, demolitionist, commando, officer, spy, elite-hero, attack-dog, scout, landmine, pillbox, bunker, at-turret, sam-site, flak-cannon, coastal-battery, artillery-emplacement, guard-tower, tree, mountain, hill, silo, silo-spent, reef, volcano, secret-lab, pipe-ew, pipe-ns, pipe-seam-ew, pipe-seam-ns, snow-tile, cracked-dry-ground, marsh, plains, tallgrass, sea, shoal, rubble, elevation-00, elevation-04, elevation-08, elevation-12, elevation-16, elevation-20, elevation-24, elevation-28, elevation-32, wall-standard, wall-allies, wall-soviets, wall-empire, wall-legion, wall-end, wall-end-allies, wall-end-soviets, wall-end-empire, wall-end-legion, wall-corner, wall-corner-allies, wall-corner-soviets, wall-corner-empire, wall-corner-legion, wall-t, wall-t-allies, wall-t-soviets, wall-t-empire, wall-t-legion, wall-cross, wall-cross-allies, wall-cross-soviets, wall-cross-empire, wall-cross-legion, wall-gate, wall-gate-allies, wall-gate-soviets, wall-gate-empire, wall-gate-legion, silo-missile, road-0, road-1, road-2, road-3, road-4, road-5, road-6, road-7, road-8, road-9, road-a, road-b, road-c, road-d, road-e, road-f, bridge-ew, bridge-ns, bridge-broken-ew, bridge-broken-ns |
| 2×2 | 64×64 | artillery, bomber, cruiser, battleship, mpa, specter, transport-plane, destroyer, carrier, base, city, farm, mine, depot, supply-depot, repair-depot, field-hospital, barracks, helipad, power-plant, refinery, radar-station, research-lab |
| 3×2 | 96×64 | port |
| 3×3 | 96×96 | hq, airport |

## Units

Units are authored at 64³ design resolution. Each unit's role picks a **size
class** from `UNIT_SIZES` in `tools/voxel_pipeline/scale.mjs`, which yields a
target footprint in tiles. The model is then resampled by **one uniform factor**
(nothing is stretched per axis) so it fills that footprint plus its role height.

Size classes exist because units are *not* grid-locked: the game integrates
their positions as floating-point world units, so a 1.25-tile tank destroyer is
as valid as a 1-tile rifleman. A 2-tile battleship therefore really is twice the
ground footprint of an infantry squad, while a 1-tile machine-gunner stays
human-sized.

| size class | tiles | world voxels | units |
| --- | --- | --- | --- |
| 1× | 1 × 1 | 32 × 32 | `infantry`, `mech`, `engineer`, `medic`, `rocket-infantry`, `aa-infantry`, `sniper`, `grenadier`, `flamethrower`, `demolitionist`, `commando`, `officer`, `spy`, `elite-hero`, `attack-dog`, `scout` |
| 1.25× | 1.25 × 1.25 | 40 × 40 | `recon`, `uav` |
| 1.5× | 1.5 × 1.5 | 48 × 48 | `apc`, `copter`, `lift-copter`, `aegis`, `ifv`, `supply-truck`, `mobile-repair`, `command-vehicle` |
| 1.75× | 1.75 × 1.75 | 56 × 56 | `tank`, `heavy`, `antiair`, `rockets`, `missiles`, `mega`, `submarine`, `fighter`, `gunboat`, `lander`, `uhac`, `bastion`, `mine-layer`, `tank-destroyer`, `flame-tank`, `amphibious-tank`, `mine-clearing`, `ground-attack-jet`, `stealth-fighter`, `spy-plane`, `missile-boat`, `naval-repair`, `mine-layer-ship` |
| 2× | 2 × 2 | 64 × 64 | `artillery`, `bomber`, `cruiser`, `battleship`, `mpa`, `specter`, `transport-plane`, `destroyer`, `carrier` |

Larger classes carry the heavy hardware: a 2×2 battleship or strategic bomber
has four times the ground area of an infantry squad at the same sprite density,
which is what makes the hierarchy readable on the map. Every unit keeps eight
directional facings and six team variants.

### Base unit types

| id | category | height class | size class | footprint (tiles) | model bounds (voxels) | render scale | facings | variants | frame cells | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `infantry` | Infantry | human | 1× | 1×1 (32×32) | 22×16×23 | 1 | 8 | 6 | 13 | ✅ |
| `mech` | Infantry | human | 1× | 1×1 (32×32) | 23×17×23 | 1 | 8 | 6 | 13 | ✅ |
| `engineer` | Infantry | human | 1× | 1×1 (32×32) | 25×16×23 | 1 | 8 | 6 | 10 | ✅ |
| `medic` | Infantry | human | 1× | 1×1 (32×32) | 17×16×23 | 1 | 8 | 6 | 10 | ✅ |
| `apc` | tracked | vehicle | 1.5× | 1.5×1.5 (48×48) | 36×33×27 | 1 | 8 | 6 | 9 | ✅ |
| `recon` | wheeled | vehicle | 1.25× | 1.25×1.25 (40×40) | 31×23×28 | 1 | 8 | 6 | 12 | ✅ |
| `tank` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 47×39×30 | 1 | 8 | 6 | 12 | ✅ |
| `heavy` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 52×45×32 | 1 | 8 | 6 | 12 | ✅ |
| `artillery` | tracked | vehicle | 2× | 2×2 (64×64) | 54×44×41 | 1 | 8 | 6 | 12 | ✅ |
| `antiair` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 43×39×36 | 1 | 8 | 6 | 12 | ✅ |
| `rockets` | wheeled | vehicle | 1.75× | 1.75×1.75 (56×56) | 42×31×40 | 1 | 8 | 6 | 12 | ✅ |
| `missiles` | wheeled | vehicle | 1.75× | 1.75×1.75 (56×56) | 42×31×37 | 1 | 8 | 6 | 12 | ✅ |
| `mega` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 52×45×34 | 1 | 8 | 6 | 12 | ✅ |
| `submarine` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 53×25×33 | 1 | 8 | 6 | 11 | ✅ |
| `copter` | rotor | aircraft | 1.5× | 1.5×1.5 (48×48) | 42×42×27 | 1 | 8 | 6 | 12 | ✅ |
| `fighter` | jet | aircraft | 1.75× | 1.75×1.75 (56×56) | 51×49×18 | 1 | 8 | 6 | 10 | ✅ |
| `bomber` | jet | aircraft | 2× | 2×2 (64×64) | 52×56×31 | 1 | 8 | 6 | 10 | ✅ |
| `gunboat` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 49×25×35 | 1 | 8 | 6 | 11 | ✅ |
| `cruiser` | naval | ship | 2× | 2×2 (64×64) | 64×28×40 | 1 | 8 | 6 | 11 | ✅ |
| `battleship` | naval | ship | 2× | 2×2 (64×64) | 64×28×40 | 1 | 8 | 6 | 11 | ✅ |
| `lander` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 55×28×28 | 1 | 8 | 6 | 9 | ✅ |
| `lift-copter` | rotor | aircraft | 1.5× | 1.5×1.5 (48×48) | 45×33×25 | 1 | 8 | 6 | 10 | ✅ |
| `uhac` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 56×42×35 | 1 | 8 | 6 | 9 | ✅ |
| `uav` | rotor | aircraft | 1.25× | 1.25×1.25 (40×40) | 34×34×15 | 1 | 8 | 6 | 10 | ✅ |
| `mpa` | jet | aircraft | 2× | 2×2 (64×64) | 61×48×32 | 1 | 8 | 6 | 10 | ✅ |
| `bastion` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 52×45×39 | 1 | 8 | 6 | 12 | ✅ |
| `specter` | jet | aircraft | 2× | 2×2 (64×64) | 44×52×22 | 1 | 8 | 6 | 10 | ✅ |
| `aegis` | wheeled | vehicle | 1.5× | 1.5×1.5 (48×48) | 36×27×30 | 1 | 8 | 6 | 12 | ✅ |
| `rocket-infantry` | Infantry | human | 1× | 1×1 (32×32) | 26×17×23 | 1 | 8 | 6 | 13 | ✅ |
| `aa-infantry` | Infantry | human | 1× | 1×1 (32×32) | 25×17×23 | 1 | 8 | 6 | 13 | ✅ |
| `sniper` | Infantry | human | 1× | 1×1 (32×32) | 26×16×23 | 1 | 8 | 6 | 13 | ✅ |
| `grenadier` | Infantry | human | 1× | 1×1 (32×32) | 23×18×23 | 1 | 8 | 6 | 13 | ✅ |
| `flamethrower` | Infantry | human | 1× | 1×1 (32×32) | 27×17×23 | 1 | 8 | 6 | 13 | ✅ |
| `demolitionist` | Infantry | human | 1× | 1×1 (32×32) | 22×18×23 | 1 | 8 | 6 | 13 | ✅ |
| `commando` | Infantry | human | 1× | 1×1 (32×32) | 25×16×23 | 1 | 8 | 6 | 13 | ✅ |
| `officer` | Infantry | human | 1× | 1×1 (32×32) | 21×18×23 | 1 | 8 | 6 | 13 | ✅ |
| `spy` | Infantry | human | 1× | 1×1 (32×32) | 20×19×23 | 1 | 8 | 6 | 13 | ✅ |
| `elite-hero` | Infantry | human | 1× | 1×1 (32×32) | 25×22×25 | 1 | 8 | 6 | 13 | ✅ |
| `attack-dog` | Infantry | human | 1× | 1×1 (32×32) | 27×10×20 | 1 | 8 | 6 | 13 | ✅ |
| `scout` | Infantry | human | 1× | 1×1 (32×32) | 19×16×26 | 1 | 8 | 6 | 13 | ✅ |
| `ifv` | tracked | vehicle | 1.5× | 1.5×1.5 (48×48) | 40×33×30 | 1 | 8 | 6 | 12 | ✅ |
| `supply-truck` | wheeled | vehicle | 1.5× | 1.5×1.5 (48×48) | 37×27×25 | 1 | 8 | 6 | 9 | ✅ |
| `mobile-repair` | tracked | vehicle | 1.5× | 1.5×1.5 (48×48) | 38×33×31 | 1 | 8 | 6 | 9 | ✅ |
| `command-vehicle` | wheeled | vehicle | 1.5× | 1.5×1.5 (48×48) | 36×27×38 | 1 | 8 | 6 | 9 | ✅ |
| `mine-layer` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 46×39×31 | 1 | 8 | 6 | 9 | ✅ |
| `tank-destroyer` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 52×45×29 | 1 | 8 | 6 | 12 | ✅ |
| `flame-tank` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 48×39×29 | 1 | 8 | 6 | 12 | ✅ |
| `amphibious-tank` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 42×39×29 | 1 | 8 | 6 | 12 | ✅ |
| `mine-clearing` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 48×39×36 | 1 | 8 | 6 | 9 | ✅ |
| `ground-attack-jet` | jet | aircraft | 1.75× | 1.75×1.75 (56×56) | 50×53×19 | 1 | 8 | 6 | 10 | ✅ |
| `transport-plane` | jet | aircraft | 2× | 2×2 (64×64) | 57×60×32 | 1 | 8 | 6 | 8 | ✅ |
| `stealth-fighter` | jet | aircraft | 1.75× | 1.75×1.75 (56×56) | 51×45×19 | 1 | 8 | 6 | 10 | ✅ |
| `spy-plane` | jet | aircraft | 1.75× | 1.75×1.75 (56×56) | 55×56×17 | 1 | 8 | 6 | 8 | ✅ |
| `destroyer` | naval | ship | 2× | 2×2 (64×64) | 64×28×40 | 1 | 8 | 6 | 11 | ✅ |
| `missile-boat` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 45×25×35 | 1 | 8 | 6 | 11 | ✅ |
| `carrier` | naval | ship | 2× | 2×2 (64×64) | 64×44×39 | 1 | 8 | 6 | 11 | ✅ |
| `naval-repair` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 53×27×31 | 1 | 8 | 6 | 9 | ✅ |
| `mine-layer-ship` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 53×27×31 | 1 | 8 | 6 | 9 | ✅ |



## Buildings and structures

### 1×1 posts and small structures

| id | category | height class | size class | footprint (tiles) | model bounds (voxels) | render scale | facings | variants | frame cells | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `landmine` | Defence (1×1) | low | — | 1×1 (32×32) | 16×16×7 | 1 | 4 | 7 | 1 | ✅ |
| `pillbox` | Defence (1×1) | low | — | 1×1 (32×32) | 28×26×14 | 1 | 4 | 7 | 1 | ✅ |
| `bunker` | Defence (1×1) | low | — | 1×1 (32×32) | 26×20×14 | 1 | 4 | 7 | 1 | ✅ |
| `at-turret` | Defence (1×1) | low | — | 1×1 (32×32) | 26×24×12 | 1 | 4 | 7 | 1 | ✅ |
| `sam-site` | Defence (1×1) | medium | — | 1×1 (32×32) | 25×26×16 | 1 | 4 | 7 | 1 | ✅ |
| `flak-cannon` | Defence (1×1) | medium | — | 1×1 (32×32) | 28×28×12 | 1 | 4 | 7 | 1 | ✅ |
| `coastal-battery` | Defence (1×1) | low | — | 1×1 (32×32) | 29×22×19 | 1 | 4 | 7 | 1 | ✅ |
| `artillery-emplacement` | Defence (1×1) | low | — | 1×1 (32×32) | 28×28×12 | 1 | 4 | 7 | 1 | ✅ |
| `guard-tower` | Defence (1×1) | tall | — | 1×1 (32×32) | 21×16×40 | 1 | 4 | 7 | 1 | ✅ |


### 2×2 facilities

| id | category | height class | size class | footprint (tiles) | model bounds (voxels) | render scale | facings | variants | frame cells | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `base` | Production | medium | — | 2×2 (64×64) | 64×64×38 | 1 | 4 | 7 | 2 | ✅ |
| `city` | Economy | medium | — | 2×2 (64×64) | 64×64×38 | 1 | 4 | 7 | 1 | ✅ |
| `farm` | Economy | low | — | 2×2 (64×64) | 64×64×26 | 1 | 4 | 7 | 1 | ✅ |
| `mine` | Economy | medium | — | 2×2 (64×64) | 64×64×40 | 1 | 4 | 7 | 1 | ✅ |
| `depot` | Logistics | medium | — | 2×2 (64×64) | 64×64×28 | 1 | 4 | 7 | 1 | ✅ |
| `supply-depot` | Logistics | medium | — | 2×2 (64×64) | 64×64×26 | 1 | 4 | 7 | 1 | ✅ |
| `repair-depot` | Logistics | medium | — | 2×2 (64×64) | 64×64×37 | 1 | 4 | 7 | 1 | ✅ |
| `field-hospital` | Support | medium | — | 2×2 (64×64) | 64×64×28 | 1 | 4 | 7 | 1 | ✅ |
| `barracks` | Production | medium | — | 2×2 (64×64) | 64×64×36 | 1 | 4 | 7 | 1 | ✅ |
| `helipad` | Support | low | — | 2×2 (64×64) | 64×64×36 | 1 | 4 | 7 | 1 | ✅ |
| `power-plant` | Infrastructure | tall | — | 2×2 (64×64) | 64×64×42 | 1 | 4 | 7 | 1 | ✅ |
| `refinery` | Infrastructure | tall | — | 2×2 (64×64) | 64×64×52 | 1 | 4 | 7 | 1 | ✅ |
| `radar-station` | Infrastructure | tall | — | 2×2 (64×64) | 64×64×47 | 1 | 4 | 7 | 2 | ✅ |
| `research-lab` | Support | medium | — | 2×2 (64×64) | 64×64×39 | 1 | 4 | 7 | 1 | ✅ |


### 3×2 and 3×3 compounds

| id | category | height class | size class | footprint (tiles) | model bounds (voxels) | render scale | facings | variants | frame cells | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `hq` | Command compound | major | — | 3×3 (96×96) | 96×96×70 | 1 | 4 | 7 | 1 | ✅ |
| `airport` | Production | major | — | 3×3 (96×96) | 96×96×60 | 1 | 4 | 7 | 2 | ✅ |
| `port` | Logistics | major | — | 3×2 (96×64) | 96×64×38 | 1 | 4 | 7 | 1 | ✅ |



Every building type also has four faction variants, which are listed in the
appendix below.

## Terrain and environment

Terrain cells keep their ids, movement costs, defence values and elevation
semantics. Only the *scale* of the geometry changed: 64³ design cells map to
32×32 world tiles, and the `elevation-*` blocks keep world z units so their
heights remain the elevation system levels (0, 4, …, 32 → 0, 4, …, 32 px).

| id | terrain role | footprint | height class | model bounds | status |
| --- | --- | --- | --- | --- | --- |
| `tree` | Woods | 1×1 | tall | 32×32×22 | ✅ |
| `mountain` | Mountain | 1×1 | tall | 32×32×22 | ✅ |
| `hill` | Hill | 1×1 | medium | 32×32×9 | ✅ |
| `silo` | Missile Silo | 1×1 | medium | 32×32×19 | ✅ |
| `silo-spent` | Spent Silo | 1×1 | low | 32×32×10 | ✅ |
| `reef` | Reef | 1×1 | low | 32×32×9 | ✅ |
| `volcano` | Volcano | 1×1 | tall | 32×32×18 | ✅ |
| `secret-lab` | Secret Lab | 1×1 | medium | 28×28×22 | ✅ |
| `pipe-ew` | — | 1×1 | ground | 32×32×15 | ✅ |
| `pipe-ns` | — | 1×1 | ground | 32×32×15 | ✅ |
| `pipe-seam-ew` | — | 1×1 | ground | 32×32×15 | ✅ |
| `pipe-seam-ns` | — | 1×1 | ground | 32×32×15 | ✅ |
| `snow-tile` | Snow Ground | 1×1 | ground | 32×32×3 | ✅ |
| `cracked-dry-ground` | Cracked Dry Ground | 1×1 | ground | 32×32×3 | ✅ |
| `marsh` | Marsh | 1×1 | ground | 32×32×7 | ✅ |
| `plains` | Plains | 1×1 | ground | 32×32×2 | ✅ |
| `tallgrass` | Tall Grass | 1×1 | ground | 32×32×3 | ✅ |
| `sea` | Sea | 1×1 | ground | 32×32×2 | ✅ |
| `shoal` | Shoal | 1×1 | ground | 32×32×1 | ✅ |
| `rubble` | Rubble | 1×1 | ground | 32×32×8 | ✅ |
| `elevation-00` | — | 1×1 | medium | 32×32×3 | ✅ |
| `elevation-04` | — | 1×1 | medium | 32×32×7 | ✅ |
| `elevation-08` | — | 1×1 | medium | 32×32×11 | ✅ |
| `elevation-12` | — | 1×1 | medium | 32×32×15 | ✅ |
| `elevation-16` | — | 1×1 | medium | 32×32×19 | ✅ |
| `elevation-20` | — | 1×1 | medium | 32×32×23 | ✅ |
| `elevation-24` | — | 1×1 | medium | 32×32×27 | ✅ |
| `elevation-28` | — | 1×1 | medium | 32×32×31 | ✅ |
| `elevation-32` | — | 1×1 | medium | 32×32×35 | ✅ |
| `wall-standard` | — | 1×1 | ground | 32×32×19 | ✅ |
| `wall-allies` | — | 1×1 | ground | 32×32×20 | ✅ |
| `wall-soviets` | — | 1×1 | ground | 32×32×20 | ✅ |
| `wall-empire` | — | 1×1 | ground | 32×32×20 | ✅ |
| `wall-legion` | — | 1×1 | ground | 32×32×20 | ✅ |
| `wall-end` | — | 1×1 | ground | 32×32×20 | ✅ |
| `wall-end-allies` | — | 1×1 | ground | 32×32×22 | ✅ |
| `wall-end-soviets` | — | 1×1 | ground | 32×32×24 | ✅ |
| `wall-end-empire` | — | 1×1 | ground | 32×32×23 | ✅ |
| `wall-end-legion` | — | 1×1 | ground | 32×32×24 | ✅ |
| `wall-corner` | — | 1×1 | ground | 32×32×20 | ✅ |
| `wall-corner-allies` | — | 1×1 | ground | 32×32×22 | ✅ |
| `wall-corner-soviets` | — | 1×1 | ground | 32×32×24 | ✅ |
| `wall-corner-empire` | — | 1×1 | ground | 32×32×23 | ✅ |
| `wall-corner-legion` | — | 1×1 | ground | 32×32×24 | ✅ |
| `wall-t` | — | 1×1 | ground | 32×32×20 | ✅ |
| `wall-t-allies` | — | 1×1 | ground | 32×32×22 | ✅ |
| `wall-t-soviets` | — | 1×1 | ground | 32×32×24 | ✅ |
| `wall-t-empire` | — | 1×1 | ground | 32×32×23 | ✅ |
| `wall-t-legion` | — | 1×1 | ground | 32×32×24 | ✅ |
| `wall-cross` | — | 1×1 | ground | 32×32×20 | ✅ |
| `wall-cross-allies` | — | 1×1 | ground | 32×32×22 | ✅ |
| `wall-cross-soviets` | — | 1×1 | ground | 32×32×24 | ✅ |
| `wall-cross-empire` | — | 1×1 | ground | 32×32×23 | ✅ |
| `wall-cross-legion` | — | 1×1 | ground | 32×32×24 | ✅ |
| `wall-gate` | Wall Gate | 1×1 | ground | 32×32×23 | ✅ |
| `wall-gate-allies` | — | 1×1 | ground | 32×32×23 | ✅ |
| `wall-gate-soviets` | — | 1×1 | ground | 32×32×23 | ✅ |
| `wall-gate-empire` | — | 1×1 | ground | 32×32×23 | ✅ |
| `wall-gate-legion` | — | 1×1 | ground | 32×32×23 | ✅ |
| `road-0` | — | 1×1 | ground | 12×12×1 | ✅ |
| `road-1` | — | 1×1 | ground | 12×22×1 | ✅ |
| `road-2` | — | 1×1 | ground | 22×12×1 | ✅ |
| `road-3` | — | 1×1 | ground | 22×22×1 | ✅ |
| `road-4` | — | 1×1 | ground | 12×22×1 | ✅ |
| `road-5` | — | 1×1 | ground | 12×32×1 | ✅ |
| `road-6` | — | 1×1 | ground | 22×22×1 | ✅ |
| `road-7` | — | 1×1 | ground | 22×32×1 | ✅ |
| `road-8` | — | 1×1 | ground | 22×12×1 | ✅ |
| `road-9` | — | 1×1 | ground | 22×22×1 | ✅ |
| `road-a` | — | 1×1 | ground | 32×12×1 | ✅ |
| `road-b` | — | 1×1 | ground | 32×22×1 | ✅ |
| `road-c` | — | 1×1 | ground | 22×22×1 | ✅ |
| `road-d` | — | 1×1 | ground | 22×32×1 | ✅ |
| `road-e` | — | 1×1 | ground | 32×22×1 | ✅ |
| `road-f` | — | 1×1 | ground | 32×32×1 | ✅ |
| `bridge-ew` | — | 1×1 | ground | 32×16×5 | ✅ |
| `bridge-ns` | — | 1×1 | ground | 16×32×5 | ✅ |
| `bridge-broken-ew` | — | 1×1 | ground | 32×12×5 | ✅ |
| `bridge-broken-ns` | — | 1×1 | ground | 12×32×5 | ✅ |

## Faction variants (appendix)

### Unit variants

| id | category | height class | size class | footprint (tiles) | model bounds (voxels) | render scale | facings | variants | frame cells | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `infantry--allies` | Infantry | human | 1× | 1×1 (32×32) | 22×16×23 | 1 | 8 | 6 | 13 | ✅ |
| `mech--allies` | Infantry | human | 1× | 1×1 (32×32) | 23×17×23 | 1 | 8 | 6 | 13 | ✅ |
| `engineer--allies` | Infantry | human | 1× | 1×1 (32×32) | 25×16×23 | 1 | 8 | 6 | 10 | ✅ |
| `medic--allies` | Infantry | human | 1× | 1×1 (32×32) | 17×16×23 | 1 | 8 | 6 | 10 | ✅ |
| `apc--allies` | tracked | vehicle | 1.5× | 1.5×1.5 (48×48) | 40×33×27 | 1 | 8 | 6 | 9 | ✅ |
| `recon--allies` | wheeled | vehicle | 1.25× | 1.25×1.25 (40×40) | 34×23×28 | 1 | 8 | 6 | 12 | ✅ |
| `tank--allies` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 48×39×30 | 1 | 8 | 6 | 12 | ✅ |
| `heavy--allies` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 52×45×32 | 1 | 8 | 6 | 12 | ✅ |
| `artillery--allies` | tracked | vehicle | 2× | 2×2 (64×64) | 57×44×41 | 1 | 8 | 6 | 12 | ✅ |
| `antiair--allies` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 48×39×36 | 1 | 8 | 6 | 12 | ✅ |
| `rockets--allies` | wheeled | vehicle | 1.75× | 1.75×1.75 (56×56) | 46×31×40 | 1 | 8 | 6 | 12 | ✅ |
| `missiles--allies` | wheeled | vehicle | 1.75× | 1.75×1.75 (56×56) | 46×31×37 | 1 | 8 | 6 | 12 | ✅ |
| `mega--allies` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 52×45×34 | 1 | 8 | 6 | 12 | ✅ |
| `submarine--allies` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 54×25×33 | 1 | 8 | 6 | 11 | ✅ |
| `copter--allies` | rotor | aircraft | 1.5× | 1.5×1.5 (48×48) | 44×42×27 | 1 | 8 | 6 | 12 | ✅ |
| `fighter--allies` | jet | aircraft | 1.75× | 1.75×1.75 (56×56) | 53×49×21 | 1 | 8 | 6 | 10 | ✅ |
| `bomber--allies` | jet | aircraft | 2× | 2×2 (64×64) | 57×56×31 | 1 | 8 | 6 | 10 | ✅ |
| `gunboat--allies` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 50×25×35 | 1 | 8 | 6 | 11 | ✅ |
| `cruiser--allies` | naval | ship | 2× | 2×2 (64×64) | 64×28×40 | 1 | 8 | 6 | 11 | ✅ |
| `battleship--allies` | naval | ship | 2× | 2×2 (64×64) | 64×28×40 | 1 | 8 | 6 | 11 | ✅ |
| `lander--allies` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 55×28×28 | 1 | 8 | 6 | 9 | ✅ |
| `lift-copter--allies` | rotor | aircraft | 1.5× | 1.5×1.5 (48×48) | 46×33×25 | 1 | 8 | 6 | 10 | ✅ |
| `uhac--allies` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 56×42×35 | 1 | 8 | 6 | 9 | ✅ |
| `uav--allies` | rotor | aircraft | 1.25× | 1.25×1.25 (40×40) | 37×34×16 | 1 | 8 | 6 | 10 | ✅ |
| `mpa--allies` | jet | aircraft | 2× | 2×2 (64×64) | 61×48×32 | 1 | 8 | 6 | 10 | ✅ |
| `bastion--allies` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 52×45×39 | 1 | 8 | 6 | 12 | ✅ |
| `specter--allies` | jet | aircraft | 2× | 2×2 (64×64) | 49×52×24 | 1 | 8 | 6 | 10 | ✅ |
| `aegis--allies` | wheeled | vehicle | 1.5× | 1.5×1.5 (48×48) | 40×27×30 | 1 | 8 | 6 | 12 | ✅ |
| `rocket-infantry--allies` | Infantry | human | 1× | 1×1 (32×32) | 26×17×23 | 1 | 8 | 6 | 13 | ✅ |
| `aa-infantry--allies` | Infantry | human | 1× | 1×1 (32×32) | 25×17×23 | 1 | 8 | 6 | 13 | ✅ |
| `sniper--allies` | Infantry | human | 1× | 1×1 (32×32) | 26×16×23 | 1 | 8 | 6 | 13 | ✅ |
| `grenadier--allies` | Infantry | human | 1× | 1×1 (32×32) | 23×18×23 | 1 | 8 | 6 | 13 | ✅ |
| `flamethrower--allies` | Infantry | human | 1× | 1×1 (32×32) | 27×17×23 | 1 | 8 | 6 | 13 | ✅ |
| `demolitionist--allies` | Infantry | human | 1× | 1×1 (32×32) | 22×18×23 | 1 | 8 | 6 | 13 | ✅ |
| `commando--allies` | Infantry | human | 1× | 1×1 (32×32) | 25×16×23 | 1 | 8 | 6 | 13 | ✅ |
| `officer--allies` | Infantry | human | 1× | 1×1 (32×32) | 21×18×23 | 1 | 8 | 6 | 13 | ✅ |
| `spy--allies` | Infantry | human | 1× | 1×1 (32×32) | 21×19×23 | 1 | 8 | 6 | 13 | ✅ |
| `elite-hero--allies` | Infantry | human | 1× | 1×1 (32×32) | 25×22×25 | 1 | 8 | 6 | 13 | ✅ |
| `attack-dog--allies` | Infantry | human | 1× | 1×1 (32×32) | 27×14×20 | 1 | 8 | 6 | 13 | ✅ |
| `scout--allies` | Infantry | human | 1× | 1×1 (32×32) | 19×16×26 | 1 | 8 | 6 | 13 | ✅ |
| `ifv--allies` | tracked | vehicle | 1.5× | 1.5×1.5 (48×48) | 41×33×30 | 1 | 8 | 6 | 12 | ✅ |
| `supply-truck--allies` | wheeled | vehicle | 1.5× | 1.5×1.5 (48×48) | 40×27×25 | 1 | 8 | 6 | 9 | ✅ |
| `mobile-repair--allies` | tracked | vehicle | 1.5× | 1.5×1.5 (48×48) | 42×33×31 | 1 | 8 | 6 | 9 | ✅ |
| `command-vehicle--allies` | wheeled | vehicle | 1.5× | 1.5×1.5 (48×48) | 40×27×38 | 1 | 8 | 6 | 9 | ✅ |
| `mine-layer--allies` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 50×39×31 | 1 | 8 | 6 | 9 | ✅ |
| `tank-destroyer--allies` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 52×45×29 | 1 | 8 | 6 | 12 | ✅ |
| `flame-tank--allies` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 48×39×29 | 1 | 8 | 6 | 12 | ✅ |
| `amphibious-tank--allies` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 46×39×29 | 1 | 8 | 6 | 12 | ✅ |
| `mine-clearing--allies` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 48×39×36 | 1 | 8 | 6 | 9 | ✅ |
| `ground-attack-jet--allies` | jet | aircraft | 1.75× | 1.75×1.75 (56×56) | 50×53×21 | 1 | 8 | 6 | 10 | ✅ |
| `transport-plane--allies` | jet | aircraft | 2× | 2×2 (64×64) | 59×60×34 | 1 | 8 | 6 | 8 | ✅ |
| `stealth-fighter--allies` | jet | aircraft | 1.75× | 1.75×1.75 (56×56) | 53×45×22 | 1 | 8 | 6 | 10 | ✅ |
| `spy-plane--allies` | jet | aircraft | 1.75× | 1.75×1.75 (56×56) | 55×56×21 | 1 | 8 | 6 | 8 | ✅ |
| `destroyer--allies` | naval | ship | 2× | 2×2 (64×64) | 64×28×40 | 1 | 8 | 6 | 11 | ✅ |
| `missile-boat--allies` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 50×25×35 | 1 | 8 | 6 | 11 | ✅ |
| `carrier--allies` | naval | ship | 2× | 2×2 (64×64) | 64×44×39 | 1 | 8 | 6 | 11 | ✅ |
| `naval-repair--allies` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 54×27×31 | 1 | 8 | 6 | 9 | ✅ |
| `mine-layer-ship--allies` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 54×27×31 | 1 | 8 | 6 | 9 | ✅ |
| `infantry--soviets` | Infantry | human | 1× | 1×1 (32×32) | 22×16×23 | 1 | 8 | 6 | 13 | ✅ |
| `mech--soviets` | Infantry | human | 1× | 1×1 (32×32) | 23×17×23 | 1 | 8 | 6 | 13 | ✅ |
| `engineer--soviets` | Infantry | human | 1× | 1×1 (32×32) | 25×16×23 | 1 | 8 | 6 | 10 | ✅ |
| `medic--soviets` | Infantry | human | 1× | 1×1 (32×32) | 17×16×23 | 1 | 8 | 6 | 10 | ✅ |
| `apc--soviets` | tracked | vehicle | 1.5× | 1.5×1.5 (48×48) | 36×34×27 | 1 | 8 | 6 | 9 | ✅ |
| `recon--soviets` | wheeled | vehicle | 1.25× | 1.25×1.25 (40×40) | 31×23×28 | 1 | 8 | 6 | 12 | ✅ |
| `tank--soviets` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 47×40×30 | 1 | 8 | 6 | 12 | ✅ |
| `heavy--soviets` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 52×46×32 | 1 | 8 | 6 | 12 | ✅ |
| `artillery--soviets` | tracked | vehicle | 2× | 2×2 (64×64) | 54×45×41 | 1 | 8 | 6 | 12 | ✅ |
| `antiair--soviets` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 43×40×36 | 1 | 8 | 6 | 12 | ✅ |
| `rockets--soviets` | wheeled | vehicle | 1.75× | 1.75×1.75 (56×56) | 42×32×40 | 1 | 8 | 6 | 12 | ✅ |
| `missiles--soviets` | wheeled | vehicle | 1.75× | 1.75×1.75 (56×56) | 42×32×37 | 1 | 8 | 6 | 12 | ✅ |
| `mega--soviets` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 52×46×34 | 1 | 8 | 6 | 12 | ✅ |
| `submarine--soviets` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 53×25×33 | 1 | 8 | 6 | 11 | ✅ |
| `copter--soviets` | rotor | aircraft | 1.5× | 1.5×1.5 (48×48) | 42×45×27 | 1 | 8 | 6 | 12 | ✅ |
| `fighter--soviets` | jet | aircraft | 1.75× | 1.75×1.75 (56×56) | 51×52×21 | 1 | 8 | 6 | 10 | ✅ |
| `bomber--soviets` | jet | aircraft | 2× | 2×2 (64×64) | 52×59×31 | 1 | 8 | 6 | 10 | ✅ |
| `gunboat--soviets` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 49×25×35 | 1 | 8 | 6 | 11 | ✅ |
| `cruiser--soviets` | naval | ship | 2× | 2×2 (64×64) | 64×28×40 | 1 | 8 | 6 | 11 | ✅ |
| `battleship--soviets` | naval | ship | 2× | 2×2 (64×64) | 64×28×40 | 1 | 8 | 6 | 11 | ✅ |
| `lander--soviets` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 55×28×28 | 1 | 8 | 6 | 9 | ✅ |
| `lift-copter--soviets` | rotor | aircraft | 1.5× | 1.5×1.5 (48×48) | 45×35×25 | 1 | 8 | 6 | 10 | ✅ |
| `uhac--soviets` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 56×42×35 | 1 | 8 | 6 | 9 | ✅ |
| `uav--soviets` | rotor | aircraft | 1.25× | 1.25×1.25 (40×40) | 34×36×16 | 1 | 8 | 6 | 10 | ✅ |
| `mpa--soviets` | jet | aircraft | 2× | 2×2 (64×64) | 61×51×32 | 1 | 8 | 6 | 10 | ✅ |
| `bastion--soviets` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 52×46×39 | 1 | 8 | 6 | 12 | ✅ |
| `specter--soviets` | jet | aircraft | 2× | 2×2 (64×64) | 44×55×24 | 1 | 8 | 6 | 10 | ✅ |
| `aegis--soviets` | wheeled | vehicle | 1.5× | 1.5×1.5 (48×48) | 36×28×30 | 1 | 8 | 6 | 12 | ✅ |
| `rocket-infantry--soviets` | Infantry | human | 1× | 1×1 (32×32) | 26×17×23 | 1 | 8 | 6 | 13 | ✅ |
| `aa-infantry--soviets` | Infantry | human | 1× | 1×1 (32×32) | 25×17×23 | 1 | 8 | 6 | 13 | ✅ |
| `sniper--soviets` | Infantry | human | 1× | 1×1 (32×32) | 26×16×23 | 1 | 8 | 6 | 13 | ✅ |
| `grenadier--soviets` | Infantry | human | 1× | 1×1 (32×32) | 23×18×23 | 1 | 8 | 6 | 13 | ✅ |
| `flamethrower--soviets` | Infantry | human | 1× | 1×1 (32×32) | 27×17×23 | 1 | 8 | 6 | 13 | ✅ |
| `demolitionist--soviets` | Infantry | human | 1× | 1×1 (32×32) | 22×18×23 | 1 | 8 | 6 | 13 | ✅ |
| `commando--soviets` | Infantry | human | 1× | 1×1 (32×32) | 25×18×23 | 1 | 8 | 6 | 13 | ✅ |
| `officer--soviets` | Infantry | human | 1× | 1×1 (32×32) | 22×18×23 | 1 | 8 | 6 | 13 | ✅ |
| `spy--soviets` | Infantry | human | 1× | 1×1 (32×32) | 22×20×23 | 1 | 8 | 6 | 13 | ✅ |
| `elite-hero--soviets` | Infantry | human | 1× | 1×1 (32×32) | 25×22×25 | 1 | 8 | 6 | 13 | ✅ |
| `attack-dog--soviets` | Infantry | human | 1× | 1×1 (32×32) | 27×14×20 | 1 | 8 | 6 | 13 | ✅ |
| `scout--soviets` | Infantry | human | 1× | 1×1 (32×32) | 19×18×26 | 1 | 8 | 6 | 13 | ✅ |
| `ifv--soviets` | tracked | vehicle | 1.5× | 1.5×1.5 (48×48) | 40×34×30 | 1 | 8 | 6 | 12 | ✅ |
| `supply-truck--soviets` | wheeled | vehicle | 1.5× | 1.5×1.5 (48×48) | 37×28×25 | 1 | 8 | 6 | 9 | ✅ |
| `mobile-repair--soviets` | tracked | vehicle | 1.5× | 1.5×1.5 (48×48) | 38×34×31 | 1 | 8 | 6 | 9 | ✅ |
| `command-vehicle--soviets` | wheeled | vehicle | 1.5× | 1.5×1.5 (48×48) | 36×28×38 | 1 | 8 | 6 | 9 | ✅ |
| `mine-layer--soviets` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 46×40×31 | 1 | 8 | 6 | 9 | ✅ |
| `tank-destroyer--soviets` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 52×46×29 | 1 | 8 | 6 | 12 | ✅ |
| `flame-tank--soviets` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 48×40×29 | 1 | 8 | 6 | 12 | ✅ |
| `amphibious-tank--soviets` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 42×40×29 | 1 | 8 | 6 | 12 | ✅ |
| `mine-clearing--soviets` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 48×40×36 | 1 | 8 | 6 | 9 | ✅ |
| `ground-attack-jet--soviets` | jet | aircraft | 1.75× | 1.75×1.75 (56×56) | 50×55×21 | 1 | 8 | 6 | 10 | ✅ |
| `transport-plane--soviets` | jet | aircraft | 2× | 2×2 (64×64) | 57×63×34 | 1 | 8 | 6 | 8 | ✅ |
| `stealth-fighter--soviets` | jet | aircraft | 1.75× | 1.75×1.75 (56×56) | 51×48×22 | 1 | 8 | 6 | 10 | ✅ |
| `spy-plane--soviets` | jet | aircraft | 1.75× | 1.75×1.75 (56×56) | 55×56×21 | 1 | 8 | 6 | 8 | ✅ |
| `destroyer--soviets` | naval | ship | 2× | 2×2 (64×64) | 64×28×40 | 1 | 8 | 6 | 11 | ✅ |
| `missile-boat--soviets` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 45×25×35 | 1 | 8 | 6 | 11 | ✅ |
| `carrier--soviets` | naval | ship | 2× | 2×2 (64×64) | 64×44×39 | 1 | 8 | 6 | 11 | ✅ |
| `naval-repair--soviets` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 53×27×31 | 1 | 8 | 6 | 9 | ✅ |
| `mine-layer-ship--soviets` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 53×27×31 | 1 | 8 | 6 | 9 | ✅ |
| `infantry--empire` | Infantry | human | 1× | 1×1 (32×32) | 22×16×23 | 1 | 8 | 6 | 13 | ✅ |
| `mech--empire` | Infantry | human | 1× | 1×1 (32×32) | 23×17×23 | 1 | 8 | 6 | 13 | ✅ |
| `engineer--empire` | Infantry | human | 1× | 1×1 (32×32) | 25×16×23 | 1 | 8 | 6 | 10 | ✅ |
| `medic--empire` | Infantry | human | 1× | 1×1 (32×32) | 17×16×23 | 1 | 8 | 6 | 10 | ✅ |
| `apc--empire` | tracked | vehicle | 1.5× | 1.5×1.5 (48×48) | 36×33×27 | 1 | 8 | 6 | 9 | ✅ |
| `recon--empire` | wheeled | vehicle | 1.25× | 1.25×1.25 (40×40) | 31×23×28 | 1 | 8 | 6 | 12 | ✅ |
| `tank--empire` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 47×39×30 | 1 | 8 | 6 | 12 | ✅ |
| `heavy--empire` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 52×45×32 | 1 | 8 | 6 | 12 | ✅ |
| `artillery--empire` | tracked | vehicle | 2× | 2×2 (64×64) | 54×44×41 | 1 | 8 | 6 | 12 | ✅ |
| `antiair--empire` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 43×39×36 | 1 | 8 | 6 | 12 | ✅ |
| `rockets--empire` | wheeled | vehicle | 1.75× | 1.75×1.75 (56×56) | 42×31×40 | 1 | 8 | 6 | 12 | ✅ |
| `missiles--empire` | wheeled | vehicle | 1.75× | 1.75×1.75 (56×56) | 42×31×37 | 1 | 8 | 6 | 12 | ✅ |
| `mega--empire` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 52×45×34 | 1 | 8 | 6 | 12 | ✅ |
| `submarine--empire` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 53×25×33 | 1 | 8 | 6 | 11 | ✅ |
| `copter--empire` | rotor | aircraft | 1.5× | 1.5×1.5 (48×48) | 42×42×29 | 1 | 8 | 6 | 12 | ✅ |
| `fighter--empire` | jet | aircraft | 1.75× | 1.75×1.75 (56×56) | 51×49×21 | 1 | 8 | 6 | 10 | ✅ |
| `bomber--empire` | jet | aircraft | 2× | 2×2 (64×64) | 52×56×34 | 1 | 8 | 6 | 10 | ✅ |
| `gunboat--empire` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 49×25×35 | 1 | 8 | 6 | 11 | ✅ |
| `cruiser--empire` | naval | ship | 2× | 2×2 (64×64) | 64×28×40 | 1 | 8 | 6 | 11 | ✅ |
| `battleship--empire` | naval | ship | 2× | 2×2 (64×64) | 64×28×40 | 1 | 8 | 6 | 11 | ✅ |
| `lander--empire` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 55×28×29 | 1 | 8 | 6 | 9 | ✅ |
| `lift-copter--empire` | rotor | aircraft | 1.5× | 1.5×1.5 (48×48) | 45×33×28 | 1 | 8 | 6 | 10 | ✅ |
| `uhac--empire` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 56×42×35 | 1 | 8 | 6 | 9 | ✅ |
| `uav--empire` | rotor | aircraft | 1.25× | 1.25×1.25 (40×40) | 34×34×17 | 1 | 8 | 6 | 10 | ✅ |
| `mpa--empire` | jet | aircraft | 2× | 2×2 (64×64) | 61×48×35 | 1 | 8 | 6 | 10 | ✅ |
| `bastion--empire` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 52×45×39 | 1 | 8 | 6 | 12 | ✅ |
| `specter--empire` | jet | aircraft | 2× | 2×2 (64×64) | 44×52×25 | 1 | 8 | 6 | 10 | ✅ |
| `aegis--empire` | wheeled | vehicle | 1.5× | 1.5×1.5 (48×48) | 36×27×30 | 1 | 8 | 6 | 12 | ✅ |
| `rocket-infantry--empire` | Infantry | human | 1× | 1×1 (32×32) | 26×17×23 | 1 | 8 | 6 | 13 | ✅ |
| `aa-infantry--empire` | Infantry | human | 1× | 1×1 (32×32) | 25×17×23 | 1 | 8 | 6 | 13 | ✅ |
| `sniper--empire` | Infantry | human | 1× | 1×1 (32×32) | 26×16×23 | 1 | 8 | 6 | 13 | ✅ |
| `grenadier--empire` | Infantry | human | 1× | 1×1 (32×32) | 23×18×23 | 1 | 8 | 6 | 13 | ✅ |
| `flamethrower--empire` | Infantry | human | 1× | 1×1 (32×32) | 27×17×23 | 1 | 8 | 6 | 13 | ✅ |
| `demolitionist--empire` | Infantry | human | 1× | 1×1 (32×32) | 22×18×23 | 1 | 8 | 6 | 13 | ✅ |
| `commando--empire` | Infantry | human | 1× | 1×1 (32×32) | 26×20×24 | 1 | 8 | 6 | 13 | ✅ |
| `officer--empire` | Infantry | human | 1× | 1×1 (32×32) | 23×20×24 | 1 | 8 | 6 | 13 | ✅ |
| `spy--empire` | Infantry | human | 1× | 1×1 (32×32) | 23×21×24 | 1 | 8 | 6 | 13 | ✅ |
| `elite-hero--empire` | Infantry | human | 1× | 1×1 (32×32) | 26×22×25 | 1 | 8 | 6 | 13 | ✅ |
| `attack-dog--empire` | Infantry | human | 1× | 1×1 (32×32) | 27×14×20 | 1 | 8 | 6 | 13 | ✅ |
| `scout--empire` | Infantry | human | 1× | 1×1 (32×32) | 20×20×26 | 1 | 8 | 6 | 13 | ✅ |
| `ifv--empire` | tracked | vehicle | 1.5× | 1.5×1.5 (48×48) | 40×33×30 | 1 | 8 | 6 | 12 | ✅ |
| `supply-truck--empire` | wheeled | vehicle | 1.5× | 1.5×1.5 (48×48) | 37×27×25 | 1 | 8 | 6 | 9 | ✅ |
| `mobile-repair--empire` | tracked | vehicle | 1.5× | 1.5×1.5 (48×48) | 38×33×31 | 1 | 8 | 6 | 9 | ✅ |
| `command-vehicle--empire` | wheeled | vehicle | 1.5× | 1.5×1.5 (48×48) | 36×27×38 | 1 | 8 | 6 | 9 | ✅ |
| `mine-layer--empire` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 46×39×31 | 1 | 8 | 6 | 9 | ✅ |
| `tank-destroyer--empire` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 52×45×29 | 1 | 8 | 6 | 12 | ✅ |
| `flame-tank--empire` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 48×39×29 | 1 | 8 | 6 | 12 | ✅ |
| `amphibious-tank--empire` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 42×39×29 | 1 | 8 | 6 | 12 | ✅ |
| `mine-clearing--empire` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 48×39×36 | 1 | 8 | 6 | 9 | ✅ |
| `ground-attack-jet--empire` | jet | aircraft | 1.75× | 1.75×1.75 (56×56) | 50×53×21 | 1 | 8 | 6 | 10 | ✅ |
| `transport-plane--empire` | jet | aircraft | 2× | 2×2 (64×64) | 57×60×35 | 1 | 8 | 6 | 8 | ✅ |
| `stealth-fighter--empire` | jet | aircraft | 1.75× | 1.75×1.75 (56×56) | 51×45×22 | 1 | 8 | 6 | 10 | ✅ |
| `spy-plane--empire` | jet | aircraft | 1.75× | 1.75×1.75 (56×56) | 55×56×19 | 1 | 8 | 6 | 8 | ✅ |
| `destroyer--empire` | naval | ship | 2× | 2×2 (64×64) | 64×28×40 | 1 | 8 | 6 | 11 | ✅ |
| `missile-boat--empire` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 48×25×35 | 1 | 8 | 6 | 11 | ✅ |
| `carrier--empire` | naval | ship | 2× | 2×2 (64×64) | 64×44×39 | 1 | 8 | 6 | 11 | ✅ |
| `naval-repair--empire` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 53×27×31 | 1 | 8 | 6 | 9 | ✅ |
| `mine-layer-ship--empire` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 53×27×31 | 1 | 8 | 6 | 9 | ✅ |
| `infantry--legion` | Infantry | human | 1× | 1×1 (32×32) | 22×16×23 | 1 | 8 | 6 | 13 | ✅ |
| `mech--legion` | Infantry | human | 1× | 1×1 (32×32) | 23×17×23 | 1 | 8 | 6 | 13 | ✅ |
| `engineer--legion` | Infantry | human | 1× | 1×1 (32×32) | 25×16×23 | 1 | 8 | 6 | 10 | ✅ |
| `medic--legion` | Infantry | human | 1× | 1×1 (32×32) | 17×16×23 | 1 | 8 | 6 | 10 | ✅ |
| `apc--legion` | tracked | vehicle | 1.5× | 1.5×1.5 (48×48) | 36×33×27 | 1 | 8 | 6 | 9 | ✅ |
| `recon--legion` | wheeled | vehicle | 1.25× | 1.25×1.25 (40×40) | 31×23×28 | 1 | 8 | 6 | 12 | ✅ |
| `tank--legion` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 47×39×30 | 1 | 8 | 6 | 12 | ✅ |
| `heavy--legion` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 52×45×32 | 1 | 8 | 6 | 12 | ✅ |
| `artillery--legion` | tracked | vehicle | 2× | 2×2 (64×64) | 54×44×41 | 1 | 8 | 6 | 12 | ✅ |
| `antiair--legion` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 43×39×36 | 1 | 8 | 6 | 12 | ✅ |
| `rockets--legion` | wheeled | vehicle | 1.75× | 1.75×1.75 (56×56) | 42×31×40 | 1 | 8 | 6 | 12 | ✅ |
| `missiles--legion` | wheeled | vehicle | 1.75× | 1.75×1.75 (56×56) | 42×31×37 | 1 | 8 | 6 | 12 | ✅ |
| `mega--legion` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 52×45×34 | 1 | 8 | 6 | 12 | ✅ |
| `submarine--legion` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 53×25×33 | 1 | 8 | 6 | 11 | ✅ |
| `copter--legion` | rotor | aircraft | 1.5× | 1.5×1.5 (48×48) | 42×42×27 | 1 | 8 | 6 | 12 | ✅ |
| `fighter--legion` | jet | aircraft | 1.75× | 1.75×1.75 (56×56) | 51×49×18 | 1 | 8 | 6 | 10 | ✅ |
| `bomber--legion` | jet | aircraft | 2× | 2×2 (64×64) | 52×56×31 | 1 | 8 | 6 | 10 | ✅ |
| `gunboat--legion` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 49×25×35 | 1 | 8 | 6 | 11 | ✅ |
| `cruiser--legion` | naval | ship | 2× | 2×2 (64×64) | 64×28×40 | 1 | 8 | 6 | 11 | ✅ |
| `battleship--legion` | naval | ship | 2× | 2×2 (64×64) | 64×28×40 | 1 | 8 | 6 | 11 | ✅ |
| `lander--legion` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 55×28×28 | 1 | 8 | 6 | 9 | ✅ |
| `lift-copter--legion` | rotor | aircraft | 1.5× | 1.5×1.5 (48×48) | 45×33×25 | 1 | 8 | 6 | 10 | ✅ |
| `uhac--legion` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 56×42×35 | 1 | 8 | 6 | 9 | ✅ |
| `uav--legion` | rotor | aircraft | 1.25× | 1.25×1.25 (40×40) | 34×34×15 | 1 | 8 | 6 | 10 | ✅ |
| `mpa--legion` | jet | aircraft | 2× | 2×2 (64×64) | 61×48×32 | 1 | 8 | 6 | 10 | ✅ |
| `bastion--legion` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 52×45×39 | 1 | 8 | 6 | 12 | ✅ |
| `specter--legion` | jet | aircraft | 2× | 2×2 (64×64) | 44×52×22 | 1 | 8 | 6 | 10 | ✅ |
| `aegis--legion` | wheeled | vehicle | 1.5× | 1.5×1.5 (48×48) | 36×27×30 | 1 | 8 | 6 | 12 | ✅ |
| `rocket-infantry--legion` | Infantry | human | 1× | 1×1 (32×32) | 26×17×23 | 1 | 8 | 6 | 13 | ✅ |
| `aa-infantry--legion` | Infantry | human | 1× | 1×1 (32×32) | 25×17×23 | 1 | 8 | 6 | 13 | ✅ |
| `sniper--legion` | Infantry | human | 1× | 1×1 (32×32) | 26×16×23 | 1 | 8 | 6 | 13 | ✅ |
| `grenadier--legion` | Infantry | human | 1× | 1×1 (32×32) | 23×18×23 | 1 | 8 | 6 | 13 | ✅ |
| `flamethrower--legion` | Infantry | human | 1× | 1×1 (32×32) | 27×17×23 | 1 | 8 | 6 | 13 | ✅ |
| `demolitionist--legion` | Infantry | human | 1× | 1×1 (32×32) | 22×18×23 | 1 | 8 | 6 | 13 | ✅ |
| `commando--legion` | Infantry | human | 1× | 1×1 (32×32) | 25×18×23 | 1 | 8 | 6 | 13 | ✅ |
| `officer--legion` | Infantry | human | 1× | 1×1 (32×32) | 22×19×23 | 1 | 8 | 6 | 13 | ✅ |
| `spy--legion` | Infantry | human | 1× | 1×1 (32×32) | 22×19×23 | 1 | 8 | 6 | 13 | ✅ |
| `elite-hero--legion` | Infantry | human | 1× | 1×1 (32×32) | 25×22×25 | 1 | 8 | 6 | 13 | ✅ |
| `attack-dog--legion` | Infantry | human | 1× | 1×1 (32×32) | 27×14×20 | 1 | 8 | 6 | 13 | ✅ |
| `scout--legion` | Infantry | human | 1× | 1×1 (32×32) | 19×18×26 | 1 | 8 | 6 | 13 | ✅ |
| `ifv--legion` | tracked | vehicle | 1.5× | 1.5×1.5 (48×48) | 40×33×30 | 1 | 8 | 6 | 12 | ✅ |
| `supply-truck--legion` | wheeled | vehicle | 1.5× | 1.5×1.5 (48×48) | 37×27×25 | 1 | 8 | 6 | 9 | ✅ |
| `mobile-repair--legion` | tracked | vehicle | 1.5× | 1.5×1.5 (48×48) | 38×33×31 | 1 | 8 | 6 | 9 | ✅ |
| `command-vehicle--legion` | wheeled | vehicle | 1.5× | 1.5×1.5 (48×48) | 36×27×38 | 1 | 8 | 6 | 9 | ✅ |
| `mine-layer--legion` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 46×39×31 | 1 | 8 | 6 | 9 | ✅ |
| `tank-destroyer--legion` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 52×45×29 | 1 | 8 | 6 | 12 | ✅ |
| `flame-tank--legion` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 48×39×29 | 1 | 8 | 6 | 12 | ✅ |
| `amphibious-tank--legion` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 42×39×29 | 1 | 8 | 6 | 12 | ✅ |
| `mine-clearing--legion` | tracked | vehicle | 1.75× | 1.75×1.75 (56×56) | 48×39×36 | 1 | 8 | 6 | 9 | ✅ |
| `ground-attack-jet--legion` | jet | aircraft | 1.75× | 1.75×1.75 (56×56) | 50×53×19 | 1 | 8 | 6 | 10 | ✅ |
| `transport-plane--legion` | jet | aircraft | 2× | 2×2 (64×64) | 57×60×32 | 1 | 8 | 6 | 8 | ✅ |
| `stealth-fighter--legion` | jet | aircraft | 1.75× | 1.75×1.75 (56×56) | 51×45×19 | 1 | 8 | 6 | 10 | ✅ |
| `spy-plane--legion` | jet | aircraft | 1.75× | 1.75×1.75 (56×56) | 55×56×17 | 1 | 8 | 6 | 8 | ✅ |
| `destroyer--legion` | naval | ship | 2× | 2×2 (64×64) | 64×28×40 | 1 | 8 | 6 | 11 | ✅ |
| `missile-boat--legion` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 45×25×35 | 1 | 8 | 6 | 11 | ✅ |
| `carrier--legion` | naval | ship | 2× | 2×2 (64×64) | 64×44×39 | 1 | 8 | 6 | 11 | ✅ |
| `naval-repair--legion` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 53×27×31 | 1 | 8 | 6 | 9 | ✅ |
| `mine-layer-ship--legion` | naval | ship | 1.75× | 1.75×1.75 (56×56) | 53×27×31 | 1 | 8 | 6 | 9 | ✅ |


### Building variants

| id | category | height class | size class | footprint (tiles) | model bounds (voxels) | render scale | facings | variants | frame cells | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `hq--allies` | Command compound | major | — | 3×3 (96×96) | 96×96×70 | 1 | 4 | 7 | 1 | ✅ |
| `base--allies` | Production | medium | — | 2×2 (64×64) | 64×64×38 | 1 | 4 | 7 | 2 | ✅ |
| `city--allies` | Economy | medium | — | 2×2 (64×64) | 64×64×45 | 1 | 4 | 7 | 1 | ✅ |
| `airport--allies` | Production | major | — | 3×3 (96×96) | 96×96×60 | 1 | 4 | 7 | 2 | ✅ |
| `port--allies` | Logistics | major | — | 3×2 (96×64) | 96×64×38 | 1 | 4 | 7 | 1 | ✅ |
| `farm--allies` | Economy | low | — | 2×2 (64×64) | 64×64×29 | 1 | 4 | 7 | 1 | ✅ |
| `mine--allies` | Economy | medium | — | 2×2 (64×64) | 64×64×40 | 1 | 4 | 7 | 1 | ✅ |
| `depot--allies` | Logistics | medium | — | 2×2 (64×64) | 64×64×29 | 1 | 4 | 7 | 1 | ✅ |
| `landmine--allies` | Defence (1×1) | low | — | 1×1 (32×32) | 21×18×14 | 1 | 4 | 7 | 1 | ✅ |
| `supply-depot--allies` | Logistics | medium | — | 2×2 (64×64) | 64×64×29 | 1 | 4 | 7 | 1 | ✅ |
| `repair-depot--allies` | Logistics | medium | — | 2×2 (64×64) | 64×64×37 | 1 | 4 | 7 | 1 | ✅ |
| `field-hospital--allies` | Support | medium | — | 2×2 (64×64) | 64×64×29 | 1 | 4 | 7 | 1 | ✅ |
| `barracks--allies` | Production | medium | — | 2×2 (64×64) | 64×64×36 | 1 | 4 | 7 | 1 | ✅ |
| `helipad--allies` | Support | low | — | 2×2 (64×64) | 64×64×36 | 1 | 4 | 7 | 1 | ✅ |
| `power-plant--allies` | Infrastructure | tall | — | 2×2 (64×64) | 64×64×42 | 1 | 4 | 7 | 1 | ✅ |
| `refinery--allies` | Infrastructure | tall | — | 2×2 (64×64) | 64×64×52 | 1 | 4 | 7 | 1 | ✅ |
| `radar-station--allies` | Infrastructure | tall | — | 2×2 (64×64) | 64×64×47 | 1 | 4 | 7 | 2 | ✅ |
| `research-lab--allies` | Support | medium | — | 2×2 (64×64) | 64×64×39 | 1 | 4 | 7 | 1 | ✅ |
| `pillbox--allies` | Defence (1×1) | low | — | 1×1 (32×32) | 28×26×14 | 1 | 4 | 7 | 1 | ✅ |
| `bunker--allies` | Defence (1×1) | low | — | 1×1 (32×32) | 26×22×16 | 1 | 4 | 7 | 1 | ✅ |
| `at-turret--allies` | Defence (1×1) | low | — | 1×1 (32×32) | 27×24×17 | 1 | 4 | 7 | 1 | ✅ |
| `sam-site--allies` | Defence (1×1) | medium | — | 1×1 (32×32) | 25×26×20 | 1 | 4 | 7 | 1 | ✅ |
| `flak-cannon--allies` | Defence (1×1) | medium | — | 1×1 (32×32) | 28×28×14 | 1 | 4 | 7 | 1 | ✅ |
| `coastal-battery--allies` | Defence (1×1) | low | — | 1×1 (32×32) | 29×24×21 | 1 | 4 | 7 | 1 | ✅ |
| `artillery-emplacement--allies` | Defence (1×1) | low | — | 1×1 (32×32) | 28×28×14 | 1 | 4 | 7 | 1 | ✅ |
| `guard-tower--allies` | Defence (1×1) | tall | — | 1×1 (32×32) | 25×20×40 | 1 | 4 | 7 | 1 | ✅ |
| `hq--soviets` | Command compound | major | — | 3×3 (96×96) | 96×96×70 | 1 | 4 | 7 | 1 | ✅ |
| `base--soviets` | Production | medium | — | 2×2 (64×64) | 64×64×38 | 1 | 4 | 7 | 2 | ✅ |
| `city--soviets` | Economy | medium | — | 2×2 (64×64) | 64×64×58 | 1 | 4 | 7 | 1 | ✅ |
| `airport--soviets` | Production | major | — | 3×3 (96×96) | 96×96×70 | 1 | 4 | 7 | 2 | ✅ |
| `port--soviets` | Logistics | major | — | 3×2 (96×64) | 96×64×38 | 1 | 4 | 7 | 1 | ✅ |
| `farm--soviets` | Economy | low | — | 2×2 (64×64) | 64×64×36 | 1 | 4 | 7 | 1 | ✅ |
| `mine--soviets` | Economy | medium | — | 2×2 (64×64) | 64×64×40 | 1 | 4 | 7 | 1 | ✅ |
| `depot--soviets` | Logistics | medium | — | 2×2 (64×64) | 64×64×36 | 1 | 4 | 7 | 1 | ✅ |
| `landmine--soviets` | Defence (1×1) | low | — | 1×1 (32×32) | 21×25×18 | 1 | 4 | 7 | 1 | ✅ |
| `supply-depot--soviets` | Logistics | medium | — | 2×2 (64×64) | 64×64×36 | 1 | 4 | 7 | 1 | ✅ |
| `repair-depot--soviets` | Logistics | medium | — | 2×2 (64×64) | 64×64×37 | 1 | 4 | 7 | 1 | ✅ |
| `field-hospital--soviets` | Support | medium | — | 2×2 (64×64) | 64×64×36 | 1 | 4 | 7 | 1 | ✅ |
| `barracks--soviets` | Production | medium | — | 2×2 (64×64) | 64×64×36 | 1 | 4 | 7 | 1 | ✅ |
| `helipad--soviets` | Support | low | — | 2×2 (64×64) | 64×64×36 | 1 | 4 | 7 | 1 | ✅ |
| `power-plant--soviets` | Infrastructure | tall | — | 2×2 (64×64) | 64×64×46 | 1 | 4 | 7 | 1 | ✅ |
| `refinery--soviets` | Infrastructure | tall | — | 2×2 (64×64) | 64×64×52 | 1 | 4 | 7 | 1 | ✅ |
| `radar-station--soviets` | Infrastructure | tall | — | 2×2 (64×64) | 64×64×47 | 1 | 4 | 7 | 2 | ✅ |
| `research-lab--soviets` | Support | medium | — | 2×2 (64×64) | 64×64×53 | 1 | 4 | 7 | 1 | ✅ |
| `pillbox--soviets` | Defence (1×1) | low | — | 1×1 (32×32) | 28×26×18 | 1 | 4 | 7 | 1 | ✅ |
| `bunker--soviets` | Defence (1×1) | low | — | 1×1 (32×32) | 26×25×20 | 1 | 4 | 7 | 1 | ✅ |
| `at-turret--soviets` | Defence (1×1) | low | — | 1×1 (32×32) | 27×25×18 | 1 | 4 | 7 | 1 | ✅ |
| `sam-site--soviets` | Defence (1×1) | medium | — | 1×1 (32×32) | 25×26×21 | 1 | 4 | 7 | 1 | ✅ |
| `flak-cannon--soviets` | Defence (1×1) | medium | — | 1×1 (32×32) | 28×28×18 | 1 | 4 | 7 | 1 | ✅ |
| `coastal-battery--soviets` | Defence (1×1) | low | — | 1×1 (32×32) | 29×25×25 | 1 | 4 | 7 | 1 | ✅ |
| `artillery-emplacement--soviets` | Defence (1×1) | low | — | 1×1 (32×32) | 28×28×18 | 1 | 4 | 7 | 1 | ✅ |
| `guard-tower--soviets` | Defence (1×1) | tall | — | 1×1 (32×32) | 25×25×42 | 1 | 4 | 7 | 1 | ✅ |
| `hq--empire` | Command compound | major | — | 3×3 (96×96) | 96×96×70 | 1 | 4 | 7 | 1 | ✅ |
| `base--empire` | Production | medium | — | 2×2 (64×64) | 64×64×38 | 1 | 4 | 7 | 2 | ✅ |
| `city--empire` | Economy | medium | — | 2×2 (64×64) | 64×64×40 | 1 | 4 | 7 | 1 | ✅ |
| `airport--empire` | Production | major | — | 3×3 (96×96) | 96×96×60 | 1 | 4 | 7 | 2 | ✅ |
| `port--empire` | Logistics | major | — | 3×2 (96×64) | 96×64×38 | 1 | 4 | 7 | 1 | ✅ |
| `farm--empire` | Economy | low | — | 2×2 (64×64) | 64×64×36 | 1 | 4 | 7 | 1 | ✅ |
| `mine--empire` | Economy | medium | — | 2×2 (64×64) | 64×64×40 | 1 | 4 | 7 | 1 | ✅ |
| `depot--empire` | Logistics | medium | — | 2×2 (64×64) | 64×64×36 | 1 | 4 | 7 | 1 | ✅ |
| `landmine--empire` | Defence (1×1) | low | — | 1×1 (32×32) | 21×18×16 | 1 | 4 | 7 | 1 | ✅ |
| `supply-depot--empire` | Logistics | medium | — | 2×2 (64×64) | 64×64×36 | 1 | 4 | 7 | 1 | ✅ |
| `repair-depot--empire` | Logistics | medium | — | 2×2 (64×64) | 64×64×37 | 1 | 4 | 7 | 1 | ✅ |
| `field-hospital--empire` | Support | medium | — | 2×2 (64×64) | 64×64×36 | 1 | 4 | 7 | 1 | ✅ |
| `barracks--empire` | Production | medium | — | 2×2 (64×64) | 64×64×36 | 1 | 4 | 7 | 1 | ✅ |
| `helipad--empire` | Support | low | — | 2×2 (64×64) | 64×64×36 | 1 | 4 | 7 | 1 | ✅ |
| `power-plant--empire` | Infrastructure | tall | — | 2×2 (64×64) | 64×64×42 | 1 | 4 | 7 | 1 | ✅ |
| `refinery--empire` | Infrastructure | tall | — | 2×2 (64×64) | 64×64×52 | 1 | 4 | 7 | 1 | ✅ |
| `radar-station--empire` | Infrastructure | tall | — | 2×2 (64×64) | 64×64×47 | 1 | 4 | 7 | 2 | ✅ |
| `research-lab--empire` | Support | medium | — | 2×2 (64×64) | 64×64×50 | 1 | 4 | 7 | 1 | ✅ |
| `pillbox--empire` | Defence (1×1) | low | — | 1×1 (32×32) | 28×26×16 | 1 | 4 | 7 | 1 | ✅ |
| `bunker--empire` | Defence (1×1) | low | — | 1×1 (32×32) | 26×20×18 | 1 | 4 | 7 | 1 | ✅ |
| `at-turret--empire` | Defence (1×1) | low | — | 1×1 (32×32) | 27×24×16 | 1 | 4 | 7 | 1 | ✅ |
| `sam-site--empire` | Defence (1×1) | medium | — | 1×1 (32×32) | 25×26×19 | 1 | 4 | 7 | 1 | ✅ |
| `flak-cannon--empire` | Defence (1×1) | medium | — | 1×1 (32×32) | 28×28×16 | 1 | 4 | 7 | 1 | ✅ |
| `coastal-battery--empire` | Defence (1×1) | low | — | 1×1 (32×32) | 29×22×23 | 1 | 4 | 7 | 1 | ✅ |
| `artillery-emplacement--empire` | Defence (1×1) | low | — | 1×1 (32×32) | 28×28×16 | 1 | 4 | 7 | 1 | ✅ |
| `guard-tower--empire` | Defence (1×1) | tall | — | 1×1 (32×32) | 25×18×40 | 1 | 4 | 7 | 1 | ✅ |
| `hq--legion` | Command compound | major | — | 3×3 (96×96) | 96×96×70 | 1 | 4 | 7 | 1 | ✅ |
| `base--legion` | Production | medium | — | 2×2 (64×64) | 64×64×38 | 1 | 4 | 7 | 2 | ✅ |
| `city--legion` | Economy | medium | — | 2×2 (64×64) | 64×64×50 | 1 | 4 | 7 | 1 | ✅ |
| `airport--legion` | Production | major | — | 3×3 (96×96) | 96×96×60 | 1 | 4 | 7 | 2 | ✅ |
| `port--legion` | Logistics | major | — | 3×2 (96×64) | 96×64×38 | 1 | 4 | 7 | 1 | ✅ |
| `farm--legion` | Economy | low | — | 2×2 (64×64) | 64×64×36 | 1 | 4 | 7 | 1 | ✅ |
| `mine--legion` | Economy | medium | — | 2×2 (64×64) | 64×64×40 | 1 | 4 | 7 | 1 | ✅ |
| `depot--legion` | Logistics | medium | — | 2×2 (64×64) | 64×64×36 | 1 | 4 | 7 | 1 | ✅ |
| `landmine--legion` | Defence (1×1) | low | — | 1×1 (32×32) | 24×25×14 | 1 | 4 | 7 | 1 | ✅ |
| `supply-depot--legion` | Logistics | medium | — | 2×2 (64×64) | 64×64×36 | 1 | 4 | 7 | 1 | ✅ |
| `repair-depot--legion` | Logistics | medium | — | 2×2 (64×64) | 64×64×37 | 1 | 4 | 7 | 1 | ✅ |
| `field-hospital--legion` | Support | medium | — | 2×2 (64×64) | 64×64×36 | 1 | 4 | 7 | 1 | ✅ |
| `barracks--legion` | Production | medium | — | 2×2 (64×64) | 64×64×36 | 1 | 4 | 7 | 1 | ✅ |
| `helipad--legion` | Support | low | — | 2×2 (64×64) | 64×64×36 | 1 | 4 | 7 | 1 | ✅ |
| `power-plant--legion` | Infrastructure | tall | — | 2×2 (64×64) | 64×64×42 | 1 | 4 | 7 | 1 | ✅ |
| `refinery--legion` | Infrastructure | tall | — | 2×2 (64×64) | 64×64×52 | 1 | 4 | 7 | 1 | ✅ |
| `radar-station--legion` | Infrastructure | tall | — | 2×2 (64×64) | 64×64×47 | 1 | 4 | 7 | 2 | ✅ |
| `research-lab--legion` | Support | medium | — | 2×2 (64×64) | 64×64×40 | 1 | 4 | 7 | 1 | ✅ |
| `pillbox--legion` | Defence (1×1) | low | — | 1×1 (32×32) | 28×26×14 | 1 | 4 | 7 | 1 | ✅ |
| `bunker--legion` | Defence (1×1) | low | — | 1×1 (32×32) | 26×25×16 | 1 | 4 | 7 | 1 | ✅ |
| `at-turret--legion` | Defence (1×1) | low | — | 1×1 (32×32) | 27×25×14 | 1 | 4 | 7 | 1 | ✅ |
| `sam-site--legion` | Defence (1×1) | medium | — | 1×1 (32×32) | 25×26×17 | 1 | 4 | 7 | 1 | ✅ |
| `flak-cannon--legion` | Defence (1×1) | medium | — | 1×1 (32×32) | 28×28×14 | 1 | 4 | 7 | 1 | ✅ |
| `coastal-battery--legion` | Defence (1×1) | low | — | 1×1 (32×32) | 29×25×21 | 1 | 4 | 7 | 1 | ✅ |
| `artillery-emplacement--legion` | Defence (1×1) | low | — | 1×1 (32×32) | 28×28×14 | 1 | 4 | 7 | 1 | ✅ |
| `guard-tower--legion` | Defence (1×1) | tall | — | 1×1 (32×32) | 25×25×40 | 1 | 4 | 7 | 1 | ✅ |



## Validation status

All rows above are derived from a completed `npm run voxels:all` +
`npm run voxels:review`: the model exists in `data/voxels.json`, a manifest
entry exists with the expected facing/variant/frame counts, and the baked
sheet file exists on disk. `tests/scale.test.js` re-checks the same gates plus
the runtime integration (footprints, anchors, placement, elevation).

Known, documented exceptions:

1. **Flat terrain surfaces** (`plains`, `river`, `sea`, `shoal`) are drawn by
   the runtime vector/coast painter (animated shimmer), not by voxel sprites;
   their voxel ids exist for the sprite pipeline but legacy renderer paths are
   preserved by design (`renderMode: "vector"`).
2. **Projectiles and blast particles** remain renderer-side effects; only the
   `silo-missile` effect is a voxel model.
3. **Units use fractional footprints without grid occupancy.** A unit declares
   1 / 1.25 / 1.5 / 1.75 / 2 tiles of ground so its size class is explicit, but
   `footprintCells()` still returns a single cell: occupancy, pathing and
   collision stay continuous because the game moves units on floating-point
   positions.
