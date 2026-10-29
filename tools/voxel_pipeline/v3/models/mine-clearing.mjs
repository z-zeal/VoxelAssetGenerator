/**
 * Mine-Clearing Vehicle — tracked, 16 facings.
 *
 * Heavy armour (per `data/units.json`) built around one idea: a **flail** on a
 * pair of long arms reaching out ahead of the hull, with a blast shield over the
 * driver's hatch. The arms plus the drum give it the longest forward footprint
 * in the family, and the drum hangs low — well below the nose — so it reads
 * differently from the Bastion's ram and from every gun tank.
 *
 * `flail` is the segmented part: the drum, its chains and the weights. The arms
 * are `body`, because a real flail raises the arms and spins the drum separately;
 * the pivot is the drum's own axis so a spin animation is an in-place rotation.
 */
import {
  hatch, periscope, antenna, crate, louvres, liftingEye, smokeBank, basketRack,
  sandbags, cable,
} from '../kit.mjs';
import { trackGear, trackedHull, castTurret, stowageRail } from '../kit-vehicles.mjs';

const DECK_Z = 150;
const HALF = 162;
const ARM_X = 372;               // where the arms leave the hull
const DRUM_X = 458;              // drum axis, ahead of the tracks so the arms show
const DRUM_Z = 88;               // drum height: low enough that chains reach the ground
const CHAIN_REACH = 48;          // longest chain plus its weight, kept inside the canvas

export function buildMineClearing(c) {
  /* ----------------------------------------------------------- running gear */
  // The run stops well short of the canvas front: a flail drum has to sit ahead
  // of the tracks, not on top of the idler, or the whole assembly reads as part
  // of the hull.
  const GEAR = {
    x0: 40, x1: 372, z0: 0, z1: 132,
    wheels: [92, 156, 220, 284, 344], wheelR: 46, wheelZ: 66,
    sprocketX: 354, sprocketR: 48, idlerX: 56, idlerR: 44,
    rollers: [136, 218, 300], rollerZ: 124, linkWidth: 11,
    skirt: true,
  };
  trackGear(c, { side: 'L', ...GEAR, y0: 56, y1: 140 });
  trackGear(c, { side: 'R', ...GEAR, y0: 372, y1: 456, part: 'running.R' });

  /* ------------------------------------------------------------------ hull */
  trackedHull(c, {
    x0: 68, x1: 352,
    halfW: HALF, lowerHalf: 120,
    bellyZ: 28, deckZ: DECK_Z,
    bevel: 3, bevelH: 60,
    glacis: { run: 38, noseZ: 108 },
    tail: false, nose: false,
  });

  c.part('body');
  // Heavy plate and a bolted nose: this vehicle is meant to be hit.
  for (const s of [-1, 1]) {
    const y = 256 + s * (HALF - 8);
    c.rivets(90, y, DECK_Z - 20, 400, y, DECK_Z - 20, 11, 'steel.dark');
    c.rivets(90, y, DECK_Z - 44, 400, y, DECK_Z - 44, 11, 'steel.dark');
  }
  c.box(366, 118, 104, 378, 394, 126, 'steel.dark');
  for (const y of [148, 364]) {
    liftingEye(c, { x: 354, y: y - 6, z: 112 });
    c.cylX(360, 372, y, 128, 11, 'steel.dark');
    c.cylX(372, 374, y, 128, 8, 'lamp.warm');
  }

  /* ------------------------------------------------------- blast shield */
  // A plate standing over the driver's hatch on two posts, angled forward. It is
  // the second-tallest thing on the vehicle after the cupola, which is what
  // makes the turret-less layout legible.
  // Two stepped leaves rather than one slab: a single 8-voxel plate 176 long read
  // as a black billboard from every facing. Stepping it, framing it and cutting
  // a slit through it costs nothing and makes it a shield.
  c.box(390, 190, DECK_Z, 396, 322, DECK_Z + 52, 'plate');
  c.box(392, 186, DECK_Z + 52, 398, 326, DECK_Z + 88, 'plate.lit');
  c.box(392, 182, DECK_Z + 88, 400, 330, DECK_Z + 96, 'plate.dark');
  for (const y of [188, 322]) {
    c.box(386, y - 6, DECK_Z, 400, y + 6, DECK_Z + 96, 'steel.dark');     // frame post
    c.box(356, y - 8, DECK_Z, 396, y + 8, DECK_Z + 12, 'steel.dark');    // foot
  }
  c.clear(392, 216, DECK_Z + 26, 400, 296, DECK_Z + 40);                  // vision slit
  c.box(394, 214, DECK_Z + 22, 398, 298, DECK_Z + 26, 'steel.dark');
  c.box(394, 214, DECK_Z + 40, 398, 298, DECK_Z + 44, 'steel.dark');
  for (let y = 202; y < 312; y += 24) {
    c.bolts(396, y, DECK_Z + 66, 8, 3, 'steel.bright', 2);
  }
  hatch(c, { cx: 366, cy: 220, z: DECK_Z + 2, r: 24 });
  periscope(c, { x: 374, y: 196, z: DECK_Z + 2, w: 8, h: 5 });
  c.box(352, 258, DECK_Z + 2, 380, 320, DECK_Z + 20, 'steel.dark');      // sight box
  c.box(378, 264, DECK_Z + 6, 384, 314, DECK_Z + 16, 'optic');

  /* ------------------------------------------------------------- flail arms */
  // Two arms, braced, running from the hull nose out and down to the drum. Wide
  // apart so the drum reads as spanning the track width.
  for (const s of [-1, 1]) {
    const y = 256 + s * 104;
    c.box(ARM_X - 40, y - 18, 88, ARM_X + 4, y + 18, 140, 'plate.dark');   // root block
    c.box(ARM_X, y - 12, 86, DRUM_X - 10, y + 12, 110, 'plate');           // arm
    c.box(ARM_X + 4, y - 9, 54, DRUM_X - 16, y + 9, 88, 'steel.dark');     // brace
    c.bolts(ARM_X + 14, y, 124, 20, 6, 'steel.bright', 3);
    c.box(DRUM_X - 20, y - 18, 54, DRUM_X + 2, y + 18, 120, 'steel.dark'); // bearing block
    c.cylY(DRUM_X - 8, y - 20, y + 20, DRUM_Z, 20, 'steel.bright');
  }
  c.box(ARM_X - 8, 152, 88, ARM_X + 6, 360, 124, 'plate.dark');            // cross beam
  // Hydraulic rams, one a side, from the deck to mid-arm.
  for (const s of [-1, 1]) {
    c.cylX(318, ARM_X + 30, 256 + s * 70, 46, 7, 'steel.bright');
    c.cylX(326, ARM_X + 24, 256 + s * 70, 110, 9, 'steel.dark');
  }

  /* ------------------------------------------------------------ turret deck */
  // A small remote weapon station, not a full turret: mine clearing is done with
  // the flail, the gun is for self-defence.
  c.part('turret');
  c.cylZ(250, 256, DECK_Z, DECK_Z + 10, 66, 'steel.dark');
  castTurret(c, {
    cx: 250, cy: 256, halfX: 58, halfY: 62,
    z0: DECK_Z + 8, z1: DECK_Z + 56, levels: 3, taper: 4, chamfer: 20,
  });
  c.box(300, 226, DECK_Z + 10, 320, 286, DECK_Z + 44, 'team.dark');
  c.box(316, 232, DECK_Z + 18, 326, 280, DECK_Z + 36, 'steel.dark');
  hatch(c, { cx: 236, cy: 288, z: DECK_Z + 54, r: 15, part: 'turret' });
  c.pivot('turret', [250, 256, DECK_Z]);
  c.dynamic('turret');
  c.traverse('turret');

  c.part('barrel');
  c.cylX(324, 356, 256, DECK_Z + 27, 5, 'gunmetal');
  c.box(340, 248, DECK_Z + 16, 368, 264, DECK_Z + 38, 'steel.dark');
  c.cylX(356, 384, 256, DECK_Z + 27, 4, 'steel.dark');
  c.pivot('barrel', [324, 256, DECK_Z + 27]);
  c.parent('barrel', 'turret');
  c.dynamic('barrel');
  c.part('body');

  /* ------------------------------------------------------------- deck kit */
  louvres(c, { x0: 96, x1: 178, y0: 148, y1: 236, z: DECK_Z + 4, slat: 6 });
  louvres(c, { x0: 96, x1: 178, y0: 276, y1: 364, z: DECK_Z + 4, slat: 6 });
  // A frame round the louvres. One dark plate across the whole deck read as a
  // flat grey slab and flattened the entire vehicle.
  c.box(88, 140, DECK_Z + 2, 186, 152, DECK_Z + 10, 'steel.dark');
  c.box(88, 360, DECK_Z + 2, 186, 372, DECK_Z + 10, 'steel.dark');
  c.box(88, 152, DECK_Z + 2, 98, 360, DECK_Z + 10, 'steel.dark');
  c.box(178, 152, DECK_Z + 2, 186, 360, DECK_Z + 10, 'steel.dark');
  c.box(98, 240, DECK_Z + 2, 178, 272, DECK_Z + 10, 'steel.dark');
  for (const y of [172, 340]) c.cylZ(196, y, DECK_Z + 4, DECK_Z + 16, 11, 'brass');
  crate(c, { x0: 214, y0: 150, z0: DECK_Z + 4, x1: 276, y1: 208, z1: DECK_Z + 34,
    mat: 'wood', lid: 'steel.dark' });
  sandbags(c, { x0: 288, x1: 344, y0: 148, z0: DECK_Z + 4, rows: 1 });
  smokeBank(c, { x: 330, y: 330, z: DECK_Z + 30, dx: -8, dy: -12 });
  stowageRail(c, { x0: 220, x1: 360, y: 256 - HALF + 12, z: DECK_Z + 2, side: 'L', crates: 2 });
  antenna(c, { x: 208, y: 330, z: DECK_Z + 8, height: 92 });
  cable(c, [[280, 160, DECK_Z + 6], [340, 152, DECK_Z + 6]], 'steel.dark');

  /* ---------------------------------------------------------------- flail */
  /**
   * Drum on the arms' bearings, chains hanging round it.
   *
   * The drum's axis is TRANSVERSE (Y), because that is what a flail drum is: a
   * roller spanning the vehicle's width with chains hanging off its whole length,
   * spinning in the XZ plane. Built on the wrong axis first — a stubby cylinder
   * along X with chains radiating in every direction — it read as a spiked ball
   * bolted to the nose, which is not a mine-clearing vehicle.
   */
  c.part('flail');
  const DY0 = 148, DY1 = 364;
  c.cylY(DRUM_X, DY0, DY1, DRUM_Z, 28, 'steel.dark');
  for (let y = DY0 + 8; y < DY1 - 6; y += 22) {
    c.cylY(DRUM_X, y, y + 5, DRUM_Z, 31, 'steel');                       // drum ribs
  }
  c.cylY(DRUM_X, DY0 - 4, DY0 + 4, DRUM_Z, 32, 'steel.dark');            // bearing collars
  c.cylY(DRUM_X, DY1 - 4, DY1 + 4, DRUM_Z, 32, 'steel.dark');
  c.cylY(DRUM_X, DY0, DY1, DRUM_Z, 9, 'steel.bright');                   // axle through

  // Chains: one ring of them round the drum's circumference, repeated along its
  // length, each with a weighted shoe at the end. They hang to near ground.
  for (const fy of [176, 218, 260, 302, 344]) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.4;
      const dirX = Math.cos(a), dirZ = Math.sin(a);
      for (let t = 1; t <= 4; t++) {
        const px = Math.round(DRUM_X + dirX * (26 + t * 8));
        const pz = Math.round(DRUM_Z + dirZ * (26 + t * 8));
        if (pz < 2 || px > 508) continue;
        c.box(px - 2, fy - 2, pz - 2, px + 2, fy + 2, pz + 2, 'track.worn');
      }
      const wx = Math.round(DRUM_X + dirX * CHAIN_REACH), wz = Math.round(DRUM_Z + dirZ * CHAIN_REACH);
      if (wz > 2 && wx < 508) c.box(wx - 4, fy - 5, wz - 4, wx + 4, fy + 5, wz + 4, 'steel.dark');
    }
  }
  c.pivot('flail', [DRUM_X, 256, DRUM_Z]);
  c.dynamic('flail');
  c.part('body');

  /* --------------------------------------------------------- surface pass */
  c.wear(0x1c47, 'plate.dark', { rate: 0.035, only: ['team.hull', 'team.light', 'plate'] });
  c.mottle(0x5e93, ['team.dark', 'team.light'], 0.02, { only: ['team.hull'] });
  return c;
}
