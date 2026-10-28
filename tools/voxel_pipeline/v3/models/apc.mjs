/**
 * Armoured Personnel Carrier — tracked, 16 facings.
 *
 * Reads as an APC and not as a small tank: tall slab-sided troop box, four
 * firing ports a side, a rear ramp, roof hatches, and a *small* ring-mounted
 * machine gun rather than a tank turret. That ring is still segmented
 * (`turret` + `barrel`), so an APC's gun traverses exactly like a tank's.
 */
import {
  hatch, periscope, antenna, crate, louvres, liftingEye, smokeBank, seam, sandbags,
} from '../kit.mjs';
import { trackGear, trackedHull, stowageRail } from '../kit-vehicles.mjs';

const DECK_Z = 168;
const HULL_Y0 = 92, HULL_Y1 = 420;      // track bands
const HALF = 164;

export function buildApc(c) {
  /* ----------------------------------------------------------- running gear */
  const GEAR = {
    x0: 70, x1: 430, z0: 0, z1: 120,
    wheels: [120, 200, 285, 365], wheelR: 40, wheelZ: 58,
    sprocketX: 414, sprocketR: 42, idlerX: 86, idlerR: 40,
    rollers: [170, 260, 340], rollerZ: 112, linkWidth: 9,
  };
  trackGear(c, { side: 'L', ...GEAR, y0: HULL_Y0, y1: HULL_Y0 + 72 });
  trackGear(c, { side: 'R', ...GEAR, y0: HULL_Y1 - 72, y1: HULL_Y1, part: 'running.R' });

  /* ------------------------------------------------------------------ hull */
  trackedHull(c, {
    x0: 96, x1: 404,
    halfW: HALF, lowerHalf: 90,
    bellyZ: 30, deckZ: DECK_Z,
    bevel: 2, bevelH: 36,
    glacis: { run: 66, noseZ: 96 },
    tail: false, nose: false,
  });

  /* --------------------------------------------------------- troop compartment */
  c.part('body');
  // Raised box rear of the driver: the APC's defining mass.
  c.box(150, 256 - HALF, DECK_Z - 4, 372, 256 + HALF, DECK_Z + 74, 'team.hull');
  // Chamfer the top edges rather than leaving a box: two narrowing caps.
  c.box(158, 256 - HALF + 8, DECK_Z + 74, 364, 256 + HALF - 8, DECK_Z + 88, 'team.hull');
  c.box(170, 256 - HALF + 20, DECK_Z + 88, 352, 256 + HALF - 20, DECK_Z + 94, 'team.light');
  // Roof panel seams and the lashing rails.
  for (let x = 176; x < 356; x += 30) {
    c.box(x, 256 - HALF + 2, DECK_Z + 74, x + 2, 256 + HALF - 2, DECK_Z + 76, 'team.dark');
  }
  c.rivets(160, 256 - HALF + 1, DECK_Z + 60, 362, 256 - HALF + 1, DECK_Z + 60, 14, 'steel.dark');
  c.rivets(160, 256 + HALF - 1, DECK_Z + 60, 362, 256 + HALF - 1, DECK_Z + 60, 14, 'steel.dark');

  // Firing ports down both flanks, each with a shutter and a brush seal.
  for (let x = 186; x < 356; x += 44) {
    for (const s of [-1, 1]) {
      const y = 256 + s * HALF;
      const ya = s < 0 ? y - 2 : y - 6, yb = s < 0 ? y + 6 : y + 2;
      c.box(x, ya, DECK_Z + 18, x + 26, yb, DECK_Z + 40, 'steel.dark');
      c.box(x + 4, s < 0 ? ya - 1 : ya, DECK_Z + 24, x + 22, s < 0 ? ya : yb + 1, DECK_Z + 36, 'scorch');
      c.box(x + 2, s < 0 ? ya - 2 : ya, DECK_Z + 12, x + 24, s < 0 ? ya - 1 : yb + 1, DECK_Z + 16, 'steel');
    }
  }

  // Rear ramp with hinge knuckles and a bumper step.
  c.box(140, 256 - 120, 40, 156, 256 + 120, DECK_Z + 70, 'team.dark');
  c.box(138, 256 - 108, 52, 142, 256 + 108, DECK_Z + 56, 'plate');
  for (let i = 0; i < 5; i++) {
    c.box(136, 256 - 96 + i * 48, 56, 140, 256 - 78 + i * 48, DECK_Z + 48, 'steel.dark');
  }
  c.box(128, 256 - 40, 44, 140, 256 + 40, 52, 'steel.dark');   // tow step
  c.cylY(134, 256 - 130, 256 - 116, 96, 14, 'steel.dark');     // spare wheel
  c.cylY(134, 256 + 116, 256 + 130, 96, 14, 'steel.dark');

  // Driver's station: hatch, periscopes, wipers, front tow lugs.
  hatch(c, { cx: 384, cy: 200, z: DECK_Z + 4, r: 30 });
  periscope(c, { x: 392, y: 168, z: DECK_Z + 4, w: 8, h: 5 });
  periscope(c, { x: 392, y: 228, z: DECK_Z + 4, w: 8, h: 5 });
  c.box(360, 180, DECK_Z + 4, 380, 232, DECK_Z + 12, 'steel.dark');
  for (const y of [172, 284]) {
    liftingEye(c, { x: 434, y: y - 6, z: 104 });
    c.cylX(440, 452, y, 124, 12, 'steel.dark');
    c.cylX(452, 454, y, 124, 9, 'lamp.warm');
  }
  c.box(446, 256 - 90, 96, 456, 256 + 90, 108, 'steel.dark');  // nose beam
  // Bolt-on appliqué along the flanks.
  for (const s of [-1, 1]) {
    const y = 256 + s * HALF;
    c.box(170, s < 0 ? y - 6 : y, DECK_Z + 6, 360, s < 0 ? y : y + 6, DECK_Z + 66, 'plate');
  }

  // Engine deck behind the driver (front-right of the box).
  louvres(c, { x0: 372, x1: 402, y0: 168, y1: 344, z: DECK_Z + 4, slat: 6 });
  c.box(366, 160, DECK_Z + 2, 406, 352, DECK_Z + 8, 'steel.dark');
  c.cylZ(392, 176, DECK_Z + 8, DECK_Z + 16, 10, 'brass');

  // Roof kit: stretcher rack, spare track, aerials, stowage.
  c.box(180, 256 - 140, DECK_Z + 94, 300, 256 - 60, DECK_Z + 104, 'plate');
  c.box(180, 256 + 60, DECK_Z + 94, 300, 256 + 140, DECK_Z + 104, 'plate');
  for (let x = 190; x < 300; x += 22) {
    c.box(x, 256 - 140, DECK_Z + 104, x + 8, 256 - 60, DECK_Z + 108, 'steel.dark');
    c.box(x, 256 + 60, DECK_Z + 104, x + 8, 256 + 140, DECK_Z + 108, 'steel.dark');
  }
  crate(c, { x0: 310, y0: 256 - 150, z0: DECK_Z + 94, x1: 360, y1: 256 - 96, z1: DECK_Z + 124,
    mat: 'wood', lid: 'steel.dark' });
  smokeBank(c, { x: 200, y: 256 - 156, z: DECK_Z + 60, dx: 12, dy: 0, part: 'body' });
  smokeBank(c, { x: 200, y: 256 + 156, z: DECK_Z + 60, dx: 12, dy: 0, part: 'body' });
  antenna(c, { x: 348, y: 256 - 130, z: DECK_Z + 94, height: 120 });
  antenna(c, { x: 348, y: 256 + 130, z: DECK_Z + 94, height: 96 });

  /* ------------------------------------------------------- MG ring and gun */
  // The whole ring turns: a cupola, not a turret, so the part is small.
  c.part('turret');
  c.ringZ(316, 256, DECK_Z + 94, DECK_Z + 102, 48, 38, 'steel.dark');
  c.cylZ(316, 256, DECK_Z + 102, DECK_Z + 130, 44, 'team.hull');
  c.cylZ(316, 256, DECK_Z + 130, DECK_Z + 136, 38, 'team.light');
  c.ringZ(316, 256, DECK_Z + 136, DECK_Z + 142, 34, 24, 'steel');
  // Vision blocks around the cupola.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const vx = Math.round(316 + Math.cos(a) * 36);
    const vy = Math.round(256 + Math.sin(a) * 36);
    c.box(vx - 4, vy - 4, DECK_Z + 108, vx + 4, vy + 4, DECK_Z + 120, 'steel.dark');
    c.box(vx - 3, vy - 3, DECK_Z + 111, vx + 3, vy + 3, DECK_Z + 118, 'glass');
  }
  c.pivot('turret', [316, 256, DECK_Z + 94]);
  c.dynamic('turret');
  c.traverse('turret');

  c.part('barrel');
  // Pintle + receiver + barrel: a heavy machine gun, not a cannon.
  c.box(330, 244, DECK_Z + 118, 356, 268, DECK_Z + 138, 'steel.dark');
  c.box(352, 248, DECK_Z + 122, 400, 264, DECK_Z + 134, 'gunmetal');
  c.cylX(396, 438, 256, DECK_Z + 128, 6, 'gunmetal.lit');
  c.cylX(432, 444, 256, DECK_Z + 128, 9, 'steel.dark');
  c.box(356, 250, DECK_Z + 138, 378, 262, DECK_Z + 146, 'steel.dark');   // sights
  c.box(330, 236, DECK_Z + 130, 344, 250, DECK_Z + 142, 'canvas');       // ammo box
  c.pivot('barrel', [336, 256, DECK_Z + 128]);
  c.parent('barrel', 'turret');
  c.dynamic('barrel');
  c.part('body');

  /* --------------------------------------------------------- surface pass */
  c.wear(0x33a1, 'steel.dark', { rate: 0.035, only: ['team.hull', 'team.light', 'plate'] });
  c.mottle(0x917b, ['team.dark', 'team.light'], 0.02, { only: ['team.hull', 'plate'] });
  return c;
}
