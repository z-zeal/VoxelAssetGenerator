/**
 * Self-Propelled Anti-Aircraft — tracked, 16 facings.
 *
 * The silhouette that has to read: an **open-topped** box turret, twin
 * autocannons pointing at the sky, and a radar dish on a mast. Three segments
 * that move independently — `turret` (traverse), `barrel` (twin guns), `radar`
 * (spins, but does not traverse: it is an animation, not a yaw).
 */
import { hatch, periscope, antenna, crate, louvres, liftingEye, cable } from '../kit.mjs';
import { trackGear, trackedHull, engineDeck, slantedBarrel } from '../kit-vehicles.mjs';

const DECK_Z = 138;
const GUN_Y = 232;        // left tube; the right one is mirrored about 256
const ELEV = 150;         // rise over the tube: ~62°

export function buildAntiair(c) {
  /* ----------------------------------------------------------- running gear */
  const GEAR = {
    x0: 78, x1: 424, z0: 0, z1: 118,
    wheels: [126, 202, 278, 354], wheelR: 40, wheelZ: 58,
    sprocketX: 408, sprocketR: 42, idlerX: 92, idlerR: 40,
    rollers: [180, 260, 340], rollerZ: 110, linkWidth: 9,
  };
  trackGear(c, { side: 'L', ...GEAR, y0: 96, y1: 166 });
  trackGear(c, { side: 'R', ...GEAR, y0: 346, y1: 416, part: 'running.R' });

  /* ------------------------------------------------------------------ hull */
  trackedHull(c, {
    x0: 100, x1: 400,
    halfW: 132, lowerHalf: 88,
    bellyZ: 26, deckZ: DECK_Z,
    bevel: 2, bevelH: 40,
    glacis: { run: 62, noseZ: 92 },
    tail: false, nose: false,
  });

  c.part('body');
  // Nose: beam, towing eyes, lamps, a splash plate.
  c.box(456, 118, 92, 466, 394, 104, 'steel.dark');
  for (const y of [140, 372]) {
    liftingEye(c, { x: 442, y: y - 6, z: 96 });
    c.cylX(448, 460, y, 118, 11, 'steel.dark');
    c.cylX(460, 462, y, 118, 8, 'lamp.warm');
  }
  c.box(444, 150, 96, 452, 362, 112, 'plate');                 // splash rail
  // Driver's station, forward-left of the ring.
  hatch(c, { cx: 388, cy: 190, z: DECK_Z + 4, r: 24 });
  periscope(c, { x: 394, y: 166, z: DECK_Z + 4, w: 7, h: 5 });
  periscope(c, { x: 394, y: 210, z: DECK_Z + 4, w: 7, h: 5 });
  // Engine deck aft, generator box, cable runs.
  engineDeck(c, { x0: 132, x1: 236, deckZ: DECK_Z, halfW: 132, exhaustSide: -1 });
  c.box(112, 176, DECK_Z + 4, 148, 336, DECK_Z + 44, 'steel.dark');   // generator
  cable(c, [[150, 176, DECK_Z + 44], [190, 150, DECK_Z + 10], [240, 140, DECK_Z + 6]],
    'steel.dark', 'body');
  crate(c, { x0: 112, y0: 350, z0: DECK_Z + 4, x1: 180, y1: 400, z1: DECK_Z + 30, mat: 'canvas' });
  antenna(c, { x: 128, y: 200, z: DECK_Z + 44, height: 92 });

  /* ----------------------------------------------------------------- turret */
  // Open-topped: four walls, no roof, so the gun crew is visible as a gap.
  c.part('turret');
  c.ringZ(300, 256, DECK_Z, DECK_Z + 8, 104, 84, 'steel.dark');
  c.box(206, 152, DECK_Z + 8, 396, 168, DECK_Z + 78, 'team.hull');     // front wall
  c.box(206, 344, DECK_Z + 8, 396, 360, DECK_Z + 78, 'team.hull');     // back wall
  c.box(206, 168, DECK_Z + 8, 222, 344, DECK_Z + 78, 'team.hull');     // port wall
  c.box(380, 168, DECK_Z + 8, 396, 344, DECK_Z + 78, 'team.hull');     // starboard wall
  // Sloped top edge: one narrowing cap per wall.
  c.box(202, 152, DECK_Z + 78, 400, 164, DECK_Z + 86, 'team.dark');
  c.box(202, 348, DECK_Z + 78, 400, 360, DECK_Z + 86, 'team.dark');
  c.box(202, 164, DECK_Z + 78, 214, 348, DECK_Z + 86, 'team.dark');
  c.box(388, 164, DECK_Z + 78, 400, 348, DECK_Z + 86, 'team.dark');
  // Interior details: gun mount, ready ammunition, seats, a floor plate.
  c.box(222, 176, DECK_Z + 8, 392, 336, DECK_Z + 14, 'plate.dark');
  c.box(330, 208, DECK_Z + 14, 386, 304, DECK_Z + 56, 'steel.dark');   // mount
  for (let i = 0; i < 6; i++) {
    c.cylZ(232 + i * 10, 320, DECK_Z + 14, DECK_Z + 44, 6, 'brass');   // clips
    c.cylZ(232 + i * 10, 196, DECK_Z + 14, DECK_Z + 44, 6, 'brass');
  }
  // Sight head on the front wall, handwheels, and a blast shield lip.
  c.box(340, 240, DECK_Z + 86, 380, 274, DECK_Z + 106, 'steel.dark');
  c.box(380, 246, DECK_Z + 90, 390, 268, DECK_Z + 102, 'optic');
  c.box(200, 150, DECK_Z + 60, 208, 362, DECK_Z + 70, 'steel');
  c.pivot('turret', [300, 256, DECK_Z]);
  c.dynamic('turret');
  c.traverse('turret');

  /* ------------------------------------------------------------- twin guns */
  c.part('barrel');
  for (const y of [GUN_Y, 512 - GUN_Y]) {
    c.box(368, y - 16, DECK_Z + 26, 400, y + 16, DECK_Z + 62, 'steel.dark');   // cradle
    c.cylX(392, 412, y, DECK_Z + 44, 9, 'gunmetal');                            // receiver
    c.box(400, y - 7, DECK_Z + 56, 418, y + 7, DECK_Z + 66, 'steel.dark');      // feed
    slantedBarrel(c, {
      x0: 410, x1: 470, y, z0: DECK_Z + 46, z1: DECK_Z + 46 + ELEV, r0: 7, r1: 5,
      mat: 'gunmetal.lit', part: 'barrel',
    });
    // Muzzle: a flash hider cone, not a brake.
    c.cylX(468, 476, y, DECK_Z + 44 + ELEV, 9, 'steel.dark');
    c.cylX(474, 480, y, DECK_Z + 46 + ELEV, 5, 'scorch');
  }
  c.pivot('barrel', [392, 256, DECK_Z + 44]);
  c.parent('barrel', 'turret');
  c.dynamic('barrel');
  c.part('body');

  /* ------------------------------------------------------------------ radar */
  // Own part: the dish spins on its pedestal at runtime.
  c.part('radar');
  c.cylZ(252, 256, DECK_Z + 86, DECK_Z + 110, 20, 'steel.dark');
  c.ringZ(252, 256, DECK_Z + 110, DECK_Z + 116, 22, 12, 'steel');
  c.cylZ(252, 256, DECK_Z + 116, DECK_Z + 150, 7, 'steel.dark');       // mast
  // Dish: a shallow bowl facing +X, built as rings of decreasing radius.
  for (let i = 0; i < 6; i++) {
    const r = 40 - i * 6;
    c.cylX(240 + i * 4, 244 + i * 4, 256, DECK_Z + 186, r, 'plate');
  }
  c.cylX(246, 250, 256, DECK_Z + 186, 8, 'steel.dark');                // feed horn
  c.box(250, 252, DECK_Z + 150, 256, 260, DECK_Z + 222, 'steel.dark'); // back brace
  c.pivot('radar', [252, 256, DECK_Z + 86]);
  c.dynamic('radar');
  c.part('body');

  /* --------------------------------------------------------- surface pass */
  c.wear(0x2f5b, 'steel.dark', { rate: 0.03, only: ['team.hull', 'team.light', 'plate'] });
  c.mottle(0x6a13, ['team.dark', 'team.light'], 0.02, { only: ['team.hull', 'plate'] });
  return c;
}
