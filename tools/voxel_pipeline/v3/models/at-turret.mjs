/**
 * Anti-tank turret emplacement — a *defensive building* whose gun traverses.
 *
 * This is the building-side proof of segmentation: `body` (the concrete pit),
 * `turret` (the armoured cupola, rotating) and `barrel` (the gun, mounted on the
 * turret — `parent: 'turret'`). Buildings still bake only 4 facings, because a
 * structure's footprint is board-axis-aligned, but its gun can face any of the
 * 16 unit directions at runtime using the same traverse contract as the tank.
 */
import { foundation, sandbagRing, crate, wallLamp, antenna } from '../kit-init.mjs';

const CX = 256, CY = 256;          // tile centre
const PIT_R = 176, PIT_T = 34;     // ring wall: outer radius / thickness
const PIT_TOP = 136;               // top of the ring wall
const PED_R = 138;                 // drum that fills the pit
const DECK = 146;                  // turret ring height (top of the drum)
const AXIS_Z = 200;                // gun trunnion height

export function buildAtTurret(c) {
  /* ---------------------------------------------------------------- pit --- */
  c.part('body');
  foundation(c, { x0: CX - 220, x1: CX + 220, y0: CY - 220, y1: CY + 220, height: 14 });

  // Hollow ring wall so the pit lip reads as a wall, not a drum.
  c.cylZ(CX, CY, 14, PIT_TOP, PIT_R, 'concrete', { hollowR: PIT_R - PIT_T });
  c.cylZ(CX, CY, 14, 22, PIT_R - PIT_T, 'concrete.dark');          // pit floor
  c.ringZ(CX, CY, PIT_TOP - 6, PIT_TOP, PIT_R + 6, PIT_R - PIT_T, 'concrete.dark');
  c.cylZ(CX, CY, 22, DECK, PED_R, 'concrete.lit');                 // the drum

  // Vertical ribs standing proud of the outer face.
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const rx = Math.round(CX + Math.cos(a) * (PIT_R - 6));
    const ry = Math.round(CY + Math.sin(a) * (PIT_R - 6));
    c.box(rx - 5, ry - 5, 20, rx + 5, ry + 5, PIT_TOP - 10, 'concrete.lit');
  }
  // Team band around the pit — the faction read at game scale.
  c.ringZ(CX, CY, PIT_TOP - 40, PIT_TOP - 24, PIT_R + 4, PIT_R - 10, 'roof');

  // Firing slit cut through the +X face (the side the gun covers).
  c.clear(CX + PIT_R - PIT_T - 2, CY - 100, 66, CX + PIT_R + 4, CY + 100, 94);
  c.box(CX + PIT_R - PIT_T - 4, CY - 104, 94, CX + PIT_R + 6, CY + 104, 100, 'concrete.dark');
  c.box(CX + PIT_R - PIT_T - 4, CY - 104, 60, CX + PIT_R + 6, CY + 104, 66, 'concrete.dark');
  c.box(CX + PIT_R - 12, CY - 96, 66, CX + PIT_R - 4, CY + 96, 94, 'scorch');
  c.box(CX + PIT_R + 4, CY - 12, 66, CX + PIT_R + 8, CY + 12, 94, 'steel.dark');

  // Rear access: tunnel through the ring at -X with a blast door and steps.
  c.clear(CX - PIT_R - 2, CY - 46, 20, CX - PIT_R + PIT_T - 2, CY + 46, 92);
  c.box(CX - PIT_R - 2, CY - 52, 92, CX - PIT_R + PIT_T, CY + 52, 98, 'concrete.dark');
  c.box(CX - PIT_R - 2, CY - 52, 20, CX - PIT_R + PIT_T, CY - 44, 92, 'concrete.dark');
  c.box(CX - PIT_R - 2, CY + 44, 20, CX - PIT_R + PIT_T, CY + 52, 92, 'concrete.dark');
  c.box(CX - PIT_R + 2, CY - 42, 20, CX - PIT_R + 8, CY + 42, 88, 'steel.dark');
  c.rivets(CX - PIT_R + 2, CY - 36, 80, CX - PIT_R + 2, CY + 36, 80, 22, 'steel');
  for (let i = 0; i < 4; i++) {
    c.box(CX - PIT_R - 30 + i * 8, CY - 46, 14 + i * 4, CX - PIT_R - 2, CY + 46, 18 + i * 4, 'concrete');
  }
  wallLamp(c, { x: CX - PIT_R - 4, y: CY - 56, z: 74, side: '-x' });

  // Bunker dressing: sandbags, ammunition crates, a stretcher shelf.
  sandbagRing(c, { x: CX, y: CY, r: 196, z: 14, rows: 2 });
  crate(c, { x0: CX + 40, y0: CY - 214, z0: 14, x1: CX + 112, y1: CY - 176, z1: 44,
    mat: 'wood', lid: 'steel.dark' });
  crate(c, { x0: CX + 120, y0: CY - 214, z0: 14, x1: CX + 176, y1: CY - 180, z1: 40,
    mat: 'canvas', lid: 'wood.dark' });
  crate(c, { x0: CX - 210, y0: CY + 120, z0: 14, x1: CX - 150, y1: CY + 158, z1: 42,
    mat: 'wood', lid: 'steel.dark' });
  // Ready ammunition rack against the pit wall.
  for (let i = 0; i < 6; i++) {
    c.cylZ(CX + 90, CY + 150 + i * 14, 14, 44, 6, 'brass');
  }
  c.box(CX + 78, CY + 142, 14, CX + 102, CY + 234, 20, 'steel.dark');

  /* ------------------------------------------------------------- turret --- */
  c.part('turret');
  const rings = [
    [DECK, DECK + 24, 100],
    [DECK + 24, DECK + 44, 92],
    [DECK + 44, DECK + 58, 80],
    [DECK + 58, DECK + 66, 62],
  ];
  for (const [z0, z1, r] of rings) c.cylZ(CX, CY, z0, z1, r, 'team.hull');
  // Bolt ring under the cupola skirt.
  c.ringZ(CX, CY, PIT_TOP - 2, PIT_TOP + 4, PIT_R - 30, PIT_R - 44, 'steel.dark');
  // Eight faceted panels with vision blocks: the facing must read at 22.5°.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const px = Math.round(CX + Math.cos(a) * 88);
    const py = Math.round(CY + Math.sin(a) * 88);
    c.cylZ(px, py, DECK + 10, DECK + 48, 15, 'team.dark');
    c.cylZ(px, py, DECK + 26, DECK + 40, 9, 'glass');
  }
  // Commander's hatch, periscope and radio mast.
  c.cylZ(CX - 30, CY + 34, DECK + 66, DECK + 74, 28, 'steel');
  c.ringZ(CX - 30, CY + 34, DECK + 74, DECK + 78, 28, 19, 'steel.bright');
  c.box(CX + 16, CY + 40, DECK + 66, CX + 50, CY + 60, DECK + 82, 'steel.dark');
  c.box(CX + 50, CY + 44, DECK + 68, CX + 56, CY + 56, DECK + 80, 'optic');
  // Rear bustle counterweight and a searchlight.
  c.cylZ(CX - 70, CY, DECK + 6, DECK + 46, 38, 'team.dark');
  c.bolts(CX - 70, CY, DECK + 46, 30, 12, 'steel', 3);
  c.box(CX - 96, CY - 60, DECK + 40, CX - 60, CY - 24, DECK + 62, 'steel.dark');
  antenna(c, { x: CX - 60, y: CY + 60, z: DECK + 66, height: 110 });
  c.pivot('turret', [CX, CY, DECK]);
  c.dynamic('turret');
  c.traverse('turret');

  /* ------------------------------------------------------------- barrel --- */
  c.part('barrel');
  // Mantlet, then a tapered tube: extractor, muzzle brake, bore.
  c.box(CX + 62, CY - 34, AXIS_Z - 26, CX + 96, CY + 34, AXIS_Z + 20, 'team.dark');
  c.box(CX + 88, CY - 24, AXIS_Z - 22, CX + 112, CY + 24, AXIS_Z + 16, 'steel.dark');
  c.cylX(CX + 104, CX + 186, CY, AXIS_Z, 13, 'gunmetal.lit');
  c.cylX(CX + 178, CX + 198, CY, AXIS_Z, 18, 'gunmetal');           // fume extractor
  c.cylX(CX + 196, CX + 226, CY, AXIS_Z, 12, 'gunmetal.lit');
  c.cylX(CX + 224, CX + 240, CY, AXIS_Z, 15, 'steel.dark');         // muzzle brake
  c.cylX(CX + 239, CX + 244, CY, AXIS_Z, 7, 'scorch');              // bore
  c.box(CX + 112, CY - 4, AXIS_Z - 18, CX + 128, CY + 4, AXIS_Z - 12, 'steel');
  c.pivot('barrel', [CX + 108, CY, AXIS_Z]);
  c.parent('barrel', 'turret');
  c.dynamic('barrel');
  c.part('body');

  /* -------------------------------------------------------- surface pass -- */
  c.wear(0x51c7, 'concrete.lit', { rate: 0.05, only: ['concrete', 'concrete.lit', 'concrete.dark'] });
  c.mottle(0x3d19, ['concrete.dark', 'concrete.lit'], 0.03,
    { only: ['concrete', 'concrete.lit'] });
  return c;
}
