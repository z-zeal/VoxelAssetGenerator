/**
 * Attack Dog — foot, 16 facings.
 *
 * Quadruped. Four legs is the whole silhouette problem: a bodied dog at this
 * scale is a loaf on sticks unless the chest and haunches are separate masses
 * with an arch between them. It also carries a back-mounted weapon cradle and a
 * sensor mast, so it is a *unit*, not a prop.
 *
 * Parts: `body`, `head` (pivoted at the neck so it can track).
 */
import { quadruped } from '../kit-foot.mjs';

export function buildAttackDog(c) {
  quadruped(c);
  return c;
}
