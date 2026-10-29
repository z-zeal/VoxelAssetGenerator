/**
 * Maritime patrol aircraft — `mpa`, 16 facings.
 *
 * A patrol aircraft is judged on the *opposite* cues to a bomber: it is slow,
 * it is long, and it carries its equipment on the outside. So:
 *
 *   * **two big turbofans under a low, straight wing** — not four, and not
 *     swept: the straight low wing is the ASW read, and it also gives the hull
 *     a different silhouette from the bomber's shoulder wing;
 *   * **a sting at the tail** — the magnetic-anomaly boom is the one piece of
 *     equipment everybody recognises on this aircraft, and it is free: it makes
 *     the tail read as long in every facing;
 *   * **stores on the pylons and sonobuoy racks down the flank** — a patrol
 *     aircraft is always photographed loaded, and empty pylons read as a
 *     transport.
 *
 * Parts: `body`, `fin` (rudder, dynamic), `stores` (torpedoes, jettisonable),
 * `boom` (retractable MAD sting, dynamic).
 */
import { liftingEye } from '../kit.mjs';
import {
  fuselage, noseCap, canopy, sideGlass, wingPair, tailPlane, fin, nacelle, jetPipe, store,
} from '../kit-air.mjs';

const CZ = 300;

export function buildMpa(c) {
  /* -------------------------------------------------------------- airframe */
  c.part('body');
  fuselage(c, {
    mat: 'team.hull',
    belly: 'team.dark',
    stations: [
      [470, 6, 6, CZ],
      [456, 13, 11, CZ],
      [436, 20, 16, CZ],
      [408, 26, 21, CZ + 1],
      [368, 30, 24, CZ + 1],
      [316, 31, 25, CZ + 2],
      [262, 30, 24, CZ + 2],
      [208, 28, 22, CZ + 3],
      [156, 25, 20, CZ + 5],
      [112, 20, 17, CZ + 9],
      [78, 14, 13, CZ + 14],
    ],
  });
  noseCap(c, { x: 470, dir: 1, halfW: 6, halfH: 6, zMid: CZ, steps: 6, mat: 'team.light' });

  // Flight deck: a low, raked window band rather than a hull window, and a
  // radome chin under the nose — the two things that separate it from a
  // transport at 8× without adding parts.
  canopy(c, { x0: 442, x1: 464, halfW: 16, z0: CZ + 4, z1: CZ + 20, rake: 7 });
  sideGlass(c, { x0: 408, x1: 442, halfW0: 25, halfW1: 27, z0: CZ + 6, z1: CZ + 18, part: 'body' });
  c.box(452, 244, CZ - 26, 476, 268, CZ - 4, 'team.dark');
  c.box(456, 248, CZ - 24, 472, 264, CZ - 8, 'glass.dark');

  // Low straight wing: the ASW signature, and the reason the fuselage sits on
  // top of the wing instead of hanging under it.
  wingPair(c, {
    x: 344, halfSpan: 188, chord: 66, thick: 3, sweep: 16, dihedral: 3,
    cz: CZ - 12, mat: 'team.hull', part: 'body',
  });

  // Two turbofans, close in.
  for (const s of [-1, 1]) {
    const zWing = CZ - 12 + Math.round(3 * (108 / 188)) - 18;
    nacelle(c, { x0: 316, x1: 232, cy: 256 + s * 108, cz: zWing, r: 17, pylonTo: zWing + 18 });
    jetPipe(c, { x0: 232, x1: 242, cz: zWing, r0: 13, r1: 10 });
  }

  // Tailplane, fin, and the sonobuoy racks down the flank: 12 launcher tubes a
  // side, which read as equipment rather than as panelling.
  tailPlane(c, { x: 176, halfSpan: 112, chord: 40, thick: 3, sweep: 30, cz: CZ + 6, mat: 'team.hull' });
  fin(c, { x0: 96, x1: 178, z0: CZ + 12, z1: CZ + 138, rake: 34, thick: 5, mat: 'team.hull', tipMat: 'team.dark' });
  for (const s of [-1, 1]) {
    for (let i = 0; i < 12; i++) {
      const x = 226 + i * 12;
      c.box(x, 256 + s * 26, CZ - 20, x + 7, 256 + s * 31, CZ - 10, 'gunmetal');
    }
  }
  liftingEye(c, { x: 316, y: 250, z: CZ + 28 });

  /* ------------------------------------------------------------------ fin */
  c.part('fin');
  for (let i = 0; i <= 122; i++) {
    const z = CZ + 14 + i;
    const root = 96 + Math.round(34 * (i / 126));
    const chord = Math.max(12, 82 - Math.round(62 * (i / 126)));
    c.box(root + chord - 13, 251, z, root + chord, 261, z + 1, 'team.light');
  }
  c.pivot('fin', [158, 256, CZ + 14]);
  c.parent('fin', 'body');
  c.dynamic('fin');
  c.part('body');

  /* --------------------------------------------------------------- stores */
  c.part('stores');
  for (const s of [-1, 1]) {
    store(c, { x: 250, cy: 256 + s * 84, cz: CZ - 34, len: 62, r: 9, kind: 'missile', part: 'stores' });
  }
  c.pivot('stores', [250, 256, CZ - 34]);
  c.parent('stores', 'body');
  c.dynamic('stores');
  c.part('body');

  /* ----------------------------------------------------------------- boom */
  // The MAD sting: the tail cone ends in a slim probe that retracts forward into
  // the fuselage. Modelled as its own part so a runtime can slide it in and out
  // without a re-bake.
  c.part('boom');
  c.cylX(46, 104, 256, CZ + 18, 7, 'steel.bright');
  c.cylX(34, 48, 256, CZ + 18, 4, 'gunmetal');
  c.box(30, 253, CZ + 15, 40, 259, CZ + 21, 'lamp.red');
  c.pivot('boom', [104, 256, CZ + 18]);
  c.parent('boom', 'body');
  c.dynamic('boom');
  c.part('body');

  /* ----------------------------------------------------------- surface pass */
  c.wear(0x6a13, 'steel.dark', { rate: 0.02, only: ['team.light'] });
  c.mottle(0x3c27, ['team.dark', 'team.hull'], 0.018, { only: ['team.hull'] });
  return c;
}
