/**
 * Submarine — `submarine`, 16 facings.
 *
 * A submarine has no deck furniture at all, so everything that reads has to be
 * on the pressure hull:
 *
 *   * **a full-length round hull with a cigar taper** — no boot stripe, no
 *     freeboard, no deck edge. It is one continuous shape, and the taper at both
 *     ends is the whole silhouette;
 *   * **a sail set well forward of centre** — not a deckhouse, not a funnel. The
 *     sail plus the periscopes above it is the only vertical mass;
 *   * **planes and a stern prop** — the two small details that say "submerged"
 *     rather than "capsized boat".
 *
 * Parts: `body`, `sail` (dynamic — it is what a periscope depth animation
 * moves), `planes` (dive planes, dynamic), `prop` (screw, dynamic).
 */
import { antenna, liftingEye } from '../kit.mjs';

const CZ = 76;                   // hull centre line, low in the canvas

export function buildSubmarine(c) {
  /* ------------------------------------------------------------------ hull */
  c.part('body');
  // Stepped cylinder: radius profile from stern (x 60) to bow (x 452). A stepped
  // profile is the right tool here — a smooth loft of radii reads the same at 8×
  // and costs three times the voxels.
  const profile = [
    [ 60, 6], [ 68, 16], [ 80, 28], [ 96, 38], [120, 44], [150, 47],
    [210, 48], [280, 48], [340, 46], [386, 41], [416, 33], [438, 22], [452, 10],
  ];
  for (let i = 0; i < profile.length - 1; i++) {
    const [x0, r0] = profile[i];
    const [x1, r1] = profile[i + 1];
    for (let x = x0; x < x1; x++) {
      const t = (x - x0) / Math.max(1, x1 - x0);
      const r = Math.round(r0 + (r1 - r0) * t);
      c.cylX(x, x + 1, 256, CZ, r, 'team.dark');
    }
  }
  // Casing stripe along the waterline: the one horizontal line a submarine
  // sprite can have, and without it the hull is a grey sausage.
  for (let x = 96; x < 440; x++) {
    const t = (x - 96) / 344;
    const r = Math.round(44 + 4 * Math.sin(Math.PI * Math.min(1, t * 1.05)));
    for (const s of [-1, 1]) {
      c.box(x, Math.min(256 + s * r, 256 + s * (r - 3)), CZ, x + 1,
        Math.max(256 + s * r, 256 + s * (r - 3)), CZ + 3, 'team.light');
    }
  }
  // Flood ports: rows of small holes that read as structure at 8×.
  for (let i = 0; i < 8; i++) {
    const x = 130 + i * 34;
    for (const s of [-1, 1]) {
      c.box(x, Math.min(256 + s * 30, 256 + s * 26), CZ - 22, x + 12,
        Math.max(256 + s * 30, 256 + s * 26), CZ - 14, 'iron');
    }
  }
  liftingEye(c, { x: 300, y: 246, z: CZ + 48 });

  /* ------------------------------------------------------------------ sail */
  // Sail forward of centre, with the periscope and snorkel above it. The whole
  // sail is its own part so a runtime can raise and lower it.
  c.part('sail');
  for (let i = 0; i <= 34; i++) {
    const z = CZ + 40 + i;
    const t = i / 34;
    const half = Math.round(24 * (1 - 0.35 * t));
    const back = Math.round(20 * t);                        // the sail rakes aft
    c.box(292 - back, 256 - half, z, 344 - back, 256 + half, z + 1, 'team.hull');
  }
  c.box(300, 240, CZ + 74, 336, 272, CZ + 80, 'team.dark');       // sail top
  for (const s of [-1, 1]) {                                       // sail fairing band
    c.box(300, Math.min(256 + s * 24, 256 + s * 22), CZ + 46, 340,
      Math.max(256 + s * 24, 256 + s * 22), CZ + 56, 'team.light');
  }
  // `antenna()` switches the active part to `body` unless told otherwise, and
  // everything drawn after it would land there too — the sail came out without a
  // periscope until this was passed.
  antenna(c, { x: 318, y: 256, z: CZ + 80, height: 44, part: 'sail' });
  c.box(304, 252, CZ + 80, 312, 260, CZ + 92, 'steel.bright');     // periscope head
  c.box(326, 254, CZ + 80, 332, 258, CZ + 88, 'iron');             // snorkel
  c.pivot('sail', [318, 256, CZ + 40]);
  c.parent('sail', 'body');
  c.dynamic('sail');
  c.part('body');

  /* ---------------------------------------------------------------- planes */
  // Bow dive planes: flat fins either side, well forward.
  c.part('planes');
  for (const s of [-1, 1]) {
    c.box(374, Math.min(256 + s * 40, 256 + s * 68), CZ - 2, 402,
      Math.max(256 + s * 40, 256 + s * 68), CZ + 2, 'team.hull');
    c.box(378, Math.min(256 + s * 66, 256 + s * 68), CZ - 3, 398,
      Math.max(256 + s * 66, 256 + s * 68), CZ + 3, 'team.dark');
  }
  // Stern rudder pair, vertical.
  c.box(70, 252, CZ + 8, 96, 260, CZ + 30, 'team.hull');
  c.box(70, 252, CZ - 30, 96, 260, CZ - 8, 'team.hull');
  c.pivot('planes', [396, 256, CZ]);
  c.parent('planes', 'body');
  c.dynamic('planes');
  c.part('body');

  /* ------------------------------------------------------------------ prop */
  c.part('prop');
  c.cylX(44, 60, 256, CZ, 9, 'steel.dark');
  for (let b = 0; b < 5; b++) {
    const a = (b / 5) * Math.PI * 2;
    const dy = Math.cos(a), dz = Math.sin(a);
    for (let r = 6; r <= 34; r++) {
      const py = Math.round(256 + dy * r);
      const pz = Math.round(CZ + dz * r);
      c.box(50, py - 1, pz - 2, 56, py + 2, pz + 2, 'steel.bright');
    }
  }
  c.pivot('prop', [52, 256, CZ]);
  c.parent('prop', 'body');
  c.dynamic('prop');
  c.part('body');

  /* ----------------------------------------------------------- surface pass */
  c.wear(0x7c15, 'steel.dark', { rate: 0.014, only: ['team.hull'] });
  return c;
}
