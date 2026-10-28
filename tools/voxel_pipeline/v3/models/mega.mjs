/**
 * Mega Tank — tracked, 16 facings.
 *
 * The flagship: everything about it is *longer* than `heavy` rather than simply
 * bigger. Seven road wheels on a 444-voxel run (heavy has six on 430), a deck
 * 12 voxels higher, and — the read that survives a 64 px sprite — a **twin
 * gun**: two tubes side by side instead of one. A single fatter tube at this
 * scale just looks like the heavy tank again.
 *
 * Both tubes live in the one `barrel` part, so they elevate and recoil together
 * exactly as a real twin mount does; the turret ring, mantlet and cupola stay in
 * `turret`.
 */
import {
  hatch, periscope, antenna, crate, louvres, liftingEye, smokeBank, basketRack,
  sandbags, cable,
} from '../kit.mjs';
import {
  trackGear, trackedHull, stowageRail, castTurret, muzzleBrake,
} from '../kit-vehicles.mjs';

const DECK_Z = 168;
const HALF = 184;
const TURRET_X = 236;
const TTOP = DECK_Z + 118;         // 286
const GUN_Z = 230;
const GUN_Y = 42;                  // half the spacing between the two tubes

export function buildMega(c) {
  /* ----------------------------------------------------------- running gear */
  const GEAR = {
    x0: 12, x1: 456, z0: 0, z1: 152,
    wheels: [88, 144, 200, 256, 312, 368, 414], wheelR: 46, wheelZ: 74,
    sprocketX: 438, sprocketR: 50, idlerX: 30, idlerR: 48,
    rollers: [150, 250, 340, 412], rollerZ: 142, linkWidth: 12,
    skirt: true,
  };
  trackGear(c, { side: 'L', ...GEAR, y0: 44, y1: 140 });
  trackGear(c, { side: 'R', ...GEAR, y0: 372, y1: 468, part: 'running.R' });

  /* ------------------------------------------------------------------ hull */
  trackedHull(c, {
    x0: 72, x1: 424,
    halfW: HALF, lowerHalf: 120,
    bellyZ: 30, deckZ: DECK_Z,
    bevel: 3, bevelH: 66,
    glacis: { run: 44, noseZ: 108 },
    tail: false, nose: false,
  });

  c.part('body');
  // Three-deep bolt strip down the flank chamfer: the mega's plates are visibly
  // heavier than anyone else's.
  for (const s of [-1, 1]) {
    const y = 256 + s * (HALF - 10);
    for (const dz of [26, 48, 70]) {
      c.rivets(94, y, DECK_Z - dz, 410, y, DECK_Z - dz, 12, 'steel.dark');
    }
  }

  // Rear plate: twin exhaust stacks standing proud, tow lugs, spare links.
  c.box(58, 256 - 122, 52, 76, 256 + 122, DECK_Z - 6, 'team.dark');
  for (const y of [176, 336]) {
    c.cylZ(62, y, DECK_Z - 24, DECK_Z + 30, 15, 'steel.dark');       // stack
    c.cylZ(62, y, DECK_Z + 30, DECK_Z + 36, 11, 'scorch');
    c.box(48, y - 20, 96, 64, y + 20, DECK_Z + 6, 'steel.dark');
  }
  for (let i = 0; i < 5; i++) {
    c.box(80, 256 - 116 + i * 48, DECK_Z - 22, 88, 256 - 92 + i * 48, DECK_Z - 14, 'track.worn');
  }

  // Nose: beam, tow hooks, brush-guarded headlights, spare track on the glacis.
  c.box(468, 92, 104, 480, 420, 120, 'steel.dark');
  for (const y of [124, 388]) {
    liftingEye(c, { x: 452, y: y - 6, z: 112 });
    c.box(460, y - 12, 118, 472, y + 12, 130, 'steel.dark');
    c.cylX(454, 470, y, 140, 16, 'steel.dark');
    c.cylX(470, 473, y, 140, 12, 'lamp.warm');
    c.box(446, y - 22, 126, 456, y + 22, 136, 'steel');
  }
  for (let i = 0; i < 7; i++) {
    const x = 430 + i * 8;
    for (let y = 150; y < 250; y += 10) {
      c.box(x, y, 150 - i * 9, x + 7, y + 8, 157 - i * 9, 'track.worn');
      c.box(x + 1, y + 2, 157 - i * 9, x + 6, y + 6, 159 - i * 9, 'steel.dark');
    }
  }

  // Driver's station: wide hatch, three periscopes, bow MG in a ball mount.
  hatch(c, { cx: 408, cy: 196, z: DECK_Z + 4, r: 36 });
  for (const y of [150, 196, 242]) {
    periscope(c, { x: 420, y, z: DECK_Z + 4, w: 9, h: 6 });
  }
  c.sphere(424, 320, DECK_Z + 8, 15, 'steel.dark', { top: true });
  c.cylX(424, 466, 320, DECK_Z + 8, 4, 'gunmetal');

  // Engine deck between the turret bustle and the tail.
  louvres(c, { x0: 84, x1: 148, y0: 108, y1: 208, z: DECK_Z + 4, slat: 5 });
  louvres(c, { x0: 84, x1: 148, y0: 304, y1: 404, z: DECK_Z + 4, slat: 5 });
  c.box(78, 100, DECK_Z + 2, 156, 412, DECK_Z + 8, 'steel.dark');
  for (const y of [136, 376]) c.cylZ(162, y, DECK_Z + 4, DECK_Z + 14, 12, 'brass');
  crate(c, { x0: 96, y0: 178, z0: DECK_Z + 8, x1: 154, y1: 246, z1: DECK_Z + 40,
    mat: 'wood', lid: 'steel.dark' });
  stowageRail(c, { x0: 190, x1: 340, y: 256 - HALF + 12, z: DECK_Z + 2, side: 'L', crates: 3 });
  stowageRail(c, { x0: 190, x1: 340, y: 256 + HALF - 12, z: DECK_Z + 2, side: 'R', crates: 3 });
  sandbags(c, { x0: 176, x1: 268, y0: 96, z0: DECK_Z + 4, rows: 1 });
  cable(c, [[150, 120, DECK_Z + 6], [220, 104, DECK_Z + 6]], 'steel.dark');

  /* ----------------------------------------------------------------- turret */
  c.part('turret');
  c.ringZ(TURRET_X, 256, DECK_Z, DECK_Z + 12, 100, 82, 'steel.dark');
  const THALF_X = 96;
  // Six shallow levels, not three steep ones: a cast dome needs the steps to be
  // small enough to read as a curve. Three levels of 11 voxels read as a
  // ziggurat, which is exactly what a turret must not look like.
  castTurret(c, {
    cx: TURRET_X, cy: 256, halfX: THALF_X, halfY: 104,
    z0: DECK_Z + 10, z1: TTOP, levels: 6, taper: 5, chamfer: 44,
  });
  c.bolts(TURRET_X, 256, DECK_Z + 12, 90, 24, 'steel', 3);

  // Twin gun face: one flat cheek either side of the tube pair, with a heavy
  // mantlet across both.
  c.box(TURRET_X + THALF_X - 18, 206, DECK_Z + 12, TURRET_X + THALF_X + 12, 306, TTOP - 44, 'team.dark');
  c.box(TURRET_X + THALF_X + 4, 200, GUN_Z - 34, TURRET_X + THALF_X + 18, 312, GUN_Z + 34, 'steel.dark');
  for (const s of [-1, 1]) {
    c.box(TURRET_X + THALF_X + 2, 256 + s * GUN_Y - 23, GUN_Z - 25,
      TURRET_X + THALF_X + 10, 256 + s * GUN_Y + 23, GUN_Z + 25, 'team.light');
  }

  // Bustle: ammunition rack plus a basket that overhangs the engine deck.
  c.box(TURRET_X - THALF_X - 40, 180, DECK_Z + 12, TURRET_X - THALF_X + 12, 332, TTOP - 50, 'team.dark');
  c.box(TURRET_X - THALF_X - 36, 186, TTOP - 50, TURRET_X - THALF_X + 8, 326, TTOP - 44, 'steel.dark');
  basketRack(c, { x0: TURRET_X - THALF_X - 88, x1: TURRET_X - THALF_X - 34, y0: 166, y1: 250,
    z0: DECK_Z + 22, z1: TTOP - 54, part: 'turret' });
  basketRack(c, { x0: TURRET_X - THALF_X - 88, x1: TURRET_X - THALF_X - 34, y0: 262, y1: 346,
    z0: DECK_Z + 22, z1: TTOP - 54, part: 'turret' });

  // Commander's cupola with vision blocks and a remote MG.
  c.cylZ(TURRET_X + 2, 308, TTOP - 10, TTOP + 16, 36, 'team.hull');
  c.ringZ(TURRET_X + 2, 308, TTOP + 16, TTOP + 24, 36, 25, 'steel');
  hatch(c, { cx: TURRET_X + 2, cy: 308, z: TTOP + 24, r: 21, part: 'turret' });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const vx = Math.round(TURRET_X + 2 + Math.cos(a) * 29);
    const vy = Math.round(308 + Math.sin(a) * 29);
    c.box(vx - 3, vy - 3, TTOP + 2, vx + 3, vy + 3, TTOP + 14, 'steel.dark');
    c.box(vx - 2, vy - 2, TTOP + 4, vx + 2, vy + 2, TTOP + 12, 'glass');
  }
  c.cylZ(TURRET_X + 2, 308, TTOP + 28, TTOP + 38, 5, 'steel.dark');
  c.box(TURRET_X, 308, TTOP + 38, TURRET_X + 20, 316, TTOP + 44, 'steel.dark');
  c.box(TURRET_X + 20, 309, TTOP + 39, TURRET_X + 82, 315, TTOP + 43, 'gunmetal');

  // Loader's hatch, gunner's sight, smoke banks, antennas.
  hatch(c, { cx: TURRET_X - 34, cy: 200, z: TTOP - 8, r: 20, part: 'turret' });
  c.box(TURRET_X + 24, 288, TTOP - 20, TURRET_X + 66, 326, TTOP + 2, 'steel.dark');
  c.box(TURRET_X + 66, 294, TTOP - 16, TURRET_X + 78, 320, TTOP - 2, 'optic');
  c.cylZ(TURRET_X + 50, 306, TTOP + 2, TTOP + 9, 8, 'steel');
  smokeBank(c, { x: TURRET_X + THALF_X - 4, y: 178, z: DECK_Z + 50, dx: -9, dy: 14, part: 'turret' });
  smokeBank(c, { x: TURRET_X + THALF_X - 4, y: 334, z: DECK_Z + 50, dx: -9, dy: -14, part: 'turret' });
  liftingEye(c, { x: TURRET_X - 60, y: 170, z: TTOP - 26, part: 'turret' });
  liftingEye(c, { x: TURRET_X - 60, y: 342, z: TTOP - 26, part: 'turret' });
  antenna(c, { x: TURRET_X - 86, y: 330, z: TTOP - 30, height: 116, part: 'turret' });
  antenna(c, { x: TURRET_X - 86, y: 182, z: TTOP - 30, height: 92, part: 'turret' });
  c.pivot('turret', [TURRET_X, 256, DECK_Z]);
  c.dynamic('turret');
  c.traverse('turret');

  /* ----------------------------------------------------------------- barrel */
  // Two tubes, one part. They share the trunnion, so they rise and recoil
  // together — a real twin mount, not two independent guns.
  c.part('barrel');
  const GUN_X0 = TURRET_X + THALF_X + 6;       // 338
  for (const s of [-1, 1]) {
    const y = 256 + s * GUN_Y;
    c.cylX(GUN_X0, 398, y, GUN_Z, 13, 'gunmetal');
    c.cylX(392, 414, y, GUN_Z, 18, 'gunmetal.lit');            // bore evacuator
    c.cylX(420, 466, y, GUN_Z, 12, 'steel.dark');
    muzzleBrake(c, { x: 504, y, z: GUN_Z, r: 17 });
    // Trunnion collar where the tube leaves the mantlet.
    c.cylX(GUN_X0 - 8, GUN_X0 + 8, y, GUN_Z, 16, 'steel.dark');
  }
  // Coaxial gun between the tubes, and the recoil rams above and below.
  c.cylX(GUN_X0 - 4, 432, 256, GUN_Z, 6, 'gunmetal');
  c.cylX(GUN_X0 - 6, 398, 256 + 20, GUN_Z + 32, 5, 'steel');
  c.cylX(GUN_X0 - 6, 398, 256 - 20, GUN_Z - 32, 5, 'steel');
  c.pivot('barrel', [GUN_X0, 256, GUN_Z]);
  c.parent('barrel', 'turret');
  c.dynamic('barrel');
  c.part('body');

  /* --------------------------------------------------------- surface pass */
  c.wear(0x51b7, 'steel.dark', { rate: 0.03, only: ['team.hull', 'team.light', 'plate'] });
  c.mottle(0x1d4e, ['team.dark', 'team.light'], 0.02, { only: ['team.hull', 'plate'] });
  return c;
}
