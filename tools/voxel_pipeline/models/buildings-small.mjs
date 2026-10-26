/**
 * Compact 1×1 defensive structures — authored on a 32×32 design grid so the
 * whole model lives inside one 32-unit ground tile.
 *
 * These replace the old 64³ sculpts, which filled a whole 64-voxel tile with a
 * base pad and read as generic blocks once the canonical tile became 32 units.
 * Every structure here carries its function in the silhouette: firing slits,
 * weapon tubes, revetments, vents, hatches and crew furniture.  Ground pads
 * stay flush at z=0 so the sprout sits exactly on the tile surface.
 *
 * Coordinates are design units (0..31 in x/y); z is shared with world units.
 * Faction repainting/motifs are applied afterwards by
 * `applySmallBuildingArmyDelta` (see building-army.mjs).
 */

export const SMALL_BUILDING_IDS = new Set([
  'landmine', 'pillbox', 'bunker', 'at-turret', 'sam-site', 'flak-cannon',
  'coastal-battery', 'artillery-emplacement', 'guard-tower',
]);

const CONCRETE = '#98a098', CONCRETE_D = '#6b7566', CONCRETE_L = '#aab59e';
const STEEL = '#536958', STEEL_L = '#8a8c70', TRIM = '#938e70';
const GLASS = '#b8dedc', HAZARD = '#e5b93c', WARN = '#d94c3d';
const SANDBAG = '#c8b084', SANDBAG_D = '#a58a5a', EARTH = '#6b5a3a';
const DARK = '#3b4238', DARKER = '#2b3138', GUN = '#354d42', ROOF = '#df794b';
const RUBBER = '#2b3128', SHELL = '#e0d9b2';

/** Ring of sandbag blocks (two staggered courses) around a rounded pit. */
function sandbagRing(c, cx, cy, r, z0, courses = 2) {
  for (let course = 0; course < courses; course++) {
    const rr = r - course * 1.6;
    const n = Math.max(12, Math.round(rr * 3));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + course * 0.22;
      const x = Math.round(cx + Math.cos(a) * rr);
      const y = Math.round(cy + Math.sin(a) * rr);
      c.box(x, y, z0 + course * 2, x + 2, y + 2, z0 + course * 2 + 2,
        (course + i) % 3 === 0 ? SANDBAG_D : SANDBAG);
    }
  }
}

/** Long gun tube with muzzle brake, drawn along +X. */
function gunTube(c, x0, x1, cy, cz, r, color = GUN) {
  c.box(x0, cy - r, cz - r, x1, cy + r, cz + r, color);
  c.box(x0, cy - r - 1, cz - r - 1, x0 + 2, cy + r + 1, cz + r + 1, STEEL);
  c.box(x1 - 2, cy - r - 1, cz - r - 1, x1, cy + r + 1, cz + r + 1, DARKER);
}

export function smallBuildingVoxels(c, id) {
  if (id === 'landmine') {
    // Low, wide anti-tank mine with a pressure plate, lugs and a tripwire stake.
    c.box(11, 11, 0, 21, 21, 1, DARK);
    c.cylZ(16, 16, 1, 4, 4.6, STEEL_L);
    c.cylZ(16, 16, 4, 5, 3.2, HAZARD);
    for (const [dx, dy] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) {
      c.box(16 + dx - 1, 16 + dy - 1, 0, 16 + dx + 1, 16 + dy + 1, 1, WARN);
    }
    c.box(23, 15, 0, 24, 17, 6, EARTH);
    c.put(24, 16, 6, HAZARD);
    c.box(9, 24, 0, 11, 26, 2, EARTH);
    return;
  }

  if (id === 'pillbox') {
    // Octagonal concrete casemate: two splayed courses, 360° firing slit,
    // sandbag apron, roof hatch, and a hull-down machine-gun stub.
    c.box(6, 6, 0, 26, 26, 1, CONCRETE_D);
    sandbagRing(c, 16, 16, 12.2, 1, 2);
    for (let z = 3; z < 11; z++) {
      const r = 10.2 - (z - 3) * 0.35;
      c.cylZ(16, 16, z, z + 1, r, z < 5 ? CONCRETE : CONCRETE_L);
    }
    // Dark firing slit ring just under the roof lip.
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      const x = Math.round(16 + Math.cos(a) * 10.6);
      const y = Math.round(16 + Math.sin(a) * 10.6);
      c.put(x, y, 7, DARKER);
      c.put(x, y, 8, DARKER);
    }
    c.cylZ(16, 16, 11, 12, 8.4, CONCRETE);
    c.cylZ(16, 16, 12, 13, 5.2, CONCRETE_L);
    c.box(18, 15, 13, 22, 17, 14, STEEL);       // roof hatch
    c.box(24, 14, 5, 29, 17, 8, GUN);           // hull-down MG shroud
    c.box(29, 15, 6, 32, 16, 7, DARKER);
    return;
  }

  if (id === 'bunker') {
    // Heavy company bunker: sloped concrete shell, recessed door, firing
    // embrasures, roof vent stacks, and a camo leaf mat.
    c.box(4, 6, 0, 28, 26, 1, CONCRETE_D);
    c.box(5, 7, 1, 27, 25, 3, CONCRETE);
    c.shell(7, 9, 3, 25, 23, 10, CONCRETE);
    // Sloped glacis plates on the two camera-facing sides.
    for (let i = 0; i < 5; i++) {
      c.box(7 - i, 9 + i, 3 + i, 25 + i, 10 + i, 4 + i, i % 2 ? CONCRETE_L : CONCRETE);
      c.box(7 - i, 22 - i, 3 + i, 25 + i, 23 - i, 4 + i, i % 2 ? CONCRETE_L : CONCRETE);
    }
    c.box(8, 8, 1, 14, 14, 7, DARKER);          // blast door recess
    c.box(9, 9, 1, 13, 13, 6, STEEL);
    c.put(12, 9, 4, HAZARD);
    c.box(18, 10, 5, 23, 11, 7, DARKER);        // embrasures
    c.box(18, 21, 5, 23, 22, 7, DARKER);
    c.box(9, 10, 5, 10, 14, 6, DARKER);
    c.box(11, 15, 10, 15, 19, 13, STEEL);       // vent stack
    c.box(12, 16, 13, 14, 18, 14, DARKER);
    c.box(19, 15, 10, 21, 17, 12, STEEL_L);
    // Camouflage netting frames over the roof.
    for (const [x0, y0] of [[8, 11], [16, 11], [8, 18], [16, 18]]) {
      c.box(x0, y0, 11, x0 + 6, y0 + 3, 12, '#5f6c48');
      c.put(x0 + 3, y0 + 1, 12, '#507b43');
    }
    return;
  }

  if (id === 'at-turret') {
    // Anti-tank gun turret: concrete ring, rotating armoured cupola and a
    // long high-velocity twin tube.
    c.box(6, 6, 0, 26, 26, 1, CONCRETE_D);
    sandbagRing(c, 16, 16, 11.4, 1, 2);
    c.cylZ(16, 16, 1, 4, 8.6, CONCRETE);
    c.group('turret');
    c.pivot('turret', [16, 16]);
    c.cylZ(16, 16, 4, 8, 7.4, STEEL_L);
    c.box(11, 11, 8, 21, 21, 11, STEEL);
    c.box(12, 12, 11, 20, 20, 12, STEEL_L);
    c.box(14, 13, 9, 17, 19, 11, DARK);         // mantlet recess
    c.group('barrel');
    c.pivot('barrel', [16, 16]);
    gunTube(c, 18, 31, 16, 10, 1, GUN);
    c.box(15, 15, 9, 18, 17, 11, DARKER);
    c.group('body');
    // Ready-ammo locker and spent casings behind the ring.
    c.box(5, 20, 1, 9, 25, 5, STEEL);
    c.box(6, 21, 5, 8, 24, 6, HAZARD);
    for (const [x, y] of [[24, 22], [26, 24]]) c.put(x, y, 1, HAZARD);
    return;
  }

  if (id === 'sam-site') {
    // Mobile SAM emplacement: towed trailer, four-rail launcher elevated on a
    // turntable, search radar and cable reels.
    c.box(4, 8, 0, 28, 24, 1, EARTH);
    c.box(5, 9, 1, 27, 12, 3, DARK);            // trailer bed
    c.box(5, 20, 1, 27, 23, 3, DARK);
    for (const x of [8, 12, 22, 26]) {
      c.cylY(x, 7, 9, 2, 2.4, RUBBER);          // road wheels
      c.cylY(x, 23, 25, 2, 2.4, RUBBER);
    }
    c.group('turret');
    c.pivot('turret', [16, 16]);
    c.cylZ(16, 16, 3, 6, 8.0, STEEL_L);
    c.box(10, 12, 6, 22, 20, 8, STEEL);
    // Four box launchers on an elevated rail, tubes angled up along +X.
    for (let i = 0; i < 4; i++) {
      const y = 12 + i * 2.4;
      c.box(13, Math.round(y), 9 + i, 27, Math.round(y) + 2, 12 + i, i % 2 ? SHELL : '#eceade');
      c.box(26, Math.round(y), 12 + i, 28, Math.round(y) + 2, 13 + i, WARN);
    }
    c.box(12, 11, 8, 14, 21, 10, DARKER);
    c.group('body');
    // Search radar on a separate mast, plus generator and cable drum.
    c.box(6, 4, 1, 8, 8, 12, STEEL);
    c.box(4, 3, 12, 11, 9, 14, GLASS);
    c.box(5, 4, 14, 10, 8, 15, STEEL_L);
    c.box(22, 24, 1, 28, 28, 5, STEEL);
    c.box(23, 25, 5, 27, 27, 6, HAZARD);
    c.cylZ(9, 26, 1, 4, 2.2, DARKER);
    return;
  }

  if (id === 'flak-cannon') {
    // Quad-barrel AAA emplacement in a revetted pit with a gun shield and
    // ready racks.
    c.box(4, 4, 0, 28, 28, 1, EARTH);
    sandbagRing(c, 16, 16, 12.6, 1, 2);
    c.cylZ(16, 16, 1, 3, 8.0, CONCRETE_D);
    c.group('turret');
    c.pivot('turret', [16, 16]);
    c.box(10, 10, 3, 22, 22, 5, STEEL_L);       // turntable
    c.box(11, 11, 5, 21, 21, 9, STEEL);         // mount body
    c.box(12, 12, 9, 14, 20, 11, DARK);         // gunner seat / sight
    // Quad tubes fanning up and forward.
    for (let i = 0; i < 4; i++) {
      const y = 12 + i * 2.6;
      const z = 8 + (i % 2) * 2;
      c.box(19, Math.round(y), z, 30, Math.round(y) + 1, z + 2, GUN);
      c.box(28, Math.round(y), z, 31, Math.round(y) + 1, z + 2, DARKER);
    }
    c.box(18, 11, 6, 21, 21, 12, STEEL_L);      // shield
    c.group('body');
    c.box(5, 22, 1, 10, 27, 4, STEEL);          // ammo crates
    c.box(6, 23, 4, 9, 26, 5, HAZARD);
    c.box(21, 4, 1, 27, 8, 3, DARK);
    c.box(22, 5, 3, 26, 7, 4, HAZARD);
    return;
  }

  if (id === 'coastal-battery') {
    // Casemated naval gun: thick sloped front, deep embrasure, long rifle and
    // a rangefinder cupola.
    c.box(3, 8, 0, 29, 24, 2, CONCRETE_D);
    c.shell(4, 9, 2, 28, 23, 12, CONCRETE);
    for (let i = 0; i < 4; i++) {
      c.box(6 - i, 9 + i, 2 + i, 10 - i, 23 - i, 3 + i, i % 2 ? CONCRETE : CONCRETE_L);
    }
    c.box(22, 12, 3, 28, 20, 9, CONCRETE_L);    // front barbette
    c.box(24, 13, 5, 29, 19, 8, DARKER);        // embrasure
    c.group('barrel');
    c.pivot('barrel', [24, 16]);
    gunTube(c, 25, 32, 16, 7, 1, GUN);
    c.box(24, 14, 6, 27, 18, 8, STEEL);
    c.group('body');
    c.box(6, 12, 12, 12, 20, 16, STEEL);        // rangefinder
    c.box(5, 13, 16, 13, 19, 18, GLASS);
    c.box(7, 13, 18, 8, 19, 19, DARKER);
    c.box(8, 4, 1, 14, 8, 4, STEEL);            // shell racks
    for (const x of [9, 11, 13]) c.cylZ(x, 6, 4, 7, 1.2, HAZARD);
    c.box(18, 23, 2, 24, 26, 6, DARK);
    return;
  }

  if (id === 'artillery-emplacement') {
    // Dug-in howitzer: horseshoe revetment, trails, elevated barrel and
    // ammunition pits.
    c.box(3, 3, 0, 29, 29, 1, EARTH);
    for (let i = 0; i < 22; i++) {
      const a = -Math.PI * 0.55 + (i / 21) * Math.PI * 1.1;
      const x = Math.round(16 + Math.cos(a) * 12.4);
      const y = Math.round(16 + Math.sin(a) * 12.4);
      c.box(x, y, 1, x + 3, y + 3, 4, i % 3 === 0 ? SANDBAG_D : SANDBAG);
      if (i % 2 === 0) c.box(x, y, 4, x + 3, y + 3, 5, SANDBAG);
    }
    c.group('turret');
    c.pivot('turret', [16, 16]);
    c.box(11, 12, 1, 21, 20, 3, DARK);          // pit floor
    c.box(12, 13, 3, 20, 19, 6, STEEL_L);       // cradle
    c.box(14, 14, 6, 18, 18, 9, STEEL);
    c.group('barrel');
    c.pivot('barrel', [17, 16]);
    gunTube(c, 18, 30, 16, 10, 1, GUN);
    c.box(16, 14, 9, 20, 18, 11, DARKER);
    c.group('body');
    // Split trails running aft and recoil spades.
    c.box(4, 12, 1, 13, 14, 3, STEEL);
    c.box(4, 18, 1, 13, 20, 3, STEEL);
    c.box(3, 11, 1, 6, 15, 4, DARKER);
    c.box(3, 17, 1, 6, 21, 4, DARKER);
    c.box(22, 4, 1, 28, 9, 4, DARK);            // ready shells
    for (const [x, y] of [[23, 5], [25, 7], [27, 5]]) c.cylZ(x, y, 4, 7, 1.1, HAZARD);
    c.box(6, 24, 1, 11, 28, 4, CONCRETE_D);
    return;
  }

  // guard-tower — tall, narrow watchtower with a railed cab and searchlight.
  c.box(8, 8, 0, 24, 24, 1, CONCRETE_D);
  c.box(9, 9, 1, 23, 23, 2, CONCRETE);
  for (const [x, y] of [[10, 10], [20, 10], [10, 20], [20, 20]]) {
    c.box(x, y, 2, x + 2, y + 2, 22, STEEL_L);
  }
  // Cross-bracing on all four faces.
  for (let z = 4; z < 20; z += 4) {
    c.box(10, 10, z, 22, 11, z + 1, STEEL);
    c.box(10, 21, z, 22, 22, z + 1, STEEL);
    c.box(10, 10, z, 11, 22, z + 1, STEEL);
    c.box(21, 10, z, 22, 22, z + 1, STEEL);
  }
  c.box(9, 9, 22, 23, 23, 24, DARK);            // deck
  c.box(10, 10, 24, 22, 22, 26, STEEL_L);       // cab
  for (const [x, y] of [[10, 10], [20, 10], [10, 20], [20, 20]]) {
    c.box(x, y, 26, x + 2, y + 2, 31, STEEL_L); // corner posts
  }
  c.box(11, 11, 26, 21, 12, 30, GLASS);         // glazing
  c.box(11, 20, 26, 21, 21, 30, GLASS);
  c.box(20, 11, 26, 21, 21, 30, GLASS);
  c.box(10, 10, 31, 22, 22, 33, ROOF);          // roof
  c.box(9, 9, 33, 23, 23, 34, '#934b32');
  c.box(15, 15, 34, 17, 17, 40, STEEL);         // mast
  c.box(14, 14, 38, 18, 18, 40, '#8b96a2');     // radar reflector
  c.box(19, 19, 26, 23, 23, 28, HAZARD);        // searchlight housing
  c.put(21, 21, 28, GLASS);
  c.box(25, 14, 2, 29, 18, 10, STEEL);          // ladder cage / hoist
  for (let z = 3; z < 22; z += 3) c.box(26, 15, z, 28, 17, z + 1, STEEL_L);
  return;
}
