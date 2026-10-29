/**
 * Recon drone — `uav`, 16 facings. The cheapest thing in the air.
 *
 * A Predator-shaped machine: a pencil fuselage, one long straight wing, an
 * inverted-V tail and a pusher prop. It is deliberately the *thinnest* model in
 * the roster, which makes it the hardest to read at sprite scale, so the design
 * leans on three silhouette cues rather than detail:
 *
 *   * the wing is long and unbroken — at 400 voxels tip to tip it is the widest
 *     thing in the game, and it is what tells you the drone is up there;
 *   * the tail is a V, not a fin: two slabs at 40°, which no other aircraft has;
 *   * the sensor ball hangs under the nose on a visible yoke, so from the front
 *     the drone has a *face*.
 *
 * The ball traverses (it is the mission system) and the prop is its own part.
 *
 * Parts: `body`, `sensor`, `prop`.
 */
import { antenna, liftingEye, seam } from '../kit.mjs';
import {
  fuselage, noseCap, wingPair, tailPlane, propDisc, sensorBall, store,
} from '../kit-air.mjs';

const CZ = 268;                 // fuselage centre line (airborne)
const WING_Z = CZ + 6;
const WING_X = 300;

export function buildUav(c) {
  /* -------------------------------------------------------------- airframe */
  c.part('body');
  fuselage(c, {
    mat: 'team.hull',
    belly: 'team.dark',
    stations: [
      [470, 8, 8, CZ - 4],
      [440, 18, 16, CZ - 4],
      [400, 26, 22, CZ],
      [340, 32, 26, CZ + 2],
      [280, 30, 24, CZ + 2],
      [220, 26, 20, CZ + 4],
      [170, 20, 16, CZ + 8],
      [130, 14, 12, CZ + 14],
      [104, 8, 8, CZ + 20],
    ],
  });
  noseCap(c, { x: 470, dir: 1, halfW: 8, halfH: 8, zMid: CZ - 4, steps: 8, mat: 'team.hull' });

  // Dorsal hump: the satcom blister is the one piece of bulk on a pencil body.
  c.box(300, 236, CZ + 24, 366, 276, CZ + 46, 'team.light');
  c.cylZ(332, 256, CZ + 46, CZ + 54, 12, 'steel.dark');
  antenna(c, { x: 336, y: 256, z: CZ + 52, height: 62 });

  // The single long wing, with hardpoints at the tips and mid-span.
  wingPair(c, { x: WING_X, halfSpan: 200, chord: 62, thick: 6, cz: WING_Z, mat: 'team.hull' });
  for (const s of [-1, 1]) {
    store(c, { x: WING_X + 14, cy: 256 + s * 120, cz: WING_Z - 26, len: 44, r: 6, kind: 'missile' });
  }
  for (const s of [-1, 1]) {
    c.box(WING_X - 4, 256 + s * 150, WING_Z - 3, WING_X + 40, 256 + s * 156, WING_Z + 3, 'team.dark');
  }

  // Inverted-V tail: two slabs at 40°, plus a small ventral fin.
  tailPlane(c, { x: 128, halfSpan: 76, chord: 34, thick: 5, sweep: 16, dihedral: 54, cz: CZ, mat: 'team.hull' });
  c.box(112, 246, CZ - 44, 150, 266, CZ - 12, 'team.hull');

  // Pusher engine pod, exhaust and cooling scoops.
  c.box(126, 244, CZ - 8, 176, 268, CZ + 22, 'team.dark');
  c.cylX(120, 132, 256, CZ + 6, 12, 'scorch');
  for (const s of [-1, 1]) c.box(146, 256 + s * 12, CZ + 12, 176, 256 + s * 18, CZ + 26, 'iron');

  seam(c, { x0: 180, y0: 240, z0: CZ + 20, x1: 430, y1: 240, z1: CZ + 20 });
  liftingEye(c, { x: 250, y: 250, z: CZ + 26 });
  c.box(430, 248, CZ + 10, 448, 264, CZ + 18, 'glass.dark');            // camera window

  /* ---------------------------------------------------------------- sensor */
  c.part('sensor');
  sensorBall(c, { x: 452, cz: CZ - 30, r: 18, part: 'sensor' });
  c.pivot('sensor', [452, 256, CZ - 12]);
  c.parent('sensor', 'body');
  c.dynamic('sensor');
  c.traverse('sensor');

  /* ------------------------------------------------------------------ prop */
  c.part('prop');
  propDisc(c, { x: 112, cz: CZ + 6, radius: 62, blades: 4, part: 'prop' });
  c.pivot('prop', [112, 256, CZ + 6]);
  c.dynamic('prop');
  c.part('body');

  /* ----------------------------------------------------------- surface pass */
  c.wear(0x6612, 'steel.dark', { rate: 0.02, only: ['team.light'] });
  c.mottle(0x1ba7, ['team.dark', 'team.hull'], 0.02, { only: ['team.hull'] });
  return c;
}
