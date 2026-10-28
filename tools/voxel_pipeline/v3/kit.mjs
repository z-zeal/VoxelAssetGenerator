/**
 * Reusable vehicle/structural sub-assemblies for 512³-native models.
 *
 * These are *builders*, not scalers: every dimension below is an absolute
 * voxel count chosen for the 512 lattice (a road wheel is 46 voxels across, a
 * track link is 7 voxels long, a rivet is 1 voxel). Nothing is derived from
 * the retired 64³ models.
 */

/** Track loop: top run, bottom run, and two polygonal ends, link by link. */
export function trackLoop(c, { x0, x1, y0, y1, z0, z1, part, linkWidth = 8 }) {
  const yMid = (y0 + y1) / 2;
  const radius = (z1 - z0) / 2;
  const zMid = (z0 + z1) / 2;
  const step = linkWidth;
  c.part(part);

  const link = (cx, cz, angle, outer) => {
    // Plate occupies [cx-step/2, cx+step/2) x [y0,y1) x [cz-2, cz+3)
    const bx0 = Math.round(cx - step / 2), bx1 = Math.round(cx + step / 2);
    const bz0 = Math.round(cz - 2), bz1 = Math.round(cz + 3);
    c.box(bx0, y0, bz0, bx1, y1, bz1, 'track');
    // Grouser bar proud of the running surface.
    const gz = outer > 0 ? bz1 : bz0 - 2;
    c.box(bx0 + 1, y0 + 1, gz, bx1 - 1, y1 - 1, gz + 2, 'track.worn');
    // Guide horn on the inner face, alternating long/short.
    const hornY = Math.round(yMid) - 2;
    c.box(Math.round(cx) - 2, hornY, bz0, Math.round(cx) + 2, hornY + 4, bz1, 'steel.dark');
    // Pin bosses at both ends of the link.
    c.box(bx0, y0, bz0 - 1, bx0 + 1, y1, bz1 + 1, 'steel.dark');
    c.box(bx1 - 1, y0, bz0 - 1, bx1, y1, bz1 + 1, 'steel.dark');
  };

  // Straight runs.
  const straight0 = x0 + radius, straight1 = x1 - radius;
  for (let x = straight0; x < straight1; x += step) {
    link(x + step / 2, z1 - 2.5, 0, 1);   // top run
    link(x + step / 2, z0 + 2.5, 0, -1);  // bottom run
  }
  // Rounded ends (front at x1, rear at x0).
  const arcLinks = Math.max(3, Math.round((Math.PI * radius) / step));
  for (let i = 0; i <= arcLinks; i++) {
    const a = (i / arcLinks) * Math.PI;
    // front end: from top (90°) over to bottom (-90°) through 0°
    const fx = x1 - radius + Math.cos(Math.PI / 2 - a) * radius * 1.0;
    const fz = zMid + Math.cos(a) * radius;
    link(fx, fz, a, 1);
    const rx = x0 + radius - Math.cos(Math.PI / 2 - a) * radius;
    link(rx, fz, a, 1);
  }
  c.part('body');
}

/** Road wheel with tyre, rim, hub and lug bolts (axle along Y). */
export function roadWheel(c, { x, y0, y1, z, r, part = 'wheels', rimRatio = 0.62 }) {
  c.part(part);
  c.cylY(x, y0, y1, z, r, 'tyre');
  c.cylY(x, y0, y1, z, r * rimRatio, 'steel.dark');
  const yOut = y1;
  c.cylY(x, yOut, yOut + 2, z, r * rimRatio * 0.8, 'steel');
  c.cylY(x, yOut + 2, yOut + 4, z, r * 0.26, 'steel.bright');
  c.bolts(x, yOut + 2, z, r * 0.44, 8, 'steel.dark', 2);
  c.part('body');
}

/** Shock absorber / torsion bar arm. */
export function suspensionArm(c, { x, z, y0, y1, part = 'body' }) {
  c.part(part);
  c.box(x - 3, y0, z - 2, x + 3, y1, z + 4, 'steel.dark');
  c.box(x - 6, y0 + 1, z - 6, x + 6, y1 - 1, z - 2, 'iron');
  c.part('body');
}

/** Louvred engine-deck grille lying flat, with real gaps between slats. */
export function louvres(c, { x0, x1, y0, y1, z, slat = 4, part = 'body' }) {
  c.part(part);
  c.box(x0, y0, z - 3, x1, y1, z, 'steel.dark');
  for (let y = y0; y < y1; y += slat) {
    c.box(x0 + 1, y, z, x1 - 1, Math.min(y + 2, y1), z + 2, 'steel');
  }
  c.rivets(x0, y0, z + 2, x1, y0, z + 2, 9, 'steel.dark');
  c.rivets(x0, y1 - 1, z + 2, x1, y1 - 1, z + 2, 9, 'steel.dark');
  c.part('body');
}

/** Stowage crate: body, lid, hinge knuckles, latches, strap. */
export function crate(c, { x0, y0, z0, x1, y1, z1, part = 'body', mat = 'canvas', lid = 'wood.dark' }) {
  c.part(part);
  c.box(x0, y0, z0, x1, y1, z1, mat);
  c.box(x0, y0, z1 - 1, x1, y1, z1, lid);
  const hy = Math.round((y0 + y1) / 2);
  c.box(x0 + 2, hy - 1, z1, x1 - 2, hy + 1, z1 + 1, 'steel.dark');   // strap
  for (let x = x0 + 6; x < x1 - 4; x += 16) {
    c.box(x, hy - 2, z1, x + 3, hy + 2, z1 + 2, 'steel');             // latches
  }
  c.rivets(x0 + 2, y0 + 1, z1 - 1, x1 - 2, y0 + 1, z1 - 1, 11, 'steel.dark');
  c.rivets(x0 + 2, y1 - 2, z1 - 1, x1 - 2, y1 - 2, z1 - 1, 11, 'steel.dark');
  c.part('body');
}

/** Circular hatch: coaming ring, lid, handle, hinge, periscope blocks. */
export function hatch(c, { cx, cy, z, r, part = 'body', dark = false }) {
  c.part(part);
  c.ringZ(cx, cy, z, z + 3, r + 2, r, dark ? 'steel.dark' : 'steel');
  c.cylZ(cx, cy, z + 3, z + 6, r, dark ? 'steel.dark' : 'steel');
  c.ringZ(cx, cy, z + 6, z + 8, r, r - 3, 'steel.bright');
  c.box(cx - r + 3, cy - 2, z + 8, cx + r - 3, cy + 2, z + 9, 'steel.bright'); // handle bar
  c.bolts(cx, cy, z + 6, r - 2, 10, 'steel.dark', 1);
  c.box(cx - r, cy + r - 4, z + 3, cx - r + 5, cy + r - 1, z + 6, 'steel.dark'); // hinge
  c.part('body');
}

/** Vision block / periscope: recessed glass in a steel frame. */
export function periscope(c, { x, y, z, w = 5, h = 4, part = 'body' }) {
  c.part(part);
  c.box(x, y, z, x + w, y + 3, z + h, 'steel.dark');
  c.box(x + w, y + 1, z + 1, x + w + 1, y + 2, z + h - 1, 'glass');
  c.part('body');
}

/** Whip antenna with a tapered rod and a base insulator. */
export function antenna(c, { x, y, z, height, part = 'body' }) {
  c.part(part);
  c.cylZ(x, y, z, z + 6, 4, 'steel.dark');
  c.coneZ(x, y, z + 6, z + height, 2, 0.6, 'steel.bright');
  c.part('body');
}

/** Smoke-grenade launcher bank (three tubes on a rail). */
export function smokeBank(c, { x, y, z, dx, dy, part = 'turret' }) {
  c.part(part);
  for (let i = 0; i < 3; i++) {
    const cx = x + dx * i, cy = y + dy * i;
    c.cylX(cx, cx + 12, cy, z, 4, 'steel.dark');
    c.cylX(cx + 12, cx + 13, cy, z, 3.4, 'gunmetal');
  }
  c.box(x - 3, y - 3, z - 4, x + dx * 2 + 12, y + dy * 2 + 3, z - 2, 'steel.dark');
  c.part('body');
}

/** Caged bustle rack with visible bars (no solid mass). */
export function basketRack(c, { x0, x1, y0, y1, z0, z1, part = 'turret' }) {
  c.part(part);
  const bar = 2;
  // Vertical corner posts.
  for (const [x, y] of [[x0, y0], [x1 - bar, y0], [x0, y1 - bar], [x1 - bar, y1 - bar]]) {
    c.box(x, y, z0, x + bar, y + bar, z1, 'steel.dark');
  }
  // Mid-height and top rails.
  for (const z of [z0 + 4, z1 - bar]) {
    c.box(x0, y0, z, x1, y0 + bar, z + bar, 'steel.dark');
    c.box(x0, y1 - bar, z, x1, y1, z + bar, 'steel.dark');
    c.box(x0, y0, z, x0 + bar, y1, z + bar, 'steel.dark');
    c.box(x1 - bar, y0, z, x1, y1, z + bar, 'steel.dark');
  }
  // Floor mesh.
  for (let x = x0; x < x1; x += 12) c.box(x, y0, z0, x + bar, y1, z0 + bar, 'steel.dark');
  c.part('body');
}

/** Wire/cable routed along a path. */
export function cable(c, points, mat = 'steel.dark', part = 'body') {
  c.part(part);
  for (let i = 0; i < points.length - 1; i++) {
    const [a, b] = [points[i], points[i + 1]];
    c.line(a[0], a[1], a[2], b[0], b[1], b[2], mat);
  }
  c.part('body');
}

/** Sandbag stack (used by emplacements and trench lines). */
export function sandbags(c, { x0, x1, y0, z0, rows = 3, part = 'body' }) {
  c.part(part);
  for (let r = 0; r < rows; r++) {
    const z = z0 + r * 7;
    for (let x = x0; x < x1; x += 16) {
      const off = r % 2 ? 8 : 0;
      c.box(x + off, y0 - 7, z, Math.min(x + off + 15, x1), y0 + 7, z + 6, 'sandbag');
    }
  }
  c.part('body');
}

/** Riveted armour plate seam: a raised strip plus evenly spaced rivets. */
export function seam(c, { x0, y0, z0, x1, y1, z1, spacing = 12, mat = 'steel.dark' }) {
  c.line(x0, y0, z0, x1, y1, z1, mat);
  const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
  const n = Math.max(1, Math.floor(len / spacing));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = Math.round(x0 + (x1 - x0) * t);
    const y = Math.round(y0 + (y1 - y0) * t);
    const z = Math.round(z0 + (z1 - z0) * t);
    c.box(x, y, z, x + 2, y + 2, z + 2, 'steel');
  }
}

/** Lifting eye / tow hook. */
export function liftingEye(c, { x, y, z, part = 'body' }) {
  c.part(part);
  c.box(x, y, z, x + 6, y + 10, z + 3, 'steel.dark');
  c.box(x + 1, y + 3, z + 3, x + 5, y + 7, z + 8, 'steel.dark');
  c.box(x + 2, y + 4, z + 4, x + 4, y + 6, z + 7, 'steel');
  c.part('body');
}
