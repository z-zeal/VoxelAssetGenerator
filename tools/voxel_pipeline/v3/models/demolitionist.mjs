/**
 * Demolitionist — foot, 16 facings.
 *
 * A bomb suit: the bulkiest humanoid in the roster, with a sealed helmet and
 * visor, a heavy rifle and charges hanging off the webbing. It has to read as
 * *armoured infantry* without being confused with the mech, so the bulk is all in
 * the suit — thick limbs and a big collared chest — not in height.
 *
 * Parts: `body`, `head`, `arm.R` (heavy rifle).
 */
import { humanoid, P } from '../kit-foot.mjs';

export function buildDemolitionist(c) {
  humanoid(c, {
    headgear: 'helmet',
    pack: 'satchel',
    weaponKind: 'bolter',
    grip: { x: 296, y: 292, z: 156 },
    stride: 4,
    bulk: 2,
    mask: true,
  });

  c.part('body');
  // Sealed suit: a collar box round the neck and thigh plates over the knees.
  c.box(232, 232, P.neck - 8, 266, 280, P.neck + 8, 'plate.dark');
  for (const cy of [240, 272]) {
    c.box(232, cy - 14, 96, 266, cy + 14, 118, 'plate');
    c.box(236, cy - 16, 30, 262, cy + 16, 52, 'plate');
  }
  // Charges clipped round the belt, fuse wire looping to the chest.
  for (const y of [230, 254, 278]) {
    c.cylZ(226, y, 108, 126, 7, 'rust');
    c.box(224, y - 4, 126, 232, y + 4, 130, 'steel.dark');
  }
  c.line(230, 254, 128, 262, 252, 156, 'webbing', { thickness: 3 });
  return c;
}
