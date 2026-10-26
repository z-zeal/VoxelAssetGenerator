/**
 * Fixed-wing aircraft hangar — `hangar`, a 3×3-tile (96×96 world-voxel) major
 * facility.  It is deliberately **not** the `helipad`: the helipad is a 2×2
 * rotary deck with a painted "H"; this is an enclosed maintenance hall for
 * aeroplanes, with a wide door, a deep clear bay, an apron and a guarded gate.
 *
 * ---------------------------------------------------------------------------
 * Top-down plan reads as the digit "2"
 * ---------------------------------------------------------------------------
 *   y = 3   ┌──────────────────────────────────────────────┐
 *           │  TOP STROKE — the hangar hall (86 × 48)       │  roofed bay
 *   y = 51  ├───────────────────────────┬──────────────────┤
 *           │  COUNTER (open apron)     │  DESCENDER        │  open yard +
 *   y = 73  ├───────────────────────────┤  (east annex)     │  control tower
 *           │  BOTTOM STROKE — front range + vehicle gate   │  guard block,
 *   y = 93  └──────────────────────────────────────────────┘  wall, gate
 *              x = 5                                  x = 91
 *
 * The counter between hall and front range is open apron, so the *massing*
 * (not the paint) draws the digit: top bar → hall, right descender → annex,
 * bottom bar → front range.  Every faction keeps that plan — it is the
 * building's identity — but each faction raises a different roof, tower, gate
 * and facade, so the silhouettes are genuinely different, not recoloured.
 *
 * ---------------------------------------------------------------------------
 * Aircraft clearances (asserted by tests/scale.test.js, drawn in the review)
 * ---------------------------------------------------------------------------
 *   clear bay     x 12..84 · y 7..47 · z 3..27  = 72 × 40 × 24 voxels
 *   door opening  x 12..66 · z 3..27            = 54 wide × 24 tall
 *   biggest fixed-wing unit (transport-plane)   = 36 × 38 × 20 voxels
 * so the largest aeroplane fits inside the bay nose-north (36 wide × 38 deep)
 * and nose-east (38 × 36) with room to spare, and clears the door lintel.
 */

const TEAM = '#df794b', TEAM_L = '#ffc68b', TEAM_D = '#934b32';

/**
 * The shared functional plan.  Models, tests and review figures all read these
 * numbers, so the "2" strokes, the bay and the aircraft clearances can never
 * drift apart.
 */
export const HANGAR_PLAN = Object.freeze({
  size: 96,
  /** Top stroke of the 2: the enclosed hangar hall. */
  hall: { x0: 5, x1: 91, y0: 3, y1: 51 },
  /** Structural interior (walls are outside this). */
  inner: { x0: 11, x1: 85, y0: 6, y1: 47 },
  /** Clear interior volume every faction must keep free of geometry. */
  bay: { x0: 12, x1: 84, y0: 7, y1: 47, z0: 3, z1: 27 },
  /** Door opening in the hall's south wall (must stay empty too). */
  door: { x0: 12, x1: 66, y0: 47, y1: 51, z0: 3, z1: 27 },
  /** Counter of the 2: open apron in front of the door. */
  court: { x0: 5, x1: 70, y0: 51, y1: 73 },
  /** Descender of the 2: east annex joining hall and front range. */
  spine: { x0: 70, x1: 91, y0: 51, y1: 73 },
  /** Bottom stroke of the 2: low front range with the vehicle gate. */
  front: { x0: 5, x1: 91, y0: 73, y1: 93 },
  /** Gate opening through the front range — the compound's service exit. */
  gate: { x0: 26, x1: 46, y0: 73, y1: 93, z0: 0, z1: 13 },
});

export const HANGAR_FACTIONS = Object.freeze(['standard', 'allies', 'soviets', 'empire', 'legion']);

/* ------------------------------------------------------------------ palettes - */

const BASE = {
  asphalt: '#33363a', asphaltL: '#585c60', asphaltD: '#26292d',
  mark: '#eceade', hazard: '#e5b93c', warn: '#d94c3d',
  glass: '#b8dedc', glassD: '#6b9496', steel: '#536958', steelL: '#8a8c70',
  rust: '#8c6b42', dark: '#3b4238',
};

const STYLES = {
  standard: {
    ...BASE,
    turf: '#6f8a4a', gravel: '#7a8062',
    pad: '#9aa0a2', padL: '#c4c9c6', padD: '#6b7566',
    wall: '#b4b8ac', wallL: '#d2d6c8', wallD: '#8a8c70',
    roof: '#5f6a60', roofL: '#828d80', roofD: '#3f4842',
    trim: '#938e70', trimL: '#c8c2a4', energy: '#e5b93c',
    hull: '#a8b09a', hullL: '#c6cec0', hullD: '#6f7768',
    bayFloor: '#4f564a', bayCeil: '#3f463d',
  },
  allies: {
    ...BASE,
    turf: '#8da47c', gravel: '#9aa294',
    pad: '#a8b4bc', padL: '#dde5ec', padD: '#64727e',
    wall: '#c6d0d8', wallL: '#eef3f6', wallD: '#8a98a4',
    roof: '#93a1ad', roofL: '#dde5ec', roofD: '#4c5a66',
    trim: '#3b6ea5', trimL: '#dfe6ea', energy: '#5fc4e8',
    hull: '#7d8a5a', hullL: '#a6b27a', hullD: '#5a6642',
    bayFloor: '#4c5560', bayCeil: '#3c444e',
  },
  soviets: {
    ...BASE,
    turf: '#7e8668', gravel: '#7a7268',
    pad: '#746c66', padL: '#a69a90', padD: '#4c4440',
    wall: '#8c8078', wallL: '#a69a90', wallD: '#4c4440',
    roof: '#6c625c', roofL: '#8c8078', roofD: '#3f3835',
    trim: '#e0b94a', trimL: '#c84434', energy: '#ff7730',
    hull: '#7a3b30', hullL: '#a85a48', hullD: '#4d2520',
    bayFloor: '#433d3a', bayCeil: '#332f2d',
  },
  empire: {
    ...BASE,
    turf: '#9cb084', gravel: '#a8a894',
    pad: '#d8d2c0', padL: '#f4f0e4', padD: '#86806c',
    wall: '#e6e2d2', wallL: '#f4f0e4', wallD: '#b8b29e',
    roof: '#2f4a7a', roofL: '#f4f0e4', roofD: '#1f3254',
    trim: '#2f4a7a', trimL: '#d4a238', energy: '#5fc4e8',
    hull: '#cfc9b6', hullL: '#ece8d8', hullD: '#8c8670',
    bayFloor: '#4d4a42', bayCeil: '#3c3a34',
  },
  legion: {
    ...BASE,
    turf: '#a49468', gravel: '#8e7e64',
    pad: '#8e7e64', padL: '#c2ae8c', padD: '#564a38',
    wall: '#a89272', wallL: '#c2ae8c', wallD: '#6e5a38',
    roof: '#8c6b42', roofL: '#c8b084', roofD: '#564a38',
    trim: '#2b2b2b', trimL: '#8c6b42', energy: '#ffd84a',
    hull: '#a58a5a', hullL: '#c4aa78', hullD: '#6e5a38',
    bayFloor: '#4a4136', bayCeil: '#3a332b',
  },
};

export const HANGAR_STYLES = STYLES;

/* ------------------------------------------------------------------- helpers - */

/** 1-voxel dark rim around a roof rectangle: the plan-view stroke outline. */
function fascia(c, x0, y0, x1, y1, z, colour) {
  c.box(x0, y0, z, x1, y0 + 1, z + 1, colour);
  c.box(x0, y1 - 1, z, x1, y1, z + 1, colour);
  c.box(x0, y0, z, x0 + 1, y1, z + 1, colour);
  c.box(x1 - 1, y0, z, x1, y1, z + 1, colour);
}

/** Ground pad: turf border, compacted gravel, asphalt yard and painted lanes. */
function groundPad(c, S) {
  c.box(0, 0, 0, 96, 96, 1, S.turf);
  c.box(1, 1, 0, 95, 95, 1, S.gravel);
  // Paved yard: light concrete apron (the "paper" around the dark 2 strokes).
  c.box(2, 47, 1, 94, 95, 3, S.pad);
  c.box(4, 49, 1, 92, 93, 3, S.padL);
  // Asphalt taxi lane from the door, through the courtyard and the gate.
  c.box(30, 47, 2, 52, 95, 3, S.asphaltL);
  c.box(34, 47, 2, 48, 95, 3, S.asphalt);
  // Concrete apron immediately in front of the door.
  c.box(8, 47, 2, 70, 62, 3, S.padL);
  // Taxiway: centre line from the door, through the courtyard and the gate.
  c.box(38, 47, 2, 42, 95, 3, S.mark);
  for (let y = 12; y < 95; y += 8) c.box(41, y, 2, 43, y + 4, 3, S.hazard);
  for (const y of [56, 66, 84]) {
    c.box(30, y, 2, 36, y + 2, 3, S.mark);
    c.box(46, y, 2, 52, y + 2, 3, S.mark);
  }
  // Apron edge line + open west taxi edge (aircraft tow in from the map side).
  c.box(5, 51, 2, 7, 73, 3, S.hazard);
  for (let y = 52; y < 72; y += 6) c.put(6, y, 3, S.mark);
  // Compass rose painted south of the gate, outside the counter.
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    c.put(Math.round(66 + Math.cos(a) * 5), Math.round(90 + Math.sin(a) * 5), 2, S.mark);
  }
  c.put(66, 90, 2, S.warn);
}

/** Hall floor: one solid slab across the footprint, top surface z = 2. */
function hallSlab(c, S) {
  const { hall } = HANGAR_PLAN;
  c.box(hall.x0, hall.y0, 0, hall.x1, hall.y1, 3, S.pad);
  // Dark maintenance-hall floor: reads as an interior through the open door.
  c.box(11, 6, 2, 85, 47, 3, S.bayFloor);
  // Painted floor: threshold hazard band, centre taxi line, aircraft parking box.
  c.box(12, 45, 2, 66, 47, 3, S.hazard);
  c.box(38, 12, 2, 42, 47, 3, S.mark);
  for (const [x0, y0, x1, y1] of [[16, 9, 60, 10], [16, 41, 60, 42], [16, 9, 17, 42], [59, 9, 60, 42]]) {
    c.box(x0, y0, 2, x1, y1, 3, S.mark);
  }
  for (const [x, y] of [[18, 11], [58, 11], [18, 40], [58, 40]]) c.put(x, y, 2, S.warn);
  // Service trench and floor drains along the west wall.
  for (let y = 12; y < 42; y += 8) c.box(13, y, 2, 15, y + 2, 3, S.asphaltD);
  // East maintenance bay: painted floor box only, so the clear volume stays clear.
  for (const [x0, y0, x1, y1] of [[68, 12, 82, 13], [68, 39, 82, 40], [68, 12, 69, 40], [81, 12, 82, 40]]) {
    c.box(x0, y0, 2, x1, y1, 3, S.hazard);
  }
  c.box(70, 28, 2, 80, 30, 3, S.mark);
}

/**
 * Trusses, ceiling and hanging lamps: all of it above the clear bay (z ≥ 27).
 */
function hallCeiling(c, S, { eaveZ }) {
  const { inner } = HANGAR_PLAN;
  c.box(inner.x0, inner.y0, 27, inner.x1, inner.y1, 29, S.bayCeil);
  for (let y = 10; y < 46; y += 6) {
    c.box(inner.x0, y, 29, inner.x1, y + 1, 31, S.steel);
    c.put(inner.x0 + 2, y, 31, S.steelL);
    c.put(inner.x1 - 3, y, 31, S.steelL);
  }
  c.box(inner.x0, 10, 30, inner.x0 + 1, 45, 31, S.steelL);
  c.box(inner.x1 - 2, 10, 30, inner.x1 - 1, 45, 31, S.steelL);
  for (let y = 14; y < 44; y += 8) {
    c.box(46, y, 28, 48, y + 1, 29, S.steel);
    c.box(44, y, 27, 50, y + 1, 28, S.mark);              // hanging lamp shade
  }
  c.box(inner.x0, inner.y0, eaveZ - 2, inner.x1, inner.y1, eaveZ, S.dark);
}

/**
 * The hall shell: walls, door opening, lintel, owner belt course, personnel
 * door and the dark interior faces that make the bay read as an interior.
 */
function hallShell(c, S, { eaveZ, bandZ = null, rearT = 3, wallT = 6 }) {
  const { hall, door, bay } = HANGAR_PLAN;
  c.box(hall.x0, hall.y0, 3, hall.x1, hall.y0 + rearT, eaveZ, S.wall);         // north wall
  c.box(hall.x0, hall.y1 - 4, 3, hall.x1, hall.y1, eaveZ, S.wall);             // south wall
  c.box(hall.x0, hall.y0, 3, hall.x0 + wallT, hall.y1, eaveZ, S.wall);         // west wall
  c.box(hall.x1 - wallT, hall.y0, 3, hall.x1, hall.y1, eaveZ, S.wall);         // east wall
  // Door opening (and the slab under it) — kept clear for the aircraft.
  c.clearBox(door.x0, door.y0, door.z0, door.x1, door.y1, door.z1);
  // Jamb reveals + lintel over the door.
  c.box(door.x0 - 3, hall.y1 - 4, 3, door.x0, hall.y1, door.z1, S.wallD);
  c.box(door.x1, hall.y1 - 4, 3, door.x1 + 3, hall.y1, door.z1, S.wallD);
  c.box(door.x0 - 3, hall.y1 - 4, door.z1, door.x1 + 3, hall.y1, door.z1 + 3, S.wallD);
  c.box(door.x0 - 3, hall.y1 - 1, door.z1 + 3, door.x1 + 3, hall.y1, door.z1 + 5, S.wallL);
  // Dark interior faces: west wall inner skin, rear wall inner skin, ceiling.
  c.box(bay.x0 - 1, 6, 3, bay.x0, bay.y1, bay.z1, S.bayCeil);
  c.box(bay.x0 - 1, bay.y0 - 1, 3, bay.x1 + 1, bay.y0, bay.z1, S.bayCeil);
  // Owner belt course: guaranteed visible in every cardinal facing.
  const bz = bandZ ?? eaveZ - 4;
  c.box(hall.x0, hall.y0, bz, hall.x1, hall.y0 + rearT, bz + 3, TEAM);
  c.box(hall.x0, hall.y1 - 4, bz, hall.x0 + 6, hall.y1, bz + 3, TEAM);
  c.box(hall.x1 - 6, hall.y1 - 4, bz, hall.x1, hall.y1, bz + 3, TEAM);
  c.box(hall.x0, hall.y0, bz, hall.x0 + wallT, hall.y1, bz + 3, TEAM);
  c.box(hall.x1 - wallT, hall.y0, bz, hall.x1, hall.y1, bz + 3, TEAM);
  // Personnel door on the east wall + roof-access hatch.
  c.box(hall.x1 - 2, 20, 3, hall.x1, 24, 9, S.dark);
  c.box(hall.x1 - 1, 20, 9, hall.x1, 24, 11, S.mark);
}

/**
 * Hangar doors: two sliding leaves parked outboard of the opening, the track
 * beam across the facade and an owner-coloured header sign.  Nothing sits in
 * the opening itself, so the bay and the aircraft stay unobstructed.
 */
function hangarDoors(c, S, { top }) {
  const { door, hall } = HANGAR_PLAN;
  const y0 = hall.y1 - 4, y1 = hall.y1 - 2;
  c.box(door.x0 - 2, y0, top + 2, door.x1 + 2, y1, top + 3, S.steelL);       // track beam
  for (const [x0, x1] of [[door.x0 - 12, door.x0], [door.x1, door.x1 + 12]]) {
    for (let z = 4; z < top; z++) c.box(x0, y0, z, x1, y1, z + 1, z % 2 ? S.steelL : S.steel);
    c.box(x0, y0, top, x1, y1, top + 2, S.steel);
    c.box(x0, y0, 6, x1, y0 + 1, 8, S.hazard);
    c.box(x0, y0, top - 6, x1, y0 + 1, top - 4, TEAM);
  }
  // Header sign above the opening.
  c.box(door.x0 + 6, y1, top + 4, door.x1 - 6, y1 + 1, top + 7, TEAM_D);
  c.box(door.x0 + 8, y1, top + 5, door.x1 - 8, y1 + 1, top + 6, TEAM_L);
  c.box(door.x0 + 6, hall.y1 + 1, 2, door.x1 - 6, hall.y1 + 3, 3, S.hazard);  // painted threshold
}

/**
 * The vehicle gate through the bottom stroke: two towers flanking a clear
 * passage, a bridge beam over it and a painted threshold.  The passage itself
 * is deliberately empty of geometry so the taxiway reads straight through the
 * compound (and so an aircraft-sized gap is never accidentally walled in).
 */
function gatehouse(c, S, {
  west = [21, 26], east = [46, 51], towerH = 17, beamZ0 = 13, beamZ1 = 16,
  tower = 'wallL', beam = 'wall', cap = 'roofD', threshold = true,
}) {
  const { front } = HANGAR_PLAN;
  // The gatehouse stays inside the bottom stroke: the open counter in front of
  // the hall is the "2"'s notch, so nothing tall may stand in it.
  // Square-ish pylons at the outer face of the bottom stroke rather than wall
  // stubs: a 5 × 6 plan reads as a gatehouse from the iso camera, where a deep
  // thin slab reads as a plain wall and hides behind the range it flanks.
  const gy = front.y1 - 6;
  for (const [x0, x1] of [west, east]) {
    c.box(x0, gy, 2, x1, front.y1, towerH, S[tower]);
    c.box(x0 - 1, gy - 1, towerH, x1 + 1, front.y1 + 1, towerH + 2, S[cap]);
    fascia(c, x0 - 1, gy - 1, x1 + 1, front.y1 + 1, towerH + 2, S.roofD);
    c.box(x0, gy, towerH - 5, x1, front.y1 - 1, towerH - 2, TEAM);
  }
  c.box(west[0], gy, beamZ0, east[1], front.y1, beamZ1, S[beam]);
  c.box(west[0] - 1, gy - 1, beamZ1, east[1] + 1, front.y1 + 1, beamZ1 + 2, S[cap]);
  fascia(c, west[0] - 1, gy - 1, east[1] + 1, front.y1 + 1, beamZ1 + 2, S.roofD);
  if (threshold) {
    c.box(26, 90, 2, 46, 92, 3, S.hazard);
    c.box(26, 91, 2, 46, 92, 3, S.mark);
  }
}

/** Ground clutter shared by every faction (drums, crates, cones). */
function yardClutter(c, S) {
  for (const [x, y] of [[63, 52], [66, 52], [68, 55], [64, 70]]) {
    c.cylZ(x, y, 2, 8, 1.6, S.rust);
    c.put(x, y, 8, S.steelL);
  }
  for (let i = 0; i < 3; i++) c.box(60 + i * 3, 68, 2, 62 + i * 3, 71, 7, i === 1 ? S.roofL : S.rust);
  for (const [x, y] of [[30, 54], [44, 66], [64, 53], [14, 58]]) {
    c.put(x, y, 2, S.hazard);
    c.put(x, y, 3, S.mark);
  }
  c.box(8, 68, 2, 14, 71, 6, S.padD);             // apron equipment crate
  c.box(9, 68, 6, 13, 71, 7, S.hazard);
}

/* ---------------------------------------------------------------- standard --- */

function hangarStandard(c, S) {
  const { hall, front, spine } = HANGAR_PLAN;
  groundPad(c, S);
  hallSlab(c, S);
  const eaveZ = 34;
  hallShell(c, S, { eaveZ });
  hallCeiling(c, S, { eaveZ });
  hangarDoors(c, S, { top: 27 });
  // Gully-sided steel gable roof, ridge along x at the hall centre.
  const midY = (hall.y0 + hall.y1) / 2;
  for (let y = hall.y0 - 1; y < hall.y1 + 1; y++) {
    const d = Math.abs(y + 0.5 - midY) / ((hall.y1 - hall.y0) / 2 + 1);
    const zt = Math.round(eaveZ + 8 * (1 - d));
    c.box(hall.x0 - 1, y, Math.max(eaveZ, zt - 1), hall.x1 + 1, y + 1, Math.max(eaveZ + 1, zt), S.roof);
    if (Math.abs(y + 0.5 - midY) < 2) c.box(hall.x0 - 1, y, zt, hall.x1 + 1, y + 1, zt + 1, S.roofL);
  }
  fascia(c, hall.x0 - 1, hall.y0 - 1, hall.x1 + 2, hall.y1 + 2, eaveZ, S.roofD);
  // Ridge ventilator + roof skylights + eave gutter.
  c.box(18, 24, eaveZ + 8, 40, 30, eaveZ + 11, S.roofD);
  c.box(20, 25, eaveZ + 11, 38, 29, eaveZ + 12, S.steelL);
  for (let x = 14; x < 82; x += 12) c.box(x, 10, eaveZ + 7, x + 4, 16, eaveZ + 8, S.glass);
  for (let x = 12; x < 84; x += 8) c.box(x, 44, eaveZ + 3, x + 3, 46, eaveZ + 4, S.glassD);
  // Control annex — the descender of the 2.
  c.box(spine.x0, spine.y0, 2, spine.x1, spine.y1, 36, S.wall);
  c.box(spine.x0 - 1, spine.y0 - 1, 36, spine.x1 + 1, spine.y1 + 1, 38, S.roof);
  fascia(c, spine.x0 - 1, spine.y0 - 1, spine.x1 + 1, spine.y1 + 1, 38, S.roofD);
  for (const y of [55, 61, 67]) c.box(spine.x0 - 1, y, 12, spine.x0 + 1, y + 4, 22, S.glass);
  c.box(spine.x0 + 3, spine.y0 + 3, 38, spine.x0 + 11, spine.y0 + 11, 40, S.wallL);
  c.box(spine.x0 + 4, spine.y0 + 4, 40, spine.x0 + 10, spine.y0 + 10, 42, S.glass);
  c.box(spine.x0 + 6, spine.y0 + 6, 42, spine.x0 + 8, spine.y0 + 8, 50, S.steelL);
  c.put(spine.x0 + 7, spine.y0 + 7, 50, TEAM);
  // Front range: low admin block, store and a gatehouse over the vehicle gate.
  c.box(front.x0, 76, 2, 24, front.y1, 14, S.wall);
  c.box(front.x0 - 1, 75, 14, 25, front.y1 + 1, 15, S.roof);
  fascia(c, front.x0 - 1, 75, 25, front.y1 + 1, 15, S.roofD);
  for (const x of [7, 14, 21]) c.box(x, 75, 6, x + 4, 76, 11, S.glass);
  c.box(48, 76, 2, 90, front.y1, 12, S.wallL);
  c.box(47, 75, 12, 91, front.y1 + 1, 13, S.roof);
  c.box(50, 75, 4, 58, 76, 10, S.dark);
  c.box(72, 88, 12, 74, 90, 30, S.steelL);        // radio mast
  c.box(71, 87, 30, 75, 91, 32, S.trimL);
  c.put(73, 89, 32, S.warn);
  gatehouse(c, S, { towerH: 22, beamZ0: 13, beamZ1: 16 });
  yardClutter(c, S);
}

/* ----------------------------------------------------------------- allies --- */

function hangarAllies(c, S) {
  const { hall, front, spine, bay, door } = HANGAR_PLAN;
  groundPad(c, S);
  hallSlab(c, S);
  const eaveZ = 36;
  hallShell(c, S, { eaveZ, wallT: 5, bandZ: eaveZ - 6 });
  hallCeiling(c, S, { eaveZ });
  hangarDoors(c, S, { top: 27 });
  // Clean panel joints, ribbon glazing and blue-steel corner posts.
  for (let x = hall.x0 + 6; x < hall.x1 - 4; x += 8) {
    if (x > door.x0 - 4 && x < door.x1 + 2) continue;          // never across the opening
    c.box(x, hall.y1 - 4, 3, x + 1, hall.y1, eaveZ, S.wallD);
  }
  for (let y = hall.y0 + 6; y < hall.y1 - 4; y += 8) {
    c.box(hall.x0, y, 3, hall.x0 + 1, y + 1, eaveZ, S.wallD);
    c.box(hall.x1 - 1, y, 3, hall.x1, y + 1, eaveZ, S.wallD);
  }
  for (const y of [9, 18, 27, 36]) {
    c.box(hall.x0, y, 24, hall.x0 + 1, y + 6, 32, S.glass);
    c.box(hall.x1 - 1, y, 24, hall.x1, y + 6, 32, S.glass);
  }
  for (const [x, y] of [[hall.x0, hall.y1 - 9], [hall.x1 - 5, hall.y1 - 9]]) {
    c.box(x, y, 3, x + 5, y + 5, eaveZ + 2, S.trim);
  }
  // Flat deck + clerestory monitor + parapet: crisp horizontal silhouette.
  c.box(hall.x0 - 2, hall.y0 - 2, eaveZ, hall.x1 + 2, hall.y1 + 2, eaveZ + 2, S.roofL);
  c.box(hall.x0 - 1, hall.y0 - 1, eaveZ + 2, hall.x1 + 1, hall.y1 + 1, eaveZ + 4, S.roof);
  c.box(14, 18, eaveZ + 4, 82, 34, eaveZ + 9, S.wallL);          // raised monitor
  c.box(15, 20, eaveZ + 5, 81, 32, eaveZ + 7, S.glass);
  c.box(13, 17, eaveZ + 9, 83, 35, eaveZ + 10, S.roof);
  fascia(c, 13, 17, 83, 35, eaveZ + 10, S.roofD);
  for (let x = 20; x < 78; x += 10) c.box(x, 19, eaveZ + 10, x + 4, 33, eaveZ + 11, x % 20 ? S.roof : S.trimL);
  // HVAC packs, solar strips and a mast on the deck.
  for (const [x, y] of [[10, 6], [24, 6], [64, 42], [78, 42]]) {
    c.box(x, y, eaveZ + 4, x + 6, y + 5, eaveZ + 7, S.wallL);
    c.box(x + 1, y + 1, eaveZ + 7, x + 5, y + 4, eaveZ + 8, S.steel);
  }
  for (let x = 8; x < 30; x += 4) c.box(x, 40, eaveZ + 4, x + 3, 48, eaveZ + 5, S.trim);
  c.box(84, 6, eaveZ + 4, 86, 8, eaveZ + 18, S.steelL);
  // Control annex with a glazed cab and a radome — the descender of the 2.
  c.box(spine.x0, spine.y0, 2, spine.x1, spine.y1, 40, S.wall);
  for (const y of [54, 60, 66, 72]) c.box(spine.x1 - 1, y, 14, spine.x1, y + 4, 28, S.glass);
  c.box(spine.x0 + 1, spine.y0 + 1, 28, spine.x1 - 1, spine.y0 + 2, 29, S.trim);
  c.box(spine.x0 - 1, spine.y0 - 1, 40, spine.x1 + 1, spine.y1 + 1, 42, S.roof);
  fascia(c, spine.x0 - 1, spine.y0 - 1, spine.x1 + 1, spine.y1 + 1, 42, S.roofD);
  c.box(spine.x0 + 3, spine.y0 + 3, 42, spine.x1 - 3, spine.y1 - 4, 48, S.glass);
  c.box(spine.x0 + 2, spine.y0 + 2, 48, spine.x1 - 2, spine.y1 - 3, 50, S.roof);
  c.box(spine.x0 + 6, spine.y0 + 6, 50, spine.x0 + 14, spine.y0 + 14, 52, S.trimL);
  for (let dz = 0; dz <= 4; dz++) {
    const r = Math.sqrt(Math.max(0, 18 - dz * dz));
    if (r >= 2) c.cylZ(spine.x0 + 10, spine.y0 + 10, 52 + dz, 53 + dz, r, dz ? S.wallL : S.trim);
  }
  c.put(spine.x0 + 10, spine.y0 + 10, 58, TEAM);
  // Glass-fronted admin block, floating gate canopy, clean bollards.
  c.box(front.x0, 78, 2, 24, front.y1, 14, S.wall);
  c.box(front.x0 + 1, 77, 14, 25, front.y1 + 1, 16, S.roofL);
  fascia(c, front.x0 + 1, 77, 25, front.y1 + 1, 16, S.roofD);
  for (let x = 6; x < 22; x += 5) c.box(x, 77, 6, x + 3, 78, 12, S.glass);
  c.box(52, 78, 2, 90, front.y1, 12, S.wallL);
  c.box(51, 77, 12, 91, front.y1 + 1, 14, S.roof);
  for (let x = 55; x < 88; x += 6) c.box(x, 77, 5, x + 3, 78, 10, S.glass);
  gatehouse(c, S, { towerH: 24, beamZ0: 13, beamZ1: 17, beam: 'roofL', cap: 'roof' });
  c.box(50, 86, 14, 52, 88, 24, S.energy);
  c.box(51, 87, 24, 53, 89, 26, S.trimL);
  yardClutter(c, S);
  // A faint runway-style guide line across the bay floor.
  c.box(bay.x0 + 2, bay.y0 + 1, 2, bay.x1 - 2, bay.y0 + 2, 3, S.mark);
}

/* ---------------------------------------------------------------- soviets --- */

function hangarSoviets(c, S) {
  const { hall, front, spine } = HANGAR_PLAN;
  groundPad(c, S);
  hallSlab(c, S);
  const eaveZ = 32;
  hallShell(c, S, { eaveZ, wallT: 7, bandZ: eaveZ - 6 });
  hallCeiling(c, S, { eaveZ });
  // Heavy barrel vault: profile in (x,z), crown over the hall centre.
  const midX = (hall.x0 + hall.x1) / 2;
  const radius = (hall.x1 - hall.x0) / 2 + 1;
  for (let x = hall.x0 - 1; x < hall.x1 + 1; x++) {
    const dx = (x + 0.5 - midX) / radius;
    const zt = Math.round(eaveZ + 12 * Math.sqrt(Math.max(0, 1 - dx * dx)));
    c.box(x, hall.y0 - 1, Math.max(eaveZ, zt - 2), x + 1, hall.y1 + 1, Math.max(eaveZ + 1, zt), S.roof);
  }
  // Arch ribs + crown vent + two boiler chimneys.
  for (let x = hall.x0 + 4; x < hall.x1; x += 12) {
    const dx = (x + 0.5 - midX) / radius;
    const zt = Math.round(eaveZ + 12 * Math.sqrt(Math.max(0, 1 - dx * dx)));
    c.box(x, hall.y0 - 1, Math.max(eaveZ, zt - 3), x + 2, hall.y1 + 1, zt + 1, S.roofL);
  }
  c.box(38, 20, eaveZ + 12, 58, 34, eaveZ + 16, S.roofD);
  c.box(40, 22, eaveZ + 16, 56, 32, eaveZ + 17, S.steelL);
  for (const [cx, cy] of [[12, 10], [84, 10]]) {
    c.cylZ(cx, cy, eaveZ, eaveZ + 16, 3.4, S.wallD);
    c.cylZ(cx, cy, eaveZ + 16, eaveZ + 18, 3.8, S.steel);
    c.put(cx, cy, eaveZ + 18, S.trim);
  }
  // Buttresses down both flanks and a thick portal frame around the door.
  for (let y = 8; y < 47; y += 9) {
    c.box(hall.x0 - 2, y, 2, hall.x0 + 2, y + 4, eaveZ - 4, S.wallD);
    c.box(hall.x1 - 2, y, 2, hall.x1 + 2, y + 4, eaveZ - 4, S.wallD);
  }
  const { door } = HANGAR_PLAN;
  c.box(door.x0 - 8, hall.y1 - 4, 3, door.x0 - 3, hall.y1 + 2, 31, S.wallD);
  c.box(door.x1 + 3, hall.y1 - 4, 3, door.x1 + 8, hall.y1 + 2, 31, S.wallD);
  c.box(door.x0 - 8, hall.y1 - 4, 31, door.x1 + 8, hall.y1 + 2, 35, S.wallD);
  c.box(door.x0 - 6, hall.y1 - 1, 34, door.x1 + 6, hall.y1 + 2, 36, S.wallL);
  c.box(door.x0 + 4, hall.y1 - 1, 31, door.x1 - 4, hall.y1 + 2, 33, S.trim);   // gold lintel band
  // Half-raised blast door leaf inside the portal.
  for (let x = door.x0 + 2; x < door.x1 - 1; x += 3) {
    c.box(x, hall.y1 - 6, 27, x + 2, hall.y1 - 4, 31, S.steel);
  }
  c.box(door.x0 + 2, hall.y1 - 6, 30, door.x1 - 2, hall.y1 - 4, 31, S.wallD);
  c.box(door.x0 - 12, hall.y1 - 4, 3, door.x0 - 2, hall.y1 - 2, 27, S.steelL);
  c.box(door.x1 + 2, hall.y1 - 4, 3, door.x1 + 12, hall.y1 - 2, 27, S.steelL);
  // Guard blocks, blast walls and a steel gate with a red star.
  c.box(front.x0, 76, 2, 26, front.y1, 13, S.wallD);
  c.box(front.x0 - 1, 75, 13, 27, front.y1 + 1, 15, S.roofD);
  fascia(c, front.x0 - 1, 75, 27, front.y1 + 1, 15, S.roofD);
  c.box(46, 76, 2, 90, front.y1, 14, S.wall);
  c.box(45, 75, 14, 91, front.y1 + 1, 16, S.roofD);
  c.box(48, 75, 3, 56, 76, 12, S.dark);
  gatehouse(c, S, {
    west: [20, 25], east: [47, 52], towerH: 26, beamZ0: 13, beamZ1: 18, tower: 'wall',
  });
  // Half-open steel blast gate parked against the west tower.
  for (let x = 26; x < 38; x += 2) c.box(x, 90, 2, x + 2, 92, 14, x % 4 ? S.steel : S.steelL);
  c.box(28, 90, 8, 36, 92, 12, S.trimL);
  c.put(32, 91, 10, TEAM_L);
  c.box(56, 72, 6, 58, 74, 30, S.hullD);          // banner mast
  c.box(56, 70, 16, 58, 72, 28, TEAM_D);
  c.box(56, 70, 18, 58, 72, 26, TEAM);
  // Battered control tower — the descender of the 2.
  c.box(spine.x0, spine.y0, 2, spine.x1, spine.y1, 24, S.wall);
  c.box(spine.x0 + 1, spine.y0 + 1, 24, spine.x1 - 1, spine.y1 - 1, 38, S.wallD);
  c.box(spine.x0 + 2, spine.y0 + 2, 38, spine.x1 - 2, spine.y1 - 2, 44, S.wall);
  for (const y of [55, 64]) c.box(spine.x0 - 1, y, 14, spine.x0 + 1, y + 6, 26, S.dark);
  c.box(spine.x0 + 1, spine.y0 + 1, 44, spine.x1 - 1, spine.y1 - 1, 46, S.roofD);
  fascia(c, spine.x0 + 1, spine.y0 + 1, spine.x1 - 1, spine.y1 - 1, 46, S.roofD);
  c.box(spine.x0 + 5, spine.y0 + 5, 46, spine.x1 - 5, spine.y1 - 5, 50, S.hull);
  c.box(spine.x0 + 7, spine.y0 + 7, 50, spine.x1 - 7, spine.y1 - 7, 53, S.trim);
  c.put(81, 55, 53, TEAM);
  yardClutter(c, S);
}

/* ----------------------------------------------------------------- empire --- */

function hangarEmpire(c, S) {
  const { hall, front, spine } = HANGAR_PLAN;
  groundPad(c, S);
  hallSlab(c, S);
  const eaveZ = 36;
  hallShell(c, S, { eaveZ, wallT: 6, bandZ: eaveZ - 8 });
  hallCeiling(c, S, { eaveZ });
  hangarDoors(c, S, { top: 27 });
  // Chamfer the hall's four corners: faceted, not rectangular.
  for (let i = 0; i < 8; i++) {
    for (const [x0, y0] of [[hall.x0, hall.y0 + i], [hall.x1 - 8 + i, hall.y0 + i],
      [hall.x0, hall.y1 - i - 1], [hall.x1 - 8 + i, hall.y1 - i - 1]]) {
      c.clearBox(x0, y0, 3, x0 + 8 - i, y0 + 1, eaveZ);
    }
  }
  for (let i = 0; i < 8; i++) {
    for (const [x0, y0] of [[hall.x0, hall.y0 + i], [hall.x1 - 8 + i, hall.y0 + i],
      [hall.x0, hall.y1 - i - 1], [hall.x1 - 8 + i, hall.y1 - i - 1]]) {
      c.box(x0, y0, 3, x0 + 8 - i, y0 + 1, eaveZ, S.wallL);
    }
  }
  // Pilasters + cobalt bands + cyan lamp strips.
  for (let y = 9; y < 47; y += 8) {
    c.box(hall.x0 + 1, y, 3, hall.x0 + 3, y + 2, eaveZ - 2, S.wallD);
    c.box(hall.x1 - 3, y, 3, hall.x1 - 1, y + 2, eaveZ - 2, S.wallD);
  }
  for (const y of [12, 24, 36]) {
    c.box(hall.x0, y, 22, hall.x0 + 2, y + 6, 28, S.glass);
    c.box(hall.x1 - 2, y, 22, hall.x1, y + 6, 28, S.glass);
    c.box(hall.x0, y + 6, 22, hall.x0 + 2, y + 7, 28, S.energy);
  }
  // Two-tier hip roof with upturned eaves and gold finials.
  for (const [z0, h, step] of [[eaveZ, 5, 2], [eaveZ + 5, 6, 3]]) {
    for (let i = 0; i <= h; i++) {
      const x0 = hall.x0 - 2 + i * step, x1 = hall.x1 + 2 - i * step;
      const y0 = hall.y0 - 2 + i * step, y1 = hall.y1 + 2 - i * step;
      if (x1 - x0 < 4 || y1 - y0 < 4) break;
      c.box(x0, y0, z0 + i, x1, y1, z0 + i + 1, i % 2 ? S.roofL : S.roof);
      if (i === 0) fascia(c, x0, y0, x1, y1, z0, S.roofD);
    }
  }
  for (const [x, y] of [[hall.x0 - 2, hall.y0 - 2], [hall.x1 + 1, hall.y0 - 2],
    [hall.x0 - 2, hall.y1 + 1], [hall.x1 + 1, hall.y1 + 1]]) {
    c.box(x, y, eaveZ, x + 2, y + 2, eaveZ + 7, S.trimL);       // upturned eave horns
    c.put(x, y, eaveZ + 8, TEAM);
  }
  // Central lantern over the bay.
  c.box(36, 16, eaveZ + 16, 60, 38, eaveZ + 20, S.roof);
  c.box(38, 18, eaveZ + 20, 58, 36, eaveZ + 22, S.roofL);
  c.box(44, 24, eaveZ + 22, 52, 30, eaveZ + 27, S.wallL);
  c.box(46, 26, eaveZ + 27, 50, 28, eaveZ + 28, S.trimL);
  c.put(48, 27, eaveZ + 29, TEAM);
  // Ceremonial door portal: stepped jambs, cyan threshold lamps.
  const { door } = HANGAR_PLAN;
  for (let i = 0; i < 3; i++) {
    c.box(door.x0 - 6 - i * 2, hall.y1 - 4, 3, door.x0 - 3 - i, hall.y1 + 1 - i, 34 - i * 2, S.wallL);
    c.box(door.x1 + 3 + i, hall.y1 - 4, 3, door.x1 + 6 + i * 2, hall.y1 + 1 - i, 34 - i * 2, S.wallL);
  }
  c.box(door.x0 - 8, hall.y1 - 4, 32, door.x1 + 8, hall.y1 + 2, 36, S.roof);
  c.box(door.x0 - 6, hall.y1, 34, door.x1 + 6, hall.y1 + 1, 35, S.trimL);
  for (const x of [door.x0 + 4, door.x1 - 6]) c.box(x, hall.y1, 3, x + 2, hall.y1 + 1, 12, S.energy);
  // Pagoda control tower — the descender of the 2.
  c.box(spine.x0 + 1, spine.y0 + 1, 2, spine.x1 - 1, spine.y1 - 1, 32, S.wall);
  for (let t = 0; t < 3; t++) {
    const z0 = 32 + t * 7;
    const inset = t * 2;
    c.box(spine.x0 - 2 + inset, spine.y0 - 2 + inset, z0, spine.x1 + 2 - inset, spine.y1 + 2 - inset, z0 + 2, S.roof);
    c.box(spine.x0 + 2 + inset, spine.y0 + 2 + inset, z0 + 2, spine.x1 - 2 - inset, spine.y1 - 2 - inset, z0 + 4, S.roofL);
    for (const [cx, cy] of [[spine.x0 - 2 + inset, spine.y0 - 2 + inset], [spine.x1 + 1 - inset, spine.y0 - 2 + inset],
      [spine.x0 - 2 + inset, spine.y1 + 1 - inset], [spine.x1 + 1 - inset, spine.y1 + 1 - inset]]) {
      c.box(cx, cy, z0, cx + 2, cy + 2, z0 + 5, S.trimL);
    }
  }
  c.box(spine.x0 + 4, spine.y0 + 4, 53, spine.x1 - 4, spine.y1 - 4, 58, S.energy);
  c.box(spine.x0 + 6, spine.y0 + 6, 58, spine.x1 - 6, spine.y1 - 6, 60, S.trimL);
  c.put(80, 62, 61, TEAM);
  for (const y of [55, 63, 71]) c.box(spine.x0, y, 12, spine.x0 + 2, y + 4, 24, S.glass);
  // Symmetric pavilions with lanterns and a lattice gate.
  c.box(front.x0, 78, 2, 24, front.y1, 14, S.wall);
  c.box(front.x0 - 1, 77, 14, 25, front.y1 + 1, 16, S.roof);
  c.box(48, 78, 2, 90, front.y1, 14, S.wall);
  c.box(47, 77, 14, 91, front.y1 + 1, 16, S.roof);
  fascia(c, front.x0 - 1, 77, 25, front.y1 + 1, 16, S.roofD);
  fascia(c, 47, 77, 91, front.y1 + 1, 16, S.roofD);
  for (const x of [7, 20, 52, 74, 87]) {
    c.box(x, 77, 3, x + 2, 79, 14, S.wallL);
    c.box(x, 77, 3, x + 2, 79, 6, S.energy);
  }
  gatehouse(c, S, { west: [21, 26], east: [46, 51], towerH: 28, beamZ0: 13, beamZ1: 18, beam: 'roof', cap: 'roofD' });
  for (const x of [21, 51]) {
    c.box(x - 1, 70, 22, x + 1, front.y1, 24, S.trimL);
    c.box(x, 72, 24, x + 1, front.y1, 26, S.energy);
  }
  for (let x = 28; x < 46; x += 3) c.box(x, 84, 8, x + 2, 86, 14, S.trimL);
  yardClutter(c, S);
}

/* ----------------------------------------------------------------- legion --- */

function hangarLegion(c, S) {
  const { hall, front, spine, door } = HANGAR_PLAN;
  groundPad(c, S);
  hallSlab(c, S);
  const eaveZ = 31;
  hallShell(c, S, { eaveZ, wallT: 6, bandZ: eaveZ - 6 });
  hallCeiling(c, S, { eaveZ });
  // Patched corrugated wall skin: alternating panel colours and rusted plates.
  for (let x = 12; x < 84; x += 3) {
    if (x > door.x0 - 4 && x < door.x1 + 2) continue;          // never across the opening
    const col = x % 9 < 3 ? S.wall : x % 9 < 6 ? S.roofL : S.wallL;
    c.box(x, hall.y1 - 4, 3, x + 1, hall.y1, eaveZ - 2, col);
  }
  for (const [x, y] of [[2, 12], [2, 26], [2, 38]]) {
    c.box(x, y, 6, x + 2, y + 8, 20, S.roofD);
    c.box(x, y + 2, 10, x + 1, y + 6, 16, S.rust);
  }
  for (const [x, y] of [[62, 51], [74, 51]]) {
    c.box(x, y, 6, x + 8, y + 2, 18, S.roofD);
    c.box(x + 2, y, 10, x + 6, y + 1, 15, S.rust);
  }
  // Exposed I-beam columns around the bay and a west lean-to.
  for (let y = 8; y < 47; y += 8) {
    c.box(hall.x0 - 1, y, 2, hall.x0 + 1, y + 2, eaveZ - 2, S.steel);
    c.box(hall.x1 - 1, y, 2, hall.x1 + 1, y + 2, eaveZ - 2, S.steel);
  }
  c.box(hall.x0 - 3, 28, 2, hall.x0, 44, 16, S.roofD);
  c.box(hall.x0 - 4, 27, 16, hall.x0 + 1, 45, 18, S.roofL);
  // Sliding doors, hand-painted warning stripes and a tarp flap.
  c.box(door.x0 - 13, hall.y1 - 4, 3, door.x0 - 2, hall.y1 - 2, 26, S.rust);
  c.box(door.x1 + 2, hall.y1 - 4, 3, door.x1 + 13, hall.y1 - 2, 26, S.roofD);
  c.box(door.x0 - 13, hall.y1 - 5, 20, door.x0 - 2, hall.y1 - 4, 24, S.roofL);
  c.box(door.x1 + 2, hall.y1 - 4, 20, door.x1 + 12, hall.y1 - 3, 24, S.roofL);
  c.box(door.x0 - 4, hall.y1 - 4, 27, door.x1 + 4, hall.y1 - 1, 30, S.trimL);
  // Three stepped shed roofs, all of them covering the bay: mismatched heights,
  // corrugated bands, bolted patch plates and one unrepaired hole over the
  // trusses.  Jagged silhouette, still a weatherproof hangar.
  const sections = [
    { x0: hall.x0 - 2, x1: 34, z: 27 },
    { x0: 32, x1: 62, z: 30 },
    { x0: 60, x1: hall.x1 + 2, z: 33 },
  ];
  for (const sec of sections) {
    for (let x = sec.x0; x < sec.x1; x++) {
      const t = (x - sec.x0) / Math.max(1, sec.x1 - sec.x0);
      const zt = Math.round(sec.z + t * 3);
      c.box(x, hall.y0 - 2, zt, x + 1, hall.y1 + 2, zt + 2, Math.floor(x / 4) % 2 ? S.roof : S.roofD);
      c.box(x, hall.y0 - 2, zt + 2, x + 1, hall.y0 - 1, zt + 3, S.roofD);
      c.box(x, hall.y1 + 1, zt + 2, x + 1, hall.y1 + 2, zt + 3, S.roofD);
    }
  }
  const roofTop = x => {
    const sec = sections.find(s => x >= s.x0 && x < s.x1) ?? sections[sections.length - 1];
    const t = (x - sec.x0) / Math.max(1, sec.x1 - sec.x0);
    return Math.round(sec.z + t * 3) + 2;
  };
  for (const [x0, y0, x1, y1, col] of [
    [10, 8, 22, 20, S.roofL], [56, 12, 70, 24, S.roofL], [74, 34, 86, 46, S.rust], [16, 30, 28, 44, S.roofL],
  ]) {
    const zt = roofTop(Math.round((x0 + x1) / 2));
    c.box(x0, y0, zt, x1, y1, zt + 1, col);
  }
  c.clearBox(38, 14, 33, 46, 24, 40);              // unrepaired hole over the trusses
  for (let x = 38; x < 46; x += 3) c.box(x, 14, 29, x + 1, 24, 31, S.steel);
  c.box(36, 12, 28, 48, 13, 31, S.steelL);
  c.box(22, 6, 28, 26, 8, 36, S.steelL);           // scaffold prop through the roof
  c.box(21, 5, 36, 27, 9, 37, S.rust);
  for (let x = 10; x < 22; x += 4) c.box(x, 18, eaveZ, x + 3, 22, eaveZ + 3, S.roofL);
  // Scaffold tower propping the east eave + a salvage crane at the west.
  for (const [x, y] of [[88, 28], [88, 46]]) c.box(x, y, 2, x + 2, y + 2, eaveZ + 8, S.steelL);
  c.box(88, 28, eaveZ + 6, 90, 48, eaveZ + 8, S.steel);
  for (let z = 8; z < eaveZ; z += 6) c.box(88, 28, z, 90, 48, z + 1, S.steelL);
  c.box(6, 50, 2, 9, 53, 36, S.steel);                             // crane mast
  c.box(9, 50, 33, 32, 53, 36, S.steelL);                          // jib
  c.box(28, 51, 22, 30, 52, 33, S.dark);                           // hoist
  c.box(28, 51, 16, 32, 52, 22, S.rust);
  c.put(8, 51, 37, TEAM);
  // Scrap gatehouse, containers, sandbags and a boom barrier.
  c.box(front.x0, 78, 2, 26, front.y1, 12, S.roofD);
  c.box(front.x0 - 1, 77, 12, 27, front.y1 + 1, 14, S.roofL);
  for (let x = 6; x < 25; x += 4) c.box(x, 77, 5, x + 2, 78, 10, S.dark);
  c.box(48, 78, 2, 90, front.y1, 11, S.wallD);
  c.box(47, 77, 11, 91, front.y1 + 1, 13, S.roof);
  fascia(c, 47, 77, 91, front.y1 + 1, 13, S.roofD);
  c.box(54, 76, 2, 70, 86, 12, S.rust);                            // container stack
  c.box(56, 75, 12, 68, 82, 20, S.roofD);
  gatehouse(c, S, {
    west: [21, 26], east: [46, 51], towerH: 20, beamZ0: 13, beamZ1: 16, tower: 'roofL', beam: 'roofD',
  });
  for (let x = 21; x < 51; x += 7) c.box(x, 69, 2, x + 5, 72, 6, S.roofL);     // sandbag cuff
  for (let x = 27; x < 45; x++) {
    if (x > 34 && x < 38) continue;                                             // bent barrier
    c.box(x, 86, 3, x + 1, 88, 8 + Math.round(2 * Math.sin(x / 5)), x % 4 ? S.steel : S.steelL);
  }
  c.box(26, 87, 8, 44, 88, 9, S.hazard);
  // Scaffold-walled control annex — the descender of the 2.
  c.box(spine.x0, spine.y0, 2, spine.x1, spine.y1, 22, S.wallD);
  for (const [x, y] of [[spine.x0, spine.y0], [spine.x1 - 2, spine.y0], [spine.x0, spine.y1 - 2], [spine.x1 - 2, spine.y1 - 2]]) {
    c.box(x, y, 2, x + 2, y + 2, 36, S.steel);
  }
  for (let z = 8; z < 36; z += 6) c.box(spine.x0, spine.y0, z, spine.x1, spine.y0 + 2, z + 1, S.steelL);
  c.box(spine.x0 + 1, spine.y0 + 1, 22, spine.x1 - 1, spine.y1 - 1, 30, S.wallD);
  c.box(spine.x0 - 1, spine.y0 - 1, 30, spine.x1 + 1, spine.y1 + 1, 32, S.roof);
  fascia(c, spine.x0 - 1, spine.y0 - 1, spine.x1 + 1, spine.y1 + 1, 32, S.roofD);
  c.box(spine.x0 + 4, spine.y0 + 4, 32, spine.x1 - 4, spine.y1 - 6, 38, S.roof);
  c.box(spine.x0 + 3, spine.y0 + 3, 38, spine.x1 - 3, spine.y1 - 5, 39, S.roofL);
  c.box(spine.x0 + 12, spine.y0 + 8, 39, spine.x0 + 14, spine.y0 + 10, 54, S.steelL);
  c.box(spine.x0 + 10, spine.y0 + 10, 46, spine.x0 + 16, spine.y0 + 12, 48, S.steel);
  c.put(spine.x0 + 13, spine.y0 + 9, 55, TEAM);
  c.box(spine.x0 + 1, spine.y1 - 1, 6, spine.x1 - 1, spine.y1, 18, S.rust);
  yardClutter(c, S);
}

/* --------------------------------------------------------------- dispatch --- */

const SCULPTORS = {
  standard: hangarStandard,
  allies: hangarAllies,
  soviets: hangarSoviets,
  empire: hangarEmpire,
  legion: hangarLegion,
};

/**
 * Enforces the two hard clearances after every faction pass: the bay and the
 * door opening are structural guarantees (an aircraft must fit and must not be
 * clipped), so stray decals or facade bands can never nibble into them.
 */
function sealClearances(c) {
  const { bay, door } = HANGAR_PLAN;
  c.clearBox(bay.x0, bay.y0, bay.z0, bay.x1, bay.y1, bay.z1);
  c.clearBox(door.x0, door.y0, door.z0, door.x1, door.y1, door.z1);
}

/**
 * Sculpts the hangar for one faction.  `armyId` is the playable faction
 * (`allies` …) or `standard` for the unaligned baseline model.
 */
export function hangarVoxels(c, armyId = 'standard') {
  const faction = SCULPTORS[armyId] ? armyId : 'standard';
  SCULPTORS[faction](c, STYLES[faction]);
  sealClearances(c);
}
