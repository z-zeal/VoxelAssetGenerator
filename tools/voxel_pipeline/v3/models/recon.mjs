/**
 * Recon (HUMVEE) — wheeled, 16 facings.
 *
 * The lightest vehicle in the roster and the first wheeled one, so it has to
 * establish the family read: **exposed tyres, a raked bonnet, an open cargo bay
 * and a roll cage**. The cage is the silhouette — a lattice over the rear with
 * no roof, which no tracked vehicle in the game has.
 *
 * Parts: `body`, `wheels.L`, `wheels.R`, `turret` (the ring mount), `barrel`
 * (the pintle MG). Wheels are separate per side so the runtime can spin them.
 */
import {
  hatch, periscope, antenna, crate, louvres, liftingEye, cable, seam,
} from '../kit.mjs';
import { wheeledHull, axleGear, bumper, windscreen } from '../kit-wheeled.mjs';

const DECK_Z = 150;
const SILL_Z = 92;
const HALF = 118;
const AXLE_R = 44;
const AXLE_F = 356;
const AXLE_REAR = 168;
// Tyre bands: outer face on the outside, inner face tucked behind the sill.
const TYRE_L = { y0: 138, y1: 190, innerY: 196 };
const TYRE_R = { y0: 322, y1: 374, innerY: 316 };

export function buildRecon(c) {
  /* ------------------------------------------------------------ running gear */
  axleGear(c, { side: 'L', axles: [AXLE_F, AXLE_REAR], ...TYRE_L, r: AXLE_R });
  axleGear(c, { side: 'R', axles: [AXLE_F, AXLE_REAR], ...TYRE_R, r: AXLE_R });

  /* -------------------------------------------------------------------- hull */
  wheeledHull(c, {
    x0: 122, x1: 396,
    halfW: HALF,
    chassisHalf: 78,
    bellyZ: 30, sillZ: SILL_Z, deckZ: DECK_Z,
    bevel: 2, bevelH: 34,
    glacis: { run: 44, noseZ: 104 },
    tail: true,
  });

  c.part('body');
  bumper(c, { x: 440, halfW: 108, z: 92 });

  // Bonnet: the nose is a swept slope, so the detail follows the slope rather
  // than sitting on a flat plate above it. Winch behind the bumper, grille on
  // the slope, and a jerry-can holder on the wing.
  c.box(430, 214, 96, 448, 298, 110, 'steel.dark');                     // winch tray
  c.cylY(440, 220, 292, 108, 20, 'steel');                              // winch drum
  c.cylY(440, 224, 288, 108, 11, 'steel.bright');
  for (const y of [224, 288]) c.box(436, y - 3, 96, 444, y + 3, 120, 'steel.dark');
  for (let y = 216; y < 296; y += 10) c.box(424, y, 106, 428, y + 6, 124, 'iron');   // grille
  for (const y of [200, 312]) liftingEye(c, { x: 404, y, z: DECK_Z - 4 });
  c.box(408, 196, DECK_Z - 4, 438, 210, DECK_Z, 'brass');                // wing box
  c.box(408, 302, DECK_Z - 4, 438, 316, DECK_Z, 'brass');

  // Cab: armoured tub sides, seats, and a windscreen raked back over the bonnet.
  c.box(310, 138, SILL_Z, 392, 374, DECK_Z + 30, 'team.dark');
  c.box(314, 144, DECK_Z + 30, 388, 368, DECK_Z + 36, 'team.light');
  windscreen(c, { x: 390, y0: 206, y1: 306, z0: DECK_Z + 34, z1: DECK_Z + 74, rake: 8 });
  for (const y of [216, 296]) {
    c.box(340, y - 18, DECK_Z + 12, 372, y + 18, DECK_Z + 26, 'cloth.dark');   // seat back
    c.box(330, y - 20, DECK_Z + 6, 376, y + 20, DECK_Z + 12, 'cloth.dark');    // seat base
  }
  c.box(316, 138, DECK_Z + 30, 336, 150, DECK_Z + 48, 'steel.dark');           // door pillar

  // Open cargo bay behind the cab, with a stowage rack down each flank.
  c.box(150, 138, SILL_Z + 10, 306, 374, DECK_Z, 'team.hull');
  c.box(150, 150, DECK_Z, 306, 168, DECK_Z + 26, 'team.dark');                 // side rails
  c.box(150, 344, DECK_Z, 306, 362, DECK_Z + 26, 'team.dark');
  c.box(150, 168, DECK_Z, 162, 344, DECK_Z + 22, 'team.dark');
  crate(c, { x0: 176, y0: 186, z0: DECK_Z, x1: 232, y1: 244, z1: DECK_Z + 26, mat: 'wood', lid: 'steel.dark' });
  crate(c, { x0: 176, y0: 268, z0: DECK_Z, x1: 228, y1: 322, z1: DECK_Z + 22, mat: 'canvas' });
  c.cylZ(252, 300, DECK_Z, DECK_Z + 28, 12, 'brass');                          // jerry can
  c.box(252, 276, DECK_Z, 268, 292, DECK_Z + 28, 'steel.dark');

  /* ------------------------------------------------------------- roll cage */
  // Four posts and a lattice roof. This is the whole idea of the vehicle: an
  // open-topped scout you can see straight through, so the cage is drawn as thin
  // members with real gaps rather than a panel.
  for (const x of [164, 300]) {
    for (const y of [152, 360]) {
      c.box(x - 4, y - 4, DECK_Z, x + 4, y + 4, DECK_Z + 96, 'steel.dark');
    }
  }
  for (const y of [152, 360]) {
    c.box(160, y - 4, DECK_Z + 92, 304, y + 4, DECK_Z + 100, 'steel.dark');    // rail
  }
  for (let x = 176; x < 300; x += 26) {
    c.box(x - 3, 148, DECK_Z + 96, x + 3, 364, DECK_Z + 102, 'steel');         // cross bars
  }
  // Diagonal brace down the flanks, which is what makes a cage a cage.
  for (const y of [152, 360]) {
    for (let i = 0; i < 8; i++) {
      const x = 168 + i * 17;
      c.box(x, y - 3, DECK_Z + 88 - i * 10, x + 17, y + 3, DECK_Z + 94 - i * 10, 'steel.dark');
    }
  }
  antenna(c, { x: 300, y: 360, z: DECK_Z + 100, height: 84 });
  c.cylZ(310, 164, DECK_Z + 36, DECK_Z + 48, 8, 'lamp.warm');                  // spot lamp
  c.box(298, 156, DECK_Z + 44, 316, 172, DECK_Z + 52, 'steel.dark');

  /* ------------------------------------------------------------------ mount */
  // Ring mount over the rear bay: a pedestal with a pintle and a gun shield.
  c.part('turret');
  c.cylZ(200, 256, DECK_Z, DECK_Z + 12, 34, 'steel.dark');
  c.ringZ(200, 256, DECK_Z + 12, DECK_Z + 18, 34, 24, 'steel');
  c.cylZ(200, 256, DECK_Z + 18, DECK_Z + 46, 9, 'steel.dark');
  c.box(190, 232, DECK_Z + 40, 204, 280, DECK_Z + 62, 'steel.dark');           // pintle yoke
  c.box(178, 224, DECK_Z + 54, 186, 288, DECK_Z + 78, 'plate');                // gun shield
  c.pivot('turret', [200, 256, DECK_Z]);
  c.dynamic('turret');
  c.traverse('turret');

  c.part('barrel');
  c.box(186, 234, DECK_Z + 50, 212, 278, DECK_Z + 66, 'gunmetal');             // receiver
  c.cylX(212, 268, 256, DECK_Z + 58, 5, 'gunmetal');                           // barrel
  c.box(240, 244, DECK_Z + 52, 256, 268, DECK_Z + 64, 'steel.dark');           // magazine
  c.cylX(266, 270, 256, DECK_Z + 58, 7, 'steel.dark');
  c.pivot('barrel', [186, 256, DECK_Z + 58]);
  c.parent('barrel', 'turret');
  c.dynamic('barrel');
  c.part('body');

  /* ----------------------------------------------------------- surface pass */
  c.wear(0x3a17, 'steel.dark', { rate: 0.03, only: ['team.hull', 'team.light', 'plate'] });
  c.mottle(0x71c4, ['team.dark', 'team.light'], 0.02, { only: ['team.hull'] });
  return c;
}
