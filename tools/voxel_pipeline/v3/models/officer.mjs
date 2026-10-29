/**
 * Officer — foot, 16 facings.
 *
 * Peaked cap, binoculars on the chest, a map board in the support hand and a
 * radio operator's whip behind. Taller headgear and a straighter stance than the
 * rifleman: this is a unit that stands still while others run.
 *
 * Parts: `body`, `head`, `arm.R` (rifle).
 */
import { humanoid, P } from '../kit-foot.mjs';

export function buildOfficer(c) {
  humanoid(c, {
    headgear: 'peaked',
    pack: 'radio',
    weaponKind: 'rifle',
    grip: { x: 296, y: 288, z: 160 },
    stride: 0,
  });

  c.part('body');
  // Binoculars, hanging on the chest rig.
  c.box(262, 240, 150, 272, 250, 162, 'steel.dark');
  c.box(262, 262, 150, 272, 272, 162, 'steel.dark');
  c.box(270, 240, 152, 274, 248, 160, 'optic');
  c.box(270, 264, 152, 274, 272, 160, 'optic');
  // Map board under the support hand.
  c.box(258, 272, 128, 300, 282, 134, 'wood');
  c.box(262, 274, 134, 296, 280, 136, 'paint.line');
  // Rank tabs on the shoulders.
  for (const cy of [232, 280]) {
    c.box(240, cy - 6, P.shoulderZ - 2 + 12, 258, cy + 6, P.shoulderZ + 16, 'brass');
  }
  return c;
}
