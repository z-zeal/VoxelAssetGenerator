/**
 * World-scale contract for the 128×128×128 voxel canvas and 32-unit tile grid.
 *
 * The pipeline used to author every model on the full 64³ cube treated as one
 * ground tile.  Under the new contract:
 *
 *   canvas         128 × 128 × 128 voxels (hard maximum for every model)
 *   ground tile     32 × 32 voxels  (one map cell)
 *   tile grid       4 × 4 tiles inside the canvas
 *   projection      128 × 64 px isometric diamond per tile (2:1)
 *                   ⇒ 4 px per voxel horizontally, 2 px vertically
 *                     (VOXEL_Z_PX = 2). The tile grew with the sprite density
 *                     so a 1×1 asset is drawn with the same pixel budget it had
 *                     before the tile shrank to 32 voxels — this is what keeps
 *                     small assets crisp instead of soft.
 *
 * Assets are still sculpted on their original authoring grids so the source art
 * stays readable — "design space" — and are *recalculated* into world voxels by
 * `resampleVoxels`.  Nothing is left to hard-coded 64-grid assumptions:
 * every model carries an explicit design grid, voxel scale, footprint, ground
 * anchor and clipping margin.
 *
 * Three sizes stay separate (docs/SCALE_128.md):
 *   modelBounds      actual painted voxel bounds inside 128³
 *   visualFootprint  ground area the rendered asset covers, in tiles
 *   gameplayFootprint cells occupied by placement / movement / collision
 */

export const MODEL_CANVAS = Object.freeze([128, 128, 128]);
export const TILE_UNITS = 32;
export const TILES_PER_AXIS = MODEL_CANVAS[0] / TILE_UNITS; // 4
export const TILE_SIZE_PX = Object.freeze([128, 64]);
export const VOXELS_PER_TILE = TILE_UNITS;

/**
 * Footprint classes allowed by the scale convention (tile units).
 * Buildings occupy whole cells; units may use quarter-tile steps because they
 * move on floating-point positions rather than a grid.
 */
export const FOOTPRINT_CLASSES = Object.freeze([
  // buildings: whole tiles
  [1, 1], [1, 2], [2, 1], [2, 2], [2, 3], [3, 2], [3, 3], [4, 4],
  // units: fractional, 0.5 … 1.25 tiles (free-floating movement, no grid lock)
  [0.5, 0.5], [0.75, 0.75], [1.25, 1.25],
]);

const UNIT_DESIGN = 64;
const SMALL_DESIGN = [32, 32];
const MEDIUM_DESIGN = [64, 64];
const LARGE_DESIGN = [96, 96];

/**
 * Building catalogue: footprint (tiles), authoring grid and design class.
 * Heights stay with the sculptors; `heightClass` documents the intended
 * visual hierarchy used by the sizing matrix and validation tests.
 */
export const BUILDING_SPECS = {
  /* 1×1 — compact defences, utility posts and small structures */
  landmine:               { footprint: [1, 1], design: SMALL_DESIGN, category: 'defense', heightClass: 'low' },
  pillbox:                { footprint: [1, 1], design: SMALL_DESIGN, category: 'defense', heightClass: 'low' },
  bunker:                 { footprint: [1, 1], design: SMALL_DESIGN, category: 'defense', heightClass: 'low' },
  'at-turret':            { footprint: [1, 1], design: SMALL_DESIGN, category: 'defense', heightClass: 'low' },
  'sam-site':             { footprint: [1, 1], design: SMALL_DESIGN, category: 'defense', heightClass: 'medium' },
  'flak-cannon':          { footprint: [1, 1], design: SMALL_DESIGN, category: 'defense', heightClass: 'medium' },
  'coastal-battery':      { footprint: [1, 1], design: SMALL_DESIGN, category: 'defense', heightClass: 'low' },
  'artillery-emplacement':{ footprint: [1, 1], design: SMALL_DESIGN, category: 'defense', heightClass: 'low' },
  'guard-tower':          { footprint: [1, 1], design: SMALL_DESIGN, category: 'defense', heightClass: 'tall' },

  /* 2×2 — standard production, economy and support facilities */
  base:                   { footprint: [2, 2], design: MEDIUM_DESIGN, category: 'production', heightClass: 'medium' },
  city:                   { footprint: [2, 2], design: MEDIUM_DESIGN, category: 'economy', heightClass: 'medium' },
  farm:                   { footprint: [2, 2], design: MEDIUM_DESIGN, category: 'economy', heightClass: 'low' },
  mine:                   { footprint: [2, 2], design: MEDIUM_DESIGN, category: 'economy', heightClass: 'medium' },
  depot:                  { footprint: [2, 2], design: MEDIUM_DESIGN, category: 'logistics', heightClass: 'medium' },
  'supply-depot':         { footprint: [2, 2], design: MEDIUM_DESIGN, category: 'logistics', heightClass: 'medium' },
  'repair-depot':         { footprint: [2, 2], design: MEDIUM_DESIGN, category: 'logistics', heightClass: 'medium' },
  'field-hospital':       { footprint: [2, 2], design: MEDIUM_DESIGN, category: 'support', heightClass: 'medium' },
  barracks:               { footprint: [2, 2], design: MEDIUM_DESIGN, category: 'production', heightClass: 'medium' },
  helipad:                { footprint: [2, 2], design: MEDIUM_DESIGN, category: 'support', heightClass: 'low' },
  'power-plant':          { footprint: [2, 2], design: MEDIUM_DESIGN, category: 'infrastructure', heightClass: 'tall' },
  refinery:               { footprint: [2, 2], design: MEDIUM_DESIGN, category: 'infrastructure', heightClass: 'tall' },
  'radar-station':        { footprint: [2, 2], design: MEDIUM_DESIGN, category: 'infrastructure', heightClass: 'tall' },
  'research-lab':         { footprint: [2, 2], design: MEDIUM_DESIGN, category: 'support', heightClass: 'medium' },

  /* major — command complexes and large facilities */
  hq:                     { footprint: [3, 3], design: LARGE_DESIGN, category: 'command', heightClass: 'major' },
  airport:                { footprint: [3, 3], design: LARGE_DESIGN, category: 'production', heightClass: 'major' },
  port:                   { footprint: [3, 2], design: [96, 64], category: 'logistics', heightClass: 'major' },
};

/**
 * Unit authoring stays at 64³ design resolution; the *world* size depends on the
 * unit's role. Footprints are given in tiles and are fractional because the game
 * moves units on free floating-point positions, not grid cells. The whole roster
 * lives inside **half a tile to one and a quarter tiles**:
 *
 *    0.50  infantry, dogs, dismounted squads        (16 world voxels)
 *    0.75  light vehicles, helicopters, transports   (24)
 *    1.00  tanks, jets, submarines, escorts          (32)
 *    1.25  artillery, capitals, strategic aircraft   (40)
 *
 * A rifleman is therefore half a tile wide while a battleship covers 1.25 tiles
 * — 6.25× the ground area — and no unit ever reaches a full 2×2 block, which is
 * reserved for buildings (2×2 facilities start at 64 world voxels).
 *
 * scale = footprint × TILE_UNITS / design, i.e. footprint / 2 for a 64³ design
 * grid: geometry is recalculated, never stretched (x/y/z share one factor).
 */
export const UNIT_SIZES = Object.freeze({
  /* 1.25 — the largest things on the map that are not buildings */
  artillery: 1.25, carrier: 1.25, battleship: 1.25, cruiser: 1.25,
  destroyer: 1.25, bomber: 1.25, 'transport-plane': 1.25, specter: 1.25,
  mpa: 1.25,

  /* 1.00 — tanks, SPAAGs, jets, submarines, escorts */
  tank: 1, heavy: 1, mega: 1, bastion: 1, 'flame-tank': 1,
  'amphibious-tank': 1, 'tank-destroyer': 1, 'mine-clearing': 1,
  'mine-layer': 1, antiair: 1, rockets: 1, missiles: 1,
  submarine: 1, gunboat: 1, 'missile-boat': 1, 'naval-repair': 1,
  'mine-layer-ship': 1, lander: 1, uhac: 1,
  fighter: 1, 'ground-attack-jet': 1, 'stealth-fighter': 1, 'spy-plane': 1,

  /* 0.75 — light vehicles, rotorcraft, transports */
  apc: 0.75, ifv: 0.75, aegis: 0.75, 'supply-truck': 0.75,
  'mobile-repair': 0.75, 'command-vehicle': 0.75, copter: 0.75,
  'lift-copter': 0.75, recon: 0.75, uav: 0.75,

  /* 0.50 — everything that walks */
  infantry: 0.5, mech: 0.5, engineer: 0.5, medic: 0.5,
  'rocket-infantry': 0.5, 'aa-infantry': 0.5, sniper: 0.5, grenadier: 0.5,
  flamethrower: 0.5, demolitionist: 0.5, commando: 0.5, officer: 0.5,
  spy: 0.5, 'elite-hero': 0.5, 'attack-dog': 0.5, scout: 0.5,
});

/** Smallest and largest footprint a unit may declare, in tiles. */
export const UNIT_MIN_FOOTPRINT = 0.5;
export const UNIT_MAX_FOOTPRINT = 1.25;

/** Footprint (tiles) for one unit id, defaulting by family. */
export function unitFootprint(id) {
  const base = id.includes('--') ? id.split('--')[0] : id;
  if (UNIT_SIZES[base] !== undefined) return [UNIT_SIZES[base], UNIT_SIZES[base]];
  return [0.5, 0.5];
}

/** Terrain cells: 64³ design → 32×32 world ground at half vertical scale, so
 *  props keep their historical proportions on the smaller tile.  The
 *  `elevation-*` blocks are the one exception: their z is the *world elevation
 *  level* (0,4,…,32) and must not be rescaled — see docs/SCALE_128.md §height. */
export const TERRAIN_SPEC = Object.freeze({
  footprint: [1, 1],
  design: [64, 64, 64],
  scale: [0.5, 0.5, 0.5],
});
export const ELEVATION_SPEC = Object.freeze({
  footprint: [1, 1],
  design: [64, 64, 64],
  scale: [0.5, 0.5, 1],
});

/** Projectiles / effects: same world scale as the units that fire them. */
export const EFFECT_SPEC = Object.freeze({
  footprint: [1, 1],
  design: [64, 64, 64],
  scale: [0.5, 0.5, 0.5],
});

export const TERRAIN_HEIGHT_CLASS = Object.freeze({
  tree: 'tall', mountain: 'tall', hill: 'medium', volcano: 'tall',
  'secret-lab': 'medium', silo: 'medium', 'silo-spent': 'low', reef: 'low',
});

const UNIT_HEIGHT_CLASS = {
  foot: 'human', tracked: 'vehicle', wheeled: 'vehicle', naval: 'ship',
  rotor: 'aircraft', jet: 'aircraft',
};

/** Footprint rect inside the 128 canvas, aligned to whole 32-unit tiles. */
export function footprintRect(footprint) {
  const [w, h] = footprint;
  const isInteger = Number.isInteger(w) && Number.isInteger(h);
  // Buildings keep whole-tile blocks on the tile grid; units (which move on
  // free float) may have fractional footprints, so their block is simply
  // centred in the canvas.
  const ox = isInteger ? Math.floor((TILES_PER_AXIS - w) / 2) : (TILES_PER_AXIS - w) / 2;
  const oy = isInteger ? Math.floor((TILES_PER_AXIS - h) / 2) : (TILES_PER_AXIS - h) / 2;
  return { tileX: ox, tileY: oy, x: ox * TILE_UNITS, y: oy * TILE_UNITS, w: w * TILE_UNITS, h: h * TILE_UNITS };
}

/**
 * Resolves the full scale spec for one model id.  `family` is the unit family
 * for units (foot / tracked / …) and the terrain id itself for terrain.
 */
export function modelSpec(id, kind, family = null) {
  const base = id.includes('--') ? id.split('--')[0] : id;
  if (kind === 'unit') {
    const footprint = unitFootprint(base);
    // One uniform factor for x/y/z: the silhouette keeps its proportions.
    const factor = (footprint[0] * TILE_UNITS) / UNIT_DESIGN;
    return finishSpec({
      kind, id, footprint, design: [UNIT_DESIGN, UNIT_DESIGN, UNIT_DESIGN],
      scale: [factor, factor, factor],
      category: family === 'foot' ? 'infantry' : (family ?? 'vehicle'),
      heightClass: UNIT_HEIGHT_CLASS[family] ?? 'vehicle',
      gameplayFootprint: footprint, visualFootprint: footprint, renderScale: 1,
    });
  }
  if (kind === 'building') {
    const spec = BUILDING_SPECS[base];
    if (!spec) throw new Error(`no building spec for ${base}`);
    const design = spec.design.length === 2 ? [spec.design[0], spec.design[1], 96] : spec.design;
    return finishSpec({
      kind, id, footprint: spec.footprint, design, scale: [1, 1, 1],
      category: spec.category, heightClass: spec.heightClass,
      gameplayFootprint: spec.footprint, visualFootprint: spec.footprint, renderScale: 1,
    });
  }
  if (kind === 'effect') {
    return finishSpec({
      kind, id, footprint: EFFECT_SPEC.footprint, design: EFFECT_SPEC.design,
      scale: EFFECT_SPEC.scale, category: 'effect', heightClass: 'effect',
      gameplayFootprint: [1, 1], visualFootprint: [1, 1], renderScale: 1,
    });
  }
  const isElevation = kind === 'terrain' && id.startsWith('elevation-');
  const terrainSpec = isElevation ? ELEVATION_SPEC : TERRAIN_SPEC;
  return finishSpec({
    kind, id, footprint: terrainSpec.footprint, design: terrainSpec.design,
    scale: terrainSpec.scale, category: 'terrain',
    heightClass: TERRAIN_HEIGHT_CLASS[base] ?? (base.startsWith('elevation-') ? 'medium' : 'ground'),
    gameplayFootprint: [1, 1], visualFootprint: [1, 1], renderScale: 1,
  });
}

function finishSpec(spec) {
  const [fw, fh] = spec.footprint;
  const rect = footprintRect(spec.footprint);
  const [dw, dh] = spec.design;
  const [sx, sy] = spec.scale;
  const worldW = dw * sx;
  const worldH = dh * sy;
  // Centre the resampled geometry inside its footprint tiling.
  const offset = [
    rect.x + Math.round((rect.w - worldW) / 2),
    rect.y + Math.round((rect.h - worldH) / 2),
    0,
  ];
  const anchor = [rect.x + (rect.w) / 2, rect.y + (rect.h) / 2, 0];
  return Object.freeze({
    ...spec,
    footprintTiles: [fw, fh],
    footprintRect: rect,
    worldSize: [worldW, worldH],
    offset: Object.freeze(offset),
    groundAnchor: Object.freeze(anchor),
    canvas: MODEL_CANVAS,
  });
}

/**
 * Recalculates design-space voxels into world voxels.
 *
 * Deterministic 2:1-aware resampler: each world cell accumulates the design
 * voxels that fall inside it, weighted by how much of their surface is exposed,
 * so silhouettes and surface detail survive while the world scale changes.
 * A world cell is painted when any design voxel maps into it (thin gun barrels
 * and antennae never disappear), and takes the dominant surface colour.
 */
export function resampleVoxels(voxels, spec) {
  const [sx, sy, sz] = spec.scale;
  const [ox, oy, oz] = spec.offset;
  const solid = new Set();
  for (const [x, y, z] of voxels) solid.add(`${x},${y},${z}`);

  const cells = new Map();
  for (const [x, y, z, color] of voxels) {
    const wx = Math.floor(x * sx + ox);
    const wy = Math.floor(y * sy + oy);
    const wz = Math.floor(z * sz + oz);
    if (wx < 0 || wx >= MODEL_CANVAS[0] || wy < 0 || wy >= MODEL_CANVAS[1] || wz < 0 || wz >= MODEL_CANVAS[2]) {
      continue; // geometry outside the canvas is a spec error caught by validateModel
    }
    let exposed = 1;
    if (!solid.has(`${x + 1},${y},${z}`)) exposed++;
    if (!solid.has(`${x - 1},${y},${z}`)) exposed++;
    if (!solid.has(`${x},${y + 1},${z}`)) exposed++;
    if (!solid.has(`${x},${y - 1},${z}`)) exposed++;
    if (!solid.has(`${x},${y},${z + 1}`)) exposed++;
    const key = `${wx},${wy},${wz}`;
    let cell = cells.get(key);
    if (!cell) {
      cell = { wx, wy, wz, weights: new Map(), best: null, bestWeight: -1, order: cells.size };
      cells.set(key, cell);
    }
    const weight = (cell.weights.get(color) ?? 0) + exposed * exposed;
    cell.weights.set(color, weight);
    if (weight > cell.bestWeight) {
      cell.bestWeight = weight;
      cell.best = color;
    }
  }
  const out = [];
  for (const cell of cells.values()) out.push([cell.wx, cell.wy, cell.wz, cell.best]);
  out.sort((a, b) => a[2] - b[2] || a[1] - b[1] || a[0] - b[0]);
  return out;
}

export function boundsOf(voxels) {
  if (!voxels.length) return { min: [0, 0, 0], max: [0, 0, 0], size: [0, 0, 0] };
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
  return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ], size: [maxX - minX + 1, maxY - minY + 1, maxZ - minZ + 1] };
}

/** Hard validation gates for one generated model (used by build + tests). */
export function validateModel(model) {
  const errors = [];
  const b = model.bounds;
  for (let i = 0; i < 3; i++) {
    if (b.min[i] < 0 || b.max[i] >= MODEL_CANVAS[i]) errors.push(`axis ${i} outside 128 canvas (${b.min[i]}..${b.max[i]})`);
  }
  const [fw, fh] = model.footprint;
  if (!FOOTPRINT_CLASSES.some(([w, h]) => w === fw && h === fh)) {
    errors.push(`footprint ${fw}×${fh} is not a supported tile increment`);
  }
  // Ground footprint alignment: every asset's ground corners are on 32-unit
  // tile boundaries (its footprintRect).  Props smaller than a tile keep their
  // geometry inside the cell.
  const rect = footprintRect([fw, fh]);
  if (b.min[0] < rect.x || b.max[0] > rect.x + rect.w - 1 || b.min[1] < rect.y || b.max[1] > rect.y + rect.h - 1) {
    // Overhang is allowed (aircraft wings) but must be declared and ≤ one tile.
    const pad = TILE_UNITS;
    if (b.min[0] < rect.x - pad || b.max[0] >= rect.x + rect.w + pad
      || b.min[1] < rect.y - pad || b.max[1] >= rect.y + rect.h + pad) {
      errors.push(`geometry ${b.size.join('×')} at ${b.min.join(',')} exceeds its declared footprint by more than one tile`);
    }
  }
  if (model.renderScale <= 0) errors.push('renderScale must be positive');
  return errors;
}
