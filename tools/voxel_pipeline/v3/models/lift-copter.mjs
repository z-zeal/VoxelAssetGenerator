/**
 * Lift helicopter — `lift-copter`, 16 facings.
 *
 * A tandem-rotor heavy lifter: two discs, one at each end of a long cargo box,
 * which is what separates it at a glance from `copter`'s single disc and tapered
 * nose. The two rotors are set far apart on purpose. Their discs overlap a
 * little in reality, and at sprite scale overlapping discs turn into one grey
 * smudge, so the hubs sit ~240 voxels apart with 130-voxel blades: close enough
 * to read as a tandem, far enough that each disc keeps its own outline.
 *
 * The rear ramp is its own part with its hinge on the bottom aft edge, so the
 * runtime can drop it; the cargo hook is geometry on the body.
 *
 * Parts: `body`, `rotor.front`, `rotor.rear`, `ramp`.
 */
import { antenna, liftingEye, crate, louvres } from '../kit.mjs';
import {
  fuselage, canopy, rotor, skids, fin, bellyHook, tailPlane, sideGlass,
} from '../kit-air.mjs';

const BELLY = 196;          // cargo floor; the machine is airborne
const DECK = BELLY + 76;    // top of the cabin box / engine deck base
const FRONT_HUB = 388;
const REAR_HUB = 148;
const ROTOR_R = 130;
const HUB_Z = DECK + 58;

export function buildLiftCopter(c) {
  /* -------------------------------------------------------------- airframe */
  c.part('body');
  fuselage(c, {
    mat: 'team.hull',
    belly: 'team.dark',
    stations: [
      [456, 14, 14, BELLY + 34],
      [432, 34, 26, BELLY + 32],
      [404, 48, 36, BELLY + 34],
      [372, 50, 38, BELLY + 38],
      [250, 50, 38, BELLY + 38],
      [176, 46, 34, BELLY + 40],
      [132, 32, 24, BELLY + 48],
      [92, 20, 15, BELLY + 60],
      [64, 12, 10, BELLY + 68],
    ],
  });

  // Engine deck: a low dark spine the two masts rise from, not a superstructure.
  c.box(150, 214, DECK, 392, 298, DECK + 26, 'team.dark');
  c.box(352, 226, DECK + 26, 404, 286, DECK + 34, 'steel.dark');        // front gearbox
  c.box(154, 226, DECK + 26, 206, 286, DECK + 34, 'steel.dark');        // rear gearbox
  louvres(c, { x0: 250, x1: 330, y0: 220, y1: 292, z: DECK + 22, slat: 5 });
  for (const s of [-1, 1]) c.cylX(178, 202, 256 + s * 34, DECK + 6, 12, 'iron');

  // Cockpit: a wide two-seat greenhouse stepping down to the nose.
  canopy(c, { x0: 416, x1: 448, halfW: 30, z0: BELLY + 50, z1: BELLY + 88, rake: 6 });
  sideGlass(c, { x0: 408, x1: 434, halfW0: 46, halfW1: 34, z0: BELLY + 50, z1: BELLY + 80 });

  // Cabin: sliding doors, windows and the frame lines the box needs to stop
  // reading as a shipping container.
  for (const s of [-1, 1]) {
    const y = 256 + s * 50;
    c.box(232, y - 2, BELLY + 8, 318, y + 2, DECK - 4, 'team.dark');           // door
    c.box(240, y - 3, BELLY + 44, 252, y + 3, BELLY + 64, 'glass.dark');       // window
    c.box(292, y - 3, BELLY + 44, 304, y + 3, BELLY + 64, 'glass.dark');
    for (const x of [214, 226, 322, 334, 356]) c.box(x, y - 2, BELLY + 6, x + 3, y + 2, DECK - 2, 'team.light');
  }
  c.box(200, 206, DECK - 2, 392, 306, DECK, 'team.light');                     // roof band

  // Sponsons with the main wheels, so it sits on something.
  for (const s of [-1, 1]) {
    c.box(300, 256 + s * 48, BELLY - 24, 384, 256 + s * 76, BELLY + 6, 'team.dark');
    c.cylY(338, 256 + s * 62, 256 + s * 82, BELLY - 6, 24, 'tyre');
    c.cylY(338, 256 + s * 80, 256 + s * 84, BELLY - 6, 14, 'steel.dark');
  }
  skids(c, { x0: 120, x1: 240, halfW: 44, z: BELLY - 40 });
  c.box(86, 244, BELLY + 34, 122, 268, BELLY + 58, 'steel.dark');               // tail bumper

  // Long tail: swept fin with the stabiliser halfway up it.
  fin(c, { x0: 46, x1: 112, z0: DECK - 10, z1: DECK + 118, rake: 20, thick: 5 });
  tailPlane(c, { x: 58, halfSpan: 56, chord: 24, thick: 4, cz: DECK + 20, mat: 'team.hull' });
  antenna(c, { x: 84, y: 262, z: DECK + 40, height: 44 });

  bellyHook(c, { x: 268, cz: BELLY, part: 'body' });
  crate(c, { x0: 330, y0: 220, z0: DECK + 26, x1: 372, y1: 292, z1: DECK + 44, mat: 'canvas' });
  liftingEye(c, { x: 416, y: 250, z: DECK + 26 });
  c.box(434, 248, BELLY + 58, 450, 264, BELLY + 70, 'lamp.warm');              // searchlight

  /* ------------------------------------------------------------- main discs */
  rotor(c, {
    cx: FRONT_HUB, cy: 256, z: HUB_Z, radius: ROTOR_R, blades: 3, chord: 15,
    phase: 0.4, mastZ: DECK + 34, part: 'rotor.front',
  });
  c.pivot('rotor.front', [FRONT_HUB, 256, HUB_Z]);
  c.dynamic('rotor.front');

  rotor(c, {
    cx: REAR_HUB, cy: 256, z: HUB_Z, radius: ROTOR_R, blades: 3, chord: 15,
    phase: 1.1, mastZ: DECK + 34, part: 'rotor.rear',
  });
  c.pivot('rotor.rear', [REAR_HUB, 256, HUB_Z]);
  c.dynamic('rotor.rear');

  /* ------------------------------------------------------------------ ramp */
  // Hinged along its bottom aft edge, so opening it swings the panel down and
  // back rather than sliding it out of the cabin.
  c.part('ramp');
  for (let i = 0; i < 54; i++) {
    const drop = Math.round(i * 0.45);
    c.box(96 + i, 222, BELLY + 4 - drop, 96 + i + 1, 290, BELLY + 14 - drop, 'plate');
  }
  c.box(96, 218, BELLY - 4, 150, 294, BELLY + 4, 'steel.dark');                 // hinge beam
  for (const y of [232, 280]) c.box(146, y - 2, BELLY + 8, 150, y + 2, BELLY + 16, 'steel');
  c.pivot('ramp', [150, 256, BELLY + 6]);
  c.parent('ramp', 'body');
  c.dynamic('ramp');
  c.part('body');

  /* ----------------------------------------------------------- surface pass */
  c.wear(0x71a3, 'steel.dark', { rate: 0.03, only: ['team.light', 'plate'] });
  c.mottle(0x3c07, ['team.dark', 'team.hull'], 0.028, { only: ['team.hull'] });
  return c;
}
