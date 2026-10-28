/**
 * Bastion — tracked, 16 facings.
 *
 * The lab-exclusive "proto armour" tank, and the deliberate opposite of `mega`:
 * where the mega tank is long and tall with a twin gun, the Bastion is **low,
 * very wide and slab-sided**, more plate than silhouette. Three choices carry
 * that read at 64 px:
 *
 *   * a **casemate collar** — the turret is small and sits sunken inside a
 *     bolted armoured ring, so the vehicle looks dug in even when it is moving;
 *   * **hang-on appliqué panels** down both flanks, each on visible rails with
 *     big bolt heads, which is what "proto armour" has to look like;
 *   * a **dozer blade** across the nose, which no other tracked unit has.
 *
 * The gun is short and fat rather than long and thin, so it cannot be mistaken
 * for the mega's tubes or the heavy's gun.
 */
import {
  hatch, periscope, antenna, crate, louvres, liftingEye, smokeBank, basketRack,
  sandbags, cable, seam,
} from '../kit.mjs';
import { trackGear, trackedHull, castTurret, muzzleBrake } from '../kit-vehicles.mjs';

const DECK_Z = 146;
const HALF = 192;
const TURRET_X = 300;
const RING_R = 104;
const COLLAR_Z = DECK_Z + 52;      // top of the armoured ring, 198
const TTOP = COLLAR_Z + 64;        // turret roof, 262
const GUN_Z = 198;

export function buildBastion(c) {
  /* ----------------------------------------------------------- running gear */
  const GEAR = {
    x0: 24, x1: 444, z0: 0, z1: 132,
    wheels: [86, 146, 206, 266, 326, 386], wheelR: 48, wheelZ: 66,
    sprocketX: 426, sprocketR: 50, idlerX: 42, idlerR: 46,
    rollers: [120, 210, 300, 390], rollerZ: 122, linkWidth: 13,
    skirt: true,
  };
  trackGear(c, { side: 'L', ...GEAR, y0: 36, y1: 140 });
  trackGear(c, { side: 'R', ...GEAR, y0: 372, y1: 476, part: 'running.R' });

  /* ------------------------------------------------------------------ hull */
  trackedHull(c, {
    x0: 56, x1: 404,
    halfW: HALF, lowerHalf: 128,
    bellyZ: 34, deckZ: DECK_Z,
    bevel: 4, bevelH: 78,
    glacis: { run: 52, noseZ: 92 },
    tail: false, nose: false,
  });

  c.part('body');
  /* ------------------------------------------------- hang-on appliqué panels */
  // Six panels a side, each on two rails, each with a bolt ring. Panels stand
  // 8 voxels proud so they read as separate plates rather than as hull.
  for (const s of [-1, 1]) {
    const yIn = 256 + s * (HALF - 6);
    const yOut = 256 + s * (HALF + 10);
    const ya = Math.min(yIn, yOut), yb = Math.max(yIn, yOut);
    for (let i = 0; i < 6; i++) {
      const x0 = 74 + i * 56, x1 = x0 + 46;
      c.box(x0, ya, 52, x1, yb, DECK_Z - 8, 'plate');
      c.box(x0 + 4, ya, DECK_Z - 8, x1 - 4, yb, DECK_Z - 4, 'plate.dark');
      for (const zz of [66, 100, 126]) {
        c.bolts((x0 + x1) / 2, 256 + s * (HALF + 10), zz, 18, 6, 'steel.dark', 3);
      }
      // Rail ends, so the panel is visibly hung rather than moulded on.
      c.box(x0 - 4, ya, 58, x0, yb, 66, 'steel.dark');
      c.box(x1, ya, 58, x1 + 4, yb, 66, 'steel.dark');
      c.box(x0 - 4, ya, 120, x0, yb, 128, 'steel.dark');
      c.box(x1, ya, 120, x1 + 4, yb, 128, 'steel.dark');
    }
  }

  /* ------------------------------------------------------------ dozer blade */
  // Swept blade hung off two arms; the curve is a stack of narrowing slabs so it
  // is a scoop, not a fence.
  // Assault ram instead of a dozer blade. The blade was tried twice — as a
  // stack of slabs and as a ribbed plate — and both read as a fence hung off the
  // nose at sprite scale, because a tall dark panel in front of the glacis eats
  // the front of the vehicle. A low stepped wedge under the nose keeps the
  // "it is built to be hit" read without a silhouette-blocking panel.
  c.box(456, 130, 34, 474, 382, 92, 'steel.dark');
  c.box(450, 138, 34, 456, 374, 74, 'plate.dark');
  c.box(444, 146, 34, 450, 366, 56, 'plate');
  c.box(474, 140, 34, 480, 372, 62, 'steel.bright');            // striker edge
  for (let y = 144; y < 372; y += 34) {                         // gusset ribs
    c.box(470, y, 40, 478, y + 10, 88, 'steel.dark');
  }
  for (const y of [150, 362]) {                                 // tow lugs
    c.box(456, y - 16, 70, 482, y + 16, 96, 'steel.dark');
    c.rivets(478, y - 10, 84, 478, y + 10, 84, 9, 'steel.bright');
  }

  /* ------------------------------------------------------------- nose / tail */
  for (const y of [140, 372]) {
    liftingEye(c, { x: 430, y: y - 6, z: 128 });
    c.cylX(414, 428, y, 120, 13, 'steel.dark');
    c.cylX(428, 431, y, 120, 10, 'lamp.warm');
  }
  c.box(60, 132, 52, 78, 380, DECK_Z - 4, 'plate.dark');
  for (const y of [164, 348]) {
    c.cylZ(64, y, DECK_Z - 8, DECK_Z + 46, 16, 'steel.dark');    // exhaust stack
    c.cylZ(64, y, DECK_Z + 46, DECK_Z + 52, 12, 'scorch');
    c.box(52, y - 18, 100, 66, y + 18, DECK_Z - 2, 'steel.dark');
  }
  // Fuel drums lashed to the rear deck: the Bastion carries its own logistics.
  for (const y of [176, 336]) {
    c.cylZ(120, y, DECK_Z + 4, DECK_Z + 52, 26, 'rust');
    c.cylZ(120, y, DECK_Z + 52, DECK_Z + 56, 20, 'steel.dark');
    c.rivets(94, y - 20, DECK_Z + 28, 94, y + 20, DECK_Z + 28, 12, 'steel.dark');
  }

  // Driver: hatch and periscopes ahead of the collar, bow MG low on the nose.
  hatch(c, { cx: 396, cy: 172, z: DECK_Z + 4, r: 32 });
  periscope(c, { x: 404, y: 140, z: DECK_Z + 4, w: 9, h: 6 });
  periscope(c, { x: 404, y: 206, z: DECK_Z + 4, w: 9, h: 6 });
  c.sphere(416, 316, DECK_Z + 8, 14, 'steel.dark', { top: true });
  c.cylX(416, 452, 316, DECK_Z + 8, 4, 'gunmetal');

  // Raised engine housing: the deck was one flat plane, and a tank this wide
  // cannot be one flat plane at 64 px.
  c.box(84, 132, DECK_Z, 168, 380, DECK_Z + 30, 'plate');
  c.box(88, 138, DECK_Z + 30, 164, 374, DECK_Z + 34, 'plate.dark');
  louvres(c, { x0: 96, x1: 148, y0: 148, y1: 232, z: DECK_Z + 34, slat: 6 });
  louvres(c, { x0: 96, x1: 148, y0: 280, y1: 364, z: DECK_Z + 34, slat: 6 });
  sandbags(c, { x0: 360, x1: 404, y0: 100, z0: DECK_Z + 4, rows: 1 });
  cable(c, [[150, 108, DECK_Z + 6], [250, 100, DECK_Z + 6], [350, 112, DECK_Z + 6]], 'steel.dark');

  /* ------------------------------------------------------- armoured collar */
  // A bolted ring sunken into the deck. The turret sits inside it, so the tank
  // reads as dug in even before the gun moves.
  c.part('body');
  c.cylZ(TURRET_X, 256, DECK_Z - 2, COLLAR_Z, RING_R + 16, 'plate.dark');
  c.cylZ(TURRET_X, 256, DECK_Z - 2, COLLAR_Z - 8, RING_R, 'plate.dark');
  c.ringZ(TURRET_X, 256, COLLAR_Z - 10, COLLAR_Z, RING_R + 22, RING_R - 6, 'steel.dark');
  c.bolts(TURRET_X, 256, COLLAR_Z - 18, RING_R + 14, 16, 'steel.bright', 3);
  // Cradle cheeks on the collar front, carrying the gun shield.
  for (const s of [-1, 1]) {
    c.box(TURRET_X + RING_R - 18, 256 + s * 52 - 12, DECK_Z, TURRET_X + RING_R + 18,
      256 + s * 52 + 12, COLLAR_Z + 10, 'plate');
  }

  /* ----------------------------------------------------------------- turret */
  c.part('turret');
  castTurret(c, {
    cx: TURRET_X, cy: 256, halfX: 78, halfY: 86,
    z0: COLLAR_Z - 12, z1: TTOP, levels: 2, taper: 5, chamfer: 26,
  });
  // Mantelet: a big bolted shield across the gun face.
  c.box(TURRET_X + 62, 196, COLLAR_Z - 8, TURRET_X + 96, 316, TTOP - 12, 'plate');
  c.box(TURRET_X + 92, 202, GUN_Z - 34, TURRET_X + 104, 310, GUN_Z + 34, 'plate.dark');
  c.rivets(TURRET_X + 94, 204, GUN_Z - 30, TURRET_X + 94, 308, GUN_Z - 30, 14, 'steel.bright');
  c.rivets(TURRET_X + 94, 204, GUN_Z + 30, TURRET_X + 94, 308, GUN_Z + 30, 14, 'steel.bright');
  // Ring of vision blocks around the hatch.
  c.cylZ(TURRET_X + 6, 300, TTOP - 6, TTOP + 12, 34, 'plate.dark');
  hatch(c, { cx: TURRET_X + 6, cy: 300, z: TTOP + 12, r: 21, part: 'turret' });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const vx = Math.round(TURRET_X + 6 + Math.cos(a) * 28);
    const vy = Math.round(300 + Math.sin(a) * 28);
    c.box(vx - 4, vy - 4, TTOP + 2, vx + 4, vy + 4, TTOP + 10, 'glass');
  }
  // Smoke launchers and the sight, both on the turret roof.
  smokeBank(c, { x: TURRET_X + 40, y: 190, z: COLLAR_Z + 22, dx: -8, dy: 13, part: 'turret' });
  smokeBank(c, { x: TURRET_X + 40, y: 322, z: COLLAR_Z + 22, dx: -8, dy: -13, part: 'turret' });
  c.box(TURRET_X - 34, 286, TTOP - 4, TURRET_X + 10, 322, TTOP + 12, 'steel.dark');
  c.box(TURRET_X + 6, 292, TTOP, TURRET_X + 14, 316, TTOP + 8, 'optic');
  antenna(c, { x: TURRET_X - 44, y: 196, z: TTOP - 4, height: 104, part: 'turret' });
  antenna(c, { x: TURRET_X - 44, y: 316, z: TTOP - 4, height: 78, part: 'turret' });
  basketRack(c, { x0: TURRET_X - 118, x1: TURRET_X - 70, y0: 206, y1: 306,
    z0: COLLAR_Z, z1: TTOP - 16, part: 'turret' });
  crate(c, { x0: TURRET_X - 112, y0: 212, z0: COLLAR_Z + 4, x1: TURRET_X - 76, y1: 300,
    z1: TTOP - 20, part: 'turret', mat: 'canvas', lid: 'steel.dark' });
  c.pivot('turret', [TURRET_X, 256, DECK_Z]);
  c.dynamic('turret');
  c.traverse('turret');

  /* ----------------------------------------------------------------- barrel */
  // Short, fat, and heavily braked: a close-assault gun, not a sniper's rifle.
  c.part('barrel');
  const BX = TURRET_X + 96;                      // 396
  c.cylX(BX, 430, 256, GUN_Z, 21, 'gunmetal');
  c.cylX(424, 452, 256, GUN_Z, 26, 'gunmetal.lit');            // fume extractor
  c.cylX(456, 486, 256, GUN_Z, 20, 'steel.dark');
  muzzleBrake(c, { x: 508, y: 256, z: GUN_Z, r: 27 });
  // Recoil rams either side of the tube, and the cradle saddle.
  c.cylX(BX - 10, 424, 256 - 30, GUN_Z + 12, 6, 'steel');
  c.cylX(BX - 10, 424, 256 + 30, GUN_Z + 12, 6, 'steel');
  c.box(BX - 4, 232, GUN_Z - 30, BX + 14, 280, GUN_Z + 30, 'plate.dark');
  c.pivot('barrel', [BX, 256, GUN_Z]);
  c.parent('barrel', 'turret');
  c.dynamic('barrel');
  c.part('body');

  /* --------------------------------------------------------- surface pass */
  c.wear(0x3c9a, 'plate.dark', { rate: 0.04, only: ['plate', 'plate.dark', 'team.hull'] });
  c.mottle(0x6b22, ['plate.dark', 'plate.lit'], 0.025, { only: ['plate', 'team.hull'] });
  return c;
}
