/**
 * Stealth fighter — `stealth-fighter`, 16 facings.
 *
 * The one airframe in the set whose silhouette is *flat*, and that is the whole
 * design: a stealth shaping rule flattens the aircraft, so the model is all hard
 * edges and no round loft.
 *
 *   * **a blended lifting body** — the wing and fuselage are one planar surface,
 *     built from faceted slabs rather than a lofted tube. A round fuselage would
 *     destroy the read immediately;
 *   * **no vertical fin, or two canted ones laid back** — the tail sits flat, so
 *     from the isometric views the wings are the outline;
 *   * **serrated trailing edges** — the sawtooth is the detail that says "stealth"
 *     at 8×, and it is cheap: every other trailing column is one voxel shorter.
 *
 * Parts: `body`, `fin` (rudder pair, dynamic), `bay` (weapons bay doors,
 * dynamic), `stores` (missiles in the bay).
 */
import { liftingEye } from '../kit.mjs';
import { canopy, jetPipe, store } from '../kit-air.mjs';

const CZ = 306;                  // the lifting body's mid-plane
const PLANE_H = 2;               // half-thickness of the blended surface

export function buildStealthFighter(c) {
  const halfW = (x) => {         // planform half-width along the body
    if (x > 452) return Math.max(3, Math.round(28 - (x - 452) * 1.4));
    if (x > 300) return 28 + Math.round((x - 300) * 0.10);
    if (x > 150) return Math.max(10, Math.round(28 + (452 - x) * 0.02));
    return Math.max(6, Math.round(28 - (150 - x) * 0.35));
  };

  /* -------------------------------------------------------------- airframe */
  c.part('body');
  // Faceted lifting body: three stacked slabs per station, widest at the mid
  // plane, narrowing upward and downward. No loft, no taper curves — that is the
  // point of the shape.
  for (let x = 120; x <= 470; x++) {
    const w = halfW(x);
    const t = Math.max(2, Math.round(w * 0.16));
    c.box(x, 256 - w, CZ - t, x + 1, 256 + w, CZ + t, 'team.hull');
    c.box(x, 256 - Math.round(w * 0.62), CZ + t, x + 1, 256 + Math.round(w * 0.62), CZ + t + Math.max(1, t - 1), 'team.dark');
    c.box(x, 256 - Math.round(w * 0.55), CZ - t - Math.max(1, t - 1), x + 1, 256 + Math.round(w * 0.55), CZ - t, 'team.dark');
  }

  // Chin: the nose is a wedge, not a cone, and the underside stays flat so the
  // aircraft reads as a plate from every quarter view.
  for (let i = 0; i < 16; i++) {
    const x = 470 + i;
    const w = Math.max(2, 14 - i);
    c.box(x, 256 - w, CZ - PLANE_H - 2, x + 1, 256 + w, CZ + PLANE_H, 'team.hull');
  }

  // Wings: straight trailing edge, swept leading edge, blended into the body.
  for (const s of [-1, 1]) {
    for (let i = 0; i <= 200; i++) {
      const y = 256 + s * i;
      const lead = 358 - Math.round(i * 0.72);
      const trail = 190 - Math.round(i * 0.10);
      // Serrated trailing edge: every other column pulls in two voxels.
      const step = i % 6 < 3 ? 0 : 4;
      const zt = CZ + Math.round(i * 0.012) + (i % 6 < 3 ? 0 : 1);
      c.box(trail + step, y, zt - PLANE_H, lead, y + 1, zt + PLANE_H, 'team.hull');
    }
    // Wingtip: sawn off flat, which keeps the planform a polygon.
    c.box(150, 256 + s * 200, CZ - PLANE_H, 246, 256 + s * 203, CZ + PLANE_H + 2, 'team.dark');
  }

  // Engines: two rectangular nozzles buried in the upper surface.
  for (const s of [-1, 1]) {
    c.box(96, 256 + s * 34 - 16, CZ + 1, 150, 256 + s * 34 + 16, CZ + 9, 'scorch');
    c.box(96, 256 + s * 34 - 20, CZ - 1, 132, 256 + s * 34 + 20, CZ + 11, 'steel.dark');
    jetPipe(c, { x0: 118, x1: 96, cz: CZ + 4, r0: 13, r1: 10 });
  }

  // Cockpit sits as a low faceted canopy in the lifting body, not on top of it.
  canopy(c, { x0: 386, x1: 424, halfW: 18, z0: CZ + PLANE_H, z1: CZ + 22, rake: 9 });
  liftingEye(c, { x: 300, y: 250, z: CZ + 12 });

  /* ------------------------------------------------------------------ fin */
  // Two canted panels laid back at 45°, as much winglet as fin. They are the only
  // vertical surfaces, so they have to be low and sharp.
  c.part('fin');
  for (const s of [-1, 1]) {
    for (let i = 0; i < 40; i++) {
      const z = CZ + 8 + i;
      const y = 256 + s * (68 + Math.round(i * 0.55));
      const root = 112 + Math.round(i * 1.5);
      c.box(root, Math.min(y, y + s * 4), z, root + 34, Math.max(y, y + s * 4), z + 1, 'team.light');
    }
  }
  c.pivot('fin', [150, 256, CZ + 8]);
  c.parent('fin', 'body');
  c.dynamic('fin');
  c.part('body');

  /* ------------------------------------------------------------------ bay */
  // Weapons bay doors in the belly: two long panels either side of the centre
  // line, which is where a stealth aircraft keeps its stores.
  c.part('bay');
  for (const s of [-1, 1]) {
    c.box(236, 256 + s * 8, CZ - PLANE_H - 4, 330, 256 + s * 30, CZ - PLANE_H - 1, 'team.dark');
    c.box(240, 256 + s * 12, CZ - PLANE_H - 5, 326, 256 + s * 26, CZ - PLANE_H - 3, 'team.hull');
  }
  c.pivot('bay', [283, 256, CZ - PLANE_H - 4]);
  c.parent('bay', 'body');
  c.dynamic('bay');
  c.part('body');

  /* --------------------------------------------------------------- stores */
  c.part('stores');
  for (const s of [-1, 1]) {
    store(c, { x: 250, cy: 256 + s * 18, cz: CZ - PLANE_H - 8, len: 56, r: 8, kind: 'missile', part: 'stores' });
  }
  c.pivot('stores', [250, 256, CZ - PLANE_H - 8]);
  c.parent('stores', 'body');
  c.dynamic('stores');
  c.part('body');

  /* ----------------------------------------------------------- surface pass */
  // Stealth coatings are matte and uniform: a mottle would read as panel gaps.
  c.wear(0x4b21, 'steel.dark', { rate: 0.012, only: ['team.light'] });
  return c;
}
