/**
 * Scribe — the native voxel canvas (512³ by default).
 *
 * ## Why this is not a voxel Map any more
 *
 * A 512³ lattice is 134,217,728 cells. The pilot tank authored "the obvious
 * way" (solid `box()` calls) allocated **16.6 M** cells into a string-keyed Map:
 * 28 s to sculpt, and the interior cull never finished. The follow-up attempt
 * avoided that by shelling every big box, but a *stacked* stack of shells keeps
 * all its hidden inner faces (there is empty space between the shells, so the
 * cull cannot remove them) and still landed at 2.3 M cells.
 *
 * So the canvas now separates the two questions:
 *
 *   1. **Occupancy** — a flat bitset over all 512³ cells (16 MB, one bit each).
 *      `box()`, `cylX/Y/Z()`, `sphere()` and friends just set bits. Filling a
 *      5.8 M-cell hull volume costs 5.8 M bit sets (~40 ms), not 5.8 M Map
 *      entries (~7 GB of JS objects).
 *   2. **Appearance** — an ordered list of *paint operations* (volume + material
 *      + part). The material of a surface voxel is resolved lazily, at finish,
 *      from the last operation that covers it.
 *
 * `finish()` then walks the occupied bounding box once, keeps only cells with an
 * exposed face (the real outer skin, ~200 k for a tank) and resolves each one's
 * material from the operation list. Nothing is scaled, resampled, or inherited
 * from the 64³ era: the lattice is the model.
 *
 * Determinism: no Math.random anywhere; all noise is seeded mulberry32.
 */

/** Canvas edge in design voxels (spec 512; override for experiments). */
export const CANVAS = Number(process.env.VOXEL_CANVAS ?? 512);

/** Soft authoring budget for surface voxels; validator warns, then fails at 2×. */
export const SURFACE_BUDGET = Number(process.env.VOXEL_BUDGET ?? 1300000);

/** Operations smaller than this are stored per-cell instead of as a volume op. */
const EXPLICIT_LIMIT = 96;

/** Coarse bucket size for resolving which ops touch a region (32³ blocks). */
const BUCKET = 32;

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createScribe({ materialIds, canvas = CANVAS } = {}) {
  if (!materialIds) throw new Error('createScribe needs a material id table');
  const N = canvas;
  const NN = N * N;
  const bits = new Uint8Array((N * N * N) >> 3);

  const idxOf = (x, y, z) => z * NN + y * N + x;
  const setBit = i => { bits[i >> 3] |= 1 << (i & 7); };
  const clearBit = i => { bits[i >> 3] &= ~(1 << (i & 7)); };
  const getBit = i => (bits[i >> 3] >> (i & 7)) & 1;
  const inBounds = (x, y, z) => x >= 0 && x < N && y >= 0 && y < N && z >= 0 && z < N;

  // Explicit per-cell overrides (small edits, decals, single voxels).
  const explicit = new Map();       // idx -> (matId << 6) | partId
  // Ordered volume operations: { kind, box/params, mat, part }.
  const ops = [];
  const buckets = new Map();        // coarse cell -> [opIndex]
  const bucketKey = (x, y, z) => ((x / BUCKET) | 0) + ',' + ((y / BUCKET) | 0) + ',' + ((z / BUCKET) | 0);
  const surfacePasses = [];         // deferred paint/regroup/mottle/wear

  const partList = [];
  const partIndex = new Map();
  const pivots = {};
  let current = 0;
  let minX = N, minY = N, minZ = N, maxX = -1, maxY = -1, maxZ = -1;

  const partId = name => {
    if (!name) return 0;
    let id = partIndex.get(name);
    if (id === undefined) {
      id = partList.length + 1;
      partIndex.set(name, id);
      partList.push({ name, order: id - 1, pivot: [N / 2, N / 2, 0], dynamic: false });
    }
    return id;
  };
  partId('body');

  const touch = (x, y, z) => {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  };

  /** Set a cell's bit (and bounds). */
  const occupy = (x, y, z) => {
    if (!inBounds(x, y, z)) return false;
    setBit(idxOf(x, y, z));
    touch(x, y, z);
    return true;
  };

  /** Register a volume op so `finish()` can resolve materials for it. */
  const pushOp = op => {
    const i = ops.length;
    ops.push(op);
    const per = Math.floor(op.x1 / BUCKET), pey = Math.floor(op.y1 / BUCKET), pez = Math.floor(op.z1 / BUCKET);
    for (let bx = Math.floor(op.x0 / BUCKET); bx <= per; bx++)
      for (let by = Math.floor(op.y0 / BUCKET); by <= pey; by++)
        for (let bz = Math.floor(op.z0 / BUCKET); bz <= pez; bz++) {
          const k = bx + ',' + by + ',' + bz;
          let arr = buckets.get(k);
          if (!arr) buckets.set(k, arr = []);
          arr.push(i);
        }
    return i;
  };

  const api = {
    canvas: N,
    parts: partList,
    bits,

    part(name) { current = partId(name); return api; },
    dynamic(name, on = true) {
      const p = partList[partId(name ?? partList[current - 1]?.name) - 1];
      if (p) p.dynamic = on;
      return api;
    },
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

    /* ------------------------------------------------------------ edits --- */
    put(x, y, z, mat) {
      const xi = x | 0, yi = y | 0, zi = z | 0;
      if (!occupy(xi, yi, zi)) return api;
      explicit.set(idxOf(xi, yi, zi), (api.matId(mat) << 6) | current);
      return api;
    },
    del(x, y, z) {
      const xi = x | 0, yi = y | 0, zi = z | 0;
      if (!inBounds(xi, yi, zi)) return api;
      clearBit(idxOf(xi, yi, zi));
      explicit.delete(idxOf(xi, yi, zi));
      return api;
    },
    has(x, y, z) {
      const xi = x | 0, yi = y | 0, zi = z | 0;
      return inBounds(xi, yi, zi) && getBit(idxOf(xi, yi, zi)) === 1;
    },

    /* ------------------------------------------------- volumes (solid) --- */
    box(x0, y0, z0, x1, y1, z1, mat) {
      const ax = Math.round(Math.min(x0, x1)), bx = Math.round(Math.max(x0, x1));
      const ay = Math.round(Math.min(y0, y1)), by = Math.round(Math.max(y0, y1));
      const az = Math.round(Math.min(z0, z1)), bz = Math.round(Math.max(z0, z1));
      if (bx <= ax || by <= ay || bz <= az) return api;
      const mid = api.matId(mat);
      const packed = (mid << 6) | current;
      const volume = (bx - ax) * (by - ay) * (bz - az);
      if (volume <= EXPLICIT_LIMIT) {
        for (let z = az; z < bz; z++)
          for (let y = ay; y < by; y++)
            for (let x = ax; x < bx; x++) {
              if (!occupy(x, y, z)) continue;
              explicit.set(idxOf(x, y, z), packed);
            }
        return api;
      }
      for (let z = az; z < bz; z++)
        for (let y = ay; y < by; y++) {
          const row = idxOf(ax, y, z);
          for (let x = 0; x < bx - ax; x++) setBit(row + x);
        }
      touch(ax, ay, az); touch(bx - 1, by - 1, bz - 1);
      pushOp({ kind: 'box', x0: ax, y0: ay, z0: az, x1: bx, y1: by, z1: bz, packed });
      return api;
    },
    boxC(cx, cy, cz, sx, sy, sz, mat) {
      return api.box(cx - sx / 2, cy - sy / 2, cz - sz / 2, cx + sx / 2, cy + sy / 2, cz + sz / 2, mat);
    },
    /** Kept for API compatibility: a shell is just a set of boxes. */
    shell(x0, y0, z0, x1, y1, z1, mat) {
      api.box(x0, y0, z0, x1, y1, z0 + 1, mat);
      api.box(x0, y0, z1 - 1, x1, y1, z1, mat);
      api.box(x0, y0, z0 + 1, x1, y0 + 1, z1 - 1, mat);
      api.box(x0, y1 - 1, z0 + 1, x1, y1, z1 - 1, mat);
      api.box(x0, y0 + 1, z0 + 1, x0 + 1, y1 - 1, z1 - 1, mat);
      api.box(x1 - 1, y0 + 1, z0 + 1, x1, y1 - 1, z1 - 1, mat);
      return api;
    },
    clear(x0, y0, z0, x1, y1, z1) {
      const ax = Math.round(x0), bx = Math.round(x1), ay = Math.round(y0),
        by = Math.round(y1), az = Math.round(z0), bz = Math.round(z1);
      for (let z = az; z < bz; z++)
        for (let y = ay; y < by; y++)
          for (let x = ax; x < bx; x++) {
            if (!inBounds(x, y, z)) continue;
            clearBit(idxOf(x, y, z));
            explicit.delete(idxOf(x, y, z));
          }
      pushOp({ kind: 'erase', x0: ax, y0: ay, z0: az, x1: bx, y1: by, z1: bz, packed: 0 });
      return api;
    },

    cylZ(cx, cy, z0, z1, r, mat, { hollowR = 0 } = {}) {
      const zs = Math.round(z0), ze = Math.round(z1);
      const r2 = r * r, h2 = hollowR * hollowR;
      const mid = api.matId(mat);
      const packed = (mid << 6) | current;
      let touched = false;
      for (let z = zs; z < ze; z++)
        for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
          for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
            const d2 = (x - cx) ** 2 + (y - cy) ** 2;
            if (d2 > r2 || d2 < h2) continue;
            if (occupy(x, y, z)) touched = true;
          }
      if (touched) {
        pushOp({ kind: 'cylZ', cx, cy, r, hollowR, x0: Math.floor(cx - r), x1: Math.ceil(cx + r) + 1,
          y0: Math.floor(cy - r), y1: Math.ceil(cy + r) + 1, z0: zs, z1: ze, packed });
      }
      return api;
    },
    cylX(x0, x1, cy, cz, r, mat, { hollowR = 0 } = {}) {
      const xs = Math.round(x0), xe = Math.round(x1);
      const r2 = r * r, h2 = hollowR * hollowR;
      const mid = api.matId(mat);
      const packed = (mid << 6) | current;
      let touched = false;
      for (let x = xs; x < xe; x++)
        for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++)
          for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
            const d2 = (y - cy) ** 2 + (z - cz) ** 2;
            if (d2 > r2 || d2 < h2) continue;
            if (occupy(x, y, z)) touched = true;
          }
      if (touched) {
        pushOp({ kind: 'cylX', cy, cz, r, hollowR, x0: xs, x1: xe,
          y0: Math.floor(cy - r), y1: Math.ceil(cy + r) + 1,
          z0: Math.floor(cz - r), z1: Math.ceil(cz + r) + 1, packed });
      }
      return api;
    },
    cylY(cx, y0, y1, cz, r, mat, { hollowR = 0 } = {}) {
      const ys = Math.round(y0), ye = Math.round(y1);
      const r2 = r * r, h2 = hollowR * hollowR;
      const mid = api.matId(mat);
      const packed = (mid << 6) | current;
      let touched = false;
      for (let y = ys; y < ye; y++)
        for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++)
          for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
            const d2 = (x - cx) ** 2 + (z - cz) ** 2;
            if (d2 > r2 || d2 < h2) continue;
            if (occupy(x, y, z)) touched = true;
          }
      if (touched) {
        pushOp({ kind: 'cylY', cx, cz, r, hollowR, x0: Math.floor(cx - r), x1: Math.ceil(cx + r) + 1,
          y0: ys, y1: ye, z0: Math.floor(cz - r), z1: Math.ceil(cz + r) + 1, packed });
      }
      return api;
    },
    sphere(cx, cy, cz, r, mat, { top = false, bottom = false } = {}) {
      const r2 = r * r;
      const mid = api.matId(mat);
      const packed = (mid << 6) | current;
      let touched = false;
      for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) {
        if (top && z < cz) continue;
        if (bottom && z > cz) continue;
        for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
          for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
            if ((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2 > r2) continue;
            if (occupy(x, y, z)) touched = true;
          }
      }
      if (touched) {
        pushOp({ kind: 'sphere', cx, cy, cz, r, top, bottom,
          x0: Math.floor(cx - r), x1: Math.ceil(cx + r) + 1,
          y0: Math.floor(cy - r), y1: Math.ceil(cy + r) + 1,
          z0: Math.floor(cz - r), z1: Math.ceil(cz + r) + 1, packed });
      }
      return api;
    },
    coneZ(cx, cy, z0, z1, r0, r1, mat) {
      const zs = Math.round(z0), ze = Math.round(z1);
      for (let z = zs; z < ze; z++) {
        const t = ze - zs <= 1 ? 0 : (z - zs) / (ze - zs - 1);
        api.cylZ(cx, cy, z, z + 1, r0 + (r1 - r0) * t, mat);
      }
      return api;
    },
    rampX(x0, x1, y0, y1, z0, rise, run, mat) {
      for (let x = Math.round(x0); x < Math.round(x1); x++) {
        const z = z0 + Math.floor(((x - x0) * rise) / run);
        api.box(x, y0, z0, x + 1, y1, z + 1, mat);
      }
      return api;
    },
    rampY(x0, x1, y0, y1, z0, rise, run, mat) {
      for (let y = Math.round(y0); y < Math.round(y1); y++) {
        const z = z0 + Math.floor(((y - y0) * rise) / run);
        api.box(x0, y, z0, x1, y + 1, z + 1, mat);
      }
      return api;
    },
    ringZ(cx, cy, z0, z1, rOuter, rInner, mat) {
      return api.cylZ(cx, cy, z0, z1, rOuter, mat, { hollowR: rInner });
    },
    /** Swept solid along X; interior handled by the occupancy pass. */
    profileX(x0, x1, y0, y1, zTopFn, zBotFn, mat) {
      const xs = Math.round(x0), xe = Math.round(x1);
      for (let x = xs; x < xe; x++) {
        const zt = Math.round(zTopFn(x)), zb = Math.round(zBotFn(x));
        if (zt <= zb) continue;
        api.box(x, y0, zb, x + 1, y1, zt, mat);
      }
      return api;
    },

    line(x0, y0, z0, x1, y1, z1, mat, { thickness = 1 } = {}) {
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
      for (let i = 0; i <= steps; i++) {
        const t = steps === 0 ? 0 : i / steps;
        const x = Math.round(x0 + (x1 - x0) * t);
        const y = Math.round(y0 + (y1 - y0) * t);
        const z = Math.round(z0 + (z1 - z0) * t);
        api.box(x, y, z, x + thickness, y + thickness, z + thickness, mat);
      }
      return api;
    },
    bolts(cx, cy, z, radius, count, mat, size = 2) {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const bx = Math.round(cx + Math.cos(a) * radius);
        const by = Math.round(cy + Math.sin(a) * radius);
        api.box(bx, by, z, bx + size, by + size, z + size, mat);
      }
      return api;
    },
    rivets(x0, y0, z0, x1, y1, z1, spacing, mat, size = 2) {
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
    grille(x0, x1, y0, y1, z, step, mat, matGap) {
      for (let y = Math.round(y0); y < Math.round(y1); y++) {
        const m = (y - Math.round(y0)) % step === 0 ? mat : matGap;
        api.box(x0, y, z, x1, y + 1, z + 1, m);
      }
      return api;
    },

    /* ------------------------------------------- deferred surface passes --- */
    /** Repaint every surviving surface voxel matching `pred`. */
    paint(pred, mat) { surfacePasses.push({ kind: 'paint', pred, packed: (api.matId(mat) << 6) | current }); return api; },
    /** Move matching surface voxels into another part. */
    regroup(pred, name) { surfacePasses.push({ kind: 'regroup', pred, part: partId(name) }); return api; },
    mottle(seed, mats, density) {
      surfacePasses.push({ kind: 'mottle', seed, ids: mats.map(m => api.matId(m)), density });
      return api;
    },
    wear(seed, mat, { rate = 0.18 } = {}) {
      surfacePasses.push({ kind: 'wear', seed, id: api.matId(mat), rate });
      return api;
    },
    mirrorY(partName, centreY = N / 2) {
      surfacePasses.push({ kind: 'mirror', part: partId(partName), centreY });
      return api;
    },

    /** No-op: the surface pass below replaces the old interior cull. */
    cull() { return api; },

    finish() {
      if (maxX < 0) return { parts: [], size: N, totalVoxels: 0 };
      const cells = [];
      // One walk of the occupied bounding box: keep only cells with an
      // exposed face. This *is* the interior cull.
      for (let z = minZ; z <= maxZ; z++) {
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const i = idxOf(x, y, z);
            if (!getBit(i)) continue;
            const exposed =
              !(getBit(i + 1)) || !(getBit(i - 1))
              || !getBit(i + N) || !getBit(i - N)
              || !getBit(i + NN) || !getBit(i - NN);
            if (!exposed) continue;
            cells.push([x, y, z, 0, 0]);
          }
        }
      }
      // Resolve material + part: explicit override wins, else last covering op.
      for (const cell of cells) {
        const [x, y, z] = cell;
        const i = idxOf(x, y, z);
        let packed = explicit.get(i);
        if (packed === undefined) {
          const list = buckets.get(bucketKey(x, y, z));
          if (list) {
            for (let k = list.length - 1; k >= 0; k--) {
              const op = ops[list[k]];
              if (x < op.x0 || x >= op.x1 || y < op.y0 || y >= op.y1 || z < op.z0 || z >= op.z1) continue;
              if (op.kind === 'erase') { packed = 0; break; }
              if (op.kind === 'cylZ') {
                const d2 = (x - op.cx) ** 2 + (y - op.cy) ** 2;
                if (d2 > op.r * op.r || d2 < op.hollowR * op.hollowR) continue;
              } else if (op.kind === 'cylX') {
                const d2 = (y - op.cy) ** 2 + (z - op.cz) ** 2;
                if (d2 > op.r * op.r || d2 < op.hollowR * op.hollowR) continue;
              } else if (op.kind === 'cylY') {
                const d2 = (x - op.cx) ** 2 + (z - op.cz) ** 2;
                if (d2 > op.r * op.r || d2 < op.hollowR * op.hollowR) continue;
              } else if (op.kind === 'sphere') {
                const d2 = (x - op.cx) ** 2 + (y - op.cy) ** 2 + (z - op.cz) ** 2;
                if (d2 > op.r * op.r) continue;
                if (op.top && z < op.cz) continue;
                if (op.bottom && z > op.cz) continue;
              }
              packed = op.packed;
              break;
            }
          }
        }
        if (!packed) continue;
        cell[3] = packed >> 6;
        cell[4] = packed & 63;
      }

      // Deferred authoring passes, in call order.
      let live = cells.filter(c => c[4] !== undefined);
      for (const pass of surfacePasses) {
        if (pass.kind === 'paint') {
          for (const c of live) if (pass.pred(c[0], c[1], c[2], c[3], c[4])) c[3] = pass.packed >> 6;
        } else if (pass.kind === 'regroup') {
          for (const c of live) if (pass.pred(c[0], c[1], c[2], c[3], c[4])) c[4] = pass.part;
        } else if (pass.kind === 'mottle') {
          const r = rng(pass.seed);
          for (const c of live) {
            const [x, y, z] = c;
            const n = Math.sin(x * 0.11 + pass.seed) * Math.cos(y * 0.13 - pass.seed * 0.7) + Math.sin(z * 0.09);
            if (n * 0.5 + r() * 0.5 > 1 - pass.density) {
              c[3] = pass.ids[Math.floor(r() * pass.ids.length) % pass.ids.length];
            }
          }
        } else if (pass.kind === 'wear') {
          const r = rng(pass.seed);
          const occupied = new Set(live.map(c => idxOf(c[0], c[1], c[2])));
          for (const c of live) {
            const [x, y, z] = c;
            const i = idxOf(x, y, z);
            let n = 0;
            if (!occupied.has(i + 1)) n++;
            if (!occupied.has(i - 1)) n++;
            if (!occupied.has(i + N)) n++;
            if (!occupied.has(i - N)) n++;
            if (!occupied.has(i + NN)) n++;
            if (n >= 3 && r() < pass.rate) c[3] = pass.id;
          }
        } else if (pass.kind === 'mirror') {
          const src = live.filter(c => c[4] === pass.part).map(c => [c[0], 2 * pass.centreY - 1 - c[1], c[2], c[3], c[4]]);
          live = live.concat(src);
        }
      }

      const byPart = new Map();
      for (const c of live) {
        let arr = byPart.get(c[4]);
        if (!arr) byPart.set(c[4], arr = []);
        arr.push([c[0], c[1], c[2], c[3]]);
      }
      const parts = [];
      for (const p of partList) {
        const id = partIndex.get(p.name);
        const voxels = byPart.get(id) ?? [];
        if (!voxels.length) continue;
        parts.push({ name: p.name, order: parts.length, voxels, pivot: p.pivot,
          dynamic: p.dynamic, bounds: boundsOf(voxels) });
      }
      parts.sort((a, b) => (a.name === 'body' ? -1 : b.name === 'body' ? 1 : a.order - b.order));
      parts.forEach((p, i) => { p.order = i; });
      const total = parts.reduce((s, p) => s + p.voxels.length, 0);
      return { parts, size: N, totalVoxels: total, ops: ops.length };
    },
  };
  return api;
}

export function boundsOf(voxels) {
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const [x, y, z] of voxels) {
    if (x < minX) minX = x; if (y < minY) minY = y; if (z < minZ) minZ = z;
    if (x > maxX) maxX = x; if (y > maxY) maxY = y; if (z > maxZ) maxZ = z;
  }
  return { minX, minY, minZ, maxX, maxY, maxZ };
}
