/**
 * Commando — foot, 16 facings.
 *
 * Light kit, beret, radio, and the shortest weapon on the roster (an SMG). The
 * whole idea is *less* than a rifleman: no rucksack, a slimmer torso, and a
 * silhouette that is mostly open space between the arms and the body.
 *
 * Parts: `body`, `head`, `arm.R` (SMG).
 */
import { humanoid } from '../kit-foot.mjs';

export function buildCommando(c) {
  humanoid(c, {
    headgear: 'beret',
    pack: 'radio',
    weaponKind: 'smg',
    grip: { x: 294, y: 290, z: 160 },
    stride: 7,
    bulk: 0,
  });

  c.part('body');
  // Knife and a grenade, nothing else: the contrast with the grenadier's
  // bandolier is the point.
  c.box(238, 232, 112, 244, 240, 128, 'steel.bright');
  c.box(234, 274, 110, 242, 282, 120, 'gunmetal');
  return c;
}
