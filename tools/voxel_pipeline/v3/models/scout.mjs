/**
 * Foot Recon Scout — foot, 16 facings.
 *
 * Lightest figure in the roster: cap, no pack, a short rifle and binoculars up at
 * the face. The eyes are the weapon here — vision 5, the best on foot — so the
 * pose leans slightly forward and the binoculars sit above the hands.
 *
 * Parts: `body`, `head`, `arm.R` (rifle).
 */
import { humanoid } from '../kit-foot.mjs';

export function buildScout(c) {
  humanoid(c, {
    headgear: 'cap',
    pack: 'none',
    weaponKind: 'rifle',
    grip: { x: 294, y: 290, z: 156 },
    stride: 6,
  });

  c.part('body');
  // Spare magazine pouches and a rolled blanket, nothing more.
  c.box(264, 238, 138, 270, 250, 150, 'cloth.dark');
  c.box(264, 262, 138, 270, 274, 150, 'cloth.dark');
  c.box(206, 236, 140, 224, 276, 160, 'canvas');
  // Binoculars raised to the eyes.
  c.box(262, 244, 190, 274, 254, 202, 'steel.dark');
  c.box(262, 258, 190, 274, 268, 202, 'steel.dark');
  c.box(272, 244, 192, 276, 252, 200, 'optic');
  c.box(272, 260, 192, 276, 268, 200, 'optic');
  return c;
}
