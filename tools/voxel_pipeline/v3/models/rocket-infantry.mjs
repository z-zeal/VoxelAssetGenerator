/**
 * Rocket Infantry — foot, 16 facings.
 *
 * A shoulder tube that overhangs the head at both ends, so the silhouette is
 * wider than the figure: at sprite scale the tube *is* the unit. Venturi behind,
 * blast cone in front, sight block on top.
 *
 * Parts: `body`, `head`, `arm.R` (tube).
 */
import { humanoid } from '../kit-foot.mjs';

export function buildRocketInfantry(c) {
  humanoid(c, {
    headgear: 'helmet',
    pack: 'pack',
    weaponKind: 'rocket',
    grip: { x: 292, y: 288, z: 158 },
    stride: 3,
  });

  c.part('body');
  // Spare rocket clipped to the pack, fins visible: says "this one carries more".
  c.cylX(192, 232, 250, 156, 7, 'gunmetal');
  c.box(188, 240, 148, 196, 262, 164, 'steel.dark');
  c.box(196, 244, 152, 200, 258, 160, 'scorch');
  return c;
}
