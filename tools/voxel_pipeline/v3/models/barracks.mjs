/**
 * Barracks — infantry training facility, authored on the 512³ lattice.
 *
 * Parts: `body` (everything structural), `door` (the troop entrance, so it can
 * swing open in a production animation), `flag` (pennant on its own pivot).
 *
 * The footprint uses the whole tile (≈460 voxels) because a building owns its
 * tile, and `+X` is the front — the same convention units use, so the four
 * baked facings line up with the legacy `right/up/left/down` set.
 */
import {
  foundation, walls, window_, doorway, gableRoof, flagpole, steps, wallLamp,
  ventStack, sandbags, crate, antenna,
} from '../kit-init.mjs';

const X0 = 54, X1 = 430;          // main block
const Y0 = 96, Y1 = 430;
const FLOOR = 20;
const EAVE = 176;                 // top of the walls
const DOOR_X = 452;               // front face of the entrance porch

export function buildBarracks(c) {
  /* ------------------------------------------------------------- ground --- */
  foundation(c, { x0: X0, x1: X1, y0: Y0, y1: Y1, height: 16 });

  // Parade ground / training yard in front of the building.
  c.part('body');
  c.box(DOOR_X - 10, 60, 16, 498, 470, 22, 'concrete.dark');
  c.box(DOOR_X, 90, 22, 470, 440, 24, 'asphalt');
  // Yard markings: painted lane lines and an obstacle course lane.
  for (let y = 120; y < 420; y += 60) {
    c.box(DOOR_X + 8, y, 24, 466, y + 8, 25, 'paint.line');
  }
  c.box(DOOR_X + 6, 96, 24, DOOR_X + 12, 436, 25, 'paint.line');
  c.box(DOOR_X + 6, 96, 24, 466, 102, 25, 'paint.line');

  /* -------------------------------------------------------------- walls --- */
  walls(c, { x0: X0, x1: X1, y0: Y0, y1: Y1, z0: FLOOR, z1: EAVE, thick: 12 });

  // Buttresses down both long sides.
  for (let x = X0 + 40; x < X1 - 40; x += 92) {
    c.box(x, Y0 - 10, FLOOR, x + 20, Y0 + 4, EAVE - 12, 'concrete.lit');
    c.box(x, Y1 - 4, FLOOR, x + 20, Y1 + 10, EAVE - 12, 'concrete.lit');
    c.box(x, Y0 - 12, EAVE - 22, x + 20, Y0 + 4, EAVE - 10, 'concrete.dark');
    c.box(x, Y1 - 4, EAVE - 22, x + 20, Y1 + 12, EAVE - 10, 'concrete.dark');
  }

  // Team-coloured band under the eaves, the main faction read at game scale.
  c.box(X0 - 4, Y0 - 4, EAVE - 26, X1 + 4, Y1 + 4, EAVE - 10, 'roof');
  c.box(X0 - 6, Y0 - 6, EAVE - 12, X1 + 6, Y1 + 6, EAVE - 6, 'roof.dark');

  /* ------------------------------------------------------------ windows --- */
  // Two storeys of windows on the long walls.
  for (const z of [62, 124]) {
    for (let x = X0 + 60; x < X1 - 60; x += 84) {
      window_(c, { x, y: Y0, z, w: 36, h: 34, side: '-y', lit: (x + z) % 168 === 0 });
      window_(c, { x, y: Y1, z, w: 36, h: 34, side: '+y', lit: (x + z) % 252 === 0 });
    }
  }
  // Front gable windows and the back wall.
  window_(c, { x: X1, y: Y0 + 90, z: 70, w: 34, h: 32, side: '+x' });
  window_(c, { x: X1, y: Y0 + 200, z: 70, w: 34, h: 32, side: '+x' });
  window_(c, { x: X0, y: Y0 + 120, z: 74, w: 30, h: 30, side: '-x' });

  /* ------------------------------------------------------- entrance porch */
  // Canopy over the door, on four posts.
  c.box(DOOR_X - 6, 150, 120, DOOR_X + 44, 372, 132, 'roof');
  c.box(DOOR_X - 6, 150, 132, DOOR_X + 44, 372, 136, 'roof.light');
  for (const y of [160, 350]) {
    c.box(DOOR_X + 30, y - 8, 22, DOOR_X + 40, y + 8, 120, 'concrete.lit');
    c.box(DOOR_X + 26, y - 12, 14, DOOR_X + 44, y + 12, 24, 'concrete.dark');
  }
  // Threshold, steps and the door itself on its own part.
  c.box(X1, 196, FLOOR, DOOR_X + 8, 330, FLOOR + 10, 'concrete.lit');
  steps(c, { x: X1, y: 196, z: FLOOR, w: 134, depth: 44, rise: 6, count: 4, side: '+x' });
  doorway(c, { x: X1, y: 214, z: FLOOR + 10, w: 98, h: 96, side: '+x', part: 'door' });
  c.part('door');
  // Door leaves proud of the frame so the part is legible in isolation.
  c.box(X1 + 6, 220, FLOOR + 10, X1 + 12, 262, FLOOR + 96, 'wood.dark');
  c.box(X1 + 6, 264, FLOOR + 10, X1 + 12, 306, FLOOR + 96, 'wood.dark');
  c.box(X1 + 12, 258, FLOOR + 40, X1 + 15, 264, FLOOR + 60, 'brass');
  c.box(X1 + 12, 262, FLOOR + 40, X1 + 15, 268, FLOOR + 60, 'brass');
  c.pivot('door', [X1 + 6, 220, FLOOR + 10]);
  c.dynamic('door');
  c.part('body');

  wallLamp(c, { x: X1 + 4, y: 200, z: FLOOR + 62, side: '+x' });
  wallLamp(c, { x: X1 + 4, y: 322, z: FLOOR + 62, side: '+x' });

  /* --------------------------------------------------------------- roof --- */
  gableRoof(c, { x0: X0, x1: X1, y0: Y0, y1: Y1, z: EAVE, rise: 96, mat: 'roof' });
  ventStack(c, { x: X0 + 90, y: Y0 + 120, z: EAVE + 40, r: 14, height: 54 });
  ventStack(c, { x: X0 + 90, y: Y1 - 120, z: EAVE + 40, r: 12, height: 44 });
  // Roof hatch in the gable.
  c.box(X0 + 210, Y0 + 150, EAVE + 40, X0 + 268, Y0 + 210, EAVE + 48, 'steel.dark');
  c.box(X0 + 216, Y0 + 156, EAVE + 48, X0 + 262, Y0 + 204, EAVE + 52, 'steel');
  antenna(c, { x: X0 + 300, y: Y0 + 180, z: EAVE + 60, height: 110 });

  /* ------------------------------------------------------ flag on a pole --- */
  flagpole(c, { x: 400, y: 54, z: 16, height: 296, part: 'flag' });
  c.pivot('flag', [400, 54, 16]);
  c.dynamic('flag');
  c.part('body');

  /* ------------------------------------------------------------ yard kit --- */
  // Sandbagged weapon pit at the yard corner.
  sandbags(c, { x0: 470, x1: 500, y0: 380, z0: 24, rows: 3 });
  crate(c, { x0: 462, y0: 60, z0: 24, x1: 492, y1: 96, z1: 54, mat: 'wood', lid: 'steel.dark' });
  crate(c, { x0: 462, y0: 400, z0: 24, x1: 494, y1: 434, z1: 50, mat: 'canvas' });
  // Training obstacles: vault bars running up the yard (never past the canvas).
  for (let y = 150; y < 380; y += 100) {
    c.box(462, y, 24, 470, y + 10, 62, 'wood.dark');
    c.box(462, y + 84, 24, 470, y + 94, 62, 'wood.dark');
    c.box(462, y, 56, 470, y + 94, 62, 'wood');
  }
  // Barrack sign over the door.
  c.box(X1 + 14, 236, FLOOR + 104, X1 + 20, 300, FLOOR + 128, 'team.hull');
  c.box(X1 + 20, 244, FLOOR + 110, X1 + 21, 292, FLOOR + 122, 'team.accent');

  /* --------------------------------------------------------- surface pass -- */
  c.wear(0x2b91, 'concrete.lit', { rate: 0.05, only: ['concrete', 'concrete.lit', 'concrete.dark'] });
  c.mottle(0x77a3, ['concrete.dark', 'concrete.lit'], 0.04,
    { only: ['concrete', 'concrete.lit'] });
  return c;
}
