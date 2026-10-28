/**
 * Scribe — the 512³ native voxel canvas.
 *
 * Design rules enforced here (see docs/PLAN_512_native_16dir_segmented_pipeline.md):
 *
 *  * The canvas is exactly 512×512×512 design voxels. It is never scaled: the
 *    integer lattice *is* the authoring resolution, so a rivet is a rivet, not
 *    a "detail blob" produced by enlarging a 64³ model.
 *  * X is forward (a model's canonical facing is +X), Y is lateral (256 is the
 *    centre line), Z is up (0 is the ground plane).
 *  * Every voxel carries a material id and a part id. Parts are the unit of
 *    segmentation: the baker emits one sprite strip per part so a turret can
 *    rotate independently of its hull at runtime.
 *  * Geometry is deterministic: no Math.random anywhere; mottling and wear use
 *    a seeded mulberry32 so re-bakes are byte-identical.
 *
 * Nothing in this module knows about sprites, cameras, PNGs or armies. It only
 * produces voxels.
 */

export const CANVAS = 512;

/** mulberry32 — deterministic PRNG shared by every stochastic detail pass. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Compressed sparse voxel map: 9 bits per axis, 18 bits per record. */
const key = (x, y, z) => (x << 18) | (y << 9) | z;

export function createScribe({ materialIds, canvas = CANVAS } = {}) {
  if (!materialIds) throw new Error('createScribe needs a material id table');
  const cells = new Map();          // key -> (matId << 6) | partId
  const partList = [];              // [{name, order, pivot, dynamic, hideIn]} 
  const partIndex = new Map();
  const pivots = {};
  let current = 0;

  const partId = name => {
    if (!name) return 0;
    let id = partIndex.get(name);
    if (id === undefined) {
      id = partList.length + 1;
      partIndex.set(name, id);
      partList.push({ name, order: id - 1, pivot: [canvas / 2, canvas / 2, 0], dynamic: false, hidden: false });
    }
    return id;
  };
  partId('body');

  const inBounds = (x, y, z) => x >= 0 && x < canvas && y >= 0 && y < canvas && z >= 0 && z < canvas;

  const api = {
    canvas,
    cells,
    parts: partList,

    /** Switch the active part. All following geometry belongs to it. */
    part(name) { current = partId(name); return api; },
    /** Mark the current (or named) part as mechanically independent. */
    dynamic(name, on = true) {
      const p = partList[partId(name ?? partList[current - 1]?.name) - 1];
      if (p) p.dynamic = on;
      return api;
    },
    /** Rotation/translation pivot in design voxels (x, y, z). */
    pivot(name, [px, py, pz = 0]) {
      const id = partId(name);
      pivots[name] = [px, py, pz];
      partList[id - 1].pivot = [px, py, pz];
      return api;
    },
    pivotOf(name) { return pivots[name] ?? null; },

    matId(name) {
      const id = materialIds[name];
      if (id === undefined) throw new Error(`unknown material "${name}"`);
      return id;
    },

    put(x, y, z, mat) {
      const xi = Math.round(x), yi = Math.round(y), zi = Math.round(z);
      if (!inBounds(xi, yi, zi)) return api;
      cells.set(key(xi, yi, zi), (api.matId(mat) << 6) | current);
      return api;
    },
    del(x, y, z) {
      cells.delete(key(Math.round(x), Math.round(y), Math.round(z)));
      return api;
    },
    has(x, y, z) { return cells.has(key(Math.round(x), Math.round(y), Math.round(z))); },
    get(x, y, z) {
      const v = cells.get(key(Math.round(x), Math.round(y), Math.round(z)));
      return v === undefined ? null : { mat: v >> 6, part: v & 63 };
    },

    /** Inclusive-lower / exclusive-upper box, the workhorse primitive. */
    box(x0, y0, z0, x1, y1, z1, mat) {
      const [ax, bx] = x0 <= x1 ? [x0, x1] : [x1, x0];
      const [ay, by] = y0 <= y1 ? [y0, y1] : [y1, y0];
      const [az, bz] = z0 <= z1 ? [z0, z1] : [z1, z0];
      for (let z = Math.round(az); z < Math.round(bz); z++)
        for (let y = Math.round(ay); y < Math.round(by); y++)
          for (let x = Math.round(ax); x < Math.round(bx); x++) api.put(x, y, z, mat);
      return api;
    },
    /** Centred box: centre + full size. */
    boxC(cx, cy, cz, sx, sy, sz, mat) {
      return api.box(cx - sx / 2, cy - sy / 2, cz - sz / 2, cx + sx / 2, cy + sy / 2, cz + sz / 2, mat);
    },
    /** Six walls only — big masses stay light in the bake. */
    shell(x0, y0, z0, x1, y1, z1, mat) {
      const [ax, bx] = [Math.round(x0), Math.round(x1)];
      const [ay, by] = [Math.round(y0), Math.round(y1)];
      const [az, bz] = [Math.round(z0), Math.round(z1)];
      for (let z = az; z < bz; z++)
        for (let y = ay; y < by; y++)
          for (let x = ax; x < bx; x++) {
            if (x === ax || x === bx - 1 || y === ay || y === by - 1 || z === az || z === bz - 1) {
              api.put(x, y, z, mat);
            }
          }
      return api;
    },
    clear(x0, y0, z0, x1, y1, z1) {
      for (let z = Math.round(z0); z < Math.round(z1); z++)
        for (let y = Math.round(y0); y < Math.round(y1); y++)
          for (let x = Math.round(x0); x < Math.round(x1); x++) api.del(x, y, z);
      return api;
    },

    /** Vertical cylinder / wheel disc (axis +Z). */
    cylZ(cx, cy, z0, z1, r, mat, { hollowR = 0 } = {}) {
      const r2 = r * r;
      for (let z = Math.round(z0); z < Math.round(z1); z++)
        for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
          for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
            const d2 = (x - cx) ** 2 + (y - cy) ** 2;
            if (d2 <= r2 && d2 >= hollowR * hollowR) api.put(x, y, z, mat);
          }
      return api;
    },
    /** Cylinder along X (barrels, axles, pipes). */
    cylX(x0, x1, cy, cz, r, mat, { hollowR = 0 } = {}) {
      const r2 = r * r;
      for (let x = Math.round(x0); x < Math.round(x1); x++)
        for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++)
          for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
            const d2 = (y - cy) ** 2 + (z - cz) ** 2;
            if (d2 <= r2 && d2 >= hollowR * hollowR) api.put(x, y, z, mat);
          }
      return api;
    },
    /** Cylinder along Y (road wheels, rollers, boat masts lying sideways). */
    cylY(cx, y0, y1, cz, r, mat, { hollowR = 0 } = {}) {
      const r2 = r * r;
      for (let y = Math.round(y0); y < Math.round(y1); y++)
        for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++)
          for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
            const d2 = (x - cx) ** 2 + (z - cz) ** 2;
            if (d2 <= r2 && d2 >= hollowR * hollowR) api.put(x, y, z, mat);
          }
      return api;
    },
    sphere(cx, cy, cz, r, mat, { top = false, bottom = false } = {}) {
      const r2 = r * r;
      for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) {
        if (top && z < cz) continue;
        if (bottom && z > cz) continue;
        for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
          for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
            if ((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2 <= r2) api.put(x, y, z, mat);
      }
      return api;
    },
    /** Truncated cone along Z (masts, turret cones, funnels, tree trunks). */
    coneZ(cx, cy, z0, z1, r0, r1, mat) {
      const zs = Math.round(z0), ze = Math.round(z1);
      for (let z = zs; z < ze; z++) {
        const t = ze - zs <= 1 ? 0 : (z - zs) / (ze - zs - 1);
        const r = r0 + (r1 - r0) * t;
        api.cylZ(cx, cy, z, z + 1, r, mat);
      }
      return api;
    },
    /** Sloped armour / ramp rising along +X. */
    rampX(x0, x1, y0, y1, z0, rise, run, mat) {
      for (let x = Math.round(x0); x < Math.round(x1); x++) {
        const z = z0 + Math.floor(((x - x0) * rise) / run);
        api.box(x, y0, z0, x + 1, y1, z + 1, mat);
      }
      return api;
    },
    /** Wedge rising along +Y (boat bows, wing roots, sloped roofs). */
    rampY(x0, x1, y0, y1, z0, rise, run, mat) {
      for (let y = Math.round(y0); y < Math.round(y1); y++) {
        const z = z0 + Math.floor(((y - y0) * rise) / run);
        api.box(x0, y, z0, x1, y + 1, z + 1, mat);
      }
      return api;
    },
    /** Thin ring (turret ring, hatch rim, hatch coaming, tyre sidewall). */
    ringZ(cx, cy, z0, z1, rOuter, rInner, mat) {
      return api.cylZ(cx, cy, z0, z1, rOuter, mat, { hollowR: rInner });
    },

    /** 3D line (Bresenham) — panel gaps, weld seams, cables, antenna wires. */
    line(x0, y0, z0, x1, y1, z1, mat, { thickness = 0 } = {}) {
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
      for (let i = 0; i <= steps; i++) {
        const t = steps === 0 ? 0 : i / steps;
        const x = Math.round(x0 + (x1 - x0) * t);
        const y = Math.round(y0 + (y1 - y0) * t);
        const z = Math.round(z0 + (z1 - z0) * t);
        if (thickness <= 0) api.put(x, y, z, mat);
        else api.box(x, y, z, x + thickness, y + thickness, z + thickness, mat);
      }
      return api;
    },
    /** Ring of bolts for hubs, hatches, sprockets, structural joints. */
    bolts(cx, cy, z, radius, count, mat, size = 1) {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const bx = Math.round(cx + Math.cos(a) * radius);
        const by = Math.round(cy + Math.sin(a) * radius);
        api.box(bx, by, z, bx + size, by + size, z + size, mat);
      }
      return api;
    },
    /** Evenly spaced rivets along a straight run (hull seams, armour joints). */
    rivets(x0, y0, z0, x1, y1, z1, spacing, mat, size = 1) {
      const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
      const n = Math.max(1, Math.round(len / spacing));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const x = Math.round(x0 + (x1 - x0) * t);
        const y = Math.round(y0 + (y1 - y0) * t);
        const z = Math.round(z0 + (z1 - z0) * t);
        api.box(x, y, z, x + size, y + size, z + size, mat);
      }
      return api;
    },
    /** Louvred vent grille lying in the XY plane. */
    grille(x0, x1, y0, y1, z, step, mat, matGap) {
      for (let y = Math.round(y0); y < Math.round(y1); y++) {
        const m = (y - Math.round(y0)) % step === 0 ? mat : matGap;
        api.box(x0, y, z, x1, y + 1, z + 1, m);
      }
      return api;
    },
    /** Repaint voxels matching a predicate (decals, wear, insignia). */
    paint(pred, mat, part = null) {
      for (const [k, v] of cells) {
        const x = (k >> 18) & 511, y = (k >> 9) & 511, z = k & 511;
        if (part !== null && (v & 63) !== part) continue;
        if (pred(x, y, z, v >> 6, v & 63)) {
          const matId = api.matId(mat);
          cells.set(k, (matId << 6) | (v & 63));
        }
      }
      return api;
    },
    /** Move matching voxels into another part (re-tagging after assembly). */
    regroup(pred, name) {
      const id = partId(name);
      for (const [k, v] of cells) {
        const x = (k >> 18) & 511, y = (k >> 9) & 511, z = k & 511;
        if (pred(x, y, z, v >> 6, v & 63)) cells.set(k, ((v >> 6) << 6) | id);
      }
      return api;
    },
    /** Duplicate a part across the Y centre line (mirrors geometry, keeps parts). */
    mirrorY(partName, centreY = canvas / 2) {
      const id = partId(partName);
      const copies = [];
      for (const [k, v] of cells) {
        if ((v & 63) !== id) continue;
        const x = (k >> 18) & 511, y = (k >> 9) & 511, z = k & 511;
        copies.push([x, 2 * centreY - 1 - y, z, v]);
      }
      for (const [x, y, z, v] of copies) {
        if (inBounds(x, y, z)) cells.set(key(x, y, z), v);
      }
      return api;
    },
    /** Surface mottling (camouflage, weathering). Only repaints exposed faces. */
    mottle(seed, mats, density, { zMax = canvas } = {}) {
      const r = rng(seed);
      const exposed = [];
      for (const [k, v] of cells) {
        const x = (k >> 18) & 511, y = (k >> 9) & 511, z = k & 511;
        if (z > zMax) continue;
        if (!cells.has(key(x, y, z + 1))) exposed.push([k, x, y, z, v]);
      }
      for (const [k, x, y, z, v] of exposed) {
        // Cheap value-noise blob: hash with two frequencies plus the seed.
        const n = Math.sin(x * 0.11 + seed) * Math.cos(y * 0.13 - seed * 0.7) + Math.sin(z * 0.09);
        if (n * 0.5 + r() * 0.5 > 1 - density) {
          const pick = mats[Math.floor(r() * mats.length) % mats.length];
          cells.set(k, (api.matId(pick) << 6) | (v & 63));
        }
      }
      return api;
    },
    /** Edge wear: brighten voxels on convex corners (reads as chipped paint). */
    wear(seed, mat, { rate = 0.18 } = {}) {
      const r = rng(seed);
      for (const [k, v] of [...cells]) {
        const x = (k >> 18) & 511, y = (k >> 9) & 511, z = k & 511;
        let exposed = 0;
        if (!cells.has(key(x + 1, y, z))) exposed++;
        if (!cells.has(key(x - 1, y, z))) exposed++;
        if (!cells.has(key(x, y + 1, z))) exposed++;
        if (!cells.has(key(x, y - 1, z))) exposed++;
        if (!cells.has(key(x, y, z + 1))) exposed++;
        if (exposed >= 3 && r() < rate) cells.set(k, (api.matId(mat) << 6) | (v & 63));
      }
      return api;
    },

    /** Remove voxels no iso facing can see (interior fill), keeping surfaces. */
    cull() {
      for (const [k] of [...cells]) {
        const x = (k >> 18) & 511, y = (k >> 9) & 511, z = k & 511;
        if (cells.has(key(x + 1, y, z)) && cells.has(key(x - 1, y, z))
          && cells.has(key(x, y + 1, z)) && cells.has(key(x, y - 1, z))
          && cells.has(key(x, y, z + 1)) && cells.has(key(x, y, z - 1))) {
          cells.delete(k);
        }
      }
      return api;
    },

    /** Immutable geometry snapshot: parts with their voxels, bounds and pivots. */
    finish({ cull = true } = {}) {
      if (cull) api.cull();
      const byPart = new Map();
      for (const [k, v] of cells) {
        const x = (k >> 18) & 511, y = (k >> 9) & 511, z = k & 511;
        const pid = v & 63;
        if (!byPart.has(pid)) byPart.set(pid, []);
        byPart.get(pid).push([x, y, z, v >> 6]);
      }
      const parts = [];
      for (const p of partList) {
        const id = partIndex.get(p.name);
        const voxels = byPart.get(id) ?? [];
        if (!voxels.length) continue;
        parts.push({
          name: p.name,
          order: parts.length,
          voxels,
          pivot: p.pivot,
          dynamic: p.dynamic,
          bounds: boundsOf(voxels),
        });
      }
      // Body first, then parts by declaration order.
      parts.sort((a, b) => (a.name === 'body' ? -1 : b.name === 'body' ? 1 : a.order - b.order));
      parts.forEach((p, i) => { p.order = i; });
      return { parts, size: canvas, totalVoxels: cells.size };
    },
  };
  return api;
}

export function boundsOf(voxels) {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const [x, y, z] of voxels) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }
  return { minX, minY, minZ, maxX, maxY, maxZ };
}
