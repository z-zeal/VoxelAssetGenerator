/**
 * Map Editor controller with multi-height elevation painting (0..32 in 4-unit steps),
 * orthogonal terrain painting, unit/building placement, tile inspection, undo/redo stack,
 * and preset inspection scenes.
 */
import {
  ELEVATION_LEVELS, ELEVATION_STEP, MIN_ELEVATION, MAX_ELEVATION,
  validateElevation, elevationModelId, createMap, loadMapData,
  serializeMapData, inMapBounds, getTileElevation, setTileElevation,
  getTileTerrain, setTileTerrain, computeTileElevationFaces, isoToGrid,
} from './iso.js';

export const EDITOR_TERRAINS = Object.freeze([
  'plains',
  'tallgrass',
  'road',
  'bridge',
  'river',
  'sea',
  'shoal',
  'reef',
  'tree',
  'hill',
  'mountain',
  'snow-tile',
  'cracked-dry-ground',
  'marsh',
  'rubble',
  'silo',
  'volcano',
  'secret-lab',
  'wall',
  'wall-gate',
]);

export class MapElevationEditor {
  constructor(initialMap = null) {
    this.map = initialMap ? loadMapData(initialMap) : createMap({ width: 10, height: 10 });
    this.selectedHeight = 8;
    this.selectedTerrain = 'plains';
    this.selectedTool = 'paint-elevation'; // 'paint-elevation' | 'reset-elevation' | 'raise-elevation' | 'lower-elevation' | 'paint-terrain' | 'place-unit' | 'place-building' | 'inspect'
    this.brushSize = 1;
    this.selectedUnitType = 'tank';
    this.selectedUnitFacing = 'right';
    this.selectedUnitArmy = 'allies';
    this.selectedBuildingType = 'hq';
    this.selectedBuildingFacing = 'right';
    this.selectedBuildingArmy = 'allies';
    this.selectedOwner = 0;
    this.selectedTile = { x: 0, y: 0 };
    this.hoveredTile = null;
    this.undoStack = [];
    this.redoStack = [];
    this._activeStrokeSnapshot = null;
  }

  /**
   * Selects one of the 9 supported height levels: 0, 4, 8, 12, 16, 20, 24, 28, 32.
   */
  selectHeight(height) {
    validateElevation(height, 'selectedHeight');
    this.selectedHeight = height;
    return this.selectedHeight;
  }

  selectTerrain(terrainId) {
    if (!terrainId || typeof terrainId !== 'string') {
      throw new TypeError(`Invalid terrain ID: ${JSON.stringify(terrainId)}`);
    }
    this.selectedTerrain = terrainId;
    return this.selectedTerrain;
  }

  selectTool(tool) {
    this.selectedTool = tool;
    return this.selectedTool;
  }

  setBrushSize(size) {
    const s = Math.max(1, Math.min(5, Math.round(Number(size) || 1)));
    this.brushSize = s;
    return this.brushSize;
  }

  _cloneSnapshot() {
    return serializeMapData(this.map);
  }

  _pushUndo(snapshot = null) {
    this.undoStack.push(snapshot ?? this._cloneSnapshot());
    if (this.undoStack.length > 100) this.undoStack.shift();
    this.redoStack.length = 0;
  }

  beginStroke() {
    if (!this._activeStrokeSnapshot) {
      this._activeStrokeSnapshot = this._cloneSnapshot();
    }
  }

  endStroke() {
    if (this._activeStrokeSnapshot) {
      const before = JSON.stringify(this._activeStrokeSnapshot);
      const after = JSON.stringify(this._cloneSnapshot());
      if (before !== after) {
        this.undoStack.push(this._activeStrokeSnapshot);
        if (this.undoStack.length > 100) this.undoStack.shift();
        this.redoStack.length = 0;
      }
      this._activeStrokeSnapshot = null;
    }
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  undo() {
    if (!this.canUndo()) return false;
    this.redoStack.push(this._cloneSnapshot());
    const prev = this.undoStack.pop();
    this.map = loadMapData(prev);
    return true;
  }

  redo() {
    if (!this.canRedo()) return false;
    this.undoStack.push(this._cloneSnapshot());
    const next = this.redoStack.pop();
    this.map = loadMapData(next);
    return true;
  }

  _brushCoords(cx, cy) {
    const half = Math.floor((this.brushSize - 1) / 2);
    const coords = [];
    for (let dy = -half; dy < this.brushSize - half; dy++) {
      for (let dx = -half; dx < this.brushSize - half; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (inMapBounds(this.map, x, y)) coords.push([x, y]);
      }
    }
    return coords;
  }

  /**
   * Paints `height` (defaults to `this.selectedHeight`) onto tile `(x, y)` without
   * changing the tile's terrain type, ownership, units, or Fog of War.
   */
  paintElevation(x, y, height = this.selectedHeight, { recordUndo = true } = {}) {
    validateElevation(height, 'paintElevation height');
    if (!inMapBounds(this.map, x, y)) return false;
    if (recordUndo && !this._activeStrokeSnapshot) this._pushUndo();
    for (const [bx, by] of this._brushCoords(x, y)) {
      setTileElevation(this.map, bx, by, height);
    }
    this.selectedTile = { x, y };
    return true;
  }

  /**
   * Resets tile `(x, y)` (and brush area) back to baseline elevation 0 without changing terrain.
   */
  resetTileElevation(x, y, { recordUndo = true } = {}) {
    return this.paintElevation(x, y, 0, { recordUndo });
  }

  /**
   * Resets all tiles in the map to elevation 0 while preserving terrain, units, and properties.
   */
  resetAllElevation({ recordUndo = true } = {}) {
    if (recordUndo) this._pushUndo();
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        this.map.elevation[y][x] = 0;
      }
    }
    return true;
  }

  /**
   * Raises or lowers tile `(x, y)` by `deltaSteps * 4` voxel units (clamped to 0..32).
   */
  stepTileElevation(x, y, deltaSteps = 1, { recordUndo = true } = {}) {
    if (!inMapBounds(this.map, x, y)) return false;
    if (recordUndo && !this._activeStrokeSnapshot) this._pushUndo();
    for (const [bx, by] of this._brushCoords(x, y)) {
      const cur = getTileElevation(this.map, bx, by);
      const next = Math.max(MIN_ELEVATION, Math.min(MAX_ELEVATION, cur + deltaSteps * ELEVATION_STEP));
      setTileElevation(this.map, bx, by, next);
    }
    this.selectedTile = { x, y };
    return getTileElevation(this.map, x, y);
  }

  /**
   * Paints `terrainId` onto tile `(x, y)` without changing its elevation.
   */
  paintTerrain(x, y, terrainId = this.selectedTerrain, { recordUndo = true } = {}) {
    if (!inMapBounds(this.map, x, y)) return false;
    if (recordUndo && !this._activeStrokeSnapshot) this._pushUndo();
    for (const [bx, by] of this._brushCoords(x, y)) {
      setTileTerrain(this.map, bx, by, terrainId);
    }
    this.selectedTile = { x, y };
    return true;
  }

  /**
   * Places or replaces a unit on tile `(x, y)` (at whatever elevation the tile has).
   */
  placeUnit(x, y, {
    type = this.selectedUnitType,
    facing = this.selectedUnitFacing,
    army = this.selectedUnitArmy,
    owner = this.selectedOwner,
    recordUndo = true,
  } = {}) {
    if (!inMapBounds(this.map, x, y)) return false;
    if (recordUndo && !this._activeStrokeSnapshot) this._pushUndo();
    this.map.units = (this.map.units ?? []).filter(u => !(u.x === x && u.y === y));
    if (type) {
      this.map.units.push({ type, x, y, facing, army, owner });
    }
    this.selectedTile = { x, y };
    return true;
  }

  /**
   * Places or replaces a building/property on tile `(x, y)`.
   */
  placeBuilding(x, y, {
    type = this.selectedBuildingType,
    facing = this.selectedBuildingFacing,
    army = this.selectedBuildingArmy ?? this.selectedUnitArmy ?? 'standard',
    owner = this.selectedOwner,
    recordUndo = true,
  } = {}) {
    if (!inMapBounds(this.map, x, y)) return false;
    if (recordUndo && !this._activeStrokeSnapshot) this._pushUndo();
    this.map.properties = (this.map.properties ?? []).filter(p => !(p.x === x && p.y === y));
    if (type) {
      this.map.properties.push({ type, x, y, facing, army, owner });
    }
    this.selectedTile = { x: y != null ? x : 0, y };
    return true;
  }

  /**
   * Applies the currently active tool at grid tile `(x, y)`.
   */
  applyToolAt(x, y, { recordUndo = true } = {}) {
    if (!inMapBounds(this.map, x, y)) return false;
    switch (this.selectedTool) {
      case 'paint-elevation':
        return this.paintElevation(x, y, this.selectedHeight, { recordUndo });
      case 'reset-elevation':
        return this.resetTileElevation(x, y, { recordUndo });
      case 'raise-elevation':
        return this.stepTileElevation(x, y, +1, { recordUndo });
      case 'lower-elevation':
        return this.stepTileElevation(x, y, -1, { recordUndo });
      case 'paint-terrain':
        return this.paintTerrain(x, y, this.selectedTerrain, { recordUndo });
      case 'place-unit':
        return this.placeUnit(x, y, { recordUndo });
      case 'place-building':
        return this.placeBuilding(x, y, { recordUndo });
      case 'inspect':
      default:
        this.selectedTile = { x, y };
        return true;
    }
  }

  /**
   * Handles pointer/touch interaction in screen space `(screenX, screenY)`.
   */
  handlePointerAtScreen(screenX, screenY, { originX = 480, originY = 120, zoom = 1, apply = false } = {}) {
    const hit = isoToGrid(screenX, screenY, this.map, originX, originY, zoom);
    this.hoveredTile = hit ? { x: hit.x, y: hit.y, elevation: hit.elevation } : null;
    if (hit && apply) {
      this.applyToolAt(hit.x, hit.y);
    }
    return hit;
  }

  /**
   * Returns complete tile inspection data for status display and UI panels.
   */
  inspectTile(x = this.selectedTile?.x ?? 0, y = this.selectedTile?.y ?? 0) {
    if (!inMapBounds(this.map, x, y)) return null;
    const elevation = getTileElevation(this.map, x, y);
    const terrain = getTileTerrain(this.map, x, y);
    const faces = computeTileElevationFaces(this.map, x, y);
    const unit = (this.map.units ?? []).find(u => u.x === x && u.y === y) ?? null;
    const building = (this.map.properties ?? []).find(p => p.x === x && p.y === y) ?? null;
    const fog = Boolean(this.map.fog?.[y]?.[x]);
    return {
      x,
      y,
      terrain,
      elevation,
      elevationModel: elevationModelId(elevation),
      selectedEditorHeight: this.selectedHeight,
      edges: faces.edges,
      corners: faces.corners,
      unit,
      building,
      fog,
      statusText: `Tile (${x}, ${y}) | Terrain: ${terrain} | Height: ${elevation} vox (${elevationModelId(elevation)}) | Selected Brush: ${this.selectedHeight} vox`,
    };
  }

  loadPreset(presetName) {
    this._pushUndo();
    this.map = createPresetMap(presetName);
    this.selectedTile = { x: Math.floor(this.map.width / 2), y: Math.floor(this.map.height / 2) };
    return this.map;
  }
}

/**
 * Generates deterministic inspection maps covering every required elevation scenario:
 * - `showcase`: Combined battlefield with staircase (0..32), plateau, steep cliff, mixed corners, water/shoal, units & buildings
 * - `flat`: All tiles at elevation 0 with sea, shoal, river, roads, plains, units, buildings
 * - `single-raised`: Single raised tile (H = 16) surrounded by height 0
 * - `plateau`: Wide 4×4 plateau at height 20 with seamless interior joins
 * - `staircase`: 9-step staircase through 0, 4, 8, 12, 16, 20, 24, 28, 32
 * - `equal-neighbors`: Adjacent equal-height strips at 8, 16, 24, 32
 * - `steep-cliff`: Steep 0-to-32 sheer cliff drop
 * - `mixed-corners`: Multi-height corner junctions where 4 distinct heights meet
 */
export function createPresetMap(presetName = 'showcase') {
  if (presetName === 'flat') {
    const m = createMap({ width: 8, height: 8, name: 'Flat Baseline (Elevation 0)' });
    for (let y = 0; y < 8; y++) {
      m.terrain[y][0] = 'sea';
      m.terrain[y][1] = 'shoal';
      m.terrain[y][4] = 'road';
    }
    m.terrain[2][2] = 'tree';
    m.terrain[5][6] = 'mountain';
    m.properties.push({ type: 'hq', x: 3, y: 2, facing: 'right', owner: 0 });
    m.units.push({ type: 'tank', x: 4, y: 4, facing: 'down-right', army: 'allies', owner: 0 });
    return m;
  }

  if (presetName === 'single-raised') {
    const m = createMap({ width: 7, height: 7, name: 'Single Raised Tile (H=16)' });
    setTileElevation(m, 3, 3, 16);
    m.units.push({ type: 'tank', x: 3, y: 3, facing: 'right', army: 'standard', owner: 0 });
    return m;
  }

  if (presetName === 'plateau') {
    const m = createMap({ width: 8, height: 8, name: 'Wide Plateau (H=20)' });
    for (let y = 2; y <= 5; y++) {
      for (let x = 2; x <= 5; x++) {
        setTileElevation(m, x, y, 20);
      }
    }
    m.properties.push({ type: 'barracks', x: 3, y: 3, facing: 'right', owner: 0 });
    m.units.push({ type: 'commando', x: 4, y: 4, facing: 'down-right', army: 'allies', owner: 0 });
    m.units.push({ type: 'ifv', x: 2, y: 5, facing: 'down', army: 'soviets', owner: 1 });
    return m;
  }

  if (presetName === 'staircase') {
    const m = createMap({ width: 9, height: 6, name: 'Complete 9-Level Staircase (0..32)' });
    for (let x = 0; x < ELEVATION_LEVELS.length; x++) {
      const h = ELEVATION_LEVELS[x];
      for (let y = 1; y <= 4; y++) {
        setTileElevation(m, x, y, h);
        if (y === 2) m.terrain[y][x] = 'road';
      }
      if (x % 2 === 0) {
        m.units.push({
          type: x === 8 ? 'elite-hero' : x === 4 ? 'tank-destroyer' : 'infantry',
          x,
          y: 3,
          facing: 'right',
          army: 'standard',
          owner: x % 4 === 0 ? 0 : 1,
        });
      }
    }
    m.properties.push({ type: 'hq', x: 8, y: 1, facing: 'left', owner: 0 });
    return m;
  }

  if (presetName === 'equal-neighbors') {
    const m = createMap({ width: 8, height: 8, name: 'Adjacent Equal-Height Terraces' });
    const rowHeights = [0, 0, 8, 8, 16, 16, 24, 24];
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        setTileElevation(m, x, y, rowHeights[y]);
      }
    }
    return m;
  }

  if (presetName === 'steep-cliff') {
    const m = createMap({ width: 8, height: 8, name: 'Steep 0-to-32 Cliff Transition' });
    for (let y = 1; y <= 4; y++) {
      for (let x = 1; x <= 4; x++) {
        setTileElevation(m, x, y, 32);
      }
    }
    m.properties.push({ type: 'guard-tower', x: 4, y: 4, facing: 'right', owner: 0 });
    m.units.push({ type: 'artillery', x: 3, y: 4, facing: 'down-right', army: 'empire', owner: 0 });
    m.units.push({ type: 'recon', x: 5, y: 5, facing: 'up-left', army: 'legion', owner: 1 });
    return m;
  }

  if (presetName === 'mixed-corners') {
    const m = createMap({ width: 8, height: 8, name: 'Mixed-Height Corners & Multi-Level Junctions' });
    const grid = [
      [0,  4,  8,  12, 16, 16, 8,  0],
      [4,  8,  16, 20, 24, 20, 12, 4],
      [8,  16, 24, 28, 32, 24, 16, 8],
      [12, 20, 28, 32, 24, 16, 12, 4],
      [8,  16, 20, 16, 12, 8,  4,  0],
      [4,  12, 16, 12, 8,  4,  0,  0],
      [0,  4,  8,  4,  0,  0,  0,  0],
      [0,  0,  0,  0,  0,  0,  0,  0],
    ];
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        setTileElevation(m, x, y, grid[y][x]);
      }
    }
    m.properties.push({ type: 'radar-station', x: 4, y: 2, facing: 'right', owner: 0 });
    m.units.push({ type: 'heavy', x: 3, y: 3, facing: 'down-right', army: 'soviets', owner: 1 });
    m.units.push({ type: 'sniper', x: 2, y: 2, facing: 'down', army: 'allies', owner: 0 });
    return m;
  }

  // Default `showcase`: comprehensive 10×9 map combining staircase (0..32), wide plateau,
  // steep 0->32 cliff, mixed-height corners, coastline at height 0, buildings, and units.
  const m = createMap({ width: 10, height: 9, name: 'Elevation Showcase Battlefield (0..32)' });
  // Row 0..1: Complete 9-level staircase along x = 0..8 (0, 4, 8, 12, 16, 20, 24, 28, 32)
  for (let x = 0; x < 9; x++) {
    setTileElevation(m, x, 0, ELEVATION_LEVELS[x]);
    setTileElevation(m, x, 1, ELEVATION_LEVELS[x]);
    if (x >= 1 && x <= 7) m.terrain[1][x] = 'road';
  }
  // Steep 32 -> 0 cliff at (8, 1) -> (9, 1) and (8, 2)
  // Wide plateau at height 20 in x=1..4, y=3..5
  for (let y = 3; y <= 5; y++) {
    for (let x = 1; x <= 4; x++) {
      setTileElevation(m, x, y, 20);
      if (x === 2 && y === 4) m.terrain[y][x] = 'tallgrass';
    }
  }
  // Mixed-height stepped terraces in x=5..7, y=3..6
  setTileElevation(m, 5, 3, 28);
  setTileElevation(m, 6, 3, 24);
  setTileElevation(m, 7, 3, 16);
  setTileElevation(m, 5, 4, 16);
  setTileElevation(m, 6, 4, 12);
  setTileElevation(m, 7, 4, 8);
  setTileElevation(m, 5, 5, 8);
  setTileElevation(m, 6, 5, 4);

  // Coastline at height 0 along bottom rows y=7..8
  for (let x = 0; x < 10; x++) {
    m.terrain[7][x] = 'shoal';
    m.terrain[8][x] = 'sea';
  }
  m.terrain[3][8] = 'tree';
  m.terrain[5][8] = 'hill';

  // Buildings & Units on elevated and flat tiles across all 4 playable factions
  m.properties.push(
    { type: 'hq', x: 8, y: 0, facing: 'right', army: 'allies', owner: 0 },
    { type: 'barracks', x: 2, y: 3, facing: 'right', army: 'soviets', owner: 1 },
    { type: 'base', x: 3, y: 5, facing: 'down', army: 'empire', owner: 2 },
    { type: 'radar-station', x: 5, y: 3, facing: 'right', army: 'legion', owner: 3 },
  );
  m.units.push(
    { type: 'elite-hero', x: 8, y: 1, facing: 'down-left', army: 'allies', owner: 0 },
    { type: 'tank', x: 3, y: 4, facing: 'down-right', army: 'legion', owner: 3 },
    { type: 'ifv', x: 6, y: 3, facing: 'down', army: 'soviets', owner: 1 },
    { type: 'rocket-infantry', x: 5, y: 4, facing: 'right', army: 'empire', owner: 2 },
    { type: 'destroyer', x: 6, y: 8, facing: 'left', army: 'allies', owner: 1 },
  );
  return m;
}
