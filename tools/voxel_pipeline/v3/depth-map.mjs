/**
 * Depth sheets: the encoding that makes segmented composition exact.
 *
 * A part's sprite tells you *what* colour a pixel is; it does not tell you how
 * far away that pixel was. Without that, a compositor has to guess a draw order
 * — one number per part — and every such guess is wrong for some facing:
 *
 *   * sort by a part's centre depth and a far-side door still paints over the
 *     roof, because the door is "dynamic" and got hoisted to the front;
 *   * sort by a part's nearest point instead and a near-side door disappears
 *     behind the wall it is cut into, because the wall's bounding box reaches
 *     closer to the camera than the door does.
 *
 * Both are the same mistake: a part is not at one depth. So every part sheet now
 * ships with a depth sheet, and a compositor resolves each pixel by comparing
 * depths. Draw order stops mattering, which is the property that makes 16
 * facings — and a turret swinging through them — safe.
 *
 * Encoding (RGBA8, one PNG per part per facing):
 *
 *   R = high byte   }
 *   G = low byte    } 16-bit little-endian-ish: q = R * 256 + G
 *   B = 0
 *   A = 255 where the part covers the pixel, 0 elsewhere
 *
 * `q` is the view depth in tile units, offset by `BIAS` and scaled by `SCALE`:
 *
 *   depth = q / SCALE - BIAS          q = round((depth + BIAS) * SCALE)
 *
 * Tile units are design voxels / 8 (the same unit `cameraBasis.depth` returns),
 * so a 512³ canvas spans ±32 tile units. `BIAS`/`SCALE` leave ±128 tile units —
 * four canvases either way — at 1/32 of a design voxel, which is far finer than
 * the depth gap between any two touching parts.
 */

export const DEPTH_SCALE = 256;      // quantisation steps per tile unit
export const DEPTH_BIAS = 128;       // tile units of headroom below the origin
export const DEPTH_Q_MAX = 65535;

/** float depth (tile units) -> 16-bit code. -Infinity (no surface) -> 0. */
export function encodeDepth(depth) {
  if (!Number.isFinite(depth)) return 0;
  const q = Math.round((depth + DEPTH_BIAS) * DEPTH_SCALE);
  return q < 0 ? 0 : q > DEPTH_Q_MAX ? DEPTH_Q_MAX : q;
}

/** 16-bit code -> float depth (tile units). 0 means "no surface here". */
export function decodeDepth(q) {
  return q / DEPTH_SCALE - DEPTH_BIAS;
}

/** Decode one pixel of a depth sheet's RGBA bytes. */
export function decodeDepthAt(data, offset) {
  return decodeDepth(data[offset] * 256 + data[offset + 1]);
}

/**
 * Painter test for one pixel.
 *
 * Returns true when the incoming sample (`depth`, and a code `q` so that equal
 * depths remain stable) should replace what is already in the buffer. Equal
 * depths keep the earlier sample, so a shared face — the hull deck under a
 * turret ring — stays with the part that was composited first instead of
 * flickering between them.
 */
export function depthWins(depth, currentDepth) {
  return depth > currentDepth;
}
