/**
 * 64×64×64 architectural buildings. x/y is the full 64×64 property footprint
 * and z ∈ 0..63 is true elevation. Airport runway tarmac and harbor water stay
 * flat single-voxel z=0 surfaces; terminals, hangars, docks, towers and
 * industrial structures rise cleanly above them. Operational machinery is
 * tagged: `dish` (airport radar, yaws on idle frame 1) and `puff` (factory
 * exhaust, present only on idle frame 1).
 */
import { smallBuildingVoxels, SMALL_BUILDING_IDS } from './buildings-small.mjs';
import { largeBuildingVoxels, LARGE_BUILDING_IDS } from './buildings-large.mjs';
import { applySmallBuildingArmyDelta, applyLargeBuildingArmyDelta } from './building-army.mjs';

const ROOF = '#df794b', ROOF_L = '#ffc68b', ROOF_D = '#934b32';
const TEAM = '#df794b';
const STONE = '#e0d9b2', STONE_L = '#ece7bc', WALL = '#8a8c70', SHADOW = '#5a6448';
const GLASS = '#b8dedc', GLASS_D = '#6b9496', METAL = '#536958', TRIM = '#938e70';
const SMOKE_PUFF = '#d8dede';

export function buildingVoxels(c, id, pose) {
  const frame = pose?.frame ?? 0;

  // Compact 1×1 structures and major multi-tile compounds are authored by the
  // re-scaled sculptors; the historical 64³ branches below keep serving the
  // 2×2 standard facilities.
  if (SMALL_BUILDING_IDS.has(id)) return smallBuildingVoxels(c, id);
  if (LARGE_BUILDING_IDS.has(id)) return largeBuildingVoxels(c, id, pose);

  if (id === 'airport') {
    // Grass perimeter apron around a flush z=0 asphalt runway slab.
    c.box(4, 22, 0, 60, 46, 1, '#586d62');
    c.box(4, 20, 0, 60, 22, 1, '#788066');
    c.box(4, 46, 0, 60, 48, 1, '#788066');
    c.box(16, 14, 0, 28, 20, 1, '#788066');
    c.box(40, 14, 0, 50, 20, 1, '#788066');
    // Threshold piano keys + dashed centreline on z=1.
    for (const y of [24, 28, 38, 42]) {
      c.box(6, y, 1, 12, y + 2, 2, '#ece7bc');
      c.box(52, y, 1, 58, y + 2, 2, '#ece7bc');
    }
    for (let x = 16; x < 50; x += 8) c.box(x, 32, 1, x + 4, 36, 2, '#ece7bc');
    for (let x = 6; x < 58; x += 6) {
      c.box(x, 22, 1, x + 2, 24, 2, '#dce3c3');
      c.box(x, 44, 1, x + 2, 46, 2, '#dce3c3');
    }
    // Arched aircraft hangar on the north-west apron.
    c.box(4, 4, 0, 28, 18, 2, SHADOW);
    c.shell(6, 4, 2, 26, 18, 12, STONE);
    c.box(8, 16, 2, 24, 18, 10, '#4c5749');            // open hangar door bay
    c.box(8, 16, 8, 24, 18, 10, TRIM);
    c.box(4, 4, 12, 28, 18, 14, ROOF);
    c.box(6, 6, 14, 26, 16, 16, ROOF);
    c.box(10, 8, 16, 22, 14, 18, ROOF_L);
    // Terminal + glass air-traffic control tower on the north-east apron.
    c.box(32, 4, 0, 58, 18, 2, SHADOW);
    c.shell(34, 6, 2, 56, 18, 10, STONE);
    for (const x of [36, 42, 48]) c.box(x, 16, 4, x + 4, 18, 8, GLASS);
    c.box(32, 4, 10, 58, 18, 12, ROOF);
    c.box(34, 6, 12, 56, 16, 14, ROOF_D);
    // Control tower shaft, flared glass cab, team roof cap.
    c.box(42, 6, 14, 50, 14, 28, '#6b7a5a');
    c.box(40, 4, 28, 52, 16, 34, GLASS);
    c.box(40, 4, 28, 42, 6, 34, METAL);
    c.box(50, 4, 28, 52, 6, 34, METAL);
    c.box(40, 14, 28, 42, 16, 34, METAL);
    c.box(50, 14, 28, 52, 16, 34, METAL);
    c.box(38, 2, 34, 54, 18, 36, ROOF);
    c.box(42, 6, 36, 50, 14, 38, ROOF_L);
    // Rotating radar dish on a mast (idle frame 1 yaws it 60°) plus a roof
    // beacon that only lights on frame 1, so the sweep reads everywhere.
    c.box(44, 8, 38, 48, 12, 44, METAL);
    c.group('dish');
    c.pivot('dish', [46, 10]);
    c.box(39, 9, 44, 53, 11, 48, '#8b96a2');
    c.box(41, 8, 48, 51, 12, 51, '#bbc4c8');
    c.box(44, 9, 51, 48, 11, 52, METAL);
    c.put(46, 10, 52, ROOF_L);
    c.group('body');
    if (frame === 1) {
      c.group('beacon');
      c.box(38, 2, 36, 40, 4, 39, '#d94c3d');
      c.put(39, 3, 39, '#ff8c3a');
      c.group('body');
    }
  } else if (id === 'port') {
    // Full 64×64 harbor water plane strictly one voxel thick at z=0.
    c.box(0, 0, 0, 64, 64, 1, '#71abb6');
    for (const [wx, wy] of [[8, 8], [28, 6], [48, 10], [18, 40], [44, 44]]) {
      c.box(wx, wy, 1, wx + 6, wy + 3, 2, '#8ec7cf');   // swell highlights
    }
    // Raised concrete quay along the north with bollards and a crane rail.
    c.box(0, 0, 1, 64, 14, 4, '#98a098');
    c.box(0, 0, 4, 64, 12, 5, '#aab59e');
    for (let x = 4; x < 64; x += 10) c.box(x, 12, 5, x + 3, 14, 8, '#646e74');
    // Warehouse with team roof + roller doors facing the water.
    c.shell(6, 2, 5, 34, 12, 16, STONE);
    c.box(4, 2, 16, 36, 12, 18, ROOF);
    c.box(6, 3, 18, 34, 11, 19, ROOF_L);
    for (const x of [10, 22]) c.box(x, 10, 5, x + 8, 12, 12, METAL);
    // Gantry crane: legs, boom over the water, cab and hanging spreader.
    c.box(40, 4, 5, 44, 8, 30, '#e5b93c');
    c.box(54, 4, 5, 58, 8, 30, '#e5b93c');
    c.box(38, 4, 30, 60, 8, 34, '#d94c3d');
    c.box(30, 5, 30, 40, 7, 33, '#d94c3d');            // boom over the quay edge
    c.box(46, 3, 34, 52, 9, 40, GLASS_D);              // operator cab
    c.box(34, 5, 26, 38, 7, 30, METAL);                // spreader
    c.box(35, 5, 30, 37, 7, 31, '#4a535c');
    // Container stacks in three team-independent freight colours.
    for (const [cx0, cy0, col] of [[8, 20, '#3b7d90'], [20, 22, '#7a3b30'], [32, 20, '#507b43'], [14, 30, '#a58a5a']]) {
      c.box(cx0, cy0, 1, cx0 + 10, cy0 + 6, 7, col);
      c.box(cx0 + 1, cy0 + 1, 7, cx0 + 9, cy0 + 5, 8, col);
      for (let x = cx0 + 1; x < cx0 + 10; x += 3) c.put(x, cy0, 7, '#2b3138');
    }
    // Floating pontoon + moored hull silhouette at the south edge.
    c.box(6, 50, 1, 58, 56, 3, '#6d7859');
    c.box(10, 56, 1, 54, 60, 4, '#324b50');
    c.box(14, 57, 4, 50, 59, 7, TEAM);
  } else if (id === 'hq') {
    // Command headquarters: plinth, colonnade, team roof, flag mast + antenna.
    c.box(0, 0, 0, 64, 64, 2, '#9aa080');
    c.box(4, 4, 2, 60, 60, 4, STONE_L);
    c.box(8, 8, 4, 56, 56, 6, STONE);
    for (let i = 12; i < 56; i += 8) {
      c.box(i, 10, 6, i + 4, 14, 24, STONE_L);          // colonnade
      c.box(i, 50, 6, i + 4, 54, 24, STONE_L);
      c.box(10, i, 6, 14, i + 4, 24, STONE_L);
      c.box(50, i, 6, 54, i + 4, 24, STONE_L);
    }
    c.shell(14, 14, 6, 50, 50, 26, WALL);
    for (let i = 18; i < 48; i += 6) {
      c.box(i, 14, 12, i + 4, 15, 20, GLASS);           // window band
      c.box(i, 49, 12, i + 4, 50, 20, GLASS);
    }
    c.box(10, 10, 26, 54, 54, 29, ROOF);
    c.box(12, 12, 29, 52, 52, 31, ROOF_D);
    c.box(16, 16, 31, 48, 48, 33, ROOF_L);
    c.box(26, 26, 33, 38, 38, 40, TEAM);                // roof insignia block
    c.box(30, 30, 40, 34, 34, 52, METAL);               // flag mast
    c.box(34, 30, 44, 44, 32, 50, TEAM);                // flag
    c.box(20, 42, 33, 22, 44, 46, '#8b96a2');           // antenna lattice
    c.put(20, 42, 46, '#d94c3d');
  } else if (id === 'base') {
    // Factory: sawtooth workshop, smokestacks (exhaust puff on idle 1),
    // team-roofed assembly hall, gantry and steel yard.
    c.box(0, 0, 0, 64, 64, 2, '#98a58c');
    c.box(2, 2, 2, 62, 62, 3, '#aab59e');
    c.shell(6, 24, 3, 40, 58, 20, STONE);               // workshop
    for (let x = 8; x < 38; x += 10) {                  // sawtooth roof glazing
      c.box(x, 24, 20, x + 8, 58, 22, ROOF_D);
      c.box(x + 6, 24, 22, x + 8, 58, 26, GLASS);
      c.box(x + 8, 24, 20, x + 10, 58, 22, ROOF);
    }
    c.box(42, 28, 3, 60, 56, 18, WALL);                 // assembly hall
    c.box(40, 26, 18, 62, 58, 21, ROOF);
    c.box(42, 28, 21, 60, 56, 23, ROOF_L);
    for (const y of [34, 44]) c.box(58, y, 8, 60, y + 6, 14, GLASS);
    // Smokestacks with banded tops; idle frame 1 grows the exhaust puff.
    c.cylZ(12, 12, 3, 34, 3.4, '#8c8670');
    c.cylZ(12, 12, 34, 36, 3.6, '#d94c3d');
    c.cylZ(22, 10, 3, 28, 2.8, '#8c8670');
    c.cylZ(22, 10, 28, 30, 3.0, '#d94c3d');
    c.cylZ(12, 12, 36, 38, 2.2, SMOKE_PUFF);            // ever-present wisps
    c.cylZ(22, 10, 30, 31, 1.8, SMOKE_PUFF);
    if (frame === 1) {
      c.group('puff');
      c.cylZ(12, 12, 36, 40, 2.6, SMOKE_PUFF);
      c.cylZ(13, 13, 40, 43, 3.2, '#e8eef0');
      c.cylZ(22, 10, 30, 33, 2.2, SMOKE_PUFF);
      c.group('body');
    }
    // Steel yard: girder stacks, gantry crane rail, team gate.
    for (let i = 0; i < 4; i++) c.box(44, 6 + i * 4, 3, 60, 8 + i * 4, 5, '#646e74');
    c.box(42, 4, 5, 44, 24, 12, '#e5b93c');
    c.box(42, 4, 12, 62, 8, 14, '#e5b93c');
    c.box(4, 60, 3, 60, 62, 6, TEAM);                   // perimeter wall band
    c.box(28, 60, 6, 36, 63, 10, TEAM);                 // gate
  } else if (id === 'city') {
    // Mixed block: two towers of different heights, shopfronts, plaza trees.
    c.box(0, 0, 0, 64, 64, 2, '#a3b47d');
    c.box(4, 4, 2, 60, 60, 3, '#cfc9b6');
    c.shell(6, 6, 3, 30, 34, 34, STONE);                // tall tower
    for (let z = 8; z < 32; z += 6) {
      for (let i = 10; i < 28; i += 6) {
        c.box(i, 6, z, i + 4, 7, z + 4, GLASS);
        c.box(i, 33, z, i + 4, 34, z + 4, GLASS);
        c.box(6, i, z, 7, i + 4, z + 4, GLASS);
      }
    }
    c.box(4, 4, 34, 32, 36, 36, ROOF);
    c.box(8, 8, 36, 28, 32, 38, ROOF_D);
    c.shell(34, 20, 3, 58, 52, 20, '#a8a48c');          // mid tower
    for (let z = 8; z < 18; z += 5) {
      c.box(36, 20, z, 56, 21, z + 3, GLASS_D);
      c.box(36, 51, z, 56, 52, z + 3, GLASS_D);
    }
    c.box(32, 18, 20, 60, 54, 22, ROOF);
    c.box(36, 22, 22, 56, 50, 24, ROOF_L);
    c.box(6, 40, 3, 30, 58, 10, WALL);                  // shopfront row
    c.box(4, 38, 10, 32, 60, 12, ROOF_D);
    for (let i = 8; i < 28; i += 6) c.box(i, 56, 4, i + 4, 58, 8, GLASS);
    for (const [tx, ty] of [[38, 8], [48, 10], [42, 14]]) {   // plaza trees
      c.cylZ(tx, ty, 3, 8, 1.2, '#8b6f42');
      c.cylZ(tx, ty, 8, 13, 3.0, '#507b43');
      c.cylZ(tx, ty, 13, 15, 1.8, '#648f48');
    }
  } else if (id === 'farm') {
    // Farmstead: furrowed fields, barn with team roof, silo, fence lines.
    c.box(0, 0, 0, 64, 64, 1, '#c4b263');
    for (let y = 2; y < 40; y += 4) c.box(2, y, 1, 40, y + 2, 2, '#a08c46');
    for (let x = 42; x < 62; x += 4) c.box(x, 2, 1, x + 2, 40, 2, '#8d7a3c');
    c.shell(42, 42, 1, 62, 60, 16, '#a85a48');          // barn
    c.box(40, 40, 16, 64, 62, 18, ROOF);
    c.box(42, 42, 18, 62, 60, 21, ROOF_L);
    c.box(48, 58, 4, 56, 60, 12, '#6e5a38');            // barn door
    c.box(50, 44, 8, 54, 48, 12, STONE_L);              // hayloft window
    c.cylZ(12, 50, 1, 22, 5.0, '#c8b084');              // grain silo
    c.cylZ(12, 50, 22, 24, 5.2, '#d8dede');
    c.cylZ(12, 50, 24, 26, 3.4, METAL);
    for (let x = 2; x < 40; x += 6) c.box(x, 40, 1, x + 1, 42, 5, '#8c6b42');  // fence
    c.box(2, 40, 4, 40, 41, 5, '#a88954');
    c.box(20, 6, 2, 26, 12, 6, '#507b43');              // orchard patch
    c.box(28, 12, 2, 34, 18, 6, '#648f48');
  } else if (id === 'mine') {
    // Rocky quarry terrace, stepped open pit, timber headframe, ore cart.
    c.box(0, 0, 0, 64, 64, 2, '#9aa080');
    c.box(4, 4, 2, 60, 60, 4, '#8b9172');
    c.box(10, 28, 2, 46, 56, 6, '#565c46');
    c.box(16, 34, 4, 40, 52, 8, '#3f4436');
    c.clearBox(20, 38, 2, 36, 50, 8);
    c.box(20, 38, 0, 36, 50, 2, '#2d3227');
    c.box(26, 16, 4, 28, 38, 6, METAL);                 // iron rails
    c.box(32, 16, 4, 34, 38, 6, METAL);
    c.box(24, 20, 6, 36, 30, 12, '#5a6350');            // ore cart
    c.box(26, 22, 12, 34, 28, 14, '#f2cc59');           // gold ore
    c.box(12, 10, 4, 16, 14, 32, '#8b6f42');            // headframe A-frame
    c.box(40, 10, 4, 46, 14, 32, '#8b6f42');
    c.box(12, 22, 4, 16, 26, 24, '#8b6f42');
    c.box(40, 22, 4, 46, 26, 24, '#8b6f42');
    c.box(12, 10, 22, 46, 26, 24, '#a88954');
    c.box(10, 8, 30, 48, 16, 34, '#c9b284');
    c.cylZ(28, 12, 34, 40, 4.2, METAL);                 // sheave wheel
    c.shell(44, 34, 4, 58, 52, 14, STONE);              // assay house
    c.box(42, 32, 14, 60, 54, 16, ROOF);
    c.box(44, 34, 16, 58, 52, 18, ROOF_L);
  } else if (id === 'depot') {
    // Logistics pad, supply warehouse, twin fuel tanks, catwalk, manifold.
    c.box(0, 0, 0, 64, 64, 2, '#98a58c');
    c.box(4, 4, 2, 60, 60, 4, '#aab59e');
    c.shell(6, 10, 4, 36, 50, 18, STONE);
    c.box(14, 48, 4, 28, 50, 14, '#6d7a62');
    for (const y of [16, 30]) c.box(6, y, 10, 8, y + 8, 16, GLASS);
    c.box(4, 8, 18, 38, 52, 20, ROOF_D);
    c.box(6, 10, 20, 36, 50, 22, ROOF);
    c.box(10, 14, 22, 32, 46, 24, ROOF_L);
    c.cylZ(49, 19, 4, 24, 7.0, '#a79771');              // twin fuel tanks
    c.cylZ(49, 19, 24, 26, 7.2, '#d9d6b4');
    c.cylZ(49, 19, 26, 28, 4.4, STONE_L);
    c.cylZ(49, 43, 4, 24, 7.0, '#a79771');
    c.cylZ(49, 43, 24, 26, 7.2, '#d9d6b4');
    c.cylZ(49, 43, 26, 28, 4.4, STONE_L);
    c.box(46, 18, 24, 52, 46, 26, METAL);               // catwalk
    c.cylX(36, 44, 19, 10, 2.0, METAL);                 // pipelines
    c.cylX(36, 44, 43, 10, 2.0, METAL);
    c.box(38, 26, 4, 44, 36, 12, ROOF);                 // valve house
    for (let x = 8; x < 56; x += 8) c.box(x, 56, 4, x + 4, 60, 6, '#646e74'); // crate row
  } else if (id === 'supply-depot') {
    // Capturable logistics pad: team-roofed supply warehouse, crate stacks,
    // fuel drum row and a stencilled ammo box. No repair or medical gear.
    c.box(0, 0, 0, 64, 64, 2, '#98a58c');
    c.box(3, 3, 2, 61, 61, 4, '#aab59e');
    c.shell(5, 6, 4, 30, 34, 16, STONE);                 // warehouse walls
    c.box(13, 34, 4, 21, 40, 12, '#525c58');            // loading door
    c.box(3, 4, 18, 33, 36, 20, ROOF_D);
    c.box(5, 6, 20, 31, 34, 22, ROOF);
    c.box(9, 10, 22, 27, 30, 24, ROOF_L);
    c.box(9, 12, 24, 25, 14, 26, TEAM);                // roof stencil band
    for (const [y, col] of [[40, '#b08a4e'], [50, '#9c7a42']]) {
      c.box(6, y, 4, 24, y + 8, 12, col);               // crate stacks
      c.box(6, y + 3, 8, 24, y + 5, 10, '#e8b838');     // stencil stripes
    }
    for (const x of [28, 36, 44]) {                     // fuel drum row
      c.cylZ(x + 3, 46, 4, 14, 3.4, '#5d7a54');
      c.cylZ(x + 3, 46, 14, 16, 2.2, '#39483c');
    }
    c.box(44, 40, 4, 58, 52, 12, '#6b7466');            // ammo box
    c.box(46, 44, 12, 56, 48, 14, '#ffd84d');
    c.box(36, 6, 4, 58, 34, 6, '#b0baa8');              // parking apron
    for (const x of [40, 50]) c.box(x, 12, 6, x + 6, 26, 8, '#8d979b'); // pallet slots
  } else if (id === 'repair-depot') {
    // Capturable vehicle bay: team-roofed garage with open bay mouth, crane
    // mast + jib, spare tyre stack and a tool chest. Vehicles-only servicing.
    c.box(0, 0, 0, 64, 64, 2, '#98a58c');
    c.box(3, 3, 2, 61, 61, 4, '#aeb8a6');
    c.shell(5, 8, 4, 38, 42, 18, '#cfd2c4');            // garage hall
    c.box(12, 8, 4, 30, 12, 16, '#232622');             // open bay mouth
    c.box(5, 6, 20, 41, 44, 22, ROOF_D);
    c.box(7, 8, 22, 39, 42, 24, ROOF);
    c.box(11, 12, 24, 35, 38, 26, ROOF_L);
    c.box(11, 16, 26, 33, 18, 28, TEAM);                // roof stencil band
    c.box(5, 42, 4, 41, 46, 8, '#e8b838');              // hazard stripe
    c.box(46, 10, 4, 50, 14, 34, METAL);                // crane mast
    c.box(46, 10, 34, 60, 14, 37, METAL);               // jib
    c.box(56, 11, 26, 58, 13, 34, '#8d979b');           // hoist cable
    c.box(54, 8, 22, 60, 16, 26, '#566066');            // lifted engine block
    c.cylZ(52, 48, 4, 12, 6.0, '#3c4046');              // spare tyre stack
    c.cylZ(52, 48, 12, 16, 4.0, '#3c4046');
    c.box(6, 50, 4, 20, 60, 12, '#a03c34');             // tool chest
    c.box(8, 52, 12, 18, 58, 14, '#8d979b');
    c.box(24, 48, 4, 44, 60, 6, '#8b9078');             // work apron
  } else if (id === 'field-hospital') {
    // Capturable medical station: white ward with red-cross roof panel,
    // lit windows, team-coloured triage tent and a stretcher pad.
    c.box(0, 0, 0, 64, 64, 2, '#98a58c');
    c.box(3, 3, 2, 61, 61, 4, '#c9ccc0');
    c.shell(5, 12, 4, 36, 40, 20, '#e8e6da');           // ward walls
    c.box(17, 12, 4, 25, 18, 14, '#525c58');            // ward door
    for (const x of [9, 29]) c.box(x, 14, 10, x + 6, 20, 16, '#f4e3a1'); // lit windows
    c.box(3, 10, 22, 43, 44, 24, '#dfe2d6');
    c.box(5, 12, 24, 41, 42, 26, '#eceade');
    c.box(19, 24, 26, 27, 30, 28, '#c0392f');           // red cross, long arm
    c.box(21, 20, 26, 25, 34, 28, '#c0392f');           // red cross, short arm
    c.box(46, 14, 4, 60, 34, 16, TEAM);                 // triage tent canopy
    c.box(48, 16, 4, 58, 32, 12, '#d8d6c8');
    c.box(52, 22, 4, 54, 26, 10, '#232622');            // tent entrance
    c.box(46, 40, 4, 60, 50, 8, '#d8d6c8');             // stretcher pad
    c.box(48, 42, 8, 58, 48, 10, '#e8e6da');
    c.box(51, 43, 10, 55, 47, 12, '#c0392f');           // stretcher cross
    c.box(6, 48, 4, 12, 60, 20, METAL);                 // oxygen tank mast
    c.cylZ(9, 52, 20, 28, 2.6, '#b8dedc');
    c.box(6, 44, 4, 40, 46, 6, '#b0baa8');              // walkway
  } else if (id === 'barracks') {
    // Barracks: dedicated infantry-training facility — two-storey troop
    // dormitory with gabled team roof & porch, quartermaster armory bunker,
    // parade ground with obstacle course & firing targets, and grounded flagpole.
    c.box(0, 0, 0, 64, 64, 2, '#98a58c');
    c.box(3, 3, 2, 61, 61, 3, '#aeb8a6');
    // Main troop dormitory block (north-west)
    c.shell(5, 6, 3, 38, 30, 19, STONE);
    for (const x of [9, 17, 25, 31]) {
      c.box(x, 6, 7, x + 4, 8, 11, GLASS);
      c.box(x, 6, 13, x + 4, 8, 17, GLASS);
      c.box(x, 28, 13, x + 4, 30, 17, GLASS);
    }
    // Covered troop entrance porch + pillars facing the parade ground
    c.box(16, 28, 3, 26, 31, 13, '#3b4238');             // double doors
    c.box(12, 30, 12, 30, 36, 14, ROOF_D);               // porch awning
    c.box(13, 34, 3, 15, 36, 12, STONE_L);               // left pillar
    c.box(27, 34, 3, 29, 36, 12, STONE_L);               // right pillar
    // Gabled team roof over dormitory
    c.box(3, 4, 19, 40, 32, 21, ROOF_D);
    c.box(5, 6, 21, 38, 30, 23, ROOF);
    c.box(8, 9, 23, 35, 27, 25, ROOF_L);
    c.box(12, 14, 25, 31, 22, 26, TEAM);                 // roof ridge crest
    // Quartermaster armory & gear store (south-west)
    c.shell(6, 40, 3, 28, 56, 14, WALL);
    c.box(5, 39, 14, 29, 57, 16, ROOF_D);
    c.box(7, 41, 16, 27, 55, 18, ROOF);
    for (const x of [10, 19]) c.box(x, 39, 3, x + 6, 41, 11, METAL); // armory roll doors
    c.box(8, 36, 3, 24, 38, 6, '#c8b084');               // sandbag revetment
    // Training yard & obstacle course (east)
    c.box(42, 8, 3, 58, 52, 4, '#8a7a64');               // dirt drill pit
    for (const y of [12, 20, 28]) {
      c.box(44, y, 4, 56, y + 2, 8, '#8c6b42');          // timber vault hurdles
      c.box(44, y, 8, 56, y + 2, 9, '#c9b284');
    }
    // Rifle range backstop berm & bullseye targets (south-east)
    c.box(42, 46, 4, 58, 52, 11, '#6b5d4f');
    for (const x of [44, 49, 54]) {
      c.box(x, 44, 5, x + 3, 46, 10, '#ece7bc');         // target board
      c.put(x + 1, 44, 7, '#d94c3d');                    // red bullseye
    }
    // Grounded compound flagpole & perimeter guard gate
    c.box(33, 33, 3, 37, 37, 6, STONE_L);                // flagpole plinth
    c.box(34, 34, 6, 36, 36, 36, METAL);                 // flagpole mast
    c.box(36, 34, 28, 44, 36, 34, TEAM);                 // garrison flag
    c.box(4, 58, 3, 60, 60, 7, WALL);                    // front perimeter wall
    c.clearBox(28, 58, 3, 38, 61, 8);                    // gate opening
    c.box(26, 57, 3, 29, 61, 11, TEAM);                  // left gatepost
    c.box(37, 57, 3, 40, 61, 11, TEAM);                  // right gatepost
  } else if (id === 'helipad') {
    // Allied Helipad: elevated reinforced-concrete rotary landing deck with
    // yellow/white 'H' landing circle, 4 corner approach beacons, aviation fuel
    // tank + hose reel on the north-west, and flight-control tower booth + windsock.
    c.box(0, 0, 0, 64, 64, 2, '#98a58c');
    c.box(3, 3, 2, 61, 61, 3, '#aeb8a6');
    // Elevated concrete landing pad (x=14..58, y=14..58, z=3..9)
    c.box(14, 14, 3, 58, 58, 8, WALL);
    c.box(16, 16, 8, 56, 56, 10, '#363c3a');              // dark non-skid tarmac deck
    // Yellow octagonal landing ring & crisp white 'H' symbol
    for (let y = 18; y < 54; y++) {
      for (let x = 18; x < 54; x++) {
        const d = Math.hypot(x - 36, y - 36);
        if (d >= 13.5 && d <= 15.5) c.put(x, y, 10, '#e8c468');
      }
    }
    c.box(29, 27, 10, 33, 45, 11, '#ece7bc');             // H left bar
    c.box(39, 27, 10, 43, 45, 11, '#ece7bc');             // H right bar
    c.box(33, 34, 10, 39, 38, 11, '#ece7bc');             // H crossbar
    // Corner approach lights & team safety curb
    c.box(14, 14, 8, 58, 16, 10, TEAM);
    c.box(14, 56, 8, 58, 58, 10, TEAM);
    for (const [bx, by] of [[16, 16], [54, 16], [16, 54], [54, 54]]) {
      c.box(bx, by, 10, bx + 2, by + 2, 13, '#5fc4e8');
    }
    // Access ramp on the south-west (x=6..14, y=30..44)
    c.ramp(6, 14, 30, 44, 3, 6, 8, STONE_L);
    // Flight-ops control booth + windsock mast on north-west (x=4..14, y=6..24)
    c.shell(4, 6, 3, 14, 24, 18, STONE);
    c.box(6, 8, 12, 14, 22, 16, GLASS);
    c.box(3, 5, 18, 15, 25, 20, ROOF_D);
    c.box(5, 7, 20, 13, 23, 22, TEAM);
    c.box(8, 8, 22, 10, 10, 36, METAL);                   // windsock pole
    c.box(10, 8, 32, 18, 11, 35, TEAM);                   // windsock cone
    c.box(14, 8, 32, 16, 11, 35, '#ece7bc');
    // Aviation JP-8 fuel tank on south-west (x=4..12, y=46..58)
    c.cylY(8, 46, 58, 7, 3.8, '#ece7bc');
    c.box(6, 50, 4, 10, 54, 12, '#d94c3d');
  } else if (id === 'power-plant') {
    // Industrial Power Plant: turbine generator hall with team roof & HV
    // insulator bushings, tall waisted hyperboloid concrete cooling tower with
    // rising steam plume, and fenced high-voltage transformer switchyard.
    c.box(0, 0, 0, 64, 64, 2, '#98a58c');
    c.box(3, 3, 2, 61, 61, 3, '#aeb8a6');
    // Main turbine hall (west, x=6..32, y=8..42, z=3..22)
    c.shell(6, 8, 3, 32, 42, 20, STONE);
    for (const y of [12, 20, 28, 34]) {
      c.box(6, y, 8, 8, y + 4, 16, GLASS);
      c.box(30, y, 8, 32, y + 4, 16, GLASS);
    }
    c.box(5, 7, 20, 33, 43, 22, ROOF_D);
    c.box(7, 9, 22, 31, 41, 24, ROOF);
    c.box(10, 12, 24, 28, 38, 26, ROOF_L);
    // Twin exhaust smokestacks on turbine hall north end
    for (const sx of [12, 22]) {
      c.cylZ(sx, 12, 24, 42, 2.8, METAL);
      c.cylZ(sx, 12, 38, 41, 3.0, TEAM);
    }
    // Hyperboloid natural-draft cooling tower (east, cx=46, cy=24, z=3..40)
    for (let z = 3; z < 40; z++) {
      const t = (z - 25) / 16;
      const rOuter = 7.4 + t * t * 3.8;
      const rInner = rOuter - 2.0;
      for (let y = 10; y < 38; y++) {
        for (let x = 32; x < 60; x++) {
          const d = Math.hypot(x - 46, y - 24);
          if (d <= rOuter && d >= rInner) {
            const col = (z >= 33 && z <= 36) ? TEAM : (z < 6 ? METAL : STONE_L);
            c.put(x, y, z, col);
          } else if (z >= 37 && d < rInner && ((x + y + z) % 2 === 0)) {
            c.put(x, y, z + 2, '#eef3f4');                // rising white steam vapor
          }
        }
      }
    }
    // High-voltage transformer switchyard (south, x=8..56, y=46..58)
    c.box(8, 46, 3, 56, 58, 5, '#7c8578');
    for (const tx of [14, 26, 38, 50]) {
      c.box(tx - 3, 49, 5, tx + 3, 55, 12, METAL);        // transformer core
      c.box(tx - 1, 50, 12, tx + 1, 54, 18, '#5fc4e8');   // glowing HV insulator coil
      c.put(tx, 52, 18, '#ffd84a');                       // arc terminal
    }
  } else if (id === 'refinery') {
    // Resource Refinery: industrial ore/crude processing plant with covered
    // dump-truck hopper bay, main smelting furnace hall, twin tall fractional
    // distillation columns with pipe bridges, spherical storage tank, and gas flare stack.
    c.box(0, 0, 0, 64, 64, 2, '#98a58c');
    c.box(3, 3, 2, 61, 61, 3, '#aeb8a6');
    // Main smelting & processing hall (north-west, x=6..34, y=6..34, z=3..22)
    c.shell(6, 6, 3, 34, 34, 20, WALL);
    c.box(5, 5, 20, 35, 35, 22, ROOF_D);
    c.box(8, 8, 22, 32, 32, 24, ROOF);
    c.box(12, 12, 24, 28, 28, 26, ROOF_L);
    // Covered ore-receiving hopper bay (south-west, x=6..30, y=36..58)
    c.box(6, 36, 3, 30, 58, 5, '#5a5348');
    c.shell(10, 40, 5, 26, 54, 11, METAL);                // ore crusher hopper
    c.box(12, 42, 11, 24, 52, 14, '#e0b84c');             // glowing raw gold/ore heap
    c.box(8, 36, 16, 28, 56, 18, TEAM);                   // canopy roof over hopper
    c.box(8, 54, 5, 11, 57, 16, METAL);                   // canopy support pillar L
    c.box(25, 54, 5, 28, 57, 16, METAL);                  // canopy support pillar R
    // Twin tall cylindrical fractional distillation towers (north-east)
    for (const [cx, cy, topZ] of [[44, 16, 40], [44, 30, 35]]) {
      c.cylZ(cx, cy, 3, topZ, 4.8, '#b8c2c8');
      c.cylZ(cx, cy, topZ - 6, topZ - 3, 5.0, TEAM);
      c.cylZ(cx, cy, 16, 18, 5.2, METAL);
    }
    // Overhead pipeline bridge linking furnace hall to distillation towers
    c.box(32, 14, 15, 44, 18, 18, METAL);
    c.box(32, 28, 15, 44, 32, 18, TEAM);
    // Pressurized spherical storage tank (south-east, cx=46, cy=48)
    for (let z = 5; z <= 21; z++) {
      const r = Math.sqrt(Math.max(0, 68 - (z - 13) ** 2));
      if (r > 1) c.cylZ(46, 48, z, z + 1, r, z >= 12 && z <= 14 ? TEAM : '#dfe6ea');
    }
    c.box(41, 43, 3, 43, 45, 9, METAL);
    c.box(49, 43, 3, 51, 45, 9, METAL);
    c.box(41, 51, 3, 43, 53, 9, METAL);
    c.box(49, 51, 3, 51, 53, 9, METAL);
    // Tall gas flare stack (x=54..57, y=10..13, z=3..46) with active flame
    c.box(54, 10, 3, 57, 13, 44, METAL);
    c.box(53, 9, 44, 58, 14, 48, '#ff7730');
    c.box(54, 10, 48, 57, 13, 52, '#ffd84a');
  } else if (id === 'radar-station') {
    // Radar Station: hardened C4I early-warning bunker, geodesic secondary
    // radome, steel lattice tower, and large rotating parabolic radar dish (`dish`).
    c.box(0, 0, 0, 64, 64, 2, '#98a58c');
    c.box(3, 3, 2, 61, 61, 3, '#aeb8a6');
    // Hardened C4I operations bunker (x=8..40, y=12..46, z=3..18)
    c.shell(8, 12, 3, 40, 46, 17, STONE);
    c.box(38, 18, 8, 41, 40, 14, GLASS);                  // angled observation windows
    c.box(7, 11, 17, 41, 47, 19, ROOF_D);
    c.box(10, 14, 19, 38, 44, 21, ROOF);
    // Secondary white geodesic satcom radome on south-east (cx=48, cy=46)
    for (let z = 3; z <= 19; z++) {
      const r = Math.sqrt(Math.max(0, 64 - (z - 9) ** 2));
      if (r > 1) c.cylZ(48, 46, z, z + 1, r, z === 4 ? TEAM : '#e8ecee');
    }
    // Backup generator & cooling unit on north-east (x=44..56, y=12..26)
    c.box(44, 12, 3, 56, 26, 12, METAL);
    c.box(46, 14, 12, 54, 24, 14, TEAM);
    // Steel lattice radar pedestal on bunker roof (x=19..29, y=24..34, z=21..31)
    c.box(19, 24, 21, 29, 34, 31, METAL);
    c.cylZ(24, 29, 31, 34, 4.2, ROOF_D);
    // Rotating primary early-warning parabolic radar dish (`dish` group)
    c.group('dish');
    c.box(21, 10, 34, 27, 48, 46, '#c8d2d6');             // wide curved radar reflector
    c.box(18, 12, 36, 21, 46, 44, METAL);                 // rear truss bracing
    c.box(22, 12, 44, 26, 46, 47, TEAM);                  // team top warning stripe
    c.box(27, 27, 38, 40, 31, 41, METAL);                 // forward feedhorn boom
    c.box(38, 26, 37, 42, 32, 42, TEAM);                  // feedhorn receiver head
    c.pivot('dish', [24, 29]);
    c.group('body');
  } else if (id === 'research-lab') {
    // Research Laboratory: player-owned high-tech R&D complex — clean white
    // modernist L-shaped laboratory wings with cyan cleanroom glazing, team
    // roof trim, and a large glowing magnetic-containment observatory dome.
    c.box(0, 0, 0, 64, 64, 2, '#98a58c');
    c.box(3, 3, 2, 61, 61, 3, '#cfd8dc');
    // North wing (x=6..56, y=6..28, z=3..20) & West wing (x=6..28, y=28..56, z=3..20)
    c.shell(6, 6, 3, 56, 28, 20, '#e6ecee');
    c.shell(6, 26, 3, 28, 56, 20, '#e6ecee');
    // Continuous cyan cleanroom ribbon windows (two tiers)
    for (const z of [7, 14]) {
      c.box(8, 27, z, 54, 29, z + 4, GLASS);
      c.box(27, 28, z, 29, 54, z + 4, GLASS);
      c.box(8, 5, z, 54, 7, z + 4, GLASS);
    }
    // Team parapet roofs + solar/cryo rooftop banks
    c.box(5, 5, 20, 57, 29, 22, TEAM);
    c.box(5, 27, 20, 29, 57, 22, TEAM);
    c.box(8, 8, 22, 54, 26, 24, ROOF_L);
    c.box(8, 30, 22, 26, 54, 24, ROOF_L);
    for (const x of [12, 24, 36, 46]) {
      c.box(x, 11, 24, x + 6, 23, 26, '#3a5a78');         // rooftop solar/sensor panels
    }
    // Centerpiece high-energy containment / observatory dome (south-east, cx=43, cy=43)
    c.cylZ(43, 43, 3, 12, 12.5, STONE_L);                 // cylindrical containment base
    c.cylZ(43, 43, 10, 12, 12.8, TEAM);                   // team containment ring
    for (let z = 12; z <= 27; z++) {
      const r = Math.sqrt(Math.max(0, 144 - (z - 12) ** 2 * 0.95));
      if (r > 1) {
        c.cylZ(43, 43, z, z + 1, r, (z % 4 === 0) ? '#5fc4e8' : GLASS);
      }
    }
    c.box(41, 30, 12, 45, 56, 28, TEAM);                  // dome meridian arch rib
    c.box(41, 41, 27, 45, 45, 38, METAL);                 // lightning/telemetry spire
    c.put(43, 43, 38, '#5fc4e8');
  } else if (id === 'pillbox') {
    // Machine-Gun Pillbox: compact octagonal ferro-concrete infantry strongpoint
    // ringed by a sandbag revetment, horizontal firing embrasures, protruding
    // twin heavy MG barrels (+X), and team recognition roof octagon.
    c.box(0, 0, 0, 64, 64, 2, '#98a58c');
    c.box(4, 4, 2, 60, 60, 3, '#8a7a64');
    // Outer sandbag revetment ring (r=18..23, z=3..8) & octagonal concrete pillbox (r<=17, z=3..18)
    for (let y = 8; y < 56; y++) {
      for (let x = 8; x < 56; x++) {
        const dx = Math.abs(x - 31.5), dy = Math.abs(y - 31.5);
        const oct = Math.max(dx, dy, (dx + dy) * 0.72);
        if (oct >= 16.5 && oct <= 21.5) {
          c.box(x, y, 3, x + 1, y + 1, ((x + y) % 3 === 0) ? 7 : 8, '#c8b084');
        } else if (oct <= 16.0) {
          c.box(x, y, 3, x + 1, y + 1, 17, '#7c8578');
          if (oct <= 14.0) c.box(x, y, 17, x + 1, y + 1, 19, '#5d6659');
          if (oct <= 10.5) c.box(x, y, 19, x + 1, y + 1, 21, TEAM);
          if (oct <= 6.5) c.box(x, y, 21, x + 1, y + 1, 22, ROOF_L);
        }
      }
    }
    // Dark recessed firing embrasure slits on front (+X) and sides (±Y)
    c.box(44, 22, 10, 49, 42, 14, '#1e2420');
    c.box(22, 14, 10, 42, 18, 14, '#1e2420');
    c.box(22, 46, 10, 42, 50, 14, '#1e2420');
    // Twin heavy machine-gun barrels protruding from the front (+X) embrasure
    c.box(45, 27, 11, 59, 30, 13, '#354d42');
    c.box(45, 34, 11, 59, 37, 13, '#354d42');
    c.box(56, 26, 10, 60, 38, 14, METAL);                 // flash-hider bar
    // Rear armored steel trench access door (-X) & roof periscope
    c.box(14, 27, 3, 18, 37, 13, METAL);
    c.cylZ(28, 32, 22, 26, 2.8, METAL);
  } else if (id === 'bunker') {
    // Reinforced Bunker: heavy rectangular ferro-concrete garrison fortification
    // with sloped buttresses, front casemate cannon & searchlight, rooftop
    // armored observation cupola, and rear blast door with sandbagged trench.
    c.box(0, 0, 0, 64, 64, 2, '#98a58c');
    c.box(3, 3, 2, 61, 61, 3, '#7c8578');
    // Massive sloped ferro-concrete casemate block (x=10..54, y=10..54, z=3..22)
    c.box(8, 8, 3, 56, 56, 10, '#5d6659');                // flared concrete skirt
    c.shell(10, 10, 10, 54, 54, 22, '#7c8578');
    // Heavy corner blast buttresses
    for (const [bx, by] of [[8, 8], [8, 48], [48, 8], [48, 48]]) {
      c.box(bx, by, 3, bx + 8, by + 8, 22, '#5d6659');
    }
    // Stepped blast-proof roof slab + team chevron markings
    c.box(10, 10, 22, 54, 54, 24, '#5d6659');
    c.box(14, 14, 24, 50, 50, 26, TEAM);
    c.box(18, 18, 26, 46, 46, 28, ROOF_L);
    // Front casemate aperture (+X) with heavy garrison gun & armored searchlight
    c.box(50, 20, 10, 56, 44, 18, '#1e2420');
    c.box(48, 29, 12, 62, 35, 16, '#354d42');             // casemate cannon barrel
    c.box(58, 28, 11, 63, 36, 17, METAL);                 // muzzle brake
    c.box(52, 12, 22, 57, 20, 28, METAL);                 // corner searchlight housing
    c.box(55, 13, 23, 58, 19, 27, GLASS);
    // Rooftop armored observation cupola & comms whip antenna
    c.cylZ(28, 32, 28, 33, 5.5, METAL);
    c.box(31, 28, 29, 35, 36, 32, GLASS);
    c.box(18, 20, 28, 20, 22, 42, METAL);
    // Rear recessed blast door (-X)
    c.box(6, 26, 3, 11, 38, 16, METAL);
  } else if (id === 'at-turret') {
    // Anti-Tank Turret: sunken concrete octagonal gun pit with hazard stripes,
    // armored turret ring, low-profile sloped tank-hunter turret in team colour,
    // and extra-long high-velocity 120mm anti-tank cannon barrel (+X).
    c.box(0, 0, 0, 64, 64, 2, '#98a58c');
    c.box(4, 4, 2, 60, 60, 3, '#aeb8a6');
    // Octagonal reinforced concrete gun emplacement base (z=3..12)
    c.box(10, 10, 3, 54, 54, 11, WALL);
    c.box(12, 12, 11, 52, 52, 13, STONE_L);
    c.box(10, 10, 9, 14, 54, 12, '#e5b93c');              // rear hazard stripe
    // Rear external ammunition ready-racks (x=6..12, y=18..46)
    c.box(6, 18, 3, 12, 28, 11, METAL);
    c.box(6, 36, 3, 12, 46, 11, METAL);
    // Heavy turret barbette ring (cx=30, cy=32, z=13..17)
    c.cylZ(30, 32, 13, 17, 13.5, METAL);
    // Sloped anti-tank turret house (x=16..44, y=19..45, z=17..28)
    c.shell(16, 19, 17, 44, 45, 26, TEAM);
    c.box(18, 21, 26, 40, 43, 28, ROOF_L);
    c.box(24, 16, 20, 34, 48, 25, METAL);                 // stereoscopic rangefinder ears
    c.box(33, 16, 21, 35, 19, 24, GLASS);
    c.box(33, 45, 21, 35, 48, 24, GLASS);
    // Cast armor mantlet + extra-long HV anti-tank gun barrel (+X)
    c.box(40, 26, 18, 48, 38, 26, METAL);
    c.cylX(44, 63, 32, 22, 2.8, '#354d42');
    c.box(52, 29, 19, 56, 35, 25, METAL);                 // bore evacuator
    c.box(59, 28, 18, 63, 36, 26, ROOF_D);                // heavy double-baffle muzzle brake
  } else if (id === 'sam-site') {
    // SAM Missile Site: concrete blast pad with flame trenches, corner fire-
    // control radar van, central rotatable pedestal, and 4-rail elevated launcher
    // holding 4 white/red-tipped surface-to-air missiles angled skyward (+X/+Z).
    c.box(0, 0, 0, 64, 64, 2, '#98a58c');
    c.box(4, 4, 2, 60, 60, 3, '#aeb8a6');
    c.box(8, 8, 3, 56, 56, 7, '#7c8578');                 // blast-deflector concrete pad
    c.box(14, 14, 7, 50, 50, 8, '#4a5248');               // scorched blast apron
    // Corner fire-control radar bunker & tracking dish (north-west, x=6..20, y=6..20)
    c.shell(6, 6, 7, 20, 20, 17, STONE);
    c.box(6, 6, 17, 20, 20, 19, TEAM);
    c.box(11, 11, 19, 15, 15, 26, METAL);
    c.box(13, 8, 24, 17, 18, 31, '#cfd8dc');              // tracking radar dish
    // Central rotatable launcher turntable (cx=34, cy=34, z=8..18)
    c.cylZ(34, 34, 8, 15, 10.5, METAL);
    c.box(26, 22, 15, 42, 46, 21, TEAM);                  // launcher trunnion beam
    // Four angled SAM launch rails + 4 white/red-cone missiles pointing skyward (+X/+Z)
    for (const my of [20, 28, 38, 46]) {
      for (let s = 0; s < 14; s++) {
        const mx = 22 + s * 2;
        const mz = 18 + Math.floor(s * 1.35);
        c.box(mx, my, mz - 2, mx + 3, my + 3, mz, METAL); // launch rail
        const tip = s >= 11 ? '#d94c3d' : s <= 2 ? TEAM : '#ece7bc';
        c.box(mx + 2, my, mz, mx + 5, my + 3, mz + 3, tip); // SAM body & red warhead cone
      }
    }
  } else if (id === 'flak-cannon') {
    // Flak Cannon: circular sandbagged & concrete AA gun pit with ready ammo
    // crates, cruciform outrigger mount, armored gun shield in team colour, and
    // quad high-angle 40mm/88mm anti-aircraft autocannon barrels elevated at 45°.
    c.box(0, 0, 0, 64, 64, 2, '#98a58c');
    c.box(4, 4, 2, 60, 60, 3, '#8a7a64');
    // Circular concrete & sandbagged AA gun pit wall (r=19..24, z=3..11)
    for (let y = 6; y < 58; y++) {
      for (let x = 6; x < 58; x++) {
        const d = Math.hypot(x - 31.5, y - 31.5);
        if (d >= 19.0 && d <= 24.0) {
          c.box(x, y, 3, x + 1, y + 1, d > 21.5 ? 8 : 11, d > 21.5 ? '#c8b084' : WALL);
        } else if (d < 19.0) {
          c.put(x, y, 3, '#5d6659');
        }
      }
    }
    // Ready ammo crates stacked inside the rear (-X) of the pit
    c.box(13, 22, 4, 20, 30, 10, '#a68246');
    c.box(13, 34, 4, 20, 42, 10, '#a68246');
    // Central cruciform AA outrigger pedestal & rotating turret shield
    c.box(20, 29, 4, 44, 35, 8, METAL);
    c.box(29, 20, 4, 35, 44, 8, METAL);
    c.cylZ(32, 32, 8, 15, 8.5, METAL);
    c.box(24, 20, 15, 38, 44, 26, TEAM);                  // armored AA gun shield
    c.box(26, 22, 26, 36, 42, 28, ROOF_L);
    c.box(28, 28, 28, 35, 36, 32, GLASS);                 // optical sky-director sight
    // Quad high-elevation flak barrels pointing skyward (+X/+Z)
    for (const gy of [22, 27, 35, 40]) {
      for (let s = 0; s < 13; s++) {
        const bx = 34 + s * 2;
        const bz = 20 + Math.floor(s * 1.45);
        c.box(bx, gy, bz, bx + 3, gy + 2, bz + 3, s === 12 ? METAL : '#354d42');
      }
    }
  } else if (id === 'coastal-battery') {
    // Coastal Defense Gun: massive tiered ferro-concrete shore casemate with
    // thick overhanging blast visor, rooftop optical rangefinder director tower,
    // and twin long naval-caliber 380mm guns protruding toward +X.
    c.box(0, 0, 0, 64, 64, 2, '#98a58c');
    c.box(2, 2, 2, 62, 62, 4, '#6b7368');
    // Massive sloped concrete shore-battery casemate (x=6..50, y=6..58, z=4..26)
    c.box(6, 6, 4, 52, 58, 12, '#5d6659');
    c.shell(8, 8, 12, 50, 56, 25, '#7c8578');
    // Thick overhanging front blast visor (x=36..54, y=8..56, z=23..28)
    c.box(10, 8, 24, 54, 56, 28, '#5d6659');
    c.box(14, 12, 28, 48, 52, 30, TEAM);
    // Rooftop armored fire-control rangefinder tower (x=18..34, y=20..44, z=30..40)
    c.shell(18, 20, 30, 34, 44, 38, STONE);
    c.box(32, 22, 33, 35, 42, 36, GLASS);                 // sea-observation slit
    c.box(22, 10, 34, 28, 54, 38, METAL);                 // wide stereoscopic rangefinder arms
    c.box(26, 10, 35, 29, 13, 37, GLASS);
    c.box(26, 51, 35, 29, 54, 37, GLASS);
    c.box(17, 19, 38, 35, 45, 40, ROOF_D);
    c.box(20, 22, 40, 32, 42, 42, TEAM);
    // Heavy armored gun barbette & twin long naval-caliber coastal guns (+X)
    c.box(38, 16, 12, 52, 48, 23, METAL);
    for (const gy of [21, 37]) {
      c.cylX(44, 63, gy + 3, 17, 3.2, '#354d42');
      c.box(48, gy, 14, 54, gy + 6, 20, TEAM);            // recoil jacket
      c.box(59, gy, 14, 63, gy + 6, 20, METAL);           // coastal muzzle ring
    }
  } else if (id === 'artillery-emplacement') {
    // Long-Range Artillery Emplacement: fortified earthwork & concrete gun pit,
    // rear recessed ammunition bunker with brass shells, heavy turntable carriage
    // with recoil spades, and a huge long-range siege howitzer barrel (+X/+Z).
    c.box(0, 0, 0, 64, 64, 2, '#98a58c');
    c.box(3, 3, 2, 61, 61, 3, '#8a7a64');
    // Horseshoe concrete & earthwork revetment wall on north/south/east
    for (let y = 6; y < 58; y++) {
      for (let x = 14; x < 58; x++) {
        const d = Math.hypot(x - 34, y - 32);
        if (d >= 18.5 && d <= 23.5 && x < 52) {
          c.box(x, y, 3, x + 1, y + 1, 11, WALL);
          c.put(x, y, 11, TEAM);
        } else if (d < 18.5) {
          c.put(x, y, 3, '#6b7368');
        }
      }
    }
    // Rear recessed ammunition bunker (-X, x=4..18, y=16..48, z=3..15)
    c.shell(4, 16, 3, 18, 48, 14, STONE);
    c.box(3, 15, 14, 19, 49, 16, TEAM);
    c.box(6, 18, 16, 16, 46, 18, ROOF_L);
    // Visible brass heavy artillery shells on loading rack (x=18..22, y=20..28)
    for (const sy of [20, 23, 26]) c.box(18, sy, 4, 24, sy + 2, 7, '#e0b84c');
    // Heavy turntable carriage, recoil spades, and trunnion block
    c.cylZ(34, 32, 4, 10, 11.5, METAL);
    c.box(22, 22, 4, 28, 27, 9, ROOF_D);                  // left recoil spade
    c.box(22, 37, 4, 28, 42, 9, ROOF_D);                  // right recoil spade
    c.box(26, 24, 10, 42, 40, 20, TEAM);                  // armored gun carriage
    c.box(28, 26, 20, 40, 38, 23, METAL);                 // hydro-pneumatic recoil cradle
    // Massive long-range siege howitzer barrel elevated at 35° (+X/+Z)
    for (let s = 0; s < 14; s++) {
      const bx = 34 + s * 2;
      const bz = 18 + Math.floor(s * 1.4);
      c.cylX(bx, bx + 3, 32, bz, s < 5 ? 3.8 : 2.8, s >= 12 ? ROOF_D : '#354d42');
    }
    c.box(58, 28, 35, 63, 36, 41, METAL);                 // multi-baffle siege muzzle brake
  } else if (id === 'guard-tower') {
    // Guard Tower: tall perimeter watchtower on cross-braced steel/concrete
    // legs, ground-level sentry checkpoint booth & barrier gate, overhanging
    // armored observation cab with wrap-around windows, searchlight & pintle MG.
    c.box(0, 0, 0, 64, 64, 2, '#98a58c');
    c.box(4, 4, 2, 60, 60, 3, '#aeb8a6');
    c.box(12, 12, 3, 44, 44, 6, STONE);                   // tower foundation plinth
    // Ground-level sentry booth & striped security barrier arm (south-east)
    c.shell(44, 38, 3, 56, 52, 14, STONE);
    c.box(43, 37, 14, 57, 53, 16, TEAM);
    c.box(44, 36, 7, 54, 39, 12, GLASS);
    for (let x = 26; x < 44; x += 2) {
      c.box(x, 54, 6, x + 2, 56, 8, (x % 4 === 0) ? '#d94c3d' : '#ece7bc');
    }
    // Four tall cross-braced watchtower legs (x=16..40, y=16..40, z=6..36)
    for (const lx of [16, 36]) {
      for (const ly of [16, 36]) {
        c.box(lx, ly, 6, lx + 4, ly + 4, 36, METAL);
      }
    }
    for (const bz of [14, 22, 30]) {                      // horizontal & X-girder ties
      c.box(16, 16, bz, 40, 40, bz + 2, '#58646a');
      c.clearBox(19, 19, bz, 37, 37, bz + 2);
    }
    c.box(26, 17, 6, 30, 19, 36, '#8c6b42');              // access ladder up north face
    // Overhanging armored observation cab & catwalk balcony (z=36..50)
    c.box(12, 12, 36, 46, 44, 39, '#5d6659');             // catwalk deck
    c.shell(12, 12, 39, 46, 44, 42, TEAM);                // team balcony parapet
    c.shell(16, 16, 39, 40, 40, 49, STONE);               // enclosed guard cab
    c.box(15, 15, 43, 41, 41, 47, GLASS);                 // 360-degree observation glazing
    c.clearBox(18, 18, 43, 38, 38, 47);
    // Peaked watchtower roof + antenna spire (z=49..60)
    c.box(14, 14, 49, 42, 42, 51, ROOF_D);
    c.box(17, 17, 51, 39, 39, 53, ROOF);
    c.box(21, 21, 53, 35, 35, 55, ROOF_L);
    c.box(27, 27, 55, 29, 29, 62, METAL);
    // Balcony xenon searchlight & heavy pintle MG on the east (+X) rail
    c.box(44, 20, 42, 50, 26, 47, METAL);                 // searchlight drum
    c.box(48, 21, 43, 51, 25, 46, '#5fc4e8');             // xenon lens
    c.box(44, 32, 42, 56, 35, 45, '#354d42');             // heavy pintle MG barrel
  } else if (id === 'landmine') {
    // Low-profile military anti-tank/anti-personnel landmine emplacement:
    // disturbed soil rim, beveled olive-steel cylindrical casing with radial
    // strengthening ribs, team-coloured stencil sectors, raised pressure plate
    // with 4-prong spider fuze, and a grounded asymmetric tripwire stake.
    const SOIL = '#4a4438', SOIL_D = '#353128', CASING = '#4a5245', CASING_L = '#5e6858';
    const RIB = '#6b7566', PLATE = '#8b96a2', FUZE = '#2b3128', PIN = '#d94b38';
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const dx = x - 31.5, dy = y - 31.5;
        const d = Math.hypot(dx, dy);
        // Disturbed earth & gravel burial ring at z=0
        if (d <= 18.0) {
          c.put(x, y, 0, ((x + y) % 3 === 0) ? SOIL : SOIL_D);
        }
        // Main heavy steel mine body (z=1..2)
        if (d <= 14.8) {
          c.put(x, y, 1, CASING);
          c.put(x, y, 2, d > 13.2 ? SOIL_D : CASING);
        }
        // Beveled upper casing shoulder (z=3..4) with radial ribs & team stencil
        if (d <= 12.6) {
          const onAxisRib = Math.abs(dx) <= 1.2 || Math.abs(dy) <= 1.2;
          const onDiagRib = Math.abs(Math.abs(dx) - Math.abs(dy)) <= 1.1;
          const teamArc = d >= 7.8 && d <= 11.4 && ((dx > 2 && dy > 2) || (dx < -2 && dy < -2));
          const col = teamArc ? (d > 9.8 ? TEAM : ROOF_L)
            : (onAxisRib || onDiagRib) ? RIB : CASING_L;
          c.put(x, y, 3, col);
          if (d <= 11.2) c.put(x, y, 4, col);
        }
        // Central pressure plate disc (z=5..6)
        if (d <= 6.8) {
          c.put(x, y, 5, d > 5.4 ? FUZE : PLATE);
          c.put(x, y, 6, d > 5.2 ? FUZE : PLATE);
        }
      }
    }
    // 4-prong spider pressure fuze cap & central red arming pin (z=7..8)
    c.box(27, 30, 7, 37, 34, 8, FUZE);
    c.box(30, 27, 7, 34, 37, 8, FUZE);
    c.box(30, 30, 7, 34, 34, 9, PIN);
    // Grounded asymmetric side fuze lug & low tripwire stake (ensures all 4 facings differ)
    c.box(44, 29, 1, 49, 35, 5, CASING);                 // side secondary fuze well
    c.box(46, 30, 5, 48, 34, 7, TEAM);                   // arming tag
    c.box(52, 20, 0, 55, 23, 6, '#6b5a3a');              // grounded wooden tripwire stake
    c.box(51, 19, 6, 56, 24, 8, TEAM);                   // stake warning band
    for (let i = 0; i < 7; i++) {
      c.put(46 + i, 29 - i, 3, RIB);                     // taut low tripwire
    }
  }
  c.group('body');
}

/**
 * Architectural palettes and structural silhouettes for the 4 playable factions.
 * Note: Owner-0 accent colors (`TEAM` = `#df794b`, `ROOF_L` = `#ffc68b`, `ROOF_D` = `#934b32`)
 * remain on team roof crests, banners, and recognition stripes so `bake.mjs` still produces
 * all 7 owner variants (`0..5` and `n`) cleanly separated from faction architecture.
 */
export const BUILDING_ARMY_STYLES = {
  allies: {
    hull: '#7d8a5a',
    hullLight: '#a6b27a',
    hullDark: '#5a6642',
    wall: '#c6d0d8',
    stone: '#abb6c0',
    stoneLight: '#dde5ec',
    concrete: '#8a98a4',
    concreteDark: '#64727e',
    turf: '#8da47c',
    pad: '#a8b4bc',
    trim: '#3b6ea5',
    trimLight: '#dfe6ea',
    energy: '#5fc4e8',
  },
  soviets: {
    hull: '#7a3b30',
    hullLight: '#a85a48',
    hullDark: '#4d2520',
    wall: '#8c8078',
    stone: '#72665e',
    stoneLight: '#a69a90',
    concrete: '#6c625c',
    concreteDark: '#4c4440',
    turf: '#7e8668',
    pad: '#746c66',
    trim: '#e0b94a',
    trimLight: '#c84434',
    energy: '#ff7730',
  },
  empire: {
    hull: '#cfc9b6',
    hullLight: '#ece8d8',
    hullDark: '#8c8670',
    wall: '#e6e2d2',
    stone: '#d0cab6',
    stoneLight: '#f4f0e4',
    concrete: '#b8b29e',
    concreteDark: '#86806c',
    turf: '#9cb084',
    pad: '#d8d2c0',
    trim: '#2f4a7a',
    trimLight: '#d4a238',
    energy: '#5fc4e8',
  },
  legion: {
    hull: '#a58a5a',
    hullLight: '#c4aa78',
    hullDark: '#6e5a38',
    wall: '#a89272',
    stone: '#8c785a',
    stoneLight: '#c2ae8c',
    concrete: '#7a6a52',
    concreteDark: '#564a38',
    turf: '#a49468',
    pad: '#8e7e64',
    trim: '#2b2b2b',
    trimLight: '#8c6b42',
    energy: '#ffd84a',
  },
};

/**
 * Applies faction-specific architectural palette and bespoke 3D structural geometry
 * to any of the 26 buildings/structures for `allies`, `soviets`, `empire`, or `legion`.
 */
export function applyBuildingArmyDelta(c, id, armyId) {
  const S = BUILDING_ARMY_STYLES[armyId];
  if (!S) return;
  c.group('body');
  if (SMALL_BUILDING_IDS.has(id)) return applySmallBuildingArmyDelta(c, id, armyId, S);
  if (LARGE_BUILDING_IDS.has(id)) return applyLargeBuildingArmyDelta(c, id, armyId, S);

  // 1. Recolor base structural masonry, concrete, pads, and turf while preserving TEAM accents
  if (id === 'landmine') {
    c.recolor({
      '#4a5245': S.hullDark,
      '#5e6858': S.hull,
      '#6b7566': S.trim,
      '#8b96a2': S.trimLight,
    });
  } else {
    c.recolor({
      [STONE]: S.stone,
      [STONE_L]: S.stoneLight,
      [WALL]: S.wall,
      '#98a58c': S.turf,
      '#a3b47d': S.turf,
      '#aeb8a6': S.pad,
      '#aab59e': S.pad,
      '#cfc9b6': S.pad,
      '#7c8578': S.concrete,
      '#5d6659': S.concreteDark,
      '#6b7368': S.concreteDark,
    });
  }

  // 2. Helper primitives for faction architectural motifs
  const addRadome = (cx, cy, z0, r) => {
    for (let z = 0; z <= r; z++) {
      const rz = Math.sqrt(Math.max(0, r * r - z * z));
      if (rz >= 1) {
        c.cylZ(cx, cy, z0 + z, z0 + z + 1, rz, z === 0 ? S.trim : S.trimLight);
      }
    }
  };
  const addPagodaCrown = (x0, y0, x1, y1, z0) => {
    c.box(x0 - 2, y0 - 2, z0, x1 + 2, y1 + 2, z0 + 2, S.trim);
    for (const [cx, cy] of [[x0 - 2, y0 - 2], [x1, y0 - 2], [x0 - 2, y1], [x1, y1]]) {
      c.box(cx, cy, z0 + 2, cx + 2, cy + 2, z0 + 4, S.trimLight);
    }
    c.box(x0 + 2, y0 + 2, z0 + 2, x1 - 2, y1 - 2, z0 + 4, S.stoneLight);
  };
  const addSovietSpire = (cx, cy, z0, h) => {
    c.box(cx - 4, cy - 4, z0, cx + 4, cy + 4, z0 + 4, S.hullDark);
    c.box(cx - 3, cy - 3, z0 + 4, cx + 3, cy + 3, z0 + 8, S.hull);
    c.box(cx - 1, cy - 1, z0 + 8, cx + 1, cy + 1, z0 + h, S.trim);
    c.box(cx - 2, cy - 2, z0 + h - 3, cx + 2, cy + 2, z0 + h - 1, S.trimLight);
  };
  const addSalvageCrane = (x0, y0, z0, h) => {
    c.box(x0, y0, z0, x0 + 3, y0 + 3, z0 + h, S.trim);
    c.box(x0, y0, z0 + h - 2, x0 + 10, y0 + 3, z0 + h, S.trimLight);
    c.box(x0 + 8, y0 + 1, z0 + h - 7, x0 + 10, y0 + 2, z0 + h - 2, METAL);
  };

  // 3. Per-building bespoke architectural geometry for each faction
  if (id === 'hq') {
    if (armyId === 'allies') {
      // Allied C4I Command Center: twin white geodesic SATCOM radomes on roof deck, blue-steel penthouse & solar wings
      addRadome(20, 20, 33, 5);
      addRadome(44, 20, 33, 5);
      c.box(22, 38, 33, 42, 46, 37, S.trim);
      c.box(24, 39, 34, 40, 47, 36, GLASS);
      c.box(16, 48, 20, 48, 55, 24, S.trim);
    } else if (armyId === 'soviets') {
      // Soviet Supreme Politburo Citadel: twin brutalist red-armor flanking towers, smokestacks & Star spire
      c.box(8, 12, 20, 18, 34, 34, S.hull);
      c.box(46, 12, 20, 56, 34, 34, S.hull);
      c.box(10, 14, 34, 16, 32, 37, S.trim);
      c.box(48, 14, 34, 54, 32, 37, S.trim);
      addSovietSpire(32, 25, 44, 16);
    } else if (armyId === 'empire') {
      // Empire Shogunate Citadel: multi-tiered upturned cobalt pagoda roofs, torii gate & cyan crystal spire
      addPagodaCrown(18, 14, 46, 36, 27);
      addPagodaCrown(22, 18, 42, 32, 41);
      c.box(30, 23, 45, 34, 27, 58, S.energy);
      c.box(20, 54, 3, 23, 57, 16, S.trim);
      c.box(41, 54, 3, 44, 57, 16, S.trim);
      c.box(18, 53, 15, 46, 58, 18, S.trim);
    } else if (armyId === 'legion') {
      // Legion Warlord Compound: rooftop salvage crane, external fuel drums, corrugated awnings & sandbag bastion
      addSalvageCrane(44, 16, 20, 18);
      c.cylZ(14, 22, 20, 29, 4.0, S.trimLight);
      c.box(6, 42, 3, 20, 48, 8, '#c8b084');
      c.box(44, 42, 3, 58, 48, 8, '#c8b084');
      c.box(22, 18, 42, 42, 32, 46, S.hullDark);
    }
  } else if (id === 'base') {
    if (armyId === 'allies') {
      // Allied War Factory: angled modular blue-steel sawtooth skylights, robotic gantry & SATCOM dome
      for (const sx of [10, 20, 30]) {
        c.box(sx, 16, 26, sx + 6, 50, 30, S.trim);
        c.box(sx + 2, 18, 28, sx + 6, 48, 31, GLASS);
      }
      addRadome(50, 46, 4, 6);
    } else if (armyId === 'soviets') {
      // Soviet Heavy Tank Plant: massive twin blast-furnace cupolas, heavy red/gold gantry crane & concrete buttresses
      c.cylZ(32, 12, 22, 38, 3.6, S.hullDark);
      c.cylZ(32, 12, 34, 37, 3.8, S.trim);
      c.box(40, 4, 14, 62, 26, 18, S.hull);
      c.box(42, 6, 18, 60, 10, 21, S.trim);
      for (const by of [20, 34, 48]) c.box(3, by, 3, 7, by + 6, 20, S.hullDark);
    } else if (armyId === 'empire') {
      // Empire Mecha Foundry: upturned angular roof wings, glowing cyan plasma conduits & precision laser gantry
      addPagodaCrown(6, 14, 40, 54, 26);
      c.box(20, 16, 28, 26, 52, 32, S.energy);
      c.box(42, 6, 14, 60, 24, 18, S.trim);
    } else if (armyId === 'legion') {
      // Legion Salvage Foundry: high A-frame scrap hoist, bolted corrugated roof plates & stacked oil drums
      addSalvageCrane(44, 28, 3, 24);
      c.box(8, 18, 26, 24, 36, 29, S.hullDark);
      c.box(22, 34, 26, 38, 52, 28, S.trimLight);
      for (const dy of [30, 38, 46]) c.cylZ(54, dy, 3, 11, 3.2, S.hullDark);
    }
  } else if (id === 'barracks') {
    if (armyId === 'allies') {
      // Allied Infantry Academy: geodesic C3 dome on armory, covered blue-steel rifle canopy & comms array
      addRadome(17, 48, 18, 5);
      c.box(42, 42, 11, 58, 52, 15, S.trim);
      c.box(8, 10, 25, 34, 26, 28, S.hull);
    } else if (armyId === 'soviets') {
      // Soviet Red Army Commissariat: corner concrete watch-bastion, parade-ground obelisk & heavy bunker roof
      c.box(5, 5, 19, 17, 17, 32, S.hull);
      c.box(7, 7, 32, 15, 15, 35, S.trim);
      addSovietSpire(50, 36, 4, 18);
      c.box(6, 40, 18, 28, 56, 21, S.hullDark);
    } else if (armyId === 'empire') {
      // Empire Imperial Dojo: upturned pagoda dormitory roof, ceremonial torii entrance & cyan holo-targets
      addPagodaCrown(5, 6, 38, 30, 24);
      c.box(25, 56, 11, 41, 61, 15, S.trim);
      for (const x of [44, 49, 54]) c.box(x, 44, 5, x + 3, 46, 11, S.energy);
    } else if (armyId === 'legion') {
      // Legion Mercenary Camp: rooftop sniper crow's nest, corrugated scrap roof & tire-wall firing barriers
      c.box(8, 8, 25, 18, 18, 34, S.trimLight);
      c.box(7, 7, 34, 19, 19, 36, S.hull);
      addSalvageCrane(6, 42, 18, 12);
      for (const y of [12, 20, 28]) c.box(44, y, 4, 56, y + 3, 10, S.trim);
    }
  } else if (id === 'airport') {
    if (armyId === 'allies') {
      // Allied Airbase: white geodesic weather radome on hangar, blue-tinted ATC crown & twin approach beacons
      addRadome(42, 46, 22, 5);
      c.box(6, 6, 30, 22, 22, 33, S.trim);
      c.box(28, 36, 22, 56, 56, 24, S.hull);
    } else if (armyId === 'soviets') {
      // Soviet Air Regiment Base: heavy reinforced arched concrete shelter ribs, tall red/gold radio mast & fuel tanks
      for (const hx of [28, 38, 48]) c.box(hx, 32, 3, hx + 4, 60, 24, S.hull);
      c.box(20, 6, 3, 26, 12, 34, S.hullDark);
      c.box(21, 7, 34, 25, 11, 42, S.trim);
    } else if (armyId === 'empire') {
      // Empire Sky-Wing Airfield: upturned pagoda ATC tower crown, angular wing-hangar fins & cyan runway guide strips
      addPagodaCrown(6, 6, 22, 22, 30);
      c.box(26, 32, 20, 30, 60, 27, S.trim);
      c.box(54, 32, 20, 58, 60, 27, S.trim);
      c.box(6, 24, 3, 60, 26, 4, S.energy);
    } else if (armyId === 'legion') {
      // Legion Airstrip: salvage derrick crane next to hangar, corrugated metal patch roof & external fuel bladder
      addSalvageCrane(24, 34, 3, 24);
      c.box(30, 38, 22, 52, 54, 25, S.trimLight);
      c.cylX(30, 48, 8, 7, 4.0, S.hullDark);
    }
  } else if (id === 'helipad') {
    if (armyId === 'allies') {
      // Allied Rotary Pad: geodesic nose-radome on flight booth, blue safety deck trim & twin JP-8 spheres
      addRadome(9, 15, 22, 4);
      c.box(14, 14, 8, 16, 58, 11, S.trim);
      c.box(56, 14, 8, 58, 58, 11, S.trim);
    } else if (armyId === 'soviets') {
      // Soviet Hind Pad: thick concrete blast revetment walls on north/east, heavy fuel cistern & red-star pad corners
      c.box(14, 12, 3, 58, 16, 15, S.hull);
      c.box(56, 12, 3, 60, 58, 15, S.hull);
      c.cylZ(8, 52, 3, 18, 4.5, S.hullDark);
    } else if (armyId === 'empire') {
      // Empire VTOL Sky-Pad: pagoda-crowned flight tower, corner cyan levitation beacons & cobalt deck ring
      addPagodaCrown(4, 6, 14, 24, 20);
      for (const [bx, by] of [[15, 15], [53, 15], [15, 53], [53, 53]]) {
        c.box(bx, by, 10, bx + 4, by + 4, 17, S.energy);
      }
    } else if (armyId === 'legion') {
      // Legion Chopper Pad: salvage maintenance gantry on pad edge, sandbag revetment & clustered fuel drums
      addSalvageCrane(14, 14, 10, 16);
      c.box(14, 56, 8, 56, 60, 14, '#c8b084');
      for (const fy of [44, 50, 56]) c.cylZ(8, fy, 3, 12, 3.0, S.trimLight);
    }
  } else if (id === 'port') {
    if (armyId === 'allies') {
      // Allied Naval Dockyard: modern harbor-control radome tower, blue-steel hammerhead crane & covered slipway
      addRadome(14, 14, 22, 5);
      c.box(44, 22, 28, 58, 34, 33, S.trim);
      c.box(6, 6, 18, 24, 24, 22, S.hull);
    } else if (armyId === 'soviets') {
      // Soviet Submarine/Naval Base: heavy concrete U-boat pen casemate roof over slipway, twin smokestacks & red crane
      c.box(4, 4, 18, 28, 28, 26, S.hull);
      c.cylZ(8, 8, 26, 38, 2.8, S.hullDark);
      c.box(44, 22, 28, 58, 34, 34, S.trim);
    } else if (armyId === 'empire') {
      // Empire Imperial Fleet Dock: pagoda harbor master tower, cobalt crane boom & cyan drydock beacon pylons
      addPagodaCrown(6, 6, 24, 24, 20);
      c.box(34, 50, 5, 38, 56, 22, S.energy);
      c.box(54, 50, 5, 58, 56, 22, S.energy);
    } else if (armyId === 'legion') {
      // Legion Corsair Quay: twin salvage cargo derricks, stacked shipping containers & timber pier bracing
      addSalvageCrane(8, 8, 18, 16);
      c.box(6, 26, 5, 22, 36, 13, S.hull);
      c.box(8, 28, 13, 20, 34, 19, S.trimLight);
    }
  } else if (id === 'city') {
    if (armyId === 'allies') {
      // Allied Metropolis: rooftop corporate helipad & SATCOM spire on main high-rise, blue-glass skybridge
      c.box(8, 8, 38, 28, 32, 41, S.trim);
      addRadome(18, 20, 41, 4);
      c.box(28, 24, 14, 36, 32, 18, GLASS);
    } else if (armyId === 'soviets') {
      // Soviet State Direktorat: monumental Seven-Sisters stepped tower spire & red-gold triumphal arch
      c.box(10, 10, 38, 26, 30, 44, S.hull);
      addSovietSpire(18, 20, 44, 14);
      c.box(36, 22, 24, 56, 50, 28, S.hullDark);
    } else if (armyId === 'empire') {
      // Empire Neo-Capital: multi-tiered pagoda crowns on both towers & glowing cyan vertical holo-signs
      addPagodaCrown(6, 6, 30, 34, 36);
      addPagodaCrown(34, 20, 58, 52, 22);
      c.box(29, 16, 10, 32, 22, 32, S.energy);
    } else if (armyId === 'legion') {
      // Legion Shanty-Citadel: rooftop wooden water tank, steel truss sky-catwalk & sandbagged street checkpoint
      c.cylZ(46, 36, 24, 34, 5.0, S.trimLight);
      c.box(28, 24, 16, 36, 30, 19, S.trim);
      addSalvageCrane(10, 10, 38, 12);
    }
  } else if (id === 'power-plant') {
    if (armyId === 'allies') {
      // Allied Clean-Grid Plant: domed containment cap on turbine hall, blue HV capacitor banks & solar roof
      addRadome(19, 25, 26, 6);
      c.box(8, 10, 24, 30, 40, 26, S.trim);
    } else if (armyId === 'soviets') {
      // Soviet Heavy Coal/Nuclear Plant: third central smokestack, massive red-brick boiler annex & gold HV busbars
      c.cylZ(17, 26, 26, 46, 3.2, S.hull);
      c.cylZ(17, 26, 42, 45, 3.5, S.trim);
      c.box(4, 6, 3, 10, 44, 22, S.hullDark);
    } else if (armyId === 'empire') {
      // Empire Plasma Reactor: glowing cyan plasma core rings around cooling tower & pagoda turbine hall roof
      addPagodaCrown(6, 8, 32, 42, 24);
      c.cylZ(46, 24, 18, 22, 9.2, S.energy);
      c.cylZ(46, 24, 28, 31, 8.6, S.trim);
    } else if (armyId === 'legion') {
      // Legion Diesel Generator Yard: external fuel tank farm, salvage crane & corrugated iron exhaust shrouds
      addSalvageCrane(6, 10, 24, 14);
      c.cylZ(34, 48, 3, 16, 4.5, S.trimLight);
      c.box(8, 14, 25, 28, 36, 28, S.hullDark);
    }
  } else if (id === 'refinery') {
    if (armyId === 'allies') {
      // Allied Petro-Chemical Plant: geodesic vapor-recovery dome on smelting hall & blue pipeline bridge
      addRadome(20, 20, 26, 6);
      c.box(32, 14, 18, 44, 32, 21, S.trim);
    } else if (armyId === 'soviets') {
      // Soviet State Smeltery: twin heavy blast-furnace smokestacks on smelting hall & red-oxide ore gantry
      c.cylZ(14, 14, 26, 42, 3.2, S.hull);
      c.cylZ(26, 14, 26, 42, 3.2, S.hull);
      c.box(6, 36, 18, 30, 56, 22, S.hullDark);
    } else if (armyId === 'empire') {
      // Empire Matter-Refinery: pagoda furnace crown, cyan energy rings on distillation towers & cobalt sphere ribs
      addPagodaCrown(6, 6, 34, 34, 24);
      c.cylZ(44, 16, 24, 27, 5.4, S.energy);
      c.cylZ(44, 30, 20, 23, 5.4, S.energy);
    } else if (armyId === 'legion') {
      // Legion Scrap Refinery: overhead ore conveyor derrick, corrugated hopper roof & extra salvage oil drums
      addSalvageCrane(14, 14, 26, 14);
      c.box(6, 34, 18, 30, 58, 20, S.trimLight);
    }
  } else if (id === 'radar-station') {
    if (armyId === 'allies') {
      // Allied NORAD Station: second geodesic radome on north-east & blue-steel phased-array cheek panels
      addRadome(50, 18, 14, 5);
      c.box(8, 12, 21, 16, 46, 25, S.trim);
    } else if (armyId === 'soviets') {
      // Soviet Duga Early-Warning Array: tall steel over-the-horizon lattice gantry & heavy bunker buttresses
      c.box(8, 12, 21, 14, 46, 38, S.hull);
      c.box(10, 14, 38, 13, 44, 42, S.trim);
      c.box(44, 12, 14, 56, 26, 22, S.hullDark);
    } else if (armyId === 'empire') {
      // Empire Sky-Eye Array: pagoda telemetry spire on north-east & glowing cyan sensor rings
      addPagodaCrown(44, 12, 56, 26, 14);
      c.box(48, 17, 18, 52, 21, 36, S.energy);
    } else if (armyId === 'legion') {
      // Legion Listening Post: salvage scaffolding mast, sandbagged bunker roof & external generator exhaust
      addSalvageCrane(44, 12, 14, 18);
      c.box(8, 12, 21, 16, 44, 25, '#c8b084');
    }
  } else if (id === 'research-lab') {
    if (armyId === 'allies') {
      // Allied R&D Campus: twin geodesic cryo-radomes on north wing & high-gain blue telemetry array
      addRadome(18, 16, 24, 5);
      addRadome(42, 16, 24, 5);
      c.box(10, 32, 24, 24, 52, 27, S.trim);
    } else if (armyId === 'soviets') {
      // Soviet Tesla Atomgrad Lab: towering high-voltage Tesla coil spire over containment dome & heavy boiler pipes
      c.cylZ(43, 43, 28, 48, 3.5, S.hull);
      for (const tz of [32, 38, 44]) c.cylZ(43, 43, tz, tz + 2, 6.5, S.trim);
      c.cylZ(43, 43, 48, 53, 4.5, S.energy);
      c.box(10, 10, 24, 52, 24, 29, S.hullDark);
    } else if (armyId === 'empire') {
      // Empire High-Science Sanctum: upturned pagoda lab wings & tall crystalline cyan energy spire
      addPagodaCrown(6, 6, 56, 28, 22);
      addPagodaCrown(6, 28, 28, 56, 22);
      c.box(40, 40, 28, 46, 46, 50, S.energy);
    } else if (armyId === 'legion') {
      // Legion Skunkworks Lab: external overhead pipe gantry, salvage crane & bolted iron cage over dome
      addSalvageCrane(12, 36, 24, 16);
      c.box(30, 14, 22, 44, 44, 26, S.trimLight);
      c.box(38, 38, 28, 48, 48, 34, S.trim);
    }
  } else if (id === 'depot' || id === 'supply-depot' || id === 'repair-depot' || id === 'field-hospital' || id === 'farm' || id === 'mine') {
    // Economic & Logistics facilities: distinct roof/tower silhouettes per faction
    if (armyId === 'allies') {
      addRadome(18, 22, 24, 5);
      c.box(6, 8, 20, 34, 12, 25, S.trim);
    } else if (armyId === 'soviets') {
      addSovietSpire(18, 22, 22, 14);
      c.box(4, 6, 18, 36, 12, 24, S.hull);
    } else if (armyId === 'empire') {
      addPagodaCrown(6, 8, 34, 36, 22);
      c.box(18, 20, 26, 22, 24, 36, S.energy);
    } else if (armyId === 'legion') {
      addSalvageCrane(12, 14, 22, 14);
      c.box(6, 8, 20, 32, 16, 25, S.trimLight);
    }
  } else if (id === 'pillbox' || id === 'bunker' || id === 'at-turret' || id === 'sam-site' || id === 'flak-cannon' || id === 'coastal-battery' || id === 'artillery-emplacement' || id === 'guard-tower') {
    // Defensive fortifications & weapon emplacements: distinct armor & sensor silhouettes per faction
    const topZ = id === 'guard-tower' ? 53 : id === 'coastal-battery' ? 40 : id === 'bunker' ? 28 : 24;
    if (armyId === 'allies') {
      // Allied Phalanx/C-RAM optical dome & sloped blue-steel composite cheek armor
      addRadome(28, 32, topZ, 4);
      c.box(14, 10, 6, 46, 14, 14, S.trim);
      c.box(14, 50, 6, 46, 54, 14, S.trim);
    } else if (armyId === 'soviets') {
      // Soviet heavy cast-iron armor casemate slabs, corner blast buttresses & gold Star crest
      c.box(10, 8, 4, 50, 14, 18, S.hull);
      c.box(10, 50, 4, 50, 56, 18, S.hull);
      c.box(22, 26, topZ, 34, 38, topZ + 5, S.hullDark);
      c.box(25, 29, topZ + 5, 31, 35, topZ + 8, S.trim);
    } else if (armyId === 'empire') {
      // Empire angular cobalt armor wings, upturned visor crown & cyan optical rangefinder
      addPagodaCrown(18, 20, 38, 44, topZ);
      c.box(26, 29, topZ + 4, 32, 35, topZ + 10, S.energy);
      c.box(12, 10, 8, 48, 13, 16, S.trim);
      c.box(12, 51, 8, 48, 54, 16, S.trim);
    } else if (armyId === 'legion') {
      // Legion Hesco sandbag bastions, welded slat-armor cage bars & rooftop ammo/drum stowage
      c.box(8, 8, 3, 52, 14, 12, '#c8b084');
      c.box(8, 50, 3, 52, 56, 12, '#c8b084');
      c.box(20, 24, topZ, 36, 40, topZ + 5, S.trimLight);
      c.box(24, 28, topZ + 5, 28, 32, topZ + 12, S.trim);
    }
  } else if (id === 'landmine') {
    // Faction-specific landmine silhouette details (while keeping low ground profile)
    if (armyId === 'allies') {
      // Allied M19 square-bevel composite collar & blue-steel sensor antenna
      c.box(22, 22, 2, 42, 42, 5, S.hull);
      c.box(46, 30, 5, 49, 34, 10, S.trim);
    } else if (armyId === 'soviets') {
      // Soviet TM-62 heavy ribbed cast-iron drum & dual red/gold pressure lugs
      c.cylZ(32, 32, 2, 6, 11.5, S.hull);
      c.box(26, 26, 6, 38, 38, 8, S.trim);
    } else if (armyId === 'empire') {
      // Empire angular octagonal magnetic mine with glowing cyan proximity ring
      c.box(23, 23, 2, 41, 41, 5, S.stoneLight);
      c.cylZ(32, 32, 6, 8, 5.5, S.energy);
    } else if (armyId === 'legion') {
      // Legion improvised IED: strapped artillery shell booster & twin wooden tripwire stakes
      c.box(16, 27, 1, 24, 37, 6, S.trimLight);
      c.box(50, 40, 0, 54, 44, 8, '#8c6b42');
    }
  }
}

