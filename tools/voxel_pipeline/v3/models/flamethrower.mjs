/**
 * Flamethrower Trooper — foot, 16 facings.
 *
 * Twin fuel cylinders on the back, a feed hose over the shoulder, and a lance
 * with a burning pilot light. The tanks make the figure's *back* heavier than its
 * front, which is the opposite of every rifle-armed unit — that asymmetry is what
 * makes it identifiable from behind as well as in front.
 *
 * Parts: `body`, `head`, `arm.R` (lance).
 */
import { humanoid } from '../kit-foot.mjs';

export function buildFlamethrower(c) {
  humanoid(c, {
    headgear: 'helmet',
    pack: 'tanks',
    weaponKind: 'flamer',
    grip: { x: 294, y: 290, z: 156 },
    stride: 2,
    mask: true,
  });

  c.part('body');
  // Second feed line down the other flank, and a pressure gauge on the chest.
  c.line(200, 232, 168, 240, 246, 146, 'brass', { thickness: 4 });
  c.box(262, 236, 148, 268, 246, 158, 'steel.dark');
  c.box(266, 238, 150, 268, 244, 156, 'lamp.warm');
  return c;
}
