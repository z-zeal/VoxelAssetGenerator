/**
 * Engineer — foot, 16 facings.
 *
 * Unarmed, so the identity is entirely the **load**: orange hard hat, toolbox in
 * the support hand, shovel and pick across the pack. The hard hat is the only
 * bright-warm headgear in the roster, which is what makes the engineer findable
 * in a crowd of helmets at sprite scale.
 *
 * Parts: `body`, `head`, `arm.R` (empty hand).
 */
import { humanoid } from '../kit-foot.mjs';

export function buildEngineer(c) {
  humanoid(c, {
    headgear: 'hardhat',
    pack: 'toolkit',
    weaponKind: 'none',
    grip: { x: 296, y: 288, z: 140 },
    bulk: 0,
    stride: 2,
  });

  c.part('body');
  // Toolbox carried two-handed at the waist: an engineer with empty hands is a
  // rifleman missing his rifle.
  c.box(296, 262, 118, 330, 306, 146, 'lamp.warm');
  c.box(300, 266, 120, 326, 302, 124, 'steel.dark');
  c.box(308, 278, 146, 318, 292, 152, 'steel.dark');         // handle
  c.box(306, 270, 126, 312, 274, 132, 'brass');              // latch
  // Tools on the back: shovel one side, pick the other.
  c.box(196, 226, 96, 202, 232, 182, 'wood');
  c.box(192, 222, 176, 206, 236, 186, 'steel.dark');
  c.box(198, 280, 100, 204, 286, 176, 'wood');
  c.box(192, 274, 168, 210, 292, 180, 'steel.dark');
  // Road wheels of a mine roller would be too much; a coil of wire will do.
  for (let i = 0; i < 4; i++) c.box(200, 236 + i * 10, 128, 206, 242 + i * 10, 140, 'rust');
  return c;
}
