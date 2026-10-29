/**
 * Elite Hero — foot, 16 facings.
 *
 * The most expensive unit on foot, so it gets the most silhouette: a cape that
 * breaks the outline behind the legs, pauldrons wider than the shoulders, a
 * crested helmet and the heavy rifle. It is the only foot unit with something
 * *behind* it other than a pack.
 *
 * Parts: `body`, `head`, `arm.R` (heavy rifle).
 */
import { humanoid, cape } from '../kit-foot.mjs';

export function buildEliteHero(c) {
  humanoid(c, {
    headgear: 'helmet',
    pack: 'none',
    weaponKind: 'bolter',
    grip: { x: 296, y: 292, z: 160 },
    stride: 6,
    bulk: 2,
  });

  c.part('body');
  // Cape: flares to the hem and leans back as it falls.
  cape(c, { hemZ: 46, topZ: 176, halfTop: 30, halfHem: 54, back: 190, trim: 'brass' });
  c.box(202, 226, 168, 216, 286, 180, 'brass');          // mantle bar
  // Pauldrons wider than the shoulders, and a crest lying ALONG the helmet
  // rather than a block standing on top of it.
  c.box(230, 288, 160, 266, 308, 186, 'plate');
  c.box(230, 204, 160, 266, 224, 186, 'plate');
  c.box(236, 212, 178, 264, 300, 184, 'brass');
  c.box(238, 252, 214, 264, 260, 222, 'brass');
  c.box(246, 254, 220, 262, 258, 226, 'lamp.red');
  return c;
}
