# Complete Faction-Specific Units, Buildings, and Military Structures

> **Historical document (pre-scale-migration).** Grid sizes, counts and 0.5 px/voxel
> offsets below describe the retired 64-voxel single-tile contract. Current contract:
> [SCALE_128.md](SCALE_128.md); results: [SCALE_MIGRATION_REPORT.md](SCALE_MIGRATION_REPORT.md).

This document records the complete 4-faction voxel asset matrix across **Allies (`allies`)**, **Soviets (`soviets`)**, **Empire (`empire`)**, and **Legion (`legion`)** (plus `standard` baseline models), their architectural and mechanical design language, naming conventions, runtime integration, and validation results.

---

## 1. Final Coverage Summary & Asset Counts

| Category | Base Types | Standard Models | Faction Models (`×4` Armies) | Total Voxel Models | Facings per Model | Team Variants per Facing | Total Baked Iso Strips |
|---|---:|---:|---:|---:|---:|---:|---:|
| **Mobile Units** (`Infantry`, `Ground`, `Air`, `Naval`) | `58` | `58` | `232` (`58 × 4`) | **`290`** | `8` (`right`, `down-right`, `down`, `down-left`, `left`, `up-left`, `up`, `up-right`) | `6` (`0..5`) | **`13,920`** |
| **Buildings & Owned Structures** (`Production`, `Economy`, `Tech`, `Defenses`, `Landmine`) | `26` | `26` | `104` (`26 × 4`) | **`130`** | `4` (`right`, `up`, `left`, `down`) | `7` (`0..5`, `n`) | **`3,640`** |
| **Fortifications** (`wall`, `wall-gate`, `wall-end`, `wall-corner`, `wall-t`, `wall-cross`) | `6` | `6` | `24` (`6 × 4`) | **`30`** | `4` (`right`, `up`, `left`, `down`) | `1` (`n`) | **`120`** |
| **Neutral Terrain, Elevation (`00..32`), Roads, Bridges & Effects** | `50` | `50` | `0` (neutral) | **`50`** | `4` (`right`, `up`, `left`, `down`) | `1` (`n`) | **`200`** |
| **TOTAL** | **`140`** | **`140`** | **`360`** | **`500`** | — | — | **`17,880`** |

- **Total Voxel Models in `data/voxels.json` & `manifest.json`**: `500` (`8,193,053` surface voxels, `358` palette colours).
- **Total Preview PNGs in `game_assets/voxels/*.png`**: `500` model previews + `elevation-comparison.png` (`1260×120`) + `faction-comparison.png` (`1184×512`).
- **Total Baked Sprite Strips in `game_assets/voxels/sheets/*.png`**: `17,880`.

---

## 2. Four Faction Visual Identities

### 2.1 Allies (`allies`)
- **Unit Palette**: `hull: #7d8a5a`, `light: #a6b27a`, `dark: #5a6642`, `plate: #5f6c48`, `trim: #dfe6ea`, `accent: #df794b`.
- **Building Palette**: `wall: #c6d0d8`, `stone: #abb6c0`, `stoneLight: #dde5ec`, `concrete: #8a98a4`, `trim: #3b6ea5`, `trimLight: #dfe6ea`.
- **Design Language**:
  - **Units**: Modern NATO-inspired practical design — sloped Chobham/reactive glacis plates, perforated muzzle brakes, rear turret bustle racks & whip antennas, wide-brim M1/PASGT combat helmets, K9 Kevlar tactical vests with GPS whips, spec-ops comtac headsets & SATCOM antennas, wingtip winglets, and bulbous sonar bows.
  - **Buildings & Defenses**: Clean modern steel-and-glass military architecture, white geodesic SATCOM/weather/cryo radomes (`hq--allies`, `barracks--allies`, `airport--allies`, `port--allies`, `power-plant--allies`, `refinery--allies`, `radar-station--allies`, `research-lab--allies`), angled sawtooth skylight roofs, and Phalanx/C-RAM optical domes on defensive emplacements.

### 2.2 Soviets (`soviets`)
- **Unit Palette**: `hull: #7a3b30`, `light: #a85a48`, `dark: #4d2520`, `plate: #4d2520`, `trim: #e0b94a`, `accent: #df794b`.
- **Building Palette**: `wall: #8c8078`, `stone: #72665e`, `stoneLight: #a69a90`, `concrete: #6c625c`, `trim: #e0b94a`, `trimLight: #c84434`, `energy: #ff7730`.
- **Design Language**:
  - **Units**: Heavy slab armor and overwhelming firepower — full-length heavy ERA side skirts, thick upper hull armor slabs, twin cannon barrels, oversized commander cupolas, ushanka fur hats, shock-specialist slab pauldrons with high armored gorgets & twin dorsal assault tanks, spiked steel war-hound harnesses, and heavy wingtip weapon pods.
  - **Buildings & Defenses**: Brutalist ferro-concrete architecture, monumental Seven-Sisters/Red-Star spires (`hq--soviets`, `city--soviets`, `barracks--soviets`), extra blast-furnace smokestacks (`base--soviets`, `power-plant--soviets`, `refinery--soviets`), U-boat concrete submarine pens (`port--soviets`), Duga over-the-horizon steel lattice radar arrays (`radar-station--soviets`), towering high-voltage Tesla coils (`research-lab--soviets`), and thick cast-iron casemate slabs.

### 2.3 Empire (`empire`)
- **Unit Palette**: `hull: #cfc9b6`, `light: #ece8d8`, `dark: #8c8670`, `plate: #a8a48c`, `trim: #2f4a7a`, `accent: #df794b`.
- **Building Palette**: `wall: #e6e2d2`, `stone: #d0cab6`, `stoneLight: #f4f0e4`, `concrete: #b8b29e`, `trim: #2f4a7a`, `trimLight: #d4a238`, `energy: #5fc4e8`.
- **Design Language**:
  - **Units**: Refined angular high-tech engineering — chamfered hull corners, clean ivory composite deck plating, cobalt-blue (`#2f4a7a`) optical sensor housings, peaked caps, samurai-inspired winged `sode` shoulder armor & dorsal `sashimono` banner masts (`commando--empire`, `officer--empire`, `elite-hero--empire`), cyber-hound sensor fins, upward-canting wing stabilizer fins, and stepped pagoda warship bridges.
  - **Buildings & Defenses**: Symmetrical alabaster-and-cobalt structures with multi-tiered upturned pagoda roof crowns and gold corner finials, ceremonial torii gates (`hq--empire`, `barracks--empire`), glowing cyan (`#5fc4e8`) plasma/crystalline energy spires and rings (`research-lab--empire`, `power-plant--empire`, `refinery--empire`, `radar-station--empire`), and faceted cobalt armor shields on turrets.

### 2.4 Legion (`legion`)
- **Unit Palette**: `hull: #a58a5a`, `light: #c4aa78`, `dark: #6e5a38`, `plate: #6e5a38`, `trim: #2b2b2b`, `accent: #df794b`.
- **Building Palette**: `wall: #a89272`, `stone: #8c785a`, `stoneLight: #c2ae8c`, `concrete: #7a6a52`, `trim: #2b2b2b`, `trimLight: #8c6b42`, `energy: #ffd84a`.
- **Design Language**:
  - **Units**: Field-modified salvage and asymmetrical ruggedness — welded cross-hull armor straps, twin external rear fuel drums (`#8c6b42`), front desert ram bumpers (`#c8b084`), open-top fighting compartments (`recon--legion`, `apc--legion`, `tank--legion`), desert shemagh/bandana wraps, asymmetrical spiked scrap pauldrons & bedrolls, and strapped cargo pods on aircraft/ships.
  - **Buildings & Defenses**: Improvised outpost compounds featuring A-frame salvage derrick cranes (`hq--legion`, `base--legion`, `airport--legion`, `port--legion`, `research-lab--legion`), bolted corrugated metal patch roofs, rooftop sniper crow's nests (`barracks--legion`), wooden water towers & sky-catwalks (`city--legion`), Hesco sandbag bastions, and external oil drum clusters.

---

## 3. Complete Coverage Matrix

### 3.1 Mobile Units (`58` Base Units × 5 Armies = `290` Models)

| Production Building | Base ID | Standard | Allies | Soviets | Empire | Legion | Facings | Clips |
|---|---|---|---|---|---|---|---|---|
| **Barracks (`16`)** | `infantry` | `infantry` | `infantry--allies` | `infantry--soviets` | `infantry--empire` | `infantry--legion` | 8 | `idle:1, move:4, attack:3, death:5` |
| **Barracks** | `mech` | `mech` | `mech--allies` | `mech--soviets` | `mech--empire` | `mech--legion` | 8 | `idle:1, move:4, attack:3, death:5` |
| **Barracks** | `engineer` | `engineer` | `engineer--allies` | `engineer--soviets` | `engineer--empire` | `engineer--legion` | 8 | `idle:1, move:4, death:5` |
| **Barracks** | `medic` | `medic` | `medic--allies` | `medic--soviets` | `medic--empire` | `medic--legion` | 8 | `idle:1, move:4, death:5` |
| **Barracks** | `rocket-infantry` | `rocket-infantry` | `rocket-infantry--allies` | `rocket-infantry--soviets` | `rocket-infantry--empire` | `rocket-infantry--legion` | 8 | `idle:1, move:4, attack:3, death:5` |
| **Barracks** | `aa-infantry` | `aa-infantry` | `aa-infantry--allies` | `aa-infantry--soviets` | `aa-infantry--empire` | `aa-infantry--legion` | 8 | `idle:1, move:4, attack:3, death:5` |
| **Barracks** | `sniper` | `sniper` | `sniper--allies` | `sniper--soviets` | `sniper--empire` | `sniper--legion` | 8 | `idle:1, move:4, attack:3, death:5` |
| **Barracks** | `grenadier` | `grenadier` | `grenadier--allies` | `grenadier--soviets` | `grenadier--empire` | `grenadier--legion` | 8 | `idle:1, move:4, attack:3, death:5` |
| **Barracks** | `flamethrower` | `flamethrower` | `flamethrower--allies` | `flamethrower--soviets` | `flamethrower--empire` | `flamethrower--legion` | 8 | `idle:1, move:4, attack:3, death:5` |
| **Barracks** | `demolitionist` | `demolitionist` | `demolitionist--allies` | `demolitionist--soviets` | `demolitionist--empire` | `demolitionist--legion` | 8 | `idle:1, move:4, attack:3, death:5` |
| **Barracks** | `commando` | `commando` | `commando--allies` | `commando--soviets` | `commando--empire` | `commando--legion` | 8 | `idle:1, move:4, attack:3, death:5` |
| **Barracks** | `officer` | `officer` | `officer--allies` | `officer--soviets` | `officer--empire` | `officer--legion` | 8 | `idle:1, move:4, attack:3, death:5` |
| **Barracks** | `spy` | `spy` | `spy--allies` | `spy--soviets` | `spy--empire` | `spy--legion` | 8 | `idle:1, move:4, attack:3, death:5` |
| **Barracks** | `elite-hero` | `elite-hero` | `elite-hero--allies` | `elite-hero--soviets` | `elite-hero--empire` | `elite-hero--legion` | 8 | `idle:1, move:4, attack:3, death:5` |
| **Barracks** | `attack-dog` | `attack-dog` | `attack-dog--allies` | `attack-dog--soviets` | `attack-dog--empire` | `attack-dog--legion` | 8 | `idle:1, move:4, attack:3, death:5` |
| **Barracks** | `scout` | `scout` | `scout--allies` | `scout--soviets` | `scout--empire` | `scout--legion` | 8 | `idle:1, move:4, attack:3, death:5` |
| **Base (`20`)** | `apc` | `apc` | `apc--allies` | `apc--soviets` | `apc--empire` | `apc--legion` | 8 | `idle:1, move:4, death:4` |
| **Base** | `recon` | `recon` | `recon--allies` | `recon--soviets` | `recon--empire` | `recon--legion` | 8 | `idle:1, move:4, attack:3, death:4` |
| **Base** | `tank` | `tank` | `tank--allies` | `tank--soviets` | `tank--empire` | `tank--legion` | 8 | `idle:1, move:4, attack:3, death:4` |
| **Base** | `heavy` | `heavy` | `heavy--allies` | `heavy--soviets` | `heavy--empire` | `heavy--legion` | 8 | `idle:1, move:4, attack:3, death:4` |
| **Base** | `artillery` | `artillery` | `artillery--allies` | `artillery--soviets` | `artillery--empire` | `artillery--legion` | 8 | `idle:1, move:4, attack:3, death:4` |
| **Base** | `antiair` | `antiair` | `antiair--allies` | `antiair--soviets` | `antiair--empire` | `antiair--legion` | 8 | `idle:1, move:4, attack:3, death:4` |
| **Base** | `rockets` | `rockets` | `rockets--allies` | `rockets--soviets` | `rockets--empire` | `rockets--legion` | 8 | `idle:1, move:4, attack:3, death:4` |
| **Base** | `missiles` | `missiles` | `missiles--allies` | `missiles--soviets` | `missiles--empire` | `missiles--legion` | 8 | `idle:1, move:4, attack:3, death:4` |
| **Base** | `mega` | `mega` | `mega--allies` | `mega--soviets` | `mega--empire` | `mega--legion` | 8 | `idle:1, move:4, attack:3, death:4` |
| **Base** | `bastion` | `bastion` | `bastion--allies` | `bastion--soviets` | `bastion--empire` | `bastion--legion` | 8 | `idle:1, move:4, attack:3, death:4` |
| **Base** | `aegis` | `aegis` | `aegis--allies` | `aegis--soviets` | `aegis--empire` | `aegis--legion` | 8 | `idle:1, move:4, attack:3, death:4` |
| **Base** | `ifv` | `ifv` | `ifv--allies` | `ifv--soviets` | `ifv--empire` | `ifv--legion` | 8 | `idle:1, move:4, attack:3, death:4` |
| **Base** | `supply-truck` | `supply-truck` | `supply-truck--allies` | `supply-truck--soviets` | `supply-truck--empire` | `supply-truck--legion` | 8 | `idle:1, move:4, death:4` |
| **Base** | `mobile-repair` | `mobile-repair` | `mobile-repair--allies` | `mobile-repair--soviets` | `mobile-repair--empire` | `mobile-repair--legion` | 8 | `idle:1, move:4, death:4` |
| **Base** | `command-vehicle` | `command-vehicle` | `command-vehicle--allies` | `command-vehicle--soviets` | `command-vehicle--empire` | `command-vehicle--legion` | 8 | `idle:1, move:4, death:4` |
| **Base** | `mine-layer` | `mine-layer` | `mine-layer--allies` | `mine-layer--soviets` | `mine-layer--empire` | `mine-layer--legion` | 8 | `idle:1, move:4, death:4` |
| **Base** | `tank-destroyer` | `tank-destroyer` | `tank-destroyer--allies` | `tank-destroyer--soviets` | `tank-destroyer--empire` | `tank-destroyer--legion` | 8 | `idle:1, move:4, attack:3, death:4` |
| **Base** | `flame-tank` | `flame-tank` | `flame-tank--allies` | `flame-tank--soviets` | `flame-tank--empire` | `flame-tank--legion` | 8 | `idle:1, move:4, attack:3, death:4` |
| **Base** | `amphibious-tank` | `amphibious-tank` | `amphibious-tank--allies` | `amphibious-tank--soviets` | `amphibious-tank--empire` | `amphibious-tank--legion` | 8 | `idle:1, move:4, attack:3, death:4` |
| **Base** | `mine-clearing` | `mine-clearing` | `mine-clearing--allies` | `mine-clearing--soviets` | `mine-clearing--empire` | `mine-clearing--legion` | 8 | `idle:1, move:4, death:4` |
| **Airport (`11`)** | `copter` | `copter` | `copter--allies` | `copter--soviets` | `copter--empire` | `copter--legion` | 8 | `idle:2, move:4, attack:2, death:4` |
| **Airport** | `lift-copter` | `lift-copter` | `lift-copter--allies` | `lift-copter--soviets` | `lift-copter--empire` | `lift-copter--legion` | 8 | `idle:2, move:4, death:4` |
| **Airport** | `fighter` | `fighter` | `fighter--allies` | `fighter--soviets` | `fighter--empire` | `fighter--legion` | 8 | `idle:1, move:3, attack:2, death:4` |
| **Airport** | `bomber` | `bomber` | `bomber--allies` | `bomber--soviets` | `bomber--empire` | `bomber--legion` | 8 | `idle:1, move:3, attack:2, death:4` |
| **Airport** | `uav` | `uav` | `uav--allies` | `uav--soviets` | `uav--empire` | `uav--legion` | 8 | `idle:2, move:4, death:4` |
| **Airport** | `mpa` | `mpa` | `mpa--allies` | `mpa--soviets` | `mpa--empire` | `mpa--legion` | 8 | `idle:1, move:3, attack:2, death:4` |
| **Airport** | `specter` | `specter` | `specter--allies` | `specter--soviets` | `specter--empire` | `specter--legion` | 8 | `idle:1, move:3, attack:2, death:4` |
| **Airport** | `ground-attack-jet` | `ground-attack-jet` | `ground-attack-jet--allies` | `ground-attack-jet--soviets` | `ground-attack-jet--empire` | `ground-attack-jet--legion` | 8 | `idle:1, move:3, attack:2, death:4` |
| **Airport** | `transport-plane` | `transport-plane` | `transport-plane--allies` | `transport-plane--soviets` | `transport-plane--empire` | `transport-plane--legion` | 8 | `idle:1, move:3, death:4` |
| **Airport** | `stealth-fighter` | `stealth-fighter` | `stealth-fighter--allies` | `stealth-fighter--soviets` | `stealth-fighter--empire` | `stealth-fighter--legion` | 8 | `idle:1, move:3, attack:2, death:4` |
| **Airport** | `spy-plane` | `spy-plane` | `spy-plane--allies` | `spy-plane--soviets` | `spy-plane--empire` | `spy-plane--legion` | 8 | `idle:1, move:3, death:4` |
| **Port (`11`)** | `submarine` | `submarine` | `submarine--allies` | `submarine--soviets` | `submarine--empire` | `submarine--legion` | 8 | `idle:1, move:4, attack:2, death:4` |
| **Port** | `gunboat` | `gunboat` | `gunboat--allies` | `gunboat--soviets` | `gunboat--empire` | `gunboat--legion` | 8 | `idle:1, move:4, attack:2, death:4` |
| **Port** | `cruiser` | `cruiser` | `cruiser--allies` | `cruiser--soviets` | `cruiser--empire` | `cruiser--legion` | 8 | `idle:1, move:4, attack:2, death:4` |
| **Port** | `battleship` | `battleship` | `battleship--allies` | `battleship--soviets` | `battleship--empire` | `battleship--legion` | 8 | `idle:1, move:4, attack:2, death:4` |
| **Port** | `lander` | `lander` | `lander--allies` | `lander--soviets` | `lander--empire` | `lander--legion` | 8 | `idle:1, move:4, death:4` |
| **Port** | `uhac` | `uhac` | `uhac--allies` | `uhac--soviets` | `uhac--empire` | `uhac--legion` | 8 | `idle:1, move:4, death:4` |
| **Port** | `destroyer` | `destroyer` | `destroyer--allies` | `destroyer--soviets` | `destroyer--empire` | `destroyer--legion` | 8 | `idle:1, move:4, attack:2, death:4` |
| **Port** | `missile-boat` | `missile-boat` | `missile-boat--allies` | `missile-boat--soviets` | `missile-boat--empire` | `missile-boat--legion` | 8 | `idle:1, move:4, attack:2, death:4` |
| **Port** | `carrier` | `carrier` | `carrier--allies` | `carrier--soviets` | `carrier--empire` | `carrier--legion` | 8 | `idle:1, move:4, attack:2, death:4` |
| **Port** | `naval-repair` | `naval-repair` | `naval-repair--allies` | `naval-repair--soviets` | `naval-repair--empire` | `naval-repair--legion` | 8 | `idle:1, move:4, death:4` |
| **Port** | `mine-layer-ship` | `mine-layer-ship` | `mine-layer-ship--allies` | `mine-layer-ship--soviets` | `mine-layer-ship--empire` | `mine-layer-ship--legion` | 8 | `idle:1, move:4, death:4` |

### 3.2 Buildings, Defenses & Owned Structures (`26` Base Structures × 5 Armies = `130` Models)

| Category | Base ID | Standard | Allies | Soviets | Empire | Legion | Facings | Variants |
|---|---|---|---|---|---|---|---|---|
| **Command** | `hq` | `hq` | `hq--allies` | `hq--soviets` | `hq--empire` | `hq--legion` | 4 | `0..5, n` |
| **Production** | `barracks` | `barracks` | `barracks--allies` | `barracks--soviets` | `barracks--empire` | `barracks--legion` | 4 | `0..5, n` |
| **Production** | `base` | `base` | `base--allies` | `base--soviets` | `base--empire` | `base--legion` | 4 | `0..5, n` |
| **Production** | `airport` | `airport` | `airport--allies` | `airport--soviets` | `airport--empire` | `airport--legion` | 4 | `0..5, n` |
| **Production** | `helipad` | `helipad` | `helipad--allies` | `helipad--soviets` | `helipad--empire` | `helipad--legion` | 4 | `0..5, n` |
| **Production** | `port` | `port` | `port--allies` | `port--soviets` | `port--empire` | `port--legion` | 4 | `0..5, n` |
| **Urban / Economy** | `city` | `city` | `city--allies` | `city--soviets` | `city--empire` | `city--legion` | 4 | `0..5, n` |
| **Economy** | `farm` | `farm` | `farm--allies` | `farm--soviets` | `farm--empire` | `farm--legion` | 4 | `0..5, n` |
| **Economy** | `mine` | `mine` | `mine--allies` | `mine--soviets` | `mine--empire` | `mine--legion` | 4 | `0..5, n` |
| **Industrial** | `power-plant` | `power-plant` | `power-plant--allies` | `power-plant--soviets` | `power-plant--empire` | `power-plant--legion` | 4 | `0..5, n` |
| **Industrial** | `refinery` | `refinery` | `refinery--allies` | `refinery--soviets` | `refinery--empire` | `refinery--legion` | 4 | `0..5, n` |
| **Logistics** | `depot` | `depot` | `depot--allies` | `depot--soviets` | `depot--empire` | `depot--legion` | 4 | `0..5, n` |
| **Logistics** | `supply-depot` | `supply-depot` | `supply-depot--allies` | `supply-depot--soviets` | `supply-depot--empire` | `supply-depot--legion` | 4 | `0..5, n` |
| **Logistics** | `repair-depot` | `repair-depot` | `repair-depot--allies` | `repair-depot--soviets` | `repair-depot--empire` | `repair-depot--legion` | 4 | `0..5, n` |
| **Medical** | `field-hospital` | `field-hospital` | `field-hospital--allies` | `field-hospital--soviets` | `field-hospital--empire` | `field-hospital--legion` | 4 | `0..5, n` |
| **C4I / Tech** | `radar-station` | `radar-station` | `radar-station--allies` | `radar-station--soviets` | `radar-station--empire` | `radar-station--legion` | 4 | `0..5, n` |
| **C4I / Tech** | `research-lab` | `research-lab` | `research-lab--allies` | `research-lab--soviets` | `research-lab--empire` | `research-lab--legion` | 4 | `0..5, n` |
| **Defense** | `pillbox` | `pillbox` | `pillbox--allies` | `pillbox--soviets` | `pillbox--empire` | `pillbox--legion` | 4 | `0..5, n` |
| **Defense** | `bunker` | `bunker` | `bunker--allies` | `bunker--soviets` | `bunker--empire` | `bunker--legion` | 4 | `0..5, n` |
| **Defense** | `at-turret` | `at-turret` | `at-turret--allies` | `at-turret--soviets` | `at-turret--empire` | `at-turret--legion` | 4 | `0..5, n` |
| **Defense** | `sam-site` | `sam-site` | `sam-site--allies` | `sam-site--soviets` | `sam-site--empire` | `sam-site--legion` | 4 | `0..5, n` |
| **Defense** | `flak-cannon` | `flak-cannon` | `flak-cannon--allies` | `flak-cannon--soviets` | `flak-cannon--empire` | `flak-cannon--legion` | 4 | `0..5, n` |
| **Defense** | `coastal-battery` | `coastal-battery` | `coastal-battery--allies` | `coastal-battery--soviets` | `coastal-battery--empire` | `coastal-battery--legion` | 4 | `0..5, n` |
| **Defense** | `artillery-emplacement` | `artillery-emplacement` | `artillery-emplacement--allies` | `artillery-emplacement--soviets` | `artillery-emplacement--empire` | `artillery-emplacement--legion` | 4 | `0..5, n` |
| **Defense** | `guard-tower` | `guard-tower` | `guard-tower--allies` | `guard-tower--soviets` | `guard-tower--empire` | `guard-tower--legion` | 4 | `0..5, n` |
| **Minefield** | `landmine` | `landmine` | `landmine--allies` | `landmine--soviets` | `landmine--empire` | `landmine--legion` | 4 | `0..5, n` |

### 3.3 Fortified Concrete Walls & Gates (`6` Shapes × 5 Armies = `30` Models)

| Fortification Shape | Standard | Allies | Soviets | Empire | Legion | Facings |
|---|---|---|---|---|---|---|
| **Straight Wall** | `wall-standard` | `wall-allies` | `wall-soviets` | `wall-empire` | `wall-legion` | 4 |
| **Armored Wall Gate** | `wall-gate` | `wall-gate-allies` | `wall-gate-soviets` | `wall-gate-empire` | `wall-gate-legion` | 4 |
| **Wall End Bastion** | `wall-end` | `wall-end-allies` | `wall-end-soviets` | `wall-end-empire` | `wall-end-legion` | 4 |
| **Wall Corner Bastion** | `wall-corner` | `wall-corner-allies` | `wall-corner-soviets` | `wall-corner-empire` | `wall-corner-legion` | 4 |
| **Wall T-Junction** | `wall-t` | `wall-t-allies` | `wall-t-soviets` | `wall-t-empire` | `wall-t-legion` | 4 |
| **Wall Cross-Bastion** | `wall-cross` | `wall-cross-allies` | `wall-cross-soviets` | `wall-cross-empire` | `wall-cross-legion` | 4 |

---

## 4. Runtime Integration & Separation of Faction Style vs Team Colour

1. **`src/armies.js`**:
   - `unitSheetKey(type, armyId)`: Resolves `<unit>--<armyId>` for `allies`, `soviets`, `empire`, `legion` and falls back to `<unit>` for `standard`.
   - `buildingSheetKey(type, armyId)`: Resolves `<building>--<armyId>` for `allies`, `soviets`, `empire`, `legion` and falls back to `<building>` for `standard` or neutral.
   - `fortificationSheetKey(type, armyId)`: Resolves `wall-<armyId>`, `wall-gate-<armyId>`, `wall-end-<armyId>`, `wall-corner-<armyId>`, `wall-t-<armyId>`, `wall-cross-<armyId>`.
   - `resolveEntityArmy(stateOrMap, entity)`: Resolves an entity's faction from `entity.army`, or its owner's seat faction (`map.armies[owner]` / `map.players[owner].army`), or `map.defaultArmy`, defaulting to `'standard'`.
   - `normalizeArmyState(saved)`: Stamps both `saved.units` and `saved.properties` with their owner's faction on save/map load.
2. **`src/iso-renderer.js`**:
   - Automatically resolves each building's and unit's faction model (`modelId`) via `resolveEntityArmy` + `buildingSheetKey` / `unitSheetKey` while passing the player's seat colour index (`variant` ∈ `0..5, n`) independently to `blitSheet`.
3. **Interactive Viewers**:
   - `/voxel-sprite-review-improved.html`: Includes a Faction filter (`All Factions`, `Standard`, `Allies`, `Soviets`, `Empire`, `Legion`) and a live 5-column side-by-side comparison bar (`Standard · Allies · Soviets · Empire · Legion`) for any selected unit, building, or fortification.
   - `/terrain-elevation-editor.html`: Includes a Faction selector (`Allies`, `Soviets`, `Empire`, `Legion`, `Standard`) for placing faction-specific units and buildings on any elevation level (`0..32`).
   - `game_assets/voxels/faction-comparison.png`: `1184×512` 4-row × 8-column comparison sheet across all 4 factions.

---

## 5. Rebuild & Validation Commands

```bash
# Rebuild all 500 voxel models in data/voxels.json
node tools/voxel_pipeline/build.mjs

# Render previews (supports --only id1,id2,...)
node tools/voxel_pipeline/preview.mjs

# Bake isometric sprite strips & manifest.json (supports --only id1,id2,...)
node tools/voxel_pipeline/bake.mjs

# Run all 15 automated elevation + 4-faction geometry + runtime tests
npm test
```
