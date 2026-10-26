/**
 * Faction architecture for the re-authored compact (32³) and major (96³ / 96×64)
 * buildings.  The 2×2 facilities keep their existing deltas in buildings.mjs.
 *
 * Every faction keeps a distinct silhouette *and* a visible owner-0 accent so
 * bake.mjs' six team variants remain pairwise different:
 *   allies  — radomes, sensor masts, blue-steel trim
 *   soviets — slab towers, red banners, gold stars
 *   empire  — upturned pagoda roofs, cyan energy spines
 *   legion  — salvage cranes, corrugated patches, sandbag bastions
 */

const TEAM = '#df794b', TEAM_L = '#ffc68b', TEAM_D = '#934b32';
const GLASS = '#b8dedc', GLASS_D = '#6b9496', METAL = '#536958';
const DARK = '#3b4238', SANDBAG = '#c8b084', RUST = '#8c6b42', STEEL = '#8a8c70';

function radome(c, cx, cy, z0, r, S) {
  for (let dz = 0; dz <= r; dz++) {
    const rr = Math.sqrt(Math.max(0, r * r - dz * dz));
    if (rr >= 0.6) c.cylZ(cx, cy, z0 + dz, z0 + dz + 1, rr, dz === 0 ? S.trim : S.trimLight);
  }
  c.put(cx, cy, z0 + r + 1, TEAM);
}
function spire(c, cx, cy, z0, h, S) {
  c.box(cx - 3, cy - 3, z0, cx + 3, cy + 3, z0 + 4, S.hullDark);
  c.box(cx - 2, cy - 2, z0 + 4, cx + 2, cy + 2, z0 + h, S.hull);
  c.box(cx - 1, cy - 1, z0 + h, cx + 1, cy + 1, z0 + h + 3, S.trim);
  c.put(cx, cy, z0 + h + 3, TEAM);
}
function pagoda(c, x0, y0, x1, y1, z0, S, tiers = 2) {
  for (let t = 0; t < tiers; t++) {
    const inset = t * 2;
    c.box(x0 - 2 - inset, y0 - 2 - inset, z0 + t * 4, x1 + 2 + inset, y1 + 2 + inset, z0 + t * 4 + 2, S.trim);
    c.box(x0 + 1 - inset, y0 + 1 - inset, z0 + t * 4 + 2, x1 - 1 + inset, y1 - 1 + inset, z0 + t * 4 + 4, S.stoneLight);
    for (const [cx, cy] of [[x0 - 2 - inset, y0 - 2 - inset], [x1 + 1 + inset, y0 - 2 - inset],
      [x0 - 2 - inset, y1 + 1 + inset], [x1 + 1 + inset, y1 + 1 + inset]]) {
      c.box(cx, cy, z0 + t * 4, cx + 2, cy + 2, z0 + t * 4 + 5, S.trimLight);
    }
  }
  c.put(Math.round((x0 + x1) / 2), Math.round((y0 + y1) / 2), z0 + tiers * 4, TEAM);
}
function crane(c, x, y, z0, h, S) {
  c.box(x, y, z0, x + 3, y + 3, z0 + h, S.trim);
  c.box(x, y, z0 + h - 2, x + 14, y + 3, z0 + h, S.trimLight);
  c.box(x + 11, y + 1, z0 + h - 9, x + 14, y + 2, z0 + h - 2, METAL);
  c.box(x + 10, y + 1, z0, x + 12, y + 2, z0 + h - 9, DARK);
  c.put(x + 1, y + 1, z0 + h, TEAM);
}

/* ------------------------------------------------------- compact structures - */
export function applySmallBuildingArmyDelta(c, id, armyId, S) {
  c.recolor({
    '#98a098': S.concrete, '#6b7566': S.concreteDark, '#aab59e': S.pad,
    '#e0d9b2': S.stone, '#ece7bc': S.stoneLight, '#8a8c70': S.wall,
    '#c8b084': armyId === 'soviets' ? S.hullLight : SANDBAG,
    '#a58a5a': S.concreteDark,
  });
  const topZ = { 'guard-tower': 34, 'sam-site': 15, 'coastal-battery': 19, bunker: 14, 'flak-cannon': 12 }[id] ?? 12;

  if (armyId === 'allies') {
    // Sensor dome + blue-steel equipment cabinets and a white recognition band.
    (id === 'guard-tower' || id === 'sam-site' || id === 'at-turret')
      ? radome(c, 16, 16, topZ, 3, S)
      : c.box(12, 12, topZ, 21, 21, topZ + 2, S.trimLight);
    c.box(4, 24, 1, 8, 28, 5, S.trim);
    c.box(5, 25, 5, 7, 27, 6, GLASS);
    if (id === 'bunker' || id === 'pillbox') c.box(24, 6, 1, 28, 10, 6, S.concreteDark);
  } else if (armyId === 'soviets') {
    // Slab armour, gold star crest and a red banner.
    c.box(6, 24, 1, 12, 29, 6, S.hullDark);
    c.box(8, 25, 6, 10, 28, 8, S.trim);
    c.box(18, 5, 1, 25, 9, 4, S.hull);
    if (id === 'guard-tower') {
      c.box(9, 9, 34, 23, 10, 38, S.hull);       // heavy parapet
      c.box(15, 10, 38, 17, 11, 41, S.trim);
      c.put(16, 10, 41, TEAM);
    } else {
      c.box(13, 13, topZ, 19, 19, topZ + 3, S.hullDark);
      c.box(15, 15, topZ + 3, 17, 17, topZ + 5, S.trim);
      c.put(16, 16, topZ + 5, TEAM);
    }
    c.box(4, 4, 1, 5, 12, 6, S.trimLight);        // banner pole + cloth
    c.box(5, 5, 3, 6, 11, 6, TEAM);
  } else if (armyId === 'empire') {
    // Upturned crown, cyan sensor eye and lacquered plates.
    pagoda(c, 10, 10, 22, 22, Math.max(1, topZ - 3), S, 1);
    c.box(14, 14, topZ + 1, 18, 18, topZ + 4, S.energy);
    c.box(4, 20, 1, 10, 26, 4, S.stoneLight);
    c.box(5, 21, 4, 9, 25, 5, S.energy);
    c.put(16, 8, 6, TEAM);
  } else {
    // Legion: scrap plating, oil drums, sandbag bastion and wires.
    c.box(4, 4, 1, 10, 10, 6, RUST);
    c.box(5, 5, 6, 9, 9, 7, S.trimLight);
    c.box(22, 20, 1, 28, 26, 5, SANDBAG);
    c.box(23, 21, 5, 27, 25, 6, '#a58a5a');
    for (const [x, y] of [[22, 6], [25, 8]]) c.cylZ(x, y, 1, 6, 1.5, S.hullDark);
    c.box(10, 24, 1, 14, 29, 4, RUST);
    c.put(16, 12, topZ + 1, TEAM);
  }
  // Guarantee the owner-0 accent survives in every faction delta.
  c.paint((x, y, z) => z >= topZ - 1 && Math.abs(x - 16) <= 2 && Math.abs(y - 16) <= 2, TEAM);
  if (!c.entries().some(([, , , col]) => col === TEAM)) c.put(16, 16, topZ, TEAM);
}

/* --------------------------------------------------------- major compounds - */
export function applyLargeBuildingArmyDelta(c, id, armyId, S) {
  c.recolor({
    '#e0d9b2': S.stone, '#ece7bc': S.stoneLight, '#8a8c70': S.wall,
    '#98a098': S.concrete, '#6b7566': S.concreteDark, '#aab59e': S.pad,
    '#6b7a5a': S.concreteDark, '#e8eef0': S.pad,
  });
  const isHQ = id === 'hq';
  const isAirport = id === 'airport';

  if (armyId === 'allies') {
    if (isHQ) {
      radome(c, 30, 40, 45, 6, S);
      radome(c, 66, 40, 45, 6, S);
      c.box(34, 30, 45, 62, 33, 49, S.trim);       // penthouse array
      c.box(36, 31, 49, 60, 32, 51, GLASS);
      c.box(8, 30, 1, 14, 66, 6, S.trimLight);     // solar wing
      c.box(82, 30, 1, 88, 66, 6, S.trimLight);
    } else if (isAirport) {
      c.box(28, 4, 17, 64, 8, 20, S.trim);         // blue-steel roof plant
      c.box(30, 5, 20, 62, 7, 21, GLASS);
      radome(c, 44, 12, 17, 5, S);
      radome(c, 76, 12, 14, 4, S);
      c.box(6, 34, 19, 26, 36, 22, S.trimLight);   // hangar solar roof
    } else {
      c.box(4, 2, 21, 30, 4, 24, S.trim);          // warehouse trim
      c.box(40, 2, 21, 66, 4, 24, S.trim);
      radome(c, 34, 12, 4, 4, S);
      c.box(72, 40, 4, 92, 44, 7, S.trimLight);    // quay offices
      c.box(74, 41, 7, 90, 43, 9, GLASS);
    }
  } else if (armyId === 'soviets') {
    if (isHQ) {
      c.box(8, 34, 3, 16, 66, 26, S.hull);         // brutalist flank towers
      c.box(80, 34, 3, 88, 66, 26, S.hull);
      c.box(10, 36, 26, 14, 64, 30, S.hullDark);
      c.box(82, 36, 26, 86, 64, 30, S.hullDark);
      spire(c, 48, 48, 45, 18, S);
      c.box(44, 74, 4, 52, 78, 30, S.trimLight);   // red banner over the gate
      c.box(45, 75, 6, 51, 77, 28, TEAM);
    } else if (isAirport) {
      c.box(26, 2, 16, 30, 30, 34, S.hull);        // heavy control buttresses
      c.box(62, 2, 16, 66, 30, 34, S.hull);
      spire(c, 63, 11, 54, 12, S);
      c.box(6, 30, 16, 28, 34, 20, S.hullDark);
      c.box(8, 32, 20, 26, 33, 22, S.trim);
    } else {
      c.box(40, 2, 20, 66, 6, 26, S.hull);         // fortified warehouse roof
      c.box(42, 3, 26, 64, 5, 28, S.hullDark);
      spire(c, 78, 12, 4, 16, S);
      c.box(72, 34, 5, 92, 40, 12, S.hullDark);    // quay bunker
      c.box(74, 35, 12, 90, 39, 14, S.trim);
    }
  } else if (armyId === 'empire') {
    if (isHQ) {
      pagoda(c, 38, 38, 58, 58, 45, S, 2);
      c.box(46, 46, 53, 50, 50, 66, S.energy);     // crystal spine
      pagoda(c, 26, 30, 70, 34, 24, S, 1);
      c.box(44, 74, 4, 52, 78, 20, S.trim);
      c.box(45, 75, 20, 51, 77, 22, TEAM);
    } else if (isAirport) {
      pagoda(c, 28, 4, 62, 24, 16, S, 1);
      c.box(58, 8, 20, 68, 12, 34, S.energy);
      pagoda(c, 6, 8, 26, 34, 16, S, 1);
      c.box(44, 12, 20, 46, 14, 30, S.energy);
    } else {
      pagoda(c, 4, 2, 30, 20, 20, S, 1);
      pagoda(c, 40, 2, 66, 20, 20, S, 1);
      c.box(50, 10, 24, 54, 14, 36, S.energy);
      c.box(72, 34, 4, 92, 38, 10, S.stoneLight);
      c.box(76, 35, 10, 88, 37, 12, S.energy);
    }
  } else {
    if (isHQ) {
      crane(c, 72, 30, 45, 20, S);
      c.box(26, 26, 4, 34, 34, 30, RUST);          // scrap buttress
      c.box(28, 27, 30, 32, 33, 32, S.trimLight);
      for (const [x, y] of [[12, 70], [16, 74], [20, 70]]) {
        c.cylZ(x, y, 1, 9, 2.2, S.hullDark);
        c.put(x, y, 9, TEAM);
      }
      c.box(8, 76, 1, 20, 84, 5, SANDBAG);
      c.box(10, 78, 5, 18, 82, 6, '#a58a5a');
      c.box(72, 74, 1, 88, 80, 7, RUST);
      c.box(74, 75, 7, 86, 79, 8, S.trim);
    } else if (isAirport) {
      crane(c, 6, 30, 19, 16, S);
      c.box(68, 6, 16, 92, 12, 20, RUST);          // corrugated terminal shed
      c.box(70, 7, 20, 90, 11, 21, S.trimLight);
      for (const [x, y] of [[30, 34], [34, 36], [50, 34]]) {
        c.cylZ(x, y, 2, 8, 1.8, S.hullDark);
        c.put(x, y, 8, TEAM);
      }
    } else {
      crane(c, 6, 6, 4, 20, S);
      c.box(40, 2, 20, 66, 5, 24, RUST);
      c.box(42, 3, 24, 64, 4, 25, S.trim);
      c.box(68, 26, 4, 92, 32, 8, SANDBAG);
      c.box(70, 27, 8, 90, 31, 9, '#a58a5a');
      c.box(48, 41, 4, 52, 45, 20, RUST);          // improvised pier derrick
      c.put(50, 43, 20, TEAM);
    }
  }
  // Owner-0 accent plate on the most visible roofline of each compound.
  const accent = isHQ ? [48, 31, 56] : isAirport ? [45, 24, 18] : [35, 21, 8];
  c.box(accent[0] - 3, accent[1] - 1, accent[2], accent[0] + 3, accent[1], accent[2] + 2, TEAM_L);
  c.box(accent[0] - 2, accent[1] - 1, accent[2] + 2, accent[0] + 2, accent[1], accent[2] + 3, TEAM);
}
