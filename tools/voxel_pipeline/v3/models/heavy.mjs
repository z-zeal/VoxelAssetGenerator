/**
 * Heavy Tank — tracked, 16 facings.
 *
 * Deliberately not a scaled-up `tank`: six road wheels instead of five, a wider
 * track, a long 76-voxel glacis, a much larger cast turret with a bustle and
 * rear turret stowage, and a longer gun. The silhouette has to be readable as
 * "the bigger one" from the sprite alone, at 64 px.
 */
import {
  hatch, periscope, antenna, crate, louvres, liftingEye, smokeBank, basketRack,
  seam, sandbags,
} from '../kit.mjs';
import { trackGear, trackedHull, stowageRail, castTurret } from '../kit-vehicles.mjs';

const DECK_Z = 156;
const HALF = 176;
const TURRET_X = 306;

export function buildHeavy(c) {
  /* ----------------------------------------------------------- running gear */
  const GEAR = {
    x0: 40, x1: 470, z0: 0, z1: 134,
    wheels: [92, 152, 214, 276, 338, 400], wheelR: 44, wheelZ: 66,
    sprocketX: 452, sprocketR: 48, idlerX: 56, idlerR: 46,
    rollers: [130, 230, 330, 410], rollerZ: 126, linkWidth: 10,
  };
  trackGear(c, { side: 'L', ...GEAR, y0: 80, y1: 160 });
  trackGear(c, { side: 'R', ...GEAR, y0: 352, y1: 432, part: 'running.R' });

  /* ------------------------------------------------------------------ hull */
  trackedHull(c, {
    x0: 76, x1: 440,
    halfW: 150, lowerHalf: 96,
    bellyZ: 24, deckZ: DECK_Z,
    bevel: 3, bevelH: 60,
    glacis: { run: 40, noseZ: 100 },
    tail: false, nose: false,
  });

  c.part('body');
  // Heavy bolt strip along the flank chamfer.
  for (const s of [-1, 1]) {
    const y = 256 + s * (HALF - 8);
    c.rivets(96, y, DECK_Z - 24, 430, y, DECK_Z - 24, 11, 'steel.dark');
    c.rivets(96, y, DECK_Z - 46, 430, y, DECK_Z - 46, 11, 'steel.dark');
  }
  // Rear plate: twin exhausts, tow lugs, spare links, stowage bins.
  c.box(62, 256 - 130, 44, 78, 256 + 130, DECK_Z - 6, 'team.dark');
  for (const y of [190, 322]) {
    c.box(52, y - 16, 96, 66, y + 16, DECK_Z + 6, 'steel.dark');
    c.cylX(46, 54, y, DECK_Z - 10, 10, 'rust');
  }
  c.box(50, 256 - 30, 52, 64, 256 + 30, 70, 'steel.dark');    // pintle
  for (let i = 0; i < 4; i++) {
    c.box(78, 256 - 120 + i * 64, 128, 84, 256 - 96 + i * 64, 136, 'track.worn');
  }
  crate(c, { x0: 80, y0: 256 + 96, z0: DECK_Z - 2, x1: 130, y1: 256 + 150, z1: DECK_Z + 26,
    mat: 'wood', lid: 'steel.dark' });

  // Nose: beam, tow hooks, twin headlights behind brush guards, spare track.
  c.box(474, 100, 96, 484, 412, 110, 'steel.dark');
  for (const y of [130, 382]) {
    liftingEye(c, { x: 460, y: y - 6, z: 104 });
    c.box(470, y - 10, 112, 480, y + 10, 122, 'steel.dark');
    c.cylX(466, 478, y, 132, 14, 'steel.dark');
    c.cylX(478, 480, y, 132, 11, 'lamp.warm');
    c.box(460, y - 18, 118, 466, y + 18, 126, 'steel');
  }
  for (let i = 0; i < 6; i++) {
    const x = 424 + i * 9;
    for (let y = 150; y < 250; y += 11) {
      c.box(x, y, 136 - i * 9, x + 8, y + 9, 143 - i * 9, 'track.worn');
      c.box(x + 1, y + 2, 143 - i * 9, x + 7, y + 7, 145 - i * 9, 'steel.dark');
    }
  }

  // Driver's hatch + bow MG.
  hatch(c, { cx: 420, cy: 206, z: DECK_Z + 4, r: 32 });
  periscope(c, { x: 430, y: 172, z: DECK_Z + 4, w: 8, h: 5 });
  periscope(c, { x: 430, y: 238, z: DECK_Z + 4, w: 8, h: 5 });
  c.sphere(438, 300, DECK_Z + 6, 13, 'steel.dark', { top: true });
  c.cylX(438, 470, 300, DECK_Z + 6, 4, 'gunmetal');

  // Engine deck: paired louvre banks, exhaust caps, fuel fillers.
  louvres(c, { x0: 120, x1: 280, y0: 116, y1: 210, z: DECK_Z + 4, slat: 5 });
  louvres(c, { x0: 120, x1: 280, y0: 302, y1: 396, z: DECK_Z + 4, slat: 5 });
  c.box(112, 106, DECK_Z + 2, 288, 406, DECK_Z + 8, 'steel.dark');
  for (const y of [150, 362]) c.cylZ(292, y, DECK_Z + 4, DECK_Z + 12, 11, 'brass');
  // Spare road wheel laid flat on the back deck: a heavy-tank signature.
  c.cylZ(108, 256, DECK_Z + 4, DECK_Z + 18, 40, 'tyre');
  c.cylZ(108, 256, DECK_Z + 18, DECK_Z + 22, 26, 'steel.dark');
  c.cylZ(108, 256, DECK_Z + 22, DECK_Z + 24, 9, 'steel.bright');
  stowageRail(c, { x0: 150, x1: 290, y: 256 - HALF + 12, z: DECK_Z + 2, side: 'L', crates: 2 });
  sandbags(c, { x0: 300, x1: 380, y0: 116, z0: DECK_Z + 4, rows: 1 });
  antenna(c, { x: 96, y: 178, z: DECK_Z + 4, height: 96 });

  /* ----------------------------------------------------------------- turret */
  // Bigger ring, taller shell and a far bigger bustle than the light tank: the
  // "heavy" read has to survive a 64 px sprite.
  c.part('turret');
  c.ringZ(TURRET_X, 256, DECK_Z, DECK_Z + 10, 108, 88, 'steel.dark');
  const TTOP = DECK_Z + 96;
  castTurret(c, {
    cx: TURRET_X, cy: 256, halfX: 118, halfY: 112,
    z0: DECK_Z + 8, z1: TTOP, levels: 3, taper: 7, chamfer: 34,
  });
  c.bolts(TURRET_X, 256, DECK_Z + 10, 96, 26, 'steel', 3);

  // Flat gun face and trunnion cheeks.
  c.box(400, 208, DECK_Z + 8, 424, 304, TTOP - 40, 'team.dark');
  c.box(406, 216, DECK_Z + 14, 418, 240, TTOP - 50, 'team.light');
  c.box(406, 272, DECK_Z + 14, 418, 296, TTOP - 50, 'team.light');

  // Long bustle with an ammunition rack and a stowage basket.
  c.box(150, 178, DECK_Z + 8, 196, 334, TTOP - 46, 'team.dark');
  c.box(154, 184, TTOP - 46, 192, 328, TTOP - 40, 'steel.dark');
  basketRack(c, { x0: 104, x1: 152, y0: 172, y1: 254, z0: DECK_Z + 16, z1: TTOP - 54, part: 'turret' });
  crate(c, { x0: 110, y0: 180, z0: DECK_Z + 18, x1: 148, y1: 248, z1: TTOP - 58, part: 'turret',
    mat: 'canvas', lid: 'steel.dark' });

  // Commander's cupola, loader's hatch, gunner's sight.
  c.cylZ(TURRET_X + 18, 318, TTOP - 8, TTOP + 12, 38, 'team.hull');
  c.ringZ(TURRET_X + 18, 318, TTOP + 12, TTOP + 18, 38, 27, 'steel');
  hatch(c, { cx: TURRET_X + 18, cy: 318, z: TTOP + 18, r: 22, part: 'turret' });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const vx = Math.round(TURRET_X + 18 + Math.cos(a) * 31);
    const vy = Math.round(318 + Math.sin(a) * 31);
    c.box(vx - 3, vy - 3, TTOP - 4, vx + 3, vy + 3, TTOP + 9, 'steel.dark');
    c.box(vx - 2, vy - 2, TTOP - 2, vx + 2, vy + 2, TTOP + 7, 'glass');
  }
  // AA mount on the cupola.
  c.cylZ(TURRET_X + 18, 318, TTOP + 22, TTOP + 30, 4, 'steel.dark');
  c.box(TURRET_X + 8, 314, TTOP + 30, TURRET_X + 26, 322, TTOP + 36, 'steel.dark');
  c.box(TURRET_X + 26, 315, TTOP + 31, TURRET_X + 74, 321, TTOP + 35, 'gunmetal');
  hatch(c, { cx: TURRET_X - 6, cy: 200, z: TTOP - 6, r: 18, part: 'turret' });
  c.box(332, 296, TTOP - 18, 372, 330, TTOP + 2, 'steel.dark');
  c.box(372, 302, TTOP - 14, 382, 324, TTOP - 2, 'optic');
  c.cylZ(356, 314, TTOP + 2, TTOP + 8, 7, 'steel');
  smokeBank(c, { x: 388, y: 178, z: DECK_Z + 44, dx: -8, dy: 13, part: 'turret' });
  smokeBank(c, { x: 388, y: 322, z: DECK_Z + 44, dx: -8, dy: -13, part: 'turret' });
  liftingEye(c, { x: 226, y: 180, z: TTOP - 30, part: 'turret' });
  liftingEye(c, { x: 226, y: 330, z: TTOP - 30, part: 'turret' });
  antenna(c, { x: 200, y: 320, z: TTOP - 34, height: 104, part: 'turret' });
  antenna(c, { x: 200, y: 192, z: TTOP - 34, height: 80, part: 'turret' });
  c.pivot('turret', [TURRET_X, 256, DECK_Z]);
  c.dynamic('turret');
  c.traverse('turret');

  /* ----------------------------------------------------------------- barrel */
  c.part('barrel');
  c.box(378, 214, 168, 404, 298, 226, 'team.dark');
  c.box(396, 224, 176, 414, 288, 218, 'steel.dark');
  c.cylX(408, 462, 256, 196, 13, 'gunmetal');
  c.cylX(456, 478, 256, 196, 18, 'gunmetal.lit');            // bore evacuator
  c.cylX(476, 506, 256, 196, 12, 'steel.dark');
  c.cylX(504, 510, 256, 196, 15, 'steel.dark');              // muzzle brake
  c.cylX(509, 511, 256, 196, 7, 'scorch');
  for (let i = 0; i < 3; i++) {
    c.box(482 + i * 9, 256 - 16, 192, 485 + i * 9, 256 + 16, 200, 'steel.bright');
  }
  c.box(404, 238, 186, 424, 254, 210, 'steel.dark');         // recoil cylinder
  c.cylX(408, 430, 280, 190, 5, 'steel');
  c.pivot('barrel', [408, 256, 196]);
  c.parent('barrel', 'turret');
  c.dynamic('barrel');
  c.part('body');

  /* --------------------------------------------------------- surface pass */
  c.wear(0x6f21, 'steel.dark', { rate: 0.035, only: ['team.hull', 'team.light', 'plate'] });
  c.mottle(0x2c8d, ['team.dark', 'team.light'], 0.02, { only: ['team.hull', 'plate'] });
  return c;
}
