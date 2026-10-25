/**
 * Isometric RTS Renderer with Multi-Height Terrain Elevation (0..32 voxel Z units),
 * Neighbour-Aware Cliff Transitions, Preserved Height-0 Coast/Water Shimmer,
 * 4-Direction Buildings, and 8-Direction Units.
 */
import {
  TILE_W, TILE_H, HALF_W, HALF_H, VOXEL_Z_PX, ELEVATION_STEP,
  ELEVATION_LEVELS, elevationModelId, gridToIso, tileDiamondPoints,
  getTileElevation, getTileTerrain, computeTileElevationFaces,
  getEntityRenderPosition, compareIsoDepth,
} from './iso.js';
import { drawShoalIso, drawWaterShimmer } from './coast.js';
import {
  unitSheetKey, buildingSheetKey, fortificationSheetKey, resolveEntityArmy,
} from './armies.js';

export const TERRAIN_PALETTES = {
  plains:               { top: '#7ba358', alt: '#8fb86a', dark: '#5e7d3b', tuft: '#a0c27a' },
  tallgrass:            { top: '#6b8f4e', alt: '#8aaf68', dark: '#4a6330', tuft: '#8fa860' },
  road:                 { top: '#6e9049', alt: '#7ba358', dark: '#33363a', tuft: '#e9e7df' },
  bridge:               { top: '#2b6e8a', alt: '#e1cf98', dark: '#7a5a3a', tuft: '#b89562' },
  river:                { top: '#3a84a8', alt: '#4d98bc', dark: '#2b6e8a', tuft: '#8fd4f0' },
  sea:                  { top: '#2b6e8a', alt: '#356e8a', dark: '#1f556e', tuft: '#7ec8e8' },
  shoal:                { top: '#d6c48e', alt: '#c8b086', dark: '#b08d6a', tuft: '#6e9ba8' },
  reef:                 { top: '#3b7d90', alt: '#657068', dark: '#2b5e6e', tuft: '#e2f6f8' },
  tree:                 { top: '#5a6642', alt: '#648f48', dark: '#3f693b', tuft: '#a8c97a' },
  hill:                 { top: '#709e46', alt: '#8fb268', dark: '#5a6450', tuft: '#a8c97a' },
  mountain:             { top: '#6d7859', alt: '#838e70', dark: '#5a6450', tuft: '#efebca' },
  'snow-tile':          { top: '#dce4eb', alt: '#cfd6dc', dark: '#a8b5bf', tuft: '#ffffff' },
  'cracked-dry-ground': { top: '#c49a72', alt: '#d4b896', dark: '#9e7348', tuft: '#5a4430' },
  marsh:                { top: '#6b5a4a', alt: '#5a7a4a', dark: '#584232', tuft: '#7a9e5a' },
  rubble:               { top: '#7d8572', alt: '#9e9788', dark: '#525b64', tuft: '#8c96a0' },
  silo:                 { top: '#7c8578', alt: '#98a098', dark: '#586064', tuft: '#e5b93c' },
  'silo-spent':         { top: '#7c8578', alt: '#98a098', dark: '#586064', tuft: '#6b757e' },
  volcano:              { top: '#4a3c2e', alt: '#5c4632', dark: '#2c231c', tuft: '#ff8c3a' },
  'secret-lab':         { top: '#6a7278', alt: '#4c555c', dark: '#2b3a3f', tuft: '#4ac2c9' },
  wall:                 { top: '#5a6352', alt: '#8c9098', dark: '#5a5e66', tuft: '#c2c6ce' },
  'wall-gate':          { top: '#484e56', alt: '#8c9098', dark: '#5a5e66', tuft: '#e5b93c' },
};

// Voxel cliff colours matching tools/voxel_pipeline/models/terrain.mjs & bake.mjs face shading:
// South-West (`south`) face uses 0.72× shade; South-East (`east`) face uses 0.86× shade.
const CLIFF_STYLE = {
  south: {
    rockBase: '#584c41',
    rockAlt: '#63584c',
    rockHighlight: '#71675d',
    seam: '#41352a',
    joint: '#3b322a',
    loam: '#4d412a',
    turfOverhang: '#445a2a',
  },
  east: {
    rockBase: '#695b4d',
    rockAlt: '#77695b',
    rockHighlight: '#887c70',
    seam: '#4d3f32',
    joint: '#473c32',
    loam: '#5c4d32',
    turfOverhang: '#516c33',
  },
};

const TEAM_COLORS = ['#df794b', '#639bc3', '#7eb06a', '#d9b44e', '#c65a54', '#8a6bc3'];

const sheetCache = new Map();

/**
 * Lazy sheet loader for browser environments.
 */
export function sheetFor(file, basePath = 'game_assets/voxels/sheets') {
  const url = `${basePath}/${file}`;
  if (sheetCache.has(url)) return sheetCache.get(url);
  if (typeof Image === 'undefined') return null;
  const img = new Image();
  img.src = url;
  sheetCache.set(url, img);
  return img;
}

/**
 * Blits one frame of a baked voxel sprite strip anchored at `(anchorX, anchorY)`.
 */
export function blitSheet(ctx, manifest, modelId, facing = 'right', variant = '0', frameIndex = 0, anchorX = 0, anchorY = 0, zoom = 1, basePath = 'game_assets/voxels/sheets') {
  const modelEntry = manifest?.models?.[modelId];
  if (!modelEntry) return false;
  const facingEntry = modelEntry[facing] ?? modelEntry.right;
  if (!facingEntry) return false;
  const variantEntry = facingEntry.variants?.[variant] ?? facingEntry.variants?.['0'] ?? facingEntry.variants?.n;
  if (!variantEntry) return false;
  const img = sheetFor(variantEntry.file, basePath);
  if (!img || !img.complete || img.naturalWidth === 0) return false;

  const frames = facingEntry.frames ?? [];
  const f = frames[Math.min(frameIndex, Math.max(0, frames.length - 1))] ?? {
    x: 0, y: 0, w: facingEntry.cell?.w ?? facingEntry.width, h: facingEntry.cell?.h ?? facingEntry.height,
    anchorX: facingEntry.anchorX, anchorY: facingEntry.anchorY,
  };
  const destX = Math.round(anchorX - f.anchorX * zoom);
  const destY = Math.round(anchorY - f.anchorY * zoom);
  const destW = Math.round(f.w * zoom);
  const destH = Math.round(f.h * zoom);
  ctx.drawImage(img, f.x, f.y, f.w, f.h, destX, destY, destW, destH);
  return true;
}

/**
 * Computes the 4-bit road connector mask for a road tile at `(x, y)`.
 */
export function roadConnectorMask(map, x, y) {
  let mask = 0;
  const isRoadLike = (nx, ny) => {
    const t = getTileTerrain(map, nx, ny);
    return t === 'road' || t === 'bridge' || t === 'wall-gate';
  };
  if (isRoadLike(x, y - 1)) mask |= 1;
  if (isRoadLike(x + 1, y)) mask |= 2;
  if (isRoadLike(x, y + 1)) mask |= 4;
  if (isRoadLike(x - 1, y)) mask |= 8;
  return mask;
}

/**
 * Draws the exposed cliff walls for tile `(x, y)` at `(cx, topCy)` strictly for edges
 * where `H > N` (with vertical drop `diff = H - N`).
 *
 * Returns an array of drawn cliff face records for inspection and testing.
 */
export function drawTileExposedCliffs(ctx, faces, cx, topCy, zoom = 1) {
  const hw = HALF_W * zoom;
  const hh = HALF_H * zoom;
  const drawnCliffs = [];

  // 1. South-West (`south`) cliff face: from Left vertex (cx - hw, topCy) to Bottom vertex (cx, topCy + hh)
  const south = faces.edges.south;
  if (south.exposed && south.diff > 0) {
    const dropPx = south.diff * VOXEL_Z_PX * zoom;
    const style = CLIFF_STYLE.south;
    const xL = cx - hw, yL = topCy;
    const xB = cx,      yB = topCy + hh;

    if (ctx) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(xL, yL);
      ctx.lineTo(xB, yB);
      ctx.lineTo(xB, yB + dropPx);
      ctx.lineTo(xL, yL + dropPx);
      ctx.closePath();
      ctx.fillStyle = style.rockBase;
      ctx.fill();

      // Stratified 4-voxel terrace bands from topZ down to bottomZ
      const steps = south.diff / ELEVATION_STEP;
      const stepPx = ELEVATION_STEP * VOXEL_Z_PX * zoom; // 2 * zoom px per 4-voxel step
      for (let s = 0; s < steps; s++) {
        const bandTopOffset = s * stepPx;
        const bandBotOffset = (s + 1) * stepPx;
        // Alternate warm sandstone / limestone tone per stratum
        ctx.beginPath();
        ctx.moveTo(xL, yL + bandTopOffset);
        ctx.lineTo(xB, yB + bandTopOffset);
        ctx.lineTo(xB, yB + bandBotOffset);
        ctx.lineTo(xL, yL + bandBotOffset);
        ctx.closePath();
        ctx.fillStyle = (s % 2 === 0) ? style.rockAlt : style.rockBase;
        ctx.fill();

        // Dark horizontal stratum seam at each 4-voxel terrace boundary
        ctx.beginPath();
        ctx.moveTo(xL, yL + bandBotOffset);
        ctx.lineTo(xB, yB + bandBotOffset);
        ctx.strokeStyle = style.seam;
        ctx.lineWidth = Math.max(0.75, 0.8 * zoom);
        ctx.stroke();

        // Staggered vertical rock fissure joints inside the stratum
        for (let j = 1; j <= 3; j++) {
          const frac = ((j * 0.25) + (s % 2) * 0.1) % 0.9;
          if (frac <= 0.08 || frac >= 0.92) continue;
          const jx = xL + (xB - xL) * frac;
          const jy = yL + (yB - yL) * frac;
          ctx.beginPath();
          ctx.moveTo(jx, jy + bandTopOffset);
          ctx.lineTo(jx, jy + bandBotOffset);
          ctx.strokeStyle = style.joint;
          ctx.lineWidth = Math.max(0.6, 0.7 * zoom);
          ctx.stroke();
        }
      }

      // Sub-turf loam & hanging grass root overhang right below the top edge
      const overhangPx = Math.min(dropPx, Math.max(1.2, 1.5 * zoom));
      ctx.beginPath();
      ctx.moveTo(xL, yL);
      ctx.lineTo(xB, yB);
      ctx.lineTo(xB, yB + overhangPx);
      ctx.lineTo(xL, yL + overhangPx);
      ctx.closePath();
      ctx.fillStyle = style.loam;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(xL, yL + 0.5 * zoom);
      ctx.lineTo(xB, yB + 0.5 * zoom);
      ctx.strokeStyle = style.turfOverhang;
      ctx.lineWidth = Math.max(1, 1.0 * zoom);
      ctx.stroke();
      ctx.restore();
    }

    drawnCliffs.push({
      dir: 'south',
      x: faces.x,
      y: faces.y,
      topZ: south.topZ,
      bottomZ: south.bottomZ,
      diff: south.diff,
      pixelHeight: dropPx,
      bounds: { minX: xL, maxX: xB, minY: yL, maxY: yB + dropPx },
    });
  }

  // 2. South-East (`east`) cliff face: from Bottom vertex (cx, topCy + hh) to Right vertex (cx + hw, topCy)
  const east = faces.edges.east;
  if (east.exposed && east.diff > 0) {
    const dropPx = east.diff * VOXEL_Z_PX * zoom;
    const style = CLIFF_STYLE.east;
    const xB = cx,      yB = topCy + hh;
    const xR = cx + hw, yR = topCy;

    if (ctx) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(xB, yB);
      ctx.lineTo(xR, yR);
      ctx.lineTo(xR, yR + dropPx);
      ctx.lineTo(xB, yB + dropPx);
      ctx.closePath();
      ctx.fillStyle = style.rockBase;
      ctx.fill();

      const steps = east.diff / ELEVATION_STEP;
      const stepPx = ELEVATION_STEP * VOXEL_Z_PX * zoom;
      for (let s = 0; s < steps; s++) {
        const bandTopOffset = s * stepPx;
        const bandBotOffset = (s + 1) * stepPx;
        ctx.beginPath();
        ctx.moveTo(xB, yB + bandTopOffset);
        ctx.lineTo(xR, yR + bandTopOffset);
        ctx.lineTo(xR, yR + bandBotOffset);
        ctx.lineTo(xB, yB + bandBotOffset);
        ctx.closePath();
        ctx.fillStyle = (s % 2 === 0) ? style.rockHighlight : style.rockAlt;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(xB, yB + bandBotOffset);
        ctx.lineTo(xR, yR + bandBotOffset);
        ctx.strokeStyle = style.seam;
        ctx.lineWidth = Math.max(0.75, 0.8 * zoom);
        ctx.stroke();

        for (let j = 1; j <= 3; j++) {
          const frac = ((j * 0.25) + ((s + 1) % 2) * 0.1) % 0.9;
          if (frac <= 0.08 || frac >= 0.92) continue;
          const jx = xB + (xR - xB) * frac;
          const jy = yB + (yR - yB) * frac;
          ctx.beginPath();
          ctx.moveTo(jx, jy + bandTopOffset);
          ctx.lineTo(jx, jy + bandBotOffset);
          ctx.strokeStyle = style.joint;
          ctx.lineWidth = Math.max(0.6, 0.7 * zoom);
          ctx.stroke();
        }
      }

      const overhangPx = Math.min(dropPx, Math.max(1.2, 1.5 * zoom));
      ctx.beginPath();
      ctx.moveTo(xB, yB);
      ctx.lineTo(xR, yR);
      ctx.lineTo(xR, yR + overhangPx);
      ctx.lineTo(xB, yB + overhangPx);
      ctx.closePath();
      ctx.fillStyle = style.loam;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(xB, yB + 0.5 * zoom);
      ctx.lineTo(xR, yR + 0.5 * zoom);
      ctx.strokeStyle = style.turfOverhang;
      ctx.lineWidth = Math.max(1, 1.0 * zoom);
      ctx.stroke();
      ctx.restore();
    }

    drawnCliffs.push({
      dir: 'east',
      x: faces.x,
      y: faces.y,
      topZ: east.topZ,
      bottomZ: east.bottomZ,
      diff: east.diff,
      pixelHeight: dropPx,
      bounds: { minX: xB, maxX: xR, minY: yR, maxY: yB + dropPx },
    });
  }

  // 3. Center front corner spine where both south and east cliffs meet:
  //    drawn strictly for the shared vertical span [H .. max(N_south, N_east)]
  if (south.exposed && east.exposed && ctx) {
    const sharedDiff = Math.min(south.diff, east.diff);
    if (sharedDiff > 0) {
      const spinePx = sharedDiff * VOXEL_Z_PX * zoom;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, topCy + hh);
      ctx.lineTo(cx, topCy + hh + spinePx);
      ctx.strokeStyle = '#3b322a';
      ctx.lineWidth = Math.max(1, 1.0 * zoom);
      ctx.stroke();
      ctx.restore();
    }
  }

  return drawnCliffs;
}

/**
 * Draws the 64×32 isometric top surface of tile `(x, y)` at `(cx, topCy)`.
 * - At elevation 0, preserves baseline flat terrain appearance, shoreline blending, and water shimmer.
 * - At elevation > 0, draws the same terrain surface elevated to `topCy`, omitting edge borders on
 *   shared equal-height edges (`H === N`) so adjacent equal-height tiles join seamlessly, and drawing
 *   subtle sunlit cliff-rim bevels only on edges where `H > N`.
 */
export function drawTileTopSurface(ctx, map, x, y, faces, cx, topCy, timeMs = 0, zoom = 1) {
  const terrainId = getTileTerrain(map, x, y) ?? 'plains';
  const hw = HALF_W * zoom;
  const hh = HALF_H * zoom;
  const pts = tileDiamondPoints(cx, topCy, zoom);

  if (!ctx) return;

  if (terrainId === 'shoal') {
    drawShoalIso(ctx, cx, topCy, map, x, y, timeMs, zoom);
  } else {
    const pal = TERRAIN_PALETTES[terrainId] ?? TERRAIN_PALETTES.plains;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.lineTo(pts[2].x, pts[2].y);
    ctx.lineTo(pts[3].x, pts[3].y);
    ctx.closePath();
    ctx.fillStyle = pal.top;
    ctx.fill();
    // Seal sub-pixel antialiasing seam on equal-height shared edges with same-color stroke
    ctx.strokeStyle = pal.top;
    ctx.lineWidth = Math.max(0.8, 0.75 * zoom);
    ctx.stroke();

    // Deterministic surface texture matching tools/voxel_pipeline/models/terrain.mjs
    if (terrainId === 'sea' || terrainId === 'river') {
      drawWaterShimmer(ctx, cx, topCy, x, y, timeMs, zoom);
    } else {
      // Subtle isometric turf/surface flecks inside the diamond (no artificial inner-diamond box)
      const seed = (x * 7 + y * 13) & 3;
      const clumps = [
        [-14, -1, pal.alt], [-6, -6, pal.tuft], [5, -5, pal.alt],
        [12, 0, pal.tuft], [-8, 4, pal.dark], [3, 5, pal.alt], [0, -1, pal.tuft],
      ];
      for (let i = 0; i < clumps.length; i++) {
        const [tx, ty, col] = clumps[(i + seed) % clumps.length];
        ctx.fillStyle = col;
        ctx.fillRect(
          Math.round(cx + tx * zoom),
          Math.round(topCy + ty * zoom),
          Math.max(2, Math.round(3 * zoom)),
          Math.max(1, Math.round(1.5 * zoom))
        );
      }
    }
    ctx.restore();
  }

  // Edge treatment:
  // - Never stroke shared equal-height edges (`diff === 0 && !exposed`), so equal-height tiles join seamlessly.
  // - On back edges (`north`, `west`) where `H > N`, draw a crisp sunlit cliff-lip bevel proportional to `H - N`.
  ctx.save();
  const north = faces.edges.north;
  const west = faces.edges.west;
  const east = faces.edges.east;
  const south = faces.edges.south;

  if (north.exposed && north.diff > 0) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.strokeStyle = '#9ec274';
    ctx.lineWidth = Math.max(1, 1.0 * zoom);
    ctx.stroke();
  }
  if (west.exposed && west.diff > 0) {
    ctx.beginPath();
    ctx.moveTo(pts[3].x, pts[3].y);
    ctx.lineTo(pts[0].x, pts[0].y);
    ctx.strokeStyle = '#94b86a';
    ctx.lineWidth = Math.max(1, 1.0 * zoom);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws a unit ground shadow and optional selection reticle aligned to the tile's elevated top surface.
 */
export function drawEntityGroundMarkers(ctx, pos, { selected = false, isUnit = true, zoom = 1 } = {}) {
  if (!ctx) return;
  ctx.save();
  if (selected) {
    const pts = pos.selectionDiamond;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.lineTo(pts[2].x, pts[2].y);
    ctx.lineTo(pts[3].x, pts[3].y);
    ctx.closePath();
    ctx.strokeStyle = '#ffe27a';
    ctx.lineWidth = Math.max(1.5, 2 * zoom);
    ctx.stroke();
  }
  if (isUnit) {
    ctx.beginPath();
    ctx.ellipse(pos.shadowX, pos.shadowY + 2 * zoom, 12 * zoom, 6 * zoom, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 20, 15, 0.35)';
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Renders the complete isometric scene (elevated terrain, neighbour-aware cliff walls,
 * terrain props, buildings in 4 facings, and units in 8 facings) in painter depth order.
 */
export function renderIso(ctx, map, {
  manifest = null,
  originX = 480,
  originY = 120,
  zoom = 1,
  timeMs = 0,
  selectedTile = null,
  hoveredTile = null,
  basePath = 'game_assets/voxels/sheets',
} = {}) {
  const renderLog = {
    tiles: [],
    cliffs: [],
    entities: [],
  };

  // Index properties/buildings and units by (x, y)
  const propAt = new Map();
  for (const p of map.properties ?? []) {
    propAt.set(`${p.x},${p.y}`, p);
  }
  const unitAt = new Map();
  for (const u of map.units ?? []) {
    unitAt.set(`${u.x},${u.y}`, u);
  }

  // Build painter queue ordered by (x + y, y, x)
  const cells = [];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      cells.push({ x, y, layerOrder: 0 });
    }
  }
  cells.sort(compareIsoDepth);

  for (const { x, y } of cells) {
    const H = getTileElevation(map, x, y);
    const terrainId = getTileTerrain(map, x, y) ?? 'plains';
    const iso = gridToIso(x, y, H, originX, originY, zoom);
    const faces = computeTileElevationFaces(map, x, y);

    // 1. Draw exposed cliff faces (only where H > N, for height difference H - N)
    const cliffs = drawTileExposedCliffs(ctx, faces, iso.x, iso.y, zoom);
    renderLog.cliffs.push(...cliffs);

    // 2. Draw top surface at elevated screen position (iso.x, iso.y)
    drawTileTopSurface(ctx, map, x, y, faces, iso.x, iso.y, timeMs, zoom);

    // 3. Draw voxel terrain prop if applicable (road, tree, mountain, hill, wall, etc.)
    const propModel = terrainId === 'road'
      ? `road-${roadConnectorMask(map, x, y).toString(16)}`
      : (terrainId !== 'plains' && terrainId !== 'sea' && terrainId !== 'river' && terrainId !== 'shoal')
        ? fortificationSheetKey(terrainId, map.wallArmy ?? map.defaultArmy)
        : null;

    if (propModel && ctx) {
      blitSheet(ctx, manifest, propModel, 'right', 'n', 0, iso.x, iso.y, zoom, basePath);
    }

    // 4. Draw hover / selection highlight on tile top diamond if active
    const isSelected = Boolean(selectedTile && selectedTile.x === x && selectedTile.y === y);
    const isHovered = Boolean(hoveredTile && hoveredTile.x === x && hoveredTile.y === y);
    if ((isSelected || isHovered) && ctx) {
      const pts = tileDiamondPoints(iso.x, iso.y, zoom);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.lineTo(pts[2].x, pts[2].y);
      ctx.lineTo(pts[3].x, pts[3].y);
      ctx.closePath();
      ctx.strokeStyle = isSelected ? '#ffe27a' : 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = Math.max(1.5, (isSelected ? 2.2 : 1.4) * zoom);
      ctx.stroke();
      ctx.restore();
    }

    // 5. Draw building / property on elevated tile (4 cardinal facings, faction-aware model)
    const prop = propAt.get(`${x},${y}`);
    if (prop) {
      const pos = getEntityRenderPosition(map, prop, originX, originY, zoom);
      const facing = ['right', 'up', 'left', 'down'].includes(prop.facing) ? prop.facing : 'right';
      const variant = prop.owner == null || prop.owner === 'n' ? 'n' : String(prop.owner);
      const army = resolveEntityArmy(map, prop);
      const modelId = buildingSheetKey(prop.type, army);
      let blitted = false;
      if (ctx) {
        blitted = blitSheet(ctx, manifest, modelId, facing, variant, 0, pos.anchorX, pos.anchorY, zoom, basePath)
          || blitSheet(ctx, manifest, prop.type, facing, variant, 0, pos.anchorX, pos.anchorY, zoom, basePath);
        if (!blitted) {
          // Clean procedural building fallback block at elevated anchor
          ctx.save();
          const col = TEAM_COLORS[Number(variant) || 0] ?? '#aaa78b';
          ctx.fillStyle = col;
          ctx.fillRect(pos.anchorX - 12 * zoom, pos.anchorY - 18 * zoom, 24 * zoom, 18 * zoom);
          ctx.strokeStyle = '#1e2226';
          ctx.lineWidth = Math.max(1, zoom);
          ctx.strokeRect(pos.anchorX - 12 * zoom, pos.anchorY - 18 * zoom, 24 * zoom, 18 * zoom);
          ctx.restore();
        }
      }
      renderLog.entities.push({
        kind: 'building',
        type: prop.type,
        army,
        modelId,
        x,
        y,
        elevation: H,
        facing,
        variant,
        anchorX: pos.anchorX,
        anchorY: pos.anchorY,
        baseX: pos.baseX,
        baseY: pos.baseY,
        elevOffset: pos.elevOffset,
        blitted,
      });
    }

    // 6. Draw unit on elevated tile (8 directional facings, faction-aware model)
    const unit = unitAt.get(`${x},${y}`);
    if (unit) {
      const pos = getEntityRenderPosition(map, unit, originX, originY, zoom);
      drawEntityGroundMarkers(ctx, pos, { selected: isSelected, isUnit: true, zoom });
      const facing = unit.facing ?? 'right';
      const variant = String(unit.owner ?? 0);
      const army = resolveEntityArmy(map, unit);
      const modelId = unitSheetKey(unit.type, army);
      let blitted = false;
      if (ctx) {
        blitted = blitSheet(ctx, manifest, modelId, facing, variant, 0, pos.anchorX, pos.anchorY, zoom, basePath)
          || blitSheet(ctx, manifest, unit.type, facing, variant, 0, pos.anchorX, pos.anchorY, zoom, basePath);
        if (!blitted) {
          ctx.save();
          const col = TEAM_COLORS[Number(variant) || 0] ?? '#df794b';
          ctx.beginPath();
          ctx.arc(pos.anchorX, pos.anchorY - 8 * zoom, 9 * zoom, 0, Math.PI * 2);
          ctx.fillStyle = col;
          ctx.fill();
          ctx.strokeStyle = '#181c20';
          ctx.lineWidth = Math.max(1, 1.2 * zoom);
          ctx.stroke();
          ctx.restore();
        }
      }
      renderLog.entities.push({
        kind: 'unit',
        type: unit.type,
        army,
        modelId,
        x,
        y,
        elevation: H,
        facing,
        variant,
        anchorX: pos.anchorX,
        anchorY: pos.anchorY,
        baseX: pos.baseX,
        baseY: pos.baseY,
        elevOffset: pos.elevOffset,
        shadowX: pos.shadowX,
        shadowY: pos.shadowY,
        blitted,
      });
    }

    renderLog.tiles.push({
      x,
      y,
      terrain: terrainId,
      elevation: H,
      modelId: elevationModelId(H),
      screenX: iso.x,
      screenY: iso.y,
      baseX: iso.baseX,
      baseY: iso.baseY,
      elevOffset: iso.elevOffset,
      edges: faces.edges,
      corners: faces.corners,
    });
  }

  return renderLog;
}
