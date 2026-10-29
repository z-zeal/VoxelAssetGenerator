/**
 * Strategic bomber — `bomber`, 16 facings. Second of the fixed-wing family.
 *
 * The bomber must not read as a scaled-up fighter, and the three cues that keep
 * it distinct are all about mass rather than detail:
 *
 *   * **four nacelles bunched under a long, gently swept wing** — engine count
 *     is the fastest "heavy" read there is, and four pods spread the wing's
 *     thickness out where the wing is thinnest;
 *   * **a deep, straight-sided fuselage with no waisted tail** — a fighter tapers
 *     to a point at the back, a bomber stays fat until the tail cone;
 *   * **one tall fin, not twin canted plates** — the single fin is the silhouette
 *     a bomber is recognised by from the quarter views.
 *
 * It also carries the first *airborne* traverse: the tail turret swings on the
 * unit ring like a tank turret does, with the guns as a child part, so the
 * traverse contract is exercised on a moving airframe rather than only on a
 * building.
 *
 * It flies high in the canvas (belly ~250) so it lands on a tile as an air unit.
 *
 * Parts: `body`, `fin` (rudder, dynamic), `stores` (bombs, jettisonable),
 * `tail-turret` (traverse), `guns` (child of the turret, traverse).
 */
import { liftingEye } from '../kit.mjs';
import {
  fuselage, noseCap, canopy, sideGlass, wingPair, tailPlane, fin, nacelle, jetPipe, store,
} from '../kit-air.mjs';

const CZ = 300;                  // fuselage centre line
const TURRET_X = 96;             // tail turret, just ahead of the cone

export function buildBomber(c) {
  /* -------------------------------------------------------------- airframe */
  c.part('body');
  fuselage(c, {
    mat: 'team.hull',
    belly: 'team.dark',
    stations: [
      [468, 6, 6, CZ],
      [452, 14, 12, CZ],
      [432, 22, 17, CZ + 1],
      [402, 29, 23, CZ + 2],
      [356, 34, 27, CZ + 2],
      [300, 36, 28, CZ + 2],
      [244, 34, 27, CZ + 3],
      [188, 30, 24, CZ + 5],
      [140, 25, 21, CZ + 8],
      [104, 20, 18, CZ + 12],
      [74, 14, 14, CZ + 18],
    ],
  });
  noseCap(c, { x: 468, dir: 1, halfW: 6, halfH: 6, zMid: CZ, steps: 6, mat: 'team.light' });

  // Glasshouse nose: a bomber crew sits behind a framed nose, not under a
  // bubble, and that band of glass across the front is worth more of the read
  // than any panel line on the fuselage.
  canopy(c, { x0: 436, x1: 462, halfW: 20, z0: CZ + 6, z1: CZ + 26, rake: 10 });
  sideGlass(c, { x0: 396, x1: 436, halfW0: 30, halfW1: 34, z0: CZ + 8, z1: CZ + 24, part: 'body' });

  // Dorsal spine and the astrodome: the two details that say "long mission".
  c.box(236, 246, CZ + 24, 372, 266, CZ + 34, 'team.light');
  c.cylZ(320, 256, CZ + 34, CZ + 40, 8, 'glass.dark');

  // Shoulder wing, long and only lightly swept: the span is the point, so the
  // sweep stays modest and the dihedral does the visual work.
  wingPair(c, {
    x: 372, halfSpan: 196, chord: 70, thick: 3, sweep: 54, dihedral: 9,
    cz: CZ + 20, mat: 'team.hull', part: 'body',
  });

  // Four nacelles on the wing, inboard pair further forward — the stagger is
  // what stops four pods from reading as a row of identical tubes.
  for (const [cy, dx, r] of [[82, 0, 16], [176, 14, 14]]) {
    for (const s of [-1, 1]) {
      // Wing underside at this span, so the pod hangs off it rather than through it.
      const zWing = CZ + 20 + Math.round(9 * (cy / 196));
      const x0 = 348 - dx - Math.round(54 * (cy / 196));
      nacelle(c, {
        x0, x1: x0 - 92, cy: 256 + s * cy, cz: zWing - r - 1, r, pylonTo: zWing,
      });
      jetPipe(c, { x0: x0 - 92, x1: x0 - 82, cz: zWing - r - 1, r0: Math.max(4, r - 4), r1: Math.max(3, r - 7) });
    }
  }

  // Tailplanes and the fixed fin. The fin's trailing edge is `fin` (the rudder),
  // so the fixed part stops short of it.
  tailPlane(c, { x: 196, halfSpan: 128, chord: 44, thick: 3, sweep: 40, cz: CZ + 12, mat: 'team.hull' });
  fin(c, { x0: 96, x1: 196, z0: CZ + 18, z1: CZ + 152, rake: 42, thick: 5, mat: 'team.hull', tipMat: 'team.dark' });
  c.box(150, 252, CZ + 152, 190, 260, CZ + 156, 'lamp.red');
  liftingEye(c, { x: 320, y: 250, z: CZ + 34 });

  /* ------------------------------------------------------------------ fin */
  // Rudder: the trailing-edge panel only. A fin that swings whole is an
  // aeroplane with a broken spine.
  c.part('fin');
  for (let i = 0; i <= 130; i++) {
    const z = CZ + 20 + i;
    const root = 96 + Math.round(42 * (i / 134));
    const chord = Math.max(14, 96 - Math.round(72 * (i / 134)));
    c.box(root + chord - 14, 251, z, root + chord, 261, z + 1, 'team.light');
  }
  c.pivot('fin', [176, 256, CZ + 20]);
  c.parent('fin', 'body');
  c.dynamic('fin');
  c.part('body');

  /* --------------------------------------------------------------- stores */
  // Two bombs under the inboard wing: the only visible thickness the wing has
  // from above, and the reason the bomb bay doors are not modelled as a part.
  c.part('stores');
  for (const s of [-1, 1]) {
    store(c, { x: 214, cy: 256 + s * 120, cz: CZ - 4, len: 74, r: 10, kind: 'pod', part: 'stores' });
  }
  c.pivot('stores', [214, 256, CZ - 4]);
  c.parent('stores', 'body');
  c.dynamic('stores');
  c.part('body');

  /* ---------------------------------------------------------- tail-turret */
  // A ball turret under the tail cone: glassed front, armoured back, and the
  // traverse ring at the fuselage centre line so a yaw is a yaw.
  c.part('tail-turret');
  c.cylX(TURRET_X - 26, TURRET_X + 22, 256, CZ + 4, 20, 'team.dark');
  c.cylX(TURRET_X - 22, TURRET_X + 6, 256, CZ + 4, 15, 'glass.dark');
  c.box(TURRET_X + 8, 244, CZ - 4, TURRET_X + 24, 268, CZ + 14, 'team.dark');
  c.pivot('tail-turret', [TURRET_X, 256, CZ + 4]);
  c.parent('tail-turret', 'body');
  c.dynamic('tail-turret');
  c.traverse('tail-turret');

  /* ----------------------------------------------------------------- guns */
  c.part('guns');
  for (const s of [-1, 1]) {
    c.cylX(TURRET_X - 74, TURRET_X - 20, 256 + s * 7, CZ + 8, 3, 'steel.dark');
    c.cylX(TURRET_X - 82, TURRET_X - 72, 256 + s * 7, CZ + 8, 4, 'gunmetal');
  }
  c.box(TURRET_X - 20, 246, CZ, TURRET_X - 8, 266, CZ + 16, 'gunmetal');
  c.pivot('guns', [TURRET_X - 20, 256, CZ + 8]);
  c.parent('guns', 'tail-turret');
  c.dynamic('guns');
  c.traverse('guns');
  c.part('body');

  /* ----------------------------------------------------------- surface pass */
  c.wear(0x5b09, 'steel.dark', { rate: 0.018, only: ['team.light'] });
  c.mottle(0x2f41, ['team.dark', 'team.hull'], 0.02, { only: ['team.hull'] });
  return c;
}
