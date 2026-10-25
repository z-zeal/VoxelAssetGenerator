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
  } else if (id === 'snow-tile') {
    // Frozen ground tile — snowy surface over packed ice, with subtle cracks
    // and a few low snow mounds. Palettes drawn from mountain snow + road.
    c.box(0, 0, 0, 64, 64, 1, '#c4cdd6'); // icy base
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const noise = ((x * 7 + y * 13) % 5);
      const col = noise === 0 ? '#e8eef0' : noise === 1 ? '#cfd6dc' : noise === 2 ? '#a8b5bf' : '#dce4eb';
      c.put(x, y, 1, col);
    }
    // Subtle crack lines (dark icy grey)
    for (let y = 10; y < 54; y += 12) for (let x = 8; x < 56; x += 4) {
      if ((x + y) % 7 === 0) c.put(x, y, 1, '#8a9199');
    }
    // Snow piles (low mounds near edges and center)
    const piles = [[10, 10, 12, 14, 3, '#ffffff'], [48, 48, 10, 14, 3, '#ffffff'],
                   [30, 8, 14, 18, 2, '#f0f4f8'], [28, 50, 12, 16, 2, '#e0e8f0'],
                   [6, 42, 10, 12, 2, '#dce4eb']];
    for (const [cx, cy, w, h, hgt, col] of piles) {
      c.box(cx, cy, 1, cx + w, cy + h, 1 + hgt, col);
      c.box(cx + 2, cy + 2, 1 + hgt, cx + w - 2, cy + h - 2, 1 + hgt + 1, '#f7f9fc');
    }
    // Scattered ice crystals / highlights
    for (const [x, y] of [[20, 24], [38, 16], [48, 32], [14, 44], [52, 20]]) {
      c.put(x, y, 2, '#ffffff');
      c.put(x + 1, y, 2, '#e6edf3');
    }
  } else if (id === 'cracked-dry-ground') {
    // Cracked dry earth — tan base, dark fissures, scattered rocks.
    c.box(0, 0, 0, 64, 64, 1, '#c49a72');
    // Patchy lighter / darker tan surface
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const v = ((x + y) % 11) / 11;
      c.put(x, y, 1, v < 0.25 ? '#d4b896' : v < 0.55 ? '#b88a5a' : v < 0.8 ? '#9e7348' : '#c49a72');
    }
    // Cracks: dark brown irregular lines
    for (let y = 6; y < 58; y += 8) {
      for (let x = 4; x < 60; x += 5) {
        if ((x + y * 3) % 7 < 2) {
          c.put(x, y, 1, '#3e2a1d');
          if (y + 1 < 64) c.put(x, y + 1, 1, '#5a4430');
        }
      }
    }
    // Short cross-cracks for irregularity
    for (let y = 14; y < 50; y += 9) {
      for (let x = 10; x < 54; x += 9) {
        c.put(x, y, 1, '#5a4430');
        c.put(x + 2, y, 1, '#3e2a1d');
        c.put(x, y + 2, 1, '#3e2a1d');
      }
    }
    // Scattered rocks
    const rocks = [[12, 14, 8, 10, 3, '#7a6a5a'], [42, 36, 10, 12, 4, '#52453a'],
                   [30, 16, 6, 8, 2, '#8a7a6a'], [50, 8, 4, 6, 3, '#6b5d4f'],
                   [20, 44, 8, 10, 3, '#5a4a3a'], [6, 28, 6, 8, 2, '#7a6a5a']];
    for (const [cx, cy, w, h, hgt, col] of rocks) {
      c.box(cx, cy, 1, cx + w, cy + h, 1 + hgt, col);
      c.box(cx + 1, cy + 1, 1 + hgt, cx + w - 1, cy + h - 1, 1 + hgt + 1, '#9e9082');
    }
    // Small dry grass tufts
    for (const [x, y] of [[18, 8], [44, 20], [28, 52], [52, 40], [10, 36]]) {
      c.put(x, y, 2, '#6b7a52');
      c.put(x + 1, y, 2, '#7a8a60');
    }
  } else if (id === 'marsh') {
    // Marsh / wetland — dark mud, shallow water patches, reeds, algae.
    c.box(0, 0, 0, 64, 64, 1, '#5a4a3a'); // dark mud base
    // Shallow water patches (low spots)
    for (let y = 14; y < 22; y++) for (let x = 20; x < 36; x++) {
      if ((x - 28) * (x - 28) + (y - 18) * (y - 18) <= 30) c.put(x, y, 0, '#3b6e75');
    }
    for (let y = 36; y < 44; y++) for (let x = 8; x < 24; x++) {
      if ((x - 16) * (x - 16) + (y - 40) * (y - 40) <= 20) c.put(x, y, 0, '#3b6e75');
    }
    // Mud surface variation
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const v = ((x * 3 + y * 5) % 7);
      c.put(x, y, 1, v < 2 ? '#6b5a4a' : v < 4 ? '#7a6548' : '#584232');
    }
    // Reeds / cattails — clusters of vertical cylinders + thin stems
    const reedClusters = [[14, 18, 6], [40, 22, 7], [22, 46, 5], [48, 38, 6],
                          [8, 8, 4], [56, 18, 5], [30, 10, 6], [52, 48, 5]];
    for (const [cx, cy, n] of reedClusters) {
      for (let i = 0; i < n; i++) {
        const rx = cx + (i - n / 2) * 2;
        const ry = cy + ((i % 3) - 1) * 2;
        // Stem
        for (let z = 2; z <= 12; z++) {
          const shade = z < 4 ? '#2f4a2a' : z < 9 ? '#4a7a3a' : '#7a9e5a';
          c.put(rx, ry, z, shade);
          c.put(rx + 1, ry, z, shade);
          c.put(rx, ry + 1, z, shade);
        }
        // Light tip
        c.put(rx, ry, 13, '#8eb06a');
        c.put(rx + 1, ry, 13, '#a0c67a');
      }
    }
    // Algae / moss at water edges
    for (const [x, y] of [[26, 16], [22, 24], [36, 42], [10, 40], [42, 10], [18, 36]]) {
      c.put(x, y, 1, '#5a7a4a');
      c.put(x + 1, y, 1, '#6b8a5a');
    }
    // Small mud mounds near center
    c.box(26, 26, 1, 34, 34, 3, '#6b5a3a');
    c.box(28, 28, 3, 32, 32, 4, '#7a6548');
  } else if (id === 'plains') {
    // Grassland: varied green surface with small clumps, subtle flowers, soil hints.
    c.box(0, 0, 0, 64, 64, 1, '#6e9049');
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const v = ((x * 7 + y * 13) % 5);
      c.put(x, y, 1, v === 0 ? '#7ba358' : v === 1 ? '#8fb86a' : v === 2 ? '#5e7d3b' : '#a0c27a');
    }
    // Small irregular grass clumps
    const clumps = [[8,10],[24,8],[40,12],[12,36],[48,30],[28,48],[52,6]];
    for (const [cx,cy] of clumps) {
      c.box(cx, cy, 1, cx+6, cy+5, 2, '#7a9e58');
      c.put(cx+2, cy+2, 2, '#b5d48c');
    }
  } else if (id.startsWith('elevation-')) {
    // Multi-height terrain elevation blocks (z ∈ {0, 4, 8, 12, 16, 20, 24, 28, 32}):
    //   - Preserves the exact 64×64 ground footprint (64×32 iso diamond, anchorX = 32).
    //   - Top surface sits at z = elevZ .. elevZ + 1 with the exact grassland material
    //     so elevated tiles match elevation 0 and join seamlessly with equal-height neighbors.
    //   - Vertical cliff walls (z = 0 .. elevZ - 1) feature 4-voxel geological rock strata,
    //     vertical fissure joints, and a sub-turf loam/root overhang right below the grass rim.
    const elevZ = Math.max(0, Math.min(32, Number.parseInt(id.slice('elevation-'.length), 10) || 0));
    if (elevZ > 0) {
      // Base footprint anchor shell at z = 0 so ground anchor stays locked to tile center
      c.box(0, 0, 0, 64, 64, 1, '#52453a');
      for (let z = 0; z < elevZ; z++) {
        const band = Math.floor(z / 4);
        const inBand = z % 4;
        const isSubTurf = z === elevZ - 1;
        const isRootBand = z === elevZ - 2 && elevZ >= 4;
        for (let t = 0; t < 64; t++) {
          const cliffColor = (coord, sideSalt) => {
            if (z === 0) return ((coord + sideSalt) % 6 === 0) ? '#3e2a1d' : '#52453a';
            if (isSubTurf) {
              return ((coord + sideSalt) % 5 === 0) ? '#5e7d3b'
                : ((coord + sideSalt) % 2 === 0) ? '#6b5a3a' : '#7a6548';
            }
            if (isRootBand) {
              return ((coord + sideSalt) % 3 === 0) ? '#5a4a3a' : '#6b5a3a';
            }
            if (inBand === 0) {
              // 4-voxel terrace stratum seam line
              return ((coord + band * 3 + sideSalt) % 8 === 0) ? '#3e2a1d' : '#5a4a3a';
            }
            const joint = ((coord + band * 7 + sideSalt * 3) % 11 === 0);
            if (joint) return '#52453a';
            if (inBand === 1) return ((coord + band) % 4 === 0) ? '#7a6a5a' : '#6b5d4f';
            if (inBand === 2) return ((coord + band * 2) % 5 === 0) ? '#8a7a6a' : '#7a6a5a';
            return ((coord + band * 3) % 4 === 0) ? '#9e9082' : '#8a7a6a';
          };
          const colN = cliffColor(t, 1);
          const colS = cliffColor(t, 2);
          const colW = cliffColor(t, 3);
          const colE = cliffColor(t, 4);
          // 2-voxel wall thickness on all 4 vertical sides avoids sub-pixel pinholes on downsample
          c.put(t, 0, z, colN); c.put(t, 1, z, colN);
          c.put(t, 62, z, colS); c.put(t, 63, z, colS);
          c.put(0, t, z, colW); c.put(1, t, z, colW);
          c.put(62, t, z, colE); c.put(63, t, z, colE);
        }
      }
    }
    // Elevated top surface at z = elevZ .. elevZ + 1 (identical material to plains at z = 0..1)
    c.box(0, 0, elevZ, 64, 64, elevZ + 1, '#6e9049');
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const v = ((x * 7 + y * 13) % 5);
        const col = v === 0 ? '#7ba358' : v === 1 ? '#8fb86a' : v === 2 ? '#5e7d3b' : '#a0c27a';
        c.put(x, y, elevZ + 1, col);
      }
    }
    const clumps = [[8, 10], [24, 8], [40, 12], [12, 36], [48, 30], [28, 48], [52, 6]];
    for (const [cx, cy] of clumps) {
      c.box(cx, cy, elevZ + 1, cx + 6, cy + 5, elevZ + 2, '#7a9e58');
      c.put(cx + 2, cy + 2, elevZ + 2, '#b5d48c');
    }
  } else if (id === 'tallgrass') {
    // Tall grass: denser taller clumps with shade and light tips
    c.box(0, 0, 0, 64, 64, 1, '#5a7d3a');
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const v = ((x*3 + y*7) % 6);
      c.put(x, y, 1, v < 2 ? '#6b8f4e' : v < 4 ? '#8aaf68' : '#5e733a');
    }
    // Tall clumps
    const tall = [[10,14],[34,10],[18,36],[42,34],[6,50],[50,20],[30,48]];
    for (const [cx,cy] of tall) {
      c.box(cx, cy, 1, cx+8, cy+6, 4, '#4a6330');
      c.box(cx+2, cy+1, 4, cx+6, cy+4, 6, '#8fa860');
    }
  } else if (id === 'sea') {
    c.box(0, 0, 0, 64, 64, 1, '#2b6e8a');
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const v = ((x*11 + y*7) % 7);
      c.put(x, y, 1, v < 2 ? '#356e8a' : v < 4 ? '#2b6e8a' : '#4688a8');
    }
    // Sparse wave highlights
    for (const [x,y] of [[16,16],[48,48],[28,24],[10,40],[54,12]]) c.put(x, y, 2, '#7ec8e8');
  } else if (id === 'shoal') {
    c.box(0, 0, 0, 64, 64, 1, '#c8b086');
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const d = Math.hypot(x-32, y-32);
      const v = ((x+y)%9);
      if (d < 22) c.put(x, y, 1, v < 3 ? '#d6c48e' : v < 6 ? '#c4a87a' : '#b08d6a');
      else c.put(x, y, 1, '#c8b086');
    }
    // Wet sand / shallow water edge near bottom/right
    for (let y = 48; y < 64; y++) for (let x = 40; x < 64; x++) {
      if (((x+y)%5)<2) c.put(x, y, 1, '#6e9ba8');
    }
  
  } else if (id.startsWith('wall-')) {
    // Tall fortified reinforced concrete walls (z = 0..38):
    //   -wall-standard, wall-allies, wall-soviets, wall-empire, wall-legion
    //   -wall-end, wall-corner, wall-t, wall-cross
    const themes = {
      'wall-standard': {
        concrete: '#8c9098', coping: '#a8acb4', top: '#c2c6ce',
        seam: '#6c7078', plinth: '#5a5e66', base: '#3e4248',
        buttress: '#747880', trim: '#555962', accent: '#d8a032',
      },
      'wall-allies': {
        concrete: '#9098a2', coping: '#b2bac4', top: '#d0d8e2',
        seam: '#6e7680', plinth: '#58606a', base: '#3c424a',
        buttress: '#76808a', trim: '#3b6ea5', accent: '#dce4ec',
      },
      'wall-soviets': {
        concrete: '#86807a', coping: '#a29c94', top: '#bab4ac',
        seam: '#68625c', plinth: '#544e4a', base: '#3a3634',
        buttress: '#6e6862', trim: '#a83228', accent: '#e0b94a',
      },
      'wall-empire': {
        concrete: '#989ea8', coping: '#bac2ce', top: '#d6dde8',
        seam: '#767c86', plinth: '#5e646e', base: '#404650',
        buttress: '#808690', trim: '#2f4a7a', accent: '#d4a238',
      },
      'wall-legion': {
        concrete: '#6c6e76', coping: '#888c96', top: '#a4a8b2',
        seam: '#52545c', plinth: '#42444c', base: '#2e3036',
        buttress: '#5a5c64', trim: '#962c3c', accent: '#c4aa78',
      },
    };
    const wallArmy = ['allies', 'soviets', 'empire', 'legion'].find(a => id.endsWith(`-${a}`)) ?? 'standard';
    const themeKey = `wall-${wallArmy}`;
    const T = themes[themeKey] ?? themes['wall-standard'];

    // Subtle ground turf + gravel drainage bed across the 64×64 tile
    c.box(0, 0, 0, 64, 64, 2, '#5a6352');

    // Helper: draw a tall concrete wall arm along X from x0 to x1 (centered at y=32)
    const concreteArmX = (x0, x1, buttressXs = []) => {
      // Concrete foundation apron & stepped plinth (z = 2..7)
      c.box(x0, 18, 1, x1, 46, 3, T.base);
      c.box(x0, 20, 3, x1, 44, 6, T.plinth);
      c.box(x0, 22, 6, x1, 42, 8, T.buttress);
      // Tall poured-concrete curtain wall shaft (z = 8..30, 16 voxels thick)
      c.box(x0, 24, 8, x1, 40, 30, T.concrete);
      // Horizontal cast-concrete form seams & tie-rod holes
      c.box(x0, 23, 14, x1, 41, 15, T.seam);
      c.box(x0, 23, 23, x1, 41, 24, T.seam);
      for (let x = x0 + 3; x < x1 - 2; x += 6) {
        c.put(x, 23, 11, T.base);
        c.put(x, 40, 11, T.base);
        c.put(x, 23, 26, T.base);
        c.put(x, 40, 26, T.base);
      }
      // Faction reinforced band along both vertical faces (z = 17..21)
      c.box(x0, 23, 17, x1, 25, 21, T.trim);
      c.box(x0, 39, 17, x1, 41, 21, T.trim);
      c.box(x0, 23, 18, x1, 24, 20, T.accent);
      c.box(x0, 40, 18, x1, 41, 20, T.accent);
      // Cantilevered concrete cornice / coping overhang (z = 30..33)
      c.box(x0, 21, 30, x1, 43, 32, T.coping);
      c.box(x0, 22, 32, x1, 42, 33, T.top);
      // Top recessed parapet walkway + raised concrete blast merlons (z = 33..37)
      c.box(x0, 25, 33, x1, 39, 34, T.seam);
      for (let x = x0; x < x1; x++) {
        const isGap = ((x + 2) % 10) >= 7;
        const h = isGap ? 35 : 37;
        c.box(x, 22, 33, x + 1, 26, h, T.coping);
        c.box(x, 38, 33, x + 1, 42, h, T.coping);
        c.box(x, 22, h - 1, x + 1, 26, h, T.top);
        c.box(x, 38, h - 1, x + 1, 42, h, T.top);
      }
      // Projecting vertical concrete buttresses / pilasters
      for (const bx of buttressXs) {
        c.box(bx, 18, 2, bx + 6, 46, 7, T.base);
        c.box(bx, 20, 7, bx + 6, 44, 29, T.buttress);
        c.box(bx + 1, 19, 8, bx + 5, 45, 27, T.concrete);
        c.box(bx + 1, 19, 17, bx + 5, 45, 21, T.trim);
        c.box(bx, 20, 29, bx + 6, 44, 34, T.coping);
        c.box(bx, 21, 34, bx + 6, 43, 38, T.top);
      }
    };

    // Helper: draw a tall concrete wall arm along Y from y0 to y1 (centered at x=32)
    const concreteArmY = (y0, y1, buttressYs = []) => {
      c.box(18, y0, 1, 46, y1, 3, T.base);
      c.box(20, y0, 3, 44, y1, 6, T.plinth);
      c.box(22, y0, 6, 42, y1, 8, T.buttress);
      c.box(24, y0, 8, 40, y1, 30, T.concrete);
      c.box(23, y0, 14, 41, y1, 15, T.seam);
      c.box(23, y0, 23, 41, y1, 24, T.seam);
      for (let y = y0 + 3; y < y1 - 2; y += 6) {
        c.put(23, y, 11, T.base);
        c.put(40, y, 11, T.base);
        c.put(23, y, 26, T.base);
        c.put(40, y, 26, T.base);
      }
      c.box(23, y0, 17, 25, y1, 21, T.trim);
      c.box(39, y0, 17, 41, y1, 21, T.trim);
      c.box(23, y0, 18, 24, y1, 20, T.accent);
      c.box(40, y0, 18, 41, y1, 20, T.accent);
      c.box(21, y0, 30, 43, y1, 32, T.coping);
      c.box(22, y0, 32, 42, y1, 33, T.top);
      c.box(25, y0, 33, 39, y1, 34, T.seam);
      for (let y = y0; y < y1; y++) {
        const isGap = ((y + 2) % 10) >= 7;
        const h = isGap ? 35 : 37;
        c.box(22, y, 33, 26, y + 1, h, T.coping);
        c.box(38, y, 33, 42, y + 1, h, T.coping);
        c.box(22, y, h - 1, 26, y + 1, h, T.top);
        c.box(38, y, h - 1, 42, y + 1, h, T.top);
      }
      for (const by of buttressYs) {
        c.box(18, by, 2, 46, by + 6, 7, T.base);
        c.box(20, by, 7, 44, by + 6, 29, T.buttress);
        c.box(19, by + 1, 8, 45, by + 5, 27, T.concrete);
        c.box(19, by + 1, 17, 45, by + 5, 21, T.trim);
        c.box(20, by, 29, 44, by + 6, 34, T.coping);
        c.box(21, by, 34, 43, by + 6, 38, T.top);
      }
    };

    // Helper: central reinforced concrete bastion tower for junctions/ends
    const concreteBastion = (r = 12) => {
      const x0 = 32 - r, x1 = 32 + r, y0 = 32 - r, y1 = 32 + r;
      c.box(x0 - 3, y0 - 3, 1, x1 + 3, y1 + 3, 4, T.base);
      c.box(x0 - 2, y0 - 2, 4, x1 + 2, y1 + 2, 8, T.plinth);
      c.box(x0, y0, 8, x1, y1, 32, T.concrete);
      // Corner concrete pilasters
      for (const [px, py] of [[x0 - 1, y0 - 1], [x1 - 3, y0 - 1], [x0 - 1, y1 - 3], [x1 - 3, y1 - 3]]) {
        c.box(px, py, 6, px + 4, py + 4, 33, T.buttress);
      }
      c.box(x0 - 1, y0 - 1, 14, x1 + 1, y1 + 1, 15, T.seam);
      c.box(x0 - 1, y0 - 1, 23, x1 + 1, y1 + 1, 24, T.seam);
      c.box(x0 - 1, y0 - 1, 17, x1 + 1, y1 + 1, 21, T.trim);
      c.box(x0 - 1, y0 - 1, 18, x1 + 1, y1 + 1, 20, T.accent);
      // Overhanging bastion cornice & crenellated roof parapet (z = 32..39)
      c.box(x0 - 2, y0 - 2, 32, x1 + 2, y1 + 2, 35, T.coping);
      c.box(x0 - 2, y0 - 2, 35, x1 + 2, y1 + 2, 37, T.top);
      c.box(x0 + 2, y0 + 2, 35, x1 - 2, y1 - 2, 37, T.seam);
      // Raised corner turret merlons up to z = 39
      for (const [mx, my] of [[x0 - 2, y0 - 2], [x1 - 3, y0 - 2], [x0 - 2, y1 - 3], [x1 - 3, y1 - 3]]) {
        c.box(mx, my, 37, mx + 5, my + 5, 39, T.top);
      }
      c.box(29, 29, 36, 35, 35, 38, T.plinth);
      // Faction-specific bastion crown geometry
      if (wallArmy === 'allies') {
        c.cylZ(32, 32, 38, 43, 4.5, T.accent);
        c.box(26, 26, 36, 38, 38, 38, T.trim);
      } else if (wallArmy === 'soviets') {
        c.box(27, 27, 38, 37, 37, 42, T.trim);
        c.box(30, 30, 42, 34, 34, 47, T.accent);
      } else if (wallArmy === 'empire') {
        c.box(x0 - 3, y0 - 3, 39, x1 + 3, y1 + 3, 41, T.trim);
        c.box(30, 30, 41, 34, 34, 46, '#5fc4e8');
      } else if (wallArmy === 'legion') {
        c.box(26, 26, 38, 38, 38, 41, '#c8b084');
        c.box(30, 30, 41, 33, 33, 47, '#2b2b2b');
      }
    };

    if (id === 'wall-end' || id.startsWith('wall-end-')) {
      concreteArmX(32, 64, [50]);
      concreteBastion(13);
    } else if (id === 'wall-corner' || id.startsWith('wall-corner-')) {
      concreteArmX(32, 64, [50]);
      concreteArmY(32, 64, [50]);
      concreteBastion(12);
    } else if (id === 'wall-t' || id.startsWith('wall-t-')) {
      concreteArmX(0, 64, [8, 50]);
      concreteArmY(32, 64, [50]);
      concreteBastion(12);
    } else if (id === 'wall-cross' || id.startsWith('wall-cross-')) {
      concreteArmX(0, 64, [8, 50]);
      concreteArmY(0, 64, [8, 50]);
      concreteBastion(12);
    } else if (id.startsWith('wall-gate')) {
      // Fortified Reinforced Concrete Wall Gate (z = 0..41):
      // connects seamlessly to tall concrete walls on X (0..14 and 50..64),
      // flanked by twin gatehouse towers, overhead concrete arch & walkway,
      // paved armored roadway, and raised steel portcullis / blast doors.
      concreteArmX(0, 14, []);
      concreteArmX(50, 64, []);
      // Paved armored roadway passing through the gateway (x=18..46, y=0..64)
      c.box(18, 0, 1, 46, 64, 3, '#484e56');
      for (let x = 20; x < 44; x += 4) {
        c.box(x, 16, 2, x + 2, 20, 3, '#e5b93c');          // north hazard threshold
        c.box(x, 44, 2, x + 2, 48, 3, '#e5b93c');          // south hazard threshold
      }
      // Twin flanking fortified concrete gatehouse towers (x=10..20 and x=44..54)
      for (const tx of [10, 44]) {
        c.box(tx - 2, 14, 1, tx + 12, 50, 4, T.base);
        c.box(tx - 1, 16, 4, tx + 11, 48, 8, T.plinth);
        c.box(tx, 18, 8, tx + 10, 46, 35, T.concrete);
        c.box(tx - 1, 17, 17, tx + 11, 47, 21, T.trim);
        c.box(tx + 2, 16, 12, tx + 8, 48, 28, T.buttress);
        // Faction heraldic banner on outer tower faces
        c.box(tx + 3, 15, 14, tx + 7, 49, 26, T.trim);
        c.box(tx + 4, 15, 16, tx + 6, 49, 24, T.accent);
        // Overhanging tower cornice & crenellated battlements (z=35..41)
        c.box(tx - 2, 16, 35, tx + 12, 48, 38, T.coping);
        c.box(tx - 2, 16, 38, tx + 12, 48, 40, T.top);
        for (const [mx, my] of [[tx - 2, 16], [tx + 8, 16], [tx - 2, 44], [tx + 8, 44]]) {
          c.box(mx, my, 40, mx + 4, my + 4, 42, T.top);
        }
      }
      // Overhead reinforced concrete lintel arch & crenellated parapet walkway (x=20..44, z=24..37)
      c.box(20, 22, 26, 44, 42, 32, T.concrete);
      c.box(20, 22, 23, 25, 42, 26, T.buttress);           // left arch haunch
      c.box(39, 22, 23, 44, 42, 26, T.buttress);           // right arch haunch
      c.box(20, 21, 28, 44, 43, 30, T.trim);               // faction lintel band
      c.box(28, 20, 27, 36, 44, 31, T.accent);             // keystone crest
      c.box(20, 20, 32, 44, 44, 34, T.coping);
      for (let x = 20; x < 44; x++) {
        const h = ((x + 2) % 8 >= 6) ? 35 : 37;
        c.box(x, 21, 34, x + 1, 25, h, T.top);
        c.box(x, 39, 34, x + 1, 43, h, T.top);
      }
      // Raised steel portcullis teeth & parted armored blast-gate leaves inside archway
      c.box(20, 29, 3, 25, 35, 23, '#383e46');             // left retracted blast door leaf
      c.box(39, 29, 3, 44, 35, 23, '#383e46');             // right retracted blast door leaf
      for (let x = 25; x < 40; x += 3) {
        c.box(x, 30, 19, x + 2, 34, 26, '#2e343c');        // raised portcullis teeth
        c.put(x, 30, 19, T.accent);
      }
      // Asymmetric gatehouse control annex & signal beacon on front-left tower (ensures 4 distinct facings)
      c.box(11, 46, 4, 18, 52, 15, T.plinth);
      c.box(12, 51, 9, 17, 53, 13, '#5fc4e8');             // guard booth window
      c.box(13, 48, 42, 16, 51, 45, '#d94c3d');            // tower signal beacon
    } else {
      // Full straight fortified concrete wall segment (wall-standard & 4 armies)
      concreteArmX(0, 64, [6, 29, 52]);
      // Faction architectural crest on the central buttress (x = 28..36)
      if (id === 'wall-allies') {
        c.box(28, 19, 14, 36, 45, 25, T.trim);
        c.box(30, 18, 16, 34, 46, 23, T.accent);
        c.box(28, 20, 34, 36, 44, 39, T.accent);
      } else if (id === 'wall-soviets') {
        c.box(27, 19, 13, 37, 45, 26, T.trim);
        c.box(30, 18, 16, 34, 46, 23, T.accent);
        c.box(28, 20, 34, 36, 44, 39, T.trim);
      } else if (id === 'wall-empire') {
        c.box(28, 19, 12, 36, 45, 28, T.trim);
        c.box(31, 18, 14, 33, 46, 26, T.accent);
        c.box(27, 19, 34, 37, 45, 39, T.accent);
      } else if (id === 'wall-legion') {
        c.box(28, 19, 12, 36, 45, 27, T.trim);
        c.box(29, 18, 15, 35, 46, 24, T.accent);
        c.box(28, 20, 34, 36, 44, 39, T.trim);
      }
    }
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
