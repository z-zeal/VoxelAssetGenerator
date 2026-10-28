/**
 * Architectural sub-assemblies for 512³-native buildings.
 *
 * A building occupies its whole tile: the footprint spans the full 512 lattice
 * (≈460 voxels of usable ground after the kerb), which is exactly why the
 * runtime scale has to put 512 voxels on a 64×32 diamond — otherwise a
 * structure cannot sit inside its own tile.
 *
 * No dimension here is derived from the retired 64³ models.
 */

/** Plinth + kerb so nothing floats and the tile edge reads. */
export function foundation(c, { x0, x1, y0, y1, z = 0, height = 14, part = 'body' }) {
  c.part(part);
  c.box(x0 - 10, y0 - 10, z, x1 + 10, y1 + 10, z + height, 'concrete.dark');
  c.box(x0 - 4, y0 - 4, z + height, x1 + 4, y1 + 4, z + height + 6, 'concrete');
  c.rivets(x0, y0 - 6, z + height + 2, x1, y0 - 6, z + height + 2, 34, 'concrete.lit');
  c.rivets(x0, y1 + 6, z + height + 2, x1, y1 + 6, z + height + 2, 34, 'concrete.lit');
  c.part('body');
}

/**
 * The workhorse mass for any structure.
 *
 * `solid: true` (the default) fills the block: the occupancy cull then keeps
 * only the outer skin, which is *cheaper* than a hollow shell — a shell keeps
 * its interior faces too (~2× the voxels for an empty room nobody can enter).
 * Pass `solid: false` only when the interior really is visible.
 */
export function walls(c, { x0, x1, y0, y1, z0, z1, thick = 10, mat = 'concrete', part = 'body', solid = true }) {
  c.part(part);
  if (solid) {
    c.box(x0, y0, z0, x1, y1, z1, mat);
  } else {
    c.box(x0, y0, z0, x1, y1, z0 + 6, mat);                      // floor
    c.box(x0, y0, z0, x1, y0 + thick, z1, mat);                  // -Y wall
    c.box(x0, y1 - thick, z0, x1, y1, z1, mat);                  // +Y wall
    c.box(x0, y0 + thick, z0, x0 + thick, y1 - thick, z1, mat);  // -X wall
    c.box(x1 - thick, y0 + thick, z0, x1, y1 - thick, z1, mat);  // +X wall
  }
  // Cornice.
  c.box(x0 - 4, y0 - 4, z1 - 8, x1 + 4, y1 + 4, z1, mat);
  c.part('body');
}

/** Window: recessed glass, frame, sill and a stone lintel. */
export function window_(c, { x, y, z, w = 34, h = 30, side = '+y', part = 'body', lit = false }) {
  c.part(part);
  const g = lit ? 'lamp.warm' : 'glass';
  if (side === '+y') {
    c.clear(x, y - 6, z, x + w, y + 4, z + h);
    c.box(x - 4, y - 6, z - 5, x + w + 4, y + 2, z, 'concrete.lit');      // sill
    c.box(x - 4, y - 6, z + h, x + w + 4, y + 2, z + h + 5, 'concrete.dark'); // lintel
    c.box(x, y - 4, z, x + w, y - 2, z + h, g);
    c.box(x + w / 2 - 2, y - 5, z, x + w / 2 + 2, y - 2, z + h, 'steel.dark'); // mullion
    if (lit) c.box(x + 6, y - 5, z + h / 2 + 6, x + w - 6, y - 4, z + h - 6, 'lamp.warm');
  } else if (side === '-y') {
    c.clear(x, y - 4, z, x + w, y + 6, z + h);
    c.box(x - 4, y - 2, z - 5, x + w + 4, y + 6, z, 'concrete.lit');
    c.box(x - 4, y - 2, z + h, x + w + 4, y + 6, z + h + 5, 'concrete.dark');
    c.box(x, y + 2, z, x + w, y + 4, z + h, g);
    c.box(x + w / 2 - 2, y + 2, z, x + w / 2 + 2, y + 5, z + h, 'steel.dark');
    if (lit) c.box(x + 6, y + 4, z + h / 2 + 6, x + w - 6, y + 5, z + h - 6, 'lamp.warm');
  } else if (side === '+x') {
    c.clear(x - 4, y, z, x + 6, y + w, z + h);
    c.box(x - 2, y - 4, z - 5, x + 6, y + w + 4, z, 'concrete.lit');
    c.box(x - 2, y - 4, z + h, x + 6, y + w + 4, z + h + 5, 'concrete.dark');
    c.box(x + 2, y, z, x + 4, y + w, z + h, g);
    c.box(x + 2, y + w / 2 - 2, z, x + 5, y + w / 2 + 2, z + h, 'steel.dark');
    if (lit) c.box(x + 4, y + 6, z + h / 2 + 6, x + 5, y + w - 6, z + h - 6, 'lamp.warm');
  } else {
    c.clear(x - 6, y, z, x + 4, y + w, z + h);
    c.box(x - 6, y - 4, z - 5, x + 2, y + w + 4, z, 'concrete.lit');
    c.box(x - 6, y - 4, z + h, x + 2, y + w + 4, z + h + 5, 'concrete.dark');
    c.box(x - 4, y, z, x - 2, y + w, z + h, g);
    c.box(x - 5, y + w / 2 - 2, z, x - 2, y + w / 2 + 2, z + h, 'steel.dark');
    if (lit) c.box(x - 5, y + 6, z + h / 2 + 6, x - 4, y + w - 6, z + h - 6, 'lamp.warm');
  }
  c.part('body');
}

/** Door opening with a frame, threshold and a team-coloured lintel. */
export function doorway(c, { x, y, z, w = 60, h = 92, side = '+x', part = 'body' }) {
  c.part(part);
  if (side === '+x') {
    c.clear(x - 8, y, z, x + 12, y + w, z + h);
    c.box(x + 2, y - 6, z, x + 10, y, z + h + 8, 'concrete.dark');
    c.box(x + 2, y + w, z, x + 10, y + w + 6, z + h + 8, 'concrete.dark');
    c.box(x + 2, y - 6, z + h, x + 10, y + w + 6, z + h + 10, 'roof');
    c.box(x + 4, y + 2, z, x + 8, y + w - 2, z + h - 2, 'wood.dark');    // doors
    c.box(x + 8, y + w / 2 - 2, z, x + 9, y + w / 2 + 2, z + h - 8, 'steel.dark');
    c.box(x + 10, y + 4, z + h / 2, x + 12, y + 8, z + h / 2 + 16, 'lamp.warm');
  } else {
    c.clear(x - 12, y, z, x + 8, y + w, z + h);
    c.box(x - 10, y - 6, z, x - 2, y, z + h + 8, 'concrete.dark');
    c.box(x - 10, y + w, z, x - 2, y + w + 6, z + h + 8, 'concrete.dark');
    c.box(x - 10, y - 6, z + h, x - 2, y + w + 6, z + h + 10, 'roof');
    c.box(x - 8, y + 2, z, x - 4, y + w - 2, z + h - 2, 'wood.dark');
    c.box(x - 12, y + 4, z + h / 2, x - 10, y + 8, z + h / 2 + 16, 'lamp.warm');
  }
  c.part('body');
}

/** Gable roof over [x0..x1] × [y0..y1], ridge running along X. */
export function gableRoof(c, { x0, x1, y0, y1, z, rise = 90, mat = 'roof', part = 'body' }) {
  c.part(part);
  const mid = (y0 + y1) / 2;
  const half = (y1 - y0) / 2;
  for (let y = y0; y < y1; y++) {
    const d = Math.abs(y - mid) / half;
    const top = Math.round(z + (1 - d) * rise);
    c.box(x0 - 8, y, z, x1 + 8, y + 1, top, mat);
    // Eaves板 and a ridge highlight.
    if (y < y0 + 6 || y > y1 - 7) c.box(x0 - 14, y, z - 6, x1 + 14, y + 1, z + 4, 'roof.dark');
  }
  c.box(x0 - 10, Math.round(mid) - 4, z + rise - 6, x1 + 10, Math.round(mid) + 4, z + rise, 'roof.light');
  c.part('body');
}

/** Flat roof with parapet, roof access hatch and drainage scuppers. */
export function flatRoof(c, { x0, x1, y0, y1, z, parapet = 26, part = 'body' }) {
  c.part(part);
  c.box(x0, y0, z, x1, y1, z + 6, 'concrete.dark');
  // Parapet.
  c.box(x0, y0, z, x1, y0 + 12, z + parapet, 'concrete');
  c.box(x0, y1 - 12, z, x1, y1, z + parapet, 'concrete');
  c.box(x0, y0, z, x0 + 12, y1, z + parapet, 'concrete');
  c.box(x1 - 12, y0, z, x1, y1, z + parapet, 'concrete');
  for (let x = x0 + 40; x < x1 - 40; x += 80) {
    c.box(x, y0 + 4, z + parapet - 10, x + 16, y0 + 12, z + parapet - 4, 'steel.dark'); // scupper
  }
  c.part('body');
}

/** Flagpole with a team-coloured pennant (its own part so it can wave). */
export function flagpole(c, { x, y, z, height = 150, part = 'flag' }) {
  c.part(part);
  c.cylZ(x, y, z, z + 8, 12, 'concrete.dark');
  c.cylZ(x, y, z + 8, z + height, 4, 'steel.bright');
  c.sphere(x, y, z + height, 7, 'brass');
  for (let i = 0; i < 34; i++) {
    const w = Math.round(46 - i * 0.5);
    c.box(x + 2, y, z + height - 46 + i, x + 2 + w, y + 2, z + height - 45 + i, 'team.hull');
    if (i % 11 === 0) c.box(x + 2, y, z + height - 46 + i, x + 2 + w, y + 2, z + height - 41 + i, 'team.accent');
  }
  c.part('body');
}

/** Sandbag emplacement ring (defensive structures). */
export function sandbagRing(c, { x, y, r, z = 0, rows = 3, part = 'body' }) {
  c.part(part);
  for (let row = 0; row < rows; row++) {
    const rr = r - row * 6;
    const zz = z + row * 9;
    const n = Math.round((2 * Math.PI * rr) / 18);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const bx = Math.round(x + Math.cos(a) * rr);
      const by = Math.round(y + Math.sin(a) * rr);
      c.box(bx - 8, by - 6, zz, bx + 8, by + 6, zz + 8, 'sandbag');
      c.box(bx - 8, by - 6, zz + 8, bx + 8, by + 6, zz + 9, 'concrete.dark');
    }
  }
  c.part('body');
}

/** Exterior steps up to a threshold. */
export function steps(c, { x, y, z, w = 80, depth = 40, rise = 8, count = 4, side = '+x', part = 'body' }) {
  c.part(part);
  for (let i = 0; i < count; i++) {
    const h = z - i * rise;
    if (side === '+x') c.box(x + i * (depth / count), y, h - rise, x + depth, y + w, h, 'concrete');
    else c.box(x - depth + (count - i) * (depth / count), y, h - rise, x - i * (depth / count), y + w, h, 'concrete');
  }
  c.part('body');
}

/** Wall-mounted lamp on a bracket. */
export function wallLamp(c, { x, y, z, side = '+x', part = 'body' }) {
  c.part(part);
  if (side === '+x') {
    c.box(x, y, z, x + 14, y + 4, z + 4, 'steel.dark');
    c.box(x + 14, y - 6, z - 10, x + 22, y + 10, z + 4, 'steel.dark');
    c.box(x + 16, y - 4, z - 16, x + 22, y + 8, z - 8, 'lamp.warm');
  } else {
    c.box(x - 14, y, z, x, y + 4, z + 4, 'steel.dark');
    c.box(x - 22, y - 6, z - 10, x - 14, y + 10, z + 4, 'steel.dark');
    c.box(x - 22, y - 4, z - 16, x - 16, y + 8, z - 8, 'lamp.warm');
  }
  c.part('body');
}

/** Vent stack / chimney with a cap. */
export function ventStack(c, { x, y, z, r = 14, height = 60, part = 'body' }) {
  c.part(part);
  c.cylZ(x, y, z, z + height, r, 'concrete.dark');
  c.cylZ(x, y, z + height, z + height + 6, r + 4, 'steel.dark');
  c.cylZ(x, y, z + height + 6, z + height + 10, r - 3, 'scorch');
  c.part('body');
}
