/**
 * Gunship — `specter`, 16 facings.
 *
 * A gunship is a transport with its guns *outside*, and everything about the
 * model has to serve that one read: the aircraft is a fat straight-line
 * turboprop, and the silhouette is a row of barrels sticking out of one flank.
 *
 *   * **four turboprops on a high straight wing** — a gunship circles slowly, so
 *     the wing is straight and the props are big; they are also the only thing
 *     that says "slow" at 8×;
 *   * **one gun out of the left flank, one out of the right-front** — the battery
 *     is asymmetric on purpose. A symmetric arrangement of barrels reads as a
 *     fighter with pylons;
 *   * **a fat tail with the fin set high** — the cabin is the shape, and a
 *     tapering tail would make it a bomber.
 *
 * Parts: `body`, `fin` (rudder, dynamic), `props` (four discs, dynamic),
 * `guns` (side battery, dynamic).
 */
import { liftingEye } from '../kit.mjs';
import {
  fuselage, noseCap, canopy, sideGlass, wingPair, tailPlane, fin, nacelle, propDisc,
} from '../kit-air.mjs';

const CZ = 300;

export function buildSpecter(c) {
  /* -------------------------------------------------------------- airframe */
  c.part('body');
  fuselage(c, {
    mat: 'team.hull',
    belly: 'team.dark',
    stations: [
      [466, 7, 7, CZ],
      [452, 15, 12, CZ],
      [432, 23, 18, CZ],
      [404, 29, 23, CZ + 1],
      [362, 33, 27, CZ + 1],
      [306, 34, 29, CZ + 2],
      [250, 33, 28, CZ + 2],
      [196, 30, 25, CZ + 3],
      [148, 25, 21, CZ + 6],
      [108, 18, 16, CZ + 10],
      [74, 12, 12, CZ + 16],
    ],
  });
  noseCap(c, { x: 466, dir: 1, halfW: 7, halfH: 7, zMid: CZ, steps: 7, mat: 'team.light' });

  canopy(c, { x0: 436, x1: 460, halfW: 18, z0: CZ + 6, z1: CZ + 24, rake: 8 });
  sideGlass(c, { x0: 396, x1: 436, halfW0: 27, halfW1: 30, z0: CZ + 8, z1: CZ + 20, part: 'body' });

  // High straight wing — over the fuselage, not through it.
  wingPair(c, {
    x: 352, halfSpan: 196, chord: 62, thick: 3, sweep: 8, dihedral: 6,
    cz: CZ + 26, mat: 'team.hull', part: 'body',
  });

  // Four nacelles with tractor props. The discs are their own part so a runtime
  // can spin them without re-baking, and the outer pair sits a little higher
  // because the wing does.
  for (const [cy, dx, r] of [[96, 0, 15], [178, 10, 14]]) {
    for (const s of [-1, 1]) {
      const zWing = CZ + 26 + Math.round(6 * (cy / 196));
      const x0 = 330 - dx - Math.round(8 * (cy / 196));
      nacelle(c, { x0, x1: x0 - 86, cy: 256 + s * cy, cz: zWing - r - 1, r, pylonTo: zWing });
      propDisc(c, { x: x0 + 2, cy: 256 + s * cy, cz: zWing - r - 1, radius: 30, blades: 4, part: 'props', mat: 'steel.dark' });
    }
  }

  tailPlane(c, { x: 186, halfSpan: 120, chord: 42, thick: 3, sweep: 34, cz: CZ + 10, mat: 'team.hull' });
  fin(c, { x0: 96, x1: 186, z0: CZ + 16, z1: CZ + 146, rake: 38, thick: 5, mat: 'team.hull', tipMat: 'team.dark' });
  liftingEye(c, { x: 300, y: 250, z: CZ + 34 });

  /* ------------------------------------------------------------------ fin */
  c.part('fin');
  for (let i = 0; i <= 128; i++) {
    const z = CZ + 18 + i;
    const root = 96 + Math.round(38 * (i / 130));
    const chord = Math.max(12, 88 - Math.round(66 * (i / 130)));
    c.box(root + chord - 13, 251, z, root + chord, 261, z + 1, 'team.light');
  }
  c.pivot('fin', [170, 256, CZ + 18]);
  c.parent('fin', 'body');
  c.dynamic('fin');
  c.part('body');

  /* ----------------------------------------------------------------- guns */
  // The battery: two barrels out of the left flank and one out of the right
  // front, all of them pointing SIDEWAYS (along Y). A gunship's guns do not point
  // where the aeroplane is going, and a barrel that points forward reads as a
  // cannon on a fighter. Each sits in a sponson so it does not look welded on,
  // and every barrel has to clear the hull (half-width ~33 at the cabin) or the
  // cull pass eats it and the part comes out empty.
  c.part('guns');
  c.box(266, 216, CZ - 16, 312, 230, CZ + 6, 'team.dark');          // left sponson
  for (const dz of [-8, 4]) {
    c.cylY(276, 190, 220, CZ + dz, 3, 'steel.dark');
    c.cylY(276, 182, 192, CZ + dz, 4, 'gunmetal');
  }
  c.box(348, 286, CZ - 12, 384, 296, CZ + 2, 'team.dark');          // right-front mount
  c.cylY(360, 310, 340, CZ - 4, 3, 'steel.dark');
  c.cylY(360, 340, 350, CZ - 4, 4, 'gunmetal');
  c.pivot('guns', [280, 224, CZ - 4]);
  c.parent('guns', 'body');
  c.dynamic('guns');
  c.part('body');

  /* ----------------------------------------------------------- surface pass */
  c.wear(0x77c3, 'steel.dark', { rate: 0.022, only: ['team.light'] });
  c.mottle(0x1e5d, ['team.dark', 'team.hull'], 0.02, { only: ['team.hull'] });
  return c;
}
