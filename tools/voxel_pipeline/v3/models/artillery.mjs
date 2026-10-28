/**
 * Self-Propelled Artillery — tracked, 16 facings.
 *
 * Reads as a howitzer, not a tank: the turret sits at the *rear* so the gun can
 * overhang the nose, the barrel is long and already elevated (elevation is a
 * re-bake in this pipeline, so the service angle ships in the sheet), and there
 * are recoil spades and a ground anchor at the back.
 */
import { hatch, periscope, antenna, crate, louvres, liftingEye, smokeBank, sandbags } from '../kit.mjs';
import { trackGear, trackedHull, castTurret, slantedBarrel, muzzleBrake } from '../kit-vehicles.mjs';

const DECK_Z = 150;
const CX = 268;          // turret ring, well aft
const GUN_Z = 208;       // trunnion height
const ELEV = 96;         // barrel rise over its length: ~19°

export function buildArtillery(c) {
  /* ----------------------------------------------------------- running gear */
  const GEAR = {
    x0: 54, x1: 452, z0: 0, z1: 130,
    wheels: [100, 162, 224, 286, 348, 410], wheelR: 42, wheelZ: 64,
    sprocketX: 434, sprocketR: 46, idlerX: 72, idlerR: 44,
    rollers: [140, 250, 360], rollerZ: 122, linkWidth: 10,
  };
  trackGear(c, { side: 'L', ...GEAR, y0: 84, y1: 158 });
  trackGear(c, { side: 'R', ...GEAR, y0: 354, y1: 428, part: 'running.R' });

  /* ------------------------------------------------------------------ hull */
  trackedHull(c, {
    x0: 80, x1: 416,
    halfW: 146, lowerHalf: 94,
    bellyZ: 24, deckZ: DECK_Z,
    bevel: 3, bevelH: 50,
    glacis: { run: 58, noseZ: 98 },
    tail: false, nose: false,
  });

  c.part('body');
  // Nose: beam, tow lugs, lamps.
  c.box(470, 104, 96, 480, 408, 108, 'steel.dark');
  for (const y of [132, 380]) {
    liftingEye(c, { x: 456, y: y - 6, z: 100 });
    c.cylX(462, 474, y, 126, 12, 'steel.dark');
    c.cylX(474, 476, y, 126, 9, 'lamp.warm');
  }
  // Driver's hatch and periscopes, forward of the ring.
  hatch(c, { cx: 396, cy: 196, z: DECK_Z + 4, r: 26 });
  periscope(c, { x: 400, y: 170, z: DECK_Z + 4, w: 7, h: 5 });
  periscope(c, { x: 400, y: 216, z: DECK_Z + 4, w: 7, h: 5 });
  // Front deck: ammunition lockers and the gun travel lock.
  c.box(330, 150, DECK_Z + 4, 380, 210, DECK_Z + 30, 'team.dark');
  c.box(330, 302, DECK_Z + 4, 380, 362, DECK_Z + 30, 'team.dark');
  c.box(430, 244, DECK_Z + 4, 448, 268, DECK_Z + 40, 'steel.dark');   // travel lock
  c.box(440, 248, DECK_Z + 40, 452, 264, DECK_Z + 46, 'steel');

  // Rear: recoil spades, ground anchor, exhaust, stowage.
  c.box(40, 150, 40, 62, 362, 74, 'steel.dark');
  for (const y of [166, 346]) {
    c.box(22, y - 8, 34, 46, y + 8, 78, 'steel.dark');                // spade blade
    c.box(46, y - 4, 60, 84, y + 4, 70, 'steel');
  }
  c.box(30, 236, 44, 44, 276, 64, 'steel.dark');                      // anchor pintle
  c.box(64, 236, 84, 80, 276, 122, 'steel.dark');
  louvres(c, { x0: 360, x1: 404, y0: 168, y1: 226, z: DECK_Z + 4, slat: 6 });
  louvres(c, { x0: 360, x1: 404, y0: 286, y1: 344, z: DECK_Z + 4, slat: 6 });
  crate(c, { x0: 96, y0: 300, z0: DECK_Z + 4, x1: 180, y1: 372, z1: DECK_Z + 34, mat: 'canvas' });
  crate(c, { x0: 96, y0: 140, z0: DECK_Z + 4, x1: 180, y1: 212, z1: DECK_Z + 34, mat: 'wood', lid: 'steel.dark' });
  antenna(c, { x: 100, y: 256, z: DECK_Z + 34, height: 120 });
  sandbags(c, { x0: 200, x1: 280, y0: 148, z0: DECK_Z + 4, rows: 1 });

  /* ----------------------------------------------------------------- turret */
  c.part('turret');
  c.ringZ(CX, 256, DECK_Z, DECK_Z + 10, 118, 96, 'steel.dark');
  castTurret(c, {
    cx: CX, cy: 256, halfX: 116, halfY: 108,
    z0: DECK_Z + 8, z1: DECK_Z + 96, levels: 3, taper: 6, chamfer: 34,
  });
  // Flat gun face and the trunnion cheeks the tube swings between.
  c.box(372, 200, DECK_Z + 8, 392, 312, DECK_Z + 74, 'team.dark');
  c.box(378, 206, DECK_Z + 16, 386, 236, DECK_Z + 62, 'team.light');
  c.box(378, 276, DECK_Z + 16, 386, 306, DECK_Z + 62, 'team.light');
  c.box(392, 214, GUN_Z - 26, 404, 236, GUN_Z + 26, 'steel.dark');    // trunnion cheek
  c.box(392, 276, GUN_Z - 26, 404, 298, GUN_Z + 26, 'steel.dark');
  c.bolts(CX, 256, DECK_Z + 10, 104, 24, 'steel', 3);

  // Commander's cupola, sight, radio mount, roof stowage.
  c.cylZ(250, 300, DECK_Z + 96, DECK_Z + 114, 32, 'team.hull');
  c.ringZ(250, 300, DECK_Z + 114, DECK_Z + 120, 32, 22, 'steel');
  hatch(c, { cx: 250, cy: 300, z: DECK_Z + 120, r: 20, part: 'turret' });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const vx = Math.round(250 + Math.cos(a) * 26);
    const vy = Math.round(300 + Math.sin(a) * 26);
    c.box(vx - 3, vy - 3, DECK_Z + 100, vx + 3, vy + 3, DECK_Z + 112, 'steel.dark');
    c.box(vx - 2, vy - 2, DECK_Z + 102, vx + 2, vy + 2, DECK_Z + 110, 'glass');
  }
  c.box(300, 300, DECK_Z + 86, 340, 330, DECK_Z + 108, 'steel.dark');  // panoramic sight
  c.box(340, 306, DECK_Z + 90, 350, 324, DECK_Z + 104, 'optic');
  hatch(c, { cx: 300, cy: 210, z: DECK_Z + 86, r: 18, part: 'turret' });
  c.box(180, 180, DECK_Z + 8, 214, 332, DECK_Z + 58, 'team.dark');      // rear bustle
  crate(c, { x0: 186, y0: 190, z0: DECK_Z + 12, x1: 210, y1: 250, z1: DECK_Z + 48,
    part: 'turret', mat: 'canvas' });
  smokeBank(c, { x: 360, y: 196, z: DECK_Z + 40, dx: -8, dy: 12, part: 'turret' });
  smokeBank(c, { x: 360, y: 316, z: DECK_Z + 40, dx: -8, dy: -12, part: 'turret' });
  antenna(c, { x: 210, y: 320, z: DECK_Z + 58, height: 104, part: 'turret' });
  c.pivot('turret', [CX, 256, DECK_Z]);
  c.dynamic('turret');
  c.traverse('turret');

  /* ----------------------------------------------------------------- barrel */
  c.part('barrel');
  // Cradle, recoil sleeves, then the elevated tube.
  c.box(372, 222, GUN_Z - 26, 412, 290, GUN_Z + 30, 'team.dark');
  c.box(386, 228, GUN_Z - 20, 420, 284, GUN_Z + 22, 'steel.dark');
  c.box(384, 232, GUN_Z + 22, 430, 280, GUN_Z + 34, 'steel.dark');       // recoil cylinders
  slantedBarrel(c, {
    x0: 416, x1: 500, y: 256, z0: GUN_Z, z1: GUN_Z + ELEV, r0: 13, r1: 11, mat: 'gunmetal',
  });
  muzzleBrake(c, { x: 503, y: 256, z: GUN_Z + ELEV, r: 16 });
  c.pivot('barrel', [390, 256, GUN_Z]);
  c.parent('barrel', 'turret');
  c.dynamic('barrel');
  c.part('body');

  /* --------------------------------------------------------- surface pass */
  c.wear(0x4b2e, 'steel.dark', { rate: 0.03, only: ['team.hull', 'team.light', 'plate'] });
  c.mottle(0x7781, ['team.dark', 'team.light'], 0.02, { only: ['team.hull', 'plate'] });
  return c;
}
