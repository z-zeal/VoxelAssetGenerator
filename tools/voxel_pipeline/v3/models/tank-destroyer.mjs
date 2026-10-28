/**
 * Tank Destroyer — tracked, 16 facings.
 *
 * A **casemate**, not a turreted tank: the superstructure is fixed and low, and
 * the gun sits in a collar in its sloped front plate. The `turret` part is that
 * collar-and-cradle mount, so the gun can still traverse for the segmentation
 * contract, but the silhouette is unmistakably a hull-mounted gun.
 */
import { hatch, periscope, antenna, crate, louvres, liftingEye, smokeBank, sandbags } from '../kit.mjs';
import { trackGear, trackedHull, applique, stowageRail } from '../kit-vehicles.mjs';

const DECK_Z = 142;
const GUN_Z = 190;

export function buildTankDestroyer(c) {
  /* ----------------------------------------------------------- running gear */
  const GEAR = {
    x0: 48, x1: 452, z0: 0, z1: 128,
    wheels: [96, 158, 220, 282, 344, 406], wheelR: 42, wheelZ: 62,
    sprocketX: 434, sprocketR: 46, idlerX: 68, idlerR: 44,
    rollers: [136, 250, 360], rollerZ: 120, linkWidth: 10, skirt: true,
  };
  trackGear(c, { side: 'L', ...GEAR, y0: 84, y1: 156 });
  trackGear(c, { side: 'R', ...GEAR, y0: 356, y1: 428, part: 'running.R' });

  /* ------------------------------------------------------------------ hull */
  // Lower, longer and wider than `heavy`: the casemate trades height for slope.
  trackedHull(c, {
    x0: 76, x1: 424,
    halfW: 152, lowerHalf: 96,
    bellyZ: 22, deckZ: DECK_Z,
    bevel: 3, bevelH: 46,
    glacis: { run: 54, noseZ: 92 },
    tail: false, nose: false,
  });

  /* ------------------------------------------------------------- casemate */
  c.part('body');
  // Fixed fighting compartment: box + chamfer, with a sloped front plate.
  c.box(186, 256 - 140, DECK_Z, 404, 256 + 140, DECK_Z + 92, 'team.hull');
  c.box(194, 256 - 132, DECK_Z + 92, 398, 256 + 132, DECK_Z + 104, 'team.hull');
  c.box(206, 256 - 118, DECK_Z + 104, 388, 256 + 118, DECK_Z + 110, 'team.light');
  // Sloped front plate sweeping down to the glacis (sweep kept shallow enough
  // that the gun collar still has something to sit in).
  c.profileX(404, 446, 256 - 140, 256 + 140,
    x => DECK_Z + 92 - (x - 424) * 1.6,
    () => DECK_Z - 42,
    'team.hull');
  c.paint((x, y, z) => x >= 404 && x < 446 && z >= DECK_Z + 46, 'team.light');
  // Bolt seams and the appliqué strip along the flanks.
  applique(c, { x0: 196, x1: 412, y: 256 - 140, z0: DECK_Z + 8, z1: DECK_Z + 88, side: 'L' });
  applique(c, { x0: 196, x1: 412, y: 256 + 140, z0: DECK_Z + 8, z1: DECK_Z + 88, side: 'R' });
  for (let x = 210; x < 410; x += 26) {
    c.box(x, 256 - 146, DECK_Z + 16, x + 2, 256 - 140, DECK_Z + 84, 'team.dark');
    c.box(x, 256 + 140, DECK_Z + 16, x + 2, 256 + 146, DECK_Z + 84, 'team.dark');
  }

  // Nose beam, tow lugs, lamps.
  c.box(478, 108, 90, 488, 404, 104, 'steel.dark');
  for (const y of [138, 374]) {
    liftingEye(c, { x: 464, y: y - 6, z: 96 });
    c.cylX(470, 482, y, 122, 12, 'steel.dark');
    c.cylX(482, 484, y, 122, 9, 'lamp.warm');
  }
  // Rear: exhausts, bins, spare track, tow pintle.
  c.box(58, 256 - 120, 44, 74, 256 + 120, DECK_Z - 4, 'team.dark');
  for (const y of [196, 316]) {
    c.box(44, y - 14, 92, 60, y + 14, DECK_Z + 10, 'steel.dark');
    c.cylX(38, 46, y, DECK_Z - 12, 9, 'rust');
  }
  crate(c, { x0: 64, y0: 256 + 90, z0: DECK_Z + 4, x1: 130, y1: 256 + 148, z1: DECK_Z + 34, mat: 'wood', lid: 'steel.dark' });
  crate(c, { x0: 64, y0: 256 - 148, z0: DECK_Z + 4, x1: 130, y1: 256 - 90, z1: DECK_Z + 34, mat: 'canvas' });
  for (let i = 0; i < 4; i++) {
    c.box(78, 256 - 116 + i * 60, DECK_Z - 2, 86, 256 - 96 + i * 60, DECK_Z + 6, 'track.worn');
  }

  // Driver's hatch forward-left of the casemate, periscopes, bow MG.
  hatch(c, { cx: 402, cy: 186, z: DECK_Z + 4, r: 24 });
  periscope(c, { x: 408, y: 166, z: DECK_Z + 4, w: 7, h: 5 });
  c.box(390, 300, DECK_Z + 4, 408, 330, DECK_Z + 22, 'steel.dark');
  c.cylX(406, 440, 315, DECK_Z + 12, 4, 'gunmetal');

  // Casemate roof kit: commander's cupola, loaders' hatches, fans, stowage.
  c.cylZ(268, 300, DECK_Z + 110, DECK_Z + 128, 30, 'team.hull');
  c.ringZ(268, 300, DECK_Z + 128, DECK_Z + 134, 30, 21, 'steel');
  hatch(c, { cx: 268, cy: 300, z: DECK_Z + 134, r: 19 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const vx = Math.round(268 + Math.cos(a) * 24);
    const vy = Math.round(300 + Math.sin(a) * 24);
    c.box(vx - 3, vy - 3, DECK_Z + 114, vx + 3, vy + 3, DECK_Z + 126, 'steel.dark');
    c.box(vx - 2, vy - 2, DECK_Z + 116, vx + 2, vy + 2, DECK_Z + 124, 'glass');
  }
  hatch(c, { cx: 230, cy: 210, z: DECK_Z + 110, r: 17 });
  hatch(c, { cx: 230, cy: 250, z: DECK_Z + 110, r: 17 });
  c.cylZ(360, 210, DECK_Z + 110, DECK_Z + 118, 13, 'steel.dark');      // extractor fans
  c.cylZ(360, 302, DECK_Z + 110, DECK_Z + 118, 13, 'steel.dark');
  stowageRail(c, { x0: 210, x1: 330, y: 256 - 146, z: DECK_Z + 100, side: 'L', crates: 2 });
  smokeBank(c, { x: 396, y: 256 - 150, z: DECK_Z + 60, dx: -8, dy: 0, part: 'body' });
  smokeBank(c, { x: 396, y: 256 + 150, z: DECK_Z + 60, dx: -8, dy: 0, part: 'body' });
  antenna(c, { x: 206, y: 330, z: DECK_Z + 110, height: 116 });
  sandbags(c, { x0: 300, x1: 380, y0: 256 - 128, z0: DECK_Z + 110, rows: 1 });

  /* ------------------------------------------------- gun mount (traverses) */
  // A collar in the front plate riding on a short barbette: the gun can swing,
  // the casemate cannot.
  c.part('turret');
  // The collar must stay *inside* the barrel's start, or it swallows the tube
  // whole and the barrel part comes out empty.
  c.cylZ(400, 256, DECK_Z + 26, DECK_Z + 74, 38, 'steel.dark');
  c.ringZ(400, 256, DECK_Z + 74, DECK_Z + 80, 38, 26, 'steel');
  c.box(380, 228, DECK_Z + 34, 404, 284, GUN_Z + 26, 'team.dark');      // collar shell
  c.box(424, 222, GUN_Z - 18, 442, 290, GUN_Z + 18, 'steel.dark');      // mantlet ring
  c.bolts(400, 256, DECK_Z + 80, 32, 12, 'steel', 2);
  c.pivot('turret', [400, 256, DECK_Z + 50]);
  c.dynamic('turret');
  c.traverse('turret');

  /* ----------------------------------------------------------------- barrel */
  c.part('barrel');
  c.cylX(440, 480, 256, GUN_Z, 11, 'gunmetal');
  c.cylX(474, 488, 256, GUN_Z, 15, 'gunmetal.lit');                     // evacuator
  c.cylX(486, 500, 256, GUN_Z, 11, 'steel.dark');
  c.cylX(499, 508, 256, GUN_Z, 14, 'steel.dark');                       // muzzle brake
  c.cylX(507, 511, 256, GUN_Z, 7, 'scorch');
  c.box(446, 240, GUN_Z - 12, 458, 272, GUN_Z + 12, 'steel.dark');
  c.pivot('barrel', [442, 256, GUN_Z]);
  c.parent('barrel', 'turret');
  c.dynamic('barrel');
  c.part('body');

  /* --------------------------------------------------------- surface pass */
  c.wear(0x1d47, 'steel.dark', { rate: 0.03, only: ['team.hull', 'team.light', 'plate'] });
  c.mottle(0x5e2a, ['team.dark', 'team.light'], 0.02, { only: ['team.hull', 'plate'] });
  return c;
}
