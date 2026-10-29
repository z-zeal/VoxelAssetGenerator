/**
 * Segmented composition with real occlusion.
 *
 * A model is baked as several parts, each with its own sprite per facing. Putting
 * those sprites back together is not a sorting problem, and every attempt to
 * treat it as one has failed the same way:
 *
 *   * "structure first, then moving parts" paints a far-side door on top of the
 *     roof as soon as the building turns round;
 *   * "nearest part first" hides a near-side door behind the wall it is cut into,
 *     because a wall's bounding box reaches closer to the camera than the door;
 *   * "sort by the part's centre depth" does both, depending on the facing.
 *
 * The reason is simple: a part does not have a depth. It has a depth at every
 * pixel. So each part sheet ships with a depth sheet (see `depth-map.mjs`), and
 * this module resolves each output pixel by comparing depths directly. Draw
 * order stops mattering, which is what makes 16 facings — and a turret swinging
 * through all of them — safe.
 *
 * This lives outside the review page for the same reason `gallery-zoom.mjs`
 * does: the page is not testable, and this is the part that has to be right.
 */
import { decodeDepth } from './depth-map.mjs';

/**
 * @param {Array<{
 *   albedo: {w:number,h:number,data:Uint8ClampedArray},
 *   normal: {w:number,h:number,data:Uint8ClampedArray},
 *   material: {w:number,h:number,data:Uint8ClampedArray},
 *   depth: {w:number,h:number,data:Uint8ClampedArray}|null,
 *   depthFallback?: number,
 *   scale?: number,
 *   ox: number, oy: number,
 * }>} layers  parts in any order; `ox`/`oy` place the sheet's top-left corner
 *              in output space, `scale` maps sheet pixels to depth-sheet pixels.
 * @param {{pad?: number}} [opts]
 * @returns {{W:number,H:number,A:Uint8ClampedArray,N:Uint8ClampedArray,
 *            M:Uint8ClampedArray,cov:Uint8Array,zbuf:Float32Array,
 *            owner:Int16Array, cover:Uint8Array}}  `A`'s alpha is the composite's coverage.
 */
export function compositeParts(layers, { pad = 4 } = {}) {
  if (!layers.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const l of layers) {
    minX = Math.min(minX, l.ox);
    minY = Math.min(minY, l.oy);
    maxX = Math.max(maxX, l.ox + l.albedo.w);
    maxY = Math.max(maxY, l.oy + l.albedo.h);
  }
  const W = Math.ceil(maxX - minX) + pad * 2;
  const H = Math.ceil(maxY - minY) + pad * 2;
  const A = new Uint8ClampedArray(W * H * 4);
  const N = new Uint8ClampedArray(W * H * 4);
  const M = new Uint8ClampedArray(W * H * 4);
  const cov = new Uint8Array(W * H);
  const zbuf = new Float32Array(W * H).fill(-Infinity);
  // Which layer won each pixel — for debugging, and so tests can assert the
  // right *part* is visible rather than merely a similar colour.
  const owner = new Int16Array(W * H).fill(-1);
  // How many layers touch each pixel. One means the pixel is pure: no boundary
  // between parts runs through it, so a flat sample of that part is exact.
  const cover = new Uint8Array(W * H);

  for (let li = 0; li < layers.length; li++) {
    const l = layers[li];
    const dx0 = Math.round(l.ox - minX) + pad;
    const dy0 = Math.round(l.oy - minY) + pad;
    const scale = l.scale ?? 1;
    const src = l.albedo.data, nrm = l.normal.data, mat = l.material.data;
    const dep = l.depth ? l.depth.data : null;
    const dw = l.depth ? l.depth.w : 0;
    const fallback = l.depthFallback ?? -Infinity;
    for (let y = 0; y < l.albedo.h; y++) {
      const dy = dy0 + y;
      if (dy < 0 || dy >= H) continue;
      for (let x = 0; x < l.albedo.w; x++) {
        const dx = dx0 + x;
        if (dx < 0 || dx >= W) continue;
        const s = (y * l.albedo.w + x) * 4;
        const alpha = src[s + 3];
        if (alpha === 0) continue;
        // Depth is sampled from the runtime-scale sheet even when the colour
        // comes from a hi sheet: the hi sheet is the same crop at higher
        // resolution, so a nearest sample is within one runtime pixel.
        let z = fallback;
        if (dep) {
          const px = Math.min(dw - 1, Math.max(0, (x / scale) | 0));
          const py = Math.min(l.depth.h - 1, Math.max(0, (y / scale) | 0));
          const o = (py * dw + px) * 4;
          if (dep[o + 3] !== 0) z = decodeDepth(dep[o] * 256 + dep[o + 1]);
        }
        const cell = dy * W + dx;
        // Coverage is the best any part offers for this pixel: a sheet pixel
        // with alpha 128 means half a pixel is solid, and that survives the win
        // or loss of the z-test. Keeping it is what makes rotated sprites smooth
        // instead of a staircase.
        if (alpha > cov[cell]) cov[cell] = alpha;
        if (cover[cell] < 255) cover[cell]++;
        if (z <= zbuf[cell]) continue;             // a nearer part owns this pixel
        zbuf[cell] = z;
        owner[cell] = li;
        const d = cell * 4;
        A[d] = src[s];     A[d + 1] = src[s + 1]; A[d + 2] = src[s + 2];
        N[d] = nrm[s];     N[d + 1] = nrm[s + 1]; N[d + 2] = nrm[s + 2]; N[d + 3] = 255;
        // Material ids must never blend: an average of two ids is a third id.
        M[d] = mat[s];     M[d + 1] = mat[s + 1];
        M[d + 2] = mat[s + 2]; M[d + 3] = mat[s + 3];
      }
    }
  }
  for (let cell = 0; cell < W * H; cell++) A[cell * 4 + 3] = cov[cell];
  return { W, H, A, N, M, cov, zbuf, owner, cover, minX, minY };
}
