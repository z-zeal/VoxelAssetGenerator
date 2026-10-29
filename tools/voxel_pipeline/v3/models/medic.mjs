/**
 * Field Medic — foot, 16 facings.
 *
 * Unarmed. The read is a **white panel with a red cross** on the pack and the
 * helmet, plus a stretcher roll across the shoulders: at 64 px the cross is the
 * only medical unit in the game that can be identified without a tooltip.
 *
 * Parts: `body`, `head`, `arm.R` (empty hand).
 */
import { humanoid } from '../kit-foot.mjs';

export function buildMedic(c) {
  humanoid(c, {
    headgear: 'helmet',
    pack: 'satchel',
    weaponKind: 'none',
    stride: 2,
  });

  c.part('body');
  // The cross goes on the FRONT first: a mark that only exists on the pack is
  // invisible from any facing that shows the man's face, which is most of them.
  c.box(262, 246, 148, 270, 266, 172, 'concrete.lit');       // chest aid panel
  c.box(270, 252, 154, 274, 260, 166, 'lamp.red');
  c.box(270, 250, 156, 274, 262, 164, 'lamp.red');
  c.box(270, 254, 152, 274, 258, 168, 'lamp.red');
  // White aid panel on the pack, with a red cross proud of it.
  c.box(190, 238, 132, 198, 274, 172, 'concrete.lit');
  c.box(186, 250, 142, 194, 262, 164, 'lamp.red');
  c.box(184, 252, 148, 192, 260, 158, 'concrete.lit');
  // Stretcher roll across the shoulders.
  c.cylX(206, 246, 224, 182, 9, 'canvas');
  c.cylX(206, 246, 288, 182, 9, 'canvas');
  // Armbands, both arms: the mark that reads from the side too.
  c.box(246, 214, 152, 256, 222, 166, 'concrete.lit');
  c.box(246, 292, 152, 256, 300, 166, 'concrete.lit');
  return c;
}
