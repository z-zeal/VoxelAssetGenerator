/**
 * High-altitude reconnaissance aircraft — `spy-plane`, 16 facings.
 *
 * This is the longest, thinnest aircraft in the set, and the read is entirely
 * about *proportion*: an airframe that looks like it should not hold together.
 *
 *   * **a needle fuselage** — the nose runs a third of the aircraft and the body
 *     never becomes a cabin; at 8× the taper is the silhouette;
 *   * **enormous thin wings set well aft** — high aspect ratio, near-zero
 *     thickness, and mounted behind the cockpit so the nose hangs out front;
 *   * **twin fins on the wingtips** — vertical surfaces at the tips, not on the
 *     tail, which is what makes the planform distinctive.
 *
 * Parts: `body`, `fin` (tip rudder pair, dynamic), `sensor` (camera pallet,
 * dynamic), `nozzles` (engine nozzles, dynamic).
 */
import { liftingEye } from '../kit.mjs';
import {
  fuselage, noseCap, canopy, sideGlass, wingPair, jetPipe, sensorBall,
} from '../kit-air.mjs';

const CZ = 302;

export function buildSpyPlane(c) {
  /* -------------------------------------------------------------- airframe */
  c.part('body');
  fuselage(c, {
    mat: 'team.hull',
    belly: 'team.dark',
    stations: [
      [476, 4, 4, CZ],
      [462, 9, 8, CZ],
      [444, 14, 12, CZ],
      [420, 18, 16, CZ],
      [388, 21, 19, CZ],
      [348, 22, 20, CZ + 1],
      [304, 21, 19, CZ + 1],
      [258, 19, 17, CZ + 2],
      [214, 16, 15, CZ + 3],
      [176, 13, 12, CZ + 5],
      [144, 10, 10, CZ + 8],
    ],
  });
  noseCap(c, { x: 476, dir: 1, halfW: 4, halfH: 4, zMid: CZ, steps: 10, mat: 'team.light' });

  // A tiny, very raked canopy: the crew sits far forward, and the glazing is one
  // band, not a bubble.
  canopy(c, { x0: 430, x1: 456, halfW: 12, z0: CZ + 8, z1: CZ + 22, rake: 12 });
  sideGlass(c, { x0: 404, x1: 430, halfW0: 16, halfW1: 12, z0: CZ + 6, z1: CZ + 16, part: 'body' });

  // Very high aspect ratio wing, set aft so the nose overhangs it by a third of
  // the aircraft. Thin: three voxels at the root, one and a half at the tip.
  wingPair(c, {
    x: 316, halfSpan: 212, chord: 52, thick: 2, sweep: 4, dihedral: 2,
    cz: CZ + 2, mat: 'team.hull', part: 'body',
  });

  // Ventral fin under the tail and the two engine nacelles blended into the body.
  c.box(150, 252, CZ - 34, 210, 260, CZ - 6, 'team.dark');
  for (const s of [-1, 1]) {
    c.cylX(168, 232, 256 + s * 12, CZ + 8, 8, 'team.hull');
  }
  liftingEye(c, { x: 320, y: 250, z: CZ + 20 });

  /* ------------------------------------------------------------------ fin */
  // Wingtip fins: the vertical surfaces live at the tips, laid back hard. Their
  // rudders are the dynamic panel, and they sit outboard of everything else.
  c.part('fin');
  for (const s of [-1, 1]) {
    for (let i = 0; i < 34; i++) {
      const z = CZ + 4 + i;
      const y = 256 + s * (208 + Math.round(i * 0.25));
      const root = 286 + Math.round(i * 1.15);
      c.box(root, Math.min(y, y + s * 3), z, root + 26, Math.max(y, y + s * 3), z + 1, 'team.light');
    }
  }
  c.pivot('fin', [300, 256, CZ + 4]);
  c.parent('fin', 'body');
  c.dynamic('fin');
  c.part('body');

  /* ---------------------------------------------------------------- sensor */
  // Camera pallet under the nose: a flat window in a fairing, which is the only
  // thing this aircraft does.
  c.part('sensor');
  c.box(410, 236, CZ - 26, 452, 276, CZ - 10, 'team.dark');
  c.box(416, 242, CZ - 28, 446, 270, CZ - 24, 'glass.dark');
  c.box(420, 248, CZ - 30, 442, 264, CZ - 28, 'optic');
  c.pivot('sensor', [430, 256, CZ - 26]);
  c.parent('sensor', 'body');
  c.dynamic('sensor');
  c.part('body');

  /* --------------------------------------------------------------- nozzles */
  c.part('nozzles');
  for (const s of [-1, 1]) {
    c.cylX(126, 152, 256 + s * 12, CZ + 8, 9, 'steel.dark');
    c.cylX(130, 146, 256 + s * 12, CZ + 8, 6, 'scorch');
  }
  c.pivot('nozzles', [156, 256, CZ + 8]);
  c.parent('nozzles', 'body');
  c.dynamic('nozzles');
  c.part('body');

  /* ----------------------------------------------------------- surface pass */
  c.wear(0x1c4f, 'steel.dark', { rate: 0.016, only: ['team.light'] });
  c.mottle(0x5e13, ['team.dark', 'team.hull'], 0.014, { only: ['team.hull'] });
  return c;
}
