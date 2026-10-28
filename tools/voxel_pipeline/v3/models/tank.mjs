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
  louvres, crate, hatch, periscope, antenna, smokeBank, basketRack, liftingEye,
  seam, sandbags,
} from '../kit.mjs';
import { trackGear, trackedHull, castTurret } from '../kit-vehicles.mjs';

const HULL_Y0 = 168, HULL_Y1 = 344;
const DECK_Z = 146;
const TURRET_BASE = 158;

export function buildTank(c) {
  /* ----------------------------------------------------------- running gear */
  // Track band geometry: 72 voxels wide, outer face on the hull's shoulder.
  const GEAR = {
    x0: 60, x1: 424, z0: 0, z1: 126,
    wheels: [112, 168, 224, 280, 336], wheelR: 42, wheelZ: 62,
    sprocketX: 408, sprocketR: 46, idlerX: 74, idlerR: 44,
    rollers: [150, 250, 340], rollerZ: 118, linkWidth: 9,
  };
  trackGear(c, { side: 'L', ...GEAR, y0: 96, y1: 168 });
  trackGear(c, { side: 'R', ...GEAR, y0: 344, y1: 416, part: 'running.R' });

  /* ------------------------------------------------------------------ hull */
  // Bevelled sponson + swept glacis: the hull is a shape, not a box.
  trackedHull(c, {
    x0: 88, x1: 406,
    halfW: 140, lowerHalf: 88,
    bellyZ: 26, deckZ: DECK_Z,
    bevel: 3, bevelH: 54,
    glacis: { run: 56, noseZ: 96 },
    tail: false, nose: false,
  });

  c.part('body');
  // Side panel lines on the sponson flank.
  for (let x = 104; x < 406; x += 22) {
    c.box(x, 88, 100, x + 1, 94, 142, 'team.dark');
  }
  c.rivets(102, 88, 140, 404, 88, 140, 14, 'steel.dark');
  c.rivets(102, 424, 140, 404, 424, 140, 14, 'steel.dark');
  // Fender edges either side of the glacis.
  c.box(92, 84, 134, 420, 100, 140, 'plate');
  c.box(92, 412, 134, 420, 428, 140, 'plate');

  // Nose beam, tow hooks, headlight brush guards.
  c.box(458, 108, 92, 466, 404, 104, 'steel.dark');
  for (const y of [136, 356]) {
    liftingEye(c, { x: 448, y: y - 6, z: 100 });
    c.box(462, y - 8, 104, 470, y + 8, 112, 'steel.dark');
    c.cylX(452, 466, y, 128, 13, 'steel.dark');              // lamp housing
    c.cylX(466, 468, y, 128, 10, 'lamp.warm');
    c.box(448, y - 16, 112, 452, y + 16, 118, 'steel');      // guard bar
    c.box(448, y - 16, 112, 468, y - 14, 140, 'steel.dark');
    c.box(448, y + 14, 112, 468, y + 16, 140, 'steel.dark');
  }
  // Spare track links stowed on the glacis.
  for (let i = 0; i < 5; i++) {
    const x = 416 + i * 8;
    for (let y = 156; y < 236; y += 10) {
      c.box(x, y, 126 - i * 8, x + 7, y + 8, 132 - i * 8, 'track.worn');
      c.box(x + 1, y + 2, 132 - i * 8, x + 6, y + 6, 134 - i * 8, 'steel.dark');
    }
  }

  // Driver's hatch + periscopes on the front deck.
  hatch(c, { cx: 398, cy: 204, z: DECK_Z + 4, r: 26 });
  periscope(c, { x: 402, y: 178, z: DECK_Z + 4, w: 7, h: 5 });
  periscope(c, { x: 402, y: 224, z: DECK_Z + 4, w: 7, h: 5 });
  c.box(380, 186, DECK_Z + 4, 396, 238, DECK_Z + 12, 'steel.dark');   // hatch shroud
  // Hull machine-gun ball mount (coaxial bow gun).
  c.sphere(404, 268, DECK_Z + 6, 12, 'steel.dark', { top: true });
  c.cylX(404, 440, 268, DECK_Z + 6, 4, 'gunmetal');

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
  // Flush ring at deck level: no plinth, no floating segment.
  c.ringZ(306, 256, DECK_Z, DECK_Z + 8, 100, 82, 'steel.dark');

  // Cast turret: stacked rings, each narrower than the last, so the shell
  // slopes inward on every side. A box turret reads as a bunker at 64 px; a
  // squat one reads as a lid. 96-radius over 90 of height is the balance.
  const TTOP = DECK_Z + 90;
  castTurret(c, {
    cx: 306, cy: 256, halfX: 104, halfY: 96,
    z0: DECK_Z + 6, z1: TTOP, levels: 3, taper: 7, chamfer: 30,
  });

  // Flat gun face: a cast turret is round in plan, but its front plate is not.
  c.box(392, 214, DECK_Z + 6, 410, 298, TTOP - 36, 'team.dark');
  c.box(396, 220, DECK_Z + 10, 406, 240, TTOP - 44, 'team.light');
  c.box(396, 272, DECK_Z + 10, 406, 292, TTOP - 44, 'team.light');
  c.bolts(306, 256, DECK_Z + 8, 88, 24, 'steel.dark', 3);

  // Rear bustle: ammunition rack behind the crew compartment, in a basket.
  c.box(184, 186, DECK_Z + 6, 214, 326, TTOP - 42, 'team.dark');
  c.box(188, 192, TTOP - 42, 210, 320, TTOP - 36, 'steel.dark');
  basketRack(c, { x0: 140, x1: 186, y0: 192, y1: 262, z0: DECK_Z + 14, z1: TTOP - 46, part: 'turret' });
  crate(c, { x0: 146, y0: 200, z0: DECK_Z + 16, x1: 182, y1: 256, z1: TTOP - 50, part: 'turret', mat: 'canvas' });

  // Commander's cupola (left of the gun) with a vision ring.
  c.cylZ(312, 300, TTOP - 8, TTOP + 10, 34, 'team.hull');
  c.ringZ(312, 300, TTOP + 10, TTOP + 16, 34, 24, 'steel');
  hatch(c, { cx: 312, cy: 300, z: TTOP + 16, r: 21, part: 'turret' });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const vx = Math.round(312 + Math.cos(a) * 28);
    const vy = Math.round(300 + Math.sin(a) * 28);
    c.box(vx - 3, vy - 3, TTOP - 4, vx + 3, vy + 3, TTOP + 8, 'steel.dark');
    c.box(vx - 2, vy - 2, TTOP - 2, vx + 2, vy + 2, TTOP + 6, 'glass');
  }
  // Roof AA machine gun on the cupola pintle.
  c.cylZ(312, 300, TTOP + 20, TTOP + 28, 4, 'steel.dark');
  c.box(302, 296, TTOP + 28, 320, 304, TTOP + 34, 'steel.dark');
  c.box(320, 297, TTOP + 29, 362, 303, TTOP + 33, 'gunmetal');
  c.cylX(358, 366, 300, TTOP + 31, 4, 'steel');
  c.box(286, 292, TTOP + 30, 302, 308, TTOP + 36, 'steel.dark');

  // Loader's hatch, gunner's sight and the smoke banks.
  hatch(c, { cx: 300, cy: 214, z: TTOP - 6, r: 16, part: 'turret' });
  periscope(c, { x: 320, y: 292, z: TTOP - 6, w: 7, h: 5, part: 'turret' });
  c.box(330, 298, TTOP - 16, 364, 328, TTOP + 2, 'steel.dark');
  c.box(364, 304, TTOP - 12, 374, 322, TTOP - 2, 'optic');
  c.cylZ(350, 314, TTOP + 2, TTOP + 8, 7, 'steel');
  smokeBank(c, { x: 362, y: 190, z: DECK_Z + 40, dx: -7, dy: 12, part: 'turret' });
  smokeBank(c, { x: 362, y: 322, z: DECK_Z + 40, dx: -7, dy: -12, part: 'turret' });
  liftingEye(c, { x: 244, y: 190, z: TTOP - 26, part: 'turret' });
  liftingEye(c, { x: 244, y: 322, z: TTOP - 26, part: 'turret' });
  antenna(c, { x: 222, y: 312, z: TTOP - 30, height: 96, part: 'turret' });
  antenna(c, { x: 222, y: 200, z: TTOP - 30, height: 72, part: 'turret' });
  c.pivot('turret', [306, 256, DECK_Z]);
  c.dynamic('turret');
  c.traverse('turret');

  /* ----------------------------------------------------------------- barrel */
  // The mantlet closes the turret front and the tube runs clear of the hull
  // nose, so the barrel is never buried inside the turret shell.
  c.part('barrel');
  // Mantlet is deliberately narrow: it only has to close the turret front, and a
  // wide slab swallows the gun silhouette at iso scale.
  c.box(384, 228, 158, 404, 284, 186, 'team.dark');
  c.box(398, 238, 164, 412, 274, 180, 'steel.dark');
  // Tube: slimmer, and long enough to overhang the hull nose by ~40 voxels so a
  // traverse is unmistakable.
  c.cylX(406, 458, 256, 172, 11, 'gunmetal');
  c.cylX(454, 474, 256, 172, 16, 'gunmetal.lit');             // bore evacuator
  c.cylX(472, 502, 256, 172, 12, 'steel.dark');
  for (let i = 0; i < 3; i++) {
    c.box(476 + i * 9, 256 - 15, 168, 479 + i * 9, 256 + 15, 176, 'steel.bright');
  }
  c.cylX(501, 510, 256, 172, 15, 'steel.dark');               // muzzle brake
  c.cylX(509, 511, 256, 172, 7, 'scorch');                    // bore
  c.box(404, 240, 164, 422, 254, 182, 'steel.dark');          // recoil cylinder
  c.cylX(406, 426, 276, 166, 5, 'steel');
  c.pivot('barrel', [408, 256, 172]);
  c.parent('barrel', 'turret');   // the gun rides the turret ring
  c.dynamic('barrel');
  c.part('body');

  /* ------------------------------------------------------------- surface pass */
  // Faction-agnostic wear: exposed team paint chips to steel at convex edges.
  c.wear(0x7a3c, 'steel.dark', { rate: 0.03, only: ['team.hull', 'team.light', 'plate'] });
  c.mottle(0x51d2, ['team.dark', 'team.light'], 0.02, { only: ['team.hull', 'plate'] });
  return c;
}
