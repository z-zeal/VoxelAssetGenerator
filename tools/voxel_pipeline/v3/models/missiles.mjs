/**
 * SAM Launcher (Missiles) — wheeled, 16 facings.
 *
 * The same six-wheel chassis family as the MLRS, but the payload could hardly be
 * more different: **four large canisters in a 2×2 cluster** standing almost
 * vertically on a traversing base, with a radar dish alongside. Where the MLRS
 * cassette is wide and flat, this is tall and narrow — that contrast is the
 * point, because the two share a hull.
 *
 * `launcher` traverses; `barrel` is the canister cluster so its elevation can be
 * driven independently of the base.
 */
import { hatch, periscope, antenna, crate, louvres, liftingEye, cable, basketRack } from '../kit.mjs';
import { wheeledHull, axleGear, bumper, windscreen } from '../kit-wheeled.mjs';

const DECK_Z = 138;
const SILL_Z = 96;
const HALF = 132;
const AXLE_R = 48;
const AXLE_Z = [352, 236, 128];

export function buildMissiles(c) {
  /* ------------------------------------------------------------ running gear */
  for (const [side, y0, y1, innerY] of [['L', 128, 186, 192], ['R', 326, 384, 320]]) {
    axleGear(c, { side, axles: AXLE_Z, y0, y1, innerY, r: AXLE_R });
  }

  /* -------------------------------------------------------------------- hull */
  wheeledHull(c, {
    x0: 108, x1: 430,
    halfW: HALF, chassisHalf: 88,
    bellyZ: 34, sillZ: SILL_Z, deckZ: DECK_Z,
    bevel: 2, bevelH: 40,
    glacis: { run: 34, noseZ: 108 },
    tail: true,
  });

  c.part('body');
  bumper(c, { x: 462, halfW: 120, z: 96 });

  c.box(392, 136, SILL_Z, 436, 376, DECK_Z + 62, 'team.hull');
  c.box(396, 142, DECK_Z + 62, 432, 370, DECK_Z + 68, 'team.light');
  windscreen(c, { x: 436, y0: 176, y1: 336, z0: DECK_Z + 20, z1: DECK_Z + 58, rake: 7 });
  for (const y of [196, 316]) {
    hatch(c, { cx: 412, cy: y, z: DECK_Z + 68, r: 22 });
    periscope(c, { x: 420, y: y - 8, z: DECK_Z + 68, w: 8, h: 5 });
  }

  // Deck: generator set, power cabinets, cable runs to the launcher.
  c.box(152, 136, SILL_Z + 8, 388, 376, DECK_Z, 'team.hull');
  c.box(268, 140, DECK_Z, 380, 200, DECK_Z + 34, 'steel.dark');           // generator
  louvres(c, { x0: 276, x1: 372, y0: 146, y1: 194, z: DECK_Z + 34, slat: 5 });
  c.box(268, 306, DECK_Z, 380, 372, DECK_Z + 34, 'steel.dark');           // power cabinet
  for (let y = 316; y < 366; y += 12) c.box(372, y, DECK_Z + 6, 376, y + 6, DECK_Z + 28, 'lamp.cyan');
  cable(c, [[300, 256, DECK_Z + 6], [258, 276, DECK_Z + 20], [230, 290, DECK_Z + 40]], 'steel.dark');
  cable(c, [[300, 250, DECK_Z + 6], [258, 240, DECK_Z + 20], [230, 224, DECK_Z + 40]], 'steel.dark');
  crate(c, { x0: 158, y0: 150, z0: DECK_Z, x1: 214, y1: 206, z1: DECK_Z + 28, mat: 'wood', lid: 'steel.dark' });
  c.cylZ(122, 256, SILL_Z + 8, DECK_Z + 38, 38, 'tyre');
  c.cylZ(122, 256, DECK_Z + 38, DECK_Z + 44, 20, 'steel.dark');

  /* ----------------------------------------------------------- radar + mount */
  // Radar dish on its own spinning post at the rear corner, so it does not
  // compete with the launcher. Its axis is offset on purpose.
  c.part('body');
  c.cylZ(150, 330, DECK_Z, DECK_Z + 76, 8, 'steel.dark');
  c.box(136, 314, DECK_Z + 76, 164, 346, DECK_Z + 84, 'steel.dark');

  c.part('radar');
  // Dish: solid plate, a rim ring round it and a feed horn in front. The hollow
  // version read as a ring of petals.
  c.cylY(150, 316, 340, DECK_Z + 96, 36, 'plate');
  c.cylY(150, 314, 342, DECK_Z + 96, 36, 'steel.dark');
  c.cylY(150, 312, 344, DECK_Z + 96, 30, 'plate.lit');
  c.cylY(150, 306, 316, DECK_Z + 96, 36, 'steel.dark');                   // rim ring
  c.cylY(150, 340, 352, DECK_Z + 96, 8, 'steel.bright');                  // feed horn
  for (const s2 of [-1, 1]) {
    c.box(148, 256 + s2 * 30, DECK_Z + 66, 154, 256 + s2 * 36, DECK_Z + 96, 'steel.dark');
  }
  c.box(150, 300, DECK_Z + 96, 158, 318, DECK_Z + 104, 'steel.dark');      // arm
  c.pivot('radar', [150, 330, DECK_Z + 76]);
  c.dynamic('radar');

  /* --------------------------------------------------------------- launcher */
  c.part('launcher');
  c.cylZ(268, 256, DECK_Z, DECK_Z + 16, 92, 'steel.dark');
  c.ringZ(268, 256, DECK_Z + 16, DECK_Z + 24, 92, 70, 'steel');
  c.bolts(268, 256, DECK_Z + 18, 84, 16, 'steel.bright', 3);
  for (const y of [190, 322]) {
    c.box(240, y - 12, DECK_Z + 16, 286, y + 12, DECK_Z + 84, 'plate.dark');  // A-frame cheeks
  }
  c.box(248, 196, DECK_Z + 60, 292, 316, DECK_Z + 76, 'steel.dark');          // elevation ram beam
  c.pivot('launcher', [268, 256, DECK_Z]);
  c.dynamic('launcher');
  c.traverse('launcher');

  /* ------------------------------------------------------------- canisters */
  // 2x2 canisters, nearly vertical: a tall silhouette that no other vehicle in
  // the family has.
  c.part('barrel');
  const CZ0 = DECK_Z + 30;
  for (const cx of [242, 310]) {
    for (const cy of [214, 298]) {
      c.cylZ(cx, cy, CZ0, CZ0 + 132, 36, 'gunmetal');
      c.cylZ(cx, cy, CZ0 + 132, CZ0 + 142, 32, 'steel.dark');       // nose cap
      c.cylZ(cx, cy, CZ0 + 142, CZ0 + 146, 20, 'scorch');
      // Banding so they read as canisters, not as pillars.
      for (const dz of [26, 62, 98]) {
        c.cylZ(cx, cy, CZ0 + dz, CZ0 + dz + 5, 38, 'steel.dark');
      }
      // Launch rail up the outboard face.
      const rx = cx + 30;
      c.box(rx, cy - 7, CZ0 + 4, rx + 5, cy + 7, CZ0 + 128, 'steel.bright');
    }
  }
  // Cluster base and rear rack: a square frame the four tubes sit in.
  c.box(206, 178, CZ0 - 8, 346, 334, CZ0 + 2, 'plate.dark');
  c.box(212, 184, CZ0 + 2, 340, 328, CZ0 + 10, 'steel.dark');
  for (const cy of [214, 298]) {
    c.box(212, cy - 44, CZ0 + 2, 340, cy - 40, CZ0 + 120, 'plate');
    c.box(212, cy + 40, CZ0 + 2, 340, cy + 44, CZ0 + 120, 'plate');
  }
  for (const cx of [242, 310]) {
    c.box(cx - 40, 178, CZ0 + 2, cx - 36, 334, CZ0 + 120, 'plate');
    c.box(cx + 36, 178, CZ0 + 2, cx + 40, 334, CZ0 + 120, 'plate');
  }
  c.rivets(346, 184, CZ0 + 4, 346, 328, CZ0 + 4, 14, 'steel.bright');
  c.pivot('barrel', [270, 256, CZ0]);
  c.parent('barrel', 'launcher');
  c.dynamic('barrel');
  c.part('body');

  antenna(c, { x: 400, y: 350, z: DECK_Z + 68, height: 88 });

  /* ----------------------------------------------------------- surface pass */
  c.wear(0x4f37, 'steel.dark', { rate: 0.03, only: ['team.hull', 'plate'] });
  c.mottle(0x1a62, ['team.dark', 'team.light'], 0.02, { only: ['team.hull'] });
  return c;
}
