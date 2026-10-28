/**
 * Infantry Fighting Vehicle — tracked, 16 facings.
 *
 * Between the APC and the tank: a troop box at the rear, a *small* auto-cannon
 * turret forward of it, and an ATGM launcher on the turret flank. Three
 * segments — `turret` traverses, `barrel` is the cannon, `atgm` is a separate
 * elevating launcher so a missile launch can be animated on its own pivot.
 */
import { hatch, periscope, antenna, crate, louvres, liftingEye, smokeBank } from '../kit.mjs';
import { trackGear, trackedHull, castTurret, applique, stowageRail } from '../kit-vehicles.mjs';

const DECK_Z = 150;
const CX = 306;          // small, forward-set ring

export function buildIfv(c) {
  /* ----------------------------------------------------------- running gear */
  const GEAR = {
    x0: 66, x1: 434, z0: 0, z1: 122,
    wheels: [114, 194, 274, 354], wheelR: 40, wheelZ: 60,
    sprocketX: 418, sprocketR: 43, idlerX: 82, idlerR: 41,
    rollers: [160, 250, 340], rollerZ: 114, linkWidth: 9,
  };
  trackGear(c, { side: 'L', ...GEAR, y0: 92, y1: 164 });
  trackGear(c, { side: 'R', ...GEAR, y0: 348, y1: 420, part: 'running.R' });

  /* ------------------------------------------------------------------ hull */
  trackedHull(c, {
    x0: 92, x1: 410,
    halfW: 136, lowerHalf: 90,
    bellyZ: 28, deckZ: DECK_Z,
    bevel: 2, bevelH: 38,
    glacis: { run: 70, noseZ: 94 },
    tail: false, nose: false,
  });

  c.part('body');
  // Sloped front with a splash rail and appliqué.
  c.box(472, 120, 96, 480, 392, 112, 'plate');
  applique(c, { x0: 120, x1: 396, y: 256 - 136, z0: DECK_Z - 40, z1: DECK_Z + 4, side: 'L' });
  applique(c, { x0: 120, x1: 396, y: 256 + 136, z0: DECK_Z - 40, z1: DECK_Z + 4, side: 'R' });

  // Rear troop compartment: raised box with roof hatches and a ramp.
  c.box(128, 256 - 136, DECK_Z - 2, 300, 256 + 136, DECK_Z + 66, 'team.hull');
  c.box(136, 256 - 128, DECK_Z + 66, 292, 256 + 128, DECK_Z + 78, 'team.hull');
  c.box(146, 256 - 112, DECK_Z + 78, 282, 256 + 112, DECK_Z + 84, 'team.light');
  for (const y of [256 - 66, 256 + 66]) {
    hatch(c, { cx: 214, cy: y, z: DECK_Z + 84, r: 24 });
  }
  c.box(128, 256 - 120, 34, 144, 256 + 120, DECK_Z + 60, 'team.dark');     // ramp
  for (let i = 0; i < 4; i++) {
    c.box(126, 256 - 104 + i * 52, 46, 130, 256 - 84 + i * 52, DECK_Z + 48, 'steel.dark');
  }
  // Firing ports down the compartment flanks.
  for (let x = 160; x < 290; x += 44) {
    for (const s of [-1, 1]) {
      const y = 256 + s * 136;
      c.box(x, s < 0 ? y - 6 : y - 2, DECK_Z + 14, x + 22, s < 0 ? y + 2 : y + 6, DECK_Z + 34, 'steel.dark');
    }
  }
  // Driver's station and nose kit.
  hatch(c, { cx: 392, cy: 196, z: DECK_Z + 4, r: 24 });
  periscope(c, { x: 398, y: 172, z: DECK_Z + 4, w: 7, h: 5 });
  periscope(c, { x: 398, y: 220, z: DECK_Z + 4, w: 7, h: 5 });
  for (const y of [144, 368]) {
    liftingEye(c, { x: 452, y: y - 6, z: 100 });
    c.cylX(458, 470, y, 124, 11, 'steel.dark');
    c.cylX(470, 472, y, 124, 8, 'lamp.warm');
  }
  c.box(464, 148, 92, 474, 364, 106, 'steel.dark');
  // Engine deck and the ATGM reload hatch between the compartment and the ring.
  louvres(c, { x0: 300, x1: 380, y0: 160, y1: 232, z: DECK_Z + 4, slat: 6 });
  louvres(c, { x0: 300, x1: 380, y0: 280, y1: 352, z: DECK_Z + 4, slat: 6 });
  c.box(294, 150, DECK_Z + 2, 386, 362, DECK_Z + 8, 'steel.dark');
  stowageRail(c, { x0: 140, x1: 280, y: 256 - 138, z: DECK_Z + 60, side: 'L', crates: 2 });
  smokeBank(c, { x: 300, y: 256 - 140, z: DECK_Z + 34, dx: -8, dy: 0, part: 'body' });
  antenna(c, { x: 150, y: 256 + 120, z: DECK_Z + 84, height: 96 });

  /* ----------------------------------------------------------------- turret */
  // Small and tall-ish: an auto-cannon turret, deliberately not a tank turret.
  c.part('turret');
  c.ringZ(CX, 256, DECK_Z, DECK_Z + 8, 84, 66, 'steel.dark');
  castTurret(c, {
    cx: CX, cy: 256, halfX: 80, halfY: 76,
    z0: DECK_Z + 6, z1: DECK_Z + 92, levels: 3, taper: 6, chamfer: 22,
  });
  c.bolts(CX, 256, DECK_Z + 8, 74, 18, 'steel', 3);
  // Gun face and sights.
  c.box(372, 224, DECK_Z + 6, 392, 288, DECK_Z + 62, 'team.dark');
  c.box(384, 232, DECK_Z + 12, 394, 252, DECK_Z + 50, 'team.light');
  c.box(330, 292, DECK_Z + 62, 372, 326, DECK_Z + 84, 'steel.dark');
  c.box(372, 298, DECK_Z + 66, 382, 320, DECK_Z + 80, 'optic');
  hatch(c, { cx: 286, cy: 214, z: DECK_Z + 92, r: 17, part: 'turret' });
  c.cylZ(300, 300, DECK_Z + 92, DECK_Z + 100, 12, 'steel.dark');
  antenna(c, { x: 258, y: 300, z: DECK_Z + 92, height: 88, part: 'turret' });
  c.pivot('turret', [CX, 256, DECK_Z]);
  c.dynamic('turret');
  c.traverse('turret');

  /* ----------------------------------------------------------------- cannon */
  c.part('barrel');
  c.box(376, 238, DECK_Z + 20, 400, 274, DECK_Z + 50, 'steel.dark');       // cradle
  c.cylX(394, 412, 256, DECK_Z + 34, 8, 'gunmetal');
  c.cylX(408, 430, 256, DECK_Z + 34, 6, 'gunmetal.lit');
  c.cylX(426, 444, 256, DECK_Z + 34, 7, 'steel.dark');                     // flash hider
  c.box(400, 244, DECK_Z + 50, 416, 268, DECK_Z + 60, 'steel.dark');       // feed cover
  c.pivot('barrel', [394, 256, DECK_Z + 34]);
  c.parent('barrel', 'turret');
  c.dynamic('barrel');

  /* -------------------------------------------------------------------- ATGM */
  // Launcher box on the turret's left shoulder: elevates on its own pivot.
  c.part('atgm');
  c.box(300, 170, DECK_Z + 62, 350, 208, DECK_Z + 104, 'steel.dark');
  for (let i = 0; i < 2; i++) {
    c.cylX(346, 374, 178 + i * 22, DECK_Z + 84, 11, 'canvas');
    c.cylX(370, 376, 178 + i * 22, DECK_Z + 84, 8, 'scorch');
    c.cylX(346, 352, 178 + i * 22, DECK_Z + 84, 12, 'steel.dark');
  }
  c.box(332, 166, DECK_Z + 78, 344, 212, DECK_Z + 96, 'steel');
  c.pivot('atgm', [306, 190, DECK_Z + 72]);
  c.parent('atgm', 'turret');
  c.dynamic('atgm');
  c.part('body');

  /* --------------------------------------------------------- surface pass */
  c.wear(0x47c1, 'steel.dark', { rate: 0.03, only: ['team.hull', 'team.light', 'plate'] });
  c.mottle(0x1a92, ['team.dark', 'team.light'], 0.02, { only: ['team.hull', 'plate'] });
  return c;
}
