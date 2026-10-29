/**
 * Infantry — foot, 16 facings.
 *
 * The baseline rifleman, and therefore the figure every other foot unit is read
 * against: helmet, webbing, rucksack, rifle at the shoulder. Everything that
 * separates the rest of the roster is added on top of this one.
 *
 * Parts: `body`, `head`, `arm.R` (arm + rifle).
 */
import { humanoid, weapon } from '../kit-foot.mjs';

export function buildInfantry(c) {
  humanoid(c, {
    headgear: 'helmet',
    pack: 'pack',
    weaponKind: 'rifle',
    stride: 4,
    grip: { x: 296, y: 288, z: 162 },
  });

  // Squad kit: a grenade at the belt and a bayonet on the hip. Both are single
  // voxel clusters, but they catch the light and break the silhouette.
  c.part('body');
  c.box(236, 232, 108, 244, 240, 118, 'gunmetal');      // grenade
  c.box(232, 276, 100, 238, 284, 124, 'cloth.dark');    // bayonet scabbard
  return c;
}
