/**
 * 64×64×64 environment props: woodland, alpine mountain, roads & bridges,
 * Black Hole pipelines, hazard emplacements and the neutral silo-missile
 * effect model (3-frame thrust cycle). Road/bridge decks keep their exact
 * tile-edge connector voxels so adjoining cells join seamlessly.
 */
const DECK = '#33363a', DECK_EDGE = '#585c60', DASH = '#e9e7df';
const B_DECK = '#e1cf98', B_EDGE = '#7a5a3a', B_POST = '#9a7a4a', B_RAIL = '#b89562';
const PILE = '#6a4f2f', PLANK_L = '#c9b284', PLANK_D = '#b89562';

export function terrainVoxels(c, id, pose) {
  if (id === 'tree') {
    // Forest undergrowth plus three layered conifers of varied heights.
    c.box(0, 0, 0, 64, 64, 1, '#5a6642');
    for (const [gx, gy] of [[6, 40], [40, 8], [52, 48], [12, 12]]) {
      c.box(gx, gy, 1, gx + 8, gy + 6, 2, '#6d7a62');
      c.box(gx + 2, gy + 1, 2, gx + 6, gy + 4, 3, '#8e9c78');
    }
    const trees = [
      { cx: 28, cy: 26, baseR: 13.4, topZ: 42 },
      { cx: 46, cy: 40, baseR: 10.2, topZ: 34 },
      { cx: 18, cy: 46, baseR: 9.0, topZ: 28 },
    ];
    for (const { cx, cy, baseR, topZ } of trees) {
      c.cylZ(cx, cy, 0, Math.floor(topZ * 0.45), 3.0, '#8b6f42');
      c.cylZ(cx, cy, 2, Math.floor(topZ * 0.4), 3.6, '#6e5a38');   // root flare
      const startZ = 8;
      for (let z = startZ; z <= topZ; z++) {
        const frac = (z - startZ) / (topZ - startZ);
        const tierWave = (z % 6 === 0) ? 1.2 : 0;
        const r = Math.max(2.0, baseR * (1 - frac * 0.82) + tierWave);
        const shadeColor = frac < 0.28 ? '#3f693b'
          : frac < 0.55 ? '#507b43'
          : frac < 0.80 ? '#648f48'
          : frac < 0.93 ? '#86a85a' : '#a8c97a';
        c.cylZ(cx, cy, z, z + 1, r, shadeColor);
      }
      c.put(cx, cy, Math.min(62, topZ + 1), '#a8c97a');
      c.put(cx + 1, cy, Math.min(62, topZ + 1), '#86a85a');
    }
    // Sunlit leaf facet highlights.
    for (const [x, y, z] of [[22, 20, 28], [32, 22, 34], [42, 36, 26], [16, 42, 22], [48, 38, 30]]) {
      c.box(x, y, z, x + 4, y + 4, z + 2, '#a8c97a');
    }
  } else if (id === 'mountain') {
    c.box(0, 0, 0, 64, 64, 2, '#6d7859');
    for (let z = 2; z <= 42; z++) {
      for (let y = 0; y < 64; y++) {
        for (let x = 0; x < 64; x++) {
          const dMain = Math.hypot((x - 29) * 1.0, (y - 29) * 1.05);
          const dSub = Math.hypot((x - 45) * 1.05, (y - 43) * 1.0);
          const rMain = Math.max(0, 29.6 * (1 - z / 45));
          const rSub = Math.max(0, 19.0 * (1 - z / 31));
          if (dMain <= rMain || dSub <= rSub) {
            const snow = z >= 32 || (z >= 28 && (x + y) % 6 === 0);
            const col = z >= 38 ? '#ffffff'
              : snow ? '#efebca'
              : (x > 32 || y > 34) && z % 6 === 0 ? '#6b7658'
              : z % 8 === 0 ? '#838e70' : '#a5ac83';
            c.put(x, y, z, col);
          }
        }
      }
    }
    // Exposed dark cliff strata + scree on lower slopes.
    c.box(8, 24, 6, 18, 38, 14, '#5a6450');
    c.box(42, 28, 4, 54, 44, 12, '#5a6450');
    for (const [sx, sy] of [[20, 44], [40, 20], [52, 30]]) c.box(sx, sy, 2, sx + 6, sy + 5, 4, '#838e70');
  } else if (id === 'silo' || id === 'silo-spent') {
    const live = id === 'silo';
    c.box(0, 0, 0, 64, 64, 2, '#7c8578');
    c.box(6, 6, 2, 58, 58, 6, '#98a098');
    for (const [cx0, cy0] of [[8, 8], [48, 8], [8, 48], [48, 48]]) {
      c.box(cx0, cy0, 6, cx0 + 8, cy0 + 8, 8, live ? '#e5b93c' : '#586064');
    }
    for (let z = 6; z < 16; z++) {
      for (let y = 14; y < 50; y++) {
        for (let x = 14; x < 50; x++) {
          const d = Math.hypot(x - 31.5, y - 31.5);
          if (d <= 17 && (live || d >= 10.4)) c.put(x, y, z, z === 15 ? '#bbc4c8' : '#646e74');
        }
      }
    }
    if (live) {
      for (let z = 12; z <= 36; z++) {
        const r = z < 28 ? 8.8 : Math.max(1.6, 8.8 * (1 - (z - 26) / 12));
        for (let y = 20; y < 44; y++) {
          for (let x = 20; x < 44; x++) {
            if (Math.hypot(x - 31.5, y - 31.5) <= r) {
              c.put(x, y, z, z >= 30 ? '#d94c3d' : z === 22 ? '#e5b93c' : '#e8eef0');
            }
          }
        }
      }
      c.box(18, 30, 12, 46, 34, 20, '#d94c3d');         // stabilizer fins
      c.box(30, 18, 12, 34, 46, 20, '#d94c3d');
    } else {
      for (let y = 20; y < 44; y++) {
        for (let x = 20; x < 44; x++) {
          if (Math.hypot(x - 31.5, y - 31.5) < 10.6) c.put(x, y, 4, '#1e2226');
        }
      }
      c.box(8, 22, 8, 16, 42, 18, '#52585c');           // swung-back hatches
      c.box(48, 22, 8, 56, 42, 18, '#52585c');
      c.box(10, 24, 18, 14, 40, 19, '#6b757e');
      c.box(50, 24, 18, 54, 40, 19, '#6b757e');
    }
  } else if (id === 'reef') {
    c.box(0, 0, 0, 64, 64, 1, '#3b7d90');
    const rocks = [[20, 22, 12.4, 16], [42, 28, 10.8, 14], [28, 44, 9.6, 12]];
    for (const [rx, ry, rad, topZ] of rocks) {
      for (let z = 1; z <= topZ; z++) {
        const r = rad * (1 - z / (topZ + 5));
        for (let y = 4; y < 60; y++) {
          for (let x = 4; x < 60; x++) {
            if (Math.hypot(x - rx, y - ry) <= r) {
              c.put(x, y, z, z >= topZ - 2 ? '#a8b09c' : z <= 4 ? '#e2f6f8' : '#657068');
            }
          }
        }
      }
    }
    for (const [fx, fy] of [[12, 34], [50, 18], [36, 52]]) c.box(fx, fy, 1, fx + 6, fy + 4, 2, '#71abb6');
  } else if (id === 'volcano') {
    const cinder = '#4a3c2e', basalt = '#2c231c', ledge = '#5c4632', rim = '#241a12';
    const lava = '#e85d26', hot = '#ff8c3a', core = '#ffe27a', crust = '#3a2014';
    c.box(0, 0, 0, 64, 64, 2, cinder);
    c.box(4, 4, 2, 60, 60, 4, basalt);
    for (let z = 4; z <= 28; z++) {
      c.cylZ(32, 32, z, z + 1, 25 - (z - 4) * 0.8, z % 6 === 2 ? ledge : basalt);
    }
    c.clearBox(22, 22, 24, 44, 44, 32);
    c.cylZ(32, 32, 24, 26, 10.4, crust);
    c.cylZ(32, 32, 26, 28, 8.8, lava);
    c.cylZ(32, 32, 28, 30, 6.4, hot);
    c.box(30, 30, 30, 36, 36, 32, core);
    for (const [rx, ry] of [[22, 24], [28, 20], [36, 20], [42, 24], [42, 34], [36, 40], [28, 40], [22, 34]]) {
      c.box(rx, ry, 30, rx + 4, ry + 4, 34, rim);
      c.box(rx + 2, ry + 2, 34, rx + 4, ry + 4, 36, ledge);
    }
    for (const [fx, fy, fw] of [[36, 40, 6], [40, 44, 4], [44, 48, 4], [48, 52, 4], [52, 56, 4],
      [22, 34, 4], [18, 38, 4], [14, 42, 4], [10, 46, 4]]) {
      const dist = Math.hypot(fx + fw / 2 - 32, fy + fw / 2 - 32);
      const zTop = Math.max(4, Math.min(24, Math.round(4 + (25 - dist) / 0.8)));
      c.box(fx, fy, zTop - 2, fx + fw, fy + fw, zTop, lava);
      c.box(fx, fy, zTop, fx + 2, fy + 2, zTop + 2, hot);
    }
    for (const [bx, by] of [[6, 12], [56, 16], [12, 56], [50, 8], [8, 32], [54, 34]]) {
      c.box(bx, by, 2, bx + 4, by + 4, 6, rim);
      c.box(bx, by, 6, bx + 2, by + 2, 8, ledge);
    }
  } else if (id === 'secret-lab') {
    const plaza = '#6a7278', edge = '#4c555c', wall = '#2b3a3f', trim = '#3c4c52';
    const glass = '#4ac2c9', glow = '#b8ffef', dark = '#12181a', metal = '#8b96a2', beacon = '#e85d26';
    c.box(4, 4, 0, 60, 60, 2, plaza);
    c.box(4, 4, 2, 60, 60, 4, edge);
    c.box(8, 16, 4, 56, 52, 6, plaza);
    c.shell(12, 24, 6, 52, 50, 20, wall);
    c.box(12, 24, 20, 52, 50, 22, trim);
    for (const wx of [16, 24, 32, 40]) {                // glowing window bands
      c.box(wx, 48, 10, wx + 6, 52, 16, glass);
      c.box(wx, 48, 12, wx + 6, 52, 16, glow);
    }
    for (const wy of [28, 36, 44]) {
      c.box(48, wy, 10, 52, wy + 6, 16, glass);
      c.box(48, wy, 12, 52, wy + 6, 16, glow);
    }
    c.box(26, 30, 22, 40, 44, 24, trim);                // atrium dome
    c.cylZ(32, 36, 24, 32, 8.4, glass);
    c.cylZ(32, 36, 32, 34, 6.0, glow);
    c.box(30, 34, 34, 36, 40, 36, dark);
    c.box(16, 28, 22, 20, 32, 40, metal);               // antenna mast
    c.box(16, 28, 40, 20, 32, 44, beacon);
    c.box(44, 26, 6, 52, 34, 24, wall);                 // sensor tower
    c.cylZ(48, 30, 24, 28, 4.8, metal);
    c.box(44, 26, 28, 54, 36, 30, metal);
    c.box(46, 28, 30, 52, 34, 32, glow);
    c.box(50, 34, 6, 54, 44, 16, dark);                 // airlock
    c.box(50, 32, 16, 54, 46, 18, beacon);
    for (const [vx, vy] of [[16, 40], [22, 40], [44, 40]]) c.box(vx, vy, 22, vx + 4, vy + 4, 26, metal);
  } else if (id.startsWith('bridge-broken-')) {
    const ns = id.endsWith('-ns');
    const stub = (x0, y0, x1, y1) => {
      c.box(x0, y0, 0, x1, y1, 2, PILE);
      c.box(x0, y0, 2, x1, y1, 4, B_DECK);
      if (ns) {
        c.box(x0, y0, 4, x0 + 2, y1, 6, B_EDGE);
        c.box(x1 - 2, y0, 4, x1, y1, 6, B_EDGE);
        for (let y = y0 + 2; y < y1; y += 8) {
          c.box(x0, y, 4, x0 + 4, y + 4, 10, B_POST);
          c.box(x1 - 4, y, 4, x1, y + 4, 10, B_POST);
        }
        c.box(x0, y0, 8, x0 + 2, y1, 10, B_RAIL);
        c.box(x1 - 2, y0, 8, x1, y1, 10, B_RAIL);
      } else {
        c.box(x0, y0, 4, x1, y0 + 2, 6, B_EDGE);
        c.box(x0, y1 - 2, 4, x1, y1, 6, B_EDGE);
        for (let x = x0 + 2; x < x1; x += 8) {
          c.box(x, y0, 4, x + 4, y0 + 4, 10, B_POST);
          c.box(x, y1 - 4, 4, x + 4, y1, 10, B_POST);
        }
        c.box(x0, y0, 8, x1, y0 + 2, 10, B_RAIL);
        c.box(x0, y1 - 2, 8, x1, y1, 10, B_RAIL);
      }
    };
    if (ns) {
      stub(20, 0, 44, 22);
      stub(20, 42, 44, 64);
      c.box(22, 20, 2, 28, 24, 4, B_DECK);
      c.box(36, 40, 2, 42, 44, 4, B_DECK);
      c.box(26, 30, 2, 32, 34, 4, PLANK_L);
      c.box(34, 34, 2, 40, 36, 4, PLANK_D);
      c.box(24, 26, 4, 26, 30, 8, B_POST);
    } else {
      stub(0, 20, 22, 44);
      stub(42, 20, 64, 44);
      c.box(20, 22, 2, 24, 28, 4, B_DECK);
      c.box(40, 36, 2, 44, 42, 4, B_DECK);
      c.box(30, 26, 2, 34, 32, 4, PLANK_L);
      c.box(34, 34, 2, 36, 40, 4, PLANK_D);
      c.box(26, 24, 4, 30, 26, 8, B_POST);
    }
  } else if (id.startsWith('pipe-')) {
    const ns = id.endsWith('-ns');
    const seam = id.includes('seam');
    c.box(0, 0, 0, 64, 64, 2, '#5d6b56');
    for (let t = 0; t < 64; t++) {
      const pier = (t >= 6 && t <= 14) || (t >= 48 && t <= 56);
      for (let z = 2; z <= 28; z++) {
        for (let cc = 14; cc < 50; cc++) {
          const dy = cc - 31.5;
          const dz = z - 17;
          const r = Math.hypot(dy, dz * 1.08);
          let col = null;
          if (r <= 14.4) {
            const centerSeam = seam && t >= 24 && t <= 39;
            const flange = t === 4 || t === 5 || t === 58 || t === 59 || (seam && (t === 22 || t === 40));
            col = centerSeam
              ? ((t + z) % 4 < 2 ? '#f09436' : '#ffd86b')
              : flange ? '#6b757e'
              : z >= 24 ? '#8b96a0'
              : z <= 8 ? '#2b3138' : '#4a535c';
          } else if (pier && z <= 8 && Math.abs(dy) <= 17) {
            col = '#7a8078';
          }
          if (col) {
            if (ns) c.put(cc, t, z, col);
            else c.put(t, cc, z, col);
          }
        }
      }
    }
  } else if (id === 'rubble') {
    c.box(0, 0, 0, 64, 64, 2, '#7d8572');
    c.box(16, 16, 2, 48, 48, 4, '#9e9788');
    const chunks = [[10, 12, 8], [50, 14, 10], [12, 48, 12], [48, 46, 14], [28, 10, 6], [34, 50, 8]];
    for (const [cx0, cy0, hgt] of chunks) {
      c.box(cx0 - 4, cy0 - 4, 2, cx0 + 6, cy0 + 6, hgt, '#525b64');
      c.box(cx0 - 2, cy0 - 2, hgt, cx0 + 4, cy0 + 4, hgt + 2, '#8c96a0');
    }
    for (const [gx, gy] of [[20, 30], [40, 26], [30, 42]]) c.box(gx, gy, 4, gx + 6, gy + 4, 5, '#6b757e');
  } else if (id === 'bridge-ew' || id === 'bridge-ns') {
    const ns = id === 'bridge-ns';
    if (ns) {
      for (const y of [8, 28, 48]) c.box(16, y, 0, 48, y + 8, 2, PILE);
      c.box(20, 0, 2, 44, 64, 3, B_DECK);
      for (let y = 4; y < 62; y += 8) c.box(22, y, 3, 42, y + 2, 4, '#d2be86');
      c.box(28, 0, 2, 34, 2, 3, B_DECK);
      c.box(28, 62, 2, 34, 64, 3, B_DECK);
      c.box(20, 0, 4, 22, 64, 6, B_EDGE);
      c.box(42, 0, 4, 44, 64, 6, B_EDGE);
      for (let y = 2; y < 64; y += 10) {
        c.box(20, y, 4, 22, y + 4, 10, B_POST);
        c.box(42, y, 4, 44, y + 4, 10, B_POST);
      }
      c.box(20, 0, 8, 22, 64, 10, B_RAIL);
      c.box(42, 0, 8, 44, 64, 10, B_RAIL);
    } else {
      for (const x of [8, 28, 48]) c.box(x, 16, 0, x + 8, 48, 2, PILE);
      c.box(0, 20, 2, 64, 44, 3, B_DECK);
      for (let x = 4; x < 62; x += 8) c.box(x, 22, 3, x + 2, 42, 4, '#d2be86');
      c.box(0, 28, 2, 2, 34, 3, B_DECK);
      c.box(62, 28, 2, 64, 34, 3, B_DECK);
      c.box(0, 20, 4, 64, 22, 6, B_EDGE);
      c.box(0, 42, 4, 64, 44, 6, B_EDGE);
      for (let x = 2; x < 64; x += 10) {
        c.box(x, 20, 4, x + 4, 22, 10, B_POST);
        c.box(x, 42, 4, x + 4, 44, 10, B_POST);
      }
      c.box(0, 20, 8, 64, 22, 10, B_RAIL);
      c.box(0, 42, 8, 64, 44, 10, B_RAIL);
    }
  } else if (id === 'hill') {
    // Low, uneven grassy rise with a rocky skirt — clearly half a mountain's
    // height so the isometric silhouette never reads as the alpine peak.
    c.box(0, 0, 0, 64, 64, 2, '#709e46');
    for (let z = 2; z <= 16; z++) {
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
        const d1 = Math.hypot(x - 26, (y - 30) * 1.1);
        const d2 = Math.hypot((x - 44) * 1.1, y - 40);
        const r1 = Math.max(0, 24 * (1 - z / 19));
        const r2 = Math.max(0, 15 * (1 - z / 13));
        if (d1 <= r1 || d2 <= r2) {
          const col = z >= 12 ? '#a8c97a'
            : z >= 8 ? ((x + y) % 7 === 0 ? '#8fb268' : '#7c9a50')
            : (x > 34 || y > 36) && z % 4 === 0 ? '#6b7658'
            : z % 5 === 0 ? '#878f78' : '#8a9a6a';
          c.put(x, y, z, col);
        }
      }
    }
    c.box(10, 44, 2, 18, 50, 6, '#5a6450');          // scree outcrops
    c.box(44, 18, 2, 52, 24, 5, '#5a6450');
    c.box(11, 45, 6, 15, 48, 7, '#878f78');
  } else {
    // Road connector variants: 24-voxel wide thoroughfare centred on the tile.
    const mask = Number.parseInt(id.split('-')[1], 16) & 15;
    const slab = (x0, y0, x1, y1, color = DECK) => c.box(x0, y0, 0, x1, y1, 1, color);
    slab(20, 20, 44, 44);
    if (mask & 1) slab(20, 0, 44, 32);
    if (mask & 2) slab(32, 20, 64, 44);
    if (mask & 4) slab(20, 32, 44, 64);
    if (mask & 8) slab(0, 20, 32, 44);
    // Stone curbstones along inactive edges; kerb returns along active ones.
    if (mask & 1) { slab(20, 0, 22, 20, DECK_EDGE); slab(42, 0, 44, 20, DECK_EDGE); }
    else slab(20, 20, 44, 22, DECK_EDGE);
    if (mask & 4) { slab(20, 44, 22, 64, DECK_EDGE); slab(42, 44, 44, 64, DECK_EDGE); }
    else slab(20, 42, 44, 44, DECK_EDGE);
    if (mask & 2) { slab(44, 20, 64, 22, DECK_EDGE); slab(44, 42, 64, 44, DECK_EDGE); }
    else slab(42, 20, 44, 44, DECK_EDGE);
    if (mask & 8) { slab(0, 20, 20, 22, DECK_EDGE); slab(0, 42, 20, 44, DECK_EDGE); }
    else slab(20, 20, 22, 44, DECK_EDGE);
    // Centre lane dashes at z=1 so roads keep ≥2 z-layers and crisp markings.
    c.box(30, 30, 1, 34, 34, 2, DASH);
    if (mask & 1) for (const y of [6, 18]) c.box(30, y, 1, 34, y + 6, 2, DASH);
    if (mask & 2) for (const x of [40, 52]) c.box(x, 30, 1, x + 6, 34, 2, DASH);
    if (mask & 4) for (const y of [40, 52]) c.box(30, y, 1, 34, y + 6, 2, DASH);
    if (mask & 8) for (const x of [6, 18]) c.box(x, 30, 1, x + 6, 34, 2, DASH);
    // Worn wheel tracks + gravel shoulders for surface texture.
    for (const lane of [24, 38]) {
      if (mask & 1) c.box(lane, 2, 1, lane + 2, 20, 2, '#4b4f54');
      if (mask & 4) c.box(lane, 44, 1, lane + 2, 62, 2, '#4b4f54');
    }
  }
}

/** Neutral silo-missile effect model: narrow ballistic missile with nosecone,
 *  body and cruciform fins. The idle clip is its 3-frame launch cycle:
 *  f0 = pad rest with idle exhaust, f1 = full-thrust liftoff (missile climbs
 *  3 voxels, plume flares wide), f2 = settled back with a ground smoke ring. */
export function siloMissileVoxels(c, id, pose) {
  const steel = '#3b4732', metalLight = '#8e9680', dark = '#2b3324';
  const warhead = '#d94c3d', white = '#e8eef0';
  const frame = pose?.frame ?? 0;
  const lift = [0, 3, 0][frame % 3];

  // Pointed warhead nosecone (z=28..40 + lift).
  for (let z = 28 + lift; z <= 40 + lift; z++) {
    const r = Math.max(1.0, 4.8 * (1 - (z - 28 - lift) / 14));
    for (let y = 28; y < 36; y++) {
      for (let x = 28; x < 36; x++) {
        if (Math.hypot(x - 31.5, y - 31.5) <= r) c.put(x, y, z, warhead);
      }
    }
  }
  // Cylindrical body with roll bands (z=12..28 + lift).
  for (let z = 12 + lift; z < 28 + lift; z++) {
    for (let y = 24; y < 39; y++) {
      for (let x = 24; x < 39; x++) {
        const d = Math.hypot(x - 31.5, y - 31.5);
        if (d <= 4.8) c.put(x, y, z, (z - lift) % 4 === 0 ? white : metalLight);
      }
    }
  }
  // Cruciform stabilizer fins at the base (z=8..13 + lift).
  c.box(20, 28, 8 + lift, 42, 34, 12 + lift, dark);
  c.box(28, 20, 8 + lift, 34, 42, 12 + lift, dark);
  c.box(22, 29, 12 + lift, 40, 33, 13 + lift, steel);
  c.box(29, 22, 12 + lift, 33, 40, 13 + lift, steel);
  // Exhaust plume: ignites thin, flares wide at full thrust, settles between.
  const plume = [6, 14, 9][frame % 3];
  const flare = [0, 2.0, 0.8][frame % 3];
  for (let i = 0; i < plume; i++) {
    const z = 8 + lift - i;
    if (z < 0) break;
    const r = Math.max(1.2, 3.4 - i * 0.28 + flare * (i / plume));
    const col = i < 2 ? '#ffe27a' : i < 5 ? '#ff8c3a' : '#e4dfd6';
    for (let y = 24; y < 40; y++) {
      for (let x = 24; x < 40; x++) {
        if (Math.hypot(x - 31.5, y - 31.5) <= r) c.put(x, y, z, col);
      }
    }
  }
  // White-hot exhaust tips below the plume base (exposed, so the color is
  // guaranteed to survive hollowing and enter the frame-0 palette).
  c.put(31, 31, 1, '#fff9e3');
  c.put(32, 32, 1, '#fff9e3');
  if (frame % 3 === 2) {                                // ground smoke ring
    for (let y = 20; y < 44; y++) {
      for (let x = 20; x < 44; x++) {
        const d = Math.hypot(x - 31.5, y - 31.5);
        if (d >= 6.5 && d <= 9.5) {
          c.put(x, y, 0, '#e4dfd6');
          if (d <= 8.5) c.put(x, y, 1, '#d8dede');
        }
      }
    }
  }
}
