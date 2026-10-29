/**
 * Anti-Air Infantry — foot, 16 facings.
 *
 * The only unit in the roster whose weapon **points at the sky**. The MANPADS
 * tube is angled up over the shoulder and the seeker head sits above the helmet,
 * which gives a tall, top-heavy read nothing else on the ground has.
 *
 * Parts: `body`, `head`, `arm.R` (launcher).
 */
import { humanoid } from '../kit-foot.mjs';

export function buildAaInfantry(c) {
  humanoid(c, {
    headgear: 'helmet',
    pack: 'pack',
    weaponKind: 'manpads',
    grip: { x: 288, y: 292, z: 156 },
    stride: 0,
  });

  c.part('body');
  // Battery cooler slung under the tube and a spare grip-stock.
  c.box(268, 288, 150, 300, 306, 164, 'steel.dark');
  for (let x = 272; x < 300; x += 8) c.box(x, 296, 152, x + 4, 302, 162, 'lamp.cyan');
  c.box(196, 250, 150, 236, 266, 162, 'gunmetal');
  return c;
}
