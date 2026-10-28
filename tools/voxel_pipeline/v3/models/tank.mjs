/**
 * Light Tank — authored from scratch on the 512³ lattice.
 *
 * Frame: +X forward, Y lateral (256 = centre line), Z up (0 = ground).
 * Parts: `body` (hull, running gear, stowage), `turret` (rotating mass,
 * cupola, smoke banks, antenna), `barrel` (mantlet + gun, elevates on its
 * trunnion). The turret and barrel are independently blittable sprites, so the
 * runtime can traverse the gun without re-baking a whole-vehicle sheet.
 */
import {
  trackLoop, roadWheel, suspensionArm, louvres, crate, hatch, periscope,
  antenna, smokeBank, basketRack, liftingEye, seam, sandbags,
} from '../kit.mjs';

const HULL_Y0 = 168, HULL_Y1 = 344;
const DECK_Z = 146;
const TURRET_BASE = 158;

export function buildTank(c) {
  /* ----------------------------------------------------------- running gear */
  for (const side of ['L', 'R']) {
    const y0 = side === 'L' ? 96 : 344;
    const y1 = y0 + 72;
    const outboard = side === 'L' ? y0 - 6 : y1;
    const part = `running.${side}`;
    trackLoop(c, { x0: 60, x1: 468, y0, y1, z0: 0, z1: 126, part, linkWidth: 9 });

    // Road wheels proud of the outer track face (readable from every angle).
    c.part(part);
    for (const x of [116, 178, 240, 302, 364, 424]) {
      roadWheel(c, { x, y0: outboard, y1: outboard + 6, z: 62, r: 42, part });
      suspensionArm(c, { x, z: 34, y0: y0 + 20, y1: y1 - 20, part });
    }
    // Drive sprocket (front) and idler (rear) with real teeth.
    c.cylY(452, outboard, outboard + 7, 62, 50, 'steel.dark', { hollowR: 30 });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const tx = Math.round(452 + Math.cos(a) * 50);
      const tz = Math.round(62 + Math.sin(a) * 50);
      c.box(tx - 3, outboard, tz - 3, tx + 3, outboard + 7, tz + 3, 'steel');
    }
    c.cylY(452, outboard + 7, outboard + 9, 62, 18, 'steel.bright');
    c.cylY(74, outboard, outboard + 7, 62, 44, 'steel.dark', { hollowR: 26 });
    c.bolts(74, outboard + 7, 62, 30, 10, 'steel', 2);
    // Return rollers on the top run.
    for (const x of [156, 268, 380]) {
      c.cylY(x, outboard, outboard + 5, 118, 15, 'steel.dark');
      c.cylY(x, outboard + 5, outboard + 6, 118, 8, 'steel.bright');
    }
    // Mud flap and skirt lip.
    c.box(60, y0 - 4, 84, 96, y1 + 4, 130, 'rubber');
    c.box(60, y0 - 2, 126, 468, y1 + 2, 132, 'team.dark');
    c.part('body');
  }

  /* ------------------------------------------------------------------ hull */
  c.part('body');
  // Belly / lower hull between the tracks.
  c.box(104, HULL_Y0 - 28, 26, 432, HULL_Y1 + 28, 44, 'plate.dark');
  c.box(112, HULL_Y0 - 20, 44, 424, HULL_Y1 + 20, 96, 'team.dark');
  seam(c, { x0: 116, y0: HULL_Y0 - 18, z0: 72, x1: 420, y1: HULL_Y0 - 18, z1: 72 });
  seam(c, { x0: 116, y0: HULL_Y1 + 17, z0: 72, x1: 420, y1: HULL_Y1 + 17, z1: 72 });

  // Upper hull / sponsons overhanging both tracks.
  c.box(96, 88, 96, 440, 424, DECK_Z, 'team.hull');
  // Deck plate is a *paint* on the hull top, not a second stacked slab.
  c.paint((x, y, z) => z === DECK_Z - 1 && x >= 104 && x < 432 && y >= 96 && y < 416, 'team.light');
  c.box(104, 96, DECK_Z - 1, 432, 416, DECK_Z, 'team.light');
  // Side skirts with panel lines.
  for (let x = 104; x < 432; x += 22) {
    c.box(x, 88, 100, x + 1, 94, 142, 'team.dark');
  }
  c.rivets(102, 88, 140, 436, 88, 140, 14, 'steel.dark');
  c.rivets(102, 424, 140, 436, 424, 140, 14, 'steel.dark');
  // Fenders over the tracks.
  c.box(92, 84, 134, 446, 100, 140, 'plate');
  c.box(92, 412, 134, 446, 428, 140, 'plate');
  c.rivets(96, 86, 140, 444, 86, 140, 9, 'steel.dark');
  c.rivets(96, 426, 140, 444, 426, 140, 9, 'steel.dark');

  // Glacis: swept profile, surface only (top slope + walls + end caps).
  c.profileX(440, 496, 112, 400,
    x => DECK_Z - ((x - 440) / 56) * 54,
    () => 96,
    'team.hull');
  // Highlight band along the slope crest: paint, never stack another layer.
  c.paint((x, y, z) => x >= 440 && x < 496 && z >= DECK_Z - 8, 'team.light');
  // Nose beam, tow hooks, headlight brush guards.
  c.box(492, 108, 92, 500, 404, 104, 'steel.dark');
  for (const y of [136, 356]) {
    liftingEye(c, { x: 482, y: y - 6, z: 100 });
    c.box(496, y - 8, 104, 504, y + 8, 112, 'steel.dark');
    c.cylX(486, 500, y, 128, 13, 'steel.dark');              // lamp housing
    c.cylX(500, 502, y, 128, 10, 'lamp.warm');
    c.box(482, y - 16, 112, 486, y + 16, 118, 'steel');      // guard bar
    c.box(482, y - 16, 112, 502, y - 14, 140, 'steel.dark');
    c.box(482, y + 14, 112, 502, y + 16, 140, 'steel.dark');
  }
  // Spare track links stowed on the glacis.
  for (let i = 0; i < 5; i++) {
    const x = 452 + i * 8;
    for (let y = 156; y < 236; y += 10) {
      c.box(x, y, 126 - i * 8, x + 7, y + 8, 132 - i * 8, 'track.worn');
      c.box(x + 1, y + 2, 132 - i * 8, x + 6, y + 6, 134 - i * 8, 'steel.dark');
    }
  }

  // Driver's hatch + periscopes on the front deck.
  hatch(c, { cx: 420, cy: 210, z: DECK_Z + 4, r: 30 });
  periscope(c, { x: 428, y: 176, z: DECK_Z + 4, w: 7, h: 5 });
  periscope(c, { x: 428, y: 236, z: DECK_Z + 4, w: 7, h: 5 });
  c.box(400, 194, DECK_Z + 4, 416, 250, DECK_Z + 12, 'steel.dark');   // hatch shroud
  // Hull machine-gun ball mount (coaxial bow gun).
  c.sphere(438, 268, DECK_Z + 6, 12, 'steel.dark', { top: true });
  c.cylX(438, 470, 268, DECK_Z + 6, 4, 'gunmetal');

  // Engine deck: louvres, exhaust, radiator caps, stowage.
  louvres(c, { x0: 150, x1: 300, y0: 130, y1: 220, z: DECK_Z + 4, slat: 5 });
  louvres(c, { x0: 150, x1: 300, y0: 292, y1: 382, z: DECK_Z + 4, slat: 5 });
  c.box(146, 120, DECK_Z - 2, 304, 392, DECK_Z + 4, 'steel.dark');
  for (let y = 130; y < 382; y += 5) {
    c.box(150, y, DECK_Z + 3, 300, y + 3, DECK_Z + 6, 'steel');
  }
  c.cylZ(320, 150, DECK_Z + 4, DECK_Z + 12, 11, 'brass');       // fuel filler
  c.cylZ(320, 362, DECK_Z + 4, DECK_Z + 12, 11, 'brass');
  c.box(124, 356, DECK_Z + 2, 146, 404, DECK_Z + 22, 'steel.dark'); // exhaust shroud
  c.cylX(120, 126, 380, DECK_Z + 10, 9, 'rust');
  c.box(120, 366, DECK_Z + 2, 132, 394, DECK_Z + 18, 'gunmetal');

  // Rear plate: tow pintle, spare wheel, stowage bins.
  c.box(88, 120, 40, 100, 392, 140, 'team.dark');
  crate(c, { x0: 96, y0: 300, z0: 60, x1: 126, y1: 388, z1: 118, mat: 'wood', lid: 'steel.dark' });
  crate(c, { x0: 96, y0: 128, z0: 60, x1: 126, y1: 208, z1: 112, mat: 'canvas' });
  c.box(84, 236, 58, 96, 268, 74, 'steel.dark');                // pintle
  c.cylY(92, 234, 272, 88, 16, 'rubber');                       // spare wheel
  c.cylY(92, 272, 275, 88, 9, 'steel');

  // Tools and fittings on the sponsons.
  crate(c, { x0: 336, y0: 96, z0: DECK_Z + 4, x1: 428, y1: 126, z1: DECK_Z + 30, mat: 'canvas' });
  crate(c, { x0: 336, y0: 386, z0: DECK_Z + 4, x1: 428, y1: 416, z1: DECK_Z + 30, mat: 'canvas' });
  for (let x = 150; x < 300; x += 34) {
    c.box(x, 100, DECK_Z + 6, x + 16, 112, DECK_Z + 14, 'wood');   // pioneer tools
    c.box(x + 3, 111, DECK_Z + 6, x + 9, 114, DECK_Z + 18, 'steel.dark');
  }
  sandbags(c, { x0: 200, x1: 296, y0: 108, z0: DECK_Z + 4, rows: 1 });
  antenna(c, { x: 122, y: 190, z: DECK_Z + 4, height: 86 });

  /* ----------------------------------------------------------------- turret */
  c.part('turret');
  // Ring + basket floor.
  c.ringZ(320, 256, DECK_Z + 4, TURRET_BASE, 104, 78, 'steel.dark');
  c.bolts(320, 256, TURRET_BASE - 1, 92, 20, 'steel', 3);
  // Faceted turret body: stacked rings give a real sloped casting, not a box.
  const turretRings = [
    [158, 232, 176, 336],   // z0, z1, y0, y1 (rectangular core at the base)
    [232, 244, 182, 330],
    [244, 254, 190, 322],
  ];
  for (const [z0, z1, y0, y1] of turretRings) {
    c.box(244, y0, z0, 400, y1, z1, 'team.hull');
  }
  c.box(250, 188, 244, 394, 316, 256, 'team.light');
  // Sloped front cheeks and rear bustle.
  for (let x = 388; x < 412; x++) {
    const shrink = Math.round((x - 388) * 1.1);
    c.box(x, 186 + shrink, 158, x + 1, 322 - shrink, 232, 'team.hull');
  }
  c.box(232, 190, 168, 250, 322, 236, 'team.dark');
  c.box(214, 206, 172, 236, 306, 224, 'team.dark');
  crate(c, { x0: 202, y0: 216, z0: 176, x1: 232, y1: 296, z1: 214, part: 'turret', mat: 'canvas' });
  basketRack(c, { x0: 194, x1: 232, y0: 300, y1: 350, z0: 166, z1: 212, part: 'turret' });
  crate(c, { x0: 200, y0: 306, z0: 168, x1: 232, y1: 344, z1: 196, part: 'turret', mat: 'canvas' });

  // Commander's cupola with vision blocks and an AA mount.
  c.cylZ(386, 300, 254, 286, 40, 'team.hull');
  c.ringZ(386, 300, 286, 292, 40, 30, 'steel');
  hatch(c, { cx: 386, cy: 300, z: 292, r: 26, part: 'turret' });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const vx = Math.round(386 + Math.cos(a) * 33);
    const vy = Math.round(300 + Math.sin(a) * 33);
    c.box(vx - 3, vy - 3, 266, vx + 3, vy + 3, 280, 'steel.dark');
    c.box(vx - 2, vy - 2, 268, vx + 2, vy + 2, 278, 'glass');
  }
  // Roof AA machine gun on a pintle.
  c.cylZ(386, 300, 300, 312, 5, 'steel.dark');
  c.box(376, 296, 312, 392, 304, 320, 'steel.dark');
  c.box(388, 296, 314, 442, 302, 320, 'gunmetal');
  c.cylX(436, 446, 299, 317, 5, 'steel');
  c.box(360, 292, 316, 378, 308, 322, 'steel.dark');          // ammo box

  // Loader hatch, periscopes, gunner's sight.
  hatch(c, { cx: 300, cy: 206, z: 256, r: 24, part: 'turret' });
  periscope(c, { x: 300, y: 316, z: 256, w: 8, h: 6, part: 'turret' });
  c.box(342, 326, 246, 384, 352, 274, 'steel.dark');          // sight housing
  c.box(384, 330, 252, 396, 348, 268, 'optic');
  c.cylZ(352, 340, 274, 282, 9, 'steel');                     // sight head
  c.box(348, 334, 282, 360, 346, 286, 'glass');

  // Smoke launcher banks, one each side.
  smokeBank(c, { x: 380, y: 168, z: 226, dx: -6, dy: 12, part: 'turret' });
  smokeBank(c, { x: 380, y: 330, z: 226, dx: -6, dy: -12, part: 'turret' });
  // Lifting eyes, grab rails, stowage straps.
  liftingEye(c, { x: 268, y: 180, z: 254, part: 'turret' });
  liftingEye(c, { x: 268, y: 320, z: 254, part: 'turret' });
  for (let x = 270; x < 380; x += 26) {
    c.box(x, 182, 238, x + 14, 186, 242, 'steel.dark');       // side grab rails
    c.box(x, 326, 238, x + 14, 330, 242, 'steel.dark');
  }
  antenna(c, { x: 236, y: 316, z: 220, height: 104, part: 'turret' });
  antenna(c, { x: 236, y: 196, z: 220, height: 78, part: 'turret' });
  c.pivot('turret', [320, 256, TURRET_BASE]);
  c.dynamic('turret');

  /* ----------------------------------------------------------------- barrel */
  c.part('barrel');
  c.box(396, 200, 178, 424, 312, 238, 'team.dark');           // mantlet cheek
  c.box(400, 216, 184, 424, 296, 232, 'team.hull');
  c.box(404, 226, 192, 426, 286, 226, 'steel.dark');          // trunnion collar
  c.cylX(420, 486, 256, 208, 13, 'gunmetal');                 // tube
  c.cylX(420, 432, 256, 208, 17, 'steel.dark');               // breech collar
  c.cylX(452, 474, 256, 208, 19, 'gunmetal.lit');             // bore evacuator
  c.cylX(455, 471, 256, 208, 15, 'gunmetal');
  for (let x = 480; x < 500; x++) {
    c.cylX(x, x + 1, 256, 208, 16, 'steel.dark');             // muzzle brake
  }
  for (let i = 0; i < 3; i++) {
    c.box(482 + i * 6, 256 - 18, 208 - 4, 485 + i * 6, 256 + 18, 208 + 4, 'steel.bright');
  }
  c.cylX(496, 500, 256, 208, 9, 'scorch');                    // bore
  c.box(430, 244, 196, 446, 268, 220, 'steel.dark');          // recoil cylinder
  c.cylX(432, 452, 236, 200, 6, 'steel');
  c.cylX(432, 452, 276, 200, 6, 'steel');
  c.pivot('barrel', [420, 256, 208]);
  c.dynamic('barrel');
  c.part('body');

  /* ------------------------------------------------------------- surface pass */
  // Faction-agnostic wear: exposed team paint chips to steel at convex edges.
  c.wear(0x7a3c, 'steel.dark', { rate: 0.06 });
  c.mottle(0x51d2, ['team.dark', 'team.light'], 0.05);
  return c;
}
