/**
 * Isometric projection, multi-height terrain elevation math, neighbour-aware
 * cliff face topology, map elevation schema serialization, and depth sorting.
 *
 * Coordinate and scale conventions (matching tools/voxel_pipeline/bake.mjs):
 * - Runtime ground tile footprint is a 64×32 isometric diamond (HALF_W = 32, HALF_H = 16).
 * - Authoring voxel grid is 64×64×64 downsampled 4:1 (DOWNSCALE = 4).
 * - 1 voxel Z unit equals 0.5 runtime screen pixels vertically (VOXEL_Z_PX = 0.5).
 * - Supported elevation levels are voxel Z units: 0, 4, 8, 12, 16, 20, 24, 28, 32.
 * - Each 4-voxel step shifts the tile's top surface upward by 2 runtime pixels (-2 px in Y)
 *   with zero lateral (X) displacement.
 */

export const TILE_W = 64;
export const TILE_H = 32;
export const HALF_W = TILE_W / 2; // 32
export const HALF_H = TILE_H / 2; // 16
export const ISO_Z = 23;
export const VOXEL_GRID_SIZE = 64;
export const DOWNSCALE = 4;
export const VOXEL_Z_PX = 2 / DOWNSCALE; // 0.5 runtime px per voxel Z unit

export const ELEVATION_LEVELS = Object.freeze([0, 4, 8, 12, 16, 20, 24, 28, 32]);
export const ELEVATION_SET = new Set(ELEVATION_LEVELS);
export const MIN_ELEVATION = 0;
export const MAX_ELEVATION = 32;
export const ELEVATION_STEP = 4;

export const ELEVATION_MODEL_IDS = Object.freeze({
  0: 'elevation-00',
  4: 'elevation-04',
  8: 'elevation-08',
  12: 'elevation-12',
  16: 'elevation-16',
  20: 'elevation-20',
  24: 'elevation-24',
  28: 'elevation-28',
  32: 'elevation-32',
});

/**
 * Returns true iff `value` is one of the 9 supported voxel Z elevation levels:
 * 0, 4, 8, 12, 16, 20, 24, 28, 32.
 */
export function isValidElevation(value) {
  return typeof value === 'number' && Number.isInteger(value) && ELEVATION_SET.has(value);
}

/**
 * Validates that `value` is a supported elevation level. Throws a RangeError
 * if out-of-range or unsupported so invalid data never silently corrupts maps.
 */
export function validateElevation(value, context = 'elevation') {
  if (!isValidElevation(value)) {
    throw new RangeError(
      `Invalid ${context}: ${JSON.stringify(value)}. Supported voxel Z elevation levels are: ${ELEVATION_LEVELS.join(', ')}`
    );
  }
  return value;
}

/**
 * Snaps an arbitrary numeric value to the nearest valid elevation level in [0, 32].
 * Used only by explicit UI slider/step helpers; map deserialization uses strict `validateElevation`.
 */
export function snapElevation(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  const clamped = Math.max(MIN_ELEVATION, Math.min(MAX_ELEVATION, value));
  return Math.round(clamped / ELEVATION_STEP) * ELEVATION_STEP;
}

/**
 * Returns the canonical voxel model ID (`elevation-00` .. `elevation-32`) for a valid height.
 */
export function elevationModelId(height) {
  validateElevation(height, 'elevation height');
  return ELEVATION_MODEL_IDS[height];
}

/**
 * Converts voxel Z height (0..32) to runtime upward screen pixel offset (`height * 0.5 * zoom`).
 */
export function elevationPixelOffset(height = 0, zoom = 1) {
  validateElevation(height, 'elevation height');
  return height * VOXEL_Z_PX * zoom;
}

/**
 * Projects map grid coordinates `(x, y)` and voxel Z `elevation` to isometric screen coordinates.
 * Elevated ground shifts strictly along -Y and never drifts laterally along X.
 */
export function gridToIso(x, y, elevation = 0, originX = 0, originY = 0, zoom = 1) {
  validateElevation(elevation, 'gridToIso elevation');
  const baseX = originX + (x - y) * HALF_W * zoom;
  const baseY = originY + (x + y) * HALF_H * zoom;
  const elevOffset = elevation * VOXEL_Z_PX * zoom;
  return {
    x: baseX,
    y: baseY - elevOffset,
    baseX,
    baseY,
    elevation,
    elevOffset,
  };
}

/**
 * Returns the four vertices of a tile's 64×32 isometric top diamond at `(cx, cy)`.
 * Order: [top (N), right (E), bottom (S), left (W)].
 */
export function tileDiamondPoints(cx, cy, zoom = 1) {
  const hw = HALF_W * zoom;
  const hh = HALF_H * zoom;
  return [
    { x: cx, y: cy - hh },      // 0: top (North-West corner in voxel space x=0, y=0)
    { x: cx + hw, y: cy },      // 1: right (North-East corner in voxel space x=64, y=0)
    { x: cx, y: cy + hh },      // 2: bottom (South-East corner in voxel space x=64, y=64)
    { x: cx - hw, y: cy },      // 3: left (South-West corner in voxel space x=0, y=64)
  ];
}

/**
 * Tests whether screen point `(px, py)` lies inside the 64×32 isometric diamond centered at `(cx, cy)`.
 */
export function pointInDiamond(px, py, cx, cy, zoom = 1) {
  const dx = Math.abs(px - cx) / (HALF_W * zoom);
  const dy = Math.abs(py - cy) / (HALF_H * zoom);
  return dx + dy <= 1.000001;
}

/**
 * Tests whether screen point `(px, py)` lies inside the exposed front cliff walls (south or east)
 * of a raised tile at `(cx, topCy)` with exposed cliff height differentials `southDiff` and `eastDiff`.
 */
export function pointInTileCliff(px, py, cx, topCy, southDiff = 0, eastDiff = 0, zoom = 1) {
  const hw = HALF_W * zoom;
  const hh = HALF_H * zoom;
  if (px >= cx - hw && px <= cx && southDiff > 0) {
    const t = (px - (cx - hw)) / hw; // 0 at left vertex, 1 at bottom vertex
    const edgeY = topCy + t * hh;
    const dropPx = southDiff * VOXEL_Z_PX * zoom;
    if (py >= edgeY && py <= edgeY + dropPx) return true;
  }
  if (px >= cx && px <= cx + hw && eastDiff > 0) {
    const t = (px - cx) / hw; // 0 at bottom vertex, 1 at right vertex
    const edgeY = topCy + (1 - t) * hh;
    const dropPx = eastDiff * VOXEL_Z_PX * zoom;
    if (py >= edgeY && py <= edgeY + dropPx) return true;
  }
  return false;
}

/**
 * Converts screen coordinates `(screenX, screenY)` back to map grid `(x, y)` accounting for
 * raised tile elevations when a `map` (or `{ width, height, getElevation }`) is provided.
 * Searches in reverse painter order (front-to-back) so raised foreground tiles take precedence.
 */
export function isoToGrid(screenX, screenY, map = null, originX = 0, originY = 0, zoom = 1) {
  if (map && typeof map.width === 'number' && typeof map.height === 'number') {
    const cells = [];
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        cells.push({ x, y, depth: x + y });
      }
    }
    // Reverse painter order: front-most tiles tested first
    cells.sort((a, b) => b.depth - a.depth || b.y - a.y || b.x - a.x);
    for (const { x, y } of cells) {
      const h = getTileElevation(map, x, y);
      const pos = gridToIso(x, y, h, originX, originY, zoom);
      if (pointInDiamond(screenX, screenY, pos.x, pos.y, zoom)) {
        return { x, y, elevation: h, hitSurface: 'top' };
      }
      if (h > 0) {
        const faces = computeTileElevationFaces(map, x, y);
        if (pointInTileCliff(screenX, screenY, pos.x, pos.y, faces.edges.south.diff, faces.edges.east.diff, zoom)) {
          return { x, y, elevation: h, hitSurface: 'cliff' };
        }
      }
    }
    return null;
  }
  // Flat ground fallback (elevation 0)
  const dx = (screenX - originX) / (HALF_W * zoom);
  const dy = (screenY - originY) / (HALF_H * zoom);
  const gx = Math.round((dx + dy) * 0.5);
  const gy = Math.round((dy - dx) * 0.5);
  return { x: gx, y: gy, elevation: 0, hitSurface: 'top' };
}

/**
 * Creates a normalized map state object with separate `terrain`, `elevation`, `properties`,
 * `units`, and `fog` layers.
 */
export function createMap({
  width = 10,
  height = 10,
  defaultTerrain = 'plains',
  defaultElevation = 0,
  name = 'Untitled Map',
  terrain = null,
  elevation = null,
  properties = null,
  units = null,
  fog = null,
} = {}) {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new RangeError(`Invalid map dimensions: ${width}x${height}`);
  }
  validateElevation(defaultElevation, 'defaultElevation');

  const terrainGrid = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      if (Array.isArray(terrain)) {
        if (Array.isArray(terrain[y])) return String(terrain[y][x] ?? defaultTerrain);
        return String(terrain[y * width + x] ?? defaultTerrain);
      }
      return defaultTerrain;
    })
  );

  const elevationGrid = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      if (elevation == null) return defaultElevation;
      let raw;
      if (Array.isArray(elevation)) {
        raw = Array.isArray(elevation[y]) ? elevation[y][x] : elevation[y * width + x];
      } else {
        throw new RangeError('map.elevation must be a 2D or 1D array when provided');
      }
      if (raw === undefined || raw === null) return defaultElevation;
      return validateElevation(raw, `elevation[${y}][${x}]`);
    })
  );

  const fogGrid = fog
    ? Array.from({ length: height }, (_, y) =>
        Array.from({ length: width }, (_, x) =>
          Boolean(Array.isArray(fog[y]) ? fog[y][x] : fog[y * width + x])
        )
      )
    : null;

  return {
    format: 'field-command-map-1',
    name: String(name),
    width,
    height,
    terrain: terrainGrid,
    elevation: elevationGrid,
    properties: Array.isArray(properties) ? properties.map(p => ({ ...p })) : [],
    units: Array.isArray(units) ? units.map(u => ({ ...u })) : [],
    fog: fogGrid,
  };
}

/**
 * Loads map data (object or JSON string). Legacy maps that omit `elevation` load cleanly
 * with all tiles initialized to height 0 without mutating terrain, properties, units, or fog.
 */
export function loadMapData(input) {
  const raw = typeof input === 'string' ? JSON.parse(input) : input;
  if (!raw || typeof raw !== 'object') {
    throw new TypeError('Map data must be an object or JSON string');
  }
  const width = raw.width ?? (Array.isArray(raw.terrain?.[0]) ? raw.terrain[0].length : 0);
  const height = raw.height ?? (Array.isArray(raw.terrain) ? raw.terrain.length : 0);
  return createMap({
    width,
    height,
    name: raw.name ?? 'Untitled Map',
    terrain: raw.terrain,
    elevation: raw.elevation ?? null,
    properties: raw.properties ?? [],
    units: raw.units ?? [],
    fog: raw.fog ?? null,
  });
}

/**
 * Serializes a map state into a plain JSON-safe object preserving per-tile `elevation`
 * separately from `terrain`, `properties`, `units`, and `fog`.
 */
export function serializeMapData(map) {
  if (!map || typeof map !== 'object') throw new TypeError('Expected map object');
  const validated = loadMapData(map);
  return {
    format: 'field-command-map-1',
    name: validated.name,
    width: validated.width,
    height: validated.height,
    terrain: validated.terrain.map(row => [...row]),
    elevation: validated.elevation.map(row => [...row]),
    properties: validated.properties.map(p => ({ ...p })),
    units: validated.units.map(u => ({ ...u })),
    fog: validated.fog ? validated.fog.map(row => [...row]) : null,
  };
}

export function exportMapJson(map, pretty = true) {
  return JSON.stringify(serializeMapData(map), null, pretty ? 2 : 0);
}

export function importMapJson(jsonString) {
  return loadMapData(JSON.parse(jsonString));
}

export function inMapBounds(map, x, y) {
  return Boolean(map && x >= 0 && y >= 0 && x < map.width && y < map.height);
}

export function getTileElevation(map, x, y) {
  if (!inMapBounds(map, x, y)) return 0;
  const val = map.elevation?.[y]?.[x];
  if (val === undefined || val === null) return 0;
  return validateElevation(val, `elevation[${y}][${x}]`);
}

export function setTileElevation(map, x, y, height) {
  if (!inMapBounds(map, x, y)) {
    throw new RangeError(`Tile coordinates (${x}, ${y}) are out of map bounds (${map?.width}x${map?.height})`);
  }
  validateElevation(height, `setTileElevation(${x}, ${y})`);
  if (!Array.isArray(map.elevation)) {
    map.elevation = Array.from({ length: map.height }, () => Array(map.width).fill(0));
  }
  map.elevation[y][x] = height;
  return height;
}

export function getTileTerrain(map, x, y) {
  if (!inMapBounds(map, x, y)) return null;
  return map.terrain?.[y]?.[x] ?? 'plains';
}

export function setTileTerrain(map, x, y, terrainId) {
  if (!inMapBounds(map, x, y)) {
    throw new RangeError(`Tile coordinates (${x}, ${y}) are out of map bounds (${map?.width}x${map?.height})`);
  }
  if (!terrainId || typeof terrainId !== 'string') {
    throw new TypeError(`Invalid terrain ID: ${JSON.stringify(terrainId)}`);
  }
  map.terrain[y][x] = terrainId;
  return terrainId;
}

/**
 * Cardinal neighbour descriptors in isometric space:
 * - `north` (x, y - 1): upper-right diamond edge (top vertex -> right vertex)
 * - `east`  (x + 1, y): lower-right diamond edge (right vertex -> bottom vertex, front-right cliff)
 * - `south` (x, y + 1): lower-left diamond edge  (left vertex -> bottom vertex, front-left cliff)
 * - `west`  (x - 1, y): upper-left diamond edge  (top vertex -> left vertex)
 */
export const CARDINAL_NEIGHBORS = Object.freeze([
  { dir: 'north', dx: 0, dy: -1, faceShade: 0.94, frontFacing: false },
  { dir: 'east',  dx: 1, dy: 0,  faceShade: 0.86, frontFacing: true  },
  { dir: 'south', dx: 0, dy: 1,  faceShade: 0.72, frontFacing: true  },
  { dir: 'west',  dx: -1, dy: 0, faceShade: 0.80, frontFacing: false },
]);

/**
 * Computes neighbour-aware cliff face ownership and corner topology for tile `(x, y)`:
 * - If `H === N`: `exposed = false`, `diff = 0`, `owner = null` (no cliff between equal-height tiles).
 * - If `H > N`:  `exposed = true`, `diff = H - N`, `topZ = H`, `bottomZ = N`, `owner = 'self'`.
 * - If `H < N`:  `exposed = false`, `diff = 0`, `owner = 'neighbor'` (higher neighbour owns the shared edge;
 *                no duplicate wall is ever drawn on the lower tile).
 * - At map boundaries (`!inMapBounds(map, nx, ny)`), `neighborHeight = 0` and `isBoundary = true`.
 */
export function computeTileElevationFaces(map, x, y) {
  const H = getTileElevation(map, x, y);
  const edges = {};

  for (const { dir, dx, dy, faceShade, frontFacing } of CARDINAL_NEIGHBORS) {
    const nx = x + dx;
    const ny = y + dy;
    const isBoundary = !inMapBounds(map, nx, ny);
    const N = isBoundary ? 0 : getTileElevation(map, nx, ny);

    if (H === N) {
      edges[dir] = {
        dir,
        neighborX: nx,
        neighborY: ny,
        neighborHeight: N,
        isBoundary,
        exposed: false,
        diff: 0,
        diffSteps: 0,
        pixelHeight: 0,
        topZ: H,
        bottomZ: H,
        owner: null,
        frontFacing,
        faceShade,
      };
    } else if (H > N) {
      const diff = H - N;
      edges[dir] = {
        dir,
        neighborX: nx,
        neighborY: ny,
        neighborHeight: N,
        isBoundary,
        exposed: true,
        diff,
        diffSteps: diff / ELEVATION_STEP,
        pixelHeight: diff * VOXEL_Z_PX,
        topZ: H,
        bottomZ: N,
        owner: 'self',
        frontFacing,
        faceShade,
      };
    } else {
      edges[dir] = {
        dir,
        neighborX: nx,
        neighborY: ny,
        neighborHeight: N,
        isBoundary,
        exposed: false,
        diff: 0,
        diffSteps: 0,
        pixelHeight: 0,
        topZ: H,
        bottomZ: H,
        owner: 'neighbor',
        frontFacing,
        faceShade,
      };
    }
  }

  // Corner junction analysis for all 4 diamond vertices (top/NW, right/NE, bottom/SE, left/SW)
  const hNW = inMapBounds(map, x - 1, y - 1) ? getTileElevation(map, x - 1, y - 1) : 0;
  const hNE = inMapBounds(map, x + 1, y - 1) ? getTileElevation(map, x + 1, y - 1) : 0;
  const hSE = inMapBounds(map, x + 1, y + 1) ? getTileElevation(map, x + 1, y + 1) : 0;
  const hSW = inMapBounds(map, x - 1, y + 1) ? getTileElevation(map, x - 1, y + 1) : 0;

  const makeCorner = (corner, nA, nB, nDiag) => {
    const heights = [H, nA, nB, nDiag];
    const minZ = Math.min(...heights);
    const maxZ = Math.max(...heights);
    // Front spine (SE bottom vertex) where south and east cliff walls meet:
    // sharedSpineTopZ .. sharedSpineBottomZ is the continuous vertical ridge where both faces meet.
    const sharedBottomZ = Math.max(nA, nB);
    return {
      corner,
      heights,
      minZ,
      maxZ,
      spanZ: maxZ - minZ,
      sharedRidgeTopZ: H,
      sharedRidgeBottomZ: Math.min(H, sharedBottomZ),
      seamless: true,
    };
  };

  const corners = {
    top: makeCorner('top', edges.north.neighborHeight, edges.west.neighborHeight, hNW),
    right: makeCorner('right', edges.north.neighborHeight, edges.east.neighborHeight, hNE),
    bottom: makeCorner('bottom', edges.south.neighborHeight, edges.east.neighborHeight, hSE),
    left: makeCorner('left', edges.south.neighborHeight, edges.west.neighborHeight, hSW),
  };

  return {
    x,
    y,
    height: H,
    modelId: elevationModelId(H),
    edges,
    corners,
    hasExposedCliffs: edges.north.exposed || edges.east.exposed || edges.south.exposed || edges.west.exposed,
    hasFrontCliffs: edges.east.exposed || edges.south.exposed,
  };
}

/**
 * Builds the full elevation transition descriptor mesh across an entire map.
 */
export function computeMapElevationMesh(map) {
  const cells = [];
  for (let y = 0; y < map.height; y++) {
    const row = [];
    for (let x = 0; x < map.width; x++) {
      row.push(computeTileElevationFaces(map, x, y));
    }
    cells.push(row);
  }
  return cells;
}

/**
 * Computes the screen-space ground anchor, shadow position, selection marker diamond,
 * and sprite draw position for a unit or building standing on tile `(x, y)` of `map`.
 */
export function getEntityRenderPosition(map, entity, originX = 0, originY = 0, zoom = 1) {
  const x = entity.x;
  const y = entity.y;
  const elevation = getTileElevation(map, x, y);
  const iso = gridToIso(x, y, elevation, originX, originY, zoom);
  return {
    gridX: x,
    gridY: y,
    elevation,
    anchorX: iso.x,
    anchorY: iso.y,
    baseX: iso.baseX,
    baseY: iso.baseY,
    elevOffset: iso.elevOffset,
    shadowX: iso.x,
    shadowY: iso.y,
    selectionDiamond: tileDiamondPoints(iso.x, iso.y, zoom),
  };
}

/**
 * Painter's algorithm comparator for isometric tiles and objects:
 * sorts back-to-front by `(x + y)`, then `y`, then `x`, then `layerOrder`
 * (`0` = cliff + top ground surface, `1` = terrain prop / building, `2` = shadow/selection, `3` = unit).
 */
export function compareIsoDepth(a, b) {
  const da = a.x + a.y;
  const db = b.x + b.y;
  if (da !== db) return da - db;
  if (a.y !== b.y) return a.y - b.y;
  if (a.x !== b.x) return a.x - b.x;
  return (a.layerOrder ?? 0) - (b.layerOrder ?? 0);
}

export function sortRenderQueue(items) {
  return [...items].sort(compareIsoDepth);
}
