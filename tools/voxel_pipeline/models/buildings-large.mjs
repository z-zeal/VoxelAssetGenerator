/**
 * Major multi-tile compounds — authored on the full footprint design grid:
 *   hq       96 × 96 (3×3 tiles)
 *   airport  96 × 96 (3×3 tiles)
 *   port     96 × 64 (3×2 tiles)
 *
 * These are remodels, not enlargements: each compound is laid out as an actual
 * site (perimeter, roads/aprons, service yards, multiple buildings, machinery)
 * so the extra tiles carry readable architecture instead of a scaled-up block.
 * The old 64³ single-tile sculptures remain in buildings.mjs for the historical
 * 2×2 facilities; these three now own their multi-tile footprints end to end
 * (art, bake, manifest, runtime placement).
 */

export const LARGE_BUILDING_IDS = new Set(['hq', 'airport', 'port']);

const STONE = '#e0d9b2', STONE_L = '#ece7bc', WALL = '#8a8c70', TURF = '#6f8a4a';
const CONCRETE = '#98a098', CONCRETE_D = '#6b7566', CONCRETE_L = '#aab59e';
const STEEL = '#536958', STEEL_L = '#8a8c70', TRIM = '#938e70';
const GLASS = '#b8dedc', GLASS_D = '#6b9496', ROOF = '#df794b', ROOF_L = '#ffc68b';
const ROOF_D = '#934b32', HAZARD = '#e5b93c', WARN = '#d94c3d', DARK = '#3b4238';
const ASPHALT = '#33363a', ASPHALT_L = '#585c60', MARK = '#eceade';
const WATER = '#71abb6', WATER_L = '#8ec7cf', CARGO = ['#3b7d90', '#7a3b30', '#507b43', '#a58a5a'];

/** Vertical window band with deep reveals. */
function windowsX(c, x0, x1, y, z0, z1, step = 6) {
  for (let x = x0; x < x1 - 3; x += step) {
    c.box(x, y, z0, x + 3, y + 1, z1, GLASS);
    c.box(x, y + 1, z0 - 1, x + 3, y + 2, z0, STONE);
    c.box(x, y + 1, z1, x + 3, y + 2, z1 + 1, STONE);
  }
}
function windowsY(c, y0, y1, x, z0, z1, step = 6) {
  for (let y = y0; y < y1 - 3; y += step) {
    c.box(x, y, z0, x + 1, y + 3, z1, GLASS);
    c.box(x + 1, y, z0 - 1, x + 2, y + 3, z0, STONE);
    c.box(x + 1, y, z1, x + 2, y + 3, z1 + 1, STONE);
  }
}
/** Simple conifer for compounds/gardens (world z units). */
function tree(c, x, y, z, h) {
  c.box(x - 1, y - 1, z, x + 1, y + 1, z + Math.max(3, Math.round(h * 0.45)), '#6e5a38');
  c.cylZ(x, y, z + Math.round(h * 0.35), z + h, Math.max(2, h * 0.28), '#507b43');
  c.cylZ(x, y, z + Math.round(h * 0.6), z + h - 1, Math.max(1.5, h * 0.2), '#648f48');
}
/** Container stack. */
function container(c, x, y, z, len, color) {
  c.box(x, y, z, x + len, y + 6, z + 5, color);
  c.box(x + 1, y + 1, z + 5, x + len - 1, y + 5, z + 6, color);
  for (let i = x + 2; i < x + len - 1; i += 4) c.box(i, y, z + 5, i + 1, y + 6, z + 6, '#2b3138');
}

/* --------------------------------------------------------------------- HQ --- */
function hqVoxels(c) {
  // Grass compound, paved core and perimeter road.
  c.box(0, 0, 0, 96, 96, 1, TURF);
  c.box(4, 4, 1, 92, 92, 2, '#7d8a5a');
  c.box(18, 18, 2, 78, 78, 3, CONCRETE_L);
  // Perimeter wall with buttresses and two gate towers.
  for (let x = 0; x < 96; x += 6) {
    c.box(x, 0, 0, x + 5, 3, 8, x % 12 === 0 ? STONE : WALL);
    c.box(x + 1, 0, 8, x + 4, 2, 9, STONE_L);
  }
  for (let x = 0; x < 96; x += 6) c.box(x, 92, 0, x + 5, 95, 8, x % 12 === 0 ? STONE : WALL);
  for (let y = 3; y < 92; y += 6) {
    c.box(0, y, 0, 3, y + 5, 8, y % 12 === 0 ? STONE : WALL);
    c.box(92, y, 0, 95, y + 5, 8, y % 12 === 0 ? STONE : WALL);
  }
  for (const [x, y] of [[30, 30], [62, 30], [30, 62], [62, 62]]) {
    c.box(x, y, 0, x + 4, y + 4, 14, STONE);
    c.box(x - 1, y - 1, 14, x + 5, y + 5, 16, WALL);
    c.box(x, y, 16, x + 4, y + 4, 17, ROOF);
  }
  // Gatehouse on the south approach with raised road and sentry posts.
  c.box(40, 78, 3, 56, 96, 4, CONCRETE_D);
  c.box(40, 80, 4, 56, 96, 5, ASPHALT_L);
  for (let y = 82; y < 96; y += 4) c.box(47, y, 5, 49, y + 2, 6, HAZARD);
  c.box(34, 84, 3, 40, 90, 15, STONE);
  c.box(56, 84, 3, 62, 90, 15, STONE);
  c.box(33, 83, 15, 41, 91, 17, WALL);
  c.box(55, 83, 15, 63, 91, 17, WALL);
  c.box(33, 83, 17, 41, 91, 18, ROOF);
  c.box(55, 83, 17, 63, 91, 18, ROOF);
  // Main command block: plinth, colonnade, window bands, cornice.
  c.box(22, 24, 2, 74, 76, 4, STONE_L);
  for (let x = 26; x < 72; x += 9) {
    c.box(x, 24, 4, x + 4, 28, 22, STONE_L);
    c.box(x, 72, 4, x + 4, 76, 22, STONE_L);
  }
  c.shell(26, 28, 4, 70, 72, 24, WALL);
  windowsX(c, 28, 68, 27, 8, 20, 6);
  windowsX(c, 28, 68, 71, 8, 20, 6);
  windowsY(c, 30, 70, 25, 8, 20, 6);
  windowsY(c, 30, 70, 69, 8, 20, 6);
  // Portico steps and columns on the south façade.
  c.box(36, 76, 4, 60, 84, 5, STONE_L);
  c.box(38, 76, 5, 58, 82, 7, STONE);
  for (const x of [38, 44, 52, 58]) c.box(x, 72, 4, x + 2, 74, 20, STONE_L);
  c.box(36, 70, 20, 60, 74, 22, WALL);
  // Central tower + cupola + communications mast.
  c.box(36, 34, 24, 60, 58, 26, STONE);
  c.shell(38, 36, 26, 58, 56, 42, STONE_L);
  windowsX(c, 40, 56, 35, 30, 40, 4);
  windowsX(c, 40, 56, 55, 30, 40, 4);
  windowsY(c, 37, 55, 34, 30, 40, 4);
  c.box(34, 32, 42, 62, 60, 44, STONE);
  c.box(36, 34, 44, 60, 58, 45, ROOF);
  c.box(40, 38, 45, 56, 54, 46, ROOF_L);
  c.box(44, 42, 46, 52, 50, 52, GLASS);              // glass lantern
  c.box(45, 43, 52, 51, 49, 53, STEEL);
  c.box(47, 45, 53, 49, 47, 66, STEEL);              // mast
  c.box(46, 44, 60, 50, 48, 62, '#8b96a2');          // radar array
  c.box(48, 46, 66, 49, 47, 70, WARN);               // beacon
  // Flag (team recolour target) and roof furniture.
  c.box(44, 30, 45, 45, 31, 60, STEEL_L);
  c.box(45, 30, 55, 55, 31, 59, ROOF);
  c.box(45, 30, 57, 55, 31, 58, ROOF_L);
  for (const [x, y] of [[28, 34], [62, 34], [28, 58], [62, 58]]) {
    c.box(x, y, 24, x + 4, y + 4, 26, CONCRETE);
    c.box(x + 1, y + 1, 26, x + 3, y + 3, 27, DARK);
  }
  // Flanking wings with their own roofs and roof access hatches.
  for (const x of [8, 76]) {
    c.shell(x, 36, 3, x + 12, 64, 16, STONE);
    c.box(x - 1, 35, 16, x + 13, 65, 18, ROOF);
    c.box(x, 36, 18, x + 12, 64, 19, ROOF_D);
    windowsX(c, x + 2, x + 10, 35, 7, 13, 3);
    c.box(x + 3, 48, 19, x + 9, 54, 21, CONCRETE);
  }
  // Parade ground markings and helipad on the north-east lawn.
  c.box(28, 6, 1, 68, 16, 2, CONCRETE);
  for (let x = 30; x < 66; x += 4) c.box(x, 10, 2, x + 2, 12, 3, MARK);
  c.cylZ(80, 82, 2, 3, 7, CONCRETE);
  c.cylZ(80, 82, 3, 4, 6, ASPHALT_L);
  c.box(78, 80, 4, 82, 81, 5, MARK);
  c.box(79, 79, 4, 80, 84, 5, MARK);
  c.box(81, 79, 4, 82, 84, 5, MARK);
  // Service yard: generator drums, trucks and gardens along the wall.
  for (const [x, y] of [[10, 72], [14, 78], [82, 72]]) c.cylZ(x, y, 1, 6, 2.2, STEEL);
  c.box(74, 72, 1, 86, 78, 3, STEEL);
  c.box(75, 73, 3, 85, 77, 5, ROOF);
  for (const [x, y, h] of [[8, 20, 9], [12, 26, 7], [86, 20, 10], [86, 78, 8], [10, 86, 7]]) tree(c, x, y, 1, h);
}

/* ---------------------------------------------------------------- AIRPORT --- */
function airportVoxels(c, frame) {
  // Perimeter grass, runway, parallel taxiway and apron.
  c.box(0, 0, 0, 96, 96, 1, '#5f7a44');
  c.box(2, 46, 1, 94, 70, 2, ASPHALT);
  c.box(2, 46, 2, 94, 47, 3, ASPHALT_L);
  c.box(2, 69, 2, 94, 70, 3, ASPHALT_L);
  for (let x = 6; x < 90; x += 8) c.box(x, 57, 2, x + 4, 59, 3, MARK);
  for (const y of [50, 54, 62, 66]) {
    for (let x = 6; x < 20; x += 4) c.box(x, y, 2, x + 2, y + 2, 3, MARK);
    for (let x = 76; x < 90; x += 4) c.box(x, y, 2, x + 2, y + 2, 3, MARK);
  }
  c.box(2, 38, 1, 94, 46, 2, ASPHALT_L);
  for (let x = 10; x < 90; x += 10) c.box(x, 41, 2, x + 5, 43, 3, MARK);
  c.box(18, 16, 1, 78, 38, 2, CONCRETE_L);        // apron
  c.box(20, 18, 2, 76, 36, 3, CONCRETE);
  // Runway edge lights.
  for (let x = 4; x < 94; x += 6) {
    c.put(x, 45, 2, HAZARD); c.put(x, 71, 2, HAZARD);
  }
  // Terminal with glazed concourse, roof, jet bridges and rooftop services.
  c.shell(28, 6, 2, 62, 24, 14, STONE);
  c.box(26, 4, 14, 64, 26, 16, ROOF);
  c.box(28, 6, 16, 62, 24, 17, ROOF_D);
  for (let x = 30; x < 60; x += 5) c.box(x, 23, 5, x + 3, 25, 12, GLASS);
  for (let y = 8; y < 22; y += 5) c.box(27, y, 5, 29, y + 3, 12, GLASS);
  c.box(40, 24, 3, 46, 34, 4, CONCRETE);
  c.box(41, 24, 4, 45, 33, 5, MARK);
  c.box(52, 24, 3, 58, 34, 4, CONCRETE);
  c.box(53, 24, 4, 57, 33, 5, MARK);
  // Control tower: shaft, flared cab, roof, rotating radar dish (idle frame 1).
  c.box(58, 6, 16, 68, 16, 38, '#6b7a5a');
  c.box(56, 4, 38, 70, 18, 46, GLASS);
  c.box(56, 4, 38, 58, 6, 46, STEEL);
  c.box(68, 4, 38, 70, 6, 46, STEEL);
  c.box(56, 16, 38, 58, 18, 46, STEEL);
  c.box(68, 16, 38, 70, 18, 46, STEEL);
  c.box(54, 2, 46, 72, 20, 49, ROOF);
  c.box(58, 6, 49, 68, 16, 51, ROOF_L);
  c.box(61, 9, 51, 65, 13, 54, STEEL);
  c.group('dish');
  c.pivot('dish', [63, 11]);
  c.box(57, 10, 54, 69, 12, 57, '#8b96a2');
  c.box(59, 9, 57, 67, 13, 59, '#bbc4c8');
  c.box(62, 10, 59, 64, 12, 60, STEEL);
  c.group('body');
  if (frame === 1) {
    c.group('beacon');
    c.box(54, 2, 49, 56, 4, 52, WARN);
    c.put(55, 3, 52, '#ff8c3a');
    c.group('body');
  }
  // Hangar with arched roof and open door.
  c.shell(6, 10, 2, 26, 32, 14, STONE);
  c.box(4, 8, 14, 28, 34, 16, ROOF);
  c.box(8, 14, 16, 24, 30, 19, ROOF_L);
  c.box(8, 30, 2, 24, 32, 12, DARK);
  c.box(8, 30, 12, 24, 32, 14, STEEL_L);
  // Fuel farm, fire station and hangar apron equipment.
  for (const [x, y] of [[74, 8], [84, 8], [74, 18], [84, 18]]) {
    c.cylZ(x, y, 2, 12, 4.2, SHELL_WHITE);
    c.cylZ(x, y, 12, 13, 3.4, STEEL);
    c.box(x - 1, y - 1, 13, x + 1, y + 1, 14, WARN);
  }
  c.box(74, 26, 2, 90, 34, 8, STONE_L);
  c.box(73, 25, 8, 91, 35, 10, ROOF);
  c.box(76, 33, 2, 82, 35, 8, WARN);            // fire station door
  c.box(84, 33, 2, 88, 35, 7, DARK);
  // Windsock and perimeter fence.
  c.box(90, 44, 2, 91, 45, 12, STEEL);
  c.box(89, 43, 10, 93, 44, 13, WARN);
  for (let x = 0; x < 96; x += 8) c.box(x, 0, 1, x + 1, 1, 4, STEEL_L);
  for (let y = 0; y < 96; y += 8) {
    c.box(0, y, 1, 1, y + 1, 4, STEEL_L);
    c.box(95, y, 1, 96, y + 1, 4, STEEL_L);
  }
  for (let x = 0; x < 96; x += 8) c.box(x, 95, 1, x + 1, 96, 4, STEEL_L);
}
const SHELL_WHITE = '#e8eef0';

/* ------------------------------------------------------------------- PORT --- */
function portVoxels(c) {
  // Harbour water, seawall, quay deck and bollards.
  c.box(0, 0, 0, 96, 64, 1, WATER);
  for (const [x, y] of [[8, 48], [30, 52], [56, 54], [80, 50], [16, 60], [66, 60]]) {
    c.box(x, y, 1, x + 7, y + 3, 2, WATER_L);
  }
  c.box(0, 0, 1, 96, 40, 3, CONCRETE_D);
  c.box(0, 0, 3, 96, 38, 4, CONCRETE);
  c.box(0, 36, 1, 96, 40, 5, CONCRETE_L);
  for (let x = 4; x < 96; x += 8) {
    c.cylZ(x, 38, 5, 7, 1.1, DARK);
    c.put(x, 38, 7, HAZARD);
  }
  // Warehouses with roller doors, roof ridges and loading docks.
  for (const [x0, x1] of [[4, 30], [40, 66]]) {
    c.shell(x0, 4, 4, x1, 20, 18, STONE);
    c.box(x0 - 2, 2, 18, x1 + 2, 22, 20, ROOF);
    c.box(x0, 4, 20, x1, 22, 21, ROOF_D);
    for (let x = x0 + 4; x < x1 - 4; x += 8) c.box(x, 19, 6, x + 5, 21, 15, STEEL);
    c.box(x0 + 3, 19, 15, x1 - 3, 21, 17, STEEL_L);
    c.box(x0 + 2, 2, 4, x1 - 2, 4, 6, '#c8b084');
  }
  // Container yard with stacked freight in four line colours.
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 7; col++) {
      const x = 6 + col * 12;
      const y = 24 + row * 4;
      container(c, x, y, 4, 10, CARGO[(row + col) % CARGO.length]);
      if ((row + col) % 3 === 0) container(c, x + 1, y, 10, 8, CARGO[(row + col + 1) % CARGO.length]);
    }
  }
  // Gantry crane: rails, legs, boom over the water, cab and spreader.
  c.box(72, 34, 4, 92, 36, 5, STEEL);
  c.box(74, 34, 5, 76, 38, 30, HAZARD);
  c.box(88, 34, 5, 90, 38, 30, HAZARD);
  c.box(72, 34, 30, 92, 38, 33, WARN);
  c.box(64, 35, 30, 74, 37, 32, WARN);
  c.box(80, 32, 33, 86, 40, 38, GLASS_D);
  c.box(66, 35, 22, 70, 37, 30, STEEL);         // hoist cable + spreader
  c.box(64, 34, 20, 72, 38, 22, STEEL_L);
  // Pier and moored cargo ship with deckhouse and deck cargo.
  c.box(34, 40, 1, 44, 58, 4, CONCRETE_L);
  c.box(34, 40, 4, 36, 58, 6, CONCRETE);
  c.box(42, 40, 4, 44, 58, 6, CONCRETE);
  c.box(46, 44, 1, 90, 58, 2, '#2b3138');
  c.box(48, 45, 2, 88, 57, 6, '#7a3b30');
  c.box(49, 46, 6, 87, 56, 7, '#585c60');
  c.box(78, 46, 7, 86, 56, 18, '#eceade');
  c.box(79, 47, 18, 85, 55, 20, STEEL);
  for (let i = 0; i < 3; i++) container(c, 52 + i * 8, 48, 7, 7, CARGO[i % CARGO.length]);
  c.box(80, 45, 20, 82, 47, 34, STEEL_L);       // ship mast
  c.box(79, 46, 30, 83, 48, 32, '#8b96a2');
  c.box(70, 46, 7, 74, 56, 12, '#d94c3d');      // funnel
  // Lighthouse on the breakwater tip.
  c.cylZ(88, 60, 1, 4, 3.4, CONCRETE_D);
  c.cylZ(88, 60, 4, 18, 2.2, '#eceade');
  for (let z = 6; z < 18; z += 4) c.cylZ(88, 60, z, z + 2, 2.4, WARN);
  c.box(85, 57, 18, 91, 63, 20, DARK);
  c.box(86, 58, 20, 90, 62, 22, GLASS);
  c.box(85, 57, 22, 91, 63, 23, STEEL);
  c.put(88, 60, 23, WARN);
  // Yard clutter: oil drums, spare containers, rail cars.
  for (const [x, y] of [[34, 6], [35, 9], [68, 30], [70, 28], [92, 20]]) c.cylZ(x, y, 4, 10, 1.8, STEEL);
  c.box(70, 22, 4, 92, 26, 10, '#a58a5a');
  c.box(72, 23, 10, 90, 25, 11, '#c8b084');
}

export function largeBuildingVoxels(c, id, pose) {
  if (id === 'hq') return hqVoxels(c);
  if (id === 'airport') return airportVoxels(c, pose?.frame ?? 0);
  return portVoxels(c);
}
