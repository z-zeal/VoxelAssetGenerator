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
  // The turret shell starts *at* deck height on a flush ring: no plinth, no
  // floating segment. Ring outer radius matches the hull race.
  c.ringZ(320, 256, DECK_Z, DECK_Z + 8, 106, 84, 'steel.dark');
  c.bolts(320, 256, DECK_Z + 8, 96, 22, 'steel', 3);

  // Cast turret as four shrinking slabs: the silhouette slopes inward with
  // height instead of reading as a tall box. Width runs 192 -> 132 voxels.
  const slabs = [
    [150, 168, 160, 352, 252, 390],
    [168, 186, 168, 344, 258, 384],
    [186, 198, 180, 332, 266, 376],
    [198, 206, 194, 318, 276, 366],
  ];
  for (const [z0, z1, y0, y1, x0, x1] of slabs) c.box(x0, y0, z0, x1, y1, z1, 'team.hull');
  // Sloped front plate cheeks (the mantlet recess sits between them).
  c.box(388, 160, 150, 396, 214, 190, 'team.dark');
  c.box(388, 298, 150, 396, 352, 190, 'team.dark');
  // Rear bustle: ammunition rack behind the crew compartment.
  c.box(232, 172, 150, 254, 340, 194, 'team.dark');
  c.box(236, 178, 194, 250, 334, 198, 'steel.dark');
  basketRack(c, { x0: 196, x1: 236, y0: 180, y1: 262, z0: 158, z1: 196, part: 'turret' });
  crate(c, { x0: 200, y0: 188, z0: 160, x1: 234, y1: 258, z1: 190, part: 'turret', mat: 'canvas' });

  // Commander's cupola, offset to the left of the gun.
  c.cylZ(322, 306, 206, 226, 34, 'team.hull');
  c.ringZ(322, 306, 226, 232, 34, 24, 'steel');
  hatch(c, { cx: 322, cy: 306, z: 232, r: 21, part: 'turret' });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const vx = Math.round(322 + Math.cos(a) * 28);
    const vy = Math.round(306 + Math.sin(a) * 28);
    c.box(vx - 3, vy - 3, 208, vx + 3, vy + 3, 220, 'steel.dark');
    c.box(vx - 2, vy - 2, 210, vx + 2, vy + 2, 218, 'glass');
  }
  // Roof AA machine gun on the cupola pintle.
  c.cylZ(322, 306, 236, 244, 4, 'steel.dark');
  c.box(312, 302, 244, 330, 310, 250, 'steel.dark');
  c.box(330, 303, 245, 372, 309, 249, 'gunmetal');
  c.cylX(368, 376, 306, 247, 4, 'steel');
  c.box(296, 298, 246, 312, 314, 252, 'steel.dark');

  // Loader's hatch and the gunner's sight on the roof.
  hatch(c, { cx: 300, cy: 210, z: 206, r: 18, part: 'turret' });
  periscope(c, { x: 290, y: 300, z: 206, w: 7, h: 5, part: 'turret' });
  c.box(344, 316, 200, 380, 342, 222, 'steel.dark');
  c.box(380, 320, 205, 390, 338, 218, 'optic');
  c.cylZ(366, 330, 222, 228, 7, 'steel');

  // Smoke launcher banks on the turret cheeks.
  smokeBank(c, { x: 370, y: 168, z: 186, dx: -7, dy: 12, part: 'turret' });
  smokeBank(c, { x: 370, y: 334, z: 186, dx: -7, dy: -12, part: 'turret' });
  liftingEye(c, { x: 262, y: 168, z: 204, part: 'turret' });
  liftingEye(c, { x: 262, y: 330, z: 204, part: 'turret' });
  for (let x = 276; x < 360; x += 24) {
    c.box(x, 162, 194, x + 12, 166, 198, 'steel.dark');
    c.box(x, 344, 194, x + 12, 348, 198, 'steel.dark');
  }
  antenna(c, { x: 240, y: 322, z: 196, height: 96, part: 'turret' });
  antenna(c, { x: 240, y: 190, z: 196, height: 72, part: 'turret' });
  c.pivot('turret', [320, 256, DECK_Z]);
  c.dynamic('turret');

  /* ----------------------------------------------------------------- barrel */
  // The mantlet closes the turret front and the tube runs clear of the hull
  // nose, so the barrel is never buried inside the turret shell.
  c.part('barrel');
  c.box(374, 212, 150, 398, 300, 194, 'team.dark');
  c.box(390, 224, 156, 412, 288, 188, 'steel.dark');
  c.cylX(404, 452, 256, 172, 12, 'gunmetal');
  c.cylX(450, 466, 256, 172, 17, 'gunmetal.lit');
  c.cylX(466, 502, 256, 172, 13, 'steel.dark');
  for (let i = 0; i < 3; i++) {
    c.box(470 + i * 10, 256 - 17, 168, 474 + i * 10, 256 + 17, 176, 'steel.bright');
  }
  c.cylX(502, 506, 256, 172, 8, 'scorch');
  c.box(400, 232, 160, 420, 252, 186, 'steel.dark');   // recoil cylinder
  c.cylX(404, 424, 280, 164, 5, 'steel');
  c.pivot('barrel', [400, 256, 172]);
  c.dynamic('barrel');
  c.part('body');

  /* ------------------------------------------------------------- surface pass */
  // Faction-agnostic wear: exposed team paint chips to steel at convex edges.
  c.wear(0x7a3c, 'steel.dark', { rate: 0.06 });
  c.mottle(0x51d2, ['team.dark', 'team.light'], 0.05);
  return c;
}
