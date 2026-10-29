/**
 * Mobile Command Vehicle — wheeled, 16 facings.
 *
 * Unarmed like the supply truck, but the opposite shape: a **tall box body** with
 * an elevated operations cab, a **mast** carrying a cluster of antennas, and a
 * map table visible through an open side hatch. Where the truck is a long flat
 * bed, this is a compact tower — and the mast is the tallest thing in the whole
 * wheeled family, matched only by the SAM's canisters.
 *
 * `mast` is the segmented part: it telescopes in production, so its pivot is at
 * the base of the mast, not at the antenna heads.
 */
import { hatch, periscope, antenna, crate, louvres, liftingEye, cable, basketRack, seam } from '../kit.mjs';
import { wheeledHull, axleGear, bumper, windscreen } from '../kit-wheeled.mjs';

const DECK_Z = 146;
const SILL_Z = 100;
const HALF = 136;
const AXLE_R = 50;
const AXLE_Z = [368, 244, 132];
const BOX_X0 = 176, BOX_X1 = 386;
const BOX_TOP = DECK_Z + 104;

export function buildCommandVehicle(c) {
  /* ------------------------------------------------------------ running gear */
  for (const [side, y0, y1, innerY] of [['L', 122, 182, 188], ['R', 330, 390, 324]]) {
    axleGear(c, { side, axles: AXLE_Z, y0, y1, innerY, r: AXLE_R });
  }

  /* -------------------------------------------------------------------- hull */
  wheeledHull(c, {
    x0: 100, x1: 442,
    halfW: HALF, chassisHalf: 90,
    bellyZ: 36, sillZ: SILL_Z, deckZ: DECK_Z,
    bevel: 2, bevelH: 42,
    glacis: { run: 30, noseZ: 114 },
    tail: true,
  });

  c.part('body');
  bumper(c, { x: 470, halfW: 124, z: 100 });

  // Cab: lower than the box, so the box reads as the important part.
  c.box(400, 132, SILL_Z, 442, 380, DECK_Z + 52, 'team.hull');
  c.box(404, 138, DECK_Z + 52, 438, 374, DECK_Z + 58, 'team.light');
  windscreen(c, { x: 442, y0: 176, y1: 336, z0: DECK_Z + 18, z1: DECK_Z + 50, rake: 7 });
  for (const s of [-1, 1]) {
    c.cylX(442, 452, 256 + s * 102, DECK_Z + 8, 8, 'steel.dark');
  }

  /* ---------------------------------------------------------------- box body */
  c.box(BOX_X0, 124, DECK_Z, BOX_X1, 388, BOX_TOP, 'team.hull');
  c.box(BOX_X0 + 4, 130, BOX_TOP, BOX_X1 - 4, 382, BOX_TOP + 8, 'team.light');
  // Ribs down the flanks + a team band, so a big flat box still reads as built.
  for (let x = BOX_X0 + 12; x < BOX_X1 - 8; x += 30) {
    c.box(x, 120, DECK_Z + 8, x + 5, 126, BOX_TOP - 8, 'team.dark');
    c.box(x, 386, DECK_Z + 8, x + 5, 392, BOX_TOP - 8, 'team.dark');
  }
  c.box(BOX_X0 + 2, 122, BOX_TOP - 26, BOX_X1 - 2, 390, BOX_TOP - 14, 'roof');
  // Open side hatch with a map table just inside — the "command" read.
  c.clear(BOX_X0 + 40, 386, DECK_Z + 24, BOX_X0 + 112, 394, DECK_Z + 70);
  c.box(BOX_X0 + 36, 388, DECK_Z + 18, BOX_X0 + 116, 392, DECK_Z + 24, 'steel.dark');
  c.box(BOX_X0 + 36, 388, DECK_Z + 70, BOX_X0 + 116, 392, DECK_Z + 78, 'steel.dark');
  c.box(BOX_X0 + 56, 340, DECK_Z + 30, BOX_X0 + 96, 384, DECK_Z + 34, 'wood');   // table
  c.box(BOX_X0 + 60, 344, DECK_Z + 34, BOX_X0 + 92, 380, DECK_Z + 36, 'paint.line');
  c.cylZ(BOX_X0 + 76, 362, DECK_Z + 24, DECK_Z + 30, 4, 'steel.dark');

  // Roof: radome, vents, a hatch, and the floodlight.
  for (let x = BOX_X0 + 14; x < BOX_X1 - 10; x += 34) {           // roof ribs
    c.box(x, 132, BOX_TOP + 8, x + 6, 380, BOX_TOP + 13, 'team.dark');
  }
  for (const s2 of [-1, 1]) {                                     // roof edge rails
    c.box(BOX_X0 + 8, 256 + s2 * 118, BOX_TOP + 8, BOX_X1 - 8, 256 + s2 * 126, BOX_TOP + 16, 'steel.dark');
  }
  c.box(206, 236, BOX_TOP + 8, 288, 276, BOX_TOP + 12, 'steel.dark');   // cable tray
  c.cylZ(300, 256, BOX_TOP + 8, BOX_TOP + 30, 40, 'steel.dark');
  c.cylZ(300, 256, BOX_TOP + 30, BOX_TOP + 34, 30, 'steel');
  c.bolts(300, 256, BOX_TOP + 12, 34, 12, 'steel.bright', 2);
  louvres(c, { x0: 208, x1: 258, y0: 150, y1: 214, z: BOX_TOP + 8, slat: 5 });
  hatch(c, { cx: 340, cy: 310, z: BOX_TOP + 8, r: 20 });
  c.cylZ(190, 300, BOX_TOP + 8, BOX_TOP + 34, 6, 'steel.dark');
  c.box(180, 288, BOX_TOP + 34, 200, 312, BOX_TOP + 44, 'steel.dark');
  c.box(182, 292, BOX_TOP + 30, 198, 308, BOX_TOP + 34, 'lamp.warm');

  /* ------------------------------------------------------------------- mast */
  // Telescopic mast with two crossed antenna heads and a dish. Pivot at the
  // base: in production it extends, it does not swing.
  c.part('mast');
  c.cylZ(250, 190, BOX_TOP + 8, BOX_TOP + 30, 10, 'steel.dark');
  c.cylZ(250, 190, BOX_TOP + 30, BOX_TOP + 132, 7, 'steel');
  for (const z of [BOX_TOP + 52, BOX_TOP + 86, BOX_TOP + 118]) {
    c.cylZ(250, 190, z, z + 6, 10, 'steel.dark');                 // collars
  }
  c.box(234, 176, BOX_TOP + 132, 266, 204, BOX_TOP + 144, 'steel.dark');   // head block
  // Two yagi elements and a small dish, so the top is not a bare stick.
  for (const s of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      c.box(244, 190 + s * (18 + i * 8), BOX_TOP + 136 - i * 2, 256, 192 + s * (18 + i * 8), BOX_TOP + 142 - i * 2, 'steel.bright');
    }
  }
  c.cylX(220, 234, 190, BOX_TOP + 120, 16, 'plate.lit');
  c.cylX(234, 238, 190, BOX_TOP + 120, 6, 'steel.dark');
  c.pivot('mast', [250, 190, BOX_TOP + 8]);
  c.dynamic('mast');
  c.part('body');

  /* ------------------------------------------------------------- deck kit */
  for (const s of [-1, 1]) {
    c.cylX(280, 350, 256 + s * 116, SILL_Z + 34, 18, 'steel');     // fuel
  }
  c.box(120, 140, SILL_Z + 10, 168, 372, DECK_Z - 10, 'plate.dark');   // rear stowage
  crate(c, { x0: 126, y0: 156, z0: DECK_Z - 10, x1: 166, y1: 250, z1: DECK_Z + 30, mat: 'wood', lid: 'steel.dark' });
  crate(c, { x0: 126, y0: 266, z0: DECK_Z - 10, x1: 166, y1: 356, z1: DECK_Z + 30, mat: 'canvas' });
  c.box(392, 132, DECK_Z, 400, 380, DECK_Z + 14, 'steel.dark');        // cab roof step
  antenna(c, { x: 404, y: 360, z: DECK_Z + 58, height: 84 });

  /* ----------------------------------------------------------- surface pass */
  c.wear(0x5e29, 'steel.dark', { rate: 0.03, only: ['team.hull', 'team.light', 'plate'] });
  c.mottle(0x4d81, ['team.dark', 'team.light'], 0.02, { only: ['team.hull'] });
  return c;
}
