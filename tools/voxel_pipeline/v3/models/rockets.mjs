/**
 * MLRS (Rockets) — wheeled, 16 facings.
 *
 * Six-by-six truck with a **box launcher** on the rear bed. The launcher is the
 * whole vehicle: a rectangular cassette of tubes angled up and back, on a
 * turntable. Deliberately not a tube cluster on a pedestal — the armoured box
 * with visible tube mouths is what reads at 64 px.
 *
 * `launcher` traverses (it is the turret), `barrel` is the raised tube cassette
 * so elevation can be animated separately.
 */
import { hatch, periscope, antenna, crate, louvres, liftingEye, cable, basketRack } from '../kit.mjs';
import { wheeledHull, axleGear, bumper, windscreen } from '../kit-wheeled.mjs';

const DECK_Z = 138;
const SILL_Z = 96;
const HALF = 132;
const AXLE_R = 48;
const AXLE_Z = [352, 236, 128];

export function buildRockets(c) {
  /* ------------------------------------------------------------ running gear */
  for (const [side, y0, y1, innerY, part] of [
    ['L', 128, 186, 192, 'wheels.L'],
    ['R', 326, 384, 320, 'wheels.R'],
  ]) {
    axleGear(c, { side, axles: AXLE_Z, y0, y1, innerY, r: AXLE_R, part });
  }

  /* -------------------------------------------------------------------- hull */
  wheeledHull(c, {
    x0: 108, x1: 430,
    halfW: HALF,
    chassisHalf: 88,
    bellyZ: 34, sillZ: SILL_Z, deckZ: DECK_Z,
    bevel: 2, bevelH: 40,
    glacis: { run: 34, noseZ: 108 },
    tail: true,
  });

  c.part('body');
  bumper(c, { x: 462, halfW: 120, z: 96 });

  // Cab-over: flat front, big screen, two crew hatches on the roof.
  c.box(392, 136, SILL_Z, 436, 376, DECK_Z + 62, 'team.hull');
  c.box(396, 142, DECK_Z + 62, 432, 370, DECK_Z + 68, 'team.light');
  windscreen(c, { x: 436, y0: 176, y1: 336, z0: DECK_Z + 20, z1: DECK_Z + 58, rake: 7 });
  for (const y of [196, 316]) {
    hatch(c, { cx: 412, cy: y, z: DECK_Z + 68, r: 22 });
    periscope(c, { x: 420, y: y - 8, z: DECK_Z + 68, w: 8, h: 5 });
  }
  for (const y of [150, 362]) {
    c.cylX(436, 448, y, DECK_Z + 8, 9, 'steel.dark');              // mirror arms
    c.box(446, y - 8, DECK_Z + 4, 450, y + 8, DECK_Z + 20, 'steel.dark');
  }

  // Chassis deck behind the cab: fuel tanks, tool lockers, spare wheel.
  c.box(152, 136, SILL_Z + 8, 388, 376, DECK_Z, 'team.hull');
  for (const s of [-1, 1]) {
    c.cylX(300, 384, 256 + s * 106, SILL_Z + 30, 20, 'steel');      // fuel tanks
    c.cylX(304, 380, 256 + s * 106, SILL_Z + 30, 12, 'steel.bright');
  }
  crate(c, { x0: 160, y0: 150, z0: DECK_Z, x1: 220, y1: 210, z1: DECK_Z + 30, mat: 'wood', lid: 'steel.dark' });
  crate(c, { x0: 160, y0: 302, z0: DECK_Z, x1: 220, y1: 362, z1: DECK_Z + 30, mat: 'canvas' });
  c.box(122, 180, DECK_Z, 158, 332, DECK_Z + 24, 'steel.dark');      // tail lockers
  for (let y = 190; y < 326; y += 22) c.box(124, y, DECK_Z + 6, 128, y + 12, DECK_Z + 18, 'steel.bright');
  antenna(c, { x: 396, y: 350, z: DECK_Z + 68, height: 96 });

  /* --------------------------------------------------------------- launcher */
  // Turntable, then the armoured cassette on trunnions.
  c.part('launcher');
  c.cylZ(300, 256, DECK_Z, DECK_Z + 12, 82, 'steel.dark');
  c.ringZ(300, 256, DECK_Z + 12, DECK_Z + 18, 82, 62, 'steel');
  c.bolts(300, 256, DECK_Z + 14, 74, 14, 'steel.bright', 3);
  for (const y of [186, 326]) {
    c.box(272, y - 9, DECK_Z + 18, 340, y + 9, DECK_Z + 50, 'plate.dark');    // trunnion cheek
  }
  c.box(280, 190, DECK_Z + 18, 336, 322, DECK_Z + 30, 'steel.dark');          // cradle
  c.pivot('launcher', [300, 256, DECK_Z]);
  c.dynamic('launcher');
  c.traverse('launcher');

  /* ------------------------------------------------------------ tube cassette */
  // Six tube mouths in a 2x3 block, each with a proud retaining ring and a dark
  // bore. Mouths stacked flush merge into vertical stripes; the rings and the
  // gap between rows are what make them read as tubes.
  c.part('barrel');
  const CAS = { x0: 250, x1: 360, halfY: 66, z0: DECK_Z + 30, z1: DECK_Z + 116 };
  const TUBE_R = 19;
  const ROWS = [DECK_Z + 48, DECK_Z + 78, DECK_Z + 108];
  const COLS = [256 - 36, 256 + 36];
  // Shell first, then the tubes punched through its front face.
  c.box(CAS.x0, 256 - CAS.halfY, CAS.z0, CAS.x1, 256 + CAS.halfY, CAS.z1, 'plate.dark');
  c.box(CAS.x0 - 10, 256 - CAS.halfY + 6, CAS.z0 + 8, CAS.x0, 256 + CAS.halfY - 6, CAS.z1 - 8, 'plate');
  for (const s2 of [-1, 1]) {
    c.box(CAS.x0, 256 + s2 * CAS.halfY, CAS.z0, CAS.x1, 256 + s2 * (CAS.halfY + 6), CAS.z1, 'plate');
    c.box(CAS.x0 + 8, 256 + s2 * (CAS.halfY + 6), CAS.z0 + 12, CAS.x1 - 8, 256 + s2 * (CAS.halfY + 7), CAS.z0 + 18, 'team.accent');
  }
  c.box(CAS.x0, 256 - CAS.halfY, CAS.z1, CAS.x1, 256 + CAS.halfY, CAS.z1 + 6, 'plate');
  c.box(CAS.x0, 256 - CAS.halfY, CAS.z0 - 6, CAS.x1, 256 + CAS.halfY, CAS.z0, 'plate');
  for (const y of COLS) {
    for (const z of ROWS) {
      c.cylX(CAS.x1 - 22, CAS.x1 + 8, y, z, TUBE_R + 4, 'plate');       // aperture surround
      c.cylX(CAS.x1 - 20, CAS.x1 + 6, y, z, TUBE_R, 'gunmetal');        // tube
      c.cylX(CAS.x1 + 2, CAS.x1 + 10, y, z, TUBE_R + 2, 'steel.dark');  // retaining ring
      c.cylX(CAS.x1 + 6, CAS.x1 + 11, y, z, TUBE_R - 6, 'scorch');      // bore
    }
  }
  c.rivets(CAS.x1 - 4, 256 - CAS.halfY, CAS.z1 + 6, CAS.x1 - 4, 256 + CAS.halfY, CAS.z1 + 6, 12, 'steel.bright');
  // Windage rails along the cassette roof, so the top is not a bare slab.
  for (const s2 of [-1, 1]) {
    c.box(CAS.x0 + 6, 256 + s2 * 48, CAS.z1 + 6, CAS.x1 - 6, 256 + s2 * 54, CAS.z1 + 12, 'steel.dark');
  }
  c.pivot('barrel', [CAS.x0 + 40, 256, DECK_Z + 70]);
  c.parent('barrel', 'launcher');
  c.dynamic('barrel');
  c.part('body');

  /* ----------------------------------------------------------- surface pass */
  c.wear(0x6d21, 'steel.dark', { rate: 0.03, only: ['team.hull', 'team.light', 'plate'] });
  c.mottle(0x2b95, ['team.dark', 'team.light'], 0.02, { only: ['team.hull'] });
  return c;
}
