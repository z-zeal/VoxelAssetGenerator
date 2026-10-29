/**
 * Mine-Laying Vehicle — tracked, 16 facings.
 *
 * A support vehicle with no gun, so the silhouette has to carry the whole
 * identity: a **long flat deck under two rows of mine canisters**, and a
 * **dispenser chute** hinged off the tail. Every other tracked unit in the
 * family has something pointing forward; this one has nothing pointing forward
 * at all, which is what makes it readable at 64 px.
 *
 * `dispenser` is the segmented part: in production it swings down to lay, and
 * the pivot sits on the hinge at the top of the chute, not at its middle.
 */
import {
  hatch, periscope, antenna, crate, louvres, liftingEye, cable, seam,
} from '../kit.mjs';
import { trackGear, trackedHull, stowageRail } from '../kit-vehicles.mjs';

const DECK_Z = 138;
const HALF = 146;
const HINGE_X = 96;              // chute hinge, over the tail
const CHUTE_Z = DECK_Z + 6;

export function buildMineLayer(c) {
  /* ----------------------------------------------------------- running gear */
  const GEAR = {
    x0: 46, x1: 454, z0: 0, z1: 120,
    wheels: [108, 190, 272, 354, 420], wheelR: 42, wheelZ: 60,
    sprocketX: 436, sprocketR: 46, idlerX: 64, idlerR: 44,
    rollers: [150, 240, 330], rollerZ: 112, linkWidth: 10,
  };
  trackGear(c, { side: 'L', ...GEAR, y0: 80, y1: 154 });
  trackGear(c, { side: 'R', ...GEAR, y0: 358, y1: 432, part: 'running.R' });

  /* ------------------------------------------------------------------ hull */
  // A flat, low hull with a shallow bevel: this truck carries cargo, it does not
  // need a glacis.
  trackedHull(c, {
    x0: 84, x1: 430,
    halfW: HALF, lowerHalf: 104,
    bellyZ: 26, deckZ: DECK_Z,
    bevel: 2, bevelH: 40,
    glacis: { run: 30, noseZ: 106 },
    tail: false, nose: false,
  });

  c.part('body');
  /* ------------------------------------------------------- armoured cab */
  // The only height on the vehicle, and it is at the front: a boxy cab with a
  // vision slit rather than a turret.
  c.box(352, 176, DECK_Z, 424, 336, DECK_Z + 54, 'team.hull');
  c.box(356, 182, DECK_Z + 54, 420, 330, DECK_Z + 60, 'team.light');
  c.box(420, 190, DECK_Z + 16, 428, 322, DECK_Z + 34, 'glass.dark');       // vision slit
  c.box(416, 186, DECK_Z + 14, 424, 326, DECK_Z + 36, 'steel.dark');
  hatch(c, { cx: 388, cy: 256, z: DECK_Z + 60, r: 26 });
  periscope(c, { x: 412, y: 214, z: DECK_Z + 60, w: 8, h: 5 });
  periscope(c, { x: 412, y: 298, z: DECK_Z + 60, w: 8, h: 5 });
  antenna(c, { x: 358, y: 320, z: DECK_Z + 60, height: 96 });

  // Nose: beam, tow lugs, brush-guarded lamps, mine rails folded up.
  c.box(458, 110, 104, 468, 402, 116, 'steel.dark');
  for (const y of [138, 374]) {
    liftingEye(c, { x: 442, y: y - 6, z: 110 });
    c.cylX(448, 460, y, 128, 11, 'steel.dark');
    c.cylX(460, 462, y, 128, 8, 'lamp.warm');
  }

  /* --------------------------------------------------- mine canister racks */
  // Two rows of canisters down the deck, on rails so they read as cargo rather
  // than as structure. The open tops are what makes them canisters.
  for (const y of [192, 320]) {
    c.box(104, y - 34, DECK_Z + 2, 344, y + 34, DECK_Z + 8, 'steel.dark');
    for (let i = 0; i < 6; i++) {
      const x = 112 + i * 38;
      c.cylZ(x, y, DECK_Z + 8, DECK_Z + 34, 15, 'rust');
      c.cylZ(x, y, DECK_Z + 34, DECK_Z + 38, 11, 'steel.dark');       // lid
      c.cylZ(x, y, DECK_Z + 38, DECK_Z + 40, 5, 'brass');             // cap
      c.box(x - 16, y - 16, DECK_Z + 8, x - 12, y + 16, DECK_Z + 30, 'steel.dark');
      c.box(x + 12, y - 16, DECK_Z + 8, x + 16, y + 16, DECK_Z + 30, 'steel.dark');
    }
    // Rail and its tie-downs.
    c.rivets(104, y - 34, DECK_Z + 6, 344, y - 34, DECK_Z + 6, 14, 'steel');
    c.rivets(104, y + 34, DECK_Z + 6, 344, y + 34, DECK_Z + 6, 14, 'steel');
  }
  // Centre walkway between the rows, with a stencil panel.
  c.box(104, 240, DECK_Z + 4, 344, 272, DECK_Z + 8, 'plate.dark');
  for (let x = 118; x < 340; x += 26) c.box(x, 242, DECK_Z + 8, x + 14, 270, DECK_Z + 10, 'paint.line');

  // Rear deck furniture: spare canisters laid flat, a toolbox, a fire bottle.
  c.box(96, 176, DECK_Z + 2, 148, 212, DECK_Z + 26, 'steel.dark');
  crate(c, { x0: 100, y0: 296, z0: DECK_Z + 2, x1: 152, y1: 348, z1: DECK_Z + 30,
    mat: 'wood', lid: 'steel.dark' });
  c.cylZ(96, 256, DECK_Z + 2, DECK_Z + 34, 10, 'lamp.red');
  louvres(c, { x0: 330, x1: 344, y0: 182, y1: 260, z: DECK_Z + 4, slat: 5 });

  /* -------------------------------------------------------------- dispenser */
  // Hinged chute: the rail bed the mines run down, its side cheeks, and the
  // spreader at the mouth. The pivot is on the hinge line at the top.
  c.part('dispenser');
  c.box(52, 214, CHUTE_Z - 26, HINGE_X + 6, 298, CHUTE_Z - 18, 'steel.dark');   // bed
  c.box(52, 214, CHUTE_Z - 18, 60, 298, CHUTE_Z - 10, 'steel.bright');          // mouth lip
  for (const y of [210, 302]) {
    c.box(56, y - 4, CHUTE_Z - 26, HINGE_X + 4, y + 4, CHUTE_Z + 4, 'plate.dark'); // cheek
  }
  for (let x = 66; x < HINGE_X; x += 12) {
    c.box(x, 218, CHUTE_Z - 16, x + 3, 294, CHUTE_Z - 10, 'track.worn');        // rollers
  }
  c.box(64, 226, CHUTE_Z + 4, 92, 246, CHUTE_Z + 14, 'brass');                  // spreader ram
  c.box(64, 266, CHUTE_Z + 4, 92, 286, CHUTE_Z + 14, 'brass');
  c.pivot('dispenser', [HINGE_X, 256, CHUTE_Z]);
  c.dynamic('dispenser');
  c.part('body');

  /* --------------------------------------------------------- surface pass */
  c.wear(0x6a1f, 'steel.dark', { rate: 0.035, only: ['team.hull', 'team.light', 'plate'] });
  c.mottle(0x3d72, ['team.dark', 'team.light'], 0.02, { only: ['team.hull'] });
  return c;
}
