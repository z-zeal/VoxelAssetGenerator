/**
 * Heavy transport — `transport-plane`, 16 facings.
 *
 * The transport is the one airframe in the family whose silhouette is a *box*,
 * and every cue is about carrying volume rather than going fast:
 *
 *   * **a constant-section cabin** — the fuselage does not taper behind the wing,
 *     it runs fat to the ramp and then stops. That is the tell at 8×;
 *   * **a high wing on two big turbofans** — the wing sits on top so the cabin
 *     reaches the floor, and the engines hang low under it;
 *   * **a rear ramp as its own part** — the ramp is the reason the aircraft
 *     exists, and it is the only dynamic part a transport actually needs.
 *
 * Parts: `body`, `fin` (rudder, dynamic), `ramp` (dynamic).
 */
import { liftingEye } from '../kit.mjs';
import {
  fuselage, noseCap, canopy, sideGlass, wingPair, tailPlane, fin, nacelle, jetPipe,
} from '../kit-air.mjs';

const CZ = 300;

export function buildTransportPlane(c) {
  /* -------------------------------------------------------------- airframe */
  c.part('body');
  fuselage(c, {
    mat: 'team.hull',
    belly: 'team.dark',
    stations: [
      [470, 8, 8, CZ],
      [458, 18, 14, CZ],
      [440, 28, 21, CZ - 1],
      [414, 34, 27, CZ - 2],
      [372, 38, 31, CZ - 2],
      [318, 38, 32, CZ - 2],
      [260, 37, 32, CZ - 2],
      [204, 37, 31, CZ - 2],
      [156, 36, 30, CZ - 2],
      [116, 34, 28, CZ - 2],
      [ 92, 30, 25, CZ - 1],
    ],
  });
  noseCap(c, { x: 470, dir: 1, halfW: 8, halfH: 8, zMid: CZ, steps: 7, mat: 'team.light' });

  // Flight deck high on the nose and a slab-sided cabin: no window band down the
  // whole flank, because a transport's windows are a row of small ones.
  canopy(c, { x0: 444, x1: 466, halfW: 22, z0: CZ + 10, z1: CZ + 30, rake: 8 });
  for (let i = 0; i < 9; i++) {
    const x = 150 + i * 24;
    for (const s of [-1, 1]) {
      const y = 256 + s * 37;
      c.box(x, Math.min(y, y + s * 2), CZ + 10, x + 12, Math.max(y, y + s * 2), CZ + 20, 'glass.dark');
    }
  }

  // High wing, low engines: the reason the cabin reaches the ground.
  wingPair(c, {
    x: 356, halfSpan: 200, chord: 70, thick: 3, sweep: 26, dihedral: 4,
    cz: CZ + 30, mat: 'team.hull', part: 'body',
  });
  for (const s of [-1, 1]) {
    nacelle(c, { x0: 330, x1: 244, cy: 256 + s * 112, cz: CZ + 2, r: 18, pylonTo: CZ + 28 });
    jetPipe(c, { x0: 244, x1: 254, cz: CZ + 2, r0: 14, r1: 10 });
  }

  // T-tail: the horizontal surface sits ON the fin, which is the second-fastest
  // way to say "transport" after the boxy cabin.
  fin(c, { x0: 96, x1: 186, z0: CZ + 20, z1: CZ + 164, rake: 30, thick: 5, mat: 'team.hull', tipMat: 'team.dark' });
  tailPlane(c, { x: 118, halfSpan: 124, chord: 42, thick: 3, sweep: 12, cz: CZ + 158, mat: 'team.hull' });
  liftingEye(c, { x: 300, y: 246, z: CZ + 32 });

  // Ramp hinge line, painted so the ramp reads as a ramp when it is closed.
  c.box(88, 226, CZ - 30, 96, 286, CZ + 24, 'team.dark');

  /* ------------------------------------------------------------------ fin */
  c.part('fin');
  for (let i = 0; i <= 144; i++) {
    const z = CZ + 22 + i;
    const root = 96 + Math.round(30 * (i / 146));
    const chord = Math.max(14, 90 - Math.round(62 * (i / 146)));
    c.box(root + chord - 14, 251, z, root + chord, 261, z + 1, 'team.light');
  }
  c.pivot('fin', [172, 256, CZ + 22]);
  c.parent('fin', 'body');
  c.dynamic('fin');
  c.part('body');

  /* ----------------------------------------------------------------- ramp */
  c.part('ramp');
  c.box(30, 228, CZ - 30, 88, 284, CZ + 24, 'team.dark');            // the ramp itself
  c.box(34, 232, CZ - 26, 84, 280, CZ + 20, 'team.hull');            // inner face
  for (let i = 0; i < 5; i++) {
    const x = 40 + i * 10;
    c.box(x, 234, CZ - 24, x + 3, 278, CZ + 18, 'steel.dark');       // tread strips
  }
  c.box(24, 226, CZ - 32, 34, 286, CZ + 26, 'team.light');           // sill
  c.pivot('ramp', [88, 256, CZ - 30]);
  c.parent('ramp', 'body');
  c.dynamic('ramp');
  c.part('body');

  /* ----------------------------------------------------------- surface pass */
  c.wear(0x3129, 'steel.dark', { rate: 0.02, only: ['team.light'] });
  c.mottle(0x4d17, ['team.dark', 'team.hull'], 0.018, { only: ['team.hull'] });
  return c;
}
