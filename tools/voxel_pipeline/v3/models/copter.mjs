/**
 * Attack helicopter — `copter`, 16 facings.
 *
 * The read is a gunship: a narrow tandem cockpit, stub wings heavy with rocket
 * pods, and a rotor disc wide enough that the silhouette is unmistakable from
 * every one of the 16 facings. Three things are load-bearing:
 *
 *   * **the disc is the silhouette.** A helicopter drawn with a small rotor
 *     looks like a fat aeroplane; the blades here reach nearly the full width of
 *     the canvas, which is the one place the 512 lattice is really paying off;
 *   * **it is airborne.** The belly sits ~110 voxels above the ground plane so
 *     the sprite lands on a tile as a flying unit instead of a parked one; the
 *     skids hang below, which is what sells the height;
 *   * **the chin gun is a part.** It traverses, so the gun can track without the
 *     airframe turning — the same contract as the tank's turret.
 *
 * Parts: `body`, `rotor` (four-blade main disc), `tail-rotor`, `gun`.
 */
import { antenna, liftingEye } from '../kit.mjs';
import {
  fuselage, canopy, rotor, tailRotor, skids, wingPair, tailPlane, fin, store, sensorBall, sideGlass,
} from '../kit-air.mjs';

const BELLY = 148;          // lowest point of the airframe
const MAST_Z = 262;         // top of the gearbox housing
const HUB_Z = 336;          // rotor hub height
const ROTOR_R = 196;

export function buildCopter(c) {
  /* -------------------------------------------------------------- airframe */
  c.part('body');
  fuselage(c, {
    mat: 'team.hull',
    belly: 'team.dark',
    stations: [
      [452, 11, 11, 202],
      [430, 30, 27, 200],
      [402, 46, 38, 202],
      [350, 54, 42, 206],
      [288, 52, 41, 210],
      [228, 36, 31, 220],
      [176, 22, 21, 240],
      [124, 14, 15, 258],
      [72, 10, 11, 272],
    ],
  });
  // Engine deck and gearbox housing between the cabin and the mast.
  c.box(244, 216, MAST_Z - 26, 330, 296, MAST_Z, 'team.dark');
  c.box(262, 228, MAST_Z, 304, 284, MAST_Z + 8, 'steel.dark');
  c.grille(250, 324, 220, 292, MAST_Z + 4, 9, 'iron', 'team.dark');

  // Tandem cockpit: the two canopies are stepped, which is the AH-64 read and
  // stops the nose from being one long greenhouse.
  canopy(c, { x0: 424, x1: 450, halfW: 24, z0: 210, z1: 240, rake: 4 });
  canopy(c, { x0: 386, x1: 414, halfW: 34, z0: 220, z1: 258, rake: 5 });
  c.box(378, 214, 240, 420, 298, 258, 'team.dark');                 // pilot's step
  sideGlass(c, { x0: 398, x1: 428, halfW0: 47, halfW1: 31, z0: 214, z1: 242 });
  for (const s of [-1, 1]) {
    c.box(322, 256 + s * 50, 168, 372, 256 + s * 53, 200, 'team.dark');      // cabin door
    c.box(276, 256 + s * 48, 176, 300, 256 + s * 51, 196, 'team.dark');      // avionics bay
  }

  // Exhausts and heat staining behind the gearbox.
  for (const s of [-1, 1]) {
    c.cylX(246, 268, 256 + s * 46, 228, 13, 'iron');
    c.cylX(244, 250, 256 + s * 46, 228, 16, 'scorch');
  }

  // Stub wings with stores: the widest part of the airframe below the disc.
  wingPair(c, { x: 322, halfSpan: 104, chord: 38, thick: 8, cz: 212, mat: 'team.hull' });
  store(c, { x: 326, cy: 256 - 88, cz: 192, len: 58, r: 12, kind: 'pod' });
  store(c, { x: 326, cy: 256 + 88, cz: 192, len: 58, r: 12, kind: 'pod' });
  store(c, { x: 326, cy: 256 - 116, cz: 196, len: 46, r: 7, kind: 'missile' });
  store(c, { x: 326, cy: 256 + 116, cz: 196, len: 46, r: 7, kind: 'missile' });

  // Skids, plus a boarding step on each side.
  skids(c, { x0: 250, x1: 420, halfW: 96, z: BELLY - 60 });
  for (const s of [-1, 1]) c.box(330, 256 + s * 62, BELLY - 34, 366, 256 + s * 70, BELLY - 26, 'steel.dark');

  // Tail: swept fin, stabiliser and the drive shaft along the boom.
  fin(c, { x0: 72, x1: 132, z0: 276, z1: 380, rake: 20, thick: 6, mat: 'team.hull' });
  c.box(70, 252, 286, 150, 256, 292, 'steel.dark');                 // drive shaft
  tailPlane(c, { x: 74, halfSpan: 42, chord: 30, thick: 4, cz: 300 });  // tailplane
  antenna(c, { x: 110, y: 262, z: 300, height: 48 });

  // Nose sensor and the gunner's sight.
  sensorBall(c, { x: 438, cz: 184, r: 15, part: 'body' });
  liftingEye(c, { x: 300, y: 256, z: MAST_Z });

  /* ----------------------------------------------------------------- rotor */
  c.part('rotor');
  rotor(c, {
    cx: 256, cy: 256, z: HUB_Z, radius: ROTOR_R, blades: 4, chord: 12,
    phase: Math.PI / 7, mastZ: MAST_Z + 6,
  });
  c.pivot('rotor', [256, 256, HUB_Z]);
  c.dynamic('rotor');

  /* ------------------------------------------------------------ tail rotor */
  c.part('tail-rotor');
  tailRotor(c, { x: 84, y: 266, side: 1, cz: 330, radius: 58, blades: 4, chord: 11 });
  c.pivot('tail-rotor', [84, 266, 330]);
  c.dynamic('tail-rotor');

  /* --------------------------------------------------------------- chin gun */
  c.part('gun');
  c.box(420, 234, 158, 448, 278, 176, 'steel.dark');                // cradle
  c.cylZ(434, 256, 176, 190, 12, 'steel');
  c.box(430, 240, 176, 452, 272, 196, 'gunmetal');                  // receiver
  c.cylX(452, 486, 256, 186, 6, 'gunmetal');                        // barrel
  c.cylX(486, 490, 256, 186, 8, 'steel.dark');
  c.pivot('gun', [434, 256, 176]);
  c.parent('gun', 'body');
  c.dynamic('gun');
  c.traverse('gun');
  c.part('body');

  /* ----------------------------------------------------------- surface pass */
  c.wear(0x5c31, 'steel.dark', { rate: 0.03, only: ['team.light', 'plate'] });
  c.mottle(0x2a91, ['team.dark', 'team.hull'], 0.025, { only: ['team.hull'] });
  return c;
}
