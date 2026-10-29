/**
 * Sniper — foot, 16 facings.
 *
 * Ghillie hood, no pack, and the longest weapon in the roster: a 72-voxel barrel
 * with a scope and a folded bipod. The draped hood is deliberately ragged so the
 * head does not read as another helmet.
 *
 * Parts: `body`, `head`, `arm.R` (rifle).
 */
import { humanoid } from '../kit-foot.mjs';

export function buildSniper(c) {
  humanoid(c, {
    headgear: 'ghillie',
    pack: 'none',
    weaponKind: 'sniper',
    grip: { x: 296, y: 288, z: 166 },
    stride: 5,
  });

  c.part('body');
  // Ghillie strands down the back and shoulders.
  for (let i = 0; i < 22; i++) {
    const y = 224 + (i * 13) % 64;
    const z = 120 + (i * 9) % 56;
    c.box(212 + (i % 4) * 4, y, z, 218 + (i % 4) * 4, y + 5, z + 9, 'cloth');
  }
  c.box(206, 226, 118, 220, 286, 132, 'cloth.dark');       // skirt of the suit
  // Spotting scope in the support hand.
  c.cylX(300, 336, 268, 158, 4, 'steel.dark');
  return c;
}
