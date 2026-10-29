/**
 * Grenadier — foot, 16 facings.
 *
 * The drum under the launcher is the whole read: a fat cylinder hanging below the
 * barrel, wider than the figure's waist. Where the rifleman carries a long thin
 * line, the grenadier carries a lump.
 *
 * Parts: `body`, `head`, `arm.R` (drum launcher).
 */
import { humanoid } from '../kit-foot.mjs';

export function buildGrenadier(c) {
  humanoid(c, {
    headgear: 'helmet',
    pack: 'pack',
    weaponKind: 'launcher',
    grip: { x: 294, y: 290, z: 158 },
    stride: 3,
    bulk: 1,
  });

  c.part('body');
  // Grenade bandolier: a row of fat cylinders across the chest rig.
  for (let y = 240; y < 284; y += 12) {
    c.cylX(264, 274, y, 146, 4, 'gunmetal');
  }
  return c;
}
