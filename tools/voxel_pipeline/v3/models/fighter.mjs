/**
 * Fighter jet — `fighter`, 16 facings. First of the fixed-wing family.
 *
 * The fixed-wing read is different from the rotor one and needs its own three
 * cues:
 *
 *   * **a delta-ish wing with a hard leading-edge sweep** — a straight wing at
 *     this size reads as a transport, so the sweep is what says "fighter";
 *   * **two canted tail fins** — the V arrangement is the silhouette from behind,
 *     which is how a fighter is usually seen chasing something;
 *   * **stores on the wing pylons** — four missiles, which is the only place the
 *     wing has visible thickness from above.
 *
 * It flies high in the canvas (belly ~170) so it lands on a tile as an air unit.
 *
 * Parts: `body`, `fin` (the rudder pair, dynamic), `stores` (jettisonable).
 */
import { liftingEye } from '../kit.mjs';
import {
  fuselage, noseCap, canopy, wingPair, jetPipe, store, tailPlane, sideGlass,
} from '../kit-air.mjs';

const CZ = 300;                 // fuselage centre line
const WING_X = 330;

export function buildFighter(c) {
  /* -------------------------------------------------------------- airframe */
  c.part('body');
  fuselage(c, {
    mat: 'team.hull',
    belly: 'team.dark',
    stations: [
      [466, 6, 6, CZ],
      [444, 18, 14, CZ],
      [414, 30, 22, CZ + 2],
      [372, 40, 30, CZ + 4],
      [320, 44, 34, CZ + 6],
      [260, 42, 32, CZ + 6],
      [206, 36, 28, CZ + 10],
      [160, 28, 22, CZ + 14],
      [118, 20, 16, CZ + 18],
    ],
  });
  noseCap(c, { x: 466, dir: 1, halfW: 6, halfH: 6, zMid: CZ, steps: 6, mat: 'team.light' });

  // Air intakes under the wing roots, and the dorsal spine.
  for (const s of [-1, 1]) {
    c.box(352, 256 + s * 30, CZ - 52, 412, 256 + s * 52, CZ - 6, 'team.dark');
    c.box(352, 256 + s * 34, CZ - 48, 400, 256 + s * 46, CZ - 12, 'iron');
  }
  c.box(210, 248, CZ + 26, 340, 264, CZ + 40, 'team.light');            // spine
  canopy(c, { x0: 398, x1: 434, halfW: 26, z0: CZ + 22, z1: CZ + 56, rake: 7 });
  sideGlass(c, { x0: 374, x1: 398, halfW0: 42, halfW1: 32, z0: CZ + 20, z1: CZ + 42 });

  // Swept wings: the leading edge moves aft as the span grows, which is the one
  // shape cue that separates this from the transport family.
  wingPair(c, { x: WING_X, halfSpan: 164, chord: 58, thick: 4, sweep: 82, cz: CZ - 4, mat: 'team.hull' });
  for (const s of [-1, 1]) {
    store(c, { x: 300, cy: 256 + s * 96, cz: CZ - 22, len: 54, r: 7, kind: 'missile' });
    store(c, { x: 276, cy: 256 + s * 150, cz: CZ - 20, len: 46, r: 6, kind: 'missile' });
  }

  // Twin canted fins and the all-moving tailplanes.
  // Twin fins: root chord at the tail, taper to the tip, canted out ~20°.
  for (const s of [-1, 1]) {
    for (let i = 0; i < 88; i++) {
      const z = CZ + 22 + i;
      const y = 256 + s * (22 + Math.round(i * 0.36));
      const root = 128 + Math.round(i * 0.30);
      const chord = Math.max(10, 74 - Math.round(i * 0.62));
      c.box(root, Math.min(y, y + s * 4), z, root + chord, Math.max(y, y + s * 4), z + 1, 'team.hull');
    }
  }
  for (const s of [-1, 1]) {
    c.box(112, 256 + s * 22, CZ - 2, 168, 256 + s * 88, CZ + 3, 'team.dark');    // tailplane
  }

  // Engine: one big pipe with a lit throat.
  jetPipe(c, { x0: 96, x1: 132, cz: CZ + 16, r0: 30, r1: 24 });
  c.cylX(112, 122, 256, CZ + 16, 18, 'scorch');
  liftingEye(c, { x: 300, y: 250, z: CZ + 40 });

  /* ------------------------------------------------------------------ fin */
  // The rudder only: the fixed fin is body geometry. A whole fin that swings is
  // an aeroplane with a broken spine; a trailing-edge panel that swings is a
  // rudder, and it is what the runtime will actually rotate.
  c.part('fin');
  for (const s of [-1, 1]) {
    for (let i = 0; i < 82; i++) {
      const z = CZ + 26 + i;
      const y = 256 + s * (22 + Math.round(i * 0.36));
      const root = 128 + Math.round(i * 0.30);
      const chord = Math.max(10, 74 - Math.round(i * 0.62));
      c.box(root + chord - 12, Math.min(y, y + s * 4), z, root + chord, Math.max(y, y + s * 4), z + 1, 'team.light');
    }
  }
  c.pivot('fin', [190, 256, CZ + 26]);
  c.parent('fin', 'body');
  c.dynamic('fin');

  /* --------------------------------------------------------------- stores */
  c.part('stores');
  store(c, { x: 322, cy: 256, cz: CZ - 36, len: 66, r: 10, kind: 'missile', part: 'stores' });
  c.pivot('stores', [322, 256, CZ - 36]);
  c.parent('stores', 'body');
  c.dynamic('stores');
  c.part('body');

  /* ----------------------------------------------------------- surface pass */
  c.wear(0x4421, 'steel.dark', { rate: 0.02, only: ['team.light'] });
  c.mottle(0x1187, ['team.dark', 'team.hull'], 0.02, { only: ['team.hull'] });
  return c;
}
