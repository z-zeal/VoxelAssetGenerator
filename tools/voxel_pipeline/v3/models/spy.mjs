/**
 * Spy — foot, 16 facings.
 *
 * The only unit not in uniform: long coat, fedora, briefcase, pistol. Everything
 * about the silhouette is wrong for a soldier — narrow shoulders, flared skirt,
 * nothing long and metal — which is exactly what makes it unmistakable.
 *
 * Parts: `body`, `head`, `arm.R` (pistol).
 */
import { humanoid } from '../kit-foot.mjs';

export function buildSpy(c) {
  humanoid(c, {
    headgear: 'fedora',
    pack: 'briefcase',
    weaponKind: 'pistol',
    grip: { x: 298, y: 292, z: 150 },
    stride: 4,
    coatLen: 58,
    skin: 'skin.dark',
  });

  c.part('body');
  // Scarf and a pocket square, both in the accent tone but small.
  c.box(230, 240, 176, 266, 272, 184, 'canvas');
  c.box(262, 240, 152, 266, 252, 160, 'team.accent');
  return c;
}
