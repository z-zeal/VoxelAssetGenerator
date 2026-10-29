/**
 * Mobile Repair Vehicle — tracked, 16 facings.
 *
 * A recovery wagon, not a fighting vehicle: the hull carries a **workshop box**
 * with an open side, and the whole back of the vehicle is a **crane** — a
 * lattice boom on an A-frame with a hook block and cable. Nothing else in the
 * family has a structure standing above the roofline at that angle, so the
 * silhouette is unmistakable even head-on.
 *
 * `crane` is the segmented part, pivoted at the heel of the boom. The hook block
 * rides with it (one rigid assembly) rather than being a child part, because a
 * child only orbits when its parent *traverses*, and nothing traverses here.
 */
import {
  hatch, periscope, antenna, crate, louvres, liftingEye, cable, seam, basketRack,
} from '../kit.mjs';
import { trackGear, trackedHull, stowageRail } from '../kit-vehicles.mjs';

const DECK_Z = 144;
const HALF = 152;
const HEEL_X = 150;              // boom heel, forward, so the boom reaches aft
const HEEL_Z = DECK_Z + 96;

export function buildMobileRepair(c) {
  /* ----------------------------------------------------------- running gear */
  const GEAR = {
    x0: 42, x1: 456, z0: 0, z1: 124,
    wheels: [104, 182, 260, 338, 416], wheelR: 44, wheelZ: 62,
    sprocketX: 438, sprocketR: 47, idlerX: 60, idlerR: 44,
    rollers: [148, 244, 336], rollerZ: 116, linkWidth: 10,
  };
  trackGear(c, { side: 'L', ...GEAR, y0: 82, y1: 156 });
  trackGear(c, { side: 'R', ...GEAR, y0: 356, y1: 430, part: 'running.R' });

  /* ------------------------------------------------------------------ hull */
  trackedHull(c, {
    x0: 80, x1: 424,
    halfW: HALF, lowerHalf: 106,
    bellyZ: 26, deckZ: DECK_Z,
    bevel: 3, bevelH: 52,
    glacis: { run: 40, noseZ: 102 },
    tail: false, nose: false,
  });

  c.part('body');
  /* -------------------------------------------------------- workshop body */
  // Tall box with an open servicing bay on the +Y flank: the opening and the
  // stuff hanging out of it is what says "workshop" instead of "bunker".
  c.box(196, 176, DECK_Z, 388, 336, DECK_Z + 78, 'team.hull');
  c.box(200, 180, DECK_Z + 78, 384, 332, DECK_Z + 86, 'team.light');
  c.box(196, 336, DECK_Z + 12, 388, 340, DECK_Z + 66, 'team.dark');       // flank panel
  // The bay: a recessed rectangle with a rolled-up shutter above it.
  c.box(232, 336, DECK_Z + 20, 356, 342, DECK_Z + 58, 'steel.dark');
  c.box(238, 338, DECK_Z + 22, 350, 344, DECK_Z + 56, 'scorch');
  c.cylY(294, 336, 344, DECK_Z + 62, 9, 'canvas');                        // shutter roll
  // Doors and a ladder on the other flank.
  c.box(238, 172, DECK_Z + 20, 300, 176, DECK_Z + 62, 'team.dark');
  c.box(244, 168, DECK_Z + 24, 294, 172, DECK_Z + 58, 'steel');
  for (let i = 0; i < 4; i++) {
    c.box(310, 166, DECK_Z + 12 + i * 14, 330, 172, DECK_Z + 18 + i * 14, 'steel.bright');
  }
  // Roof: ventilation, a work lamp on a mast, and a hatch.
  c.box(214, 196, DECK_Z + 86, 262, 244, DECK_Z + 96, 'steel.dark');     // vent
  louvres(c, { x0: 216, x1: 260, y0: 200, y1: 240, z: DECK_Z + 96, slat: 4 });
  hatch(c, { cx: 344, cy: 232, z: DECK_Z + 86, r: 22 });
  antenna(c, { x: 214, y: 310, z: DECK_Z + 86, height: 104 });
  c.cylZ(366, 300, DECK_Z + 86, DECK_Z + 150, 5, 'steel.dark');          // lamp mast
  c.box(358, 292, DECK_Z + 150, 374, 308, DECK_Z + 162, 'steel.dark');
  c.box(360, 294, DECK_Z + 146, 372, 306, DECK_Z + 152, 'lamp.warm');

  // Driver's cab at the front, lower than the workshop box.
  c.box(392, 200, DECK_Z, 424, 312, DECK_Z + 50, 'team.hull');
  c.box(394, 206, DECK_Z + 50, 422, 306, DECK_Z + 56, 'team.light');
  c.box(418, 212, DECK_Z + 14, 426, 300, DECK_Z + 32, 'glass.dark');
  periscope(c, { x: 412, y: 236, z: DECK_Z + 56, w: 8, h: 5 });

  // Nose kit: beam, lugs, lamps, a spare road wheel bolted to the glacis.
  c.box(456, 116, 100, 466, 396, 112, 'steel.dark');
  for (const y of [144, 368]) {
    liftingEye(c, { x: 440, y: y - 6, z: 106 });
    c.cylX(446, 458, y, 124, 11, 'steel.dark');
    c.cylX(458, 460, y, 124, 8, 'lamp.warm');
  }
  c.cylX(424, 436, 256, 128, 36, 'tyre');
  c.cylX(432, 438, 256, 128, 22, 'steel.dark');
  c.bolts(436, 256, 128, 14, 6, 'steel.bright', 3);

  /* --------------------------------------------------------- deck between */
  // Tow winch, gas bottles and a spares rack fill the gap between cab and box.
  c.box(170, 200, DECK_Z + 2, 196, 312, DECK_Z + 34, 'steel.dark');
  c.cylX(176, 192, 256, DECK_Z + 20, 16, 'steel');                       // winch drum
  c.cylX(176, 192, 256, DECK_Z + 20, 8, 'steel.bright');
  cable(c, [[180, 250, DECK_Z + 20], [210, 236, DECK_Z + 40], [250, 226, DECK_Z + 52]], 'steel.dark');
  for (const y of [212, 232]) {
    c.cylZ(404, y, DECK_Z + 2, DECK_Z + 46, 9, 'lamp.cyan');             // gas bottles
    c.cylZ(404, y, DECK_Z + 46, DECK_Z + 50, 6, 'brass');
  }
  crate(c, { x0: 396, y0: 268, z0: DECK_Z + 2, x1: 428, y1: 316, z1: DECK_Z + 34,
    mat: 'wood', lid: 'steel.dark' });
  basketRack(c, { x0: 200, x1: 380, y0: 158, y1: 176, z0: DECK_Z + 6, z1: DECK_Z + 40, part: 'body' });

  /* ------------------------------------------------------------------ crane */
  // A-frame: two legs from the deck to the heel, then the lattice boom running
  // aft and up. Lattice, not a solid plate — a solid boom reads as a ramp.
  c.part('body');
  for (const s of [-1, 1]) {
    const y = 256 + s * 92;
    c.box(150, y - 10, DECK_Z, 176, y + 10, HEEL_Z, 'plate.dark');       // leg
    c.box(156, y - 6, DECK_Z + 30, 172, y + 6, HEEL_Z - 20, 'plate');
  }
  c.box(146, 176, HEEL_Z - 12, 180, 336, HEEL_Z, 'plate.dark');          // heel crosshead
  c.bolts(164, 256, HEEL_Z - 6, 70, 8, 'steel.bright', 3);

  c.part('crane');
  /**
   * Boom: two chords with cross bracing, running aft from the heel.
   *
   * The chords must START at the heel and climb as they go aft. The first
   * attempt held them at a constant height above the head, which left the whole
   * boom floating detached in mid-air — from the bake's point of view it is one
   * part, but the geometry has to actually touch.
   */
  const BX0 = 158, BX1 = 44;
  const boomZ = x => HEEL_Z - 6 + ((BX0 - x) / (BX0 - BX1)) * 62;
  for (let x = BX1; x < BX0; x += 4) {
    const z = boomZ(x);
    for (const sg of [-1, 1]) {
      const y = 256 + sg * 26;
      c.box(x, y - 6, z - 6, x + 4, y + 6, z + 6, 'plate');               // chord
    }
    if ((x - BX1) % 20 < 4) {
      c.box(x, 256 - 26, z - 4, x + 4, 256 + 26, z + 4, 'plate.dark');    // cross member
      c.box(x + 1, 256 - 24, z - 22, x + 4, 256 + 24, z - 18, 'plate.dark');
    }
  }
  // Boom foot: a pivot pin through the heel, so the boom is visibly mounted.
  c.cylY(BX0 - 4, 256 - 34, 256 + 34, HEEL_Z - 6, 14, 'steel.bright');
  c.bolts(BX0 - 4, 256, HEEL_Z - 6, 22, 6, 'steel.dark', 3);

  // Boom head: sheave block and the cable dropping to the hook.
  const HEAD_Z = boomZ(BX1);
  c.box(BX1 - 8, HEAD_Z - 14, HEAD_Z - 20, BX1 + 16, HEAD_Z + 60, HEAD_Z + 14, 'steel.dark');
  c.cylY(BX1 + 4, 256 - 20, 256 + 20, HEAD_Z, 12, 'steel.bright');
  cable(c, [[BX1 + 4, 256, HEAD_Z - 12], [BX1 + 6, 256, DECK_Z + 96], [BX1 + 8, 256, DECK_Z + 52]], 'steel.dark');
  // Hook block and slings, hanging as one assembly with the boom.
  c.box(BX1 + 2, 256 - 22, DECK_Z + 26, BX1 + 18, 256 + 22, DECK_Z + 52, 'steel.dark');
  c.box(BX1 + 6, 256 - 8, DECK_Z + 52, BX1 + 14, 256 + 8, DECK_Z + 58, 'steel.bright');
  c.box(BX1 + 2, 256 - 10, DECK_Z + 14, BX1 + 18, 256 + 10, DECK_Z + 26, 'steel.dark');
  c.box(BX1 + 6, 256 - 4, DECK_Z + 4, BX1 + 14, 256 + 4, DECK_Z + 14, 'steel.bright');
  c.pivot('crane', [HEEL_X + 8, 256, HEEL_Z]);
  c.dynamic('crane');
  c.part('body');

  /* --------------------------------------------------------- surface pass */
  c.wear(0x4b83, 'steel.dark', { rate: 0.035, only: ['team.hull', 'team.light', 'plate'] });
  c.mottle(0x2f19, ['team.dark', 'team.light'], 0.02, { only: ['team.hull', 'plate'] });
  return c;
}
