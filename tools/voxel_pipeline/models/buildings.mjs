/**
 * 64×64×64 architectural buildings. x/y is the full 64×64 property footprint
 * and z ∈ 0..63 is true elevation. Airport runway tarmac and harbor water stay
 * flat single-voxel z=0 surfaces; terminals, hangars, docks, towers and
 * industrial structures rise cleanly above them. Operational machinery is
 * tagged: `dish` (airport radar, yaws on idle frame 1) and `puff` (factory
 * exhaust, present only on idle frame 1).
 */
const ROOF = '#df794b', ROOF_L = '#ffc68b', ROOF_D = '#934b32';
const TEAM = '#df794b';
const STONE = '#e0d9b2', STONE_L = '#ece7bc', WALL = '#8a8c70', SHADOW = '#5a6448';
const GLASS = '#b8dedc', GLASS_D = '#6b9496', METAL = '#536958', TRIM = '#938e70';
const SMOKE_PUFF = '#d8dede';

export function buildingVoxels(c, id, pose) {
  const frame = pose?.frame ?? 0;

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
    // Barracks: dedicated infantry-training facility — personnel block with
    // windows, training yard with obstacle/rails, equipment store, team gate.
    c.box(0, 0, 0, 64, 64, 2, '#7a6a5a');
    c.box(6, 6, 2, 30, 26, 10, '#8a7a6a');
    c.shell(6, 6, 10, 30, 26, 14, '#6b5d4f');
    for (let x = 10; x < 26; x += 4) c.box(x, 6, 10, x + 2, 8, 14, '#a0a898');
    c.box(10, 18, 2, 28, 22, 10, '#b8a68a');
    c.box(14, 20, 10, 24, 24, 13, '#5a4a3a');
    c.box(34, 8, 2, 58, 30, 4, '#9e9482');
    for (const x of [40, 48, 54]) c.box(x, 10, 4, x + 2, 26, 5, '#646e74');
    c.box(38, 36, 2, 58, 56, 8, '#8c8660');
    c.box(40, 38, 10, 42, 54, 13, '#6b5d4f');
    c.box(46, 36, 10, 56, 40, 14, '#a89872');
    c.box(28, 58, 2, 36, 62, 6, TEAM);
    c.box(30, 58, 6, 34, 62, 9, '#4a453a');
    c.box(32, 36, 14, 36, 40, 18, METAL);
    c.box(34, 36, 18, 38, 42, 20, TEAM);
  } else if (id === 'landmine') {
    // Small low disc: buried charge ring, steel casing, hazard band in the
    // OWNER colour, offset marker picket with tripwire (asymmetric on purpose,
    // so every facing and every team variant really differs).
    const CASING = '#5a5f52', CASING_D = '#3b4238', RUBBER = '#2b3128';
    const HAZARD = '#e8c468', PLATE = '#8b96a2';
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const d = Math.hypot(x - 31.5, y - 31.5);
        if (d <= 16.8) c.put(x, y, 0, RUBBER);
        if (d <= 14.0) c.put(x, y, 1, CASING_D);
        if (d <= 10.8) c.put(x, y, 2, CASING);
        if (d <= 9.2) c.put(x, y, 3, HAZARD);
        if (d <= 5.2) c.put(x, y, 4, PLATE);
        if (d <= 3.2) c.put(x, y, 5, CASING_D);
      }
    }
    c.box(18, 18, 6, 24, 24, 10, '#4a5245');            // detonator block
    c.box(20, 20, 10, 22, 22, 12, '#d94b38');
    for (let i = 0; i < 12; i++) { c.put(16 - i, 20 + i, 6, CASING_D); c.put(14 - i, 22 + i, 6, CASING_D); }
    c.box(46, 42, 4, 48, 44, 16, '#8c6b42');            // warning picket
    c.box(42, 38, 16, 52, 48, 18, TEAM);
    c.box(44, 40, 18, 50, 46, 20, '#f2f4ef');
    c.box(48, 16, 4, 50, 18, 12, CASING_D);             // tripwire stubs
    c.box(50, 18, 10, 56, 20, 12, RUBBER);
  }
  c.group('body');
}
