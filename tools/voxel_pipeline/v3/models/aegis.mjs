/**
 * Aegis — wheeled, 16 facings.
 *
 * The heavy wheeled air-defence vehicle: eight wheels, a low armoured hull, and a
 * **flat radiating array** on a turntable rather than a dish. That is what
 * separates it from the tracked `antiair` (open turret, twin elevated guns) and
 * from `missiles` (tall canisters on a truck): the Aegis is a slab of electronics
 * that happens to drive, and its silhouette is low and wide with a stepped face.
 *
 * `turret` traverses, `barrel` is the array so its tilt can be animated.
 */
import { hatch, periscope, antenna, crate, louvres, liftingEye, smokeBank, basketRack } from '../kit.mjs';
import { wheeledHull, axleGear, bumper, windscreen } from '../kit-wheeled.mjs';

const DECK_Z = 150;
const SILL_Z = 104;
const HALF = 150;
const AXLE_R = 52;
const AXLE_Z = [372, 316, 200, 144];
const TURRET_X = 268;
const TTOP = DECK_Z + 74;

export function buildAegis(c) {
  /* ------------------------------------------------------------ running gear */
  for (const [side, y0, y1, innerY] of [['L', 118, 178, 184], ['R', 334, 394, 328]]) {
    axleGear(c, { side, axles: AXLE_Z, y0, y1, innerY, r: AXLE_R });
  }

  /* -------------------------------------------------------------------- hull */
  wheeledHull(c, {
    x0: 96, x1: 424,
    halfW: HALF, chassisHalf: 104,
    bellyZ: 40, sillZ: SILL_Z, deckZ: DECK_Z,
    bevel: 3, bevelH: 52,
    glacis: { run: 36, noseZ: 118 },
    tail: true,
  });

  c.part('body');
  bumper(c, { x: 452, halfW: 136, z: 104 });
  // Armour: appliqué down both flanks and a bolted nose, matching its "medium"
  // armour rating against the light trucks.
  for (const s of [-1, 1]) {
    for (let x = 130; x < 400; x += 54) {
      c.box(x, 256 + s * (HALF - 4), SILL_Z + 4, x + 46, 256 + s * (HALF + 8), DECK_Z - 10, 'plate');
      c.bolts(x + 23, 256 + s * (HALF + 8), DECK_Z - 34, 16, 4, 'steel.dark', 3);
    }
  }
  for (const s of [-1, 1]) {
    c.box(414, 256 + s * 122, SILL_Z + 6, 448, 256 + s * 134, 136, 'steel.dark');   // headlamp pods
    c.box(446, 256 + s * 124, 116, 452, 256 + s * 132, 130, 'lamp.warm');
  }

  // Driver's station, forward of the turret ring.
  c.box(392, 168, DECK_Z, 428, 250, DECK_Z + 28, 'team.dark');
  hatch(c, { cx: 410, cy: 208, z: DECK_Z + 28, r: 22 });
  periscope(c, { x: 418, y: 190, z: DECK_Z + 28, w: 8, h: 5 });
  c.box(400, 268, DECK_Z, 428, 336, DECK_Z + 24, 'team.dark');                       // co-driver box
  louvres(c, { x0: 128, x1: 196, y0: 150, y1: 362, z: DECK_Z + 4, slat: 6 });        // cooling

  // Generator set at the rear, with its exhaust stack and cable runs forward.
  c.box(104, 166, DECK_Z, 174, 346, DECK_Z + 46, 'steel.dark');
  louvres(c, { x0: 112, x1: 168, y0: 174, y1: 252, z: DECK_Z + 46, slat: 5 });
  louvres(c, { x0: 112, x1: 168, y0: 260, y1: 338, z: DECK_Z + 46, slat: 5 });
  c.cylZ(112, 356, DECK_Z - 10, DECK_Z + 76, 9, 'steel.dark');
  c.cylZ(112, 356, DECK_Z + 76, DECK_Z + 82, 6, 'scorch');
  for (const s of [-1, 1]) {
    c.cylX(176, 240, 256 + s * 118, DECK_Z + 30, 20, 'steel');                       // fuel drums
    c.cylX(180, 236, 256 + s * 118, DECK_Z + 30, 11, 'steel.bright');
  }

  /* ----------------------------------------------------------------- turret */
  c.part('turret');
  c.cylZ(TURRET_X, 256, DECK_Z, DECK_Z + 14, 108, 'steel.dark');
  c.ringZ(TURRET_X, 256, DECK_Z + 14, DECK_Z + 22, 108, 84, 'steel');
  c.bolts(TURRET_X, 256, DECK_Z + 16, 100, 20, 'steel.bright', 3);
  // Low, flat, stepped shell — an equipment box, not a cast dome.
  c.box(TURRET_X - 92, 172, DECK_Z + 20, TURRET_X + 92, 340, DECK_Z + 52, 'team.hull');
  c.box(TURRET_X - 78, 184, DECK_Z + 52, TURRET_X + 78, 328, TTOP, 'team.hull');
  c.box(TURRET_X - 70, 192, TTOP, TURRET_X + 70, 320, TTOP + 8, 'team.light');
  c.box(TURRET_X - 76, 178, DECK_Z + 60, TURRET_X + 76, 334, DECK_Z + 66, 'team.accent');
  // Operator hatch and sight at the rear of the box.
  hatch(c, { cx: TURRET_X - 44, cy: 256, z: TTOP + 8, r: 22, part: 'turret' });
  c.box(TURRET_X + 46, 226, TTOP, TURRET_X + 84, 286, TTOP + 22, 'steel.dark');
  c.box(TURRET_X + 82, 234, TTOP + 4, TURRET_X + 90, 278, TTOP + 18, 'optic');
  c.pivot('turret', [TURRET_X, 256, DECK_Z]);
  c.dynamic('turret');
  c.traverse('turret');

  /* ------------------------------------------------------------- flat array */
  // The radiating face: a stepped, tilted plate with a grid of element squares.
  // Tilted by building it as horizontal strips that step back as they rise.
  c.part('barrel');
  const AX = TURRET_X + 92;
  for (let i = 0; i < 34; i++) {
    const z = DECK_Z + 26 + i * 2;
    const k = Math.round(i * 0.55);
    c.box(AX - 8 + k, 186, z, AX + 12 + k, 326, z + 2, 'plate.dark');
  }
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 7; j++) {
      const z = DECK_Z + 32 + i * 7;
      const y = 196 + j * 18;
      const k = Math.round((z - DECK_Z - 26) * 0.275);
      c.box(AX + 4 + k, y, z, AX + 14 + k, y + 11, z + 5, 'lamp.cyan');      // elements
      c.box(AX + 5 + k, y + 1, z + 1, AX + 13 + k, y + 10, z + 4, 'steel.dark');
    }
  }
  // Back frame and its mounting arms to the turret face.
  c.box(AX - 16, 184, DECK_Z + 20, AX - 4, 328, DECK_Z + 96, 'steel.dark');
  for (const y of [196, 316]) {
    c.box(AX - 30, y - 10, DECK_Z + 30, AX - 10, y + 10, DECK_Z + 90, 'plate');
  }
  c.pivot('barrel', [AX - 10, 256, DECK_Z + 58]);
  c.parent('barrel', 'turret');
  c.dynamic('barrel');
  c.part('body');

  antenna(c, { x: TURRET_X - 64, y: 300, z: TTOP + 8, height: 92 });
  smokeBank(c, { x: TURRET_X + 80, y: 190, z: DECK_Z + 24, dx: -8, dy: 12, part: 'turret' });

  /* ----------------------------------------------------------- surface pass */
  c.wear(0x1f6d, 'plate.dark', { rate: 0.03, only: ['plate', 'team.hull', 'team.light'] });
  c.mottle(0x6c2a, ['team.dark', 'team.light'], 0.02, { only: ['team.hull', 'plate'] });
  return c;
}
