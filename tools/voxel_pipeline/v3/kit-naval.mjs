/**
 * Naval kit — hulls and the deck furniture that makes a ship readable.
 *
 * A ship is the hardest thing in this pipeline to read at sprite scale, because
 * almost all of its volume is a smooth slab. What carries the read instead:
 *
 *   * the **boot stripe** at the waterline — one colour change that separates the
 *     hull from the sea and gives the sprite a bottom edge;
 *   * the **deck silhouette** — superstructure, funnel, mast and gun mounts in
 *     profile. A bare hull is a barge at 8×, whatever the hull lines are;
 *   * **railings** — a one-voxel line along the deck edge. It is nearly free and
 *     it is what stops the deck reading as a cut-off slab.
 *
 * Everything here takes explicit stations/boxes; nothing guesses at a ship's
 * proportions, because "one hull shape for all eleven vessels" is how a navy
 * ends up looking like one boat eleven times.
 */

/**
 * Lofted hull from stations of `[x, halfWidth, keelZ, deckZ]`.
 *
 * The cross-section narrows toward the keel (a ship is not a box in section),
 * and the `boot` colour is applied in a band around `waterline` so the sprite
 * gets the one horizontal line that every ship sprite needs.
 */
export function hull(c, {
  stations, mat = 'team.hull', boot = 'team.dark', part = 'body',
  waterline = 26, bootBand = 7, keelRatio = 0.34, flare = 0.5,
}) {
  c.part(part);
  for (let i = 0; i < stations.length; i++) {
    const [x, halfW, keelZ, deckZ] = stations[i];
    const next = stations[i + 1];
    const xEnd = next ? next[0] : x;
    for (let px = x; px < Math.max(x + 1, xEnd); px++) {
      // Interpolate the section between this station and the next, so a
      // four-station hull is still a smooth curve rather than four slabs.
      const t = next ? (px - x) / Math.max(1, xEnd - x) : 0;
      const hw = next ? halfW + (next[1] - halfW) * t : halfW;
      const kz = next ? keelZ + (next[2] - keelZ) * t : keelZ;
      const dz = next ? deckZ + (next[3] - deckZ) * t : deckZ;
      const h = Math.max(1, dz - kz);
      for (let z = Math.round(kz); z <= Math.round(dz); z++) {
        const v = (z - kz) / h;                             // 0 at keel, 1 at deck
        // A hull is slack at the waterline and fine at the keel; `flare` pulls
        // the topsides out so the deck is the widest part.
        const w = Math.round(hw * (keelRatio + (1 - keelRatio) * Math.pow(v, flare)));
        if (w < 1) continue;
        const m = Math.abs(z - waterline) <= bootBand ? boot : mat;
        c.box(px, 256 - w, z, px + 1, 256 + w, z + 1, m);
      }
    }
  }
  c.part('body');
  return c;
}

/** Superstructure block with a window band, the bridge on top of it. */
export function deckHouse(c, {
  x0, x1, halfW, z0, z1, cy = 256, mat = 'team.light', winMat = 'glass.dark',
  winZ = null, part = 'body', taper = 0,
}) {
  c.part(part);
  for (let x = x0; x < x1; x++) {
    const t = (x - x0) / Math.max(1, x1 - x0);
    const w = Math.round(halfW * (1 - taper * t));
    c.box(x, cy - w, z0, x + 1, cy + w, z1, mat);
    // Window band one voxel proud of the face, broken every 9 for a frame.
    if (winZ !== null && (x - x0) % 9 < 7) {
      for (const s of [-1, 1]) {
        const y = cy + s * w;
        c.box(x, Math.min(y, y + s * 2), winZ, x + 1, Math.max(y, y + s * 2), winZ + 7, winMat);
      }
    }
  }
  c.part('body');
  return c;
}

/** Funnel: a raked block with a dark uptake mouth. */
export function funnel(c, { x, cy = 256, halfW = 16, len = 26, z0, z1, rake = 6, part = 'body', mat = 'team.dark' }) {
  c.part(part);
  for (let i = 0; i <= z1 - z0; i++) {
    const z = z0 + i;
    const off = -Math.round((rake * i) / Math.max(1, z1 - z0));
    const w = Math.round(halfW * (1 - 0.18 * (i / Math.max(1, z1 - z0))));
    c.box(x + off, cy - w, z, x + off + len, cy + w, z + 1, mat);
  }
  c.box(x - rake, cy - Math.round(halfW * 0.8), z1, x - rake + Math.round(len * 0.55), cy + Math.round(halfW * 0.8), z1 + 3, 'iron');
  c.part('body');
  return c;
}

/** Lattice mast with yardarms and a radar bar. */
export function mast(c, { x, cy = 256, z0, z1, spread = 9, yards = 2, part = 'body' }) {
  c.part(part);
  c.box(x - 2, cy - 2, z0, x + 3, cy + 3, z1, 'steel.dark');
  for (let i = 0; i < yards; i++) {
    const z = z0 + Math.round((z1 - z0) * (0.55 + i * 0.22));
    const s = Math.round(spread * (1 - i * 0.3));
    c.box(x - 1, cy - s, z, x + 2, cy + s, z + 2, 'steel.dark');
  }
  c.box(x - 1, cy - Math.round(spread * 0.7), z1, x + 2, cy + Math.round(spread * 0.7), z1 + 3, 'steel.bright');
  c.part('body');
  return c;
}

/**
 * Deck gun mount: barbette, sloped turret face, and a barrel on `dir`.
 *
 * `dir` is the direction the barrel points along X (+1 forward, -1 aft), and the
 * whole thing is a candidate for its own traversing part on a warship.
 */
export function gunMount(c, {
  x, cy = 256, z, r = 16, barrel = 46, dir = 1, elevate = 0, part = 'body',
  mat = 'team.hull', barrelMat = 'steel.dark', muzzle = true,
}) {
  c.part(part);
  c.cylZ(x, cy, z, z + 6, Math.round(r * 0.92), 'team.dark');        // barbette
  c.cylZ(x, cy, z + 6, z + 12, r, mat);                              // turret body
  c.box(x - r, cy - Math.round(r * 0.55), z + 12, x + r, cy + Math.round(r * 0.55), z + 18, mat);
  const bx = x + dir * (r - 2);
  const bz = z + 14 + elevate;
  c.cylX(Math.min(bx, bx + dir * barrel), Math.max(bx, bx + dir * barrel), cy, bz, Math.max(3, Math.round(r * 0.22)), barrelMat);
  if (muzzle) {
    c.cylX(Math.min(bx + dir * barrel, bx + dir * (barrel + 6)), Math.max(bx + dir * barrel, bx + dir * (barrel + 6)), cy, bz, Math.max(4, Math.round(r * 0.3)), 'gunmetal');
  }
  c.part('body');
  return c;
}

/** Vertical launch cells: a grid of hatches, which is the modern warship read. */
export function vls(c, { x0, x1, cy = 256, halfW = 22, z, cols = 4, rows = 3, part = 'body' }) {
  c.part(part);
  const cw = Math.floor((x1 - x0) / cols);
  const ch = Math.floor((halfW * 2) / rows);
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = x0 + i * cw;
      const y = cy - halfW + j * ch;
      c.box(x + 1, y + 1, z, x + cw - 1, y + ch - 1, z + 2, 'steel.dark');
      c.box(x + 2, y + 2, z + 3, x + cw - 2, y + ch - 2, z + 4, 'gunmetal');
    }
  }
  c.part('body');
  return c;
}

/** Deck-edge railing: posts every `step` and a continuous top rail. */
export function rail(c, { x0, x1, cy = 256, halfW, z, step = 16, part = 'body', mat = 'steel.dark', sides = [-1, 1] }) {
  c.part(part);
  for (const s of sides) {
    const y = cy + s * halfW;
    c.box(x0, Math.min(y, y + s), z, x1, Math.max(y, y + s), z + 1, mat);
    for (let x = x0; x <= x1; x += step) {
      c.box(x, Math.min(y, y + s), z, x + 1, Math.max(y, y + s), z + 12, mat);
    }
  }
  c.part('body');
  return c;
}

/** Anchor chain and hawse: two voxel-wide detail forward, where every eye lands. */
export function anchor(c, { x, cy = 256, halfW, z0, z1, part = 'body' }) {
  c.part(part);
  for (const s of [-1, 1]) {
    const y = cy + s * (halfW - 2);
    c.box(x, Math.min(y, y + s * 2), z0, x + 3, Math.max(y, y + s * 2), z1, 'iron');
  }
  c.part('body');
  return c;
}
