/**
 * Ground-attack jet — `ground-attack-jet`, 16 facings.
 *
 * Everything about this airframe is the opposite of the fighter's: it is slow,
 * it flies low, and it carries its weapon on the *nose* rather than on pylons.
 *
 *   * **a straight, high-aspect wing** — no sweep at all, because the aircraft is
 *     built to loiter rather than to dash;
 *   * **twin canted fins on wide-set booms** — the tail is the silhouette, and
 *     the booms are what stop it reading as a trainer;
 *   * **a big gun under the nose** — the barrel is the one feature that survives
 *     an 8× downscale, so it is deliberately oversized.
 *
 * Parts: `body`, `fin` (rudder pair, dynamic), `gun` (nose cannon, dynamic),
 * `stores` (bombs, jettisonable).
 */
import { liftingEye } from '../kit.mjs';
import {
  fuselage, noseCap, canopy, sideGlass, wingPair, tailPlane, jetPipe, store,
} from '../kit-air.mjs';

const CZ = 300;

export function buildGroundAttackJet(c) {
  /* -------------------------------------------------------------- airframe */
  c.part('body');
  fuselage(c, {
    mat: 'team.hull',
    belly: 'team.dark',
    stations: [
      [462, 7, 7, CZ],
      [446, 17, 13, CZ],
      [424, 26, 20, CZ + 1],
      [392, 32, 26, CZ + 2],
      [350, 36, 29, CZ + 2],
      [300, 36, 29, CZ + 3],
      [248, 33, 27, CZ + 4],
      [198, 28, 23, CZ + 6],
      [152, 22, 19, CZ + 9],
      [112, 16, 15, CZ + 13],
    ],
  });
  noseCap(c, { x: 462, dir: 1, halfW: 7, halfH: 7, zMid: CZ, steps: 6, mat: 'team.light' });

  canopy(c, { x0: 414, x1: 448, halfW: 20, z0: CZ + 16, z1: CZ + 40, rake: 7 });
  sideGlass(c, { x0: 386, x1: 414, halfW0: 30, halfW1: 34, z0: CZ + 14, z1: CZ + 30, part: 'body' });

  // Straight wing, mounted high, with a visible dihedral break at the tip.
  wingPair(c, {
    x: 330, halfSpan: 198, chord: 66, thick: 4, sweep: 6, dihedral: 6,
    cz: CZ + 14, mat: 'team.hull', part: 'body',
  });

  // Twin booms: two slabs running aft from the wing, each carrying a fin. They
  // are what makes the tail read wide instead of tall.
  for (const s of [-1, 1]) {
    c.box(96, 256 + s * 92 - 7, CZ - 2, 236, 256 + s * 92 + 7, CZ + 12, 'team.hull');
    c.box(96, 256 + s * 92 - 5, CZ + 12, 232, 256 + s * 92 + 5, CZ + 16, 'team.dark');
  }
  tailPlane(c, { x: 132, halfSpan: 112, chord: 34, thick: 3, sweep: 16, cz: CZ + 8, mat: 'team.hull' });

  // Engines high on the rear fuselage: the exhausts are the only heat source a
  // ground-attack aircraft shows from above.
  for (const s of [-1, 1]) {
    c.cylX(176, 226, 256 + s * 34, CZ + 22, 15, 'team.hull');
    jetPipe(c, { x0: 176, x1: 164, cz: CZ + 22, r0: 12, r1: 9 });
  }
  liftingEye(c, { x: 300, y: 250, z: CZ + 30 });

  /* ------------------------------------------------------------------ fin */
  // The rudder pair only: two canted panels, outboard on the booms.
  c.part('fin');
  for (const s of [-1, 1]) {
    for (let i = 0; i < 54; i++) {
      const z = CZ + 14 + i;
      const y = 256 + s * (96 + Math.round(i * 0.30));
      const root = 96 + Math.round(i * 0.16);
      const chord = Math.max(10, 58 - Math.round(i * 0.72));
      c.box(root + chord - 10, Math.min(y, y + s * 3), z, root + chord, Math.max(y, y + s * 3), z + 1, 'team.light');
    }
  }
  c.pivot('fin', [140, 256, CZ + 14]);
  c.parent('fin', 'body');
  c.dynamic('fin');
  c.part('body');

  /* ------------------------------------------------------------------ gun */
  // Nose cannon: a barrel out through the nose ring, deliberately fat.
  c.part('gun');
  c.cylX(408, 470, 256, CZ - 12, 6, 'steel.dark');
  c.cylX(466, 478, 256, CZ - 12, 7, 'gunmetal');
  c.box(404, 246, CZ - 20, 420, 266, CZ - 2, 'gunmetal');
  c.pivot('gun', [410, 256, CZ - 12]);
  c.parent('gun', 'body');
  c.dynamic('gun');
  c.part('body');

  /* --------------------------------------------------------------- stores */
  c.part('stores');
  for (const s of [-1, 1]) {
    store(c, { x: 286, cy: 256 + s * 88, cz: CZ - 16, len: 66, r: 11, kind: 'pod', part: 'stores' });
    store(c, { x: 250, cy: 256 + s * 142, cz: CZ - 14, len: 54, r: 9, kind: 'missile', part: 'stores' });
  }
  c.pivot('stores', [286, 256, CZ - 16]);
  c.parent('stores', 'body');
  c.dynamic('stores');
  c.part('body');

  /* ----------------------------------------------------------- surface pass */
  c.wear(0x2ac1, 'steel.dark', { rate: 0.024, only: ['team.light'] });
  c.mottle(0x7b31, ['team.dark', 'team.hull'], 0.02, { only: ['team.hull'] });
  return c;
}
