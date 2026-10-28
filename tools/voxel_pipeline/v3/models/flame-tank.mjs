/**
 * Flame Tank — tracked, 16 facings.
 *
 * The read is *fuel*, not armour: two fat cylinders lying along the rear deck
 * with visible ribs, banding and hoses running forward to the projector. No
 * other tracked unit carries anything like them, which is what makes the
 * silhouette identifiable at 64 px even head-on.
 *
 * The `barrel` part is the projector rather than a gun: a short thick tube, a
 * flared nozzle, a pilot light and a heat shield. It is short on purpose — a
 * long barrel would make this read as a tank with drums on the back.
 */
import {
  hatch, periscope, antenna, crate, louvres, liftingEye, smokeBank, cable, seam,
} from '../kit.mjs';
import { trackGear, trackedHull, castTurret } from '../kit-vehicles.mjs';

const DECK_Z = 150;
const HALF = 152;
const TURRET_X = 316;
const TTOP = DECK_Z + 84;
const NOZ_Z = 206;

export function buildFlameTank(c) {
  /* ----------------------------------------------------------- running gear */
  const GEAR = {
    x0: 44, x1: 456, z0: 0, z1: 128,
    wheels: [104, 182, 260, 338, 416], wheelR: 44, wheelZ: 64,
    sprocketX: 438, sprocketR: 46, idlerX: 62, idlerR: 42,
    rollers: [150, 250, 350], rollerZ: 120, linkWidth: 11,
  };
  trackGear(c, { side: 'L', ...GEAR, y0: 76, y1: 152 });
  trackGear(c, { side: 'R', ...GEAR, y0: 360, y1: 436, part: 'running.R' });

  /* ------------------------------------------------------------------ hull */
  trackedHull(c, {
    x0: 82, x1: 420,
    halfW: HALF, lowerHalf: 100,
    bellyZ: 26, deckZ: DECK_Z,
    bevel: 3, bevelH: 54,
    glacis: { run: 46, noseZ: 104 },
    tail: false, nose: false,
  });

  c.part('body');
  // Heat-shielded nose: the projector sits over the glacis and everything under
  // it is scorched plate rather than paint.
  c.box(452, 108, 100, 466, 404, 116, 'steel.dark');
  for (const y of [136, 376]) {
    liftingEye(c, { x: 440, y: y - 6, z: 108 });
    c.cylX(444, 456, y, 132, 12, 'steel.dark');
    c.cylX(456, 459, y, 132, 9, 'lamp.warm');
  }
  c.box(420, 148, 120, 462, 364, 150, 'scorch');                  // scorched deck
  for (let i = 0; i < 5; i++) {
    c.box(424 + i * 6, 160 + i * 4, 150 - i * 4, 428 + i * 6, 352 - i * 4, 152 - i * 4, 'steel.dark');
  }

  // Driver's hatch + periscopes just left of the projector.
  hatch(c, { cx: 396, cy: 178, z: DECK_Z + 4, r: 28 });
  periscope(c, { x: 402, y: 152, z: DECK_Z + 4, w: 8, h: 5 });
  periscope(c, { x: 402, y: 204, z: DECK_Z + 4, w: 8, h: 5 });

  /* ------------------------------------------------------- fuel installation */
  // Two 40-voxel tanks lying along the back deck. Ribs, end caps, filler caps and
  // the armoured shroud over each, so they read as pressure vessels.
  for (const y of [192, 320]) {
    c.cylX(120, 272, y, DECK_Z + 40, 34, 'rust');
    c.cylX(120, 127, y, DECK_Z + 40, 38, 'steel.dark');            // end caps
    c.cylX(265, 272, y, DECK_Z + 40, 38, 'steel.dark');
    for (let x = 140; x < 266; x += 32) {
      c.cylX(x, x + 4, y, DECK_Z + 40, 37, 'steel.dark');          // banding
    }
    c.cylZ(150, y, DECK_Z + 72, DECK_Z + 84, 10, 'brass');         // filler
    c.cylZ(150, y, DECK_Z + 84, DECK_Z + 88, 6, 'steel.dark');
    // Cradle feet holding the tank off the deck.
    for (const x of [132, 200, 258]) {
      c.box(x, y - 22, DECK_Z + 2, x + 14, y + 22, DECK_Z + 10, 'steel.dark');
    }
    // Blast shield between the tanks.
    c.box(276, y - 38, DECK_Z + 2, 284, y + 38, TTOP - 14, 'plate');
  }
  c.box(274, 168, DECK_Z + 2, 296, 344, DECK_Z + 12, 'steel.dark');
  // Feeds: two hoses from the tanks to the projector, and a pressure manifold.
  cable(c, [[280, 228, DECK_Z + 26], [330, 244, DECK_Z + 44], [352, 250, NOZ_Z - 6]], 'steel.dark');
  cable(c, [[280, 284, DECK_Z + 26], [330, 268, DECK_Z + 44], [352, 262, NOZ_Z - 6]], 'steel.dark');
  c.box(330, 236, DECK_Z + 24, 352, 276, DECK_Z + 44, 'brass');
  c.cylZ(340, 256, DECK_Z + 44, DECK_Z + 52, 9, 'steel');

  // Rear: louvred engine, exhaust, tow lugs, spare links.
  louvres(c, { x0: 96, x1: 118, y0: 172, y1: 340, z: DECK_Z + 4, slat: 6 });
  c.box(74, 160, 60, 92, 352, DECK_Z - 4, 'plate.dark');
  for (const y of [176, 336]) {
    c.cylZ(80, y, DECK_Z - 16, DECK_Z + 40, 13, 'steel.dark');
    c.cylZ(80, y, DECK_Z + 40, DECK_Z + 46, 9, 'scorch');
  }
  crate(c, { x0: 100, y0: 150, z0: DECK_Z + 4, x1: 150, y1: 200, z1: DECK_Z + 30, mat: 'wood', lid: 'steel.dark' });

  /* ----------------------------------------------------------------- turret */
  c.part('turret');
  c.ringZ(TURRET_X, 256, DECK_Z, DECK_Z + 10, 92, 74, 'steel.dark');
  castTurret(c, {
    cx: TURRET_X, cy: 256, halfX: 76, halfY: 84,
    z0: DECK_Z + 8, z1: TTOP, levels: 3, taper: 5, chamfer: 28,
  });
  c.bolts(TURRET_X, 256, DECK_Z + 10, 84, 20, 'steel', 3);
  // Projector mounting: a flat face with the trunnion cheeks and a heat shield
  // wrapped around the base of the tube.
  c.box(TURRET_X + 52, 208, DECK_Z + 10, TURRET_X + 76, 304, TTOP - 16, 'team.dark');
  c.box(TURRET_X + 70, 214, NOZ_Z - 30, TURRET_X + 84, 298, NOZ_Z + 30, 'steel.dark');
  for (const s of [-1, 1]) {
    c.box(TURRET_X + 56, 256 + s * 40 - 10, NOZ_Z - 22, TURRET_X + 72, 256 + s * 40 + 10, NOZ_Z + 22, 'plate');
  }
  hatch(c, { cx: TURRET_X - 6, cy: 292, z: TTOP - 4, r: 20, part: 'turret' });
  c.box(TURRET_X - 30, 292, TTOP - 6, TURRET_X + 6, 320, TTOP + 8, 'steel.dark');   // sight
  c.box(TURRET_X + 2, 296, TTOP - 2, TURRET_X + 10, 316, TTOP + 4, 'optic');
  c.box(TURRET_X - 58, 210, DECK_Z + 10, TURRET_X - 30, 302, TTOP - 30, 'team.dark'); // bustle
  c.cylZ(TURRET_X - 44, 256, TTOP - 30, TTOP - 20, 16, 'steel.dark');
  smokeBank(c, { x: TURRET_X + 40, y: 196, z: DECK_Z + 34, dx: -8, dy: 12, part: 'turret' });
  antenna(c, { x: TURRET_X - 34, y: 300, z: TTOP - 30, height: 96, part: 'turret' });
  c.pivot('turret', [TURRET_X, 256, DECK_Z]);
  c.dynamic('turret');
  c.traverse('turret');

  /* --------------------------------------------------------------- projector */
  c.part('barrel');
  const NOZ_X = TURRET_X + 80;                    // 396
  c.cylX(NOZ_X, 430, 256, NOZ_Z, 14, 'steel.dark');            // breech collar
  c.cylX(426, 468, 256, NOZ_Z, 12, 'gunmetal');
  // Flare: the radius grows towards the mouth, which is what says "projector"
  // rather than "gun" even in silhouette.
  for (let i = 0; i < 14; i++) {
    const x = 466 + i * 3;
    c.cylX(x, x + 3, 256, NOZ_Z, 13 + i * 1.5, 'steel.dark');
  }
  c.cylX(506, 511, 256, NOZ_Z, 33, 'scorch');
  // Pilot light on a bracket under the mouth, and the ignition box behind it.
  c.box(486, 244, NOZ_Z - 34, 500, 250, NOZ_Z - 26, 'steel.bright');
  c.box(494, 246, NOZ_Z - 30, 510, 248, NOZ_Z - 28, 'lamp.warm');
  c.box(430, 232, NOZ_Z + 22, 452, 280, NOZ_Z + 34, 'brass');
  c.pivot('barrel', [NOZ_X, 256, NOZ_Z]);
  c.parent('barrel', 'turret');
  c.dynamic('barrel');
  c.part('body');

  /* --------------------------------------------------------- surface pass */
  c.wear(0x7d31, 'steel.dark', { rate: 0.035, only: ['team.hull', 'team.light', 'plate'] });
  c.mottle(0x4a08, ['scorch', 'team.dark'], 0.02, { only: ['team.hull', 'plate'] });
  return c;
}
