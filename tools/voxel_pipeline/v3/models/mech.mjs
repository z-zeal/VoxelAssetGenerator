/**
 * Mech Infantry — foot, 16 facings.
 *
 * Two-legged walker, not a scaled-up human. The three things that make it read
 * as a machine are the **reverse-jointed legs** (thigh forward, shin back), a
 * cockpit pod hung between the hips with a glazed canopy, and weapon pods on the
 * ends of the arms instead of hands holding guns.
 *
 * `turret` is the whole upper body above the hips — a walker's torso rotates at
 * the waist, so the pivot is at the waist ring, not at the guns.
 *
 * Parts: `body` (legs and hips), `turret` (pod, arms, weapons).
 */
import { walker } from '../kit-foot.mjs';

export function buildMech(c) {
  walker(c);
  return c;
}
