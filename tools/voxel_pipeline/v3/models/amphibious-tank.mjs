/**
 * Amphibious Tank — tracked, 16 facings.
 *
 * Everything about the shape is "it has to float": a **boat hull** with a raised
 * belt line, a wedge bow instead of a tank glacis, **splash rails** along the
 * belt, **twin propellers in shrouds** on the transom, a snorkel for the engine
 * intake, and no side skirts at all — a skirted vehicle would trap water.
 *
 * It is deliberately the lightest tracked vehicle in the family: thin gun, small
 * turret, open running gear. Everything else looked like it could take a hit;
 * this one looks like it could swim.
 */
import {
  hatch, periscope, antenna, crate, louvres, liftingEye, cable, seam,
} from '../kit.mjs';
import { trackGear, trackedHull, castTurret } from '../kit-vehicles.mjs';

const DECK_Z = 142;
const HALF = 144;
const TURRET_X = 300;
const TTOP = DECK_Z + 72;
const GUN_Z = 190;

export function buildAmphibiousTank(c) {
  /* ----------------------------------------------------------- running gear */
  // Open gear, no skirt: the run has to drain.
  const GEAR = {
    x0: 62, x1: 438, z0: 0, z1: 120,
    wheels: [112, 188, 264, 340, 402], wheelR: 40, wheelZ: 60,
    sprocketX: 422, sprocketR: 42, idlerX: 76, idlerR: 38,
    rollers: [150, 240, 330], rollerZ: 112, linkWidth: 10,
  };
  trackGear(c, { side: 'L', ...GEAR, y0: 86, y1: 156 });
  trackGear(c, { side: 'R', ...GEAR, y0: 356, y1: 426, part: 'running.R' });

  /* ------------------------------------------------------------------ hull */
  // A shallow boat hull: no lower-hull step, so the belly sits high and the sides
  // run straight down to it.
  trackedHull(c, {
    x0: 96, x1: 404,
    halfW: HALF, lowerHalf: 132,
    bellyZ: 40, deckZ: DECK_Z,
    bevel: 2, bevelH: 40,
    glacis: { run: 54, noseZ: 96 },
    tail: false, nose: false,
  });

  c.part('body');
  /* ------------------------------------------------------------ boat fittings */
  // Belt line: one continuous raised strake around the hull, at the waterline.
  c.box(92, 256 - HALF - 6, 62, 410, 256 - HALF + 2, 78, 'plate.dark');
  c.box(92, 256 + HALF - 2, 62, 410, 256 + HALF + 6, 78, 'plate.dark');
  c.box(408, 108, 62, 416, 404, 78, 'plate.dark');
  // Gunwale: a raised bulwark all the way round the deck. A boat hull is the
  // rim, not the deck — without it the whole vehicle read as a flat barge.
  c.box(100, 112, DECK_Z, 408, 124, DECK_Z + 16, 'plate.dark');
  c.box(100, 388, DECK_Z, 408, 400, DECK_Z + 16, 'plate.dark');
  c.box(96, 112, DECK_Z, 108, 400, DECK_Z + 18, 'plate.dark');
  for (let x = 120; x < 404; x += 40) {
    c.box(x, 110, DECK_Z + 4, x + 6, 126, DECK_Z + 20, 'steel.dark');
    c.box(x, 386, DECK_Z + 4, x + 6, 402, DECK_Z + 20, 'steel.dark');
  }
  c.box(100, 112, DECK_Z + 16, 408, 124, DECK_Z + 20, 'steel');

  // Splash rails: three deflecting strips a side, angled down towards the bow.
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const x = 150 + i * 90;
      const y = 256 + s * (HALF - 2);
      c.box(x, y - s * 4, 78, x + 70, y + s * 2, 86 - i * 4, 'steel');
    }
  }
  // Prow: the hull narrows and shallows towards the nose, so the front is a
  // wedge in plan *and* in elevation. The first attempt widened as it went
  // forward, which read as a diving board bolted to the glacis.
  for (let i = 0; i < 10; i++) {
    const x = 412 + i * 6;
    const halfY = 140 - i * 9;
    const zBot = 86 + i * 5;
    const zTop = DECK_Z - 4 - i * 3;
    c.box(x, 256 - halfY, zBot, x + 6, 256 + halfY, zTop, 'team.light');
    c.box(x, 256 - halfY, zBot, x + 6, 256 + halfY, zBot + 12, 'plate.dark');   // keel
    c.box(x, 256 - halfY, zTop - 4, x + 6, 256 + halfY, zTop, 'steel.dark');    // deck edge
  }
  c.box(470, 226, 92, 476, 286, DECK_Z - 34, 'steel.dark');        // stem post
  for (const y of [140, 372]) {
    liftingEye(c, { x: 436, y: y - 6, z: 104 });
    c.cylX(438, 450, y, 118, 11, 'steel.dark');
    c.cylX(450, 452, y, 118, 8, 'lamp.warm');
  }

  /* -------------------------------------------------------- screws + intake */
  // Transom: twin shrouded propellers, with the drive shafts running forward to
  // the final drives.
  c.box(60, 178, 46, 96, 334, 118, 'plate.dark');                 // transom plate
  for (const s2 of [-1, 1]) {                                      // screw cut-outs
    c.box(56, 256 + s2 * 66 - 34, 44, 64, 256 + s2 * 66 + 34, 112, 'steel.dark');
  }
  for (const s of [-1, 1]) {
    const y = 256 + s * 66;
    c.cylX(28, 62, y, 74, 30, 'steel.dark', { hollowR: 22 });      // shroud
    c.cylX(34, 40, y, 74, 5, 'steel.bright');                     // hub
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const by = Math.round(y + Math.cos(a) * 16);
      const bz = Math.round(74 + Math.sin(a) * 16);
      c.box(35, by - 3, bz - 3, 39, by + 3, bz + 3, 'steel');
    }
    c.cylX(58, 92, y, 74, 7, 'steel.dark');                       // shaft
  }
  // Snorkel: a raised intake behind the turret, caged so it cannot be crushed.
  c.cylZ(148, 256, DECK_Z - 4, DECK_Z + 64, 15, 'steel.dark');
  c.cylZ(148, 256, DECK_Z + 64, DECK_Z + 84, 19, 'steel.dark');
  c.cylZ(148, 256, DECK_Z + 84, DECK_Z + 88, 15, 'scorch');
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const bx = Math.round(148 + Math.cos(a) * 22);
    const by = Math.round(256 + Math.sin(a) * 22);
    c.box(bx - 2, by - 2, DECK_Z + 60, bx + 2, by + 2, DECK_Z + 90, 'steel');
  }
  // Two watertight deck hatches and the bilge pump.
  hatch(c, { cx: 200, cy: 200, z: DECK_Z + 2, r: 28 });
  hatch(c, { cx: 200, cy: 316, z: DECK_Z + 2, r: 28 });
  c.cylZ(200, 256, DECK_Z + 2, DECK_Z + 12, 12, 'steel.dark');
  c.cylZ(200, 256, DECK_Z + 12, DECK_Z + 16, 8, 'brass');
  louvres(c, { x0: 108, x1: 140, y0: 176, y1: 336, z: DECK_Z + 4, slat: 5 });
  c.box(236, 160, DECK_Z + 2, 268, 352, DECK_Z + 8, 'steel.dark');  // deck rail

  // Driver's position and the bow MG.
  hatch(c, { cx: 408, cy: 196, z: DECK_Z + 2, r: 24 });
  periscope(c, { x: 412, y: 176, z: DECK_Z + 2, w: 7, h: 5 });
  c.sphere(416, 316, DECK_Z + 6, 12, 'steel.dark', { top: true });
  c.cylX(416, 442, 316, DECK_Z + 6, 4, 'gunmetal');
  crate(c, { x0: 250, y0: 180, z0: DECK_Z + 4, x1: 288, y1: 236, z1: DECK_Z + 28,
    mat: 'canvas', lid: 'steel.dark' });
  cable(c, [[252, 340, DECK_Z + 6], [300, 348, DECK_Z + 6]], 'steel.dark');

  /* ----------------------------------------------------------------- turret */
  c.part('turret');
  c.ringZ(TURRET_X, 256, DECK_Z, DECK_Z + 8, 82, 66, 'steel.dark');
  castTurret(c, {
    cx: TURRET_X, cy: 256, halfX: 70, halfY: 76,
    z0: DECK_Z + 6, z1: TTOP, levels: 3, taper: 5, chamfer: 24,
  });
  c.bolts(TURRET_X, 256, DECK_Z + 8, 74, 18, 'steel', 2);
  c.box(TURRET_X + 56, 226, DECK_Z + 8, TURRET_X + 74, 286, TTOP - 12, 'team.dark');
  c.box(TURRET_X + 68, 232, GUN_Z - 22, TURRET_X + 80, 280, GUN_Z + 22, 'steel.dark');
  hatch(c, { cx: TURRET_X - 4, cy: 288, z: TTOP - 4, r: 18, part: 'turret' });
  c.box(TURRET_X - 24, 288, TTOP - 6, TURRET_X + 8, 312, TTOP + 6, 'steel.dark');
  c.box(TURRET_X + 4, 292, TTOP - 2, TURRET_X + 11, 308, TTOP + 3, 'optic');
  antenna(c, { x: TURRET_X - 30, y: 300, z: TTOP - 26, height: 84, part: 'turret' });
  c.box(TURRET_X - 52, 214, DECK_Z + 8, TURRET_X - 26, 298, TTOP - 26, 'team.dark');  // bustle
  c.pivot('turret', [TURRET_X, 256, DECK_Z]);
  c.dynamic('turret');
  c.traverse('turret');

  /* ----------------------------------------------------------------- barrel */
  // A light low-pressure gun: thin, unbraked, short. It is there to argue with
  // other light vehicles, not to duel a heavy tank.
  c.part('barrel');
  const BX = TURRET_X + 74;                       // 374
  c.cylX(BX, 430, 256, GUN_Z, 9, 'gunmetal');
  c.cylX(424, 448, 256, GUN_Z, 13, 'gunmetal.lit');             // bore evacuator
  c.cylX(452, 494, 256, GUN_Z, 8, 'steel.dark');
  for (let i = 0; i < 3; i++) {
    c.box(470 + i * 8, 246, GUN_Z - 10, 473 + i * 8, 266, GUN_Z + 10, 'steel.bright');
  }
  c.cylX(492, 496, 256, GUN_Z, 11, 'steel.dark');
  c.cylX(495, 497, 256, GUN_Z, 5, 'scorch');
  c.pivot('barrel', [BX, 256, GUN_Z]);
  c.parent('barrel', 'turret');
  c.dynamic('barrel');
  c.part('body');

  /* --------------------------------------------------------- surface pass */
  c.wear(0x2f65, 'steel.dark', { rate: 0.03, only: ['team.hull', 'team.light'] });
  c.mottle(0x5c1b, ['team.dark', 'team.light'], 0.018, { only: ['team.hull'] });
  return c;
}
