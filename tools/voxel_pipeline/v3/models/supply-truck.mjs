/**
 * Supply Truck — wheeled, 16 facings.
 *
 * Unarmed, so it has to be recognisable by *absence*: a long flat bed with
 * canvassed cargo and a drop-side tailgate, and nothing mounted on it at all. It
 * is the only vehicle in the roster with no turret and no barrel, and the only
 * one whose silhouette is dominated by a soft top — which is why the canvas gets
 * ribbed hoops rather than a smooth box.
 *
 * Parts: `body` plus the two wheel sets. `tailgate` is a boot hitch point for the
 * runtime's load/unload animation, and it is sequenced on its own pivot.
 */
import { hatch, periscope, antenna, crate, louvres, liftingEye, cable, seam } from '../kit.mjs';
import { wheeledHull, axleGear, bumper, windscreen } from '../kit-wheeled.mjs';

const DECK_Z = 142;
const SILL_Z = 98;
const HALF = 138;
const AXLE_R = 50;
const AXLE_Z = [368, 248, 132];
const BED_Z = DECK_Z + 4;
const BED_TOP = BED_Z + 74;

export function buildSupplyTruck(c) {
  /* ------------------------------------------------------------ running gear */
  for (const [side, y0, y1, innerY] of [['L', 124, 184, 190], ['R', 328, 388, 322]]) {
    axleGear(c, { side, axles: AXLE_Z, y0, y1, innerY, r: AXLE_R });
  }

  /* -------------------------------------------------------------------- hull */
  wheeledHull(c, {
    x0: 96, x1: 444,
    halfW: HALF, chassisHalf: 92,
    bellyZ: 34, sillZ: SILL_Z, deckZ: DECK_Z,
    bevel: 2, bevelH: 40,
    glacis: { run: 28, noseZ: 112 },
    tail: true,
  });

  c.part('body');
  bumper(c, { x: 472, halfW: 126, z: 98 });

  // Cab: flat-fronted, two doors, a big screen.
  c.box(398, 132, SILL_Z, 444, 380, DECK_Z + 66, 'team.hull');
  c.box(402, 138, DECK_Z + 66, 440, 374, DECK_Z + 72, 'team.light');
  windscreen(c, { x: 444, y0: 174, y1: 338, z0: DECK_Z + 22, z1: DECK_Z + 62, rake: 7 });
  for (const y of [196, 316]) hatch(c, { cx: 418, cy: y, z: DECK_Z + 72, r: 20 });
  for (const s of [-1, 1]) {
    c.box(410, 256 + s * 132, SILL_Z + 14, 436, 256 + s * 138, DECK_Z + 48, 'team.dark');  // door line
    c.cylX(444, 454, 256 + s * 104, DECK_Z + 10, 8, 'steel.dark');
    c.box(452, 256 + s * 104 - 7, DECK_Z + 6, 456, 256 + s * 104 + 7, DECK_Z + 22, 'steel.dark');
  }

  /* -------------------------------------------------------------- cargo bed */
  c.box(150, 128, SILL_Z + 6, 396, 384, BED_Z, 'team.dark');
  c.box(150, 128, BED_Z, 396, 140, BED_TOP - 40, 'team.hull');        // drop sides
  c.box(150, 372, BED_Z, 396, 384, BED_TOP - 40, 'team.hull');
  c.box(150, 140, BED_Z, 162, 372, BED_TOP - 40, 'team.hull');        // headboard
  for (let x = 168; x < 388; x += 26) {                               // side ribs
    c.box(x, 126, BED_Z + 4, x + 4, 132, BED_TOP - 44, 'steel.dark');
    c.box(x, 380, BED_Z + 4, x + 4, 386, BED_TOP - 44, 'steel.dark');
  }

  /* ----------------------------------------------------------- canvas tilt */
  // Hoops under ribs of canvas. The ribs are what read as a soft top rather than
  // as a grey box, but they have to stay thin — chunky hoops turn the tilt into
  // a corrugated roof.
  for (let x = 176; x < 392; x += 22) {
    for (let i = 0; i < 8; i++) {
      const k = i / 7;
      const dz = Math.round(Math.sin(k * Math.PI) * 20);
      const y0 = 140 + i * 15, y1 = 140 + (i + 1) * 15;
      c.box(x, y0, BED_TOP - 36, x + 3, y1, BED_TOP - 32 + dz, 'cloth.dark');
    }
  }
  c.box(170, 138, BED_TOP - 36, 392, 382, BED_TOP - 20, 'cloth');
  for (let x = 180; x < 390; x += 18) {
    const t = (x - 180) / 210;
    const dz = Math.round(Math.sin(t * Math.PI) * 12);
    c.box(x, 148, BED_TOP - 22 + dz, x + 4, 372, BED_TOP - 14 + dz, 'cloth');
  }
  // Ridge pole and straps, so the crown is not a flat lid.
  c.box(170, 250, BED_TOP - 12, 392, 262, BED_TOP - 4, 'cloth');
  for (let x = 186; x < 388; x += 34) {
    c.box(x, 142, BED_TOP - 32, x + 3, 378, BED_TOP - 6, 'canvas');
  }
  // Tail canopy flap over the gate.
  c.box(150, 144, BED_TOP - 34, 174, 376, BED_TOP - 12, 'cloth');

  /* --------------------------------------------------------------- tailgate */
  c.part('tailgate');
  c.box(140, 140, BED_Z, 152, 372, BED_TOP - 40, 'team.hull');
  for (let y = 152; y < 366; y += 28) {
    c.box(136, y, BED_Z + 6, 140, y + 5, BED_TOP - 46, 'steel.dark');
  }
  c.box(134, 256, BED_Z + 30, 140, 268, BED_Z + 52, 'brass');         // latch
  c.pivot('tailgate', [148, 256, BED_Z]);
  c.dynamic('tailgate');
  c.part('body');

  /* ------------------------------------------------------------- deck kit */
  for (const s of [-1, 1]) {
    c.cylX(258, 340, 256 + s * 114, SILL_Z + 32, 18, 'steel');        // fuel tanks
    c.cylX(262, 336, 256 + s * 114, SILL_Z + 32, 10, 'steel.bright');
  }
  crate(c, { x0: 168, y0: 148, z0: BED_Z + 40, x1: 214, y1: 196, z1: BED_TOP - 30, mat: 'wood', lid: 'steel.dark' });
  antenna(c, { x: 404, y: 356, z: DECK_Z + 72, height: 92 });
  c.cylX(392, 400, 200, SILL_Z + 6, 12, 'steel.dark');                // exhaust stack
  louvres(c, { x0: 396, x1: 430, y0: 150, y1: 214, z: SILL_Z + 6, slat: 4 });

  /* ----------------------------------------------------------- surface pass */
  c.wear(0x2c48, 'steel.dark', { rate: 0.03, only: ['team.hull', 'team.dark', 'plate'] });
  c.mottle(0x7b13, ['team.dark', 'team.light'], 0.02, { only: ['team.hull'] });
  return c;
}
