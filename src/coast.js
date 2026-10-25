/**
 * Shoreline masks, beach sand polygons, and animated water shimmer for
 * isometric flat water/shoal surfaces (`sea`, `river`, `shoal`).
 *
 * Preserved at elevation 0 and works at any tile elevation `H`.
 */
import { HALF_W, HALF_H, getTileTerrain } from './iso.js';

const WATER_TERRAINS = new Set(['sea', 'river', 'reef']);
const SHOAL_TERRAINS = new Set(['shoal']);

export function isWaterTerrain(terrainId) {
  return WATER_TERRAINS.has(terrainId);
}

export function isLandTerrain(terrainId) {
  return Boolean(terrainId) && !WATER_TERRAINS.has(terrainId) && !SHOAL_TERRAINS.has(terrainId);
}

/**
 * 4-bit cardinal mask (1=N, 2=E, 4=S, 8=W) of adjacent land tiles around `(x, y)`.
 */
export function shoalLandMask(map, x, y) {
  let mask = 0;
  if (isLandTerrain(getTileTerrain(map, x, y - 1))) mask |= 1;
  if (isLandTerrain(getTileTerrain(map, x + 1, y))) mask |= 2;
  if (isLandTerrain(getTileTerrain(map, x, y + 1))) mask |= 4;
  if (isLandTerrain(getTileTerrain(map, x - 1, y))) mask |= 8;
  return mask;
}

/**
 * 4-bit cardinal mask (1=N, 2=E, 4=S, 8=W) of adjacent shoal or land tiles around `(x, y)`.
 */
export function shoalSiblingMask(map, x, y) {
  let mask = 0;
  const check = (nx, ny) => {
    const t = getTileTerrain(map, nx, ny);
    return isLandTerrain(t) || SHOAL_TERRAINS.has(t);
  };
  if (check(x, y - 1)) mask |= 1;
  if (check(x + 1, y)) mask |= 2;
  if (check(x, y + 1)) mask |= 4;
  if (check(x - 1, y)) mask |= 8;
  return mask;
}

/**
 * Returns which cardinal edges of `(x, y)` border open water (`sea`/`river`/`reef`).
 */
export function shoreSides(map, x, y) {
  return {
    north: isWaterTerrain(getTileTerrain(map, x, y - 1)),
    east: isWaterTerrain(getTileTerrain(map, x + 1, y)),
    south: isWaterTerrain(getTileTerrain(map, x, y + 1)),
    west: isWaterTerrain(getTileTerrain(map, x - 1, y)),
  };
}

/**
 * Computes the inset dry/wet beach sand polygon vertices for a shoal tile at `(cx, cy)`.
 */
export function sandPolygon(cx, cy, map, x, y, zoom = 1) {
  const shores = shoreSides(map, x, y);
  const hw = HALF_W * zoom;
  const hh = HALF_H * zoom;
  const insetN = shores.north ? 0.82 : 1.0;
  const insetE = shores.east ? 0.82 : 1.0;
  const insetS = shores.south ? 0.82 : 1.0;
  const insetW = shores.west ? 0.82 : 1.0;
  return [
    { x: cx, y: cy - hh * ((insetN + insetW) * 0.5) },
    { x: cx + hw * ((insetN + insetE) * 0.5), y: cy },
    { x: cx, y: cy + hh * ((insetE + insetS) * 0.5) },
    { x: cx - hw * ((insetS + insetW) * 0.5), y: cy },
  ];
}

/**
 * Deterministic animated water shimmer phase in [0, 1) for tile `(x, y)` at `timeMs`.
 */
export function waterShimmerPhase(x, y, timeMs = 0) {
  const raw = Math.sin((x * 1.7 + y * 2.3) + (timeMs * 0.0025));
  return (raw + 1) * 0.5;
}

/**
 * Renders an animated water shimmer wave highlight onto canvas context `ctx` at `(cx, cy)`.
 */
export function drawWaterShimmer(ctx, cx, cy, x, y, timeMs = 0, zoom = 1) {
  const phase = waterShimmerPhase(x, y, timeMs);
  const offset = (phase - 0.5) * 4 * zoom;
  ctx.save();
  ctx.strokeStyle = phase > 0.5 ? 'rgba(162, 224, 248, 0.65)' : 'rgba(126, 200, 232, 0.45)';
  ctx.lineWidth = Math.max(1, 1.2 * zoom);
  ctx.beginPath();
  ctx.moveTo(cx - 10 * zoom + offset, cy - 2 * zoom);
  ctx.lineTo(cx - 2 * zoom + offset, cy - 2 * zoom);
  ctx.moveTo(cx + 2 * zoom - offset, cy + 3 * zoom);
  ctx.lineTo(cx + 11 * zoom - offset, cy + 3 * zoom);
  ctx.stroke();
  ctx.restore();
}

/**
 * Renders an isometric shoal / beach tile with shoreline surf foam and wet/dry sand blending.
 */
export function drawShoalIso(ctx, cx, cy, map, x, y, timeMs = 0, zoom = 1) {
  const hw = HALF_W * zoom;
  const hh = HALF_H * zoom;
  // Shallow turquoise coastal water base diamond
  ctx.beginPath();
  ctx.moveTo(cx, cy - hh);
  ctx.lineTo(cx + hw, cy);
  ctx.lineTo(cx, cy + hh);
  ctx.lineTo(cx - hw, cy);
  ctx.closePath();
  ctx.fillStyle = '#5f9ba8';
  ctx.fill();

  // Sand polygon inset on water-facing sides
  const poly = sandPolygon(cx, cy, map, x, y, zoom);
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  ctx.fillStyle = '#d6c48e';
  ctx.fill();

  // Animated surf foam along water-facing edges
  const shores = shoreSides(map, x, y);
  const phase = waterShimmerPhase(x, y, timeMs);
  ctx.strokeStyle = `rgba(232, 246, 250, ${(0.45 + phase * 0.35).toFixed(2)})`;
  ctx.lineWidth = Math.max(1, 1.5 * zoom);
  if (shores.north) {
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    ctx.lineTo(poly[1].x, poly[1].y);
    ctx.stroke();
  }
  if (shores.east) {
    ctx.beginPath();
    ctx.moveTo(poly[1].x, poly[1].y);
    ctx.lineTo(poly[2].x, poly[2].y);
    ctx.stroke();
  }
  if (shores.south) {
    ctx.beginPath();
    ctx.moveTo(poly[2].x, poly[2].y);
    ctx.lineTo(poly[3].x, poly[3].y);
    ctx.stroke();
  }
  if (shores.west) {
    ctx.beginPath();
    ctx.moveTo(poly[3].x, poly[3].y);
    ctx.lineTo(poly[0].x, poly[0].y);
    ctx.stroke();
  }
}
